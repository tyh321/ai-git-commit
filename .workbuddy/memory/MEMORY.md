# 项目长期记忆

## ai-git-commit 插件关键事实

- 用户实际使用**火山方舟（volcengine）**，模型 `doubao-seed-2-0-mini-260428`（settings.json 在
  `~/Library/Application Support/CodeBuddy CN/User/settings.json`，不是 VS Code 默认的 deepseek-v3-2）。
- **豆包 Seed 2.x 在 Ark 上默认开启思考模式**：不传 `thinking` 参数也会生成大量 reasoning tokens，
  延迟翻倍且挤占 max_tokens。commit 生成场景必须显式 `thinking: {type:'disabled'}`（仅对 volces.com 域名加）。
- maxTokens 默认值已从 200 提到 500（思考/中文多行格式需要）。
- vsce 打包可用 npx 缓存直接跑：`~/.npm/_npx/66fbc91407e86cd3/node_modules/.bin/vsce package`，
  比 `npm run package`（npx 现场拉包）快得多。
- 用户对 git 提交有硬性规则：未经确认禁止 commit/push。
