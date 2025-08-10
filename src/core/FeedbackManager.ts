import * as vscode from 'vscode';
import { NotificationManager, NotificationType } from './NotificationManager';
import { ErrorHandler, ErrorType, ErrorSeverity } from './ErrorHandler';
import { MCPConfig, MCPService, ValidationResult } from '../types/index';

/**
 * 反馈类型枚举
 */
export enum FeedbackType {
    SUCCESS = 'success',
    INFO = 'info',
    WARNING = 'warning',
    ERROR = 'error',
    PROGRESS = 'progress',
    CONFIRMATION = 'confirmation',
    INPUT = 'input'
}

/**
 * 反馈选项接口
 */
interface FeedbackOptions {
    type: FeedbackType;
    title: string;
    message: string;
    detail?: string;
    actions?: FeedbackAction[];
    timeout?: number;
    modal?: boolean;
    progress?: {
        total: number;
        current: number;
        cancellable?: boolean;
    };
    input?: {
        placeholder?: string;
        value?: string;
        validateInput?: (value: string) => string | undefined;
    };
}

/**
 * 反馈动作接口
 */
interface FeedbackAction {
    label: string;
    action: () => void | Promise<void>;
    isDefault?: boolean;
    isDestructive?: boolean;
}

/**
 * 用户交互状态接口
 */
interface InteractionState {
    isActive: boolean;
    type: FeedbackType;
    startTime: number;
    context?: any;
}

/**
 * 反馈历史记录接口
 */
interface FeedbackHistory {
    timestamp: number;
    type: FeedbackType;
    title: string;
    message: string;
    userAction?: string;
    duration: number;
}

/**
 * 用户交互反馈管理器
 * 负责管理用户交互、反馈收集和体验优化
 */
export class FeedbackManager {
    private notificationManager: NotificationManager;
    private errorHandler: ErrorHandler;
    private interactionState: InteractionState | null = null;
    private feedbackHistory: FeedbackHistory[] = [];
    private settings: {
        enableFeedbackCollection: boolean;
        enableUsageAnalytics: boolean;
        feedbackTimeout: number;
        maxHistorySize: number;
        enableHapticFeedback: boolean;
        enableSoundFeedback: boolean;
    };
    private progressReporters: Map<string, vscode.Progress<{ message?: string; increment?: number }>> = new Map();

    constructor(
        notificationManager: NotificationManager,
        errorHandler: ErrorHandler
    ) {
        this.notificationManager = notificationManager;
        this.errorHandler = errorHandler;
        this.settings = this.loadSettings();
    }

    /**
     * 加载反馈设置
     */
    private loadSettings() {
        const config = vscode.workspace.getConfiguration('mcpManager.feedback');
        return {
            enableFeedbackCollection: config.get('enableCollection', true),
            enableUsageAnalytics: config.get('enableAnalytics', false),
            feedbackTimeout: config.get('timeout', 5000),
            maxHistorySize: config.get('maxHistorySize', 100),
            enableHapticFeedback: config.get('enableHaptic', false),
            enableSoundFeedback: config.get('enableSound', false)
        };
    }

    /**
     * 显示成功反馈
     */
    public async showSuccess(
        title: string,
        message: string,
        actions?: FeedbackAction[]
    ): Promise<string | undefined> {
        const options: FeedbackOptions = {
            type: FeedbackType.SUCCESS,
            title,
            message,
            actions,
            timeout: this.settings.feedbackTimeout
        };

        return this.showFeedback(options);
    }

    /**
     * 显示信息反馈
     */
    public async showInfo(
        title: string,
        message: string,
        actions?: FeedbackAction[]
    ): Promise<string | undefined> {
        const options: FeedbackOptions = {
            type: FeedbackType.INFO,
            title,
            message,
            actions
        };

        return this.showFeedback(options);
    }

    /**
     * 显示警告反馈
     */
    public async showWarning(
        title: string,
        message: string,
        actions?: FeedbackAction[]
    ): Promise<string | undefined> {
        const options: FeedbackOptions = {
            type: FeedbackType.WARNING,
            title,
            message,
            actions
        };

        return this.showFeedback(options);
    }

    /**
     * 显示错误反馈
     */
    public async showError(
        title: string,
        message: string,
        error?: Error,
        actions?: FeedbackAction[]
    ): Promise<string | undefined> {
        // 记录错误到错误处理器
        if (error) {
            this.errorHandler.handleError(error);
        }

        const options: FeedbackOptions = {
            type: FeedbackType.ERROR,
            title,
            message,
            detail: error?.stack,
            actions: actions || [
                {
                    label: '查看详情',
                    action: () => this.showErrorDetails(error)
                },
                {
                    label: '报告问题',
                    action: () => this.reportIssue(error, title, message)
                }
            ]
        };

        return this.showFeedback(options);
    }

    /**
     * 显示确认对话框
     */
    public async showConfirmation(
        title: string,
        message: string,
        confirmLabel: string = '确认',
        cancelLabel: string = '取消'
    ): Promise<boolean> {
        return new Promise((resolve) => {
            const options: FeedbackOptions = {
                type: FeedbackType.CONFIRMATION,
                title,
                message,
                modal: true,
                actions: [
                    {
                        label: confirmLabel,
                        action: () => resolve(true),
                        isDefault: true
                    },
                    {
                        label: cancelLabel,
                        action: () => resolve(false)
                    }
                ]
            };

            this.showFeedback(options);
        });
    }

    /**
     * 显示输入对话框
     */
    public async showInput(
        title: string,
        placeholder?: string,
        defaultValue?: string,
        validateInput?: (value: string) => string | undefined
    ): Promise<string | undefined> {
        const result = await vscode.window.showInputBox({
            title,
            placeHolder: placeholder,
            value: defaultValue,
            validateInput
        });

        this.recordInteraction(FeedbackType.INPUT, title, result ? '用户输入' : '用户取消');
        return result;
    }

    /**
     * 显示进度反馈
     */
    public async showProgress<T>(
        title: string,
        task: (progress: vscode.Progress<{ message?: string; increment?: number }>, token: vscode.CancellationToken) => Promise<T>,
        cancellable: boolean = false
    ): Promise<T> {
        const progressId = `progress_${Date.now()}`;
        
        return vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title,
                cancellable
            },
            async (progress, token) => {
                this.progressReporters.set(progressId, progress);
                
                try {
                    const result = await task(progress, token);
                    this.recordInteraction(FeedbackType.PROGRESS, title, '任务完成');
                    return result;
                } catch (error) {
                    this.recordInteraction(FeedbackType.PROGRESS, title, '任务失败');
                    throw error;
                } finally {
                    this.progressReporters.delete(progressId);
                }
            }
        );
    }

    /**
     * 显示配置验证反馈
     */
    public async showValidationFeedback(
        result: ValidationResult,
        filePath?: string
    ): Promise<void> {
        if (result.isValid) {
            await this.showSuccess(
                '配置验证成功',
                '所有配置项都通过了验证',
                filePath ? [{
                    label: '打开文件',
                    action: async () => { await vscode.window.showTextDocument(vscode.Uri.file(filePath)); }
                }] : undefined
            );
            return;
        }

        const errorCount = result.errors.filter(e => e.severity === 'error').length;
        const warningCount = result.warnings.length;
        
        let message = `发现 ${errorCount} 个错误`;
        if (warningCount > 0) {
            message += ` 和 ${warningCount} 个警告`;
        }

        const actions: FeedbackAction[] = [
            {
                label: '查看详情',
                action: () => this.showValidationDetails(result)
            }
        ];

        if (filePath) {
            actions.push({
                label: '打开文件',
                action: async () => { await vscode.window.showTextDocument(vscode.Uri.file(filePath)); }
            });
        }

        if (result.suggestions && result.suggestions.length > 0) {
            actions.push({
                label: '查看建议',
                action: () => this.showSuggestions(result.suggestions || [])
            });
        }

        await this.showError('配置验证失败', message, undefined, actions);
    }

    /**
     * 显示服务操作反馈
     */
    public async showServiceOperationFeedback(
        operation: string,
        serviceId: string,
        success: boolean,
        message?: string
    ): Promise<void> {
        const title = `服务${operation}`;
        const fullMessage = `服务 "${serviceId}" ${message || (success ? '操作成功' : '操作失败')}`;

        if (success) {
            await this.showSuccess(title, fullMessage);
        } else {
            await this.showError(title, fullMessage);
        }
    }

    /**
     * 显示文件操作反馈
     */
    public async showFileOperationFeedback(
        operation: string,
        filePath: string,
        success: boolean,
        error?: Error
    ): Promise<void> {
        const fileName = filePath.split('/').pop() || filePath;
        const title = `文件${operation}`;
        const message = `文件 "${fileName}" ${success ? '操作成功' : '操作失败'}`;

        const actions: FeedbackAction[] = [];
        if (success) {
            actions.push({
                label: '打开文件',
                action: async () => { await vscode.window.showTextDocument(vscode.Uri.file(filePath)); }
            });
        }

        if (success) {
            await this.showSuccess(title, message, actions);
        } else {
            await this.showError(title, message, error, actions);
        }
    }

    /**
     * 显示通用反馈
     */
    private async showFeedback(options: FeedbackOptions): Promise<string | undefined> {
        const startTime = Date.now();
        this.interactionState = {
            isActive: true,
            type: options.type,
            startTime,
            context: options
        };

        try {
            let result: string | undefined;

            switch (options.type) {
                case FeedbackType.SUCCESS:
                    const successResult = await this.notificationManager.showNotification({
                        type: NotificationType.INFO,
                        message: `${options.title}: ${options.message}`,
                        actions: options.actions?.map(a => a.label)
                    });
                    result = successResult.action;
                    break;

                case FeedbackType.INFO:
                    const infoResult = await this.notificationManager.showNotification({
                        type: NotificationType.INFO,
                        message: `${options.title}: ${options.message}`,
                        actions: options.actions?.map(a => a.label)
                    });
                    result = infoResult.action;
                    break;

                case FeedbackType.WARNING:
                    const warningResult = await this.notificationManager.showNotification({
                        type: NotificationType.WARNING,
                        message: `${options.title}: ${options.message}`,
                        actions: options.actions?.map(a => a.label)
                    });
                    result = warningResult.action;
                    break;

                case FeedbackType.ERROR:
                    const errorResult = await this.notificationManager.showNotification({
                        type: NotificationType.ERROR,
                        message: `${options.title}: ${options.message}`,
                        actions: options.actions?.map(a => a.label)
                    });
                    result = errorResult.action;
                    break;

                case FeedbackType.CONFIRMATION:
                    if (options.modal) {
                        const choice = await vscode.window.showWarningMessage(
                            `${options.title}: ${options.message}`,
                            { modal: true },
                            ...options.actions?.map(a => a.label) || []
                        );
                        result = choice;
                    }
                    break;
            }

            // 执行对应的动作
            if (result && options.actions) {
                const action = options.actions.find(a => a.label === result);
                if (action) {
                    await action.action();
                }
            }

            this.recordInteraction(
                options.type,
                options.title,
                result || '无响应',
                Date.now() - startTime
            );

            return result;
        } finally {
            this.interactionState = null;
        }
    }

    /**
     * 显示错误详情
     */
    private async showErrorDetails(error?: Error): Promise<void> {
        if (!error) return;

        const document = await vscode.workspace.openTextDocument({
            content: `错误详情:\n\n${error.message}\n\n堆栈跟踪:\n${error.stack}`,
            language: 'plaintext'
        });

        await vscode.window.showTextDocument(document);
    }

    /**
     * 报告问题
     */
    private async reportIssue(error?: Error, title?: string, message?: string): Promise<void> {
        const issueBody = `
## 问题描述
${title}: ${message}

## 错误信息
${error?.message || '无'}

## 堆栈跟踪
\`\`\`
${error?.stack || '无'}
\`\`\`

## 环境信息
- VS Code版本: ${vscode.version}
- 操作系统: ${process.platform}
- 扩展版本: [请填写]
`;

        const issueUrl = `https://github.com/your-repo/issues/new?body=${encodeURIComponent(issueBody)}`;
        await vscode.env.openExternal(vscode.Uri.parse(issueUrl));
    }

    /**
     * 显示验证详情
     */
    private async showValidationDetails(result: ValidationResult): Promise<void> {
        const content = this.formatValidationResult(result);
        const document = await vscode.workspace.openTextDocument({
            content,
            language: 'plaintext'
        });

        await vscode.window.showTextDocument(document);
    }

    /**
     * 显示建议
     */
    private async showSuggestions(suggestions: string[]): Promise<void> {
        const content = `修复建议:\n\n${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
        const document = await vscode.workspace.openTextDocument({
            content,
            language: 'plaintext'
        });

        await vscode.window.showTextDocument(document);
    }

    /**
     * 格式化验证结果
     */
    private formatValidationResult(result: ValidationResult): string {
        let content = '配置验证结果\n\n';

        if (result.errors.length > 0) {
            content += '错误:\n';
            result.errors.forEach((error: any, index: number) => {
                content += `${index + 1}. [${error.field}] ${error.message}\n`;
                if (error.suggestion) {
                    content += `   建议: ${error.suggestion}\n`;
                }
            });
            content += '\n';
        }

        if (result.warnings.length > 0) {
            content += '警告:\n';
            result.warnings.forEach((warning: any, index: number) => {
                content += `${index + 1}. [${warning.field}] ${warning.message}\n`;
                if (warning.suggestion) {
                    content += `   建议: ${warning.suggestion}\n`;
                }
            });
            content += '\n';
        }

        if (result.suggestions && result.suggestions.length > 0) {
            content += '修复建议:\n';
            result.suggestions.forEach((suggestion: string, index: number) => {
                content += `${index + 1}. ${suggestion}\n`;
            });
        }

        return content;
    }

    /**
     * 记录交互
     */
    private recordInteraction(
        type: FeedbackType,
        title: string,
        userAction: string,
        duration: number = 0
    ): void {
        if (!this.settings.enableFeedbackCollection) return;

        const record: FeedbackHistory = {
            timestamp: Date.now(),
            type,
            title,
            message: title,
            userAction,
            duration
        };

        this.feedbackHistory.push(record);

        // 限制历史记录大小
        if (this.feedbackHistory.length > this.settings.maxHistorySize) {
            this.feedbackHistory = this.feedbackHistory.slice(-this.settings.maxHistorySize);
        }
    }

    /**
     * 获取交互状态
     */
    public getInteractionState(): InteractionState | null {
        return this.interactionState;
    }

    /**
     * 获取反馈历史
     */
    public getFeedbackHistory(): FeedbackHistory[] {
        return [...this.feedbackHistory];
    }

    /**
     * 清除反馈历史
     */
    public clearFeedbackHistory(): void {
        this.feedbackHistory = [];
    }

    /**
     * 获取使用统计
     */
    public getUsageStatistics(): any {
        if (!this.settings.enableUsageAnalytics) {
            return null;
        }

        const stats = {
            totalInteractions: this.feedbackHistory.length,
            interactionsByType: {} as Record<FeedbackType, number>,
            averageResponseTime: 0,
            mostCommonActions: {} as Record<string, number>
        };

        let totalDuration = 0;
        for (const record of this.feedbackHistory) {
            stats.interactionsByType[record.type] = (stats.interactionsByType[record.type] || 0) + 1;
            totalDuration += record.duration;
            if (record.userAction) {
                stats.mostCommonActions[record.userAction] = (stats.mostCommonActions[record.userAction] || 0) + 1;
            }
        }

        stats.averageResponseTime = this.feedbackHistory.length > 0 ? totalDuration / this.feedbackHistory.length : 0;

        return stats;
    }

    /**
     * 更新设置
     */
    public updateSettings(newSettings: Partial<typeof this.settings>): void {
        this.settings = { ...this.settings, ...newSettings };
    }

    /**
     * 获取设置
     */
    public getSettings(): typeof this.settings {
        return { ...this.settings };
    }

    /**
     * 销毁管理器
     */
    public dispose(): void {
        this.progressReporters.clear();
        this.feedbackHistory = [];
        this.interactionState = null;
    }
}