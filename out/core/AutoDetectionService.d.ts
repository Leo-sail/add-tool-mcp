import { FileDetector } from './FileDetector';
import { ConfigurationManager } from './ConfigurationManager';
import { DetectedFile } from '../types/index';
/**
 * 自动检测设置接口
 */
interface AutoDetectionSettings {
    enabled: boolean;
    interval: number;
    minConfidence: number;
    watchPaths: string[];
    excludePatterns: string[];
    notifyOnNewFiles: boolean;
    autoImport: boolean;
    deepScan: boolean;
    maxFileSize: number;
}
/**
 * 自动检测服务类
 * 负责后台自动检测MCP配置文件的变化和新增
 */
export declare class AutoDetectionService {
    private fileDetector;
    private configManager;
    private detectionTimer;
    private isRunning;
    private lastScanTime;
    private detectionHistory;
    private settings;
    private statusBarItem;
    constructor(fileDetector: FileDetector, configManager: ConfigurationManager);
    /**
     * 加载设置
     */
    private loadSettings;
    /**
     * 获取默认监控路径
     */
    private getDefaultWatchPaths;
    /**
     * 初始化状态栏
     */
    private initializeStatusBar;
    /**
     * 更新状态栏
     */
    private updateStatusBar;
    /**
     * 启动自动检测
     */
    start(): void;
    /**
     * 停止自动检测
     */
    stop(): void;
    /**
     * 切换自动检测状态
     */
    toggle(): void;
    /**
     * 安排下次检测
     */
    private scheduleNextDetection;
    /**
     * 执行检测
     */
    private performDetection;
    /**
     * 扫描MCP文件
     */
    private scanForMCPFiles;
    /**
     * 扫描目录
     */
    private scanDirectory;
    /**
     * 获取要扫描的文件列表
     */
    private getFilesToScan;
    /**
     * 检查文件是否被排除
     */
    private isExcluded;
    /**
     * 检查是否是JSON文件
     */
    private isJsonFile;
    /**
     * 过滤新文件
     */
    private filterNewFiles;
    /**
     * 处理新发现的文件
     */
    private handleNewFiles;
    /**
     * 自动导入文件
     */
    private autoImportFiles;
    /**
     * 通知新文件
     */
    private notifyNewFiles;
    /**
     * 导入所有文件
     */
    private importAllFiles;
    /**
     * 导入配置文件
     */
    private importConfigFile;
    /**
     * 提取服务配置
     */
    private extractServices;
    /**
     * 更新检测历史
     */
    private updateDetectionHistory;
    /**
     * 更新设置
     */
    updateSettings(newSettings: Partial<AutoDetectionSettings>): void;
    /**
     * 获取检测统计
     */
    getStatistics(): {
        isRunning: boolean;
        lastScanTime: number;
        detectedFiles: number;
        watchedPaths: string[];
        settings: AutoDetectionSettings;
    };
    /**
     * 手动触发检测
     */
    triggerManualDetection(): Promise<DetectedFile[]>;
    /**
     * 清理检测历史
     */
    clearHistory(): void;
    /**
     * 销毁服务
     */
    dispose(): void;
}
export {};
//# sourceMappingURL=AutoDetectionService.d.ts.map