import * as vscode from 'vscode';
import { MCPManagerProvider } from '../core/MCPManagerProvider';
import { ConfigurationManager } from '../core/ConfigurationManager';
import { FileDetector } from '../core/FileDetector';
import { JsonParser } from '../core/JsonParser';
import { ConfigMerger } from '../core/ConfigMerger';
import { MCPConfig, MCPServiceConfig, DetectedFile, MergeConfigsRequest } from '../types';

/**
 * 命令管理器
 * 负责注册和管理所有VS Code命令
 */
export class CommandManager {
  private context: vscode.ExtensionContext;
  private mcpProvider: MCPManagerProvider;
  private configManager: ConfigurationManager;
  private fileDetector: FileDetector;
  private jsonParser: JsonParser;
  private configMerger: ConfigMerger;
  private disposables: vscode.Disposable[] = [];

  constructor(
    context: vscode.ExtensionContext,
    mcpProvider: MCPManagerProvider,
    configManager: ConfigurationManager,
    fileDetector: FileDetector
  ) {
    this.context = context;
    this.mcpProvider = mcpProvider;
    this.configManager = configManager;
    this.fileDetector = fileDetector;
    this.jsonParser = new JsonParser();
    this.configMerger = new ConfigMerger(configManager);
  }

  /**
   * 注册所有命令
   */
  public registerCommands(): void {
    // 主面板命令
    this.registerCommand('mcp-config-manager.openPanel', () => this.openPanel());
    
    // 服务管理命令
    this.registerCommand('mcp-config-manager.addService', () => this.addService());
    this.registerCommand('mcp-config-manager.editService', (serviceId: string) => this.editService(serviceId));
    this.registerCommand('mcp-config-manager.deleteService', (serviceId: string) => this.deleteService(serviceId));
    this.registerCommand('mcp-config-manager.toggleService', (serviceId: string) => this.toggleService(serviceId));
    
    // 配置管理命令
    this.registerCommand('mcp-config-manager.mergeConfigs', () => this.mergeConfigs());
    this.registerCommand('mcp-config-manager.validateConfig', () => this.validateConfig());
    this.registerCommand('mcp-config-manager.backupConfig', () => this.backupConfig());
    this.registerCommand('mcp-config-manager.restoreConfig', () => this.restoreConfig());
    
    // 文件检测命令
    this.registerCommand('mcp-config-manager.detectFiles', () => this.detectFiles());
    this.registerCommand('mcp-config-manager.refreshDetection', () => this.refreshDetection());
    
    // 导入导出命令
    this.registerCommand('mcp-config-manager.importFromClipboard', () => this.importFromClipboard());
    this.registerCommand('mcp-config-manager.exportConfig', () => this.exportConfig());
    this.registerCommand('mcp-config-manager.importConfig', () => this.importConfig());
    
    // 设置命令
    this.registerCommand('mcp-config-manager.openSettings', () => this.openSettings());
    this.registerCommand('mcp-config-manager.resetSettings', () => this.resetSettings());
    
    // 右键菜单命令
    this.registerCommand('mcp-config-manager.addServiceFromFile', (uri: vscode.Uri) => this.addServiceFromFile(uri));
    this.registerCommand('mcp-config-manager.openConfigFile', (uri: vscode.Uri) => this.openConfigFile(uri));
    
    console.log('MCP配置管理器命令已注册');
  }

  /**
   * 注册单个命令
   */
  private registerCommand(command: string, callback: (...args: any[]) => any): void {
    const disposable = vscode.commands.registerCommand(command, callback);
    this.disposables.push(disposable);
    this.context.subscriptions.push(disposable);
  }

  /**
   * 打开主面板
   */
  private async openPanel(): Promise<void> {
    try {
      await this.mcpProvider.show();
    } catch (error) {
      vscode.window.showErrorMessage(`打开面板失败: ${error}`);
    }
  }

  /**
   * 添加服务
   */
  private async addService(): Promise<void> {
    try {
      const serviceId = await vscode.window.showInputBox({
        prompt: '请输入服务ID',
        placeHolder: '例如: my-service',
        validateInput: (value) => {
          if (!value || !value.trim()) {
            return '服务ID不能为空';
          }
          if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
            return '服务ID只能包含字母、数字、下划线和连字符';
          }
          return null;
        }
      });

      if (!serviceId) {
        return;
      }

      const command = await vscode.window.showInputBox({
        prompt: '请输入命令',
        placeHolder: '例如: node, python, ./script.sh',
        validateInput: (value) => {
          if (!value || !value.trim()) {
            return '命令不能为空';
          }
          return null;
        }
      });

      if (!command) {
        return;
      }

      const argsInput = await vscode.window.showInputBox({
        prompt: '请输入参数（用空格分隔，可选）',
        placeHolder: '例如: --port 3000 --verbose'
      });

      const args = argsInput ? argsInput.split(' ').filter(arg => arg.trim()) : [];

      const serviceConfig: MCPServiceConfig = {
        command: command.trim(),
        args,
        env: {},
        disabled: false
      };

      const configPath = this.configManager.getConfigPath() || 'mcp.json';
      await this.configManager.addService(configPath, serviceId.trim(), serviceConfig);
      await this.mcpProvider.refresh();
      
      vscode.window.showInformationMessage(`服务 "${serviceId}" 添加成功`);
    } catch (error) {
      vscode.window.showErrorMessage(`添加服务失败: ${error}`);
    }
  }

  /**
   * 编辑服务
   */
  private async editService(serviceId: string): Promise<void> {
    try {
      await this.mcpProvider.show();
      // 通知WebView切换到服务编辑模式
      await this.mcpProvider.postMessage({
        type: 'editService',
        serviceId
      });
    } catch (error) {
      vscode.window.showErrorMessage(`编辑服务失败: ${error}`);
    }
  }

  /**
   * 删除服务
   */
  private async deleteService(serviceId: string): Promise<void> {
    try {
      const confirm = await vscode.window.showWarningMessage(
        `确定要删除服务 "${serviceId}" 吗？`,
        { modal: true },
        '删除'
      );

      if (confirm === '删除') {
        const configPath = this.configManager.getConfigPath() || 'mcp.json';
        await this.configManager.removeService(configPath, serviceId);
        await this.mcpProvider.refresh();
        vscode.window.showInformationMessage(`服务 "${serviceId}" 删除成功`);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`删除服务失败: ${error}`);
    }
  }

  /**
   * 切换服务状态
   */
  private async toggleService(serviceId: string): Promise<void> {
    try {
      const configPath = this.configManager.getConfigPath() || 'mcp.json';
      const config = await this.configManager.readConfig(configPath);
      if (!config || !config.mcpServers[serviceId]) {
        throw new Error(`服务 "${serviceId}" 不存在`);
      }

      const service = config.mcpServers[serviceId];
      const newService = { ...service, disabled: !service.disabled };
      
      await this.configManager.updateService(configPath, serviceId, newService);
      await this.mcpProvider.refresh();
      
      const status = newService.disabled ? '禁用' : '启用';
      vscode.window.showInformationMessage(`服务 "${serviceId}" 已${status}`);
    } catch (error) {
      vscode.window.showErrorMessage(`切换服务状态失败: ${error}`);
    }
  }

  /**
   * 合并配置
   */
  private async mergeConfigs(): Promise<void> {
    try {
      const detectionResult = await this.fileDetector.detectFiles();
      const detectedFiles = detectionResult.files || [];
      
      if (detectedFiles.length === 0) {
        vscode.window.showInformationMessage('未检测到其他配置文件');
        return;
      }

      const selectedFiles = await this.selectFilesToMerge(detectedFiles);
      if (!selectedFiles || selectedFiles.length === 0) {
        return;
      }

      const configs: MCPConfig[] = [];
      for (const file of selectedFiles) {
        try {
          const content = await vscode.workspace.fs.readFile(vscode.Uri.file(file.path));
          const configText = Buffer.from(content).toString('utf8');
          const config = this.jsonParser.parseConfig(configText);
          configs.push(config);
        } catch (error) {
          console.warn(`读取配置文件失败: ${file.path}`, error);
        }
      }

      if (configs.length === 0) {
        vscode.window.showWarningMessage('没有有效的配置文件可以合并');
        return;
      }

      const targetConfig = await this.configManager.readConfig(this.configManager.getConfigPath() || 'mcp.json');
      const mergeResult = await this.configMerger.mergeConfigs(configs[0], targetConfig, {
        strategy: 'merge' as any,
        preserveMetadata: true,
        createBackup: true,
        validateResult: true
      });
      
      if (mergeResult.conflicts.length > 0) {
        // 显示冲突解决界面
        await this.mcpProvider.show();
        await this.mcpProvider.postMessage({
          type: 'showConflicts',
          conflicts: mergeResult.conflicts,
          mergedConfig: mergeResult.config
        });
      } else {
        // 直接应用合并结果
        if (mergeResult.config) {
          await this.configManager.writeConfig(this.configManager.getConfigPath() || 'mcp.json', mergeResult.config);
        }
        await this.mcpProvider.refresh();
        vscode.window.showInformationMessage('配置合并成功');
      }
    } catch (error) {
      vscode.window.showErrorMessage(`合并配置失败: ${error}`);
    }
  }

  /**
   * 选择要合并的文件
   */
  private async selectFilesToMerge(detectedFiles: DetectedFile[]): Promise<DetectedFile[] | undefined> {
    const items = detectedFiles.map(file => ({
      label: file.name,
      description: file.path,
      detail: `置信度: ${Math.round(file.confidence * 100)}%`,
      file
    }));

    const selected = await vscode.window.showQuickPick(items, {
      canPickMany: true,
      placeHolder: '选择要合并的配置文件'
    });

    return selected?.map(item => item.file);
  }

  /**
   * 验证配置
   */
  private async validateConfig(): Promise<void> {
    try {
      const result = await this.configManager.validateConfig();
      
      if (result.isValid) {
        vscode.window.showInformationMessage('配置验证通过');
      } else {
        const errorCount = result.errors.length;
        const warningCount = result.warnings.length;
        
        let message = '配置验证失败';
        if (errorCount > 0) {
          message += `: ${errorCount} 个错误`;
        }
        if (warningCount > 0) {
          message += `, ${warningCount} 个警告`;
        }
        
        const action = await vscode.window.showWarningMessage(
          message,
          '查看详情'
        );
        
        if (action === '查看详情') {
          await this.mcpProvider.show();
          await this.mcpProvider.postMessage({
            type: 'showValidation',
            result
          });
        }
      }
    } catch (error) {
      vscode.window.showErrorMessage(`验证配置失败: ${error}`);
    }
  }

  /**
   * 备份配置
   */
  private async backupConfig(): Promise<void> {
    try {
      const configPath = this.configManager.getConfigPath() || 'mcp.json';
      const backupPath = `${configPath}.backup.${Date.now()}`;
      vscode.window.showInformationMessage(`配置备份功能暂未实现`);
    } catch (error) {
      vscode.window.showErrorMessage(`备份配置失败: ${error}`);
    }
  }

  /**
   * 恢复配置
   */
  private async restoreConfig(): Promise<void> {
    try {
      vscode.window.showInformationMessage('配置恢复功能暂未实现');
    } catch (error) {
      vscode.window.showErrorMessage(`恢复配置失败: ${error}`);
    }
  }

  /**
   * 检测文件
   */
  private async detectFiles(): Promise<void> {
    try {
      const detectionResult = await this.fileDetector.detectFiles();
      const files = detectionResult.files || [];
      
      if (files.length === 0) {
        vscode.window.showInformationMessage('未检测到MCP配置文件');
        return;
      }

      await this.mcpProvider.show();
      await this.mcpProvider.postMessage({
        type: 'showDetectedFiles',
        files
      });
    } catch (error) {
      vscode.window.showErrorMessage(`检测文件失败: ${error}`);
    }
  }

  /**
   * 刷新检测
   */
  private async refreshDetection(): Promise<void> {
    try {
      // 刷新检测缓存
      vscode.window.showInformationMessage('检测缓存已刷新');
      await this.detectFiles();
    } catch (error) {
      vscode.window.showErrorMessage(`刷新检测失败: ${error}`);
    }
  }

  /**
   * 从剪贴板导入
   */
  private async importFromClipboard(): Promise<void> {
    try {
      const clipboardText = await vscode.env.clipboard.readText();
      
      if (!clipboardText.trim()) {
        vscode.window.showWarningMessage('剪贴板为空');
        return;
      }

      // 尝试解析为配置或服务
      const parseResult = this.jsonParser.parseClipboard(clipboardText);
      
      if (parseResult.config) {
        const action = await vscode.window.showInformationMessage(
          '检测到完整配置，是否导入？',
          '导入', '取消'
        );
        
        if (action === '导入') {
          await this.configManager.updateConfig(parseResult.config);
          await this.mcpProvider.refresh();
          vscode.window.showInformationMessage('配置导入成功');
        }
      } else if (parseResult.services && parseResult.services.length > 0) {
        const serviceId = await vscode.window.showInputBox({
          prompt: '请输入服务ID',
          placeHolder: '例如: my-service'
        });
        
        if (serviceId) {
          const configPath = this.configManager.getConfigPath() || 'mcp.json';
          await this.configManager.addService(configPath, serviceId, parseResult.services[0]);
          await this.mcpProvider.refresh();
          vscode.window.showInformationMessage(`服务 "${serviceId}" 导入成功`);
        }
      } else {
        vscode.window.showWarningMessage('剪贴板内容不是有效的MCP配置或服务');
      }
    } catch (error) {
      vscode.window.showErrorMessage(`从剪贴板导入失败: ${error}`);
    }
  }

  /**
   * 导出配置
   */
  private async exportConfig(): Promise<void> {
    try {
      const config = await this.configManager.getConfig();
      if (!config) {
        vscode.window.showWarningMessage('没有可导出的配置');
        return;
      }

      const configJson = JSON.stringify(config, null, 2);
      await vscode.env.clipboard.writeText(configJson);
      
      vscode.window.showInformationMessage('配置已复制到剪贴板');
    } catch (error) {
      vscode.window.showErrorMessage(`导出配置失败: ${error}`);
    }
  }

  /**
   * 导入配置
   */
  private async importConfig(): Promise<void> {
    try {
      const fileUri = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
          'JSON文件': ['json'],
          '所有文件': ['*']
        }
      });

      if (!fileUri || fileUri.length === 0) {
        return;
      }

      const content = await vscode.workspace.fs.readFile(fileUri[0]);
      const configText = Buffer.from(content).toString('utf8');
      const config = this.jsonParser.parseConfig(configText);
      
      const action = await vscode.window.showInformationMessage(
        '确定要导入此配置吗？当前配置将被覆盖。',
        { modal: true },
        '导入', '取消'
      );
      
      if (action === '导入') {
        await this.configManager.updateConfig(config);
        await this.mcpProvider.refresh();
        vscode.window.showInformationMessage('配置导入成功');
      }
    } catch (error) {
      vscode.window.showErrorMessage(`导入配置失败: ${error}`);
    }
  }

  /**
   * 打开设置
   */
  private async openSettings(): Promise<void> {
    try {
      await this.mcpProvider.show();
      await this.mcpProvider.postMessage({
        type: 'showSettings'
      });
    } catch (error) {
      vscode.window.showErrorMessage(`打开设置失败: ${error}`);
    }
  }

  /**
   * 重置设置
   */
  private async resetSettings(): Promise<void> {
    try {
      const confirm = await vscode.window.showWarningMessage(
        '确定要重置所有设置吗？',
        { modal: true },
        '重置'
      );

      if (confirm === '重置') {
        const config = vscode.workspace.getConfiguration('mcp-config-manager');
        await config.update('autoDetect', undefined, vscode.ConfigurationTarget.Global);
        await config.update('fileWatcher', undefined, vscode.ConfigurationTarget.Global);
        await config.update('autoBackup', undefined, vscode.ConfigurationTarget.Global);
        await config.update('backupRetentionDays', undefined, vscode.ConfigurationTarget.Global);
        await config.update('defaultMergeStrategy', undefined, vscode.ConfigurationTarget.Global);
        await config.update('detectionPaths', undefined, vscode.ConfigurationTarget.Global);
        await config.update('excludePatterns', undefined, vscode.ConfigurationTarget.Global);
        
        vscode.window.showInformationMessage('设置已重置');
      }
    } catch (error) {
      vscode.window.showErrorMessage(`重置设置失败: ${error}`);
    }
  }

  /**
   * 从文件添加服务
   */
  private async addServiceFromFile(uri: vscode.Uri): Promise<void> {
    try {
      const serviceId = await vscode.window.showInputBox({
        prompt: '请输入服务ID',
        placeHolder: '例如: my-service'
      });

      if (!serviceId) {
        return;
      }

      const serviceConfig: MCPServiceConfig = {
        command: uri.fsPath,
        args: [],
        env: {},
        disabled: false
      };

      const configPath = this.configManager.getConfigPath() || 'mcp.json';
      await this.configManager.addService(configPath, serviceId, serviceConfig);
      await this.mcpProvider.refresh();
      
      vscode.window.showInformationMessage(`服务 "${serviceId}" 添加成功`);
    } catch (error) {
      vscode.window.showErrorMessage(`从文件添加服务失败: ${error}`);
    }
  }

  /**
   * 打开配置文件
   */
  private async openConfigFile(uri: vscode.Uri): Promise<void> {
    try {
      await vscode.window.showTextDocument(uri);
    } catch (error) {
      vscode.window.showErrorMessage(`打开配置文件失败: ${error}`);
    }
  }

  /**
   * 销毁资源
   */
  public dispose(): void {
    this.disposables.forEach(disposable => disposable.dispose());
    this.disposables = [];
  }
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