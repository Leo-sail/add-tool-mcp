import { ConfigurationManager } from './ConfigurationManager';
import { FileDetector } from './FileDetector';
/**
 * 文件监控器类
 * 负责监控MCP配置文件的变化，并提供自动检测功能
 */
export declare class FileWatcher {
    private watchers;
    private configManager;
    private fileDetector;
    private autoDetectionEnabled;
    private detectionInterval;
    private lastDetectionTime;
    private readonly DETECTION_COOLDOWN;
    private readonly AUTO_DETECTION_INTERVAL;
    constructor(configManager: ConfigurationManager, fileDetector: FileDetector);
    /**
     * 初始化文件监控器
     */
    private initializeWatchers;
    /**
     * 监控工作区文件变化
     */
    private watchWorkspaceFiles;
    /**
     * 监控特定配置文件
     */
    private watchConfigurationFiles;
    /**
     * 监控特定文件
     */
    private watchSpecificFile;
    /**
     * 处理文件变化事件
     */
    private handleFileChange;
    /**
     * 处理文件创建事件
     */
    private handleFileCreated;
    /**
     * 处理文件修改事件
     */
    private handleFileModified;
    /**
     * 处理文件删除事件
     */
    private handleFileDeleted;
    /**
     * 处理配置文件变化
     */
    private handleConfigFileChange;
    /**
     * 处理配置文件删除
     */
    private handleConfigFileDeleted;
    /**
     * 启动自动检测
     */
    private startAutoDetection;
    /**
     * 执行自动检测
     */
    private performAutoDetection;
    /**
     * 导入检测到的文件
     */
    private importDetectedFile;
    /**
     * 从配置中提取服务
     */
    private extractServicesFromConfig;
    /**
     * 检查是否是潜在的MCP文件
     */
    private isPotentialMCPFile;
    /**
     * 检查是否是已知的配置文件
     */
    private isKnownConfigFile;
    /**
     * 获取已知的配置文件路径
     */
    private getKnownConfigPaths;
    /**
     * 重新加载配置
     */
    private reloadConfiguration;
    /**
     * 设置自动检测状态
     */
    setAutoDetectionEnabled(enabled: boolean): void;
    /**
     * 手动触发检测
     */
    triggerDetection(): Promise<void>;
    /**
     * 添加文件监控
     */
    addFileWatch(filePath: string): void;
    /**
     * 移除文件监控
     */
    removeFileWatch(filePath: string): void;
    /**
     * 获取监控状态
     */
    getWatchStatus(): {
        watchedFiles: string[];
        autoDetectionEnabled: boolean;
        lastDetectionTime: number;
    };
    /**
     * 销毁监控器
     */
    dispose(): void;
}
//# sourceMappingURL=FileWatcher.d.ts.map