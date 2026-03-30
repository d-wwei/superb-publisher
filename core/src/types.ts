import type { Browser, Page, PuppeteerLaunchOptions } from "puppeteer";

// ── Browser ─────────────────────────────────────────────────────────

export interface BrowserOptions {
  /** Show browser window. Default: false (headless). */
  headless?: boolean;
  /** Chrome/Chromium user data directory for persistent sessions. */
  userDataDir?: string;
  /** Viewport width. Default: 1280. */
  viewportWidth?: number;
  /** Viewport height. Default: 800. */
  viewportHeight?: number;
  /** Browser language. Default: "zh-CN". */
  language?: string;
  /** Timezone. Default: "Asia/Shanghai". */
  timezone?: string;
  /** Extra Puppeteer launch options. */
  extraArgs?: string[];
  /** Custom executable path for Chrome/Chromium. */
  executablePath?: string;
}

// ── Cookie ──────────────────────────────────────────────────────────

export interface CookieEntry {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

export interface CookieStore {
  platform: string;
  cookies: CookieEntry[];
  savedAt: string; // ISO 8601
}

// ── Login ───────────────────────────────────────────────────────────

export interface LoginConfig {
  /** Platform identifier (e.g., "xhs", "douyin", "x"). */
  platform: string;
  /** URL to navigate to for login. */
  loginUrl: string;
  /**
   * CSS selector that appears only after successful login.
   * The flow waits for this selector to confirm login.
   */
  successSelector: string;
  /**
   * Alternative: URL pattern that indicates login success.
   * If the page URL matches this pattern, login is considered done.
   */
  successUrlPattern?: string;
  /** Timeout for user to complete login (ms). Default: 300000 (5 min). */
  timeout?: number;
  /** Browser options override. */
  browserOptions?: BrowserOptions;
}

// ── Media Upload ────────────────────────────────────────────────────

export interface UploadResult {
  /** Whether the upload succeeded. */
  success: boolean;
  /** Platform-specific file/media identifier after upload. */
  fileId?: string;
  /** URL of the uploaded file, if available. */
  url?: string;
  /** Error message on failure. */
  error?: string;
}

export interface UploadOptions {
  /** CSS selector for the file input element. */
  inputSelector: string;
  /** File path(s) to upload. */
  files: string[];
  /** Timeout for upload completion (ms). Default: 60000. */
  timeout?: number;
}

// ── Platform Publish ────────────────────────────────────────────────

export interface PublishOptions {
  /** Post title. */
  title: string;
  /** Post content (plain text). */
  content?: string;
  /** Post content as HTML file path. */
  htmlFile?: string;
  /** Image file paths. */
  images?: string[];
  /** Video file path. */
  video?: string;
  /** Video cover image path. */
  cover?: string;
  /** Hashtag / topic tags. */
  tags?: string[];
}

export interface PublishResult {
  success: boolean;
  /** Platform-specific post URL or ID, if available. */
  postUrl?: string;
  postId?: string;
  error?: string;
}

// ── Logger ──────────────────────────────────────────────────────────

export type LogLevel = "debug" | "info" | "warn" | "error";
