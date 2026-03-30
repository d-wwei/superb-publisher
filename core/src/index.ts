// ── @social-cli/core ─────────────────────────────────────────────────
// Shared browser automation infrastructure for social platform CLIs.

export { launchBrowser, closeBrowser } from "./browser.js";

export {
  saveCookies,
  loadCookies,
  isValid,
  clearCookies,
  getConfigDir,
} from "./cookie-store.js";

export { interactiveLogin, restoreCookies } from "./login-flow.js";

export {
  uploadFiles,
  waitForUploadComplete,
  isImageFile,
  isVideoFile,
} from "./media-upload.js";

export {
  humanDelay,
  humanType,
  humanClick,
  humanScroll,
  randomUserAgent,
  applyStealthPatches,
} from "./stealth.js";

export { logger, setLogLevel } from "./logger.js";

export type {
  BrowserOptions,
  CookieEntry,
  CookieStore,
  LoginConfig,
  UploadResult,
  UploadOptions,
  PublishOptions,
  PublishResult,
  LogLevel,
} from "./types.js";
