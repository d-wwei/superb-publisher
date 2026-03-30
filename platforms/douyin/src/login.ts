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
import type { DouyinLoginStatus } from "./types.js";

const PLATFORM = "douyin";

/**
 * Launch interactive login for Douyin.
 *
 * Opens a visible browser window at the Douyin creator platform.
 * User scans the QR code with the Douyin mobile app or logs in
 * via phone number + verification code.
 * Cookies are saved automatically once login is detected.
 */
export async function login(): Promise<void> {
  await interactiveLogin({
    platform: PLATFORM,
    loginUrl: URLS.creatorHome,
    successSelector: SELECTORS.loginSuccess,
    successUrlPattern: "creator-micro/home",
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
export async function checkLoginStatus(): Promise<DouyinLoginStatus> {
  const result: DouyinLoginStatus = {
    cookiesValid: false,
    sessionActive: false,
  };

  // Check cookies on disk
  if (!isValid(PLATFORM)) {
    logger.info("No valid cookies found for Douyin");
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
    await humanDelay(2000, 3000);

    // Check if we're on the creator center (not redirected to login)
    const currentUrl = page.url();
    if (
      currentUrl.includes("creator.douyin.com") &&
      !currentUrl.includes("login")
    ) {
      result.sessionActive = true;

      // Try to extract username
      try {
        const username = await page.$eval(
          ".avatar-wrapper, .user-info-wrap .user-name, [class*='user-name'], [class*='nickname']",
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
 * Get stored cookies for Douyin, or null if not available.
 */
export function getCookies(): CookieEntry[] | null {
  return loadCookies(PLATFORM);
}

/**
 * Clear stored Douyin cookies (logout).
 */
export function logout(): void {
  clearCookies(PLATFORM);
  logger.info("Douyin cookies cleared");
}
