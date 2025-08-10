import { ConfigurationManager } from '../core/ConfigurationManager';
import { FileDetector } from '../core/FileDetector';
/**
 * 状态栏提供者
 * 在VS Code状态栏显示MCP配置管理器的状态信息
 */
export declare class StatusBarProvider {
    private _statusBarItem;
    private _configManager;
    private _fileDetector;
    private _disposables;
    private _isWatching;
    private _lastUpdateTime;
    constructor(configManager: ConfigurationManager, fileDetector: FileDetector);
    /**
     * 设置事件监听器
     */
    private setupEventListeners;
    /**
     * 检查文件是否为MCP配置文件
     */
    private isMCPConfigFile;
    /**
     * 更新状态栏显示
     */
    updateStatus(): Promise<void>;
    /**
     * 获取服务数量
     */
    private getServiceCount;
    /**
     * 获取配置状态
     */
    private getConfigStatus;
    /**
     * 格式化状态栏文本
     */
    private formatStatusText;
    /**
     * 获取状态图标
     */
    private getStatusIcon;
    /**
     * 获取状态颜色
     */
    private getStatusColor;
    /**
     * 格式化工具提示
     */
    private formatTooltip;
    /**
     * 获取状态描述
     */
    private getStatusDescription;
    /**
     * 显示错误状态
     */
    private showErrorStatus;
    /**
     * 设置文件监控状态
     */
    setWatchingStatus(isWatching: boolean): void;
    /**
     * 显示临时消息
     */
    showTemporaryMessage(message: string, duration?: number): void;
    /**
     * 显示进度
     */
    showProgress(message: string): void;
    /**
     * 隐藏状态栏项目
     */
    hide(): void;
    /**
     * 显示状态栏项目
     */
    show(): void;
    /**
     * 刷新状态
     */
    refresh(): Promise<void>;
    /**
     * 获取快速操作菜单
     */
    showQuickActions(): Promise<void>;
    /**
     * 执行快速操作
     */
    private executeQuickAction;
    /**
     * 销毁资源
     */
    dispose(): void;
}
export default StatusBarProvider;
//# sourceMappingURL=StatusBarProvider.d.ts.map