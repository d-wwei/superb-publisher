import type { PublishOptions, PublishResult } from "@social-cli/core";

// ── X/Twitter-specific types ────────────────────────────────────────

export interface XPublishOptions extends PublishOptions {
  /** Tweet text (max 280 chars; 25,000 for Premium users). */
  text: string;
  /** Image file paths (max 4, mutually exclusive with video). */
  images?: string[];
  /** Video file path (mutually exclusive with images). */
  video?: string;
  /** URL of tweet to quote. X auto-embeds the preview. */
  quoteUrl?: string;
  /** URL of tweet to reply to. */
  replyTo?: string;
  /**
   * Thread mode: each element is one tweet in the thread.
   * When provided, `text` is ignored (use thread[0] instead).
   */
  thread?: string[];
  /** Long-form Article (X Premium feature). */
  article?: {
    title: string;
    markdownFile: string;
    coverImage?: string;
  };
}

export interface XPublishResult extends PublishResult {
  success: boolean;
  /** URL of the published tweet. */
  tweetUrl?: string;
  /** Tweet ID extracted from the URL. */
  tweetId?: string;
  error?: string;
}

export interface XLoginStatus {
  /** Whether cookies exist and are not expired. */
  cookiesValid: boolean;
  /** Whether we can actually reach a logged-in page. */
  sessionActive: boolean;
  /** Username/handle if detected. */
  username?: string;
}
