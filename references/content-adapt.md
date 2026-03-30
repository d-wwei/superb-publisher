# Content Adaptation Reference

Read this file when publishing to platforms that need content format conversion.

## Platform Content Requirements

| Platform | Accepts | Title | Body | Images | Video |
|----------|---------|-------|------|--------|-------|
| WeChat | HTML | Required | HTML full article | Embedded (upload to CDN first) | No |
| Medium | HTML or MD | Required | Full article | Embedded (Medium re-hosts) | No |
| LinkedIn | Plain text | No (use in text) | Plain text, max ~1300 chars | Separate upload, max ~20 | No |
| Xiaohongshu | Text + images | Required, max 20 chars | Plain text, max 1000 chars | Separate, 1-18 | Optional |
| Douyin | Video or images | Required, max 55 chars | Description text | Separate, max 35 | Yes |
| X/Twitter | Text | No (for tweets) | 280 chars (standard) / 25000 (Premium) | Separate, max 4 | Optional |

## Helper Scripts

### HTML to plain text
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

### Title extraction from HTML
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

### Image extraction from Markdown
```bash
IMAGES=$(grep -oP '!\[.*?\]\(\K[^)]+' "$MD_PATH" 2>/dev/null | head -18)
```

### Text truncation for short-form platforms
```bash
# For XHS (20 char title)
XHS_TITLE=$(echo "$TITLE" | head -c 60)  # ~20 CJK chars = ~60 bytes

# For X/Twitter (280 chars)
TWEET_TEXT=$(echo "$PLAIN_TEXT" | head -c 280)

# For LinkedIn (~1300 chars)
POST_TEXT=$(echo "$PLAIN_TEXT" | head -c 1300)
```
