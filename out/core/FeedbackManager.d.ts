import * as vscode from 'vscode';
import { NotificationManager } from './NotificationManager';
import { ErrorHandler } from './ErrorHandler';
import { ValidationResult } from '../types/index';
/**
 * 反馈类型枚举
 */
export declare enum FeedbackType {
    SUCCESS = "success",
    INFO = "info",
    WARNING = "warning",
    ERROR = "error",
    PROGRESS = "progress",
    CONFIRMATION = "confirmation",
    INPUT = "input"
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
export declare class FeedbackManager {
    private notificationManager;
    private errorHandler;
    private interactionState;
    private feedbackHistory;
    private settings;
    private progressReporters;
    constructor(notificationManager: NotificationManager, errorHandler: ErrorHandler);
    /**
     * 加载反馈设置
     */
    private loadSettings;
    /**
     * 显示成功反馈
     */
    showSuccess(title: string, message: string, actions?: FeedbackAction[]): Promise<string | undefined>;
    /**
     * 显示信息反馈
     */
    showInfo(title: string, message: string, actions?: FeedbackAction[]): Promise<string | undefined>;
    /**
     * 显示警告反馈
     */
    showWarning(title: string, message: string, actions?: FeedbackAction[]): Promise<string | undefined>;
    /**
     * 显示错误反馈
     */
    showError(title: string, message: string, error?: Error, actions?: FeedbackAction[]): Promise<string | undefined>;
    /**
     * 显示确认对话框
     */
    showConfirmation(title: string, message: string, confirmLabel?: string, cancelLabel?: string): Promise<boolean>;
    /**
     * 显示输入对话框
     */
    showInput(title: string, placeholder?: string, defaultValue?: string, validateInput?: (value: string) => string | undefined): Promise<string | undefined>;
    /**
     * 显示进度反馈
     */
    showProgress<T>(title: string, task: (progress: vscode.Progress<{
        message?: string;
        increment?: number;
    }>, token: vscode.CancellationToken) => Promise<T>, cancellable?: boolean): Promise<T>;
    /**
     * 显示配置验证反馈
     */
    showValidationFeedback(result: ValidationResult, filePath?: string): Promise<void>;
    /**
     * 显示服务操作反馈
     */
    showServiceOperationFeedback(operation: string, serviceId: string, success: boolean, message?: string): Promise<void>;
    /**
     * 显示文件操作反馈
     */
    showFileOperationFeedback(operation: string, filePath: string, success: boolean, error?: Error): Promise<void>;
    /**
     * 显示通用反馈
     */
    private showFeedback;
    /**
     * 显示错误详情
     */
    private showErrorDetails;
    /**
     * 报告问题
     */
    private reportIssue;
    /**
     * 显示验证详情
     */
    private showValidationDetails;
    /**
     * 显示建议
     */
    private showSuggestions;
    /**
     * 格式化验证结果
     */
    private formatValidationResult;
    /**
     * 记录交互
     */
    private recordInteraction;
    /**
     * 获取交互状态
     */
    getInteractionState(): InteractionState | null;
    /**
     * 获取反馈历史
     */
    getFeedbackHistory(): FeedbackHistory[];
    /**
     * 清除反馈历史
     */
    clearFeedbackHistory(): void;
    /**
     * 获取使用统计
     */
    getUsageStatistics(): any;
    /**
     * 更新设置
     */
    updateSettings(newSettings: Partial<typeof this.settings>): void;
    /**
     * 获取设置
     */
    getSettings(): typeof this.settings;
    /**
     * 销毁管理器
     */
    dispose(): void;
}
export {};
//# sourceMappingURL=FeedbackManager.d.ts.map