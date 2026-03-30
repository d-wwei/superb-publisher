#!/usr/bin/env node

/**
 * xhs-cli — Xiaohongshu publishing tool for AI pipelines.
 *
 * Usage:
 *   xhs-cli login                     # Scan QR code to log in
 *   xhs-cli check                     # Check login status
 *   xhs-cli logout                    # Clear saved cookies
 *   xhs-cli publish --title "标题" --content "正文" --images img1.png img2.png
 *   xhs-cli publish --title "标题" --html article.html --images img1.png
 *   xhs-cli publish --title "标题" --video video.mp4 --cover cover.png
 *   xhs-cli publish --title "标题" --content "正文" --images img1.png --tags "tag1,tag2"
 */

import { Command } from "commander";
import { setLogLevel, logger } from "@social-cli/core";
import { login, checkLoginStatus, logout } from "./login.js";
import { publish } from "./publish.js";
import type { XhsPublishOptions } from "./types.js";

const program = new Command();

program
  .name("xhs-cli")
  .description("Xiaohongshu publishing CLI — browser automation for AI pipelines")
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
        console.error("Not logged in. Run: xhs-cli login");
        process.exit(1);
      }
      if (!status.sessionActive) {
        console.error("Session expired. Run: xhs-cli login");
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
  .description("Publish a post (image or video)")
  .requiredOption("--title <title>", "Post title (max 20 chars)")
  .option("--content <content>", "Post content text")
  .option("--html <file>", "Post content from HTML file (stripped to text)")
  .option("--images <files...>", "Image file paths (max 18)")
  .option("--video <file>", "Video file path")
  .option("--cover <file>", "Video cover image")
  .option("--tags <tags>", "Comma-separated tags")
  .option("--verbose", "Enable debug logging")
  .action(async (opts) => {
    if (opts.verbose) {
      setLogLevel("debug");
    }

    const options: XhsPublishOptions = {
      title: opts.title,
      content: opts.content,
      htmlFile: opts.html,
      images: opts.images,
      video: opts.video,
      cover: opts.cover,
      tags: opts.tags ? opts.tags.split(",").map((t: string) => t.trim()) : undefined,
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
