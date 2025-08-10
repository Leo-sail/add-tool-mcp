import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ConfigurationManager } from './ConfigurationManager';
import { FileDetector } from './FileDetector';
import { MCPConfig, MCPServiceConfig } from '../types';

/**
 * 文件监控器类
 * 负责监控MCP配置文件的变化，并提供自动检测功能
 */
export class FileWatcher {
    private watchers: Map<string, vscode.FileSystemWatcher> = new Map();
    private configManager: ConfigurationManager;
    private fileDetector: FileDetector;
    private autoDetectionEnabled: boolean = true;
    private detectionInterval: NodeJS.Timeout | null = null;
    private lastDetectionTime: number = 0;
    private readonly DETECTION_COOLDOWN = 5000; // 5秒冷却时间
    private readonly AUTO_DETECTION_INTERVAL = 30000; // 30秒自动检测间隔

    constructor(configManager: ConfigurationManager, fileDetector: FileDetector) {
        this.configManager = configManager;
        this.fileDetector = fileDetector;
        this.initializeWatchers();
    }

    /**
     * 初始化文件监控器
     */
    private initializeWatchers(): void {
        // 监控工作区中的JSON文件变化
        this.watchWorkspaceFiles();
        
        // 监控配置文件变化
        this.watchConfigurationFiles();
        
        // 启动自动检测
        this.startAutoDetection();
    }

    /**
     * 监控工作区文件变化
     */
    private watchWorkspaceFiles(): void {
        if (!vscode.workspace.workspaceFolders) {
            return;
        }

        for (const folder of vscode.workspace.workspaceFolders) {
            const pattern = new vscode.RelativePattern(folder, '**/*.json');
            const watcher = vscode.workspace.createFileSystemWatcher(pattern);

            // 文件创建事件
            watcher.onDidCreate(uri => {
                this.handleFileChange(uri, 'created');
            });

            // 文件修改事件
            watcher.onDidChange(uri => {
                this.handleFileChange(uri, 'changed');
            });

            // 文件删除事件
            watcher.onDidDelete(uri => {
                this.handleFileChange(uri, 'deleted');
            });

            this.watchers.set(folder.uri.fsPath, watcher);
        }
    }

    /**
     * 监控特定配置文件
     */
    private watchConfigurationFiles(): void {
        const configPaths = this.getKnownConfigPaths();
        
        for (const configPath of configPaths) {
            if (fs.existsSync(configPath)) {
                this.watchSpecificFile(configPath);
            }
        }
    }

    /**
     * 监控特定文件
     */
    private watchSpecificFile(filePath: string): void {
        const pattern = new vscode.RelativePattern(
            path.dirname(filePath),
            path.basename(filePath)
        );
        
        const watcher = vscode.workspace.createFileSystemWatcher(pattern);
        
        watcher.onDidChange(() => {
            this.handleConfigFileChange(filePath);
        });
        
        watcher.onDidDelete(() => {
            this.handleConfigFileDeleted(filePath);
        });
        
        this.watchers.set(filePath, watcher);
    }

    /**
     * 处理文件变化事件
     */
    private async handleFileChange(uri: vscode.Uri, changeType: 'created' | 'changed' | 'deleted'): Promise<void> {
        const filePath = uri.fsPath;
        
        // 检查是否是潜在的MCP配置文件
        if (!this.isPotentialMCPFile(filePath)) {
            return;
        }

        // 防止频繁检测
        const now = Date.now();
        if (now - this.lastDetectionTime < this.DETECTION_COOLDOWN) {
            return;
        }
        this.lastDetectionTime = now;

        try {
            switch (changeType) {
                case 'created':
                    await this.handleFileCreated(filePath);
                    break;
                case 'changed':
                    await this.handleFileModified(filePath);
                    break;
                case 'deleted':
                    await this.handleFileDeleted(filePath);
                    break;
            }
        } catch (error) {
            console.error(`处理文件变化时出错: ${filePath}`, error);
        }
    }

    /**
     * 处理文件创建事件
     */
    private async handleFileCreated(filePath: string): Promise<void> {
        // 检测新文件是否为MCP配置
        const detectionResult = await this.fileDetector.detectSingleFile(filePath);
        
        if (detectionResult && detectionResult.confidence > 0.7) {
            // 显示通知询问用户是否要导入
            const action = await vscode.window.showInformationMessage(
                `检测到新的MCP配置文件: ${path.basename(filePath)}`,
                '导入配置',
                '忽略'
            );
            
            if (action === '导入配置') {
                await this.importDetectedFile(filePath, detectionResult);
            }
        }
    }

    /**
     * 处理文件修改事件
     */
    private async handleFileModified(filePath: string): Promise<void> {
        // 检查是否是已知的配置文件
        const currentConfig = await this.configManager.getConfig();
        const isKnownConfig = this.isKnownConfigFile(filePath, currentConfig);
        
        if (isKnownConfig) {
            // 已知配置文件被修改，询问是否重新加载
            const action = await vscode.window.showWarningMessage(
                `配置文件已被外部修改: ${path.basename(filePath)}`,
                '重新加载',
                '忽略'
            );
            
            if (action === '重新加载') {
                await this.reloadConfiguration();
            }
        } else {
            // 检测修改后的文件是否变成了MCP配置
            const detectionResult = await this.fileDetector.detectSingleFile(filePath);
            
            if (detectionResult && detectionResult.confidence > 0.8) {
                const action = await vscode.window.showInformationMessage(
                    `文件修改后检测为MCP配置: ${path.basename(filePath)}`,
                    '导入配置',
                    '忽略'
                );
                
                if (action === '导入配置') {
                    await this.importDetectedFile(filePath, detectionResult);
                }
            }
        }
    }

    /**
     * 处理文件删除事件
     */
    private async handleFileDeleted(filePath: string): Promise<void> {
        const currentConfig = await this.configManager.getConfig();
        const isKnownConfig = this.isKnownConfigFile(filePath, currentConfig);
        
        if (isKnownConfig) {
            vscode.window.showWarningMessage(
                `配置文件已被删除: ${path.basename(filePath)}`,
                '确定'
            );
        }
    }

    /**
     * 处理配置文件变化
     */
    private async handleConfigFileChange(filePath: string): Promise<void> {
        const action = await vscode.window.showInformationMessage(
            `MCP配置文件已更新: ${path.basename(filePath)}`,
            '重新加载',
            '忽略'
        );
        
        if (action === '重新加载') {
            await this.reloadConfiguration();
        }
    }

    /**
     * 处理配置文件删除
     */
    private async handleConfigFileDeleted(filePath: string): Promise<void> {
        vscode.window.showErrorMessage(
            `MCP配置文件已被删除: ${path.basename(filePath)}`
        );
    }

    /**
     * 启动自动检测
     */
    private startAutoDetection(): void {
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
        }
        
        this.detectionInterval = setInterval(async () => {
            if (this.autoDetectionEnabled) {
                await this.performAutoDetection();
            }
        }, this.AUTO_DETECTION_INTERVAL);
    }

    /**
     * 执行自动检测
     */
    private async performAutoDetection(): Promise<void> {
        try {
            if (!vscode.workspace.workspaceFolders) {
                return;
            }

            const detectionResults = await this.fileDetector.detectFiles({
                searchPaths: vscode.workspace.workspaceFolders?.map(f => f.uri.fsPath) || []
            });

            // 过滤出高置信度的新文件
            const newFiles = detectionResults.files.filter((file: any) => 
                file.confidence > 0.8 && !this.isKnownConfigFile(file.path)
            );

            if (newFiles.length > 0) {
                const action = await vscode.window.showInformationMessage(
                    `自动检测到 ${newFiles.length} 个新的MCP配置文件`,
                    '查看详情',
                    '忽略'
                );
                
                if (action === '查看详情') {
                    // 触发文件检测面板显示
                    vscode.commands.executeCommand('mcpManager.detectFiles');
                }
            }
        } catch (error) {
            console.error('自动检测时出错:', error);
        }
    }

    /**
     * 导入检测到的文件
     */
    private async importDetectedFile(filePath: string, detectionResult: any): Promise<void> {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const config = JSON.parse(content);
            
            // 提取服务配置
            const services = this.extractServicesFromConfig(config, detectionResult);
            
            if (Object.keys(services).length > 0) {
                // 合并到当前配置
                await this.configManager.updateConfig({ mcpServers: services });
                
                vscode.window.showInformationMessage(
                    `成功导入 ${Object.keys(services).length} 个服务配置`
                );
            }
        } catch (error) {
            vscode.window.showErrorMessage(
                `导入配置文件失败: ${error instanceof Error ? error.message : '未知错误'}`
            );
        }
    }

    /**
     * 从配置中提取服务
     */
    private extractServicesFromConfig(config: any, detectionResult: any): Record<string, MCPServiceConfig> {
        const services: Record<string, MCPServiceConfig> = {};
        
        // 根据检测结果的类型提取服务
        if (detectionResult.type === 'claude_desktop' && config.mcpServers) {
            for (const [name, server] of Object.entries(config.mcpServers)) {
                const typedServer = server as any;
                services[name] = {
                    command: typedServer.command || '',
                    args: typedServer.args || [],
                    env: typedServer.env || {},
                    disabled: typedServer.disabled || false
                };
            }
        } else if (detectionResult.type === 'cline' && config.mcpServers) {
            for (const [name, server] of Object.entries(config.mcpServers)) {
                const typedServer = server as any;
                services[name] = {
                    command: typedServer.command || '',
                    args: typedServer.args || [],
                    env: typedServer.env || {},
                    disabled: typedServer.disabled || false
                };
            }
        } else if (detectionResult.type === 'custom' && config.servers) {
            // 转换自定义格式
            for (const [id, server] of Object.entries(config.servers as any)) {
                const typedServer = server as any;
                services[id] = {
                    command: typedServer.command || '',
                    args: typedServer.args || [],
                    env: typedServer.env || {},
                    disabled: typedServer.disabled || false
                };
            }
        }
        
        return services;
    }

    /**
     * 检查是否是潜在的MCP文件
     */
    private isPotentialMCPFile(filePath: string): boolean {
        const fileName = path.basename(filePath).toLowerCase();
        const ext = path.extname(filePath).toLowerCase();
        
        // 只检查JSON文件
        if (ext !== '.json') {
            return false;
        }
        
        // 检查文件名模式
        const mcpPatterns = [
            'claude_desktop_config',
            'cline_mcp_settings',
            'mcp_config',
            'mcp_servers',
            'mcp-config',
            'mcp-servers'
        ];
        
        return mcpPatterns.some(pattern => fileName.includes(pattern));
    }

    /**
     * 检查是否是已知的配置文件
     */
    private isKnownConfigFile(filePath: string, config?: MCPConfig): boolean {
        if (!config) {
            return false;
        }
        
        // 检查是否在已知配置路径中
        const knownPaths = this.getKnownConfigPaths();
        return knownPaths.includes(filePath);
    }

    /**
     * 获取已知的配置文件路径
     */
    private getKnownConfigPaths(): string[] {
        const paths: string[] = [];
        
        // Claude Desktop配置路径
        const homeDir = require('os').homedir();
        paths.push(
            path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
            path.join(homeDir, '.config', 'claude', 'claude_desktop_config.json')
        );
        
        // Cline配置路径
        paths.push(
            path.join(homeDir, '.cline', 'mcp_settings.json'),
            path.join(homeDir, '.config', 'cline', 'mcp_settings.json')
        );
        
        // 工作区配置路径
        if (vscode.workspace.workspaceFolders) {
            for (const folder of vscode.workspace.workspaceFolders) {
                paths.push(
                    path.join(folder.uri.fsPath, '.mcp', 'config.json'),
                    path.join(folder.uri.fsPath, 'mcp-config.json'),
                    path.join(folder.uri.fsPath, '.vscode', 'mcp.json')
                );
            }
        }
        
        return paths;
    }

    /**
     * 重新加载配置
     */
    private async reloadConfiguration(): Promise<void> {
        try {
            await this.configManager.readConfig('');
            vscode.window.showInformationMessage('配置已重新加载');
        } catch (error) {
            vscode.window.showErrorMessage(
                `重新加载配置失败: ${error instanceof Error ? error.message : '未知错误'}`
            );
        }
    }

    /**
     * 设置自动检测状态
     */
    public setAutoDetectionEnabled(enabled: boolean): void {
        this.autoDetectionEnabled = enabled;
        
        if (enabled && !this.detectionInterval) {
            this.startAutoDetection();
        } else if (!enabled && this.detectionInterval) {
            clearInterval(this.detectionInterval);
            this.detectionInterval = null;
        }
    }

    /**
     * 手动触发检测
     */
    public async triggerDetection(): Promise<void> {
        await this.performAutoDetection();
    }

    /**
     * 添加文件监控
     */
    public addFileWatch(filePath: string): void {
        if (!this.watchers.has(filePath)) {
            this.watchSpecificFile(filePath);
        }
    }

    /**
     * 移除文件监控
     */
    public removeFileWatch(filePath: string): void {
        const watcher = this.watchers.get(filePath);
        if (watcher) {
            watcher.dispose();
            this.watchers.delete(filePath);
        }
    }

    /**
     * 获取监控状态
     */
    public getWatchStatus(): {
        watchedFiles: string[];
        autoDetectionEnabled: boolean;
        lastDetectionTime: number;
    } {
        return {
            watchedFiles: Array.from(this.watchers.keys()),
            autoDetectionEnabled: this.autoDetectionEnabled,
            lastDetectionTime: this.lastDetectionTime
        };
    }

    /**
     * 销毁监控器
     */
    public dispose(): void {
        // 清理所有监控器
        for (const watcher of this.watchers.values()) {
            watcher.dispose();
        }
        this.watchers.clear();
        
        // 清理定时器
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
            this.detectionInterval = null;
        }
    }
}