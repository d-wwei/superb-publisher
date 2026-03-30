import * as fs from "node:fs";
import * as path from "node:path";
import type { Page } from "puppeteer";
import type { UploadOptions, UploadResult } from "./types.js";
import { humanDelay } from "./stealth.js";
import { logger } from "./logger.js";

/**
 * Upload files through a file input element on the page.
 *
 * This is the generic upload helper. Platform-specific publish modules
 * call this with the correct selector and file paths.
 *
 * @param page Puppeteer page with the upload form
 * @param options Upload configuration
 * @returns Upload result with success status
 */
export async function uploadFiles(
  page: Page,
  options: UploadOptions
): Promise<UploadResult> {
  const { inputSelector, files, timeout = 60_000 } = options;

  // Validate files exist
  for (const file of files) {
    const absPath = path.resolve(file);
    if (!fs.existsSync(absPath)) {
      return {
        success: false,
        error: `File not found: ${absPath}`,
      };
    }
  }

  try {
    // Wait for the file input element
    await page.waitForSelector(inputSelector, { timeout: 10_000 });

    const inputElement = await page.$(inputSelector);
    if (!inputElement) {
      return {
        success: false,
        error: `Upload input not found: ${inputSelector}`,
      };
    }

    // Resolve absolute paths
    const absPaths = files.map((f) => path.resolve(f));

    logger.info(`Uploading ${absPaths.length} file(s)...`);
    for (const f of absPaths) {
      logger.debug(`  ${f}`);
    }

    // Upload files via the input element
    await inputElement.uploadFile(...absPaths);

    // Wait for upload to complete (platform-specific indicators)
    await humanDelay(2000, 3000);

    logger.info("File upload triggered");
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Upload failed", message);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Wait for upload progress to finish.
 *
 * Polls for disappearance of a progress indicator or appearance
 * of a success indicator.
 *
 * @param page Puppeteer page
 * @param doneSelector Selector that appears when upload is complete
 * @param progressSelector Selector that is present during upload
 * @param timeout Max wait time in ms
 */
export async function waitForUploadComplete(
  page: Page,
  doneSelector: string,
  progressSelector?: string,
  timeout: number = 60_000
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    // Check if done indicator appeared
    const done = await page.$(doneSelector);
    if (done) {
      logger.debug("Upload complete indicator found");
      return true;
    }

    // Check if progress indicator disappeared
    if (progressSelector) {
      const progress = await page.$(progressSelector);
      if (!progress) {
        // Give it a moment to render the done state
        await humanDelay(500, 1000);
        const doneCheck = await page.$(doneSelector);
        if (doneCheck) return true;
      }
    }

    await humanDelay(500, 1000);
  }

  logger.warn("Upload completion wait timed out");
  return false;
}

/**
 * Check if a file is a supported image type.
 */
export function isImageFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".heic"].includes(
    ext
  );
}

/**
 * Check if a file is a supported video type.
 */
export function isVideoFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return [".mp4", ".mov", ".avi", ".mkv", ".wmv", ".flv", ".webm"].includes(
    ext
  );
}
