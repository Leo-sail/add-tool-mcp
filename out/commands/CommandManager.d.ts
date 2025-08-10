import * as vscode from 'vscode';
import { MCPManagerProvider } from '../core/MCPManagerProvider';
import { ConfigurationManager } from '../core/ConfigurationManager';
import { FileDetector } from '../core/FileDetector';
/**
 * 命令管理器
 * 负责注册和管理所有VS Code命令
 */
export declare class CommandManager {
    private context;
    private mcpProvider;
    private configManager;
    private fileDetector;
    private jsonParser;
    private configMerger;
    private disposables;
    constructor(context: vscode.ExtensionContext, mcpProvider: MCPManagerProvider, configManager: ConfigurationManager, fileDetector: FileDetector);
    /**
     * 注册所有命令
     */
    registerCommands(): void;
    /**
     * 注册单个命令
     */
    private registerCommand;
    /**
     * 打开主面板
     */
    private openPanel;
    /**
     * 添加服务
     */
    private addService;
    /**
     * 编辑服务
     */
    private editService;
    /**
     * 删除服务
     */
    private deleteService;
    /**
     * 切换服务状态
     */
    private toggleService;
    /**
     * 合并配置
     */
    private mergeConfigs;
    /**
     * 选择要合并的文件
     */
    private selectFilesToMerge;
    /**
     * 验证配置
     */
    private validateConfig;
    /**
     * 备份配置
     */
    private backupConfig;
    /**
     * 恢复配置
     */
    private restoreConfig;
    /**
     * 检测文件
     */
    private detectFiles;
    /**
     * 刷新检测
     */
    private refreshDetection;
    /**
     * 从剪贴板导入
     */
    private importFromClipboard;
    /**
     * 导出配置
     */
    private exportConfig;
    /**
     * 导入配置
     */
    private importConfig;
    /**
     * 打开设置
     */
    private openSettings;
    /**
     * 重置设置
     */
    private resetSettings;
    /**
     * 从文件添加服务
     */
    private addServiceFromFile;
    /**
     * 打开配置文件
     */
    private openConfigFile;
    /**
     * 销毁资源
     */
    dispose(): void;
}
/**
 * CommandManager - MCP服务命令管理器
 *
 * @author Leo-拥抱AI
 * @version 1.0.0
 * @description 处理所有MCP相关的VS Code命令
 * @license MIT
 *
 * © 2024 Leo-拥抱AI. All rights reserved.
 *
 * 专注于AI工具开发，让开发更高效
 */
export default CommandManager;
//# sourceMappingURL=CommandManager.d.ts.map