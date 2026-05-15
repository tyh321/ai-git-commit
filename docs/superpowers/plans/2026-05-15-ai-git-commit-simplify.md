# AI Git Commit Simplify Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify the extension so clicking the sparkle icon in SCM panel fills the AI-generated commit message directly into VS Code's native commit input box.

**Architecture:** Single command flow: click icon → get staged diff via Git extension API → call AI → set `repo.inputBox.value`. Remove Webview and QuickPick entirely.

**Tech Stack:** TypeScript, VS Code Extension API, Git Extension API

---

### Task 1: Simplify package.json

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update commands — remove generateAndCommit, keep generate and settings**

In `package.json`, replace the `contributes.commands` array with:

```json
"commands": [
  {
    "command": "aiGitCommit.generate",
    "title": "AI: 生成 Commit 信息",
    "icon": "$(sparkle)"
  },
  {
    "command": "aiGitCommit.settings",
    "title": "AI: 打开设置"
  }
]
```

- [ ] **Step 2: Update menus — remove editor/title and generateAndCommit, keep only SCM generate**

Replace the `contributes.menus` section with:

```json
"menus": {
  "scm/title": [
    {
      "when": "scmProvider == git",
      "command": "aiGitCommit.generate",
      "group": "navigation"
    }
  ]
}
```

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "refactor: simplify package.json commands and menus for SCM-only flow"
```

---

### Task 2: Delete commitMessageWebview.ts

**Files:**
- Delete: `src/commitMessageWebview.ts`

- [ ] **Step 1: Delete the file**

```bash
rm src/commitMessageWebview.ts
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "refactor: remove unused commitMessageWebview"
```

---

### Task 3: Improve getDiff in gitCommitGenerator.ts

**Files:**
- Modify: `src/gitCommitGenerator.ts:21-32`

- [ ] **Step 1: Replace getDiff to accept repository object instead of using child_process**

Replace the `getDiff` method (lines 21-32) with:

```typescript
async getDiff(repo: any): Promise<string> {
    try {
        const diff = await repo.diff(true);
        if (diff && diff.trim().length > 0) {
            return diff;
        }
        // Fallback: if no staged diff, try working tree diff
        return await repo.diff(false);
    } catch {
        throw new Error('无法获取 git diff 信息');
    }
}
```

- [ ] **Step 2: Remove unused imports at top of file**

The `https` and `http` imports stay (used by HTTP requests). No changes needed at the import level.

- [ ] **Step 3: Commit**

```bash
git add src/gitCommitGenerator.ts
git commit -m "refactor: use Git extension API for diff instead of child_process"
```

---

### Task 4: Rewrite extension.ts

**Files:**
- Modify: `src/extension.ts`

- [ ] **Step 1: Replace entire file with simplified implementation**

Replace the full contents of `src/extension.ts` with:

```typescript
import * as vscode from 'vscode';
import { GitCommitGenerator } from './gitCommitGenerator';

let generator: GitCommitGenerator;

export function activate(context: vscode.ExtensionContext) {
    generator = new GitCommitGenerator();

    const generateCommand = vscode.commands.registerCommand('aiGitCommit.generate', async () => {
        const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
        if (!gitExtension) {
            vscode.window.showErrorMessage('请先安装并启用 VSCode 的 Git 扩展');
            return;
        }

        const git = gitExtension.getAPI(1);
        const repo = git.repositories[0];

        if (!repo) {
            vscode.window.showErrorMessage('当前工作区不是 Git 仓库');
            return;
        }

        const stagedChanges = repo.state.indexChanges.length;
        const unstagedChanges = repo.state.workingTreeChanges.length;

        if (stagedChanges === 0 && unstagedChanges === 0) {
            vscode.window.showWarningMessage('没有检测到更改，无需提交');
            return;
        }

        if (unstagedChanges > 0 && stagedChanges === 0) {
            const action = await vscode.window.showWarningMessage(
                `检测到 ${unstagedChanges} 个未暂存的文件，暂存后再生成？`,
                '暂存全部',
                '取消'
            );
            if (action === '暂存全部') {
                await vscode.commands.executeCommand('git.stageAll');
            } else {
                return;
            }
        }

        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'AI 生成 Commit 信息',
                cancellable: true,
            },
            async (progress, token) => {
                try {
                    progress.report({ message: '获取 diff...' });
                    const diff = await generator.getDiff(repo);

                    if (!diff || diff.trim().length === 0) {
                        vscode.window.showWarningMessage('没有可分析的变更内容');
                        return;
                    }

                    progress.report({ message: '调用 AI...', increment: 50 });

                    if (token.isCancellationRequested) {
                        return;
                    }

                    const messages = await generator.generateCommitMessages(diff, token);

                    if (!messages || messages.length === 0) {
                        vscode.window.showErrorMessage('无法生成 commit 信息，请检查 API 配置');
                        return;
                    }

                    repo.inputBox.value = messages[0];
                } catch (error: any) {
                    vscode.window.showErrorMessage(`生成失败: ${error.message}`);
                }
            }
        );
    });

    const settingsCommand = vscode.commands.registerCommand('aiGitCommit.settings', async () => {
        await vscode.commands.executeCommand('workbench.action.openSettings', 'aiGitCommit');
    });

    context.subscriptions.push(generateCommand, settingsCommand);
}

export function deactivate() {}
```

- [ ] **Step 2: Commit**

```bash
git add src/extension.ts
git commit -m "refactor: simplify extension to fill native SCM input box"
```

---

### Task 5: Compile and verify

- [ ] **Step 1: Run TypeScript compiler**

```bash
cd /Users/tyh/Desktop/ai-git-commit && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 2: If compilation passes, do a full compile**

```bash
cd /Users/tyh/Desktop/ai-git-commit && npm run compile
```

Expected: successful compilation, output in `out/` directory
