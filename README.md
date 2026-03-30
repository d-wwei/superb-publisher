# Superb Publisher

Multi-platform social media publishing toolkit for AI agent pipelines. Routes content to 6 platforms via unified CLI tools.

## Supported Platforms

| Platform | CLI | Type | Auth method |
|----------|-----|------|-------------|
| WeChat Official Account | `scripts/wechat-cli` | API (bash + curl) | AppID + AppSecret |
| Medium | `scripts/medium-cli` | API (bash + curl) | Integration Token |
| LinkedIn | `scripts/linkedin-cli` | API (bash + curl + OAuth) | OAuth 2.0 |
| Xiaohongshu | `bin/xhs-cli` | Browser automation | QR code scan |
| Douyin | `bin/douyin-cli` | Browser automation | QR code scan |
| X / Twitter | `bin/x-cli` | Browser automation | Email/password login |

## Architecture

```
superb-publisher/
  scripts/            # API-based CLIs (zero-dependency bash scripts)
    wechat-cli
    medium-cli
    linkedin-cli
  core/               # Shared browser automation infrastructure
  platforms/          # Per-platform browser automation packages
    xhs/
    douyin/
    x/
  bin/                # Browser-based CLI entry points
    xhs-cli
    douyin-cli
    x-cli
  SKILL.md            # AI agent skill definition
```

Two types of CLIs:
- **API-based** (`scripts/`): Pure bash + curl. Zero dependencies. Work immediately.
- **Browser-based** (`bin/`): TypeScript + Puppeteer. Require `npm install` once.

## Quick Start

### Install

```bash
# Clone
git clone <repo-url> superb-publisher
cd superb-publisher

# Browser-based CLIs need Node.js dependencies (one-time)
npm install
npm run build
```

API-based CLIs (`scripts/`) need no installation.

### WeChat

```bash
# Setup
scripts/wechat-cli init
# Edit ~/.config/wechat-cli/config with AppID + AppSecret
# IMPORTANT: Add your public IP to WeChat backend > Security > IP Whitelist

# Publish
scripts/wechat-cli check article.html
scripts/wechat-cli upload-images article.html
MEDIA_ID=$(scripts/wechat-cli draft --title "Title" --html article.html)
scripts/wechat-cli publish "$MEDIA_ID"
```

### Medium

```bash
# Setup
scripts/medium-cli init
# Edit ~/.config/medium-cli/config with your Integration Token
# Get token: https://medium.com/me/settings/security

# Publish
scripts/medium-cli publish --title "My Article" --html article.html --tags "AI,Tech" --status draft
```

### LinkedIn

```bash
# Setup
scripts/linkedin-cli init
# Edit ~/.config/linkedin-cli/config with client_id + client_secret
# Get credentials: https://www.linkedin.com/developers/apps
# Add http://localhost:8585/callback to Authorized Redirect URLs
scripts/linkedin-cli login    # Opens browser for OAuth

# Publish
scripts/linkedin-cli publish --text "Check out my latest article"
scripts/linkedin-cli publish --text "With images" --images photo1.png photo2.png
scripts/linkedin-cli publish --article --title "Title" --text "Summary" --url "https://..."
```

### Xiaohongshu

```bash
# Login (scan QR code)
bin/xhs-cli login

# Publish image post
bin/xhs-cli publish --title "My Post" --content "Body text" --images img1.png img2.png

# Publish with HTML (auto-stripped to text)
bin/xhs-cli publish --title "My Post" --html article.html --images img1.png

# Publish video
bin/xhs-cli publish --title "Video" --video clip.mp4 --cover cover.png

# With tags
bin/xhs-cli publish --title "Post" --content "Body" --images img.png --tags "travel,food"
```

### Douyin

```bash
# Login (scan QR code)
bin/douyin-cli login

# Publish video
bin/douyin-cli publish --title "My Video" --video clip.mp4 --cover cover.png --tags "tech"

# Publish image-text post
bin/douyin-cli publish --title "My Post" --images img1.png img2.png --content "Description"
```

### X / Twitter

```bash
# Login (email/password in browser)
bin/x-cli login

# Tweet
bin/x-cli publish --text "Hello world"

# Tweet with images
bin/x-cli publish --text "Check this out" --images photo1.png photo2.png

# Thread
bin/x-cli thread --texts "First tweet" "Second tweet" "Third tweet"

# Long-form article (Premium)
bin/x-cli article --title "My Article" --md article.md
```

## AI Agent Integration

This toolkit is designed as a skill for AI agents. The `SKILL.md` file defines the full interface.

```bash
# In any AI agent pipeline:
bin/xhs-cli check || bin/xhs-cli login
bin/xhs-cli publish --title "$TITLE" --content "$CONTENT" --images $IMAGES
```

### Integration with crisp-articulator

Superb Publisher is the publish stage of the [crisp-articulator](../crisp-articulator/) content pipeline:

```
write -> illustrate -> typeset -> deliver -> [publish]
```

When `crisp-articulator` is invoked with `--publish --platform wechat,medium,x`, it calls the CLIs in this toolkit to publish the formatted article to each platform.

## CLI Design

All CLIs follow the same conventions:

- **Structured output**: `PUBLISH_SUCCESS` / `PUBLISH_FAILED` on stdout. Machine-readable.
- **Exit codes**: 0 = success, 1 = failure.
- **Config isolation**: API credentials in `~/.config/{cli}/config`. Browser cookies in `~/.config/social-cli/{platform}/cookies.json`. All files chmod 600.
- **Zero context cost**: Invoked via Bash tool. Only command + output appear in the AI conversation.

## Platform Limits

| Platform | Title | Body | Images | Video |
|----------|-------|------|--------|-------|
| WeChat | Required | HTML, no size limit | Embedded, upload to CDN | No |
| Medium | Required | HTML/Markdown, no limit | Embedded (re-hosted) | No |
| LinkedIn | In text body | ~1300 chars recommended | Max ~20 | No |
| Xiaohongshu | Max 20 chars | Max 1000 chars, plain text | 1-18 | Optional |
| Douyin | Max 55 chars | Description text | Max 35 | Yes |
| X/Twitter | N/A (tweets) | 280 chars (standard), 25K (Premium) | Max 4 | Optional |

## License

MIT
