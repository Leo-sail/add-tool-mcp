import * as vscode from 'vscode';
import { ConfigurationManager } from '../core/ConfigurationManager';
import { FileDetector } from '../core/FileDetector';
import { MCPConfig } from '../types';

/**
 * 状态栏提供者
 * 在VS Code状态栏显示MCP配置管理器的状态信息
 */
export class StatusBarProvider {
  private _statusBarItem: vscode.StatusBarItem;
  private _configManager: ConfigurationManager;
  private _fileDetector: FileDetector;
  private _disposables: vscode.Disposable[] = [];
  private _isWatching: boolean = false;
  private _lastUpdateTime: Date = new Date();

  constructor(
    configManager: ConfigurationManager,
    fileDetector: FileDetector
  ) {
    this._configManager = configManager;
    this._fileDetector = fileDetector;
    
    // 创建状态栏项目
    this._statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    
    this._statusBarItem.command = 'mcp-config-manager.openPanel';
    this._statusBarItem.tooltip = 'MCP配置管理器';
    
    // 初始化状态
    this.updateStatus();
    
    // 监听配置变化
    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听工作区配置变化
    this._disposables.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('mcp-config-manager')) {
          this.updateStatus();
        }
      })
    );

    // 监听文件变化
    this._disposables.push(
      vscode.workspace.onDidSaveTextDocument((document) => {
        if (this.isMCPConfigFile(document.fileName)) {
          this.updateStatus();
        }
      })
    );

    // 监听工作区文件夹变化
    this._disposables.push(
      vscode.workspace.onDidChangeWorkspaceFolders(() => {
        this.updateStatus();
      })
    );
  }

  /**
   * 检查文件是否为MCP配置文件
   */
  private isMCPConfigFile(filePath: string): boolean {
    const fileName = filePath.toLowerCase();
    return fileName.includes('mcp') && fileName.endsWith('.json');
  }

  /**
   * 更新状态栏显示
   */
  public async updateStatus(): Promise<void> {
    try {
      const config = await this._configManager.getConfig();
      const serviceCount = this.getServiceCount(config);
      const status = await this.getConfigStatus(config);
      
      // 更新状态栏文本
      this._statusBarItem.text = this.formatStatusText(serviceCount, status);
      
      // 更新工具提示
      this._statusBarItem.tooltip = await this.formatTooltip(config, status);
      
      // 更新颜色
      this._statusBarItem.color = this.getStatusColor(status);
      
      // 显示状态栏项目
      this._statusBarItem.show();
      
      this._lastUpdateTime = new Date();
      
    } catch (error) {
      console.error('更新状态栏失败:', error);
      this.showErrorStatus();
    }
  }

  /**
   * 获取服务数量
   */
  private getServiceCount(config: MCPConfig | undefined): number {
    if (!config || !config.mcpServers) {
      return 0;
    }
    return Object.keys(config.mcpServers).length;
  }

  /**
   * 获取配置状态
   */
  private async getConfigStatus(config: MCPConfig | undefined): Promise<ConfigStatus> {
    if (!config) {
      return 'no-config';
    }

    try {
      const validationResult = await this._configManager.validateConfig(config);
      
      if (!validationResult.isValid) {
        return 'invalid';
      }
      
      if (validationResult.warnings && validationResult.warnings.length > 0) {
        return 'warning';
      }
      
      return 'valid';
    } catch {
      return 'error';
    }
  }

  /**
   * 格式化状态栏文本
   */
  private formatStatusText(serviceCount: number, status: ConfigStatus): string {
    const icon = this.getStatusIcon(status);
    
    if (serviceCount === 0) {
      return `${icon} MCP`;
    }
    
    return `${icon} MCP (${serviceCount})`;
  }

  /**
   * 获取状态图标
   */
  private getStatusIcon(status: ConfigStatus): string {
    switch (status) {
      case 'valid':
        return '$(check)';
      case 'warning':
        return '$(warning)';
      case 'invalid':
      case 'error':
        return '$(error)';
      case 'no-config':
        return '$(circle-outline)';
      default:
        return '$(question)';
    }
  }

  /**
   * 获取状态颜色
   */
  private getStatusColor(status: ConfigStatus): string | undefined {
    switch (status) {
      case 'valid':
        return 'statusBarItem.foreground';
      case 'warning':
        return 'statusBarItem.warningForeground';
      case 'invalid':
      case 'error':
        return 'statusBarItem.errorForeground';
      case 'no-config':
        return 'statusBarItem.prominentForeground';
      default:
        return undefined;
    }
  }

  /**
   * 格式化工具提示
   */
  private async formatTooltip(config: MCPConfig | undefined, status: ConfigStatus): Promise<string> {
    const lines: string[] = ['MCP配置管理器'];
    
    // 配置状态
    lines.push('');
    lines.push(`状态: ${this.getStatusDescription(status)}`);
    
    if (config) {
      const serviceCount = this.getServiceCount(config);
      lines.push(`服务数量: ${serviceCount}`);
      
      if (serviceCount > 0) {
        const services = Object.keys(config.mcpServers || {});
        lines.push('');
        lines.push('服务列表:');
        services.slice(0, 5).forEach(serviceId => {
          lines.push(`  • ${serviceId}`);
        });
        
        if (services.length > 5) {
          lines.push(`  ... 还有 ${services.length - 5} 个服务`);
        }
      }
    }
    
    // 配置文件路径
    const configPath = this._configManager.getConfigPath();
    lines.push('');
    lines.push(`配置文件: ${configPath || '未设置'}`);
    
    // 最后更新时间
    lines.push(`最后更新: ${this._lastUpdateTime.toLocaleTimeString()}`);
    
    // 文件监控状态
    if (this._isWatching) {
      lines.push('文件监控: 已启用');
    }
    
    lines.push('');
    lines.push('点击打开配置管理器');
    
    return lines.join('\n');
  }

  /**
   * 获取状态描述
   */
  private getStatusDescription(status: ConfigStatus): string {
    switch (status) {
      case 'valid':
        return '配置有效';
      case 'warning':
        return '配置有警告';
      case 'invalid':
        return '配置无效';
      case 'error':
        return '配置错误';
      case 'no-config':
        return '无配置文件';
      default:
        return '未知状态';
    }
  }

  /**
   * 显示错误状态
   */
  private showErrorStatus(): void {
    this._statusBarItem.text = '$(error) MCP';
    this._statusBarItem.tooltip = 'MCP配置管理器\n状态: 错误\n点击打开配置管理器';
    this._statusBarItem.color = 'statusBarItem.errorForeground';
    this._statusBarItem.show();
  }

  /**
   * 设置文件监控状态
   */
  public setWatchingStatus(isWatching: boolean): void {
    this._isWatching = isWatching;
    this.updateStatus();
  }

  /**
   * 显示临时消息
   */
  public showTemporaryMessage(message: string, duration: number = 3000): void {
    const originalText = this._statusBarItem.text;
    const originalTooltip = this._statusBarItem.tooltip;
    
    this._statusBarItem.text = message;
    this._statusBarItem.tooltip = message;
    
    setTimeout(() => {
      this._statusBarItem.text = originalText;
      this._statusBarItem.tooltip = originalTooltip;
    }, duration);
  }

  /**
   * 显示进度
   */
  public showProgress(message: string): void {
    this._statusBarItem.text = `$(sync~spin) ${message}`;
    this._statusBarItem.tooltip = `MCP配置管理器\n${message}`;
  }

  /**
   * 隐藏状态栏项目
   */
  public hide(): void {
    this._statusBarItem.hide();
  }

  /**
   * 显示状态栏项目
   */
  public show(): void {
    this._statusBarItem.show();
  }

  /**
   * 刷新状态
   */
  public async refresh(): Promise<void> {
    this.showProgress('刷新中...');
    await this.updateStatus();
  }

  /**
   * 获取快速操作菜单
   */
  public async showQuickActions(): Promise<void> {
    const config = await this._configManager.getConfig();
    const serviceCount = this.getServiceCount(config);
    
    const items: vscode.QuickPickItem[] = [
      {
        label: '$(home) 打开配置管理器',
        description: '打开主面板',
        detail: '管理MCP服务和配置'
      },
      {
        label: '$(file-add) 创建配置文件',
        description: '创建新的MCP配置文件',
        detail: '在当前工作区创建配置文件'
      },
      {
        label: '$(search) 检测配置文件',
        description: '自动检测MCP配置文件',
        detail: '扫描工作区中的配置文件'
      }
    ];
    
    if (config) {
      items.push(
        {
          label: '$(check) 验证配置',
          description: '验证当前配置',
          detail: `验证 ${serviceCount} 个服务的配置`
        },
        {
          label: '$(file-text) 打开配置文件',
          description: '在编辑器中打开',
          detail: this._configManager.getConfigPath() || '未设置'
        }
      );
    }
    
    items.push(
      {
        label: '$(clippy) 从剪贴板添加',
        description: '从剪贴板添加服务',
        detail: '解析剪贴板中的配置或服务'
      },
      {
        label: '$(copy) 导出到剪贴板',
        description: '复制配置到剪贴板',
        detail: '将当前配置复制到剪贴板'
      },
      {
        label: '$(refresh) 刷新状态',
        description: '刷新状态栏信息',
        detail: '重新检查配置状态'
      }
    );
    
    const selected = await vscode.window.showQuickPick(items, {
      title: 'MCP配置管理器',
      placeHolder: '选择操作'
    });
    
    if (selected) {
      await this.executeQuickAction(selected.label);
    }
  }

  /**
   * 执行快速操作
   */
  private async executeQuickAction(action: string): Promise<void> {
    switch (true) {
      case action.includes('打开配置管理器'):
        await vscode.commands.executeCommand('mcp-config-manager.openPanel');
        break;
      case action.includes('创建配置文件'):
        await vscode.commands.executeCommand('mcp-config-manager.createConfigFile');
        break;
      case action.includes('检测配置文件'):
        await vscode.commands.executeCommand('mcp-config-manager.detectMCPFiles');
        break;
      case action.includes('验证配置'):
        await vscode.commands.executeCommand('mcp-config-manager.validateConfigFile');
        break;
      case action.includes('打开配置文件'):
        await vscode.commands.executeCommand('mcp-config-manager.openConfigFile');
        break;
      case action.includes('从剪贴板添加'):
        await vscode.commands.executeCommand('mcp-config-manager.addServiceFromClipboard');
        break;
      case action.includes('导出到剪贴板'):
        await vscode.commands.executeCommand('mcp-config-manager.exportToClipboard');
        break;
      case action.includes('刷新状态'):
        await this.refresh();
        break;
    }
  }

  /**
   * 销毁资源
   */
  public dispose(): void {
    this._statusBarItem.dispose();
    this._disposables.forEach(disposable => disposable.dispose());
    this._disposables = [];
  }
}

/**
 * 配置状态类型
 */
type ConfigStatus = 'valid' | 'warning' | 'invalid' | 'error' | 'no-config';

export default StatusBarProvider;