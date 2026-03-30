#!/usr/bin/env node

/**
 * x-cli — X/Twitter publishing tool for AI pipelines.
 *
 * Usage:
 *   x-cli login                                          # Manual login
 *   x-cli check                                          # Check login status
 *   x-cli logout                                         # Clear saved cookies
 *   x-cli publish --text "Hello world"                   # Text-only tweet
 *   x-cli publish --text "Check this" --images a.png b.png  # With images
 *   x-cli publish --text "My take" --quote-url "https://x.com/user/status/123"
 *   x-cli publish --text "Great point" --reply-to "https://x.com/user/status/123"
 *   x-cli thread --texts "First" "Second" "Third"        # Thread
 *   x-cli article --title "My Article" --md article.md   # Long-form article
 */

import { Command } from "commander";
import { setLogLevel, logger } from "@social-cli/core";
import { login, checkLoginStatus, logout } from "./login.js";
import { publish } from "./publish.js";
import type { XPublishOptions } from "./types.js";

const program = new Command();

program
  .name("x-cli")
  .description("X/Twitter publishing CLI — browser automation for AI pipelines")
  .version("0.1.0");

// ── login ───────────────────────────────────────────────────────────

program
  .command("login")
  .description("Open browser for manual login (email/password + optional 2FA)")
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
        console.error("Not logged in. Run: x-cli login");
        process.exit(1);
      }
      if (!status.sessionActive) {
        console.error("Session expired. Run: x-cli login");
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
  .description("Publish a tweet (text + optional media, quote, or reply)")
  .requiredOption("--text <text>", "Tweet text")
  .option("--images <files...>", "Image file paths (max 4)")
  .option("--video <file>", "Video file path (mutually exclusive with images)")
  .option("--quote-url <url>", "URL of tweet to quote")
  .option("--reply-to <url>", "URL of tweet to reply to")
  .option("--verbose", "Enable debug logging")
  .action(async (opts) => {
    if (opts.verbose) {
      setLogLevel("debug");
    }

    const options: XPublishOptions = {
      title: "", // Not used for tweets, required by base type
      text: opts.text,
      images: opts.images,
      video: opts.video,
      quoteUrl: opts.quoteUrl,
      replyTo: opts.replyTo,
    };

    try {
      const result = await publish(options);
      if (result.success) {
        console.log("PUBLISH_SUCCESS");
        if (result.tweetUrl) console.log(`URL: ${result.tweetUrl}`);
        if (result.tweetId) console.log(`ID: ${result.tweetId}`);
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

// ── thread ──────────────────────────────────────────────────────────

program
  .command("thread")
  .description("Publish a thread (multiple tweets chained together)")
  .requiredOption("--texts <texts...>", "Tweet texts (one per tweet in the thread)")
  .option("--verbose", "Enable debug logging")
  .action(async (opts) => {
    if (opts.verbose) {
      setLogLevel("debug");
    }

    const options: XPublishOptions = {
      title: "",
      text: opts.texts[0], // First tweet as text (unused when thread is set)
      thread: opts.texts,
    };

    try {
      const result = await publish(options);
      if (result.success) {
        console.log("PUBLISH_SUCCESS");
        if (result.tweetUrl) console.log(`URL: ${result.tweetUrl}`);
        if (result.tweetId) console.log(`ID: ${result.tweetId}`);
      } else {
        console.error(`PUBLISH_FAILED: ${result.error}`);
        process.exit(1);
      }
    } catch (err) {
      logger.error("Thread publish failed", err);
      console.error("PUBLISH_FAILED");
      process.exit(1);
    }
  });

// ── article ─────────────────────────────────────────────────────────

program
  .command("article")
  .description("Publish a long-form article (X Premium feature)")
  .requiredOption("--title <title>", "Article title")
  .requiredOption("--md <file>", "Markdown file path for article content")
  .option("--cover <file>", "Cover image file path")
  .option("--verbose", "Enable debug logging")
  .action(async (opts) => {
    if (opts.verbose) {
      setLogLevel("debug");
    }

    const options: XPublishOptions = {
      title: opts.title,
      text: "", // Not used for articles
      article: {
        title: opts.title,
        markdownFile: opts.md,
        coverImage: opts.cover,
      },
    };

    try {
      const result = await publish(options);
      if (result.success) {
        console.log("PUBLISH_SUCCESS");
        if (result.tweetUrl) console.log(`URL: ${result.tweetUrl}`);
      } else {
        console.error(`PUBLISH_FAILED: ${result.error}`);
        process.exit(1);
      }
    } catch (err) {
      logger.error("Article publish failed", err);
      console.error("PUBLISH_FAILED");
      process.exit(1);
    }
  });

// ── Parse & run ─────────────────────────────────────────────────────

program.parse();
