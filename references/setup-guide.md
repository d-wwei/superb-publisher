# Setup Guide

Read this file when setting up a platform for the first time.

## 1. Browser-based CLIs (one-time)

XHS, Douyin, and X/Twitter require Node.js and Puppeteer:

```bash
cd $SKILL_DIR
npm install
npm run build
```

API-based CLIs (WeChat, Medium, LinkedIn) are plain bash scripts — no build step needed.

## 2. WeChat Official Account

```bash
$SKILL_DIR/scripts/wechat-cli init
# Edit ~/.config/wechat-cli/config:
#   WECHAT_APPID="your_appid"
#   WECHAT_SECRET="your_secret"

# Test:
$SKILL_DIR/scripts/wechat-cli token
```

**Important:** WeChat API requires IP whitelist. Add your machine's public IP in:
WeChat Official Account backend > Settings and Development > Security Center > IP Whitelist.

```bash
curl -s https://httpbin.org/ip | grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+'
```

## 3. Medium

```bash
$SKILL_DIR/scripts/medium-cli init
# Edit ~/.config/medium-cli/config:
#   MEDIUM_TOKEN="your_integration_token"
# Get token at: https://medium.com/me/settings/security

# Test:
$SKILL_DIR/scripts/medium-cli whoami
```

## 4. LinkedIn

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

## 5. Xiaohongshu

```bash
# Login (opens browser, scan QR code with Xiaohongshu app):
$SKILL_DIR/bin/xhs-cli login

# Test:
$SKILL_DIR/bin/xhs-cli check
```

Cookies stored at `~/.config/social-cli/xhs/cookies.json`. Re-login when session expires.

## 6. Douyin

```bash
# Login (opens browser, scan QR code with Douyin app):
$SKILL_DIR/bin/douyin-cli login

# Test:
$SKILL_DIR/bin/douyin-cli check
```

Cookies stored at `~/.config/social-cli/douyin/cookies.json`.

## 7. X / Twitter

```bash
# Login (opens browser for email/password login):
$SKILL_DIR/bin/x-cli login

# Test:
$SKILL_DIR/bin/x-cli check
```

Cookies stored at `~/.config/social-cli/x/cookies.json`.
