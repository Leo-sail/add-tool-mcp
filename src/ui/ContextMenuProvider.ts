import * as vscode from 'vscode';
import * as path from 'path';
import { ConfigurationManager } from '../core/ConfigurationManager';
import { JsonParser } from '../core/JsonParser';
import { FileDetector } from '../core/FileDetector';
import { MCPConfig, MCPServiceConfig } from '../types';

/**
 * 右键菜单提供者
 * 为文件资源管理器提供MCP配置相关的右键菜单选项
 */
export class ContextMenuProvider {
  private _context: vscode.ExtensionContext;
  private _configManager: ConfigurationManager;
  private _fileDetector: FileDetector;
  private _jsonParser: JsonParser;
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
  }

  /**
   * 注册右键菜单命令
   */
  public register(): void {
    // 注册从文件添加服务的命令
    this._disposables.push(
      vscode.commands.registerCommand(
        'mcp-config-manager.addServiceFromFile',
        this.addServiceFromFile.bind(this)
      )
    );

    // 注册打开配置文件的命令
    this._disposables.push(
      vscode.commands.registerCommand(
        'mcp-config-manager.openConfigFile',
        this.openConfigFile.bind(this)
      )
    );

    // 注册验证配置文件的命令
    this._disposables.push(
      vscode.commands.registerCommand(
        'mcp-config-manager.validateConfigFile',
        this.validateConfigFile.bind(this)
      )
    );

    // 注册导入配置文件的命令
    this._disposables.push(
      vscode.commands.registerCommand(
        'mcp-config-manager.importConfigFile',
        this.importConfigFile.bind(this)
      )
    );

    // 注册创建配置文件的命令
    this._disposables.push(
      vscode.commands.registerCommand(
        'mcp-config-manager.createConfigFile',
        this.createConfigFile.bind(this)
      )
    );

    // 注册检测MCP文件的命令
    this._disposables.push(
      vscode.commands.registerCommand(
        'mcp-config-manager.detectMCPFiles',
        this.detectMCPFiles.bind(this)
      )
    );

    // 注册从剪贴板添加服务的命令
    this._disposables.push(
      vscode.commands.registerCommand(
        'mcp-config-manager.addServiceFromClipboard',
        this.addServiceFromClipboard.bind(this)
      )
    );

    // 注册导出配置到剪贴板的命令
    this._disposables.push(
      vscode.commands.registerCommand(
        'mcp-config-manager.exportToClipboard',
        this.exportToClipboard.bind(this)
      )
    );
  }

  /**
   * 从文件添加服务
   */
  public async addServiceFromFile(uri?: vscode.Uri): Promise<void> {
    try {
      let filePath: string;
      
      if (uri) {
        filePath = uri.fsPath;
      } else {
        // 如果没有提供URI，让用户选择文件
        const fileUri = await vscode.window.showOpenDialog({
          canSelectFiles: true,
          canSelectFolders: false,
          canSelectMany: false,
          filters: {
            'JSON文件': ['json'],
            '所有文件': ['*']
          },
          title: '选择要添加为服务的文件'
        });
        
        if (!fileUri || fileUri.length === 0) {
          return;
        }
        
        filePath = fileUri[0].fsPath;
      }

      // 检查文件是否存在
      try {
        await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
      } catch {
        vscode.window.showErrorMessage(`文件不存在: ${filePath}`);
        return;
      }

      // 读取文件内容
      const content = await vscode.workspace.fs.readFile(vscode.Uri.file(filePath));
      const fileContent = Buffer.from(content).toString('utf8');

      // 尝试解析为MCP配置
      let serviceConfig: MCPServiceConfig | undefined;
      
      try {
        const parseResult = this._jsonParser.parseClipboard(fileContent);
        if (parseResult.services && parseResult.services.length > 0) {
          serviceConfig = parseResult.services[0];
        } else if (parseResult.config) {
          // 如果是完整配置，提取第一个服务
          const config = parseResult.config;
          const services = config.mcpServers || {};
          const serviceIds = Object.keys(services);
          
          if (serviceIds.length === 0) {
            vscode.window.showErrorMessage('文件中没有找到有效的MCP服务配置');
            return;
          }
          
          if (serviceIds.length > 1) {
            // 让用户选择要添加的服务
            const selectedServiceId = await vscode.window.showQuickPick(
              serviceIds.map(id => ({
                label: id,
                description: services[id].command || '无命令',
                detail: services[id].args?.join(' ') || '无参数'
              })),
              {
                title: '选择要添加的服务',
                placeHolder: '文件包含多个服务，请选择一个'
              }
            );
            
            if (!selectedServiceId) {
              return;
            }
            
            serviceConfig = services[selectedServiceId.label];
          } else {
            serviceConfig = services[serviceIds[0]];
          }
        } else {
          vscode.window.showErrorMessage('无法解析文件内容为有效的MCP配置');
          return;
        }
      } catch (error) {
        vscode.window.showErrorMessage(`解析文件失败: ${error instanceof Error ? error.message : String(error)}`);
        return;
      }
      
      if (!serviceConfig) {
        vscode.window.showErrorMessage('未能提取有效的服务配置');
        return;
      }

      // 让用户输入服务ID
      const fileName = path.basename(filePath, path.extname(filePath));
      const defaultServiceId = fileName.replace(/[^a-zA-Z0-9_-]/g, '_');
      
      const serviceId = await vscode.window.showInputBox({
        title: '输入服务ID',
        prompt: '为新服务输入一个唯一的ID',
        value: defaultServiceId,
        validateInput: (value) => {
          if (!value.trim()) {
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

      // 检查服务ID是否已存在
      const existingConfig = await this._configManager.getConfig();
      if (existingConfig?.mcpServers?.[serviceId]) {
        const overwrite = await vscode.window.showWarningMessage(
          `服务ID "${serviceId}" 已存在，是否覆盖？`,
          '覆盖',
          '取消'
        );
        
        if (overwrite !== '覆盖') {
          return;
        }
      }

      // 添加服务
      const configPath = this._configManager.getConfigPath() || 'mcp.json';
      await this._configManager.addService(configPath, serviceId, serviceConfig);
      
      vscode.window.showInformationMessage(
        `成功添加服务 "${serviceId}"`,
        '打开配置管理器'
      ).then(action => {
        if (action === '打开配置管理器') {
          vscode.commands.executeCommand('mcp-config-manager.openPanel');
        }
      });
      
    } catch (error) {
      console.error('从文件添加服务失败:', error);
      vscode.window.showErrorMessage(
        `添加服务失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 打开配置文件
   */
  public async openConfigFile(uri?: vscode.Uri): Promise<void> {
    try {
      let filePath: string;
      
      if (uri) {
        filePath = uri.fsPath;
      } else {
        // 使用当前配置文件路径
        const currentPath = this._configManager.getConfigPath();
        if (!currentPath) {
          vscode.window.showErrorMessage('没有找到配置文件路径');
          return;
        }
        filePath = currentPath;
      }

      // 检查文件是否存在
      try {
        await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
      } catch {
        // 如果文件不存在，询问是否创建
        const create = await vscode.window.showWarningMessage(
          `配置文件不存在: ${filePath}`,
          '创建文件',
          '取消'
        );
        
        if (create === '创建文件') {
          await this.createConfigFile(vscode.Uri.file(path.dirname(filePath)));
        }
        return;
      }

      // 在编辑器中打开文件
      const document = await vscode.workspace.openTextDocument(filePath);
      await vscode.window.showTextDocument(document);
      
    } catch (error) {
      console.error('打开配置文件失败:', error);
      vscode.window.showErrorMessage(
        `打开配置文件失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 验证配置文件
   */
  public async validateConfigFile(uri?: vscode.Uri): Promise<void> {
    try {
      let filePath: string;
      
      if (uri) {
        filePath = uri.fsPath;
      } else {
        const currentPath = this._configManager.getConfigPath();
        if (!currentPath) {
          vscode.window.showErrorMessage('没有找到配置文件路径');
          return;
        }
        filePath = currentPath;
      }

      // 检查文件是否存在
      try {
        await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
      } catch {
        vscode.window.showErrorMessage(`文件不存在: ${filePath}`);
        return;
      }

      // 读取并验证文件
      const content = await vscode.workspace.fs.readFile(vscode.Uri.file(filePath));
      const fileContent = Buffer.from(content).toString('utf8');
      
      try {
        const config = this._jsonParser.parseConfig(fileContent);
        const validationResult = await this._configManager.validateConfig(config);
        
        if (validationResult.isValid) {
          vscode.window.showInformationMessage(
            `配置文件验证通过 ✓\n服务数量: ${Object.keys(config.mcpServers || {}).length}`
          );
        } else {
          const errorCount = validationResult.errors?.length || 0;
          const warningCount = validationResult.warnings?.length || 0;
          
          vscode.window.showWarningMessage(
            `配置文件验证失败\n错误: ${errorCount} 个\n警告: ${warningCount} 个`,
            '查看详情'
          ).then(action => {
            if (action === '查看详情') {
              this.showValidationDetails(validationResult);
            }
          });
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          `配置文件格式错误: ${error instanceof Error ? error.message : String(error)}`
        );
      }
      
    } catch (error) {
      console.error('验证配置文件失败:', error);
      vscode.window.showErrorMessage(
        `验证失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 导入配置文件
   */
  public async importConfigFile(uri?: vscode.Uri): Promise<void> {
    try {
      let filePath: string;
      
      if (uri) {
        filePath = uri.fsPath;
      } else {
        // 让用户选择要导入的文件
        const fileUri = await vscode.window.showOpenDialog({
          canSelectFiles: true,
          canSelectFolders: false,
          canSelectMany: false,
          filters: {
            'JSON文件': ['json'],
            '所有文件': ['*']
          },
          title: '选择要导入的配置文件'
        });
        
        if (!fileUri || fileUri.length === 0) {
          return;
        }
        
        filePath = fileUri[0].fsPath;
      }

      // 读取文件内容
      const content = await vscode.workspace.fs.readFile(vscode.Uri.file(filePath));
      const fileContent = Buffer.from(content).toString('utf8');
      
      // 解析配置
      const importedConfig = this._jsonParser.parseConfig(fileContent);
      
      // 获取当前配置
      const currentConfig = await this._configManager.getConfig();
      
      if (currentConfig && Object.keys(currentConfig.mcpServers || {}).length > 0) {
        // 如果当前已有配置，询问合并策略
        const action = await vscode.window.showWarningMessage(
          '当前已有配置，如何处理导入的配置？',
          '合并配置',
          '覆盖配置',
          '取消'
        );
        
        if (action === '取消') {
          return;
        }
        
        if (action === '合并配置') {
          // 打开配置管理器进行合并
          vscode.commands.executeCommand('mcp-config-manager.openPanel');
          vscode.window.showInformationMessage(
            '请在配置管理器中使用合并功能来合并配置文件'
          );
          return;
        }
      }
      
      // 直接导入配置
      await this._configManager.updateConfig(importedConfig);
      
      const serviceCount = Object.keys(importedConfig.mcpServers || {}).length;
      vscode.window.showInformationMessage(
        `成功导入配置文件\n导入了 ${serviceCount} 个服务`,
        '打开配置管理器'
      ).then(action => {
        if (action === '打开配置管理器') {
          vscode.commands.executeCommand('mcp-config-manager.openPanel');
        }
      });
      
    } catch (error) {
      console.error('导入配置文件失败:', error);
      vscode.window.showErrorMessage(
        `导入失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 创建配置文件
   */
  public async createConfigFile(uri?: vscode.Uri): Promise<void> {
    try {
      let targetDir: string;
      
      if (uri) {
        const stat = await vscode.workspace.fs.stat(uri);
        if (stat.type === vscode.FileType.Directory) {
          targetDir = uri.fsPath;
        } else {
          targetDir = path.dirname(uri.fsPath);
        }
      } else {
        // 使用工作区根目录
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
          vscode.window.showErrorMessage('没有打开的工作区');
          return;
        }
        targetDir = workspaceFolders[0].uri.fsPath;
      }

      // 让用户选择配置文件名
      const fileName = await vscode.window.showInputBox({
        title: '创建配置文件',
        prompt: '输入配置文件名',
        value: 'mcp-config.json',
        validateInput: (value) => {
          if (!value.trim()) {
            return '文件名不能为空';
          }
          if (!value.endsWith('.json')) {
            return '文件名必须以.json结尾';
          }
          return null;
        }
      });
      
      if (!fileName) {
        return;
      }

      const filePath = path.join(targetDir, fileName);
      
      // 检查文件是否已存在
      try {
        await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
        const overwrite = await vscode.window.showWarningMessage(
          `文件 "${fileName}" 已存在，是否覆盖？`,
          '覆盖',
          '取消'
        );
        
        if (overwrite !== '覆盖') {
          return;
        }
      } catch {
        // 文件不存在，可以创建
      }

      // 创建基础配置
      const baseConfig: MCPConfig = {
        mcpServers: {},
        $schema: "https://raw.githubusercontent.com/modelcontextprotocol/servers/main/src/mcp/server/schema.json"
      };
      
      const configContent = JSON.stringify(baseConfig, null, 2);
      
      // 写入文件
      await vscode.workspace.fs.writeFile(
        vscode.Uri.file(filePath),
        Buffer.from(configContent, 'utf8')
      );
      
      // 在编辑器中打开文件
      const document = await vscode.workspace.openTextDocument(filePath);
      await vscode.window.showTextDocument(document);
      
      vscode.window.showInformationMessage(
        `成功创建配置文件: ${fileName}`,
        '打开配置管理器'
      ).then(action => {
        if (action === '打开配置管理器') {
          vscode.commands.executeCommand('mcp-config-manager.openPanel');
        }
      });
      
    } catch (error) {
      console.error('创建配置文件失败:', error);
      vscode.window.showErrorMessage(
        `创建失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 检测MCP文件
   */
  public async detectMCPFiles(uri?: vscode.Uri): Promise<void> {
    try {
      let searchPath: string;
      
      if (uri) {
        const stat = await vscode.workspace.fs.stat(uri);
        if (stat.type === vscode.FileType.Directory) {
          searchPath = uri.fsPath;
        } else {
          searchPath = path.dirname(uri.fsPath);
        }
      } else {
        // 使用工作区根目录
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
          vscode.window.showErrorMessage('没有打开的工作区');
          return;
        }
        searchPath = workspaceFolders[0].uri.fsPath;
      }

      // 显示进度
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: '检测MCP配置文件',
        cancellable: false
      }, async (progress) => {
        progress.report({ message: '正在扫描文件...' });
        
        const detectedFiles = await this._fileDetector.detectFiles({
          searchPaths: [searchPath],
          maxDepth: 5,
          includeHidden: false
        });
        
        progress.report({ message: '检测完成' });
        
        if (detectedFiles.files.length === 0) {
          vscode.window.showInformationMessage(
            `在 "${path.basename(searchPath)}" 中未检测到MCP配置文件`,
            '创建配置文件'
          ).then(action => {
            if (action === '创建配置文件') {
              this.createConfigFile(vscode.Uri.file(searchPath));
            }
          });
        } else {
          const validFiles = detectedFiles.files.filter(file => file.isValid);
          const message = `检测到 ${detectedFiles.files.length} 个文件，其中 ${validFiles.length} 个有效`;
          
          vscode.window.showInformationMessage(
            message,
            '查看详情',
            '打开配置管理器'
          ).then(action => {
            if (action === '查看详情') {
              this.showDetectionResults(detectedFiles.files);
            } else if (action === '打开配置管理器') {
              vscode.commands.executeCommand('mcp-config-manager.openPanel');
            }
          });
        }
      });
      
    } catch (error) {
      console.error('检测MCP文件失败:', error);
      vscode.window.showErrorMessage(
        `检测失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 从剪贴板添加服务
   */
  public async addServiceFromClipboard(): Promise<void> {
    try {
      const clipboardText = await vscode.env.clipboard.readText();
      
      if (!clipboardText.trim()) {
        vscode.window.showWarningMessage('剪贴板为空');
        return;
      }

      // 解析剪贴板内容
      const parseResult = this._jsonParser.parseClipboard(clipboardText);
      
      if (parseResult.services && parseResult.services.length === 1) {
        // 直接是服务配置
        const serviceConfig = parseResult.services[0];
        
        // 让用户输入服务ID
        const serviceId = await vscode.window.showInputBox({
          title: '输入服务ID',
          prompt: '为新服务输入一个唯一的ID',
          validateInput: (value) => {
            if (!value.trim()) {
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

        const configPath = this._configManager.getConfigPath() || 'mcp.json';
        await this._configManager.addService(configPath, serviceId, serviceConfig);
        vscode.window.showInformationMessage(`成功添加服务 "${serviceId}"`);
        
      } else if (parseResult.config) {
        // 完整配置
        const config = parseResult.config;
        const services = config.mcpServers || {};
        const serviceIds = Object.keys(services);
        
        if (serviceIds.length === 0) {
          vscode.window.showWarningMessage('剪贴板中的配置没有包含任何服务');
          return;
        }
        
        // 导入所有服务
        const configPath = this._configManager.getConfigPath() || 'mcp.json';
        for (const serviceId of serviceIds) {
          await this._configManager.addService(configPath, serviceId, services[serviceId]);
        }
        
        vscode.window.showInformationMessage(
          `成功从剪贴板导入 ${serviceIds.length} 个服务`
        );
      } else if (parseResult.error) {
        vscode.window.showWarningMessage(`解析失败: ${parseResult.error}`);
      } else {
        vscode.window.showWarningMessage('剪贴板内容格式不正确或无法解析');
      }
      
    } catch (error) {
      console.error('从剪贴板添加服务失败:', error);
      vscode.window.showErrorMessage(
        `添加失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 导出配置到剪贴板
   */
  public async exportToClipboard(): Promise<void> {
    try {
      const config = await this._configManager.getConfig();
      
      if (!config || Object.keys(config.mcpServers || {}).length === 0) {
        vscode.window.showWarningMessage('没有可导出的配置');
        return;
      }

      const configJson = JSON.stringify(config, null, 2);
      await vscode.env.clipboard.writeText(configJson);
      
      const serviceCount = Object.keys(config.mcpServers || {}).length;
      vscode.window.showInformationMessage(
        `已将配置复制到剪贴板\n包含 ${serviceCount} 个服务`
      );
      
    } catch (error) {
      console.error('导出到剪贴板失败:', error);
      vscode.window.showErrorMessage(
        `导出失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 显示验证详情
   */
  private async showValidationDetails(validationResult: any): Promise<void> {
    const items: vscode.QuickPickItem[] = [];
    
    if (validationResult.errors) {
      validationResult.errors.forEach((error: any, index: number) => {
        items.push({
          label: `❌ 错误 ${index + 1}`,
          description: error.message,
          detail: error.path || ''
        });
      });
    }
    
    if (validationResult.warnings) {
      validationResult.warnings.forEach((warning: any, index: number) => {
        items.push({
          label: `⚠️ 警告 ${index + 1}`,
          description: warning.message,
          detail: warning.path || ''
        });
      });
    }
    
    if (items.length > 0) {
      await vscode.window.showQuickPick(items, {
        title: '验证结果详情',
        placeHolder: '选择查看详细信息'
      });
    }
  }

  /**
   * 显示检测结果
   */
  private async showDetectionResults(detectedFiles: any[]): Promise<void> {
    const items: vscode.QuickPickItem[] = detectedFiles.map(file => ({
      label: file.name,
      description: file.isValid ? '✓ 有效' : '✗ 无效',
      detail: file.path,
      picked: file.isValid
    }));
    
    const selected = await vscode.window.showQuickPick(items, {
      title: '检测到的MCP配置文件',
      placeHolder: '选择要打开的文件',
      canPickMany: false
    });
    
    if (selected) {
      const document = await vscode.workspace.openTextDocument(selected.detail!);
      await vscode.window.showTextDocument(document);
    }
  }

  /**
   * 销毁资源
   */
  public dispose(): void {
    this._disposables.forEach(disposable => disposable.dispose());
    this._disposables = [];
  }
}

export default ContextMenuProvider;