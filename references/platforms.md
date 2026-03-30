# Platform CLI Reference

Read this file when you need the detailed CLI commands for a specific platform.
Only read the section for the platform(s) being published to.

---

## WeChat (`--platform wechat`)

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

**Confirmation gate (MANDATORY -- never skip):**
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

**Errors:** draft fails → show WeChat API error, ask "Retry / Abort?". Error 61023 → "IP not in whitelist."

---

## Medium (`--platform medium`)

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
```

**Errors:** HTTP 401 → "Token expired. Run medium-cli init". HTTP 429 → "Rate limited."

---

## LinkedIn (`--platform linkedin`)

**CLI:** `$SKILL_DIR/scripts/linkedin-cli`
**Input:** Plain text + optional images
**Config:** `~/.config/linkedin-cli/config` + `~/.config/linkedin-cli/token`

**Confirmation gate (MANDATORY):**
```
Ready to publish to LinkedIn:

  Text:       {POST_TEXT[:100]}...
  Images:     {image_list or "none"}
  Visibility: {VISIBILITY}

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

**Publish (article share):**
```bash
POST_ID=$($SKILL_DIR/scripts/linkedin-cli publish --article --title "$TITLE" --text "$POST_TEXT" --url "$ARTICLE_URL" --thumbnail $COVER_IMAGE)
```

**Success output:**
```
Published to LinkedIn!
  Post ID:    {POST_ID}
  Type:       {text post | article share}
```

**Errors:** HTTP 401 → "Token expired. Run linkedin-cli login". HTTP 403 → "Missing w_member_social scope."

---

## Xiaohongshu (`--platform xhs`)

**CLI:** `$SKILL_DIR/bin/xhs-cli`
**Input:** Title + content/HTML + images
**Auth:** QR code login (browser)

**Limits:** Title max 20 chars, body max 1000 chars, images 1-18.

**Pre-publish login check:**
```bash
$SKILL_DIR/bin/xhs-cli check || $SKILL_DIR/bin/xhs-cli login
```

**Confirmation gate (MANDATORY):**
```
Ready to publish to Xiaohongshu:

  Title:   {XHS_TITLE} ({char_count} chars)
  Content: {CONTENT[:80]}...
  Images:  {count} file(s)
  Tags:    {TAGS or "none"}

  Publish now? (Y / n / edit)
```

**Publish (text + images):**
```bash
$SKILL_DIR/bin/xhs-cli publish --title "$XHS_TITLE" --content "$XHS_CONTENT" --images $IMAGES --tags "$TAGS"
```

**Publish (HTML -- cli extracts text internally):**
```bash
$SKILL_DIR/bin/xhs-cli publish --title "$XHS_TITLE" --html "$HTML_PATH" --images $IMAGES --tags "$TAGS"
```

**Publish (video):**
```bash
$SKILL_DIR/bin/xhs-cli publish --title "$XHS_TITLE" --video "$VIDEO_FILE" --cover "$COVER_FILE" --tags "$TAGS"
```

**Errors:** Login expired → auto-trigger xhs-cli login. PUBLISH_FAILED → show error.

---

## Douyin (`--platform douyin`)

**CLI:** `$SKILL_DIR/bin/douyin-cli`
**Input:** Title + (video OR images)
**Auth:** QR code login (browser)

**Limits:** Title max 55 chars, images max 35. Requires `--video` or `--images`.

**Pre-publish login check:**
```bash
$SKILL_DIR/bin/douyin-cli check || $SKILL_DIR/bin/douyin-cli login
```

**Confirmation gate (MANDATORY):**
```
Ready to publish to Douyin:

  Title:   {TITLE}
  Video:   {VIDEO_FILE or "none"}
  Images:  {count or "none"}
  Cover:   {COVER_FILE or "auto"}
  Tags:    {TAGS or "none"}

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

**Errors:** No video/images → skip with warning. Login expired → auto-trigger login.

---

## X/Twitter (`--platform x`)

**CLI:** `$SKILL_DIR/bin/x-cli`
**Input:** Text + optional images/video
**Auth:** Browser login (email/password + optional 2FA)

**Limits:** 280 chars (standard), 25000 (Premium). Images max 4. Video exclusive with images.

**Pre-publish login check:**
```bash
$SKILL_DIR/bin/x-cli check || $SKILL_DIR/bin/x-cli login
```

**Confirmation gate (MANDATORY):**
```
Ready to publish to X:

  Text:    {TWEET_TEXT[:100]}...
  Images:  {count or "none"}
  Video:   {VIDEO_FILE or "none"}
  Mode:    {tweet | thread | article}

  Publish now? (Y / n / edit)
```

**Publish (single tweet):**
```bash
$SKILL_DIR/bin/x-cli publish --text "$TWEET_TEXT" --images $IMAGES
```

**Publish (with video):**
```bash
$SKILL_DIR/bin/x-cli publish --text "$TWEET_TEXT" --video "$VIDEO_FILE"
```

**Publish (thread):**
```bash
$SKILL_DIR/bin/x-cli thread --texts "$TWEET_1" "$TWEET_2" "$TWEET_3"
```

**Publish (long-form article, Premium):**
```bash
$SKILL_DIR/bin/x-cli article --title "$TITLE" --md "$MD_PATH" --cover "$COVER_FILE"
```

**Errors:** Login expired → auto-trigger x-cli login. PUBLISH_FAILED → show error.
