# Superb Publisher

面向 AI Agent 流水线的多平台社交媒体发布工具包。通过统一 CLI 接口将内容路由到 6 个平台。

## 支持平台

| 平台 | CLI | 类型 | 认证方式 |
|------|-----|------|----------|
| 微信公众号 | `scripts/wechat-cli` | API (bash + curl) | AppID + AppSecret |
| Medium | `scripts/medium-cli` | API (bash + curl) | Integration Token |
| LinkedIn | `scripts/linkedin-cli` | API (bash + curl + OAuth) | OAuth 2.0 |
| 小红书 | `bin/xhs-cli` | 浏览器自动化 | 扫码登录 |
| 抖音 | `bin/douyin-cli` | 浏览器自动化 | 扫码登录 |
| X / Twitter | `bin/x-cli` | 浏览器自动化 | 邮箱密码登录 |

## 项目结构

```
superb-publisher/
  scripts/            # API 类 CLI（纯 bash 脚本，零依赖）
    wechat-cli
    medium-cli
    linkedin-cli
  core/               # 共享浏览器自动化基础设施
  platforms/          # 各平台浏览器自动化包
    xhs/
    douyin/
    x/
  bin/                # 浏览器类 CLI 入口
    xhs-cli
    douyin-cli
    x-cli
  SKILL.md            # AI Agent 技能定义文件
```

两类 CLI：
- **API 类**（`scripts/`）：纯 bash + curl，零依赖，开箱即用。
- **浏览器类**（`bin/`）：TypeScript + Puppeteer，首次需要 `npm install`。

## 快速开始

### 安装

```bash
# 克隆项目
git clone <repo-url> superb-publisher
cd superb-publisher

# 浏览器类 CLI 需要安装 Node.js 依赖（仅首次）
npm install
npm run build
```

API 类 CLI（`scripts/`）无需安装。

### 微信公众号

```bash
# 初始化配置
scripts/wechat-cli init
# 编辑 ~/.config/wechat-cli/config，填入 AppID 和 AppSecret
# 重要：在公众号后台 > 设置与开发 > 安全中心 > IP 白名单 中添加本机公网 IP

# 发布流程
scripts/wechat-cli check article.html           # 预检查
scripts/wechat-cli upload-images article.html    # 上传图片到微信 CDN
MEDIA_ID=$(scripts/wechat-cli draft --title "标题" --html article.html)  # 创建草稿
scripts/wechat-cli publish "$MEDIA_ID"           # 发布
```

### Medium

```bash
# 初始化配置
scripts/medium-cli init
# 编辑 ~/.config/medium-cli/config，填入 Integration Token
# 获取 Token：https://medium.com/me/settings/security

# 发布
scripts/medium-cli publish --title "我的文章" --html article.html --tags "AI,Tech" --status draft
```

### LinkedIn

```bash
# 初始化配置
scripts/linkedin-cli init
# 编辑 ~/.config/linkedin-cli/config，填入 client_id 和 client_secret
# 获取凭据：https://www.linkedin.com/developers/apps
# 在 Authorized Redirect URLs 添加 http://localhost:8585/callback
scripts/linkedin-cli login    # 打开浏览器进行 OAuth 授权

# 发布文字帖
scripts/linkedin-cli publish --text "分享我的最新文章"

# 带图片
scripts/linkedin-cli publish --text "附图发布" --images photo1.png photo2.png

# 分享文章链接
scripts/linkedin-cli publish --article --title "标题" --text "摘要" --url "https://..."
```

### 小红书

```bash
# 扫码登录
bin/xhs-cli login

# 发布图文笔记
bin/xhs-cli publish --title "我的笔记" --content "正文内容" --images img1.png img2.png

# 从 HTML 发布（自动提取纯文本）
bin/xhs-cli publish --title "我的笔记" --html article.html --images img1.png

# 发布视频
bin/xhs-cli publish --title "视频标题" --video clip.mp4 --cover cover.png

# 带标签
bin/xhs-cli publish --title "笔记" --content "正文" --images img.png --tags "旅行,美食"
```

### 抖音

```bash
# 扫码登录
bin/douyin-cli login

# 发布视频
bin/douyin-cli publish --title "我的视频" --video clip.mp4 --cover cover.png --tags "科技"

# 发布图文
bin/douyin-cli publish --title "图文内容" --images img1.png img2.png --content "描述文字"
```

### X / Twitter

```bash
# 邮箱密码登录
bin/x-cli login

# 发推
bin/x-cli publish --text "Hello world"

# 带图片
bin/x-cli publish --text "看看这个" --images photo1.png photo2.png

# 发布推文串
bin/x-cli thread --texts "第一条" "第二条" "第三条"

# 长文章（Premium 功能）
bin/x-cli article --title "我的文章" --md article.md
```

## AI Agent 集成

本工具包设计为 AI Agent 的发布技能。`SKILL.md` 定义了完整接口，兼容 Claude Code、Codex、Gemini CLI 等所有 Agent。

```bash
# 在任意 AI Agent 流水线中使用：
bin/xhs-cli check || bin/xhs-cli login
bin/xhs-cli publish --title "$TITLE" --content "$CONTENT" --images $IMAGES
```

### 与 crisp-articulator 集成

Superb Publisher 是 [crisp-articulator](../crisp-articulator/) 内容流水线的发布环节：

```
写作 -> 配图 -> 排版 -> 交付 -> [发布]
```

当 crisp-articulator 使用 `--publish --platform wechat,medium,x` 调用时，会依次调用本工具包的 CLI 发布到各平台。

## CLI 设计原则

所有 CLI 遵循统一规范：

- **结构化输出**：stdout 输出 `PUBLISH_SUCCESS` / `PUBLISH_FAILED`，机器可读。
- **退出码**：0 = 成功，1 = 失败。
- **配置隔离**：API 凭据在 `~/.config/{cli}/config`，浏览器 Cookie 在 `~/.config/social-cli/{platform}/cookies.json`，均为 chmod 600。
- **零上下文开销**：通过 Bash 工具调用，仅命令和输出出现在 AI 对话中。

## 各平台限制

| 平台 | 标题 | 正文 | 图片 | 视频 |
|------|------|------|------|------|
| 微信公众号 | 必需 | HTML，无大小限制 | 内嵌，需上传至 CDN | 不支持 |
| Medium | 必需 | HTML/Markdown，无限制 | 内嵌（自动转存） | 不支持 |
| LinkedIn | 包含在正文中 | 建议 ~1300 字符以内 | 最多 ~20 张 | 不支持 |
| 小红书 | 最多 20 字 | 最多 1000 字，纯文本 | 1-18 张 | 可选 |
| 抖音 | 最多 55 字 | 描述文字 | 最多 35 张 | 支持 |
| X/Twitter | 无（推文） | 280 字符（标准），25000（Premium） | 最多 4 张 | 可选 |

## License

MIT
