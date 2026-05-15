# AI Git Commit

智能生成 Git 提交信息的 VSCode 插件，支持多种 AI 服务。

## ✨ 功能特点

- **🤖 多 AI 提供商支持**：OpenAI、Anthropic (Claude)、DeepSeek、Ollama
- **📝 多种提交风格**：Conventional Commits、Emoji 风格、纯文本
- **🌍 多语言支持**：中文、英文、日文 commit 信息
- **🎨 精美 Webview 界面**：可视化选择和编辑 commit 信息
- **⚡ 一键操作**：支持一键生成并提交
- **🔒 安全可靠**：API Key 本地存储，不会上传

## 🚀 快速开始

### 安装插件

1. 在 VSCode 中按 `Cmd+Shift+X` 打开扩展面板
2. 搜索 `AI Git Commit`
3. 点击安装（或从源码编译安装）

### 从源码编译

```bash
# 克隆项目
git clone https://github.com/your-username/ai-git-commit.git
cd ai-git-commit

# 安装依赖
npm install

# 编译
npm run compile

# 按 F5 启动调试模式
```

## ⚙️ 配置说明

### 选择 AI 提供商

在 VSCode 设置中搜索 `aiGitCommit.provider`，选择你使用的 AI 服务：

| 提供商 | 说明 |
|--------|------|
| `openai` | OpenAI GPT 系列 |
| `anthropic` | Anthropic Claude 系列 |
| `deepseek` | DeepSeek 模型 |
| `ollama` | 本地 Ollama 服务 |

### API Key 配置

#### OpenAI / DeepSeek
```jsonc
// settings.json
{
  "aiGitCommit.openai.apiKey": "sk-your-api-key",        // 必填
  "aiGitCommit.openai.model": "gpt-4o-mini",              // 可选，默认 gpt-4o-mini
  "aiGitCommit.openai.baseUrl": "https://api.openai.com/v1" // 可选，用于代理或兼容服务
}
```

#### Anthropic
```jsonc
{
  "aiGitCommit.anthropic.apiKey": "sk-ant-your-key",
  "aiGitCommit.anthropic.model": "claude-sonnet-4-20250514"
}
```

#### Ollama（本地运行，无需 API Key）
```jsonc
{
  "aiGitCommit.ollama.baseUrl": "http://localhost:11434",
  "aiGitCommit.ollama.model": "qwen2.5:7b"
}
```

### 其他设置

```jsonc
{
  // 输出语言: zh-CN (中文) / en (英文) / ja (日文)
  "aiGitCommit.language": "zh-CN",
  
  // 提交风格: conventional (规范) / emoji (表情) / plain (纯文本)
  "aiGitCommit.style": "conventional",
  
  // 最大 token 数（影响输出长度）
  "aiGitCommit.maxTokens": 200,
  
  // 创意度 (0-1, 越低越确定)
  "aiGitCommit.temperature": 0.7
}
```

## 🎯 使用方法

### 方式一：命令面板
1. 按 `Cmd+Shift+P` 打开命令面板
2. 输入以下命令之一：
   - `AI: 生成 Commit 信息` - 只生成信息，手动确认后提交
   - `AI: 生成并提交` - 自动生成并直接提交
   - `AI: 打开设置` - 打开插件配置页面

### 方式二：源代码管理面板
在 VSCode 的「源代码管理」面板中：
- 点击 **✨ 图标** 生成 commit 信息
- 点击 **✓ 图标** 生成并直接提交

### 方式三：快捷键（可自定义）
在 `keybindings.json` 中添加：
```jsonc
[
  {
    "key": "cmd+shift+c",
    "command": "aiGitCommit.generate"
  },
  {
    "key": "cmd+shift+enter",
    "command": "aiGitCommit.generateAndCommit"
  }
]
```

## 📋 工作流程

```
1. 编辑代码文件
      ↓
2. 暂存更改 (git add / VSCode 暂存)
      ↓
3. 调用 AI 生成命令
      ↓
4. AI 分析 git diff 内容
      ↓
5. 展示生成的 commit 信息列表
      ↓
6. 选择/编辑/自定义信息
      ↓
7. 执行 git commit ✓
```

## 🔧 支持的 Commit 风格

### Conventional Commits（默认）
```
feat(auth): 添加 OAuth2 登录支持
fix(api): 修复用户查询时的空指针异常
docs(readme): 更新安装说明
```

### Emoji 风格
```
✨ feat(auth): 添加 OAuth2 登录支持
🐛 fix(api): 修复用户查询时的空指针异常
📝 docs(readme): 更新安装说明
```

### 纯文本风格
```
添加 OAuth2 登录功能
修复用户查询空指针异常问题
更新 README 安装文档
```

## 🌐 支持的语言

- **zh-CN**: 中文（默认）
- **en**: 英文
- **ja**: 日文

## 💡 使用技巧

1. **先暂存再调用**：建议先 `git add` 需要提交的文件，这样 AI 分析更准确
2. **调整温度参数**：如果生成的结果不够准确，可以尝试降低 temperature 值
3. **使用本地模型**：配合 Ollama 可以完全离线使用，保护隐私
4. **自定义提示词**：可以在设置中修改 style 和 language 来获得不同风格的输出

## ⚠️ 注意事项

- 首次使用需要配置对应的 API Key（Ollama 除外）
- 确保 diff 内容不要过大（建议单次变更不超过 1000 行）
- 生成的 commit 信息仅供参考，请根据实际情况审核修改
- API Key 存储在本地 VSCode 配置中，不会上传到任何服务器

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

MIT License

## 🙏 致谢

感谢所有开源社区和 AI 服务提供商提供的强大能力！

---

**⭐ 如果这个项目对你有帮助，请给一个 Star 支持！**
