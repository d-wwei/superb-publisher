import type { Browser, Page } from "puppeteer";
import type { LoginConfig, CookieEntry } from "./types.js";
import { launchBrowser, closeBrowser } from "./browser.js";
import { saveCookies } from "./cookie-store.js";
import { applyStealthPatches, humanDelay } from "./stealth.js";
import { logger } from "./logger.js";

/**
 * Interactive login flow:
 *
 * 1. Launch a visible browser (headless: false)
 * 2. Navigate to the platform's login URL
 * 3. Wait for the user to complete login manually (scan QR, enter credentials, etc.)
 * 4. Detect login success via selector appearance or URL pattern match
 * 5. Save cookies to ~/.config/social-cli/<platform>/cookies.json
 * 6. Close the browser
 *
 * The user sees the browser window and interacts with it directly.
 * This function just orchestrates the flow and saves the result.
 */
export async function interactiveLogin(config: LoginConfig): Promise<void> {
  const {
    platform,
    loginUrl,
    successSelector,
    successUrlPattern,
    timeout = 300_000, // 5 minutes
    browserOptions = {},
  } = config;

  logger.info(`Starting login flow for ${platform}`);
  logger.info(`Login URL: ${loginUrl}`);
  logger.info(
    `Waiting for user to complete login (timeout: ${timeout / 1000}s)...`
  );

  // Force headless: false for interactive login
  const browser = await launchBrowser({
    ...browserOptions,
    headless: false,
  });

  let page: Page | undefined;

  try {
    page = (await browser.pages())[0] ?? (await browser.newPage());
    await applyStealthPatches(page);

    // Navigate to login URL
    await page.goto(loginUrl, { waitUntil: "networkidle2", timeout: 30_000 });
    await humanDelay(1000, 2000);

    // Wait for login success signal
    const loginDetected = await waitForLoginSuccess(
      page,
      successSelector,
      successUrlPattern,
      timeout
    );

    if (!loginDetected) {
      throw new Error(
        `Login timeout: user did not complete login within ${timeout / 1000}s`
      );
    }

    logger.info("Login detected! Saving cookies...");
    await humanDelay(2000, 3000); // Wait a bit for cookies to stabilize

    // Extract and save cookies
    const rawCookies = await page.cookies();
    const cookies: CookieEntry[] = rawCookies.map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path,
      expires: c.expires,
      httpOnly: c.httpOnly,
      secure: c.secure,
      sameSite: c.sameSite as CookieEntry["sameSite"],
    }));

    await saveCookies(platform, cookies);
    logger.info(`Login complete for ${platform}`);
  } finally {
    await closeBrowser(browser);
  }
}

/**
 * Wait for login success by polling for:
 * 1. A CSS selector that only appears when logged in
 * 2. A URL pattern that indicates the logged-in state
 *
 * Returns true if login was detected, false on timeout.
 */
async function waitForLoginSuccess(
  page: Page,
  selector: string,
  urlPattern: string | undefined,
  timeout: number
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    // Check selector
    try {
      const element = await page.$(selector);
      if (element) {
        logger.debug(`Login selector found: ${selector}`);
        return true;
      }
    } catch {
      // Page might be navigating; ignore
    }

    // Check URL pattern
    if (urlPattern) {
      try {
        const currentUrl = page.url();
        if (currentUrl.includes(urlPattern)) {
          logger.debug(`Login URL pattern matched: ${urlPattern}`);
          return true;
        }
      } catch {
        // Ignore
      }
    }

    // Poll every 2 seconds
    await humanDelay(1500, 2500);
  }

  return false;
}

/**
 * Restore cookies into a browser page for authenticated sessions.
 * Call this before navigating to platform pages.
 */
export async function restoreCookies(
  page: Page,
  cookies: CookieEntry[]
): Promise<void> {
  if (cookies.length === 0) return;

  await page.setCookie(
    ...cookies.map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path,
      expires: c.expires,
      httpOnly: c.httpOnly,
      secure: c.secure,
      ...(c.sameSite ? { sameSite: c.sameSite } : {}),
    }))
  );

  logger.debug(`Restored ${cookies.length} cookies to page`);
}
