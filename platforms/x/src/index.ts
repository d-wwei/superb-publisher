// ── @social-cli/x ───────────────────────────────────────────────────
// X (Twitter) browser automation: login, publish, thread, article.

export { login, checkLoginStatus, getCookies, logout } from "./login.js";
export { publish } from "./publish.js";
export { SELECTORS, URLS } from "./selectors.js";
export type {
  XPublishOptions,
  XPublishResult,
  XLoginStatus,
} from "./types.js";
