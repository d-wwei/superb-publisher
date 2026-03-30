# Superb Publisher

An AI agent skill that publishes content to 6 social platforms through a unified CLI interface.

[中文文档](README_ZH.md)

---

## What Problem It Solves

You wrote an article with AI. Now you need to post it to WeChat, Medium, LinkedIn, Xiaohongshu, Douyin, and X. Each platform has a different API, auth flow, content format, and character limit.

Superb Publisher gives your AI agent a single `/publish` command. The agent says where, the skill handles how.

---

## Quick Start

```bash
git clone https://github.com/d-wwei/superb-publisher.git
cd superb-publisher

# Browser-based CLIs (Xiaohongshu, Douyin, X) need a one-time build:
npm install && npm run build

# API-based CLIs (WeChat, Medium, LinkedIn) work immediately — zero dependencies.
```

Set up one platform (Medium as an example):

```bash
scripts/medium-cli init
# Edit ~/.config/medium-cli/config — add your Integration Token
# Get one at: https://medium.com/me/settings/security

scripts/medium-cli publish --title "My Article" --html article.html --status draft
```

---

## What You Can Do

**Publish to any of 6 platforms from one command:**

```
/publish --platform medium --title "My Article" --html article.html
```

**Cross-post to multiple platforms at once:**

```
/publish --platform wechat,medium,x --title "My Article" --html article.html
```

Each platform gets its own confirmation gate. Failure on one does not block others. A summary prints at the end.

**Publish different content types per platform:**

- Long-form HTML articles to WeChat and Medium
- Text posts with images to LinkedIn and Xiaohongshu
- Video posts to Douyin
- Tweets, threads, and long-form articles to X/Twitter

**Use it from any AI agent** — Claude Code, Codex, Gemini CLI, Cursor, or any agent that loads skill files. The agent invokes shell commands via Bash; no SDK or library import needed.

**Plug into the crisp-articulator pipeline** as the publish stage:

```
write (great-writer) -> illustrate (brilliant-visualizer) -> typeset (excellent-typesetter) -> deliver -> publish (superb-publisher)
```

---

## Supported Platforms

| Platform | CLI | Type | Auth |
|----------|-----|------|------|
| WeChat Official Account | `scripts/wechat-cli` | API (bash + curl) | AppID + AppSecret |
| Medium | `scripts/medium-cli` | API (bash + curl) | Integration Token |
| LinkedIn | `scripts/linkedin-cli` | API (bash + curl) | OAuth 2.0 |
| Xiaohongshu | `bin/xhs-cli` | Browser (Puppeteer) | QR code scan |
| Douyin | `bin/douyin-cli` | Browser (Puppeteer) | QR code scan |
| X / Twitter | `bin/x-cli` | Browser (Puppeteer) | Email/password |

### Platform Limits

| Platform | Title | Body | Images | Video |
|----------|-------|------|--------|-------|
| WeChat | Required | HTML, no size limit | Embedded, uploaded to CDN | No |
| Medium | Required | HTML or Markdown, no limit | Embedded (re-hosted) | No |
| LinkedIn | In text body | ~1300 chars recommended | Up to ~20 | No |
| Xiaohongshu | Max 20 chars | Max 1000 chars, plain text | 1-18 | Optional |
| Douyin | Max 55 chars | Description text | Up to 35 | Yes |
| X/Twitter | N/A (tweets) | 280 chars (standard), 25K (Premium) | Up to 4 | Optional |

---

## Platform Setup

API-based CLIs (`scripts/`) need no build step. Browser-based CLIs (`bin/`) require Node.js 18+ and a one-time `npm install && npm run build`.

### WeChat

```bash
scripts/wechat-cli init
# Edit ~/.config/wechat-cli/config with AppID + AppSecret
# Add your public IP to: WeChat backend > Settings > Security > IP Whitelist
scripts/wechat-cli token   # verify
```

### Medium

```bash
scripts/medium-cli init
# Edit ~/.config/medium-cli/config with your Integration Token
# Get token: https://medium.com/me/settings/security
scripts/medium-cli whoami   # verify
```

### LinkedIn

```bash
scripts/linkedin-cli init
# Edit ~/.config/linkedin-cli/config with client_id + client_secret
# Get credentials: https://www.linkedin.com/developers/apps
# Add http://localhost:8585/callback to Authorized Redirect URLs
scripts/linkedin-cli login   # opens browser for OAuth
scripts/linkedin-cli whoami  # verify
```

### Xiaohongshu

```bash
bin/xhs-cli login   # opens browser, scan QR code with Xiaohongshu app
bin/xhs-cli check   # verify
```

### Douyin

```bash
bin/douyin-cli login   # opens browser, scan QR code with Douyin app
bin/douyin-cli check   # verify
```

### X / Twitter

```bash
bin/x-cli login   # opens browser for email/password login
bin/x-cli check   # verify
```

---

## Architecture

```
superb-publisher/
  SKILL.md              # AI agent skill definition (entry point)
  scripts/              # API-based CLIs — pure bash + curl, zero dependencies
    wechat-cli
    medium-cli
    linkedin-cli
  core/                 # Shared browser automation infrastructure (TypeScript)
  platforms/            # Per-platform browser automation
    xhs/
    douyin/
    x/
  bin/                  # Browser-based CLI entry points
    xhs-cli
    douyin-cli
    x-cli
  references/           # On-demand reference docs for the agent
    platforms.md        # Detailed CLI commands per platform
    setup-guide.md      # First-time setup instructions
    content-adapt.md    # Content format conversion helpers
```

Two CLI families:

- **API-based** (`scripts/`): Pure bash + curl. No dependencies. Work on any macOS/Linux machine with curl installed.
- **Browser-based** (`bin/`): TypeScript + Puppeteer. Automate platforms that lack public APIs. Require `npm install` once.

### CLI Conventions

All CLIs follow the same contract:

- **Structured output**: `PUBLISH_SUCCESS` / `PUBLISH_FAILED` on stdout. Machine-parseable.
- **Exit codes**: 0 = success, 1 = failure.
- **Config isolation**: API credentials in `~/.config/{cli}/config`. Browser cookies in `~/.config/social-cli/{platform}/cookies.json`. All files chmod 600.
- **Zero context cost**: Invoked via Bash tool. Only the command and its output appear in the AI conversation.

---

## Related Projects

Superb Publisher is part of a writing-to-publishing toolkit:

| Project | Role |
|---------|------|
| [great-writer](https://github.com/d-wwei/great-writer) | Writing |
| [brilliant-visualizer](https://github.com/d-wwei/brilliant-visualizer) | Illustration |
| [excellent-typesetter](https://github.com/d-wwei/excellent-typesetter) | Typesetting |
| [crisp-articulator](https://github.com/d-wwei/crisp-articulator) | Pipeline orchestrator |
| **superb-publisher** | Publishing (this repo) |

---

## License

MIT
