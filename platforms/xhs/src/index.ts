// ── @social-cli/xhs ─────────────────────────────────────────────────
// Xiaohongshu browser automation: login, publish, status check.

export { login, checkLoginStatus, getCookies, logout } from "./login.js";
export { publish } from "./publish.js";
export { SELECTORS, URLS } from "./selectors.js";
export type { XhsPublishOptions, XhsPublishResult, XhsLoginStatus } from "./types.js";
