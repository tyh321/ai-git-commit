# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development

```bash
npm run compile       # Compile TypeScript to out/
npm run watch          # Watch mode for development
npx @vscode/vsce package  # Package as .vsix
```

Press **F5** in VS Code to launch Extension Development Host for debugging. Debug Console output appears in the original window.

## Architecture

This is a VS Code extension that generates AI-powered git commit messages and fills them into the native SCM input box.

**Entry point:** `src/extension.ts`
- Registers one command: `aiGitCommit.generate` (triggered by ✨ icon in SCM title bar)
- Receives `SourceControl` object from `scm/title` menu to support multi-root workspaces
- Gets git diff via VS Code Git extension API (`repo.diff()`), calls AI, sets `repo.inputBox.value`

**AI provider logic:** `src/gitCommitGenerator.ts`
- `getDiff(repo)` — gets staged diff, falls back to working tree diff
- `buildSystemPrompt()` — constructs prompt with style (conventional/emoji/plain) and language (zh-CN/en/ja)
- `callOpenAICompatible()` — shared for OpenAI, DeepSeek, Ollama, Volcengine (火山方舟)
- `callAnthropic()` — separate handler for Anthropic's different API format
- `makeHttpRequest()` — raw Node.js http/https request with cancellation support

**Commit message format:** First line summary + numbered list of changes (1. 2. 3.)

## Configuration

All settings are in `package.json` under `contributes.configuration.properties` with prefix `aiGitCommit.*`. Default provider is `volcengine`.

## Key APIs

- VS Code Git extension API: `vscode.extensions.getExtension('vscode.git')?.exports.getAPI(1)`
- Repository object: `git.repositories[i]` — has `.diff()`, `.inputBox.value`, `.state.indexChanges`, `.rootUri`
- SCM title menu passes `SourceControl` as first argument to command handler
