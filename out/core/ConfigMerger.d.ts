import { MCPConfig, ConfigConflict } from '../types';
import { ConfigurationManager } from './ConfigurationManager';
/**
 * 合并策略枚举
 */
export declare enum MergeStrategy {
    OVERWRITE = "overwrite",
    SKIP = "skip",
    MERGE = "merge",
    PROMPT = "prompt"
}
/**
 * 合并选项
 */
export interface MergeOptions {
    strategy: MergeStrategy;
    preserveMetadata: boolean;
    createBackup: boolean;
    validateResult: boolean;
    conflictResolution?: (conflict: ConfigConflict) => 'source' | 'target' | 'merge';
}
/**
 * 合并结果
 */
export interface MergeResult {
    success: boolean;
    config?: MCPConfig;
    conflicts: ConfigConflict[];
    errors: string[];
    warnings: string[];
    stats: {
        totalServices: number;
        addedServices: number;
        updatedServices: number;
        skippedServices: number;
        conflictServices: number;
    };
}
/**
 * 配置合并器
 * 负责智能合并多个MCP配置文件
 */
export declare class ConfigMerger {
    private configManager;
    constructor(configManager: ConfigurationManager);
    /**
     * 合并两个配置文件
     * @param sourceConfig 源配置
     * @param targetConfig 目标配置
     * @param options 合并选项
     * @returns 合并结果
     */
    mergeConfigs(sourceConfig: MCPConfig, targetConfig: MCPConfig, options: MergeOptions): Promise<MergeResult>;
    /**
     * 合并多个配置文件
     * @param configs 配置文件数组
     * @param options 合并选项
     * @returns 合并结果
     */
    mergeMultipleConfigs(configs: MCPConfig[], options: MergeOptions): Promise<MergeResult>;
    /**
     * 检测配置冲突
     * @param sourceConfig 源配置
     * @param targetConfig 目标配置
     * @returns 冲突列表
     */
    detectConflicts(sourceConfig: MCPConfig, targetConfig: MCPConfig): ConfigConflict[];
    /**
     * 解析配置差异
     * @param config1 配置1
     * @param config2 配置2
     * @returns 差异信息
     */
    analyzeDifferences(config1: MCPConfig, config2: MCPConfig): {
        onlyInFirst: string[];
        onlyInSecond: string[];
        different: string[];
        identical: string[];
    };
    /**
     * 合并单个服务配置
     * @param serviceName 服务名称
     * @param sourceService 源服务配置
     * @param targetService 目标服务配置
     * @param options 合并选项
     * @returns 合并结果
     */
    private mergeService;
    /**
     * 检测服务配置冲突
     * @param serviceName 服务名称
     * @param sourceService 源服务配置
     * @param targetService 目标服务配置
     * @returns 冲突信息或null
     */
    private detectServiceConflict;
    /**
     * 合并服务配置
     * @param sourceService 源服务配置
     * @param targetService 目标服务配置
     * @param preserveMetadata 是否保留元数据
     * @returns 合并后的服务配置
     */
    private mergeServiceConfigs;
    /**
     * 合并元数据
     * @param sourceMeta 源元数据
     * @param targetMeta 目标元数据
     * @returns 合并后的元数据
     */
    private mergeMetadata;
    /**
     * 比较版本号
     * @param version1 版本1
     * @param version2 版本2
     * @returns 比较结果（1: version1 > version2, 0: 相等, -1: version1 < version2）
     */
    private compareVersions;
    /**
     * 检查两个数组是否相等
     * @param arr1 数组1
     * @param arr2 数组2
     * @returns 是否相等
     */
    private areArraysEqual;
    /**
     * 检查两个对象是否相等
     * @param obj1 对象1
     * @param obj2 对象2
     * @returns 是否相等
     */
    private areObjectsEqual;
    /**
     * 检查两个服务配置是否相等
     * @param service1 服务配置1
     * @param service2 服务配置2
     * @returns 是否相等
     */
    private areServicesEqual;
}
/**
 * ConfigMerger - 配置合并器
 *
 * @author Leo-拥抱AI
 * @version 1.0.0
 * @description 合并多个MCP配置文件
 * @license MIT
 *
 * © 2024 Leo-拥抱AI. All rights reserved.
 *
 * 专注于AI工具开发，让开发更高效
 */ 
//# sourceMappingURL=ConfigMerger.d.ts.map