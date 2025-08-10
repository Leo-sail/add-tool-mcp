import * as vscode from 'vscode';
import * as path from 'path';
import { ConfigurationManager } from './ConfigurationManager';
import { FileDetector } from './FileDetector';
import { JsonParser } from './JsonParser';
import { ConfigMerger } from './ConfigMerger';
import {
  WebViewMessage,
  WebViewResponse,
  MCPConfig,
  MCPServiceConfig,
  DetectedFile,
  ValidationResult,
  MergeResult,
  GetServicesRequest,
  AddServiceRequest,
  UpdateServiceRequest,
  DeleteServiceRequest,
  GetConfigRequest,
  UpdateConfigRequest,
  MergeConfigsRequest,
  DetectFilesRequest,
  ValidateConfigRequest,
  ImportFromClipboardRequest,
  ExportConfigRequest
} from '../types';

/**
 * MCP管理器WebView提供者
 * 负责管理WebView的生命周期和与前端的通信
 */
export class MCPManagerProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'mcp-config-manager.mcpManagerView';
  
  private _view?: vscode.WebviewView;
  private _context: vscode.ExtensionContext;
  private _configManager: ConfigurationManager;
  private _fileDetector: FileDetector;
  private _jsonParser: JsonParser;
  private _configMerger: ConfigMerger;
  private _disposables: vscode.Disposable[] = [];

  constructor(
    context: vscode.ExtensionContext,
    configManager: ConfigurationManager,
    fileDetector: FileDetector
  ) {
    this._context = context;
    this._configManager = configManager;
    this._fileDetector = fileDetector;
    this._jsonParser = new JsonParser();
    this._configMerger = new ConfigMerger(configManager);
  }

  /**
   * 解析WebView视图
   */
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    // 配置WebView选项
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        this._context.extensionUri
      ]
    };

    // 设置HTML内容
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // 监听来自WebView的消息
    this._disposables.push(
      webviewView.webview.onDidReceiveMessage(async (message: WebViewMessage) => {
        await this._handleMessage(message);
      })
    );

    // 监听WebView可见性变化
    this._disposables.push(
      webviewView.onDidChangeVisibility(() => {
        if (webviewView.visible) {
          this._refreshData();
        }
      })
    );

    // 初始化数据
    this._refreshData();
  }

  /**
   * 显示WebView
   */
  public async show(): Promise<void> {
    if (this._view) {
      this._view.show?.(true);
      await this._refreshData();
    } else {
      // 如果WebView还没有创建，注册视图提供者
      await vscode.commands.executeCommand('mcp-config-manager.mcpManagerView.focus');
    }
  }

  /**
   * 刷新WebView数据
   */
  public async refresh(): Promise<void> {
    await this._refreshData();
  }

  /**
   * 向WebView发送消息
   */
  public async postMessage(message: any): Promise<boolean> {
    if (this._view) {
      return this._view.webview.postMessage(message);
    }
    return false;
  }

  /**
   * 处理来自WebView的消息
   */
  private async _handleMessage(message: WebViewMessage): Promise<void> {
    try {
      let response: WebViewResponse;

      switch (message.type) {
        case 'getServices':
          response = await this._handleGetServices(message as GetServicesRequest);
          break;
        
        case 'addService':
        response = await this._handleAddService(message.payload);
        break;
      
      case 'editService':
        response = await this._handleUpdateService(message.payload);
        break;
      
      case 'deleteService':
        response = await this._handleDeleteService(message.payload);
        break;
        
        case 'updateConfig':
        response = await this._handleUpdateConfig(message.payload);
        break;
        
        case 'mergeConfigs':
        response = await this._handleMergeConfigs(message.payload);
        break;
      
      case 'detectFiles':
        response = await this._handleDetectFiles(message.payload);
        break;
      
      case 'validateConfig':
        response = await this._handleValidateConfig(message.payload);
        break;
      
      case 'importSettings':
        response = await this._handleImportFromClipboard(message.payload);
        break;
      
      case 'exportConfig':
        response = await this._handleExportConfig(message.payload);
        break;
        
        default:
          response = {
            id: message.id,
            type: 'error',
            success: false,
            data: { error: `未知的消息类型: ${message.type}` }
          };
      }

      // 发送响应
      await this.postMessage(response);
    } catch (error) {
      console.error('处理WebView消息失败:', error);
      
      const errorResponse: WebViewResponse = {
        id: message.id,
        type: 'error',
        success: false,
        data: { error: error instanceof Error ? error.message : String(error) }
      };
      
      await this.postMessage(errorResponse);
    }
  }

  /**
   * 处理获取服务列表请求
   */
  private async _handleGetServices(message: GetServicesRequest): Promise<WebViewResponse> {
    const config = await this._configManager.getConfig();
    const services = config?.mcpServers || {};
    
    return {
      id: message.id,
      type: 'servicesLoaded',
      success: true,
      data: services
    };
  }

  /**
   * 处理添加服务请求
   */
  private async _handleAddService(message: AddServiceRequest): Promise<WebViewResponse> {
    await this._configManager.addService(message.filePath, message.serviceName, message.serviceConfig);
    
    return {
      id: message.id,
      type: 'serviceAdded',
      success: true,
      data: { serviceName: message.serviceName }
    };
  }

  /**
   * 处理更新服务请求
   */
  private async _handleUpdateService(message: UpdateServiceRequest): Promise<WebViewResponse> {
    await this._configManager.updateService(message.filePath, message.serviceName, message.serviceConfig);
    
    return {
      id: message.id,
      type: 'serviceUpdated',
      success: true,
      data: { serviceName: message.serviceName }
    };
  }

  /**
   * 处理删除服务请求
   */
  private async _handleDeleteService(message: DeleteServiceRequest): Promise<WebViewResponse> {
    await this._configManager.removeService(message.filePath || '', message.serviceName);
    
    return {
      id: message.id,
      type: 'serviceDeleted',
      success: true,
      data: { serviceName: message.serviceName }
    };
  }

  /**
   * 处理获取配置请求
   */
  private async _handleGetConfig(message: GetConfigRequest): Promise<WebViewResponse> {
    const config = await this._configManager.getConfig();
    const configPath = this._configManager.getConfigPath();
    
    return {
      id: message.id,
      type: 'configLoaded',
      success: true,
      data: { config, configPath }
    };
  }

  /**
   * 处理更新配置请求
   */
  private async _handleUpdateConfig(message: UpdateConfigRequest): Promise<WebViewResponse> {
    await this._configManager.updateConfig(message.config, message.filePath);
    
    return {
      id: message.id,
      type: 'configUpdated',
      success: true,
      data: { message: '配置已更新' }
    };
  }

  /**
   * 处理合并配置请求
   */
  private async _handleMergeConfigs(message: MergeConfigsRequest): Promise<WebViewResponse> {
    // 读取源配置和目标配置
    const sourceConfig = await this._configManager.readConfig(message.sourcePaths[0]);
    const targetConfig = await this._configManager.readConfig(message.targetPath);
    
    const result = await this._configMerger.mergeConfigs(sourceConfig, targetConfig, {
      strategy: 'merge' as any,
      preserveMetadata: true,
      createBackup: true,
      validateResult: true
    });
    
    return {
      id: message.id,
      type: 'configsMerged',
      success: true,
      data: result
    };
  }

  /**
   * 处理文件检测请求
   */
  private async _handleDetectFiles(message: DetectFilesRequest): Promise<WebViewResponse> {
    const result = await this._fileDetector.detectFiles({
      searchPaths: [message.workspacePath],
      excludePatterns: [],
      maxDepth: 5,
      includeHidden: false,
      followSymlinks: false,
      maxFileSize: 1024 * 1024 // 1MB
    });
    
    return {
      id: message.id,
      type: 'filesDetected',
      success: true,
      data: result
    };
  }

  /**
   * 处理配置验证请求
   */
  private async _handleValidateConfig(message: ValidateConfigRequest): Promise<WebViewResponse> {
    const config = message.config || await this._configManager.getConfig();
    
    if (!config) {
      throw new Error('没有可验证的配置');
    }
    
    const result = await this._configManager.validateConfig(config);
    
    return {
      id: message.id,
      type: 'configValidated',
      success: true,
      data: result
    };
  }

  /**
   * 处理从剪贴板导入请求
   */
  private async _handleImportFromClipboard(message: ImportFromClipboardRequest): Promise<WebViewResponse> {
    const content = message.content || await vscode.env.clipboard.readText();
    
    if (!content.trim()) {
      throw new Error('内容为空');
    }
    
    const parseResult = this._jsonParser.parseClipboard(content);
    
    return {
      id: message.id,
      type: 'settingsImported',
      success: true,
      data: parseResult
    };
  }

  /**
   * 处理导出配置请求
   */
  private async _handleExportConfig(message: ExportConfigRequest): Promise<WebViewResponse> {
    const config = message.config || await this._configManager.getConfig();
    
    if (!config) {
      throw new Error('没有可导出的配置');
    }
    
    const configJson = JSON.stringify(config, null, 2);
    await vscode.env.clipboard.writeText(configJson);
    
    return {
      id: message.id,
      type: 'configExported',
      success: true
    };
  }

  /**
   * 刷新WebView数据
   */
  private async _refreshData(): Promise<void> {
    if (!this._view) {
      return;
    }

    try {
      // 获取当前配置
      const config = await this._configManager.getConfig();
      const configPath = this._configManager.getConfigPath();
      
      // 获取检测到的文件
      const detectedFiles = await this._fileDetector.detectFiles();
      
      // 获取扩展设置
      const extensionConfig = vscode.workspace.getConfiguration('mcp-config-manager');
      const settings = {
        autoDetect: extensionConfig.get<boolean>('autoDetect', true),
        fileWatcher: extensionConfig.get<boolean>('fileWatcher', true),
        autoBackup: extensionConfig.get<boolean>('autoBackup', true),
        backupRetentionDays: extensionConfig.get<number>('backupRetentionDays', 7),
        defaultMergeStrategy: extensionConfig.get<string>('defaultMergeStrategy', 'prompt'),
        detectionPaths: extensionConfig.get<string[]>('detectionPaths', []),
        excludePatterns: extensionConfig.get<string[]>('excludePatterns', []),
        validationLevel: extensionConfig.get<string>('validationLevel', 'normal'),
        showNotifications: extensionConfig.get<boolean>('showNotifications', true),
        debugMode: extensionConfig.get<boolean>('debugMode', false),
        theme: extensionConfig.get<string>('theme', 'auto'),
        language: extensionConfig.get<string>('language', 'zh-CN')
      };
      
      // 发送初始化数据
      await this.postMessage({
        type: 'initialize',
        data: {
          config,
          configPath,
          detectedFiles,
          settings
        }
      });
    } catch (error) {
      console.error('刷新WebView数据失败:', error);
    }
  }

  /**
   * 生成WebView的HTML内容
   */
  private _getHtmlForWebview(webview: vscode.Webview): string {
    // 获取资源URI
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._context.extensionUri, 'out', 'webview.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._context.extensionUri, 'out', 'webview.css')
    );

    // 生成nonce用于CSP
    const nonce = this._getNonce();

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <link href="${styleUri}" rel="stylesheet">
    <title>MCP配置管理器</title>
</head>
<body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  /**
   * 生成随机nonce
   */
  private _getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  /**
   * 销毁资源
   */
  public dispose(): void {
    this._disposables.forEach(disposable => disposable.dispose());
    this._disposables = [];
  }
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