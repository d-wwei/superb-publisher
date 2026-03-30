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
  humanType,
  humanClick,
  uploadFiles,
  waitForUploadComplete,
  isImageFile,
  isVideoFile,
  logger,
} from "@social-cli/core";
import { SELECTORS, URLS } from "./selectors.js";
import type { DouyinPublishOptions, DouyinPublishResult } from "./types.js";

const PLATFORM = "douyin";

// ── Limits ──────────────────────────────────────────────────────────

const MAX_IMAGES = 35;
const MAX_TITLE_LENGTH = 55;
const MAX_CONTENT_LENGTH = 5000;

/**
 * Publish a post (video or image-text) to Douyin via creator platform.
 *
 * Video flow:
 * 1. Validate inputs (file existence, limits)
 * 2. Launch browser with saved cookies
 * 3. Navigate to creator.douyin.com/creator-micro/content/upload
 * 4. Upload video file via file input
 * 5. Wait for upload + transcode
 * 6. Fill title/description
 * 7. Optionally set cover, add tags, location
 * 8. Click publish
 * 9. Wait for confirmation
 *
 * Image-text flow:
 * 1-2. Same as video
 * 3. Navigate to image-text publish page
 * 4. Upload images
 * 5. Fill title/description
 * 6. Add tags
 * 7. Click publish
 * 8. Wait for confirmation
 */
export async function publish(
  options: DouyinPublishOptions
): Promise<DouyinPublishResult> {
  // ── Validate ────────────────────────────────────────────────────
  const errors = validateOptions(options);
  if (errors.length > 0) {
    return {
      success: false,
      error: errors.join("; "),
    };
  }

  // ── Check login ─────────────────────────────────────────────────
  if (!isValid(PLATFORM)) {
    return {
      success: false,
      error: "Not logged in. Run: douyin-cli login",
    };
  }

  const cookies = loadCookies(PLATFORM);
  if (!cookies) {
    return {
      success: false,
      error: "Failed to load cookies. Run: douyin-cli login",
    };
  }

  // ── Determine post type ─────────────────────────────────────────
  const postType =
    options.type ?? (options.video ? "video" : "image");

  logger.info(`Publishing ${postType} post: "${options.title}"`);

  // ── Launch browser & publish ────────────────────────────────────
  const browser = await launchBrowser({ headless: false });
  let page: Page | undefined;

  try {
    page = (await browser.pages())[0] ?? (await browser.newPage());
    await applyStealthPatches(page);
    await restoreCookies(page, cookies);

    if (postType === "video" && options.video) {
      await publishVideo(page, options);
    } else if (options.images && options.images.length > 0) {
      await publishImageText(page, options);
    }

    // Wait for success
    const success = await waitForPublishResult(page);

    if (success) {
      logger.info("Post published successfully!");
      return { success: true };
    } else {
      return {
        success: false,
        error: "Publish did not confirm success within timeout",
      };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Publish failed", message);
    return {
      success: false,
      error: message,
    };
  } finally {
    await closeBrowser(browser);
  }
}

// ── Video publish flow ──────────────────────────────────────────────

async function publishVideo(
  page: Page,
  options: DouyinPublishOptions
): Promise<void> {
  // Navigate to video upload page
  logger.info("Opening video upload page...");
  await page.goto(URLS.videoUpload, {
    waitUntil: "networkidle2",
    timeout: 30_000,
  });
  await humanDelay(2000, 3000);

  // Check if redirected to login
  if (page.url().includes("login")) {
    throw new Error("Session expired. Run: douyin-cli login");
  }

  // Upload video file
  await uploadVideo(page, options.video!);

  // Resolve content (plain text or from HTML file)
  const resolvedContent = resolveContent(options);

  // Fill title / description in the content editor
  await fillContent(page, options.title, resolvedContent);

  // Upload cover if provided
  if (options.cover) {
    await uploadCover(page, options.cover);
  }

  // Add tags
  if (options.tags && options.tags.length > 0) {
    await addTags(page, options.tags);
  }

  // Set location
  if (options.location) {
    await setLocation(page, options.location);
  }

  // Click publish
  await clickPublish(page);
}

// ── Image-text publish flow ─────────────────────────────────────────

async function publishImageText(
  page: Page,
  options: DouyinPublishOptions
): Promise<void> {
  // Navigate to video upload page first, then switch to image-text mode
  // Or go directly to the image-text publish page
  logger.info("Opening image-text publish page...");
  await page.goto(URLS.videoUpload, {
    waitUntil: "networkidle2",
    timeout: 30_000,
  });
  await humanDelay(2000, 3000);

  // Check if redirected to login
  if (page.url().includes("login")) {
    throw new Error("Session expired. Run: douyin-cli login");
  }

  // Switch to image-text tab
  try {
    logger.info("Switching to image-text mode...");
    await humanClick(page, SELECTORS.imageTextTab);
    await humanDelay(1500, 2500);
  } catch {
    // If tab click fails, try navigating directly to image publish URL
    logger.info("Tab switch failed, navigating to image publish page...");
    await page.goto(URLS.imagePublish, {
      waitUntil: "networkidle2",
      timeout: 30_000,
    });
    await humanDelay(2000, 3000);
  }

  // Upload images
  await uploadImages(page, options.images!);

  // Resolve content (plain text or from HTML file)
  const resolvedContent = resolveContent(options);

  // Fill title / description
  await fillContent(page, options.title, resolvedContent);

  // Add tags
  if (options.tags && options.tags.length > 0) {
    await addTags(page, options.tags);
  }

  // Set location
  if (options.location) {
    await setLocation(page, options.location);
  }

  // Click publish
  await clickPublish(page);
}

// ── Validation ──────────────────────────────────────────────────────

function validateOptions(options: DouyinPublishOptions): string[] {
  const errors: string[] = [];

  if (!options.title || options.title.trim().length === 0) {
    errors.push("Title is required");
  }
  if (options.title && options.title.length > MAX_TITLE_LENGTH) {
    errors.push(
      `Title too long: ${options.title.length}/${MAX_TITLE_LENGTH} chars`
    );
  }

  const content = options.content ?? "";
  if (content.length > MAX_CONTENT_LENGTH) {
    errors.push(
      `Content too long: ${content.length}/${MAX_CONTENT_LENGTH} chars`
    );
  }

  if (options.images) {
    if (options.images.length > MAX_IMAGES) {
      errors.push(
        `Too many images: ${options.images.length}/${MAX_IMAGES}`
      );
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

  if (options.cover) {
    const absPath = path.resolve(options.cover);
    if (!fs.existsSync(absPath)) {
      errors.push(`Cover image not found: ${absPath}`);
    }
  }

  if (!options.images?.length && !options.video) {
    errors.push("At least one image or a video is required");
  }

  if (options.images?.length && options.video) {
    errors.push("Cannot publish both images and video in the same post");
  }

  if (options.htmlFile) {
    const absPath = path.resolve(options.htmlFile);
    if (!fs.existsSync(absPath)) {
      errors.push(`HTML file not found: ${absPath}`);
    }
  }

  return errors;
}

// ── Upload helpers ──────────────────────────────────────────────────

async function uploadVideo(page: Page, video: string): Promise<void> {
  logger.info("Uploading video...");

  const result = await uploadFiles(page, {
    inputSelector: SELECTORS.videoUploadInput,
    files: [video],
    timeout: 60_000,
  });

  if (!result.success) {
    throw new Error(`Video upload failed: ${result.error}`);
  }

  // Video uploads + transcode take time; wait generously
  logger.info("Waiting for video upload and transcode...");
  const uploaded = await waitForUploadComplete(
    page,
    SELECTORS.videoUploadDone,
    SELECTORS.videoUploadProgress,
    600_000 // 10 min for video upload + transcode
  );

  if (!uploaded) {
    logger.warn("Video upload/transcode may not be complete (timeout)");
  }

  await humanDelay(2000, 3000);
}

async function uploadImages(page: Page, images: string[]): Promise<void> {
  logger.info(`Uploading ${images.length} image(s)...`);

  const result = await uploadFiles(page, {
    inputSelector: SELECTORS.imageUploadInput,
    files: images,
    timeout: 60_000,
  });

  if (!result.success) {
    throw new Error(`Image upload failed: ${result.error}`);
  }

  // Wait for all images to finish uploading
  const allUploaded = await waitForUploadComplete(
    page,
    SELECTORS.imageUploadDone,
    SELECTORS.imageUploadProgress,
    120_000
  );

  if (!allUploaded) {
    logger.warn("Image upload may not be complete (timeout)");
  }

  await humanDelay(1000, 2000);
}

async function uploadCover(page: Page, cover: string): Promise<void> {
  logger.info("Uploading cover image...");

  // Try clicking the cover change/select button first
  try {
    await humanClick(page, SELECTORS.coverUploadButton);
    await humanDelay(1000, 2000);
  } catch {
    logger.debug("Cover button click failed, trying direct input");
  }

  const result = await uploadFiles(page, {
    inputSelector: SELECTORS.coverUploadInput,
    files: [cover],
    timeout: 30_000,
  });

  if (!result.success) {
    logger.warn(`Cover upload failed: ${result.error}`);
  }

  await humanDelay(1000, 2000);
}

// ── Editor helpers ──────────────────────────────────────────────────

/**
 * Fill the content editor with title and description.
 *
 * On Douyin's creator platform, the video description area is typically
 * a rich text editor (Quill-based) that serves as both title and description.
 * For image-text posts, there may be a separate title field.
 */
async function fillContent(
  page: Page,
  title: string,
  description?: string
): Promise<void> {
  // Try to find a dedicated title input first
  const hasTitleInput = await page.$(SELECTORS.titleInput);

  if (hasTitleInput) {
    logger.info(`Setting title: "${title}"`);
    await humanType(page, SELECTORS.titleInput, title);
    await humanDelay(500, 800);

    // Fill description in content editor if provided
    if (description) {
      logger.info("Setting description...");
      await fillContentEditor(page, description);
    }
  } else {
    // No separate title input — combine title and description in content editor
    const fullText = description
      ? `${title}\n${description}`
      : title;
    logger.info("Setting content (title + description)...");
    await fillContentEditor(page, fullText);
  }
}

async function fillContentEditor(
  page: Page,
  content: string
): Promise<void> {
  // Click into content area first
  try {
    await humanClick(page, SELECTORS.contentEditor);
    await humanDelay(300, 600);
  } catch {
    logger.debug("Could not click content editor, trying to type directly");
  }

  // For long content, use clipboard paste for speed
  if (content.length > 200) {
    await page.evaluate((text) => {
      const editor = document.querySelector(
        ".ql-editor, [contenteditable='true'], [class*='editor-kit-container']"
      );
      if (editor) {
        // Clear existing content
        editor.textContent = "";
        // Set new content
        editor.textContent = text;
        // Dispatch events to trigger framework state update
        editor.dispatchEvent(new Event("input", { bubbles: true }));
        editor.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }, content);
  } else {
    await humanType(page, SELECTORS.contentEditor, content);
  }

  await humanDelay(300, 600);
}

async function addTags(page: Page, tags: string[]): Promise<void> {
  logger.info(`Adding ${tags.length} tag(s)...`);

  for (const tag of tags) {
    try {
      // On Douyin, typing # in the editor triggers topic search
      const tagText = tag.startsWith("#") ? tag : `#${tag}`;

      // Try dedicated tag input first, fall back to content editor
      const tagInput = await page.$(SELECTORS.tagInput);
      const targetSelector = tagInput
        ? SELECTORS.tagInput
        : SELECTORS.contentEditor;

      await humanType(page, targetSelector, tagText);
      await humanDelay(1000, 2000); // Wait for suggestions to appear

      // Try to click the first suggestion
      try {
        await page.waitForSelector(SELECTORS.tagSuggestion, {
          visible: true,
          timeout: 3000,
        });
        await humanClick(page, SELECTORS.tagSuggestion);
      } catch {
        // If no suggestion appears, press Space to confirm the tag
        await page.keyboard.press("Space");
      }

      await humanDelay(500, 1000);
    } catch (err) {
      logger.warn(`Failed to add tag "${tag}"`, err);
    }
  }
}

async function setLocation(page: Page, location: string): Promise<void> {
  logger.info(`Setting location: "${location}"`);

  try {
    await humanType(page, SELECTORS.locationInput, location);
    await humanDelay(1000, 2000);

    // Try to click the first location suggestion
    try {
      await page.waitForSelector(SELECTORS.locationSuggestion, {
        visible: true,
        timeout: 3000,
      });
      await humanClick(page, SELECTORS.locationSuggestion);
    } catch {
      logger.warn("No location suggestions appeared, pressing Enter");
      await page.keyboard.press("Enter");
    }

    await humanDelay(500, 1000);
  } catch (err) {
    logger.warn("Failed to set location", err);
  }
}

// ── Publish controls ────────────────────────────────────────────────

async function clickPublish(page: Page): Promise<void> {
  logger.info("Clicking publish...");
  await humanDelay(500, 1000);
  await humanClick(page, SELECTORS.publishButton);
}

async function waitForPublishResult(page: Page): Promise<boolean> {
  const timeout = 60_000; // 60 seconds for publish confirmation
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    // Check for URL redirect to content management page (common success indicator)
    try {
      const currentUrl = page.url();
      if (currentUrl.includes("content/manage") || currentUrl.includes("content-manage")) {
        logger.debug("Redirected to content management — publish likely successful");
        return true;
      }
    } catch {
      // Ignore
    }

    // Check success element
    try {
      const success = await page.$(SELECTORS.publishSuccess);
      if (success) return true;
    } catch {
      // Ignore
    }

    // Check error element
    try {
      const error = await page.$(SELECTORS.publishError);
      if (error) {
        const errorText = await page.$eval(
          SELECTORS.publishError,
          (el) => el.textContent?.trim() ?? "Unknown error"
        );
        // Some "error" selectors may match non-error elements; check text content
        if (
          errorText.includes("失败") ||
          errorText.includes("error") ||
          errorText.includes("错误")
        ) {
          throw new Error(`Publish error: ${errorText}`);
        }
      }
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Publish error:")) {
        throw err;
      }
    }

    await humanDelay(1000, 2000);
  }

  return false;
}

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Resolve the description content from options.
 * Prefers explicit `content`, falls back to reading `htmlFile` if provided.
 */
function resolveContent(options: DouyinPublishOptions): string | undefined {
  if (options.content) return options.content;
  if (options.htmlFile) return readHtmlContent(options.htmlFile);
  return undefined;
}

function readHtmlContent(htmlFile: string): string {
  const absPath = path.resolve(htmlFile);
  const html = fs.readFileSync(absPath, "utf-8");

  // Strip HTML tags for plain text content
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}
