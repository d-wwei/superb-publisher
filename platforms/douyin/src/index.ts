// ── @social-cli/douyin ───────────────────────────────────────────────
// Douyin browser automation: login, publish, status check.

export { login, checkLoginStatus, getCookies, logout } from "./login.js";
export { publish } from "./publish.js";
export { SELECTORS, URLS } from "./selectors.js";
export type { DouyinPublishOptions, DouyinPublishResult, DouyinLoginStatus } from "./types.js";
