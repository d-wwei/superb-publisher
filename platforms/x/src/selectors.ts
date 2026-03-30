/**
 * CSS selectors for X.com (Twitter) pages.
 *
 * X uses `data-testid` attributes extensively, which are more stable
 * than class names. Prefer these wherever possible.
 *
 * Last verified: 2026-03
 */
export const SELECTORS = {
  // ── Login ──────────────────────────────────────────────────────────
  /** Login success: the compose tweet button on the home timeline. */
  loginSuccess:
    '[data-testid="SideNav_NewTweet_Button"], [data-testid="tweetButtonInline"], [aria-label="Home timeline"]',

  // ── Compose / Tweet editor ────────────────────────────────────────
  /** The tweet compose text area (contenteditable div). */
  tweetTextarea:
    '[data-testid="tweetTextarea_0"], [data-testid="tweetTextarea_0RichTextInputContainer"] [contenteditable="true"]',
  /** Inline compose area on the home timeline. */
  tweetTextareaInline:
    '[data-testid="tweetTextarea_0"]',
  /** File input for media uploads (hidden, used via uploadFile). */
  mediaUploadInput:
    'input[data-testid="fileInput"], input[accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime"]',
  /** The media button in the compose toolbar. */
  mediaButton:
    '[data-testid="fileInput"]',

  // ── Thread ────────────────────────────────────────────────────────
  /** Button to add another tweet to a thread. */
  addThreadButton:
    '[data-testid="addButton"], [aria-label="Add post"]',
  /** Tweet textarea in thread (index-based: tweetTextarea_0, _1, _2, ...). */
  threadTextarea: (index: number) =>
    `[data-testid="tweetTextarea_${index}"]`,
  /** Thread file input (index-based). */
  threadFileInput: (index: number) =>
    `[data-testid="fileInput"]:nth-of-type(${index + 1})`,

  // ── Publish buttons ───────────────────────────────────────────────
  /** Primary tweet/post button (compose dialog). */
  tweetButton:
    '[data-testid="tweetButton"]',
  /** Inline tweet button on home timeline. */
  tweetButtonInline:
    '[data-testid="tweetButtonInline"]',
  /** "Post all" button for threads (same as tweetButton). */
  postAllButton:
    '[data-testid="tweetButton"]',

  // ── Reply ─────────────────────────────────────────────────────────
  /** Reply textarea on a tweet detail page. */
  replyTextarea:
    '[data-testid="tweetTextarea_0"]',
  /** Reply button (in the tweet detail reply compose). */
  replyButton:
    '[data-testid="tweetButton"], [data-testid="tweetButtonInline"]',

  // ── Media upload indicators ───────────────────────────────────────
  /** Thumbnail preview of uploaded media. */
  mediaThumbnail:
    '[data-testid="attachments"] img, [data-testid="swipe-to-dismiss"] img',
  /** Media upload progress spinner. */
  mediaUploadProgress:
    '[role="progressbar"], [data-testid="progressRing"]',
  /** Video processing indicator. */
  videoProcessing:
    '[data-testid="videoComponent"] [role="progressbar"]',

  // ── Post-publish indicators ───────────────────────────────────────
  /** Toast notification after successful post. */
  publishToast:
    '[data-testid="toast"], [role="alert"]',
  /** Error toast / rate limit banner. */
  errorMessage:
    '[data-testid="toast"][role="alert"], [data-testid="error-detail"]',

  // ── Navigation & profile ──────────────────────────────────────────
  /** Side nav new tweet button. */
  sideNavNewTweet:
    '[data-testid="SideNav_NewTweet_Button"]',
  /** Account switcher / avatar in sidebar. */
  accountSwitcher:
    '[data-testid="SideNav_AccountSwitcher_Button"]',
  /** Username display in the account switcher popup. */
  accountUsername:
    '[data-testid="UserCell"] [dir="ltr"] span',

  // ── Article (long-form) ───────────────────────────────────────────
  /** Article title input. */
  articleTitleInput:
    '[data-testid="articleTitle"], [placeholder*="Title"], .public-DraftEditor-content',
  /** Article body editor. */
  articleBodyEditor:
    '[data-testid="articleBody"], .public-DraftEditor-content, [contenteditable="true"]',
  /** Article cover upload. */
  articleCoverInput:
    'input[type="file"]',
  /** Article publish button. */
  articlePublishButton:
    '[data-testid="publishButton"], button[data-testid="confirmationSheetConfirm"]',
} as const;

/**
 * X/Twitter URLs used in automation.
 */
export const URLS = {
  /** Home timeline (compose inline). */
  home: "https://x.com/home",
  /** Login flow entry. */
  login: "https://x.com/i/flow/login",
  /** Compose dialog (direct link). */
  compose: "https://x.com/compose/post",
  /** Long-form article editor (X Premium). */
  article: "https://x.com/i/articles/new",
} as const;
