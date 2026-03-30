/**
 * CSS selectors for Douyin creator platform pages.
 *
 * Centralized here so they can be updated in one place
 * when Douyin changes their DOM structure.
 *
 * Target: https://creator.douyin.com/
 * Last verified: 2026-03
 */
export const SELECTORS = {
  // ── Login page ──────────────────────────────────────────────────
  /** QR code image on login page */
  loginQrCode: ".qrcode-image img, .web-login-scan-code__content img, #login_qrcode img",
  /** User avatar / element that appears after successful login */
  loginSuccess:
    ".avatar-wrapper, .creator-avatar, [class*='avatar'], .user-info-wrap",

  // ── Upload page — video mode ──────────────────────────────────
  /** File upload input for video */
  videoUploadInput:
    "input[type='file'][accept*='video'], .upload-btn input[type='file'], input[type='file'][accept*='mp4']",
  /** Upload trigger area (the visible drag & drop zone) */
  uploadTrigger:
    ".upload-btn, [class*='upload-area'], [class*='drag-upload'], [class*='upload-wrapper']",
  /** Video upload progress indicator */
  videoUploadProgress:
    "[class*='upload-progress'], [class*='progress-bar'], .semi-progress",
  /** Video upload / transcode complete indicator */
  videoUploadDone:
    "[class*='upload-success'], [class*='video-cover'], [class*='preview-cover'], .cover-select-wrapper",

  // ── Upload page — image/text (图文) mode ──────────────────────
  /** Tab / button to switch to image-text mode */
  imageTextTab:
    "[class*='publish-text'], [class*='tab-item']:nth-child(2), [class*='text-tab']",
  /** File upload input for images in image-text mode */
  imageUploadInput:
    "input[type='file'][accept*='image'], .upload-area input[type='file']",
  /** Image upload progress */
  imageUploadProgress:
    "[class*='upload-progress'], [class*='uploading']",
  /** Image upload done indicator (thumbnail rendered) */
  imageUploadDone:
    "[class*='image-card'], [class*='upload-item']:not([class*='uploading']), [class*='upload-success']",

  // ── Post editor (shared by video and image-text) ──────────────
  /** Title input field (video mode: caption area) */
  titleInput:
    "[class*='title-input'] input, .ql-editor, [data-placeholder*='标题'], [placeholder*='标题']",
  /** Content / description editor area */
  contentEditor:
    ".ql-editor, [contenteditable='true'], [class*='editor-kit-container'], [data-placeholder*='描述'], [class*='desc-input'] [contenteditable]",
  /** Tag / topic input (# trigger) */
  tagInput:
    "[class*='topic-input'] input, .ql-editor, [class*='hash-tag-input']",
  /** Tag suggestion dropdown item */
  tagSuggestion:
    "[class*='topic-item'], [class*='semi-select-option'], [class*='mention-item'], [class*='hash-tag-item']",

  // ── Cover image ───────────────────────────────────────────────
  /** Cover upload / replace button */
  coverUploadButton:
    "[class*='cover-select'], [class*='change-cover'], button:has([class*='cover'])",
  /** Cover upload file input */
  coverUploadInput:
    "[class*='cover'] input[type='file'], .cover-upload input[type='file']",

  // ── Location / POI ────────────────────────────────────────────
  /** Location input */
  locationInput:
    "[class*='location-input'] input, [placeholder*='位置'], [class*='poi-input'] input",
  /** Location suggestion item */
  locationSuggestion:
    "[class*='location-item'], [class*='semi-select-option'], [class*='poi-item']",

  // ── Publish controls ──────────────────────────────────────────
  /** Publish / submit button */
  publishButton:
    "button[class*='publish'], button[class*='submit'], [class*='btn-publish'], button:has-text('发布')",
  /** Publish success confirmation (redirect to content management or success toast) */
  publishSuccess:
    "[class*='success'], [class*='publish-success'], [class*='toast-success']",
  /** Publish error message */
  publishError:
    "[class*='error'], [class*='toast-error'], [class*='publish-error']",
} as const;

/**
 * Douyin URLs used in automation.
 */
export const URLS = {
  /** Main site */
  home: "https://www.douyin.com",
  /** Creator center home (login detection URL) */
  creatorHome: "https://creator.douyin.com/creator-micro/home",
  /** Video upload page */
  videoUpload: "https://creator.douyin.com/creator-micro/content/upload",
  /** Image-text publish page */
  imagePublish: "https://creator.douyin.com/creator-micro/content/publish",
  /** Content management (success redirect target) */
  contentManage: "https://creator.douyin.com/creator-micro/content/manage",
} as const;
