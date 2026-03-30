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

# Superb Publisher

Routes content to 6 platforms. Does not create content — only publishes.

```
API-based:     WeChat | Medium | LinkedIn
Browser-based: Xiaohongshu | Douyin | X/Twitter
```

**Loose coupling:** This skill invokes CLI tools via Bash. It knows their flags and output format, not their internals.

**Reference files** (read on demand, not preloaded):
- `references/platforms.md` — detailed CLI commands per platform
- `references/content-adapt.md` — content format conversion helpers
- `references/setup-guide.md` — first-time platform setup

---

## Step 0: Locate Skill Directory

```bash
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
[ -z "$SKILL_DIR" ] && echo "FATAL: superb-publisher not found" && exit 1
```

Quick availability check:
```bash
echo "API CLIs:"
for c in wechat-cli medium-cli linkedin-cli; do
  [ -x "$SKILL_DIR/scripts/$c" ] && echo "  OK: $c" || echo "  MISSING: $c"
done
echo "Browser CLIs:"
for c in xhs-cli douyin-cli x-cli; do
  [ -x "$SKILL_DIR/bin/$c" ] && echo "  OK: $c" || echo "  MISSING: $c (run: cd $SKILL_DIR && npm install && npm run build)"
done
```

If a requested platform's CLI is missing or unconfigured: warn and skip, don't block other platforms.
For first-time setup of any platform, read `references/setup-guide.md`.

---

## Step 1: Parse Input

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
  --tags "tag1,tag2"          Tags
  --status draft|public       Publish status (Medium/WeChat)
  --thumb thumb.png           WeChat cover image
  --visibility public|connections  LinkedIn visibility
  --verbose                   Detailed logs
```

If `--platform` missing, ask the user.
If comma-separated, process each platform sequentially.

---

## Step 2: Route to Platform

For each platform, read the detailed CLI commands from `references/platforms.md` — only the section for that platform.

Quick routing table:

| Platform | CLI path | Input format | Key constraint |
|----------|----------|-------------|----------------|
| `wechat` | `$SKILL_DIR/scripts/wechat-cli` | HTML | IP whitelist required |
| `medium` | `$SKILL_DIR/scripts/medium-cli` | HTML or Markdown | Token auth |
| `linkedin` | `$SKILL_DIR/scripts/linkedin-cli` | Plain text + images | OAuth, max ~1300 chars |
| `xhs` | `$SKILL_DIR/bin/xhs-cli` | Title + text + images | Title ≤20 chars, body ≤1000, images required |
| `douyin` | `$SKILL_DIR/bin/douyin-cli` | Title + video/images | Video or images required |
| `x` | `$SKILL_DIR/bin/x-cli` | Text + optional media | 280 chars (standard), 25000 (Premium) |

**For every platform:**
1. Check login/auth status (read `references/platforms.md` for the check command)
2. Adapt content if needed (read `references/content-adapt.md` for conversion helpers)
3. Show confirmation gate (MANDATORY — never skip)
4. Execute CLI command
5. Report success or error

---

## Step 3: Multi-Platform Mode

When `--platform a,b,c`:
1. Process each platform sequentially
2. Each gets its own confirmation gate
3. Failure on one does NOT block others
4. If a platform produces a URL (e.g., Medium), offer to reuse it on subsequent platforms (e.g., LinkedIn article share)
5. Print consolidated summary:

```
Multi-platform publish complete!

  Platform       Status     Details
  ─────────────  ─────────  ──────────────
  wechat         Success    Publish ID: xxx
  medium         Success    URL: xxx
  x              Skipped    Not logged in

  Total: 2/3 published.
```

---

## Error Handling

| Scenario | Action |
|----------|--------|
| CLI not found | Warn, skip platform |
| Not configured / not logged in | Show setup command (from `references/setup-guide.md`), skip |
| CLI command fails | Show error, ask "Retry / Skip / Abort?" |
| Douyin without video/images | Warn "requires video or images", skip |
| XHS without images (and no video) | Warn "requires images", skip |
| Multi-platform partial failure | Print summary, don't roll back successes |
| node_modules missing | "Run: cd $SKILL_DIR && npm install && npm run build" |
