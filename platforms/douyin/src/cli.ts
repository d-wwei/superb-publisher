#!/usr/bin/env node

/**
 * douyin-cli — Douyin (TikTok China) publishing tool for AI pipelines.
 *
 * Usage:
 *   douyin-cli login                     # Scan QR code to log in
 *   douyin-cli check                     # Check login status
 *   douyin-cli logout                    # Clear saved cookies
 *   douyin-cli publish --title "标题" --video video.mp4 [--cover cover.png] [--content "描述"] [--tags "tag1,tag2"]
 *   douyin-cli publish --title "标题" --images img1.png img2.png [--content "描述"] [--tags "tag1,tag2"]
 */

import { Command } from "commander";
import { setLogLevel, logger } from "@social-cli/core";
import { login, checkLoginStatus, logout } from "./login.js";
import { publish } from "./publish.js";
import type { DouyinPublishOptions } from "./types.js";

const program = new Command();

program
  .name("douyin-cli")
  .description("Douyin publishing CLI — browser automation for AI pipelines")
  .version("0.1.0");

// ── login ───────────────────────────────────────────────────────────

program
  .command("login")
  .description("Open browser for QR code login")
  .action(async () => {
    try {
      await login();
      console.log("LOGIN_SUCCESS");
    } catch (err) {
      logger.error("Login failed", err);
      console.error("LOGIN_FAILED");
      process.exit(1);
    }
  });

// ── check ───────────────────────────────────────────────────────────

program
  .command("check")
  .description("Check login status")
  .action(async () => {
    try {
      const status = await checkLoginStatus();
      console.log(JSON.stringify(status, null, 2));
      if (!status.cookiesValid) {
        console.error("Not logged in. Run: douyin-cli login");
        process.exit(1);
      }
      if (!status.sessionActive) {
        console.error("Session expired. Run: douyin-cli login");
        process.exit(1);
      }
    } catch (err) {
      logger.error("Check failed", err);
      process.exit(1);
    }
  });

// ── logout ──────────────────────────────────────────────────────────

program
  .command("logout")
  .description("Clear saved cookies")
  .action(() => {
    logout();
    console.log("LOGOUT_SUCCESS");
  });

// ── publish ─────────────────────────────────────────────────────────

program
  .command("publish")
  .description("Publish a post (video or image-text)")
  .requiredOption("--title <title>", "Post title (max 55 chars)")
  .option("--content <content>", "Post description text")
  .option("--html <file>", "Post content from HTML file (stripped to text)")
  .option("--images <files...>", "Image file paths (max 35, for image-text post)")
  .option("--video <file>", "Video file path")
  .option("--cover <file>", "Video cover image")
  .option("--tags <tags>", "Comma-separated topic tags")
  .option("--location <location>", "Location / POI name")
  .option("--verbose", "Enable debug logging")
  .action(async (opts) => {
    if (opts.verbose) {
      setLogLevel("debug");
    }

    const options: DouyinPublishOptions = {
      title: opts.title,
      content: opts.content,
      htmlFile: opts.html,
      images: opts.images,
      video: opts.video,
      cover: opts.cover,
      tags: opts.tags ? opts.tags.split(",").map((t: string) => t.trim()) : undefined,
      location: opts.location,
    };

    try {
      const result = await publish(options);
      if (result.success) {
        console.log("PUBLISH_SUCCESS");
        if (result.postUrl) console.log(`URL: ${result.postUrl}`);
        if (result.postId) console.log(`ID: ${result.postId}`);
      } else {
        console.error(`PUBLISH_FAILED: ${result.error}`);
        process.exit(1);
      }
    } catch (err) {
      logger.error("Publish failed", err);
      console.error("PUBLISH_FAILED");
      process.exit(1);
    }
  });

// ── Parse & run ─────────────────────────────────────────────────────

program.parse();
