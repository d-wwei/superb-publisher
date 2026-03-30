# Superb Publisher

一个 AI agent 技能，通过统一 CLI 接口将内容发布到 6 个社交平台。

[English](README.md)

---

## 解决什么问题

用 AI 写完文章后，你需要发到微信公众号、Medium、LinkedIn、小红书、抖音、X。每个平台的 API、认证方式、内容格式、字数限制都不一样。

Superb Publisher 给 AI agent 一个 `/publish` 命令。agent 说发哪里，skill 负责怎么发。

---

## 快速开始

```bash
git clone https://github.com/d-wwei/superb-publisher.git
cd superb-publisher

# 浏览器类 CLI（小红书、抖音、X）需要一次性构建：
npm install && npm run build

# API 类 CLI（微信、Medium、LinkedIn）直接可用，零依赖。
```

以 Medium 为例设置一个平台：

```bash
scripts/medium-cli init
# 编辑 ~/.config/medium-cli/config，填入 Integration Token
# 获取 Token：https://medium.com/me/settings/security

scripts/medium-cli publish --title "我的文章" --html article.html --status draft
```

---

## 核心功能

**一条命令发布到任一平台：**

```
/publish --platform medium --title "我的文章" --html article.html
```

**多平台同时发布：**

```
/publish --platform wechat,medium,x --title "我的文章" --html article.html
```

每个平台独立确认，单个失败不影响其他平台，最终输出汇总报告。

**按平台适配不同内容类型：**

- 长文 HTML 发到微信公众号和 Medium
- 文字 + 图片发到 LinkedIn 和小红书
- 视频发到抖音
- 推文、推文串、长文章发到 X/Twitter

**兼容所有 AI agent** — Claude Code、Codex、Gemini CLI、Cursor 等。agent 通过 Bash 调用 shell 命令，无需引入 SDK。

**接入 crisp-articulator 流水线**，作为发布环节：

```
写作 (great-writer) -> 配图 (brilliant-visualizer) -> 排版 (excellent-typesetter) -> 交付 -> 发布 (superb-publisher)
```

---

## 支持平台

| 平台 | CLI | 类型 | 认证方式 |
|------|-----|------|----------|
| 微信公众号 | `scripts/wechat-cli` | API (bash + curl) | AppID + AppSecret |
| Medium | `scripts/medium-cli` | API (bash + curl) | Integration Token |
| LinkedIn | `scripts/linkedin-cli` | API (bash + curl) | OAuth 2.0 |
| 小红书 | `bin/xhs-cli` | 浏览器自动化 (Puppeteer) | 扫码登录 |
| 抖音 | `bin/douyin-cli` | 浏览器自动化 (Puppeteer) | 扫码登录 |
| X / Twitter | `bin/x-cli` | 浏览器自动化 (Puppeteer) | 邮箱密码登录 |

### 各平台限制

| 平台 | 标题 | 正文 | 图片 | 视频 |
|------|------|------|------|------|
| 微信公众号 | 必填 | HTML，无大小限制 | 内嵌，需上传至 CDN | 不支持 |
| Medium | 必填 | HTML 或 Markdown，无限制 | 内嵌（自动转存） | 不支持 |
| LinkedIn | 包含在正文中 | 建议 ~1300 字符以内 | 最多 ~20 张 | 不支持 |
| 小红书 | 最多 20 字 | 最多 1000 字，纯文本 | 1-18 张 | 可选 |
| 抖音 | 最多 55 字 | 描述文字 | 最多 35 张 | 支持 |
| X/Twitter | 无（推文） | 280 字符（标准），25000（Premium） | 最多 4 张 | 可选 |

---

## 平台配置

API 类 CLI（`scripts/`）无需构建。浏览器类 CLI（`bin/`）需要 Node.js 18+ 并执行一次 `npm install && npm run build`。

### 微信公众号

```bash
scripts/wechat-cli init
# 编辑 ~/.config/wechat-cli/config，填入 AppID 和 AppSecret
# 在公众号后台 > 设置与开发 > 安全中心 > IP 白名单 添加本机公网 IP
scripts/wechat-cli token   # 验证
```

### Medium

```bash
scripts/medium-cli init
# 编辑 ~/.config/medium-cli/config，填入 Integration Token
# 获取 Token：https://medium.com/me/settings/security
scripts/medium-cli whoami   # 验证
```

### LinkedIn

```bash
scripts/linkedin-cli init
# 编辑 ~/.config/linkedin-cli/config，填入 client_id 和 client_secret
# 获取凭据：https://www.linkedin.com/developers/apps
# 在 Authorized Redirect URLs 添加 http://localhost:8585/callback
scripts/linkedin-cli login   # 打开浏览器进行 OAuth 授权
scripts/linkedin-cli whoami  # 验证
```

### 小红书

```bash
bin/xhs-cli login   # 打开浏览器，用小红书 App 扫码
bin/xhs-cli check   # 验证
```

### 抖音

```bash
bin/douyin-cli login   # 打开浏览器，用抖音 App 扫码
bin/douyin-cli check   # 验证
```

### X / Twitter

```bash
bin/x-cli login   # 打开浏览器，邮箱密码登录
bin/x-cli check   # 验证
```

---

## 项目结构

```
superb-publisher/
  SKILL.md              # AI agent 技能定义（入口文件）
  scripts/              # API 类 CLI — 纯 bash + curl，零依赖
    wechat-cli
    medium-cli
    linkedin-cli
  core/                 # 共享浏览器自动化基础设施（TypeScript）
  platforms/            # 各平台浏览器自动化实现
    xhs/
    douyin/
    x/
  bin/                  # 浏览器类 CLI 入口
    xhs-cli
    douyin-cli
    x-cli
  references/           # Agent 按需读取的参考文档
    platforms.md        # 各平台 CLI 详细命令
    setup-guide.md      # 首次配置指南
    content-adapt.md    # 内容格式转换工具
```

两类 CLI：

- **API 类**（`scripts/`）：纯 bash + curl，零依赖。任何装有 curl 的 macOS/Linux 机器都能用。
- **浏览器类**（`bin/`）：TypeScript + Puppeteer，自动化没有公开 API 的平台。首次需 `npm install`。

### CLI 设计规范

所有 CLI 遵循统一契约：

- **结构化输出**：stdout 输出 `PUBLISH_SUCCESS` / `PUBLISH_FAILED`，机器可解析。
- **退出码**：0 = 成功，1 = 失败。
- **配置隔离**：API 凭据在 `~/.config/{cli}/config`，浏览器 Cookie 在 `~/.config/social-cli/{platform}/cookies.json`，均为 chmod 600。
- **零上下文开销**：通过 Bash 工具调用，仅命令和输出出现在 AI 对话中。

---

## 相关项目

Superb Publisher 是写作到发布工具链的一部分：

| 项目 | 职责 |
|------|------|
| [great-writer](https://github.com/d-wwei/great-writer) | 写作 |
| [brilliant-visualizer](https://github.com/d-wwei/brilliant-visualizer) | 配图 |
| [excellent-typesetter](https://github.com/d-wwei/excellent-typesetter) | 排版 |
| [crisp-articulator](https://github.com/d-wwei/crisp-articulator) | 流水线编排 |
| **superb-publisher** | 发布（本仓库） |

---

## License

MIT
