# AI Git Commit

智能生成 Git 提交信息的 VSCode 插件，支持多种 AI 服务。

## 功能特点

- 多 AI 提供商支持：OpenAI、Anthropic (Claude)、DeepSeek、Ollama、火山方舟
- 多种提交风格：Conventional Commits、Emoji 风格、纯文本
- 多语言支持：中文、英文、日文 commit 信息
- 一键生成：点击 SCM 面板图标，AI 消息直接填入原生 commit 输入框
- 可选自动暂存：未暂存的文件自动 stage
- API Key 本地存储，不会上传

## 快速开始

### 安装

1. 下载 `.vsix` 文件
2. 在 VSCode 中执行：`code --install-extension ai-git-commit-1.0.0.vsix`
3. 或通过 Extensions 面板 → `...` → Install from VSIX...

### 从源码编译

```bash
git clone https://github.com/tianyuhang/ai-git-commit.git
cd ai-git-commit
npm install
npm run compile
npx @vscode/vsce package
```

## 使用方法

在 VSCode 源代码管理面板中点击 **✨ 图标**，AI 会自动生成 commit 信息并填入提交输入框，审阅后点击提交即可。

也可以通过命令面板（`Cmd+Shift+P`）执行 `AI: 生成 Commit 信息`。

## 配置说明

在 VSCode 设置中搜索 `aiGitCommit` 进行配置。

### AI 提供商

| 提供商 | 配置项 |
|--------|--------|
| `volcengine` | 火山方舟（默认） |
| `openai` | OpenAI GPT 系列 |
| `anthropic` | Anthropic Claude 系列 |
| `deepseek` | DeepSeek 模型 |
| `ollama` | 本地 Ollama 服务 |

### 火山方舟（默认）

```jsonc
{
  "aiGitCommit.volcengine.apiKey": "your-api-key",
  "aiGitCommit.volcengine.model": "deepseek-v3-2-251201",
  "aiGitCommit.volcengine.baseUrl": "https://ark.cn-beijing.volces.com/api/v3"
}
```

### OpenAI / DeepSeek

```jsonc
{
  "aiGitCommit.openai.apiKey": "sk-your-api-key",
  "aiGitCommit.openai.model": "gpt-4o-mini",
  "aiGitCommit.openai.baseUrl": "https://api.openai.com/v1"
}
```

### Anthropic

```jsonc
{
  "aiGitCommit.anthropic.apiKey": "sk-ant-your-key",
  "aiGitCommit.anthropic.model": "claude-sonnet-4-20250514"
}
```

### Ollama（本地运行，无需 API Key）

```jsonc
{
  "aiGitCommit.ollama.baseUrl": "http://localhost:11434",
  "aiGitCommit.ollama.model": "qwen2.5:7b"
}
```

### 其他设置

```jsonc
{
  // 输出语言: zh-CN / en / ja
  "aiGitCommit.language": "zh-CN",

  // 提交风格: conventional / emoji / plain
  "aiGitCommit.style": "conventional",

  // 最大 token 数
  "aiGitCommit.maxTokens": 200,

  // 生成温度 (0-1)
  "aiGitCommit.temperature": 0.7,

  // 自动暂存未暂存的文件
  "aiGitCommit.autoStage": false
}
```

## Commit 风格示例

### Conventional Commits（默认）
```
feat(auth): 添加 OAuth2 登录支持
fix(api): 修复用户查询时的空指针异常
```

### Emoji 风格
```
✨ feat(auth): 添加 OAuth2 登录支持
🐛 fix(api): 修复用户查询时的空指针异常
```

### 纯文本风格
```
添加 OAuth2 登录功能
修复用户查询空指针异常问题
```

## 许可证

MIT License
