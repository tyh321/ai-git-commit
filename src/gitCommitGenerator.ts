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
            style: config.get<string>('style', 'conventional'),
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
            default:
                throw new Error(`不支持的 AI 提供商: ${provider}`);
        }
    }

    /**
     * 构建系统提示词
     */
    private buildSystemPrompt(language: string, style: string): string {
        const styleInstructions: Record<string, string> = {
            conventional: `请按照 Conventional Commits 规范生成 commit 信息。
格式：type(scope): description

可选的 type：
- feat: 新功能
- fix: 修复 bug
- docs: 文档变更
- style: 代码格式（不影响代码运行）
- refactor: 重构
- perf: 性能优化
- test: 测试相关
- chore: 构建/工具辅助

示例：feat(auth): 添加 OAuth2 登录支持`,

            emoji: `请在 commit 信息开头添加相关的 emoji 表情。

常用 emoji 对照：
- ✨ feat: 新功能
- 🐛 fix: 修复 bug
- 📝 docs: 文档
- 💄 style: 格式
- ♻️ refactor: 重构
- ⚡ perf: 性能优化
- ✅ test: 测试
- 🔨 chore: 构建/工具

示例：✨ feat(auth): 添加 OAuth2 登录支持`,

            plain: `请生成简洁明了的中文 commit 信息，直接描述变更内容即可。`
        };

        const languageInstructions: Record<string, string> = {
            'zh-CN': '请使用中文输出 commit 信息。',
            'en': 'Please output the commit message in English.',
            'ja': '日本語でコミットメッセージを出力してください。'
        };

        return `你是一个专业的 Git commit 信息生成助手。根据提供的 git diff 内容，生成准确、简洁的 commit 信息。

${styleInstructions[style] || styleInstructions.conventional}

${languageInstructions[language] || ''}

重要规则：
1. 仔细分析所有代码变更，理解其目的和影响范围
2. 生成的信息要准确反映实际变更内容
3. 使用简洁的语言描述变更
4. 如果有多个不相关的变更，分别生成多条 commit 信息
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
        // 尝试解析多条消息（按换行或数字列表分隔）
        let messages: string[] = [];

        // 清理响应文本
        const cleaned = response
            .replace(/```[\s\S]*?```/g, '') // 移除代码块
            .trim();

        // 尝试按数字列表分割 (1. xxx, 2. xxx)
        const numberedMatches = cleaned.match(/^\d+[\.\、]\s*.+$/gm);
        if (numberedMatches && numberedMatches.length > 1) {
            messages = numberedMatches.map(m => m.replace(/^\d+[\.\、]\s*/, '').trim());
        }
        // 尝试按短横线列表分割 (- xxx)
        else if (cleaned.includes('\n-')) {
            messages = cleaned.split('\n-')
                .map(s => s.trim())
                .filter(s => s.length > 0)
                .map(s => s.replace(/^[-*•]\s*/, ''));
        }
        // 单条消息
        else {
            // 按双换行分割可能的多条消息
            messages = cleaned.split(/\n\n+/)
                .map(s => s.trim())
                .filter(s => s.length > 5); // 过滤太短的
        }

        // 确保每条消息格式正确
        messages = messages.map(msg => msg.replace(/^["']|["']$/g, '')).filter(m => m.length > 0);

        // 限制最多返回 5 条建议
        return messages.slice(0, 5);
    }
}
