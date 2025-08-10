import * as vscode from 'vscode';
import { ConfigurationManager } from './ConfigurationManager';
import { FileDetector } from './FileDetector';
/**
 * MCP管理器WebView提供者
 * 负责管理WebView的生命周期和与前端的通信
 */
export declare class MCPManagerProvider implements vscode.WebviewViewProvider {
    static readonly viewType = "mcp-config-manager.mcpManagerView";
    private _view?;
    private _context;
    private _configManager;
    private _fileDetector;
    private _jsonParser;
    private _configMerger;
    private _disposables;
    constructor(context: vscode.ExtensionContext, configManager: ConfigurationManager, fileDetector: FileDetector);
    /**
     * 解析WebView视图
     */
    resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken): void;
    /**
     * 显示WebView
     */
    show(): Promise<void>;
    /**
     * 刷新WebView数据
     */
    refresh(): Promise<void>;
    /**
     * 向WebView发送消息
     */
    postMessage(message: any): Promise<boolean>;
    /**
     * 处理来自WebView的消息
     */
    private _handleMessage;
    /**
     * 处理获取服务列表请求
     */
    private _handleGetServices;
    /**
     * 处理添加服务请求
     */
    private _handleAddService;
    /**
     * 处理更新服务请求
     */
    private _handleUpdateService;
    /**
     * 处理删除服务请求
     */
    private _handleDeleteService;
    /**
     * 处理获取配置请求
     */
    private _handleGetConfig;
    /**
     * 处理更新配置请求
     */
    private _handleUpdateConfig;
    /**
     * 处理合并配置请求
     */
    private _handleMergeConfigs;
    /**
     * 处理文件检测请求
     */
    private _handleDetectFiles;
    /**
     * 处理配置验证请求
     */
    private _handleValidateConfig;
    /**
     * 处理从剪贴板导入请求
     */
    private _handleImportFromClipboard;
    /**
     * 处理导出配置请求
     */
    private _handleExportConfig;
    /**
     * 刷新WebView数据
     */
    private _refreshData;
    /**
     * 生成WebView的HTML内容
     */
    private _getHtmlForWebview;
    /**
     * 生成随机nonce
     */
    private _getNonce;
    /**
     * 销毁资源
     */
    dispose(): void;
}
/**
 * MCPManagerProvider - MCP管理器WebView提供者
 *
 * @author Leo-拥抱AI
 * @version 1.0.0
 * @description 提供MCP配置管理的WebView界面
 * @license MIT
 *
 * © 2024 Leo-拥抱AI. All rights reserved.
 *
 * 专注于AI工具开发，让开发更高效
 */
export default MCPManagerProvider;
//# sourceMappingURL=MCPManagerProvider.d.ts.map