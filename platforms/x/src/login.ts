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
import type { XLoginStatus } from "./types.js";

const PLATFORM = "x";

/**
 * Launch interactive login for X/Twitter.
 *
 * Opens a visible browser window at x.com/i/flow/login.
 * User completes login manually (email/username + password + optional 2FA).
 * Cookies are saved automatically once login is detected.
 */
export async function login(): Promise<void> {
  await interactiveLogin({
    platform: PLATFORM,
    loginUrl: URLS.login,
    successSelector: SELECTORS.loginSuccess,
    successUrlPattern: "x.com/home",
    timeout: 300_000, // 5 minutes for manual login + possible 2FA
    browserOptions: {
      headless: false,
      language: "en-US",
      timezone: "America/Toronto",
    },
  });
}

/**
 * Check the current login status:
 * 1. Are cookies present and not expired?
 * 2. Can we load the home timeline with those cookies?
 */
export async function checkLoginStatus(): Promise<XLoginStatus> {
  const result: XLoginStatus = {
    cookiesValid: false,
    sessionActive: false,
  };

  // Check cookies on disk
  if (!isValid(PLATFORM)) {
    logger.info("No valid cookies found for X");
    return result;
  }

  result.cookiesValid = true;
  const cookies = loadCookies(PLATFORM);
  if (!cookies) return result;

  // Verify session by loading the home timeline
  const browser = await launchBrowser({
    headless: true,
    language: "en-US",
    timezone: "America/Toronto",
  });

  try {
    const page = (await browser.pages())[0] ?? (await browser.newPage());
    await applyStealthPatches(page);
    await restoreCookies(page, cookies);

    await page.goto(URLS.home, {
      waitUntil: "networkidle2",
      timeout: 20_000,
    });
    await humanDelay(2000, 3000);

    // Check if we ended up on the home timeline (not redirected to login)
    const currentUrl = page.url();
    if (currentUrl.includes("x.com/home") && !currentUrl.includes("login")) {
      result.sessionActive = true;

      // Try to extract username from the account switcher
      try {
        await humanClick(page, SELECTORS.accountSwitcher);
        await humanDelay(500, 1000);
        const username = await page.$eval(
          SELECTORS.accountUsername,
          (el) => el.textContent?.trim() ?? ""
        );
        if (username) result.username = username;
      } catch {
        // Username extraction is optional
      }
    } else {
      logger.info("Session appears to be expired (redirected from home)");
    }
  } catch (err) {
    logger.warn("Session check failed", err);
  } finally {
    await closeBrowser(browser);
  }

  return result;
}

/**
 * Get stored cookies for X, or null if not available.
 */
export function getCookies(): CookieEntry[] | null {
  return loadCookies(PLATFORM);
}

/**
 * Clear stored X cookies (logout).
 */
export function logout(): void {
  clearCookies(PLATFORM);
  logger.info("X cookies cleared");
}

// ── Internal helper (re-imported from stealth but used locally) ─────

async function humanClick(page: import("puppeteer").Page, selector: string) {
  const { humanClick: click } = await import("@social-cli/core");
  await click(page, selector);
}
