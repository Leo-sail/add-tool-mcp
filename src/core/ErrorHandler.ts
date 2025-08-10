import * as vscode from 'vscode';
import { NotificationManager, NotificationType } from './NotificationManager';

/**
 * 错误类型枚举
 */
export enum ErrorType {
    VALIDATION = 'validation',
    FILE_IO = 'file_io',
    NETWORK = 'network',
    PARSING = 'parsing',
    CONFIGURATION = 'configuration',
    PERMISSION = 'permission',
    UNKNOWN = 'unknown'
}

/**
 * 错误严重程度枚举
 */
export enum ErrorSeverity {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
}

/**
 * 错误信息接口
 */
export interface ErrorInfo {
    type: ErrorType;
    severity: ErrorSeverity;
    message: string;
    details?: string;
    code?: string;
    source?: string;
    timestamp: number;
    stack?: string;
    context?: Record<string, any>;
}

/**
 * 错误处理选项接口
 */
interface ErrorHandlingOptions {
    showNotification?: boolean;
    logToConsole?: boolean;
    logToFile?: boolean;
    includeStack?: boolean;
    suggestActions?: boolean;
    autoRetry?: boolean;
    retryCount?: number;
    retryDelay?: number;
}

/**
 * 错误处理器类
 * 负责统一处理和管理所有错误
 */
export class ErrorHandler {
    private notificationManager: NotificationManager;
    private errorHistory: ErrorInfo[] = [];
    private readonly maxHistorySize = 100;
    private retryAttempts: Map<string, number> = new Map();
    private settings: {
        enableErrorReporting: boolean;
        enableAutoRetry: boolean;
        maxRetryAttempts: number;
        retryDelay: number;
        enableDetailedLogging: boolean;
    };

    constructor(notificationManager: NotificationManager) {
        this.notificationManager = notificationManager;
        this.settings = this.loadSettings();
    }

    /**
     * 加载错误处理设置
     */
    private loadSettings() {
        const config = vscode.workspace.getConfiguration('mcpManager.errorHandling');
        
        return {
            enableErrorReporting: config.get('enableErrorReporting', true),
            enableAutoRetry: config.get('enableAutoRetry', true),
            maxRetryAttempts: config.get('maxRetryAttempts', 3),
            retryDelay: config.get('retryDelay', 1000),
            enableDetailedLogging: config.get('enableDetailedLogging', false)
        };
    }

    /**
     * 处理错误
     */
    public async handleError(
        error: Error | string,
        type: ErrorType = ErrorType.UNKNOWN,
        severity: ErrorSeverity = ErrorSeverity.MEDIUM,
        options: ErrorHandlingOptions = {}
    ): Promise<void> {
        const errorInfo = this.createErrorInfo(error, type, severity);
        
        // 添加到历史记录
        this.addToHistory(errorInfo);
        
        // 应用默认选项
        const finalOptions: ErrorHandlingOptions = {
            showNotification: true,
            logToConsole: true,
            logToFile: false,
            includeStack: this.settings.enableDetailedLogging,
            suggestActions: true,
            autoRetry: this.settings.enableAutoRetry,
            retryCount: this.settings.maxRetryAttempts,
            retryDelay: this.settings.retryDelay,
            ...options
        };
        
        // 记录错误
        if (finalOptions.logToConsole) {
            this.logToConsole(errorInfo, finalOptions.includeStack);
        }
        
        // 显示通知
        if (finalOptions.showNotification && this.settings.enableErrorReporting) {
            await this.showErrorNotification(errorInfo, finalOptions);
        }
    }

    /**
     * 创建错误信息对象
     */
    private createErrorInfo(
        error: Error | string,
        type: ErrorType,
        severity: ErrorSeverity
    ): ErrorInfo {
        const message = typeof error === 'string' ? error : error.message;
        const stack = typeof error === 'object' ? error.stack : undefined;
        
        return {
            type,
            severity,
            message,
            timestamp: Date.now(),
            stack,
            code: this.extractErrorCode(error),
            source: this.extractErrorSource(error)
        };
    }

    /**
     * 提取错误代码
     */
    private extractErrorCode(error: Error | string): string | undefined {
        if (typeof error === 'object' && 'code' in error) {
            return (error as any).code;
        }
        return undefined;
    }

    /**
     * 提取错误源
     */
    private extractErrorSource(error: Error | string): string | undefined {
        if (typeof error === 'object' && error.stack) {
            const stackLines = error.stack.split('\n');
            if (stackLines.length > 1) {
                const sourceLine = stackLines[1];
                const match = sourceLine.match(/at\s+(.+?)\s+\((.+?)\)/);
                if (match) {
                    return `${match[1]} (${match[2]})`;
                }
            }
        }
        return undefined;
    }

    /**
     * 记录到控制台
     */
    private logToConsole(errorInfo: ErrorInfo, includeStack: boolean = false): void {
        const prefix = `[MCP Manager ${errorInfo.severity.toUpperCase()}]`;
        const message = `${prefix} ${errorInfo.type}: ${errorInfo.message}`;
        
        switch (errorInfo.severity) {
            case ErrorSeverity.LOW:
                console.info(message);
                break;
            case ErrorSeverity.MEDIUM:
                console.warn(message);
                break;
            case ErrorSeverity.HIGH:
            case ErrorSeverity.CRITICAL:
                console.error(message);
                break;
        }
        
        if (includeStack && errorInfo.stack) {
            console.error('Stack trace:', errorInfo.stack);
        }
        
        if (errorInfo.context) {
            console.error('Context:', errorInfo.context);
        }
    }

    /**
     * 显示错误通知
     */
    private async showErrorNotification(
        errorInfo: ErrorInfo,
        options: ErrorHandlingOptions
    ): Promise<void> {
        const notificationType = this.getNotificationType(errorInfo.severity);
        const actions = options.suggestActions ? this.getSuggestedActions(errorInfo) : [];
        
        const result = await this.notificationManager.showNotification({
            type: notificationType,
            message: this.formatErrorMessage(errorInfo),
            actions
        });
        
        // 处理用户选择的操作
        if (result.action) {
            await this.handleErrorAction(result.action, errorInfo, options);
        }
    }

    /**
     * 获取通知类型
     */
    private getNotificationType(severity: ErrorSeverity): NotificationType {
        switch (severity) {
            case ErrorSeverity.LOW:
                return NotificationType.INFO;
            case ErrorSeverity.MEDIUM:
                return NotificationType.WARNING;
            case ErrorSeverity.HIGH:
            case ErrorSeverity.CRITICAL:
                return NotificationType.ERROR;
            default:
                return NotificationType.WARNING;
        }
    }

    /**
     * 格式化错误消息
     */
    private formatErrorMessage(errorInfo: ErrorInfo): string {
        let message = errorInfo.message;
        
        // 添加错误类型信息
        if (errorInfo.type !== ErrorType.UNKNOWN) {
            message = `${this.getErrorTypeDisplayName(errorInfo.type)}: ${message}`;
        }
        
        // 添加错误代码
        if (errorInfo.code) {
            message += ` (错误代码: ${errorInfo.code})`;
        }
        
        return message;
    }

    /**
     * 获取错误类型显示名称
     */
    private getErrorTypeDisplayName(type: ErrorType): string {
        const typeNames = {
            [ErrorType.VALIDATION]: '验证错误',
            [ErrorType.FILE_IO]: '文件操作错误',
            [ErrorType.NETWORK]: '网络错误',
            [ErrorType.PARSING]: '解析错误',
            [ErrorType.CONFIGURATION]: '配置错误',
            [ErrorType.PERMISSION]: '权限错误',
            [ErrorType.UNKNOWN]: '未知错误'
        };
        
        return typeNames[type] || '未知错误';
    }

    /**
     * 获取建议的操作
     */
    private getSuggestedActions(errorInfo: ErrorInfo): string[] {
        const actions: string[] = [];
        
        switch (errorInfo.type) {
            case ErrorType.VALIDATION:
                actions.push('查看详情', '修复配置');
                break;
            case ErrorType.FILE_IO:
                actions.push('重试', '检查权限', '选择其他文件');
                break;
            case ErrorType.NETWORK:
                actions.push('重试', '检查网络连接');
                break;
            case ErrorType.PARSING:
                actions.push('查看详情', '修复格式');
                break;
            case ErrorType.CONFIGURATION:
                actions.push('重置配置', '查看帮助');
                break;
            case ErrorType.PERMISSION:
                actions.push('检查权限', '以管理员身份运行');
                break;
            default:
                actions.push('重试', '查看详情');
        }
        
        actions.push('忽略');
        return actions;
    }

    /**
     * 处理错误操作
     */
    private async handleErrorAction(
        action: string,
        errorInfo: ErrorInfo,
        options: ErrorHandlingOptions
    ): Promise<void> {
        switch (action) {
            case '重试':
                await this.handleRetry(errorInfo, options);
                break;
            case '查看详情':
                await this.showErrorDetails(errorInfo);
                break;
            case '修复配置':
                vscode.commands.executeCommand('mcpManager.openPanel');
                break;
            case '检查权限':
                await this.showPermissionHelp();
                break;
            case '重置配置':
                await this.showResetConfigDialog();
                break;
            case '查看帮助':
                await this.showHelp(errorInfo.type);
                break;
        }
    }

    /**
     * 处理重试
     */
    private async handleRetry(
        errorInfo: ErrorInfo,
        options: ErrorHandlingOptions
    ): Promise<void> {
        const retryKey = `${errorInfo.type}_${errorInfo.message}`;
        const currentAttempts = this.retryAttempts.get(retryKey) || 0;
        
        if (currentAttempts >= (options.retryCount || 3)) {
            await this.notificationManager.showNotification({
                type: NotificationType.ERROR,
                message: '已达到最大重试次数，请检查问题后手动重试'
            });
            return;
        }
        
        this.retryAttempts.set(retryKey, currentAttempts + 1);
        
        // 延迟后重试
        setTimeout(() => {
            vscode.commands.executeCommand('mcpManager.refreshServices');
        }, options.retryDelay || 1000);
    }

    /**
     * 显示错误详情
     */
    private async showErrorDetails(errorInfo: ErrorInfo): Promise<void> {
        const details = [
            `错误类型: ${this.getErrorTypeDisplayName(errorInfo.type)}`,
            `严重程度: ${errorInfo.severity}`,
            `时间: ${new Date(errorInfo.timestamp).toLocaleString()}`,
            `消息: ${errorInfo.message}`
        ];
        
        if (errorInfo.code) {
            details.push(`错误代码: ${errorInfo.code}`);
        }
        
        if (errorInfo.source) {
            details.push(`来源: ${errorInfo.source}`);
        }
        
        if (errorInfo.stack && this.settings.enableDetailedLogging) {
            details.push(`堆栈跟踪:\n${errorInfo.stack}`);
        }
        
        const detailsText = details.join('\n');
        
        const action = await this.notificationManager.showNotification({
            type: NotificationType.INFO,
            message: '错误详情',
            actions: ['复制到剪贴板', '关闭'],
            modal: true
        });
        
        if (action.action === '复制到剪贴板') {
            await vscode.env.clipboard.writeText(detailsText);
            await this.notificationManager.showNotification({
                type: NotificationType.SUCCESS,
                message: '错误详情已复制到剪贴板'
            });
        }
    }

    /**
     * 显示权限帮助
     */
    private async showPermissionHelp(): Promise<void> {
        const helpText = [
            '权限问题可能的解决方案:',
            '1. 检查文件和目录的读写权限',
            '2. 确保VS Code有足够的权限访问文件',
            '3. 尝试以管理员身份运行VS Code',
            '4. 检查文件是否被其他程序占用'
        ].join('\n');
        
        await this.notificationManager.showNotification({
            type: NotificationType.INFO,
            message: helpText,
            modal: true
        });
    }

    /**
     * 显示重置配置对话框
     */
    private async showResetConfigDialog(): Promise<void> {
        const confirmed = await this.notificationManager.showConfirmDialog(
            '确定要重置MCP配置吗？这将清除所有当前配置。',
            '重置',
            '取消'
        );
        
        if (confirmed) {
            vscode.commands.executeCommand('mcpManager.resetConfig');
        }
    }

    /**
     * 显示帮助信息
     */
    private async showHelp(errorType: ErrorType): Promise<void> {
        const helpUrls = {
            [ErrorType.VALIDATION]: 'https://example.com/help/validation',
            [ErrorType.FILE_IO]: 'https://example.com/help/file-io',
            [ErrorType.NETWORK]: 'https://example.com/help/network',
            [ErrorType.PARSING]: 'https://example.com/help/parsing',
            [ErrorType.CONFIGURATION]: 'https://example.com/help/configuration',
            [ErrorType.PERMISSION]: 'https://example.com/help/permission',
            [ErrorType.UNKNOWN]: 'https://example.com/help/general'
        };
        
        const url = helpUrls[errorType];
        if (url) {
            const action = await this.notificationManager.showNotification({
                type: NotificationType.INFO,
                message: '是否要打开帮助文档？',
                actions: ['打开', '取消']
            });
            
            if (action.action === '打开') {
                vscode.env.openExternal(vscode.Uri.parse(url));
            }
        }
    }

    /**
     * 添加到历史记录
     */
    private addToHistory(errorInfo: ErrorInfo): void {
        this.errorHistory.push(errorInfo);
        
        // 限制历史记录大小
        if (this.errorHistory.length > this.maxHistorySize) {
            this.errorHistory.shift();
        }
    }

    /**
     * 获取错误历史
     */
    public getErrorHistory(): ErrorInfo[] {
        return [...this.errorHistory];
    }

    /**
     * 清理错误历史
     */
    public clearErrorHistory(): void {
        this.errorHistory.length = 0;
        this.retryAttempts.clear();
    }

    /**
     * 获取错误统计
     */
    public getErrorStatistics(): {
        total: number;
        byType: Record<ErrorType, number>;
        bySeverity: Record<ErrorSeverity, number>;
        recent: number; // 最近24小时
    } {
        const now = Date.now();
        const oneDayAgo = now - 24 * 60 * 60 * 1000;
        
        const byType: Record<ErrorType, number> = {
            [ErrorType.VALIDATION]: 0,
            [ErrorType.FILE_IO]: 0,
            [ErrorType.NETWORK]: 0,
            [ErrorType.PARSING]: 0,
            [ErrorType.CONFIGURATION]: 0,
            [ErrorType.PERMISSION]: 0,
            [ErrorType.UNKNOWN]: 0
        };
        
        const bySeverity: Record<ErrorSeverity, number> = {
            [ErrorSeverity.LOW]: 0,
            [ErrorSeverity.MEDIUM]: 0,
            [ErrorSeverity.HIGH]: 0,
            [ErrorSeverity.CRITICAL]: 0
        };
        
        let recent = 0;
        
        for (const error of this.errorHistory) {
            byType[error.type]++;
            bySeverity[error.severity]++;
            
            if (error.timestamp > oneDayAgo) {
                recent++;
            }
        }
        
        return {
            total: this.errorHistory.length,
            byType,
            bySeverity,
            recent
        };
    }

    /**
     * 更新设置
     */
    public updateSettings(newSettings: Partial<typeof this.settings>): void {
        this.settings = { ...this.settings, ...newSettings };
    }

    /**
     * 销毁错误处理器
     */
    public dispose(): void {
        this.errorHistory.length = 0;
        this.retryAttempts.clear();
    }
}