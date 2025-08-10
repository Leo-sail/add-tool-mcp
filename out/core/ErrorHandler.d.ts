import { NotificationManager } from './NotificationManager';
/**
 * 错误类型枚举
 */
export declare enum ErrorType {
    VALIDATION = "validation",
    FILE_IO = "file_io",
    NETWORK = "network",
    PARSING = "parsing",
    CONFIGURATION = "configuration",
    PERMISSION = "permission",
    UNKNOWN = "unknown"
}
/**
 * 错误严重程度枚举
 */
export declare enum ErrorSeverity {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
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
export declare class ErrorHandler {
    private notificationManager;
    private errorHistory;
    private readonly maxHistorySize;
    private retryAttempts;
    private settings;
    constructor(notificationManager: NotificationManager);
    /**
     * 加载错误处理设置
     */
    private loadSettings;
    /**
     * 处理错误
     */
    handleError(error: Error | string, type?: ErrorType, severity?: ErrorSeverity, options?: ErrorHandlingOptions): Promise<void>;
    /**
     * 创建错误信息对象
     */
    private createErrorInfo;
    /**
     * 提取错误代码
     */
    private extractErrorCode;
    /**
     * 提取错误源
     */
    private extractErrorSource;
    /**
     * 记录到控制台
     */
    private logToConsole;
    /**
     * 显示错误通知
     */
    private showErrorNotification;
    /**
     * 获取通知类型
     */
    private getNotificationType;
    /**
     * 格式化错误消息
     */
    private formatErrorMessage;
    /**
     * 获取错误类型显示名称
     */
    private getErrorTypeDisplayName;
    /**
     * 获取建议的操作
     */
    private getSuggestedActions;
    /**
     * 处理错误操作
     */
    private handleErrorAction;
    /**
     * 处理重试
     */
    private handleRetry;
    /**
     * 显示错误详情
     */
    private showErrorDetails;
    /**
     * 显示权限帮助
     */
    private showPermissionHelp;
    /**
     * 显示重置配置对话框
     */
    private showResetConfigDialog;
    /**
     * 显示帮助信息
     */
    private showHelp;
    /**
     * 添加到历史记录
     */
    private addToHistory;
    /**
     * 获取错误历史
     */
    getErrorHistory(): ErrorInfo[];
    /**
     * 清理错误历史
     */
    clearErrorHistory(): void;
    /**
     * 获取错误统计
     */
    getErrorStatistics(): {
        total: number;
        byType: Record<ErrorType, number>;
        bySeverity: Record<ErrorSeverity, number>;
        recent: number;
    };
    /**
     * 更新设置
     */
    updateSettings(newSettings: Partial<typeof this.settings>): void;
    /**
     * 销毁错误处理器
     */
    dispose(): void;
}
export {};
//# sourceMappingURL=ErrorHandler.d.ts.map