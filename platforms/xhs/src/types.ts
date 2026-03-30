import type { PublishOptions, PublishResult } from "@social-cli/core";

// ── XHS-specific types ──────────────────────────────────────────────

export interface XhsPublishOptions extends PublishOptions {
  /**
   * Post type: "image" (图文) or "video" (视频).
   * Inferred from `images` vs `video` if not specified.
   */
  type?: "image" | "video";
}

export interface XhsPublishResult extends PublishResult {
  /** XHS note ID if available. */
  noteId?: string;
}

export interface XhsLoginStatus {
  /** Whether cookies exist and are not expired. */
  cookiesValid: boolean;
  /** Whether we can actually reach a logged-in page. */
  sessionActive: boolean;
  /** Username if detected. */
  username?: string;
}
