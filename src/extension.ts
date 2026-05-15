import * as vscode from 'vscode';
import { GitCommitGenerator } from './gitCommitGenerator';

let generator: GitCommitGenerator;

export function activate(context: vscode.ExtensionContext) {
    generator = new GitCommitGenerator();

    const generateCommand = vscode.commands.registerCommand('aiGitCommit.generate', async (...args: any[]) => {
        const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
        if (!gitExtension) {
            vscode.window.showErrorMessage('请先安装并启用 VSCode 的 Git 扩展');
            return;
        }

        const git = gitExtension.getAPI(1);

        if (!git.repositories || git.repositories.length === 0) {
            vscode.window.showErrorMessage('当前工作区不是 Git 仓库');
            return;
        }

        // scm/title 菜单点击时，第一个参数是 SourceControl 对象
        let repo = git.repositories[0];
        if (args[0]?.rootUri) {
            const clickedPath = args[0].rootUri.fsPath;
            const matched = git.repositories.find((r: any) => r.rootUri.fsPath === clickedPath);
            if (matched) {
                repo = matched;
            }
        }

        const stagedChanges = repo.state.indexChanges.length;
        const unstagedChanges = repo.state.workingTreeChanges.length;

        if (stagedChanges === 0 && unstagedChanges === 0) {
            vscode.window.showWarningMessage('没有检测到更改，无需提交');
            return;
        }

        const config = vscode.workspace.getConfiguration('aiGitCommit');
        const autoStage = config.get<boolean>('autoStage', true);

        if (unstagedChanges > 0 && autoStage) {
            await vscode.commands.executeCommand('git.stageAll');
            await new Promise(resolve => setTimeout(resolve, 500));
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
