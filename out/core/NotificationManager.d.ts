import * as vscode from 'vscode';
import { DetectedFile } from '../types';
/**
 * 通知类型枚举
 */
export declare enum NotificationType {
    INFO = "info",
    WARNING = "warning",
    ERROR = "error",
    SUCCESS = "success"
}
/**
 * 通知选项接口
 */
interface NotificationOptions {
    type: NotificationType;
    message: string;
    actions?: string[];
    modal?: boolean;
    timeout?: number;
    persistent?: boolean;
}
/**
 * 通知结果接口
 */
interface NotificationResult {
    action?: string;
    dismissed: boolean;
}
/**
 * 通知管理器类
 * 负责管理所有用户通知和交互
 */
export declare class NotificationManager {
    private activeNotifications;
    private notificationHistory;
    private settings;
    constructor();
    /**
     * 加载通知设置
     */
    private loadSettings;
    /**
     * 显示通知
     */
    showNotification(options: NotificationOptions): Promise<NotificationResult>;
    /**
     * 显示进度通知
     */
    showProgress<T>(title: string, task: (progress: vscode.Progress<{
        message?: string;
        increment?: number;
    }>) => Promise<T>): Promise<T>;
    /**
     * 显示可取消的进度通知
     */
    showCancellableProgress<T>(title: string, task: (progress: vscode.Progress<{
        message?: string;
        increment?: number;
    }>, token: vscode.CancellationToken) => Promise<T>): Promise<T | undefined>;
    /**
     * 显示文件检测通知
     */
    showFileDetectionNotification(files: DetectedFile[]): Promise<'import' | 'view' | 'ignore' | undefined>;
    /**
     * 显示服务冲突通知
     */
    showServiceConflictNotification(conflictingServices: string[]): Promise<'overwrite' | 'skip' | 'merge' | undefined>;
    /**
     * 显示配置验证错误通知
     */
    showValidationErrorNotification(errors: string[]): Promise<'fix' | 'ignore' | undefined>;
    /**
     * 显示备份恢复通知
     */
    showBackupRestoreNotification(backupPath: string): Promise<'restore' | 'delete' | 'keep' | undefined>;
    /**
     * 显示导入成功通知
     */
    showImportSuccessNotification(importedCount: number, totalCount: number): Promise<void>;
    /**
     * 显示导出成功通知
     */
    showExportSuccessNotification(exportPath: string): Promise<'open' | 'copy' | undefined>;
    /**
     * 显示服务状态变化通知
     */
    showServiceStatusNotification(serviceName: string, enabled: boolean): Promise<void>;
    /**
     * 显示配置文件变化通知
     */
    showConfigFileChangeNotification(filePath: string): Promise<'reload' | 'ignore' | undefined>;
    /**
     * 显示快速输入框
     */
    showQuickInput(placeholder: string, value?: string, validateInput?: (value: string) => string | undefined): Promise<string | undefined>;
    /**
     * 显示快速选择框
     */
    showQuickPick<T extends vscode.QuickPickItem>(items: T[], options?: vscode.QuickPickOptions): Promise<T | undefined>;
    /**
     * 显示文件选择对话框
     */
    showOpenDialog(options: vscode.OpenDialogOptions): Promise<vscode.Uri[] | undefined>;
    /**
     * 显示保存对话框
     */
    showSaveDialog(options: vscode.SaveDialogOptions): Promise<vscode.Uri | undefined>;
    /**
     * 显示确认对话框
     */
    showConfirmDialog(message: string, confirmText?: string, cancelText?: string): Promise<boolean>;
    /**
     * 显示状态栏消息
     */
    showStatusBarMessage(message: string, timeout?: number): vscode.Disposable;
    /**
     * 生成通知ID
     */
    private generateNotificationId;
    /**
     * 添加到历史记录
     */
    private addToHistory;
    /**
     * 获取通知历史
     */
    getNotificationHistory(): Array<{
        id: string;
        timestamp: number;
        type: NotificationType;
        message: string;
        action?: string;
    }>;
    /**
     * 清理通知历史
     */
    clearHistory(): void;
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
//# sourceMappingURL=NotificationManager.d.ts.map