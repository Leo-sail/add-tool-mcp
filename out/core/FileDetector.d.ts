import * as vscode from 'vscode';
import { DetectedFile, FileRecommendation } from '../types';
/**
 * 检测选项
 */
export interface DetectionOptions {
    searchPaths: string[];
    excludePatterns: string[];
    maxDepth: number;
    includeHidden: boolean;
    followSymlinks: boolean;
    maxFileSize: number;
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
export declare class FileDetector {
    private jsonParser;
    private readonly defaultOptions;
    constructor();
    /**
     * 检测工作区中的MCP配置文件
     * @param options 检测选项
     * @returns 检测结果
     */
    detectFiles(options?: Partial<DetectionOptions>): Promise<DetectionResult>;
    /**
     * 检测单个文件是否为MCP配置文件
     * @param filePath 文件路径
     * @returns 检测到的文件信息或null
     */
    detectSingleFile(filePath: string): Promise<DetectedFile | null>;
    /**
     * 监控文件变化
     * @param paths 监控路径
     * @param callback 变化回调
     * @returns 文件监控器
     */
    watchFiles(paths: string[], callback: (event: 'created' | 'changed' | 'deleted', filePath: string) => void): vscode.FileSystemWatcher[];
    /**
     * 获取推荐的配置文件位置
     * @returns 推荐位置列表
     */
    getRecommendedLocations(): Promise<string[]>;
    /**
     * 扫描目录
     * @param dirPath 目录路径
     * @param options 检测选项
     * @param result 结果对象
     * @param currentDepth 当前深度
     */
    private scanDirectory;
    /**
     * 获取搜索路径
     * @param customPaths 自定义路径
     * @returns 搜索路径列表
     */
    private getSearchPaths;
    /**
     * 计算文件为MCP配置的置信度
     * @param filePath 文件路径
     * @param content 文件内容
     * @returns 置信度（0-1）
     */
    private calculateConfidence;
    /**
     * 确定文件类型
     * @param filePath 文件路径
     * @param content 文件内容
     * @returns 文件类型
     */
    private determineFileType;
    /**
     * 生成推荐
     * @param files 检测到的文件
     * @returns 推荐列表
     */
    private generateRecommendations;
    /**
     * 检查是否应该排除文件
     * @param filePath 文件路径
     * @param patterns 排除模式
     * @returns 是否应该排除
     */
    private shouldExclude;
    /**
     * 检查是否为JSON文件
     * @param filePath 文件路径
     * @returns 是否为JSON文件
     */
    private isJsonFile;
    /**
     * 检查文件是否存在
     * @param filePath 文件路径
     * @returns 文件是否存在
     */
    private fileExists;
    /**
     * 检查目录是否存在
     * @param dirPath 目录路径
     * @returns 目录是否存在
     */
    private directoryExists;
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
//# sourceMappingURL=FileDetector.d.ts.map