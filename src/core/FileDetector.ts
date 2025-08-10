import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { DetectedFile, FileRecommendation, MCPConfig } from '../types';
import { JsonParser } from './JsonParser';

/**
 * 检测选项
 */
export interface DetectionOptions {
    searchPaths: string[];           // 搜索路径
    excludePatterns: string[];       // 排除模式
    maxDepth: number;               // 最大搜索深度
    includeHidden: boolean;         // 是否包含隐藏文件
    followSymlinks: boolean;        // 是否跟随符号链接
    maxFileSize: number;            // 最大文件大小（字节）
}

/**
 * 检测结果
 */
export interface DetectionResult {
    files: DetectedFile[];
    recommendations: FileRecommendation[];
    errors: string[];
    stats: {
        totalScanned: number;
        validConfigs: number;
        invalidConfigs: number;
        skippedFiles: number;
    };
}

/**
 * 文件检测器
 * 负责自动检测工作区中的MCP配置文件
 */
export class FileDetector {
    private jsonParser: JsonParser;
    private readonly defaultOptions: DetectionOptions = {
        searchPaths: [],
        excludePatterns: [
            '**/node_modules/**',
            '**/.*/**',
            '**/*.backup.*',
            '**/*.tmp',
            '**/*.log'
        ],
        maxDepth: 5,
        includeHidden: false,
        followSymlinks: false,
        maxFileSize: 10 * 1024 * 1024 // 10MB
    };

    constructor() {
        this.jsonParser = new JsonParser();
    }

    /**
     * 检测工作区中的MCP配置文件
     * @param options 检测选项
     * @returns 检测结果
     */
    async detectFiles(options?: Partial<DetectionOptions>): Promise<DetectionResult> {
        const finalOptions = { ...this.defaultOptions, ...options };
        const result: DetectionResult = {
            files: [],
            recommendations: [],
            errors: [],
            stats: {
                totalScanned: 0,
                validConfigs: 0,
                invalidConfigs: 0,
                skippedFiles: 0
            }
        };

        try {
            // 获取搜索路径
            const searchPaths = await this.getSearchPaths(finalOptions.searchPaths);
            
            // 扫描每个路径
            for (const searchPath of searchPaths) {
                await this.scanDirectory(searchPath, finalOptions, result, 0);
            }

            // 生成推荐
            result.recommendations = await this.generateRecommendations(result.files);

        } catch (error) {
            result.errors.push(`检测过程中发生错误: ${error instanceof Error ? error.message : String(error)}`);
        }

        return result;
    }

    /**
     * 检测单个文件是否为MCP配置文件
     * @param filePath 文件路径
     * @returns 检测到的文件信息或null
     */
    async detectSingleFile(filePath: string): Promise<DetectedFile | null> {
        try {
            const stats = await fs.promises.stat(filePath);
            
            // 检查文件大小
            if (stats.size > this.defaultOptions.maxFileSize) {
                return null;
            }

            // 检查文件扩展名
            if (!this.isJsonFile(filePath)) {
                return null;
            }

            // 读取并解析文件
            const content = await fs.promises.readFile(filePath, 'utf8');
            const confidence = this.calculateConfidence(filePath, content);
            
            if (confidence === 0) {
                return null;
            }

            let config: MCPConfig | undefined;
            let isValid = false;
            let error: string | undefined;

            try {
                config = this.jsonParser.parseConfig(content, false);
                isValid = true;
            } catch (parseError) {
                error = parseError instanceof Error ? parseError.message : String(parseError);
            }

            const fileType = this.determineFileType(filePath, content);
            return {
                path: filePath,
                name: path.basename(filePath),
                type: fileType === 'mcp_config' ? 'mcp.json' : 'settings.json',
                app: 'unknown',
                hasServers: config?.mcpServers ? Object.keys(config.mcpServers).length > 0 : false,
                serverCount: config?.mcpServers ? Object.keys(config.mcpServers).length : 0,
                size: stats.size,
                lastModified: stats.mtime.toISOString(),
                confidence,
                detectedApp: 'unknown',
                preview: content.substring(0, 200),
                isValid
            };

        } catch (error) {
            return null;
        }
    }

    /**
     * 监控文件变化
     * @param paths 监控路径
     * @param callback 变化回调
     * @returns 文件监控器
     */
    watchFiles(
        paths: string[], 
        callback: (event: 'created' | 'changed' | 'deleted', filePath: string) => void
    ): vscode.FileSystemWatcher[] {
        const watchers: vscode.FileSystemWatcher[] = [];

        for (const watchPath of paths) {
            const pattern = new vscode.RelativePattern(watchPath, '**/*.json');
            const watcher = vscode.workspace.createFileSystemWatcher(pattern);

            watcher.onDidCreate(uri => {
                this.detectSingleFile(uri.fsPath).then(detected => {
                    if (detected && detected.confidence > 0.5) {
                        callback('created', uri.fsPath);
                    }
                });
            });

            watcher.onDidChange(uri => {
                this.detectSingleFile(uri.fsPath).then(detected => {
                    if (detected && detected.confidence > 0.5) {
                        callback('changed', uri.fsPath);
                    }
                });
            });

            watcher.onDidDelete(uri => {
                callback('deleted', uri.fsPath);
            });

            watchers.push(watcher);
        }

        return watchers;
    }

    /**
     * 获取推荐的配置文件位置
     * @returns 推荐位置列表
     */
    async getRecommendedLocations(): Promise<string[]> {
        const locations: string[] = [];
        const workspaceFolders = vscode.workspace.workspaceFolders;

        if (!workspaceFolders) {
            return locations;
        }

        for (const folder of workspaceFolders) {
            const basePath = folder.uri.fsPath;
            
            // 常见的配置文件位置
            const commonLocations = [
                path.join(basePath, 'mcp.json'),
                path.join(basePath, '.mcp.json'),
                path.join(basePath, 'config', 'mcp.json'),
                path.join(basePath, '.config', 'mcp.json'),
                path.join(basePath, 'src', 'mcp.json'),
                path.join(basePath, 'configs', 'mcp.json')
            ];

            for (const location of commonLocations) {
                if (await this.fileExists(location)) {
                    locations.push(location);
                }
            }
        }

        return locations;
    }

    /**
     * 扫描目录
     * @param dirPath 目录路径
     * @param options 检测选项
     * @param result 结果对象
     * @param currentDepth 当前深度
     */
    private async scanDirectory(
        dirPath: string, 
        options: DetectionOptions, 
        result: DetectionResult, 
        currentDepth: number
    ): Promise<void> {
        if (currentDepth >= options.maxDepth) {
            return;
        }

        try {
            const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                
                // 检查排除模式
                if (this.shouldExclude(fullPath, options.excludePatterns)) {
                    result.stats.skippedFiles++;
                    continue;
                }

                // 检查隐藏文件
                if (!options.includeHidden && entry.name.startsWith('.')) {
                    result.stats.skippedFiles++;
                    continue;
                }

                if (entry.isDirectory()) {
                    await this.scanDirectory(fullPath, options, result, currentDepth + 1);
                } else if (entry.isFile() || (entry.isSymbolicLink() && options.followSymlinks)) {
                    result.stats.totalScanned++;
                    
                    const detected = await this.detectSingleFile(fullPath);
                    if (detected) {
                        result.files.push(detected);
                        if (detected.isValid) {
                            result.stats.validConfigs++;
                        } else {
                            result.stats.invalidConfigs++;
                        }
                    }
                }
            }
        } catch (error) {
            result.errors.push(`扫描目录 ${dirPath} 失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * 获取搜索路径
     * @param customPaths 自定义路径
     * @returns 搜索路径列表
     */
    private async getSearchPaths(customPaths: string[]): Promise<string[]> {
        const paths: string[] = [];
        
        // 添加自定义路径
        paths.push(...customPaths);
        
        // 添加工作区路径
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
            for (const folder of workspaceFolders) {
                paths.push(folder.uri.fsPath);
            }
        }
        
        // 去重并验证路径存在性
        const uniquePaths = [...new Set(paths)];
        const validPaths: string[] = [];
        
        for (const path of uniquePaths) {
            if (await this.directoryExists(path)) {
                validPaths.push(path);
            }
        }
        
        return validPaths;
    }

    /**
     * 计算文件为MCP配置的置信度
     * @param filePath 文件路径
     * @param content 文件内容
     * @returns 置信度（0-1）
     */
    private calculateConfidence(filePath: string, content: string): number {
        let confidence = 0;
        
        // 文件名匹配
        const fileName = path.basename(filePath).toLowerCase();
        if (fileName === 'mcp.json') {
            confidence += 0.4;
        } else if (fileName.includes('mcp')) {
            confidence += 0.2;
        } else if (fileName === 'config.json' || fileName === 'configuration.json') {
            confidence += 0.1;
        }
        
        // 内容匹配
        if (content.includes('mcpServers')) {
            confidence += 0.5;
        }
        
        if (content.includes('command') && content.includes('args')) {
            confidence += 0.2;
        }
        
        // 常见MCP相关关键词
        const mcpKeywords = ['mcp', 'server', 'protocol', 'claude', 'anthropic'];
        const keywordMatches = mcpKeywords.filter(keyword => 
            content.toLowerCase().includes(keyword)
        ).length;
        confidence += keywordMatches * 0.05;
        
        // JSON结构检查
        try {
            const parsed = JSON.parse(content);
            if (typeof parsed === 'object' && parsed !== null) {
                confidence += 0.1;
                
                if (parsed.mcpServers && typeof parsed.mcpServers === 'object') {
                    confidence += 0.3;
                }
            }
        } catch {
            // JSON解析失败，降低置信度
            confidence *= 0.5;
        }
        
        return Math.min(confidence, 1);
    }

    /**
     * 确定文件类型
     * @param filePath 文件路径
     * @param content 文件内容
     * @returns 文件类型
     */
    private determineFileType(filePath: string, content: string): 'mcp_config' | 'partial_config' | 'unknown' {
        try {
            const parsed = JSON.parse(content);
            
            if (parsed.mcpServers && typeof parsed.mcpServers === 'object') {
                return 'mcp_config';
            }
            
            // 检查是否包含类似MCP服务的配置
            if (typeof parsed === 'object' && parsed !== null) {
                const hasServiceLikeConfig = Object.values(parsed).some((value: any) => 
                    typeof value === 'object' && 
                    value !== null && 
                    (value.command || value.args || value.env)
                );
                
                if (hasServiceLikeConfig) {
                    return 'partial_config';
                }
            }
        } catch {
            // 解析失败
        }
        
        return 'unknown';
    }

    /**
     * 生成推荐
     * @param files 检测到的文件
     * @returns 推荐列表
     */
    private async generateRecommendations(files: DetectedFile[]): Promise<FileRecommendation[]> {
        const recommendations: FileRecommendation[] = [];
        
        // 按置信度排序
        const sortedFiles = files.sort((a, b) => b.confidence - a.confidence);
        
        // 推荐最佳配置文件
        const bestFile = sortedFiles.find(f => f.isValid && f.confidence > 0.7);
        if (bestFile) {
            recommendations.push({
                type: 'import',
                filePath: bestFile.path,
                message: '这是最可能的主要MCP配置文件',
                action: 'use_as_primary'
            });
        }
        
        // 推荐合并候选文件
        const mergeCandidates = sortedFiles.filter(f => 
            f.isValid && 
            f.confidence > 0.5 && 
            f !== bestFile
        );
        
        for (const candidate of mergeCandidates) {
            recommendations.push({
                type: 'merge',
                filePath: candidate.path,
                message: '此文件包含可能需要合并的MCP配置',
                action: 'consider_merge'
            });
        }
        
        // 推荐修复无效文件
        const invalidFiles = files.filter(f => !f.isValid && f.confidence > 0.3);
        for (const invalid of invalidFiles) {
            recommendations.push({
                type: 'update',
                filePath: invalid.path,
                message: `文件可能是MCP配置但存在错误`,
                action: 'fix_errors'
            });
        }
        
        return recommendations;
    }

    /**
     * 检查是否应该排除文件
     * @param filePath 文件路径
     * @param patterns 排除模式
     * @returns 是否应该排除
     */
    private shouldExclude(filePath: string, patterns: string[]): boolean {
        return patterns.some(pattern => {
            // 简单的glob模式匹配
            const regex = new RegExp(
                pattern
                    .replace(/\*\*/g, '.*')
                    .replace(/\*/g, '[^/]*')
                    .replace(/\?/g, '[^/]')
            );
            return regex.test(filePath);
        });
    }

    /**
     * 检查是否为JSON文件
     * @param filePath 文件路径
     * @returns 是否为JSON文件
     */
    private isJsonFile(filePath: string): boolean {
        return path.extname(filePath).toLowerCase() === '.json';
    }

    /**
     * 检查文件是否存在
     * @param filePath 文件路径
     * @returns 文件是否存在
     */
    private async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.promises.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 检查目录是否存在
     * @param dirPath 目录路径
     * @returns 目录是否存在
     */
    private async directoryExists(dirPath: string): Promise<boolean> {
        try {
            const stats = await fs.promises.stat(dirPath);
            return stats.isDirectory();
        } catch {
            return false;
        }
    }
}

/**
 * FileDetector - MCP配置文件检测器
 * 
 * @author Leo-拥抱AI
 * @version 1.0.0
 * @description 自动检测和分析MCP配置文件
 * @license MIT
 * 
 * © 2024 Leo-拥抱AI. All rights reserved.
 * 
 * 专注于AI工具开发，让开发更高效
 */