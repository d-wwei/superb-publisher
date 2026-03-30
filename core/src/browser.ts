import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser } from "puppeteer";
import type { BrowserOptions } from "./types.js";
import { logger } from "./logger.js";

// Register stealth plugin once at module level
puppeteer.use(StealthPlugin());

const DEFAULT_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-blink-features=AutomationControlled",
  "--disable-infobars",
  "--window-size=1280,800",
];

/**
 * Launch a Puppeteer browser instance with stealth and anti-detection.
 *
 * Uses puppeteer-extra with stealth plugin to avoid bot detection.
 * Supports persistent sessions via userDataDir.
 */
export async function launchBrowser(
  options: BrowserOptions = {}
): Promise<Browser> {
  const {
    headless = true,
    userDataDir,
    viewportWidth = 1280,
    viewportHeight = 800,
    language = "zh-CN",
    timezone = "Asia/Shanghai",
    extraArgs = [],
    executablePath,
  } = options;

  const args = [
    ...DEFAULT_ARGS,
    `--window-size=${viewportWidth},${viewportHeight}`,
    `--lang=${language}`,
    ...extraArgs,
  ];

  logger.debug("Launching browser", {
    headless,
    userDataDir: userDataDir ?? "(default)",
  });

  const launchOptions: Record<string, unknown> = {
    headless: headless ? "new" : false,
    args,
    defaultViewport: {
      width: viewportWidth,
      height: viewportHeight,
    },
    ignoreDefaultArgs: ["--enable-automation"],
  };

  if (userDataDir) {
    launchOptions.userDataDir = userDataDir;
  }

  if (executablePath) {
    launchOptions.executablePath = executablePath;
  }

  const browser = await puppeteer.launch(launchOptions);

  // Set timezone on the default page
  const pages = await browser.pages();
  for (const page of pages) {
    await page.emulateTimezone(timezone);
  }

  // Hook into new pages to set timezone automatically
  browser.on("targetcreated", async (target) => {
    try {
      const page = await target.page();
      if (page) {
        await page.emulateTimezone(timezone);
      }
    } catch {
      // Target might not be a page; ignore
    }
  });

  logger.info("Browser launched");
  return browser as unknown as Browser;
}

/**
 * Close the browser gracefully.
 */
export async function closeBrowser(browser: Browser): Promise<void> {
  try {
    await browser.close();
    logger.info("Browser closed");
  } catch (err) {
    logger.warn("Error closing browser", err);
  }
}
