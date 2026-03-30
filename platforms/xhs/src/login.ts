import {
  interactiveLogin,
  loadCookies,
  isValid,
  clearCookies,
  launchBrowser,
  closeBrowser,
  restoreCookies,
  applyStealthPatches,
  humanDelay,
  logger,
} from "@social-cli/core";
import type { CookieEntry } from "@social-cli/core";
import { SELECTORS, URLS } from "./selectors.js";
import type { XhsLoginStatus } from "./types.js";

const PLATFORM = "xhs";

/**
 * Launch interactive login for Xiaohongshu.
 *
 * Opens a visible browser window at xiaohongshu.com.
 * User scans the QR code with the XHS mobile app.
 * Cookies are saved automatically once login is detected.
 */
export async function login(): Promise<void> {
  await interactiveLogin({
    platform: PLATFORM,
    loginUrl: URLS.home,
    successSelector: SELECTORS.loginSuccess,
    successUrlPattern: "xiaohongshu.com/user/profile",
    timeout: 300_000, // 5 minutes to scan QR
    browserOptions: {
      headless: false,
    },
  });
}

/**
 * Check the current login status:
 * 1. Are cookies present and not expired?
 * 2. Can we load a logged-in page with those cookies?
 */
export async function checkLoginStatus(): Promise<XhsLoginStatus> {
  const result: XhsLoginStatus = {
    cookiesValid: false,
    sessionActive: false,
  };

  // Check cookies on disk
  if (!isValid(PLATFORM)) {
    logger.info("No valid cookies found for XHS");
    return result;
  }

  result.cookiesValid = true;
  const cookies = loadCookies(PLATFORM);
  if (!cookies) return result;

  // Verify session by loading the creator center
  const browser = await launchBrowser({ headless: true });
  try {
    const page = (await browser.pages())[0] ?? (await browser.newPage());
    await applyStealthPatches(page);
    await restoreCookies(page, cookies);

    await page.goto(URLS.creatorHome, {
      waitUntil: "networkidle2",
      timeout: 15_000,
    });
    await humanDelay(1000, 2000);

    // Check if we're on the creator center (not redirected to login)
    const currentUrl = page.url();
    if (
      currentUrl.includes("creator.xiaohongshu.com") &&
      !currentUrl.includes("login")
    ) {
      result.sessionActive = true;

      // Try to extract username
      try {
        const username = await page.$eval(
          ".user-name, .account-name, [class*='user-name']",
          (el) => el.textContent?.trim() ?? ""
        );
        if (username) result.username = username;
      } catch {
        // Username extraction is optional
      }
    }
  } catch (err) {
    logger.warn("Session check failed", err);
  } finally {
    await closeBrowser(browser);
  }

  return result;
}

/**
 * Get stored cookies for XHS, or null if not available.
 */
export function getCookies(): CookieEntry[] | null {
  return loadCookies(PLATFORM);
}

/**
 * Clear stored XHS cookies (logout).
 */
export function logout(): void {
  clearCookies(PLATFORM);
  logger.info("XHS cookies cleared");
}
