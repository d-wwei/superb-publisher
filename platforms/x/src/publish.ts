import * as fs from "node:fs";
import * as path from "node:path";
import type { Page } from "puppeteer";
import {
  launchBrowser,
  closeBrowser,
  restoreCookies,
  loadCookies,
  isValid,
  applyStealthPatches,
  humanDelay,
  humanClick,
  uploadFiles,
  isImageFile,
  isVideoFile,
  logger,
} from "@social-cli/core";
import { SELECTORS, URLS } from "./selectors.js";
import type { XPublishOptions, XPublishResult } from "./types.js";

const PLATFORM = "x";

// ── Limits ──────────────────────────────────────────────────────────

const MAX_TWEET_LENGTH = 25_000; // Premium limit; standard is 280
const MAX_IMAGES = 4;

// ── Public API ──────────────────────────────────────────────────────

/**
 * Publish content to X/Twitter.
 *
 * Supports:
 * - Simple tweet (text + optional images or video)
 * - Quote tweet (text + quoteUrl)
 * - Reply (text + replyTo)
 * - Thread (multiple tweets chained together)
 * - Article (long-form, X Premium)
 */
export async function publish(
  options: XPublishOptions
): Promise<XPublishResult> {
  // Route to the correct publish flow
  if (options.article) {
    return publishArticle(options);
  }
  if (options.thread && options.thread.length > 0) {
    return publishThread(options);
  }
  if (options.replyTo) {
    return publishReply(options);
  }
  return publishTweet(options);
}

// ── Simple Tweet ────────────────────────────────────────────────────

async function publishTweet(
  options: XPublishOptions
): Promise<XPublishResult> {
  const errors = validateTweetOptions(options);
  if (errors.length > 0) {
    return { success: false, error: errors.join("; ") };
  }

  if (!isValid(PLATFORM)) {
    return { success: false, error: "Not logged in. Run: x-cli login" };
  }
  const cookies = loadCookies(PLATFORM);
  if (!cookies) {
    return { success: false, error: "Failed to load cookies. Run: x-cli login" };
  }

  logger.info(`Publishing tweet: "${options.text.slice(0, 50)}..."`);

  const browser = await launchBrowser({
    headless: false,
    language: "en-US",
    timezone: "America/Toronto",
  });
  let page: Page | undefined;

  try {
    page = (await browser.pages())[0] ?? (await browser.newPage());
    await applyStealthPatches(page);
    await restoreCookies(page, cookies);

    // Navigate to compose page for a clean compose experience
    logger.info("Opening compose page...");
    await page.goto(URLS.compose, {
      waitUntil: "networkidle2",
      timeout: 30_000,
    });
    await humanDelay(2000, 3000);

    // Check if redirected to login
    if (page.url().includes("login")) {
      return { success: false, error: "Session expired. Run: x-cli login" };
    }

    // Type tweet text
    await typeInCompose(page, options.text, 0);

    // Append quote URL if present (X auto-embeds it)
    if (options.quoteUrl) {
      logger.info("Adding quote URL...");
      await page.keyboard.press("Enter");
      await humanDelay(200, 400);
      await typeText(page, options.quoteUrl);
      await humanDelay(1500, 2500); // Wait for URL embed preview
    }

    // Upload media
    if (options.images && options.images.length > 0) {
      await uploadMedia(page, options.images);
    } else if (options.video) {
      await uploadMedia(page, [options.video]);
    }

    // Click tweet button
    await clickTweet(page);

    // Wait for confirmation
    const result = await waitForPublishResult(page);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Publish failed", message);
    return { success: false, error: message };
  } finally {
    await closeBrowser(browser);
  }
}

// ── Reply ───────────────────────────────────────────────────────────

async function publishReply(
  options: XPublishOptions
): Promise<XPublishResult> {
  if (!options.replyTo) {
    return { success: false, error: "replyTo URL is required for replies" };
  }

  const errors = validateTweetOptions(options);
  if (errors.length > 0) {
    return { success: false, error: errors.join("; ") };
  }

  if (!isValid(PLATFORM)) {
    return { success: false, error: "Not logged in. Run: x-cli login" };
  }
  const cookies = loadCookies(PLATFORM);
  if (!cookies) {
    return { success: false, error: "Failed to load cookies. Run: x-cli login" };
  }

  logger.info(`Replying to: ${options.replyTo}`);

  const browser = await launchBrowser({
    headless: false,
    language: "en-US",
    timezone: "America/Toronto",
  });
  let page: Page | undefined;

  try {
    page = (await browser.pages())[0] ?? (await browser.newPage());
    await applyStealthPatches(page);
    await restoreCookies(page, cookies);

    // Navigate to the target tweet
    logger.info("Opening target tweet...");
    await page.goto(options.replyTo, {
      waitUntil: "networkidle2",
      timeout: 30_000,
    });
    await humanDelay(2000, 3000);

    if (page.url().includes("login")) {
      return { success: false, error: "Session expired. Run: x-cli login" };
    }

    // Click into the reply textarea
    await page.waitForSelector(SELECTORS.replyTextarea, {
      visible: true,
      timeout: 10_000,
    });
    await humanClick(page, SELECTORS.replyTextarea);
    await humanDelay(500, 1000);

    // Type reply text
    await typeText(page, options.text);

    // Upload media if present
    if (options.images && options.images.length > 0) {
      await uploadMedia(page, options.images);
    } else if (options.video) {
      await uploadMedia(page, [options.video]);
    }

    // Click reply button
    await clickTweet(page);

    const result = await waitForPublishResult(page);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Reply failed", message);
    return { success: false, error: message };
  } finally {
    await closeBrowser(browser);
  }
}

// ── Thread ──────────────────────────────────────────────────────────

async function publishThread(
  options: XPublishOptions
): Promise<XPublishResult> {
  const tweets = options.thread ?? [];
  if (tweets.length === 0) {
    return { success: false, error: "Thread must contain at least one tweet" };
  }

  for (let i = 0; i < tweets.length; i++) {
    if (!tweets[i] || tweets[i].trim().length === 0) {
      return { success: false, error: `Thread tweet #${i + 1} is empty` };
    }
    if (tweets[i].length > MAX_TWEET_LENGTH) {
      return {
        success: false,
        error: `Thread tweet #${i + 1} exceeds ${MAX_TWEET_LENGTH} chars`,
      };
    }
  }

  if (!isValid(PLATFORM)) {
    return { success: false, error: "Not logged in. Run: x-cli login" };
  }
  const cookies = loadCookies(PLATFORM);
  if (!cookies) {
    return { success: false, error: "Failed to load cookies. Run: x-cli login" };
  }

  logger.info(`Publishing thread with ${tweets.length} tweet(s)`);

  const browser = await launchBrowser({
    headless: false,
    language: "en-US",
    timezone: "America/Toronto",
  });
  let page: Page | undefined;

  try {
    page = (await browser.pages())[0] ?? (await browser.newPage());
    await applyStealthPatches(page);
    await restoreCookies(page, cookies);

    // Navigate to compose page
    logger.info("Opening compose page...");
    await page.goto(URLS.compose, {
      waitUntil: "networkidle2",
      timeout: 30_000,
    });
    await humanDelay(2000, 3000);

    if (page.url().includes("login")) {
      return { success: false, error: "Session expired. Run: x-cli login" };
    }

    // Type first tweet
    await typeInCompose(page, tweets[0], 0);

    // Add subsequent tweets
    for (let i = 1; i < tweets.length; i++) {
      logger.info(`Adding thread tweet #${i + 1}...`);

      // Click the "+" button to add a new tweet in the thread
      await humanClick(page, SELECTORS.addThreadButton);
      await humanDelay(800, 1500);

      // Type into the new textarea (index-based)
      await typeInCompose(page, tweets[i], i);
    }

    // Click "Post all" (same button as tweet)
    await clickTweet(page);

    const result = await waitForPublishResult(page);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Thread publish failed", message);
    return { success: false, error: message };
  } finally {
    await closeBrowser(browser);
  }
}

// ── Article ─────────────────────────────────────────────────────────

async function publishArticle(
  options: XPublishOptions
): Promise<XPublishResult> {
  const article = options.article;
  if (!article) {
    return { success: false, error: "Article options are required" };
  }

  if (!article.title || article.title.trim().length === 0) {
    return { success: false, error: "Article title is required" };
  }

  const mdPath = path.resolve(article.markdownFile);
  if (!fs.existsSync(mdPath)) {
    return { success: false, error: `Markdown file not found: ${mdPath}` };
  }

  if (article.coverImage) {
    const coverPath = path.resolve(article.coverImage);
    if (!fs.existsSync(coverPath)) {
      return { success: false, error: `Cover image not found: ${coverPath}` };
    }
  }

  if (!isValid(PLATFORM)) {
    return { success: false, error: "Not logged in. Run: x-cli login" };
  }
  const cookies = loadCookies(PLATFORM);
  if (!cookies) {
    return { success: false, error: "Failed to load cookies. Run: x-cli login" };
  }

  const markdownContent = fs.readFileSync(mdPath, "utf-8");
  logger.info(`Publishing article: "${article.title}"`);

  const browser = await launchBrowser({
    headless: false,
    language: "en-US",
    timezone: "America/Toronto",
  });
  let page: Page | undefined;

  try {
    page = (await browser.pages())[0] ?? (await browser.newPage());
    await applyStealthPatches(page);
    await restoreCookies(page, cookies);

    // Navigate to article editor
    logger.info("Opening article editor...");
    await page.goto(URLS.article, {
      waitUntil: "networkidle2",
      timeout: 30_000,
    });
    await humanDelay(2000, 3000);

    if (page.url().includes("login")) {
      return { success: false, error: "Session expired. Run: x-cli login" };
    }

    // Upload cover image if provided
    if (article.coverImage) {
      logger.info("Uploading cover image...");
      const coverResult = await uploadFiles(page, {
        inputSelector: SELECTORS.articleCoverInput,
        files: [article.coverImage],
        timeout: 30_000,
      });
      if (!coverResult.success) {
        logger.warn(`Cover upload failed: ${coverResult.error}`);
      }
      await humanDelay(2000, 3000);
    }

    // Fill article title
    logger.info("Setting article title...");
    await page.waitForSelector(SELECTORS.articleTitleInput, {
      visible: true,
      timeout: 10_000,
    });
    await humanClick(page, SELECTORS.articleTitleInput);
    await humanDelay(300, 600);
    await typeText(page, article.title);
    await humanDelay(500, 1000);

    // Fill article body (paste markdown as plain text)
    logger.info("Setting article content...");
    await page.keyboard.press("Tab"); // Move to body editor
    await humanDelay(500, 1000);

    // For long content, use clipboard paste
    await page.evaluate((text) => {
      const editor = document.querySelector(
        '[data-testid="articleBody"], .public-DraftEditor-content, [contenteditable="true"]:not([data-testid="articleTitle"])'
      );
      if (editor) {
        (editor as HTMLElement).focus();
        // Insert text content
        document.execCommand("insertText", false, text);
      }
    }, markdownContent);
    await humanDelay(1000, 2000);

    // Click publish
    logger.info("Clicking publish...");
    await humanClick(page, SELECTORS.articlePublishButton);
    await humanDelay(2000, 3000);

    // Confirm if there's a confirmation dialog
    try {
      const confirmBtn = await page.$(
        'button[data-testid="confirmationSheetConfirm"]'
      );
      if (confirmBtn) {
        await humanClick(
          page,
          'button[data-testid="confirmationSheetConfirm"]'
        );
        await humanDelay(2000, 3000);
      }
    } catch {
      // No confirmation dialog
    }

    // Wait for URL change or success indication
    await humanDelay(3000, 5000);
    const currentUrl = page.url();

    if (currentUrl.includes("/articles/") && !currentUrl.includes("/new")) {
      logger.info("Article published successfully!");
      return {
        success: true,
        tweetUrl: currentUrl,
      };
    }

    return {
      success: true,
      tweetUrl: currentUrl,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Article publish failed", message);
    return { success: false, error: message };
  } finally {
    await closeBrowser(browser);
  }
}

// ── Validation ──────────────────────────────────────────────────────

function validateTweetOptions(options: XPublishOptions): string[] {
  const errors: string[] = [];

  if (!options.text || options.text.trim().length === 0) {
    errors.push("Tweet text is required");
  }
  if (options.text && options.text.length > MAX_TWEET_LENGTH) {
    errors.push(
      `Tweet too long: ${options.text.length}/${MAX_TWEET_LENGTH} chars`
    );
  }

  if (options.images) {
    if (options.images.length > MAX_IMAGES) {
      errors.push(`Too many images: ${options.images.length}/${MAX_IMAGES}`);
    }
    for (const img of options.images) {
      const absPath = path.resolve(img);
      if (!fs.existsSync(absPath)) {
        errors.push(`Image not found: ${absPath}`);
      } else if (!isImageFile(absPath)) {
        errors.push(`Not an image file: ${absPath}`);
      }
    }
  }

  if (options.video) {
    const absPath = path.resolve(options.video);
    if (!fs.existsSync(absPath)) {
      errors.push(`Video not found: ${absPath}`);
    } else if (!isVideoFile(absPath)) {
      errors.push(`Not a video file: ${absPath}`);
    }
  }

  if (options.images?.length && options.video) {
    errors.push("Cannot include both images and video in the same tweet");
  }

  return errors;
}

// ── DOM helpers ─────────────────────────────────────────────────────

/**
 * Type text into the compose textarea at a given thread index.
 */
async function typeInCompose(
  page: Page,
  text: string,
  threadIndex: number
): Promise<void> {
  const selector = SELECTORS.threadTextarea(threadIndex);

  await page.waitForSelector(selector, { visible: true, timeout: 10_000 });
  await humanClick(page, selector);
  await humanDelay(300, 600);
  await typeText(page, text);
  await humanDelay(300, 600);
}

/**
 * Type text character by character with human-like delays.
 *
 * For long texts (> 200 chars) uses clipboard paste to avoid
 * excessive typing time while still looking natural.
 */
async function typeText(page: Page, text: string): Promise<void> {
  if (text.length > 200) {
    // Use clipboard paste for long text
    await page.evaluate(async (t) => {
      await navigator.clipboard.writeText(t);
    }, text).catch(() => {
      // Clipboard API may not be available; fall back to execCommand
    });

    // Try paste via keyboard shortcut
    const isMac = process.platform === "darwin";
    await page.keyboard.down(isMac ? "Meta" : "Control");
    await page.keyboard.press("v");
    await page.keyboard.up(isMac ? "Meta" : "Control");

    // Verify paste worked; if not, fall back to direct insertion
    await humanDelay(500, 1000);
    const composed = await page.evaluate(() => {
      const el = document.activeElement;
      return el?.textContent?.length ?? 0;
    });

    if (composed < text.length * 0.5) {
      // Paste didn't work; insert via execCommand
      await page.evaluate((t) => {
        document.execCommand("insertText", false, t);
      }, text);
    }
  } else {
    // Type character by character for short text
    for (const char of text) {
      await page.keyboard.type(char, {
        delay: Math.floor(Math.random() * 80) + 30,
      });
    }
  }
}

/**
 * Upload media files (images or video) in the compose area.
 */
async function uploadMedia(page: Page, files: string[]): Promise<void> {
  logger.info(`Uploading ${files.length} media file(s)...`);

  const result = await uploadFiles(page, {
    inputSelector: SELECTORS.mediaUploadInput,
    files,
    timeout: 60_000,
  });

  if (!result.success) {
    throw new Error(`Media upload failed: ${result.error}`);
  }

  // Wait for thumbnails to appear (indicates upload complete)
  const timeout = files.some((f) => isVideoFile(f)) ? 180_000 : 60_000;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    // Check for thumbnail appearance
    const thumbnails = await page.$$(SELECTORS.mediaThumbnail);
    if (thumbnails.length > 0) {
      logger.debug("Media thumbnail(s) appeared");
      break;
    }

    // Check for progress indicator disappearance
    const progress = await page.$(SELECTORS.mediaUploadProgress);
    if (!progress) {
      await humanDelay(500, 1000);
      break;
    }

    await humanDelay(1000, 2000);
  }

  await humanDelay(1000, 2000);
  logger.info("Media upload complete");
}

/**
 * Click the tweet/post button.
 */
async function clickTweet(page: Page): Promise<void> {
  logger.info("Clicking post button...");
  await humanDelay(500, 1000);

  // Try the standard tweet button first, then inline
  try {
    await humanClick(page, SELECTORS.tweetButton);
  } catch {
    try {
      await humanClick(page, SELECTORS.tweetButtonInline);
    } catch {
      throw new Error("Could not find the post/tweet button");
    }
  }
}

/**
 * Wait for publish confirmation.
 *
 * After posting, X typically:
 * 1. Shows a toast notification
 * 2. Navigates to the tweet or back to the timeline
 *
 * We detect either signal and try to extract the tweet URL.
 */
async function waitForPublishResult(
  page: Page
): Promise<XPublishResult> {
  const timeout = 30_000;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    // Check for error toast
    try {
      const errorEl = await page.$(SELECTORS.errorMessage);
      if (errorEl) {
        const errorText = await page.$eval(
          SELECTORS.errorMessage,
          (el) => el.textContent?.trim() ?? "Unknown error"
        );
        // Only treat it as an error if it looks like one
        if (
          errorText.toLowerCase().includes("error") ||
          errorText.toLowerCase().includes("limit") ||
          errorText.toLowerCase().includes("failed") ||
          errorText.toLowerCase().includes("try again")
        ) {
          return { success: false, error: `Post error: ${errorText}` };
        }
      }
    } catch {
      // Ignore selector errors
    }

    // Check if compose dialog disappeared (indicates success)
    try {
      const textarea = await page.$(SELECTORS.tweetTextarea);
      if (!textarea) {
        // Compose dialog closed — post likely succeeded
        await humanDelay(1000, 2000);

        // Try to extract the tweet URL from the current page or notification
        const tweetUrl = await extractTweetUrl(page);
        logger.info("Post published successfully!");
        return {
          success: true,
          tweetUrl: tweetUrl ?? undefined,
          tweetId: tweetUrl ? extractTweetId(tweetUrl) : undefined,
        };
      }
    } catch {
      // Page might be navigating
    }

    // Check if URL changed to a tweet detail page
    const currentUrl = page.url();
    if (currentUrl.match(/x\.com\/\w+\/status\/\d+/)) {
      logger.info("Post published successfully!");
      return {
        success: true,
        tweetUrl: currentUrl,
        tweetId: extractTweetId(currentUrl),
      };
    }

    // Check for success toast
    try {
      const toast = await page.$(SELECTORS.publishToast);
      if (toast) {
        const toastText = await page.$eval(
          SELECTORS.publishToast,
          (el) => el.textContent?.trim() ?? ""
        );
        if (
          toastText.toLowerCase().includes("sent") ||
          toastText.toLowerCase().includes("posted") ||
          toastText.toLowerCase().includes("your post")
        ) {
          await humanDelay(500, 1000);
          const tweetUrl = await extractTweetUrl(page);
          logger.info("Post published successfully!");
          return {
            success: true,
            tweetUrl: tweetUrl ?? undefined,
            tweetId: tweetUrl ? extractTweetId(tweetUrl) : undefined,
          };
        }
      }
    } catch {
      // Ignore
    }

    await humanDelay(1000, 2000);
  }

  // Timeout — but the post might have succeeded if the dialog closed
  logger.warn("Publish confirmation wait timed out");
  return {
    success: false,
    error: "Publish confirmation timed out (post may have succeeded)",
  };
}

/**
 * Try to extract the tweet URL from the page after posting.
 */
async function extractTweetUrl(page: Page): Promise<string | null> {
  // Check if we're on a tweet detail page
  const currentUrl = page.url();
  if (currentUrl.match(/x\.com\/\w+\/status\/\d+/)) {
    return currentUrl;
  }

  // Try to find a "View" link in a toast notification
  try {
    const viewLink = await page.$eval(
      `${SELECTORS.publishToast} a[href*="/status/"]`,
      (el) => (el as HTMLAnchorElement).href
    );
    if (viewLink) return viewLink;
  } catch {
    // No view link found
  }

  return null;
}

/**
 * Extract tweet ID from a tweet URL.
 */
function extractTweetId(url: string): string | undefined {
  const match = url.match(/status\/(\d+)/);
  return match?.[1];
}
