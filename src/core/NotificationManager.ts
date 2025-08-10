import * as vscode from 'vscode';
import * as path from 'path';
import { MCPService, DetectedFile } from '../types';

/**
 * 通知类型枚举
 */
export enum NotificationType {
    INFO = 'info',
    WARNING = 'warning',
    ERROR = 'error',
    SUCCESS = 'success'
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
export class NotificationManager {
    private activeNotifications: Map<string, vscode.Disposable> = new Map();
    private notificationHistory: Array<{
        id: string;
        timestamp: number;
        type: NotificationType;
        message: string;
        action?: string;
    }> = [];
    private settings: {
        enableNotifications: boolean;
        enableSounds: boolean;
        autoHideTimeout: number;
        maxHistorySize: number;
    };

    constructor() {
        this.settings = this.loadSettings();
    }

    /**
     * 加载通知设置
     */
    private loadSettings() {
        const config = vscode.workspace.getConfiguration('mcpManager.notifications');
        
        return {
            enableNotifications: config.get('enabled', true),
            enableSounds: config.get('enableSounds', true),
            autoHideTimeout: config.get('autoHideTimeout', 5000),
            maxHistorySize: config.get('maxHistorySize', 100)
        };
    }

    /**
     * 显示通知
     */
    public async showNotification(options: NotificationOptions): Promise<NotificationResult> {
        if (!this.settings.enableNotifications) {
            return { dismissed: true };
        }

        const id = this.generateNotificationId();
        
        try {
            let result: string | undefined;
            
            switch (options.type) {
                case NotificationType.INFO:
                    result = await vscode.window.showInformationMessage(
                        options.message,
                        { modal: options.modal },
                        ...(options.actions || [])
                    );
                    break;
                case NotificationType.WARNING:
                    result = await vscode.window.showWarningMessage(
                        options.message,
                        { modal: options.modal },
                        ...(options.actions || [])
                    );
                    break;
                case NotificationType.ERROR:
                    result = await vscode.window.showErrorMessage(
                        options.message,
                        { modal: options.modal },
                        ...(options.actions || [])
                    );
                    break;
                case NotificationType.SUCCESS:
                    result = await vscode.window.showInformationMessage(
                        `✅ ${options.message}`,
                        { modal: options.modal },
                        ...(options.actions || [])
                    );
                    break;
            }
            
            // 记录通知历史
            this.addToHistory(id, options.type, options.message, result);
            
            return {
                action: result,
                dismissed: !result
            };
            
        } catch (error) {
            console.error('显示通知时出错:', error);
            return { dismissed: true };
        }
    }

    /**
     * 显示进度通知
     */
    public async showProgress<T>(
        title: string,
        task: (progress: vscode.Progress<{ message?: string; increment?: number }>) => Promise<T>
    ): Promise<T> {
        return vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title,
                cancellable: false
            },
            task
        );
    }

    /**
     * 显示可取消的进度通知
     */
    public async showCancellableProgress<T>(
        title: string,
        task: (
            progress: vscode.Progress<{ message?: string; increment?: number }>,
            token: vscode.CancellationToken
        ) => Promise<T>
    ): Promise<T | undefined> {
        try {
            return await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title,
                    cancellable: true
                },
                task
            );
        } catch (error) {
            if (error instanceof vscode.CancellationError) {
                return undefined;
            }
            throw error;
        }
    }

    /**
     * 显示文件检测通知
     */
    public async showFileDetectionNotification(
        files: DetectedFile[]
    ): Promise<'import' | 'view' | 'ignore' | undefined> {
        const message = files.length === 1
            ? `发现MCP配置文件: ${path.basename(files[0].path)}`
            : `发现 ${files.length} 个MCP配置文件`;
        
        const result = await this.showNotification({
            type: NotificationType.INFO,
            message,
            actions: ['导入', '查看详情', '忽略']
        });
        
        switch (result.action) {
            case '导入':
                return 'import';
            case '查看详情':
                return 'view';
            case '忽略':
                return 'ignore';
            default:
                return undefined;
        }
    }

    /**
     * 显示服务冲突通知
     */
    public async showServiceConflictNotification(
        conflictingServices: string[]
    ): Promise<'overwrite' | 'skip' | 'merge' | undefined> {
        const message = `检测到 ${conflictingServices.length} 个服务冲突: ${conflictingServices.join(', ')}`;
        
        const result = await this.showNotification({
            type: NotificationType.WARNING,
            message,
            actions: ['覆盖', '跳过', '合并']
        });
        
        switch (result.action) {
            case '覆盖':
                return 'overwrite';
            case '跳过':
                return 'skip';
            case '合并':
                return 'merge';
            default:
                return undefined;
        }
    }

    /**
     * 显示配置验证错误通知
     */
    public async showValidationErrorNotification(
        errors: string[]
    ): Promise<'fix' | 'ignore' | undefined> {
        const message = `配置验证失败，发现 ${errors.length} 个错误`;
        
        const result = await this.showNotification({
            type: NotificationType.ERROR,
            message,
            actions: ['查看详情', '忽略']
        });
        
        switch (result.action) {
            case '查看详情':
                return 'fix';
            case '忽略':
                return 'ignore';
            default:
                return undefined;
        }
    }

    /**
     * 显示备份恢复通知
     */
    public async showBackupRestoreNotification(
        backupPath: string
    ): Promise<'restore' | 'delete' | 'keep' | undefined> {
        const message = `发现配置备份: ${path.basename(backupPath)}`;
        
        const result = await this.showNotification({
            type: NotificationType.INFO,
            message,
            actions: ['恢复', '删除', '保留']
        });
        
        switch (result.action) {
            case '恢复':
                return 'restore';
            case '删除':
                return 'delete';
            case '保留':
                return 'keep';
            default:
                return undefined;
        }
    }

    /**
     * 显示导入成功通知
     */
    public async showImportSuccessNotification(
        importedCount: number,
        totalCount: number
    ): Promise<void> {
        const message = totalCount === importedCount
            ? `成功导入 ${importedCount} 个服务配置`
            : `导入完成: ${importedCount}/${totalCount} 个服务配置成功`;
        
        await this.showNotification({
            type: NotificationType.SUCCESS,
            message
        });
    }

    /**
     * 显示导出成功通知
     */
    public async showExportSuccessNotification(
        exportPath: string
    ): Promise<'open' | 'copy' | undefined> {
        const message = `配置已导出到: ${path.basename(exportPath)}`;
        
        const result = await this.showNotification({
            type: NotificationType.SUCCESS,
            message,
            actions: ['打开文件', '复制路径']
        });
        
        switch (result.action) {
            case '打开文件':
                return 'open';
            case '复制路径':
                return 'copy';
            default:
                return undefined;
        }
    }

    /**
     * 显示服务状态变化通知
     */
    public async showServiceStatusNotification(
        serviceName: string,
        enabled: boolean
    ): Promise<void> {
        const message = `服务 "${serviceName}" 已${enabled ? '启用' : '禁用'}`;
        
        await this.showNotification({
            type: NotificationType.INFO,
            message
        });
    }

    /**
     * 显示配置文件变化通知
     */
    public async showConfigFileChangeNotification(
        filePath: string
    ): Promise<'reload' | 'ignore' | undefined> {
        const message = `配置文件已被外部修改: ${path.basename(filePath)}`;
        
        const result = await this.showNotification({
            type: NotificationType.WARNING,
            message,
            actions: ['重新加载', '忽略']
        });
        
        switch (result.action) {
            case '重新加载':
                return 'reload';
            case '忽略':
                return 'ignore';
            default:
                return undefined;
        }
    }

    /**
     * 显示快速输入框
     */
    public async showQuickInput(
        placeholder: string,
        value?: string,
        validateInput?: (value: string) => string | undefined
    ): Promise<string | undefined> {
        return vscode.window.showInputBox({
            placeHolder: placeholder,
            value,
            validateInput
        });
    }

    /**
     * 显示快速选择框
     */
    public async showQuickPick<T extends vscode.QuickPickItem>(
        items: T[],
        options?: vscode.QuickPickOptions
    ): Promise<T | undefined> {
        return vscode.window.showQuickPick(items, options);
    }

    /**
     * 显示文件选择对话框
     */
    public async showOpenDialog(
        options: vscode.OpenDialogOptions
    ): Promise<vscode.Uri[] | undefined> {
        return vscode.window.showOpenDialog(options);
    }

    /**
     * 显示保存对话框
     */
    public async showSaveDialog(
        options: vscode.SaveDialogOptions
    ): Promise<vscode.Uri | undefined> {
        return vscode.window.showSaveDialog(options);
    }

    /**
     * 显示确认对话框
     */
    public async showConfirmDialog(
        message: string,
        confirmText: string = '确认',
        cancelText: string = '取消'
    ): Promise<boolean> {
        const result = await this.showNotification({
            type: NotificationType.WARNING,
            message,
            actions: [confirmText, cancelText],
            modal: true
        });
        
        return result.action === confirmText;
    }

    /**
     * 显示状态栏消息
     */
    public showStatusBarMessage(
        message: string,
        timeout?: number
    ): vscode.Disposable {
        return vscode.window.setStatusBarMessage(message, timeout || this.settings.autoHideTimeout);
    }

    /**
     * 生成通知ID
     */
    private generateNotificationId(): string {
        return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 添加到历史记录
     */
    private addToHistory(
        id: string,
        type: NotificationType,
        message: string,
        action?: string
    ): void {
        this.notificationHistory.push({
            id,
            timestamp: Date.now(),
            type,
            message,
            action
        });
        
        // 限制历史记录大小
        if (this.notificationHistory.length > this.settings.maxHistorySize) {
            this.notificationHistory.shift();
        }
    }

    /**
     * 获取通知历史
     */
    public getNotificationHistory(): Array<{
        id: string;
        timestamp: number;
        type: NotificationType;
        message: string;
        action?: string;
    }> {
        return [...this.notificationHistory];
    }

    /**
     * 清理通知历史
     */
    public clearHistory(): void {
        this.notificationHistory.length = 0;
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
        // 清理活动通知
        for (const disposable of this.activeNotifications.values()) {
            disposable.dispose();
        }
        this.activeNotifications.clear();
        
        // 清理历史记录
        this.notificationHistory.length = 0;
    }
}