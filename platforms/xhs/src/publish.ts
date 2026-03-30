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
import type { XhsPublishOptions, XhsPublishResult } from "./types.js";

const PLATFORM = "xhs";

// ── Limits ──────────────────────────────────────────────────────────

const MAX_IMAGES = 18;
const MAX_TITLE_LENGTH = 20;
const MAX_CONTENT_LENGTH = 1000;

/**
 * Publish a post (image or video) to Xiaohongshu.
 *
 * Flow:
 * 1. Validate inputs (file existence, limits)
 * 2. Launch browser with saved cookies
 * 3. Navigate to creator.xiaohongshu.com/publish/publish
 * 4. Upload media (images or video)
 * 5. Fill title & content
 * 6. Add tags
 * 7. Click publish
 * 8. Wait for confirmation
 */
export async function publish(
  options: XhsPublishOptions
): Promise<XhsPublishResult> {
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
      error: "Not logged in. Run: xhs-cli login",
    };
  }

  const cookies = loadCookies(PLATFORM);
  if (!cookies) {
    return {
      success: false,
      error: "Failed to load cookies. Run: xhs-cli login",
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

    // Navigate to publish page
    logger.info("Opening publish page...");
    await page.goto(URLS.publish, {
      waitUntil: "networkidle2",
      timeout: 30_000,
    });
    await humanDelay(2000, 3000);

    // Check if redirected to login
    if (page.url().includes("login")) {
      return {
        success: false,
        error: "Session expired. Run: xhs-cli login",
      };
    }

    // Upload media
    if (postType === "video" && options.video) {
      await uploadVideo(page, options.video, options.cover);
    } else if (options.images && options.images.length > 0) {
      await uploadImages(page, options.images);
    }

    // Fill title
    await fillTitle(page, options.title);

    // Fill content
    const content = options.content ?? (options.htmlFile ? readHtmlContent(options.htmlFile) : "");
    if (content) {
      await fillContent(page, content);
    }

    // Add tags
    if (options.tags && options.tags.length > 0) {
      await addTags(page, options.tags);
    }

    // Publish
    await clickPublish(page);

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

// ── Validation ──────────────────────────────────────────────────────

function validateOptions(options: XhsPublishOptions): string[] {
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

async function uploadVideo(
  page: Page,
  video: string,
  cover?: string
): Promise<void> {
  logger.info("Uploading video...");

  // Switch to video tab if needed
  try {
    await humanClick(page, SELECTORS.videoPostTab);
    await humanDelay(1000, 2000);
  } catch {
    // May already be on video tab
  }

  const result = await uploadFiles(page, {
    inputSelector: SELECTORS.videoUploadInput,
    files: [video],
    timeout: 60_000,
  });

  if (!result.success) {
    throw new Error(`Video upload failed: ${result.error}`);
  }

  // Video uploads take longer
  await waitForUploadComplete(
    page,
    SELECTORS.imageUploadDone,
    SELECTORS.videoUploadProgress,
    300_000 // 5 min for video
  );

  // Upload cover image if provided
  if (cover) {
    logger.info("Uploading cover image...");
    await humanDelay(1000, 2000);
    const coverResult = await uploadFiles(page, {
      inputSelector: SELECTORS.coverUploadInput,
      files: [cover],
      timeout: 30_000,
    });
    if (!coverResult.success) {
      logger.warn(`Cover upload failed: ${coverResult.error}`);
    }
  }

  await humanDelay(1000, 2000);
}

// ── Editor helpers ──────────────────────────────────────────────────

async function fillTitle(page: Page, title: string): Promise<void> {
  logger.info(`Setting title: "${title}"`);
  await humanType(page, SELECTORS.titleInput, title);
  await humanDelay(300, 600);
}

async function fillContent(page: Page, content: string): Promise<void> {
  logger.info("Setting content...");

  // Click into content area first
  await humanClick(page, SELECTORS.contentEditor);
  await humanDelay(300, 600);

  // Type content. For long content, use clipboard paste for speed.
  if (content.length > 200) {
    // Use keyboard paste for long content
    await page.evaluate((text) => {
      const editor = document.querySelector(
        "#note-content, .ql-editor, [contenteditable='true']"
      );
      if (editor) {
        editor.textContent = text;
        // Dispatch input event to trigger framework state update
        editor.dispatchEvent(new Event("input", { bubbles: true }));
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
      // Type # + tag name to trigger topic search
      const tagText = tag.startsWith("#") ? tag : `#${tag}`;
      await humanType(page, SELECTORS.tagInput, tagText);
      await humanDelay(800, 1500); // Wait for suggestions

      // Try to click the first suggestion
      try {
        await humanClick(page, SELECTORS.tagSuggestion);
      } catch {
        // If no suggestion, press Enter to confirm
        await page.keyboard.press("Enter");
      }

      await humanDelay(500, 1000);
    } catch (err) {
      logger.warn(`Failed to add tag "${tag}"`, err);
    }
  }
}

async function clickPublish(page: Page): Promise<void> {
  logger.info("Clicking publish...");
  await humanDelay(500, 1000);
  await humanClick(page, SELECTORS.publishButton);
}

async function waitForPublishResult(page: Page): Promise<boolean> {
  const timeout = 30_000;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    // Check success
    try {
      const success = await page.$(SELECTORS.publishSuccess);
      if (success) return true;
    } catch {
      // Ignore
    }

    // Check error
    try {
      const error = await page.$(SELECTORS.publishError);
      if (error) {
        const errorText = await page.$eval(
          SELECTORS.publishError,
          (el) => el.textContent?.trim() ?? "Unknown error"
        );
        throw new Error(`Publish error: ${errorText}`);
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
