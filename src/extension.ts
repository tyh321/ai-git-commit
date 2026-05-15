import * as vscode from 'vscode';
import { GitCommitGenerator } from './gitCommitGenerator.ts';
import { CommitMessageWebview } from './commitMessageWebview.ts';

let generator: GitCommitGenerator;

export function activate(context: vscode.ExtensionContext) {
    console.log('AI Git Commit 插件已激活');

    generator = new GitCommitGenerator(context);

    // 注册命令：生成 commit 信息
    const generateCommand = vscode.commands.registerCommand('aiGitCommit.generate', async () => {
        await generateCommitMessage(context, false);
    });

    // 注册命令：生成并提交
    const generateAndCommitCommand = vscode.commands.registerCommand('aiGitCommit.generateAndCommit', async () => {
        await generateCommitMessage(context, true);
    });

    // 注册命令：打开设置
    const settingsCommand = vscode.commands.registerCommand('aiGitCommit.settings', async () => {
        await vscode.commands.executeCommand('workbench.action.openSettings', 'aiGitCommit');
    });

    context.subscriptions.push(generateCommand, generateAndCommitCommand, settingsCommand);

    // 显示激活提示
    vscode.window.showInformationMessage('AI Git Commit 插件已就绪！');
}

async function generateCommitMessage(context: vscode.ExtensionContext, autoCommit: boolean) {
    // 检查是否在 git 仓库中
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

    // 检查是否有暂存的更改
    const stagedChanges = repo.state.indexChanges.length;
    const unstagedChanges = repo.state.workingTreeChanges.length;

    if (stagedChanges === 0 && unstagedChanges === 0) {
        vscode.window.showWarningMessage('没有检测到更改，无需提交');
        return;
    }

    // 如果有未暂存的更改，询问用户是否暂存所有
    if (unstagedChanges > 0 && stagedChanges === 0) {
        const action = await vscode.window.showWarningMessage(
            `检测到 ${unstagedChanges} 个未暂存的文件`,
            { modal: false },
            '暂存全部',
            '取消'
        );
        
        if (action === '暂存全部') {
            await vscode.commands.executeCommand('git.stageAll');
        } else if (action === '取消' || !action) {
            return;
        }
    }

    // 显示进度
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: '正在分析代码变更...',
            cancellable: true,
        },
        async (progress, token) => {
            try {
                progress.report({ message: '获取 diff 信息...' });
                
                // 获取 diff 内容
                const diff = await generator.getDiff();
                
                if (!diff || diff.trim().length === 0) {
                    vscode.window.showWarningMessage('没有可分析的变更内容');
                    return;
                }

                progress.report({ message: '调用 AI 生成 commit 信息...', increment: 50 });

                if (token.isCancellationRequested) {
                    return;
                }

                // 调用 AI 生成 commit message
                const messages = await generator.generateCommitMessages(diff, token);

                if (!messages || messages.length === 0) {
                    vscode.window.showErrorMessage('无法生成 commit 信息，请检查 API 配置');
                    return;
                }

                progress.report({ increment: 100, message: '完成！' });

                // 显示结果
                await showResults(context, messages, repo, autoCommit);

            } catch (error: any) {
                console.error('生成 commit 信息失败:', error);
                vscode.window.showErrorMessage(`生成失败: ${error.message}`);
            }
        }
    );
}

async function showResults(
    context: vscode.ExtensionContext,
    messages: string[],
    repo: any,
    autoCommit: boolean
) {
    if (autoCommit) {
        // 直接使用第一个生成的消息提交
        const selectedMessage = messages[0];
        await repo.commit(selectedMessage);
        vscode.window.showInformationMessage(`已提交: ${selectedMessage}`);
    } else {
        // 打开 webview 让用户选择和编辑
        const webview = new CommitMessageWebview(context.extensionUri, messages, repo);
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider(
                'aiGitCommit.commitMessage',
                webview
            )
        );
        
        // 也显示为 QuickPick 让用户快速选择
        const quickPick = vscode.window.createQuickPick();
        quickPick.items = messages.map((msg, index) => ({
            label: `$(${index === 0 ? 'star' : 'circle'})`,
            description: msg
        }));
        quickPick.placeholder = '选择一个 commit 信息（或输入自定义信息）';
        quickPick.canSelectMany = false;

        quickPick.onDidAccept(async () => {
            const selected = quickPick.selectedItems[0];
            const message = selected ? selected.description : quickPick.value;
            
            if (message && message.trim()) {
                await repo.commit(message.trim());
                vscode.window.showInformationMessage(`已提交: ${message.trim()}`);
            }
            quickPick.hide();
        });

        quickPick.show();
    }
}

export function deactivate() {
    console.log('AI Git Commit 插件已停用');
}
