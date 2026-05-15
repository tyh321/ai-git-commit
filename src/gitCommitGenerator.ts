import * as vscode from 'vscode';
import * as https from 'https';
import * as http from 'http';

export interface AIProviderConfig {
    apiKey?: string;
    model: string;
    baseUrl: string;
}

export class GitCommitGenerator {
    constructor() {}

    /**
     * 获取当前 git diff 内容
     */
    async getDiff(repo: any): Promise<string> {
        try {
            const diff = await repo.diff(true);
            if (diff && diff.trim().length > 0) {
                return diff;
            }
            return await repo.diff(false);
        } catch {
            throw new Error('无法获取 git diff 信息');
        }
    }

    /**
     * 获取当前配置
     */
    private getConfig(): { provider: string; language: string; style: string; maxTokens: number; temperature: number } {
        const config = vscode.workspace.getConfiguration('aiGitCommit');
        return {
            provider: config.get<string>('provider', 'openai'),
            language: config.get<string>('language', 'zh-CN'),
            style: config.get<string>('style', 'emoji'),
            maxTokens: config.get<number>('maxTokens', 200),
            temperature: config.get<number>('temperature', 0.7)
        };
    }

    /**
     * 获取特定提供商的配置
     */
    private getProviderConfig(provider: string): AIProviderConfig {
        const config = vscode.workspace.getConfiguration(`aiGitCommit.${provider}`);
        
        switch (provider) {
            case 'openai':
                return {
                    apiKey: config.get<string>('apiKey', ''),
                    model: config.get<string>('model', 'gpt-4o-mini'),
                    baseUrl: config.get<string>('baseUrl', 'https://api.openai.com/v1')
                };
            case 'anthropic':
                return {
                    apiKey: config.get<string>('apiKey', ''),
                    model: config.get<string>('model', 'claude-sonnet-4-20250514'),
                    baseUrl: 'https://api.anthropic.com'
                };
            case 'deepseek':
                return {
                    apiKey: config.get<string>('apiKey', ''),
                    model: config.get<string>('model', 'deepseek-chat'),
                    baseUrl: 'https://api.deepseek.com'
                };
            case 'ollama':
                return {
                    model: config.get<string>('model', 'qwen2.5:7b'),
                    baseUrl: config.get<string>('baseUrl', 'http://localhost:11434')
                };
            case 'volcengine':
                return {
                    apiKey: config.get<string>('apiKey', ''),
                    model: config.get<string>('model', 'deepseek-v3-2-251201'),
                    baseUrl: config.get<string>('baseUrl', 'https://ark.cn-beijing.volces.com/api/v3')
                };
            default:
                throw new Error(`不支持的 AI 提供商: ${provider}`);
        }
    }

    /**
     * 构建系统提示词
     */
    private buildSystemPrompt(language: string, style: string): string {
        const styleInstructions: Record<string, string> = {
            conventional: `第一行格式：type: 简短摘要（不超过 72 个字符）

可选的 type：
- feat: 新功能
- fix: 修复 bug
- docs: 文档变更
- style: 代码格式（不影响代码运行）
- refactor: 重构
- perf: 性能优化
- test: 测试相关
- chore: 构建/工具辅助`,

            emoji: `第一行格式：emoji type: 简短摘要（不超过 72 个字符）

常用 emoji 对照：
- ✨ feat: 新功能
- 🐛 fix: 修复 bug
- 📝 docs: 文档
- 💄 style: 格式
- ♻️ refactor: 重构
- ⚡ perf: 性能优化
- ✅ test: 测试
- 🔨 chore: 构建/工具`,

            plain: `第一行：简短摘要（不超过 72 个字符）`
        };

        const languageInstructions: Record<string, string> = {
            'zh-CN': '请使用中文输出 commit 信息。',
            'en': 'Please output the commit message in English.',
            'ja': '日本語でコミットメッセージを出力してください。'
        };

        return `你是一个专业的 Git commit 信息生成助手。根据提供的 git diff 内容，生成准确、简洁的 commit 信息。

输出格式严格如下：

第一行：简短总结本次变更的目的
（空一行）
1. 具体变更点1
2. 具体变更点2
3. 具体变更点3

示例：

feat: 新增火山方舟AI支持，优化插件配置与使用体验

1. 新增火山方舟AI提供商支持，配置默认使用该服务
2. 完善VSCode调试配置，添加默认构建任务
3. 优化SCM面板适配，支持多仓库选择
4. 新增自动暂存配置项，改进未暂存文件处理逻辑
5. 更新文档与配置项，添加LICENSE与图标资源
6. 重构package.json完善仓库信息与打包脚本

${styleInstructions[style] || styleInstructions.conventional}

${languageInstructions[language] || ''}

重要规则：
1. 仔细分析所有代码变更，理解其目的和影响范围
2. 第一行是整体变更的概括总结
3. 每个变更点用数字序号 "1. 2. 3. " 开头，准确描述具体改动
4. 只输出 commit 信息本身，不要输出任何其他内容
5. 每行不超过 72 个字符`;
    }

    /**
     * 调用 AI 生成 commit messages
     */
    async generateCommitMessages(diff: string, token?: vscode.CancellationToken): Promise<string[]> {
        const config = this.getConfig();
        const providerConfig = this.getProviderConfig(config.provider);
        const systemPrompt = this.buildSystemPrompt(config.language, config.style);

        // 检查 API Key（Ollama 不需要）
        if (config.provider !== 'ollama' && !providerConfig.apiKey) {
            await vscode.window.showErrorMessage(
                `请先配置 ${config.provider} 的 API Key`,
                '打开设置'
            );
            await vscode.commands.executeCommand('workbench.action.openSettings', `aiGitCommit.${config.provider}.apiKey`);
            throw new Error('API Key 未配置');
        }

        try {
            let response: string[];

            switch (config.provider) {
                case 'openai':
                case 'deepseek':
                case 'ollama':
                case 'volcengine':
                    response = await this.callOpenAICompatible(
                        providerConfig,
                        systemPrompt,
                        diff,
                        config.maxTokens,
                        config.temperature,
                        token
                    );
                    break;
                case 'anthropic':
                    response = await this.callAnthropic(
                        providerConfig,
                        systemPrompt,
                        diff,
                        config.maxTokens,
                        config.temperature,
                        token
                    );
                    break;
                default:
                    throw new Error(`不支持的 AI 提供商: ${config.provider}`);
            }

            console.log(response);
            
            return this.parseResponse(response.join('\n'), config.style);

        } catch (error: any) {
            console.error('AI 调用失败:', error);
            throw new Error(`AI 服务调用失败: ${error.message}`);
        }
    }

    /**
     * 调用 OpenAI 兼容的 API（OpenAI / DeepSeek / Ollama）
     */
    private async callOpenAICompatible(
        config: AIProviderConfig,
        systemPrompt: string,
        userContent: string,
        maxTokens: number,
        temperature: number,
        token?: vscode.CancellationToken
    ): Promise<string[]> {
        const isOllama = config.baseUrl.includes('localhost') || config.baseUrl.includes('127.0.0.1');
        
        const body = JSON.stringify({
            model: config.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `以下是 git diff 的内容，请根据这些变更生成 commit 信息：\n\n\`\`\`diff\n${userContent}\n\`\`\`` }
            ],
            max_tokens: maxTokens,
            temperature: temperature,
            stream: false
        });

        const url = new URL(`${config.baseUrl}/chat/completions`);
        
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body).toString()
        };

        if (!isOllama && config.apiKey) {
            headers['Authorization'] = `Bearer ${config.apiKey}`;
        }

        const response = await this.makeHttpRequest(url.toString(), {
            method: 'POST',
            headers,
            body
        }, token);

        const data = JSON.parse(response);
        
        if (data.error) {
            throw new Error(data.error.message || JSON.stringify(data.error));
        }

        if (!data.choices || data.choices.length === 0) {
            throw new Error('AI 返回了空响应');
        }

        return [data.choices[0].message.content];
    }

    /**
     * 调用 Anthropic Claude API
     */
    private async callAnthropic(
        config: AIProviderConfig,
        systemPrompt: string,
        userContent: string,
        maxTokens: number,
        temperature: number,
        token?: vscode.CancellationToken
    ): Promise<string[]> {
        const body = JSON.stringify({
            model: config.model,
            max_tokens: maxTokens,
            system: systemPrompt,
            messages: [
                {
                    role: 'user',
                    content: `以下是 git diff 的内容，请根据这些变更生成 commit 信息：\n\n\`\`\`diff\n${userContent}\n\`\`\``
                }
            ],
            temperature: temperature
        });

        const url = `${config.baseUrl}/v1/messages`;

        const response = await this.makeHttpRequest(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.apiKey!,
                'anthropic-version': '2023-06-01',
                'Content-Length': Buffer.byteLength(body).toString()
            },
            body
        }, token);

        const data = JSON.parse(response);

        if (data.error) {
            throw new Error(data.error.message || JSON.stringify(data.error));
        }

        if (!data.content || data.content.length === 0) {
            throw new Error('AI 返回了空响应');
        }

        return [data.content[0].text];
    }

    /**
     * 执行 HTTP 请求
     */
    private makeHttpRequest(
        url: string,
        options: http.RequestOptions & { body: string },
        token?: vscode.CancellationToken
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            if (token?.isCancellationRequested) {
                reject(new Error('用户取消操作'));
                return;
            }

            const client = url.startsWith('https') ? https : http;
            
            // 解析 URL 以获取 hostname 和 path
            const parsedUrl = new URL(url);
            
            const req = client.request({
                ...options,
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (url.startsWith('https') ? 443 : 80),
                path: parsedUrl.pathname + parsedUrl.search,
            }, (res) => {
                let data = '';

                res.on('data', (chunk: string | Buffer) => {
                    data += chunk.toString();
                });

                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(data);
                    } else {
                        reject(new Error(`HTTP Error: ${res.statusCode} - ${data}`));
                    }
                });
            });

            req.on('error', (error: Error) => {
                reject(error);
            });

            // 监听取消事件
            if (token) {
                const cancellationListener = () => {
                    req.destroy();
                    reject(new Error('用户取消操作'));
                };
                token.onCancellationRequested(cancellationListener);
            }

            req.write(options.body);
            req.end();
        });
    }

    /**
     * 解析 AI 返回的结果
     */
    private parseResponse(response: string, style: string): string[] {
        const cleaned = response
            .replace(/```[\s\S]*?```/g, '')
            .trim();

        return [cleaned];
    }
}
