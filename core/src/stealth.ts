import type { Page } from "puppeteer";
import { logger } from "./logger.js";

/**
 * Random delay to mimic human behavior.
 * @param min Minimum delay in ms. Default: 100.
 * @param max Maximum delay in ms. Default: 500.
 */
export async function humanDelay(
  min: number = 100,
  max: number = 500
): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Type text character by character with random inter-key delays,
 * simulating human typing behavior.
 */
export async function humanType(
  page: Page,
  selector: string,
  text: string
): Promise<void> {
  logger.debug(`Typing into ${selector}: "${text.slice(0, 30)}..."`);

  await page.waitForSelector(selector, { visible: true, timeout: 10000 });
  await humanClick(page, selector);
  await humanDelay(200, 400);

  for (const char of text) {
    await page.keyboard.type(char, {
      delay: Math.floor(Math.random() * 100) + 50, // 50-150ms per char
    });
  }
}

/**
 * Click an element with human-like behavior:
 * 1. Wait for element to be visible
 * 2. Move mouse to element with natural curve (simplified)
 * 3. Small random delay before click
 * 4. Click
 */
export async function humanClick(
  page: Page,
  selector: string
): Promise<void> {
  logger.debug(`Clicking ${selector}`);

  await page.waitForSelector(selector, { visible: true, timeout: 10000 });

  const element = await page.$(selector);
  if (!element) {
    throw new Error(`Element not found: ${selector}`);
  }

  const box = await element.boundingBox();
  if (!box) {
    throw new Error(`Element has no bounding box: ${selector}`);
  }

  // Click at a random point within the element (not dead center)
  const x = box.x + box.width * (0.3 + Math.random() * 0.4);
  const y = box.y + box.height * (0.3 + Math.random() * 0.4);

  // Move to element with steps (simulates natural mouse movement)
  await page.mouse.move(x, y, { steps: Math.floor(Math.random() * 10) + 5 });
  await humanDelay(50, 150);
  await page.mouse.click(x, y);
}

/**
 * Scroll the page smoothly, simulating human scroll behavior.
 * @param page Puppeteer page
 * @param distance Pixels to scroll (positive = down, negative = up)
 * @param steps Number of scroll steps. Default: 5.
 */
export async function humanScroll(
  page: Page,
  distance: number,
  steps: number = 5
): Promise<void> {
  const stepDistance = distance / steps;
  for (let i = 0; i < steps; i++) {
    await page.evaluate((d) => window.scrollBy(0, d), stepDistance);
    await humanDelay(50, 200);
  }
}

/**
 * Randomly selected User-Agent strings for Chrome on macOS.
 * Updated periodically to match common browser versions.
 */
const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
];

/**
 * Get a random User-Agent string.
 */
export function randomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Apply additional stealth patches to a page.
 * Call after page creation for extra anti-detection.
 */
export async function applyStealthPatches(page: Page): Promise<void> {
  // Override navigator.webdriver
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", {
      get: () => undefined,
    });
  });

  // Override chrome runtime
  await page.evaluateOnNewDocument(() => {
    (window as any).chrome = {
      runtime: {},
    };
  });

  // Override permissions query
  await page.evaluateOnNewDocument(() => {
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters: any) =>
      parameters.name === "notifications"
        ? Promise.resolve({
            state: Notification.permission,
          } as PermissionStatus)
        : originalQuery(parameters);
  });

  // Override plugins length
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "plugins", {
      get: () => [1, 2, 3, 4, 5],
    });
  });

  logger.debug("Stealth patches applied to page");
}
