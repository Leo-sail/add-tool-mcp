import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { FileDetector } from './FileDetector';
import { ConfigurationManager } from './ConfigurationManager';
import { MCPConfig, MCPService, DetectedFile } from '../types/index';

/**
 * 自动检测设置接口
 */
interface AutoDetectionSettings {
    enabled: boolean;
    interval: number; // 检测间隔（毫秒）
    minConfidence: number; // 最小置信度阈值
    watchPaths: string[]; // 监控路径
    excludePatterns: string[]; // 排除模式
    notifyOnNewFiles: boolean; // 发现新文件时通知
    autoImport: boolean; // 自动导入高置信度文件
    deepScan: boolean; // 深度扫描
    maxFileSize: number; // 最大文件大小（字节）
}

/**
 * 自动检测服务类
 * 负责后台自动检测MCP配置文件的变化和新增
 */
export class AutoDetectionService {
    private fileDetector: FileDetector;
    private configManager: ConfigurationManager;
    private detectionTimer: NodeJS.Timeout | null = null;
    private isRunning: boolean = false;
    private lastScanTime: number = 0;
    private detectionHistory: Map<string, DetectedFile> = new Map();
    private settings: AutoDetectionSettings;
    private statusBarItem: vscode.StatusBarItem;

    constructor(fileDetector: FileDetector, configManager: ConfigurationManager) {
        this.fileDetector = fileDetector;
        this.configManager = configManager;
        this.settings = this.loadSettings();
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.initializeStatusBar();
    }



    /**
     * 加载设置
     */
    private loadSettings(): AutoDetectionSettings {
        const config = vscode.workspace.getConfiguration('mcpManager.autoDetection');
        
        return {
            enabled: config.get('enabled', true),
            interval: config.get('interval', 30000), // 30秒
            minConfidence: config.get('minConfidence', 0.7),
            watchPaths: config.get('watchPaths', this.getDefaultWatchPaths()),
            excludePatterns: config.get('excludePatterns', [
                '**/node_modules/**',
                '**/dist/**',
                '**/build/**',
                '**/.git/**',
                '**/tmp/**',
                '**/temp/**'
            ]),
            notifyOnNewFiles: config.get('notifyOnNewFiles', true),
            autoImport: config.get('autoImport', false),
            deepScan: config.get('deepScan', false),
            maxFileSize: config.get('maxFileSize', 1024 * 1024) // 1MB
        };
    }

    /**
     * 获取默认监控路径
     */
    private getDefaultWatchPaths(): string[] {
        const paths: string[] = [];
        const homeDir = require('os').homedir();
        
        // 用户配置目录
        paths.push(
            path.join(homeDir, 'Library', 'Application Support', 'Claude'),
            path.join(homeDir, '.config', 'claude'),
            path.join(homeDir, '.cline'),
            path.join(homeDir, '.config', 'cline'),
            path.join(homeDir, '.mcp')
        );
        
        // 工作区目录
        if (vscode.workspace.workspaceFolders) {
            for (const folder of vscode.workspace.workspaceFolders) {
                paths.push(folder.uri.fsPath);
            }
        }
        
        return paths.filter(p => fs.existsSync(p));
    }

    /**
     * 初始化状态栏
     */
    private initializeStatusBar(): void {
        this.statusBarItem.command = 'mcpManager.toggleAutoDetection';
        this.updateStatusBar();
        this.statusBarItem.show();
    }

    /**
     * 更新状态栏
     */
    private updateStatusBar(): void {
        if (this.isRunning) {
            this.statusBarItem.text = '$(search) MCP自动检测';
            this.statusBarItem.tooltip = 'MCP自动检测正在运行\n点击切换状态';
            this.statusBarItem.backgroundColor = undefined;
        } else {
            this.statusBarItem.text = '$(search-stop) MCP检测已停止';
            this.statusBarItem.tooltip = 'MCP自动检测已停止\n点击启动';
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        }
    }

    /**
     * 启动自动检测
     */
    public start(): void {
        if (this.isRunning || !this.settings.enabled) {
            return;
        }

        this.isRunning = true;
        this.scheduleNextDetection();
        this.updateStatusBar();
        
        vscode.window.showInformationMessage('MCP自动检测已启动');
    }

    /**
     * 停止自动检测
     */
    public stop(): void {
        if (!this.isRunning) {
            return;
        }

        this.isRunning = false;
        
        if (this.detectionTimer) {
            clearTimeout(this.detectionTimer);
            this.detectionTimer = null;
        }
        
        this.updateStatusBar();
        vscode.window.showInformationMessage('MCP自动检测已停止');
    }

    /**
     * 切换自动检测状态
     */
    public toggle(): void {
        if (this.isRunning) {
            this.stop();
        } else {
            this.start();
        }
    }

    /**
     * 安排下次检测
     */
    private scheduleNextDetection(): void {
        if (!this.isRunning) {
            return;
        }

        this.detectionTimer = setTimeout(async () => {
            await this.performDetection();
            this.scheduleNextDetection();
        }, this.settings.interval);
    }

    /**
     * 执行检测
     */
    private async performDetection(): Promise<void> {
        try {
            const startTime = Date.now();
            this.lastScanTime = startTime;
            
            // 更新状态栏显示正在扫描
            this.statusBarItem.text = '$(loading~spin) MCP扫描中...';
            
            const results = await this.scanForMCPFiles();
            const newFiles = this.filterNewFiles(results);
            
            if (newFiles.length > 0) {
                await this.handleNewFiles(newFiles);
            }
            
            // 更新检测历史
            this.updateDetectionHistory(results);
            
            const duration = Date.now() - startTime;
            console.log(`MCP自动检测完成，耗时: ${duration}ms，发现 ${newFiles.length} 个新文件`);
            
        } catch (error) {
            console.error('自动检测时出错:', error);
            vscode.window.showErrorMessage(
                `MCP自动检测失败: ${error instanceof Error ? error.message : '未知错误'}`
            );
        } finally {
            this.updateStatusBar();
        }
    }

    /**
     * 扫描MCP文件
     */
    private async scanForMCPFiles(): Promise<DetectedFile[]> {
        const allResults: DetectedFile[] = [];
        
        for (const watchPath of this.settings.watchPaths) {
            if (!fs.existsSync(watchPath)) {
                continue;
            }
            
            try {
                const results = await this.scanDirectory(watchPath);
                allResults.push(...results);
            } catch (error) {
                console.error(`扫描目录失败: ${watchPath}`, error);
            }
        }
        
        return allResults.filter(result => 
            result.confidence >= this.settings.minConfidence
        );
    }

    /**
     * 扫描目录
     */
    private async scanDirectory(dirPath: string): Promise<DetectedFile[]> {
        const results: DetectedFile[] = [];
        
        try {
            const files = await this.getFilesToScan(dirPath);
            
            for (const file of files) {
                try {
                    // 检查文件大小
                    const stats = fs.statSync(file);
                    if (stats.size > this.settings.maxFileSize) {
                        continue;
                    }
                    
                    const result = await this.fileDetector.detectSingleFile(file);
                    if (result && result.confidence >= this.settings.minConfidence) {
                        results.push(result);
                    }
                } catch (error) {
                    console.error(`检测文件失败: ${file}`, error);
                }
            }
        } catch (error) {
            console.error(`扫描目录失败: ${dirPath}`, error);
        }
        
        return results;
    }

    /**
     * 获取要扫描的文件列表
     */
    private async getFilesToScan(dirPath: string): Promise<string[]> {
        const files: string[] = [];
        
        const scanRecursive = async (currentPath: string, depth: number = 0): Promise<void> => {
            // 限制扫描深度
            if (depth > (this.settings.deepScan ? 10 : 3)) {
                return;
            }
            
            try {
                const entries = fs.readdirSync(currentPath, { withFileTypes: true });
                
                for (const entry of entries) {
                    const fullPath = path.join(currentPath, entry.name);
                    
                    // 检查排除模式
                    if (this.isExcluded(fullPath)) {
                        continue;
                    }
                    
                    if (entry.isDirectory()) {
                        await scanRecursive(fullPath, depth + 1);
                    } else if (entry.isFile() && this.isJsonFile(entry.name)) {
                        files.push(fullPath);
                    }
                }
            } catch (error) {
                console.error(`读取目录失败: ${currentPath}`, error);
            }
        };
        
        await scanRecursive(dirPath);
        return files;
    }

    /**
     * 检查文件是否被排除
     */
    private isExcluded(filePath: string): boolean {
        const relativePath = path.relative(process.cwd(), filePath);
        
        return this.settings.excludePatterns.some(pattern => {
            // 简单的glob模式匹配
            const regex = new RegExp(
                pattern
                    .replace(/\*\*/g, '.*')
                    .replace(/\*/g, '[^/]*')
                    .replace(/\?/g, '[^/]')
            );
            return regex.test(relativePath);
        });
    }

    /**
     * 检查是否是JSON文件
     */
    private isJsonFile(fileName: string): boolean {
        return path.extname(fileName).toLowerCase() === '.json';
    }

    /**
     * 过滤新文件
     */
    private filterNewFiles(results: DetectedFile[]): DetectedFile[] {
        return results.filter(result => {
            const existing = this.detectionHistory.get(result.path);
            
            // 新文件或置信度提高的文件
            return !existing || existing.confidence < result.confidence;
        });
    }

    /**
     * 处理新发现的文件
     */
    private async handleNewFiles(newFiles: DetectedFile[]): Promise<void> {
        // 按置信度排序
        newFiles.sort((a, b) => b.confidence - a.confidence);
        
        const highConfidenceFiles = newFiles.filter(f => f.confidence >= 0.9);
        const mediumConfidenceFiles = newFiles.filter(f => f.confidence >= 0.7 && f.confidence < 0.9);
        
        // 自动导入高置信度文件
        if (this.settings.autoImport && highConfidenceFiles.length > 0) {
            await this.autoImportFiles(highConfidenceFiles);
        }
        
        // 通知用户发现新文件
        if (this.settings.notifyOnNewFiles) {
            await this.notifyNewFiles(newFiles);
        }
    }

    /**
     * 自动导入文件
     */
    private async autoImportFiles(files: DetectedFile[]): Promise<void> {
        let importedCount = 0;
        
        for (const file of files) {
            try {
                const success = await this.importConfigFile(file);
                if (success) {
                    importedCount++;
                }
            } catch (error) {
                console.error(`自动导入文件失败: ${file.path}`, error);
            }
        }
        
        if (importedCount > 0) {
            vscode.window.showInformationMessage(
                `自动导入了 ${importedCount} 个MCP配置文件`
            );
        }
    }

    /**
     * 通知新文件
     */
    private async notifyNewFiles(files: DetectedFile[]): Promise<void> {
        const message = files.length === 1 
            ? `发现新的MCP配置文件: ${path.basename(files[0].path)}`
            : `发现 ${files.length} 个新的MCP配置文件`;
        
        const action = await vscode.window.showInformationMessage(
            message,
            '查看详情',
            '导入全部',
            '忽略'
        );
        
        switch (action) {
            case '查看详情':
                vscode.commands.executeCommand('mcpManager.detectFiles');
                break;
            case '导入全部':
                await this.importAllFiles(files);
                break;
        }
    }

    /**
     * 导入所有文件
     */
    private async importAllFiles(files: DetectedFile[]): Promise<void> {
        let successCount = 0;
        let errorCount = 0;
        
        for (const file of files) {
            try {
                const success = await this.importConfigFile(file);
                if (success) {
                    successCount++;
                } else {
                    errorCount++;
                }
            } catch (error) {
                errorCount++;
                console.error(`导入文件失败: ${file.path}`, error);
            }
        }
        
        const message = `导入完成: ${successCount} 成功, ${errorCount} 失败`;
        if (errorCount > 0) {
            vscode.window.showWarningMessage(message);
        } else {
            vscode.window.showInformationMessage(message);
        }
    }

    /**
     * 导入配置文件
     */
    private async importConfigFile(file: DetectedFile): Promise<boolean> {
        try {
            const content = fs.readFileSync(file.path, 'utf8');
            const config = JSON.parse(content);
            
            // 提取服务配置
            const services = this.extractServices(config, file.type);
            
            if (Object.keys(services).length > 0) {
                const currentConfig = await this.configManager.readConfig('');
                const mergedConfig = { ...currentConfig, mcpServers: { ...currentConfig.mcpServers, ...services } };
                await this.configManager.updateConfig(mergedConfig, '');
                return true;
            }
        } catch (error) {
            console.error(`导入配置文件失败: ${file.path}`, error);
        }
        
        return false;
    }

    /**
     * 提取服务配置
     */
    private extractServices(config: any, type: string): Record<string, MCPService> {
        const services: Record<string, MCPService> = {};
        
        switch (type) {
            case 'claude_desktop':
            case 'cline':
                if (config.mcpServers) {
                    return config.mcpServers;
                }
                break;
            case 'custom':
                if (config.servers) {
                    for (const [id, server] of Object.entries(config.servers as any)) {
                        const serverConfig = server as any;
                        services[id] = {
                            id: id,
                            name: id,
                            command: serverConfig.command || '',
                            args: serverConfig.args || [],
                            env: serverConfig.env || {},
                            disabled: serverConfig.disabled || false
                        };
                    }
                }
                break;
        }
        
        return services;
    }

    /**
     * 更新检测历史
     */
    private updateDetectionHistory(results: DetectedFile[]): void {
        for (const result of results) {
            this.detectionHistory.set(result.path, result);
        }
        
        // 清理过期的历史记录（超过7天）
        const cutoffTime = Date.now() - 7 * 24 * 60 * 60 * 1000;
        for (const [path, result] of this.detectionHistory.entries()) {
            const lastModifiedTime = new Date(result.lastModified).getTime();
            if (lastModifiedTime < cutoffTime) {
                this.detectionHistory.delete(path);
            }
        }
    }

    /**
     * 更新设置
     */
    public updateSettings(newSettings: Partial<AutoDetectionSettings>): void {
        this.settings = { ...this.settings, ...newSettings };
        
        // 如果检测被禁用，停止运行
        if (!this.settings.enabled && this.isRunning) {
            this.stop();
        }
        
        // 如果检测被启用且未运行，启动
        if (this.settings.enabled && !this.isRunning) {
            this.start();
        }
    }

    /**
     * 获取检测统计
     */
    public getStatistics(): {
        isRunning: boolean;
        lastScanTime: number;
        detectedFiles: number;
        watchedPaths: string[];
        settings: AutoDetectionSettings;
    } {
        return {
            isRunning: this.isRunning,
            lastScanTime: this.lastScanTime,
            detectedFiles: this.detectionHistory.size,
            watchedPaths: this.settings.watchPaths,
            settings: this.settings
        };
    }

    /**
     * 手动触发检测
     */
    public async triggerManualDetection(): Promise<DetectedFile[]> {
        const results = await this.scanForMCPFiles();
        const newFiles = this.filterNewFiles(results);
        
        if (newFiles.length > 0) {
            await this.handleNewFiles(newFiles);
        }
        
        this.updateDetectionHistory(results);
        return results;
    }

    /**
     * 清理检测历史
     */
    public clearHistory(): void {
        this.detectionHistory.clear();
        vscode.window.showInformationMessage('检测历史已清理');
    }

    /**
     * 销毁服务
     */
    public dispose(): void {
        this.stop();
        this.statusBarItem.dispose();
        this.detectionHistory.clear();
    }
}