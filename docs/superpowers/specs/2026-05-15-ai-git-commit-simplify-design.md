# AI Git Commit — Simplify to SCM Input Box Design

## Goal

When the user clicks the sparkle icon in VS Code's Source Control panel, AI generates a commit message and fills it directly into the native SCM commit input box. The user reviews and clicks commit themselves.

## Architecture

```
User clicks ✨ icon in SCM title bar
  → extension.ts: get staged diff via Git extension API
  → gitCommitGenerator.ts: call AI, return commit message
  → extension.ts: repo.inputBox.value = message
```

## Changes

### 1. `extension.ts` — Rewrite

- Keep only `aiGitCommit.generate` command
- Use `vscode.extensions.getExtension('vscode.git')` API to get repository
- Use `repo.diff()` or `repo.repository.diff()` to get staged changes (replace child_process approach)
- Call `generator.generateCommitMessages(diff)` to get AI message
- Set `repo.inputBox.value = messages[0]` to fill native input box
- Remove: `showResults`, QuickPick, Webview, `generateAndCommit` command

### 2. `gitCommitGenerator.ts` — Keep as-is

AI provider logic, prompt construction, and response parsing are all fine.

### 3. `commitMessageWebview.ts` — Delete

No longer needed.

### 4. `package.json` — Simplify

- `commands`: keep only `aiGitCommit.generate` and `aiGitCommit.settings`
- `menus.scm/title`: keep only `generate` with `$(sparkle)` icon
- Remove `editor/title` menu entry
- Remove `generateAndCommit` command and menu entry
- Keep all `contributes.configuration` settings unchanged

### 5. `getDiff` improvement

Replace `child_process.exec('git diff --cached')` with Git extension API's `repository.diff()` method for reliability (correct working directory, no dependency on global git).

## Unchanged

- AI provider support: OpenAI, Anthropic, DeepSeek, Ollama
- Prompt styles: conventional, emoji, plain
- Languages: zh-CN, en, ja
- All user-configurable settings in `contributes.configuration`
