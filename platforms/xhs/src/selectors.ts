/**
 * CSS selectors for Xiaohongshu pages.
 *
 * Centralized here so they can be updated in one place
 * when XHS changes their DOM structure.
 *
 * Last verified: 2026-03
 */
export const SELECTORS = {
  // ── Login page ──────────────────────────────────────────────────
  /** QR code image on login page */
  loginQrCode: ".qrcode-img, .login-qrcode img",
  /** User avatar that appears after successful login */
  loginSuccess: ".user-avatar, .side-bar .avatar, .reds-account-logo",

  // ── Creator center / publish page ──────────────────────────────
  /** File upload input for images */
  imageUploadInput: "input[type='file'][accept*='image']",
  /** File upload input for video */
  videoUploadInput: "input[type='file'][accept*='video']",
  /** Upload trigger area (click to open file picker) */
  uploadTrigger: ".upload-wrapper, .drag-over, [class*='upload']",

  // ── Post editor ────────────────────────────────────────────────
  /** Title input field */
  titleInput: "#note-title, .title-input input, [placeholder*='标题']",
  /** Content/body editor area */
  contentEditor:
    "#note-content, .ql-editor, [contenteditable='true'], .content-input [contenteditable]",
  /** Tag/topic input */
  tagInput: "#note-tag-input, .tag-input input, [placeholder*='话题']",
  /** Tag suggestion item */
  tagSuggestion: ".tag-suggestion-item, .topic-item, [class*='tag-item']",

  // ── Image post ─────────────────────────────────────────────────
  /** Individual uploaded image thumbnail */
  uploadedImageThumb: ".image-item, .upload-item, [class*='image-card']",
  /** Image upload progress indicator */
  imageUploadProgress: ".upload-progress, [class*='progress']",
  /** Image upload success indicator */
  imageUploadDone:
    ".upload-success, .image-item:not(.uploading), [class*='upload-complete']",

  // ── Video post ─────────────────────────────────────────────────
  /** Video upload progress */
  videoUploadProgress: ".video-progress, [class*='video-upload']",
  /** Cover image upload input */
  coverUploadInput:
    ".cover-upload input[type='file'], [class*='cover'] input[type='file']",

  // ── Publish controls ───────────────────────────────────────────
  /** Publish / submit button */
  publishButton:
    "button.submit, button[class*='publish'], .btn-publish, button:has-text('发布')",
  /** Publish success confirmation */
  publishSuccess:
    ".publish-success, [class*='success'], .result-tip, [class*='publish-done']",
  /** Publish error message */
  publishError: ".publish-error, [class*='error-tip'], .toast-error",

  // ── Post type switch ───────────────────────────────────────────
  /** Tab/button to switch to image post mode */
  imagePostTab: "[class*='image-tab'], [class*='note-tab']",
  /** Tab/button to switch to video post mode */
  videoPostTab: "[class*='video-tab']",
} as const;

/**
 * XHS URLs used in automation.
 */
export const URLS = {
  /** Main site (for login) */
  home: "https://www.xiaohongshu.com",
  /** Creator center publish page */
  publish: "https://creator.xiaohongshu.com/publish/publish",
  /** Creator center home */
  creatorHome: "https://creator.xiaohongshu.com",
} as const;
