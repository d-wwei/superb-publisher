import type { PublishOptions, PublishResult } from "@social-cli/core";

// ── Douyin-specific types ──────────────────────────────────────────

export interface DouyinPublishOptions extends PublishOptions {
  /**
   * Post type: "video" (视频) or "image" (图文).
   * Inferred from `video` vs `images` if not specified.
   */
  type?: "video" | "image";
  /** Location / POI tag. */
  location?: string;
}

export interface DouyinPublishResult extends PublishResult {
  /** Douyin video/post ID if available. */
  videoId?: string;
}

export interface DouyinLoginStatus {
  /** Whether cookies exist and are not expired. */
  cookiesValid: boolean;
  /** Whether we can actually reach a logged-in page. */
  sessionActive: boolean;
  /** Username if detected. */
  username?: string;
}
