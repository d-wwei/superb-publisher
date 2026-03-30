import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import type { CookieEntry, CookieStore } from "./types.js";
import { logger } from "./logger.js";

/**
 * Base directory for all social-cli config and data.
 * ~/.config/social-cli/<platform>/
 */
function configDir(platform: string): string {
  const base =
    process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config");
  return path.join(base, "social-cli", platform);
}

function cookiePath(platform: string): string {
  return path.join(configDir(platform), "cookies.json");
}

/**
 * Save cookies for a platform.
 */
export async function saveCookies(
  platform: string,
  cookies: CookieEntry[]
): Promise<void> {
  const dir = configDir(platform);
  fs.mkdirSync(dir, { recursive: true });

  const store: CookieStore = {
    platform,
    cookies,
    savedAt: new Date().toISOString(),
  };

  const filePath = cookiePath(platform);
  fs.writeFileSync(filePath, JSON.stringify(store, null, 2), "utf-8");
  fs.chmodSync(filePath, 0o600); // restrict permissions

  logger.info(`Cookies saved for ${platform} (${cookies.length} entries)`);
}

/**
 * Load cookies for a platform. Returns null if no cookies file exists.
 */
export function loadCookies(platform: string): CookieEntry[] | null {
  const filePath = cookiePath(platform);
  if (!fs.existsSync(filePath)) {
    logger.debug(`No cookies file for ${platform}`);
    return null;
  }

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const store: CookieStore = JSON.parse(raw);
    logger.debug(
      `Loaded ${store.cookies.length} cookies for ${platform} (saved ${store.savedAt})`
    );
    return store.cookies;
  } catch (err) {
    logger.warn(`Failed to parse cookies for ${platform}`, err);
    return null;
  }
}

/**
 * Check if stored cookies are still valid (not expired).
 * Returns true if at least one non-expired cookie exists.
 * Returns false if no cookies or all are expired.
 */
export function isValid(platform: string): boolean {
  const cookies = loadCookies(platform);
  if (!cookies || cookies.length === 0) return false;

  const now = Date.now() / 1000; // cookies use seconds

  // Check if there are any session-critical cookies that haven't expired
  const validCookies = cookies.filter(
    (c) => c.expires === -1 || c.expires === 0 || c.expires > now
  );

  if (validCookies.length === 0) {
    logger.info(`All cookies expired for ${platform}`);
    return false;
  }

  logger.debug(
    `${validCookies.length}/${cookies.length} valid cookies for ${platform}`
  );
  return true;
}

/**
 * Clear stored cookies for a platform.
 */
export function clearCookies(platform: string): void {
  const filePath = cookiePath(platform);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    logger.info(`Cookies cleared for ${platform}`);
  }
}

/**
 * Get the config directory path for a platform.
 * Useful for storing platform-specific config beyond cookies.
 */
export function getConfigDir(platform: string): string {
  const dir = configDir(platform);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
