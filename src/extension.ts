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
