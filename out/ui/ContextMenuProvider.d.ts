import * as vscode from 'vscode';
import { ConfigurationManager } from '../core/ConfigurationManager';
import { FileDetector } from '../core/FileDetector';
/**
 * 右键菜单提供者
 * 为文件资源管理器提供MCP配置相关的右键菜单选项
 */
export declare class ContextMenuProvider {
    private _context;
    private _configManager;
    private _fileDetector;
    private _jsonParser;
    private _disposables;
    constructor(context: vscode.ExtensionContext, configManager: ConfigurationManager, fileDetector: FileDetector);
    /**
     * 注册右键菜单命令
     */
    register(): void;
    /**
     * 从文件添加服务
     */
    addServiceFromFile(uri?: vscode.Uri): Promise<void>;
    /**
     * 打开配置文件
     */
    openConfigFile(uri?: vscode.Uri): Promise<void>;
    /**
     * 验证配置文件
     */
    validateConfigFile(uri?: vscode.Uri): Promise<void>;
    /**
     * 导入配置文件
     */
    importConfigFile(uri?: vscode.Uri): Promise<void>;
    /**
     * 创建配置文件
     */
    createConfigFile(uri?: vscode.Uri): Promise<void>;
    /**
     * 检测MCP文件
     */
    detectMCPFiles(uri?: vscode.Uri): Promise<void>;
    /**
     * 从剪贴板添加服务
     */
    addServiceFromClipboard(): Promise<void>;
    /**
     * 导出配置到剪贴板
     */
    exportToClipboard(): Promise<void>;
    /**
     * 显示验证详情
     */
    private showValidationDetails;
    /**
     * 显示检测结果
     */
    private showDetectionResults;
    /**
     * 销毁资源
     */
    dispose(): void;
}
export default ContextMenuProvider;
//# sourceMappingURL=ContextMenuProvider.d.ts.map