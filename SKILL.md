---
name: publish
description: >
  Multi-platform social media publisher for any AI agent. Routes content to
  WeChat, Medium, LinkedIn, Xiaohongshu, Douyin, and X/Twitter via unified
  CLI tools. Supports single and multi-platform publishing with per-platform
  content adaptation. Works with Claude Code, Codex, Gemini CLI, and any
  agent that supports skill loading.
triggers:
  # Chinese
  - 发布
  - 发文
  - 推送到平台
  - 发到小红书
  - 发到抖音
  - 发到微信
  - 发到推特
  - 发到 LinkedIn
  - 发到 Medium
  - 多平台发布
  - 跨平台发文
  # English
  - publish
  - post to
  - cross-post
  - multi-platform publish
  - share on
---

# Superb Publisher -- Multi-Platform Publishing Skill

Routes content to 6 platforms via unified CLI tools. Does not create content -- only publishes.

```
Supported platforms:
  WeChat (API) | Medium (API) | LinkedIn (API+OAuth)
  Xiaohongshu (browser) | Douyin (browser) | X/Twitter (browser)
```

**Loose coupling contract:** This skill knows CLI tool names, their flags, and expected output. It does NOT depend on any CLI tool's internal implementation. Each CLI is a standalone executable invoked via Bash.

---

## Step 0: Locate Skill Directory + Dependency Check

The skill directory varies by agent platform:

| Agent | Typical skill directory |
|-------|----------------------|
| Claude Code | `~/.claude/skills/superb-publisher` |
| Codex | `~/.agents/skills/superb-publisher` |
| Gemini CLI | `~/.gemini/skills/superb-publisher` |
| Other | Check agent documentation |

Run this bash block to locate the skill and check dependencies:

```bash
# Locate skill directory — try common locations
SKILL_DIR="${SKILL_DIR:-}"
if [ -z "$SKILL_DIR" ]; then
  for _dir in \
    "$HOME/.claude/skills/superb-publisher" \
    "$HOME/.agents/skills/superb-publisher" \
    "$HOME/.gemini/skills/superb-publisher" \
    "$HOME/Documents/AI/写作发布一条龙/superb-publisher"; do
    [ -f "$_dir/SKILL.md" ] && SKILL_DIR="$_dir" && break
  done
fi

if [ -z "$SKILL_DIR" ]; then
  echo "FATAL: superb-publisher skill directory not found."
  echo "Set SKILL_DIR manually or install to one of the standard locations."
  exit 1
fi
echo "SKILL_DIR=$SKILL_DIR"
```

Then check which platform CLIs are available:

```bash
# API-based CLIs (bash scripts, no build step needed)
_API_CLIS="wechat-cli medium-cli linkedin-cli"
# Browser-based CLIs (TypeScript, require npm install + build)
_BROWSER_CLIS="xhs-cli douyin-cli x-cli"

_AVAILABLE=""
_MISSING=""

echo "=== API-based CLIs ==="
for _cli in $_API_CLIS; do
  _path="$SKILL_DIR/scripts/$_cli"
  if [ -x "$_path" ]; then
    echo "OK: $_cli"
    _AVAILABLE="$_AVAILABLE $_cli"
    # Check config
    case $_cli in
      wechat-cli)
        [ -f "$HOME/.config/wechat-cli/config" ] && echo "  config: ready" || echo "  config: MISSING (run: $SKILL_DIR/scripts/wechat-cli init)" ;;
      medium-cli)
        [ -f "$HOME/.config/medium-cli/config" ] && echo "  config: ready" || echo "  config: MISSING (run: $SKILL_DIR/scripts/medium-cli init)" ;;
      linkedin-cli)
        [ -f "$HOME/.config/linkedin-cli/config" ] && echo "  config: ready" || echo "  config: MISSING (run: $SKILL_DIR/scripts/linkedin-cli init && $SKILL_DIR/scripts/linkedin-cli login)" ;;
    esac
  else
    echo "MISSING: $_cli"
    _MISSING="$_MISSING $_cli"
  fi
done

echo ""
echo "=== Browser-based CLIs ==="
# Check if npm install has been run
if [ ! -d "$SKILL_DIR/node_modules" ]; then
  echo "WARN: node_modules not found. Run first:"
  echo "  cd $SKILL_DIR && npm install && npm run build"
  _MISSING="$_MISSING xhs-cli douyin-cli x-cli"
else
  for _cli in $_BROWSER_CLIS; do
    _path="$SKILL_DIR/bin/$_cli"
    if [ -x "$_path" ]; then
      echo "OK: $_cli"
      _AVAILABLE="$_AVAILABLE $_cli"
      # Check login status
      _platform=$(echo "$_cli" | sed 's/-cli//')
      [ -f "$HOME/.config/social-cli/$_platform/cookies.json" ] && echo "  auth: cookies found" || echo "  auth: NOT LOGGED IN (run: $SKILL_DIR/bin/$_cli login)"
    else
      echo "MISSING: $_cli"
      _MISSING="$_MISSING $_cli"
    fi
  done
fi

echo ""
echo "AVAILABLE:$_AVAILABLE"
echo "MISSING:$_MISSING"
```

**Interpret the results:**

- If a platform's CLI is missing and the user requests that platform: warn and skip. Do not block other platforms.
- If a CLI is present but auth/config is missing: warn and provide the setup command. Skip that platform.
- If `node_modules` is missing: the browser-based CLIs (xhs, douyin, x) won't work. Prompt the user to run `npm install && npm run build`.

---

## Step 1: Parse Input

### Command syntax

```
/publish --platform <platform> [options]

Platforms: wechat, medium, linkedin, xhs, douyin, x
Multi-platform: --platform wechat,medium,x (comma-separated)

Options:
  --title "Title"             Article/post title
  --html article.html         HTML content file
  --md article.md             Markdown content file
  --text "text content"       Plain text content
  --images img1.png img2.png  Image files
  --video video.mp4           Video file
  --cover cover.png           Cover image
  --tags "tag1,tag2"          Tags (comma-separated)
  --status draft|public       Publish status (Medium/WeChat)
  --thumb thumb.png           WeChat cover image
  --author "Name"             WeChat author name
  --digest "Summary"          WeChat article digest
  --visibility public|connections  LinkedIn visibility
  --verbose                   Show detailed logs
```

### Argument extraction

| Parameter | Source | Default |
|-----------|--------|---------|
| `PLATFORM` | `--platform` (can be comma-separated) | (required -- ask if missing) |
| `TITLE` | `--title` | (auto-extract from HTML `<h1>` or Markdown `#`) |
| `HTML_PATH` | `--html` | (none) |
| `MD_PATH` | `--md` | (none) |
| `TEXT` | `--text` | (none) |
| `IMAGES` | `--images` | (none) |
| `VIDEO_FILE` | `--video` | (none) |
| `COVER_FILE` | `--cover` | (none) |
| `TAGS` | `--tags` | (none) |
| `STATUS` | `--status` | draft |
| `THUMB_FILE` | `--thumb` | (none) |
| `AUTHOR` | `--author` | (empty) |
| `DIGEST` | `--digest` | (auto-extract from first paragraph) |
| `VISIBILITY` | `--visibility` | public |

If `--platform` contains commas, split into `PLATFORM_LIST` array.

If `--platform` is not specified, ask: "Target platform? (wechat / medium / linkedin / xhs / douyin / x)"

---

## Step 2: Platform Router

Route to the appropriate CLI based on the platform value. Each platform section below defines:
- Which CLI to call
- Required input format
- Full command sequence
- Success/error output format

---

### Platform: WeChat (`--platform wechat`)

**CLI:** `$SKILL_DIR/scripts/wechat-cli`
**Input:** HTML file
**Config:** `~/.config/wechat-cli/config` (AppID + AppSecret)

**Pre-publish check:**
```bash
$SKILL_DIR/scripts/wechat-cli check "$HTML_PATH"
```
- Exit 1: show errors, ask "Fix and retry / Skip wechat / Abort?"
- Exit 0: continue (may have warnings).

**Upload local images to WeChat CDN:**
```bash
$SKILL_DIR/scripts/wechat-cli upload-images "$HTML_PATH"
```
Modifies HTML in-place, replacing local `src` paths with CDN URLs.

**Upload cover image (optional):**
```bash
THUMB_ID=$($SKILL_DIR/scripts/wechat-cli upload-thumb "$THUMB_FILE")
```

**Confirmation gate (MANDATORY -- never skipped):**
```
Ready to publish to WeChat Official Account:

  Title:   {TITLE}
  Author:  {AUTHOR or "(empty)"}
  Digest:  {DIGEST or "(auto)"}
  Cover:   {THUMB_FILE or "none"}
  HTML:    {HTML_PATH}

  Publish now? (Y / n / edit)
```

**Create draft + Publish:**
```bash
MEDIA_ID=$($SKILL_DIR/scripts/wechat-cli draft --title "$TITLE" --html "$HTML_PATH" --thumb "$THUMB_ID" --author "$AUTHOR" --digest "$DIGEST")
PUBLISH_ID=$($SKILL_DIR/scripts/wechat-cli publish "$MEDIA_ID")
```

**Success output:**
```
Published to WeChat!
  Title:      {TITLE}
  Media ID:   {MEDIA_ID}
  Publish ID: {PUBLISH_ID}
  Status:     Submitted (review may take a few minutes)
  Check:      $SKILL_DIR/scripts/wechat-cli status {PUBLISH_ID}
```

**Error handling:**
- `draft` fails: show WeChat API error (Chinese error messages built into wechat-cli). Ask: "Retry / Abort?"
- `publish` fails: show error + `MEDIA_ID` so user can manually retry with `wechat-cli publish {MEDIA_ID}`.
- Error 61023 (IP not in whitelist): "IP not in WeChat API whitelist. Add this machine's public IP in WeChat Official Account backend > Settings > Security Center > IP Whitelist."

---

### Platform: Medium (`--platform medium`)

**CLI:** `$SKILL_DIR/scripts/medium-cli`
**Input:** HTML or Markdown file
**Config:** `~/.config/medium-cli/config` (Integration Token)

**Confirmation gate (MANDATORY):**
```
Ready to publish to Medium:

  Title:   {TITLE}
  Tags:    {TAGS or "none"}
  Status:  {STATUS or "draft"}
  Format:  {HTML or Markdown}
  File:    {HTML_PATH or MD_PATH}

  Publish now? (Y / n / edit)
```

**Publish:**
```bash
# HTML input
ARTICLE_URL=$($SKILL_DIR/scripts/medium-cli publish --title "$TITLE" --html "$HTML_PATH" --tags "$TAGS" --status "$STATUS")

# Or Markdown input
ARTICLE_URL=$($SKILL_DIR/scripts/medium-cli publish --title "$TITLE" --md "$MD_PATH" --tags "$TAGS" --status "$STATUS")
```

`STATUS` defaults to `draft`. Valid: `draft`, `public`, `unlisted`.

**Success output:**
```
Published to Medium!
  Title:  {TITLE}
  URL:    {ARTICLE_URL}
  Status: {STATUS}
  Tags:   {TAGS}
```

**Error handling:**
- HTTP 401: "Medium token invalid or expired. Run `$SKILL_DIR/scripts/medium-cli init` to update."
- HTTP 429: "Rate limited. Wait a few minutes."
- Other: show error. Ask: "Retry / Skip medium / Abort?"

---

### Platform: LinkedIn (`--platform linkedin`)

**CLI:** `$SKILL_DIR/scripts/linkedin-cli`
**Input:** Plain text + optional images
**Config:** `~/.config/linkedin-cli/config` (client_id + client_secret) + `~/.config/linkedin-cli/token` (OAuth token)

**Content adaptation:** LinkedIn posts are plain text with optional images. If the user provides HTML, extract plain text:

```bash
POST_TEXT=$(/usr/bin/python3 -c "
import re
with open('$HTML_PATH', 'r') as f:
    html = f.read()
text = re.sub(r'<[^>]+>', '', html)
text = re.sub(r'\s+', ' ', text).strip()
print(text[:1300])
")
```

Or use `--text` directly if provided.

**Confirmation gate (MANDATORY):**
```
Ready to publish to LinkedIn:

  Text:       {POST_TEXT[:100]}...
  Images:     {image_list or "none"}
  Visibility: {VISIBILITY}
  Length:     {char_count} chars

  Publish now? (Y / n / edit)
```

**Publish (text post):**
```bash
POST_ID=$($SKILL_DIR/scripts/linkedin-cli publish --text "$POST_TEXT")
```

**Publish (with images):**
```bash
POST_ID=$($SKILL_DIR/scripts/linkedin-cli publish --text "$POST_TEXT" --images $IMAGE_1 $IMAGE_2)
```

**Publish (article share, with external URL):**
```bash
POST_ID=$($SKILL_DIR/scripts/linkedin-cli publish --article --title "$TITLE" --text "$POST_TEXT" --url "$ARTICLE_URL" --thumbnail $COVER_IMAGE)
```

Use article share format when a published URL is available from a prior platform in multi-platform mode.

**Success output:**
```
Published to LinkedIn!
  Post ID:    {POST_ID}
  Type:       {text post | article share}
  Visibility: {VISIBILITY}
  Images:     {count}
```

**Error handling:**
- HTTP 401: "Token expired. Run `$SKILL_DIR/scripts/linkedin-cli login`."
- HTTP 403: "Missing w_member_social scope. Check LinkedIn Developer Portal."
- Other: show error. Ask: "Retry / Skip linkedin / Abort?"

---

### Platform: Xiaohongshu (`--platform xhs`)

**CLI:** `$SKILL_DIR/bin/xhs-cli`
**Input:** Title + content/HTML + images
**Auth:** QR code login (browser-based)

**Content adaptation:**
- Title: max 20 Chinese characters. Truncate if needed.
- Body: max 1000 Chinese characters, plain text. If `--html` provided, xhs-cli strips HTML internally.
- Images: required (at least 1, max 18).
- Tags: optional.

**Pre-publish login check:**
```bash
$SKILL_DIR/bin/xhs-cli check || $SKILL_DIR/bin/xhs-cli login
```

**Confirmation gate (MANDATORY):**
```
Ready to publish to Xiaohongshu:

  Title:   {XHS_TITLE} ({char_count} chars)
  Content: {CONTENT[:80]}...
  Images:  {image_list} ({count})
  Tags:    {TAGS or "none"}

  Publish now? (Y / n / edit)
```

**Publish (with content text):**
```bash
$SKILL_DIR/bin/xhs-cli publish --title "$XHS_TITLE" --content "$XHS_CONTENT" --images $IMAGES --tags "$TAGS"
```

**Publish (with HTML -- cli extracts text internally):**
```bash
$SKILL_DIR/bin/xhs-cli publish --title "$XHS_TITLE" --html "$HTML_PATH" --images $IMAGES --tags "$TAGS"
```

**Publish (video post):**
```bash
$SKILL_DIR/bin/xhs-cli publish --title "$XHS_TITLE" --video "$VIDEO_FILE" --cover "$COVER_FILE" --tags "$TAGS"
```

**Success output:**
```
Published to Xiaohongshu!
  Title:   {XHS_TITLE}
  Images:  {count}
  Tags:    {TAGS}
```
xhs-cli prints `PUBLISH_SUCCESS` on success with optional `URL:` and `ID:` lines.

**Error handling:**
- Login required: "Not logged in. Running xhs-cli login..." (opens browser for QR code).
- `PUBLISH_FAILED`: show error. Ask: "Retry / Skip xhs / Abort?"

---

### Platform: Douyin (`--platform douyin`)

**CLI:** `$SKILL_DIR/bin/douyin-cli`
**Input:** Title + (video OR images) + optional content/cover/tags
**Auth:** QR code login (browser-based)

**Content adaptation:**
- Title: max 55 characters.
- Video: from `--video` flag. For video posts.
- Images: from `--images` flag. For image-text posts (max 35 images).
- Content/Description: optional text description.
- Cover: from `--cover` flag, or auto-selected.
- Tags: optional topic tags.
- Location: optional POI name.

Note: either `--video` or `--images` must be provided. If neither, skip with warning: "Douyin requires a video or images. Use `--video clip.mp4` or `--images img1.png img2.png`. Skipping douyin."

**Pre-publish login check:**
```bash
$SKILL_DIR/bin/douyin-cli check || $SKILL_DIR/bin/douyin-cli login
```

**Confirmation gate (MANDATORY):**
```
Ready to publish to Douyin:

  Title:   {TITLE}
  Video:   {VIDEO_FILE or "none"}
  Images:  {image_list or "none"}
  Cover:   {COVER_FILE or "auto"}
  Tags:    {TAGS or "none"}
  Desc:    {CONTENT[:80]}...

  Publish now? (Y / n / edit)
```

**Publish (video):**
```bash
$SKILL_DIR/bin/douyin-cli publish --title "$TITLE" --video "$VIDEO_FILE" --cover "$COVER_FILE" --tags "$TAGS"
```

**Publish (image-text):**
```bash
$SKILL_DIR/bin/douyin-cli publish --title "$TITLE" --images $IMAGES --content "$CONTENT" --tags "$TAGS"
```

**Success output:**
```
Published to Douyin!
  Title:  {TITLE}
  Type:   {video | image-text}
```

**Error handling:**
- No video or images: skip with warning.
- Login required: "Not logged in. Running douyin-cli login..."
- `PUBLISH_FAILED`: show error. Ask: "Retry / Skip douyin / Abort?"

---

### Platform: X/Twitter (`--platform x`)

**CLI:** `$SKILL_DIR/bin/x-cli`
**Input:** Text + optional images/video
**Auth:** Browser login (email/password + optional 2FA)

**Content adaptation:**
- Text: max 280 characters per tweet (standard), 25000 characters (Premium).
- Images: max 4 per tweet.
- Video: mutually exclusive with images.
- Thread: for long content, split into multiple tweets.
- Article: long-form (Premium feature).

**Pre-publish login check:**
```bash
$SKILL_DIR/bin/x-cli check || $SKILL_DIR/bin/x-cli login
```

**Confirmation gate (MANDATORY):**
```
Ready to publish to X:

  Text:    {TWEET_TEXT[:100]}...
  Images:  {image_list or "none"}
  Video:   {VIDEO_FILE or "none"}
  Mode:    {tweet | thread (N tweets) | article}
  Length:  {char_count} chars

  Publish now? (Y / n / edit)
```

**Publish (single tweet):**
```bash
$SKILL_DIR/bin/x-cli publish --text "$TWEET_TEXT" --images $IMAGES
```

**Publish (tweet with video):**
```bash
$SKILL_DIR/bin/x-cli publish --text "$TWEET_TEXT" --video "$VIDEO_FILE"
```

**Publish (quote tweet):**
```bash
$SKILL_DIR/bin/x-cli publish --text "$TWEET_TEXT" --quote-url "$QUOTE_URL"
```

**Publish (reply):**
```bash
$SKILL_DIR/bin/x-cli publish --text "$TWEET_TEXT" --reply-to "$REPLY_URL"
```

**Publish (thread):**
```bash
$SKILL_DIR/bin/x-cli thread --texts "$TWEET_1" "$TWEET_2" "$TWEET_3"
```

**Publish (long-form article, Premium):**
```bash
$SKILL_DIR/bin/x-cli article --title "$TITLE" --md "$MD_PATH" --cover "$COVER_FILE"
```

**Success output:**
```
Published to X!
  Text:    {TWEET_TEXT[:60]}...
  Mode:    {tweet | thread | article}
  URL:     {TWEET_URL}
```

**Error handling:**
- Login required: "Not logged in. Running x-cli login..."
- `PUBLISH_FAILED`: show error. Ask: "Retry / Skip x / Abort?"

---

## Step 3: Content Adaptation Reference

When the user provides content in one format but a platform requires another, adapt it:

| Platform | Accepts | Title | Body | Images | Video |
|----------|---------|-------|------|--------|-------|
| WeChat | HTML | Required | HTML full article | Embedded in HTML (upload to CDN first) | No |
| Medium | HTML or Markdown | Required | Full article | Embedded (Medium re-hosts) | No |
| LinkedIn | Plain text | No (use in text) | Plain text summary, max ~1300 chars | Separate upload, max ~20 | No |
| Xiaohongshu | Text + images | Required, max 20 chars | Plain text, max 1000 chars | Separate upload, 1-18 | Optional |
| Douyin | Video or images | Required, max 55 chars | Description text | Separate upload, max 35 | Yes |
| X/Twitter | Text | No (for tweets) | Plain text, 280 chars (standard) | Separate upload, max 4 | Optional |

**HTML to plain text extraction:**
```bash
PLAIN_TEXT=$(/usr/bin/python3 -c "
import re
with open('$HTML_PATH', 'r') as f:
    html = f.read()
text = re.sub(r'<[^>]+>', '', html)
text = re.sub(r'\s+', ' ', text).strip()
print(text[:$MAX_CHARS])
")
```

**Title extraction from HTML:**
```bash
TITLE=$(/usr/bin/python3 -c "
import re
with open('$HTML_PATH', 'r') as f:
    html = f.read()
m = re.search(r'<h1[^>]*>(.*?)</h1>', html, re.DOTALL)
if m:
    title = re.sub(r'<[^>]+>', '', m.group(1)).strip()
    print(title)
")
```

**Image extraction from Markdown:**
```bash
IMAGES=$(grep -oP '!\[.*?\]\(\K[^)]+' "$MD_PATH" 2>/dev/null | head -18)
```

---

## Step 4: Multi-Platform Mode

When `--platform` contains commas (e.g., `--platform wechat,medium,x`):

1. Split into `PLATFORM_LIST` array.
2. For each platform, adapt content to that platform's format.
3. Call the platform's CLI.
4. Each platform gets its own confirmation gate.
5. A failure on one platform does NOT block others.
6. After all platforms are processed, print a consolidated summary.

**Cross-platform URL reuse:** If a platform produces a public URL (e.g., Medium article URL), offer to use it for link-sharing on subsequent platforms (e.g., LinkedIn article share).

**Consolidated summary:**
```
Multi-platform publish complete!

  Platform       Status     Details
  ─────────────  ─────────  ──────────────────
  wechat         Success    Publish ID: {id}
  medium         Success    URL: {url}
  x              Skipped    x-cli not installed

  Total: {success}/{total} platforms published.
  Skipped: {list or "none"}
```

---

## Step 5: Error Handling

| Scenario | Action |
|----------|--------|
| Platform CLI not installed | Warn: "{cli} not found. Skipping {platform}." Continue to next platform. |
| CLI present but not configured/logged in | Warn: "Run `{cli} init` or `{cli} login` first." Skip that platform. |
| CLI command fails (non-zero exit) | Show error output. Ask: "Retry / Skip {platform} / Abort?" |
| No content provided | Ask user for content. |
| `--platform douyin` without `--video` or `--images` | Warn: "Douyin requires video or images. Skipping." |
| `--platform xhs` without `--images` (and no `--video`) | Warn: "Xiaohongshu requires images. Skipping." |
| Multi-platform: partial failure | Print consolidated summary. Do not roll back successful publishes. |
| WeChat error 61023 | "IP not in whitelist. Add to WeChat backend > Settings > Security > IP Whitelist." |
| Medium HTTP 401 | "Token expired. Run: medium-cli init" |
| LinkedIn HTTP 401 | "Token expired. Run: linkedin-cli login" |
| Browser-based CLI login expired | "Session expired. Running {cli} login..." (opens browser) |
| `node_modules` not found | "Browser-based CLIs need setup. Run: cd $SKILL_DIR && npm install && npm run build" |

---

## Step 6: Setup Guide

### First-time setup

#### 1. Install dependencies (one-time)

Browser-based CLIs (xhs, douyin, x) require Node.js and Puppeteer:

```bash
cd $SKILL_DIR
npm install
npm run build
```

This installs Puppeteer and builds the TypeScript CLI tools. API-based CLIs (wechat, medium, linkedin) are plain bash scripts and need no installation.

#### 2. WeChat Official Account

```bash
$SKILL_DIR/scripts/wechat-cli init
# Edit ~/.config/wechat-cli/config:
#   WECHAT_APPID="your_appid"
#   WECHAT_SECRET="your_secret"

# Test:
$SKILL_DIR/scripts/wechat-cli token
```

**Important:** WeChat API requires IP whitelist. Add your server/machine's public IP in:
WeChat Official Account backend > Settings and Development > Security Center > IP Whitelist.

Get your current public IP:
```bash
curl -s https://httpbin.org/ip | grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+'
```

#### 3. Medium

```bash
$SKILL_DIR/scripts/medium-cli init
# Edit ~/.config/medium-cli/config:
#   MEDIUM_TOKEN="your_integration_token"
# Get token at: https://medium.com/me/settings/security

# Test:
$SKILL_DIR/scripts/medium-cli whoami
```

#### 4. LinkedIn

```bash
$SKILL_DIR/scripts/linkedin-cli init
# Edit ~/.config/linkedin-cli/config:
#   LINKEDIN_CLIENT_ID="your_client_id"
#   LINKEDIN_CLIENT_SECRET="your_client_secret"

# Get credentials at: https://www.linkedin.com/developers/apps
# Add http://localhost:8585/callback to Authorized Redirect URLs
# Request "Share on LinkedIn" + "Sign In with LinkedIn" products

# Authorize (opens browser):
$SKILL_DIR/scripts/linkedin-cli login

# Test:
$SKILL_DIR/scripts/linkedin-cli whoami
```

#### 5. Xiaohongshu

```bash
# Login (opens browser, scan QR code with Xiaohongshu app):
$SKILL_DIR/bin/xhs-cli login

# Test:
$SKILL_DIR/bin/xhs-cli check
```

Cookies stored at `~/.config/social-cli/xhs/cookies.json`. Re-login when session expires.

#### 6. Douyin

```bash
# Login (opens browser, scan QR code with Douyin app):
$SKILL_DIR/bin/douyin-cli login

# Test:
$SKILL_DIR/bin/douyin-cli check
```

Cookies stored at `~/.config/social-cli/douyin/cookies.json`.

#### 7. X / Twitter

```bash
# Login (opens browser for email/password login):
$SKILL_DIR/bin/x-cli login

# Test:
$SKILL_DIR/bin/x-cli check
```

Cookies stored at `~/.config/social-cli/x/cookies.json`.

---

## Extension Slots

### Adding a new platform

1. Create a CLI following the contract: `{platform}-cli publish [--options]` with structured stdout output and exit codes.
2. Add a dependency check entry in Step 0.
3. Add a platform section in Step 2 with content adaptation rules, CLI commands, confirmation gate, and success/error format.
4. Add the platform name to the `--platform` valid values.
5. Existing platform handlers require no modification.
