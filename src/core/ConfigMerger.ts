import { 
    MCPConfig, 
    MCPServiceConfig, 
    ConfigConflict, 
    ValidationResult,
    ValidationError,
    ValidationWarning
} from '../types';
import { ConfigurationManager } from './ConfigurationManager';

/**
 * 合并策略枚举
 */
export enum MergeStrategy {
    OVERWRITE = 'overwrite',     // 覆盖策略
    SKIP = 'skip',               // 跳过策略
    MERGE = 'merge',             // 合并策略
    PROMPT = 'prompt'            // 提示用户策略
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
export class ConfigMerger {
    private configManager: ConfigurationManager;

    constructor(configManager: ConfigurationManager) {
        this.configManager = configManager;
    }

    /**
     * 合并两个配置文件
     * @param sourceConfig 源配置
     * @param targetConfig 目标配置
     * @param options 合并选项
     * @returns 合并结果
     */
    async mergeConfigs(
        sourceConfig: MCPConfig, 
        targetConfig: MCPConfig, 
        options: MergeOptions
    ): Promise<MergeResult> {
        const result: MergeResult = {
            success: false,
            conflicts: [],
            errors: [],
            warnings: [],
            stats: {
                totalServices: 0,
                addedServices: 0,
                updatedServices: 0,
                skippedServices: 0,
                conflictServices: 0
            }
        };

        try {
            // 创建合并后的配置
            const mergedConfig: MCPConfig = {
                ...targetConfig,
                mcpServers: { ...targetConfig.mcpServers }
            };

            // 合并版本信息
            if (sourceConfig.version && (!targetConfig.version || this.compareVersions(sourceConfig.version, targetConfig.version) > 0)) {
                mergedConfig.version = sourceConfig.version;
            }

            // 合并元数据
            if (options.preserveMetadata) {
                mergedConfig.metadata = this.mergeMetadata(sourceConfig.metadata, targetConfig.metadata);
            }

            // 合并服务配置
            const sourceServices = sourceConfig.mcpServers || {};
            result.stats.totalServices = Object.keys(sourceServices).length;

            for (const [serviceName, serviceConfig] of Object.entries(sourceServices)) {
                const mergeServiceResult = await this.mergeService(
                    serviceName,
                    serviceConfig,
                    mergedConfig.mcpServers[serviceName],
                    options
                );

                if (mergeServiceResult.conflict) {
                    result.conflicts.push(mergeServiceResult.conflict);
                    result.stats.conflictServices++;
                } else if (mergeServiceResult.action === 'add') {
                    mergedConfig.mcpServers[serviceName] = mergeServiceResult.config!;
                    result.stats.addedServices++;
                } else if (mergeServiceResult.action === 'update') {
                    mergedConfig.mcpServers[serviceName] = mergeServiceResult.config!;
                    result.stats.updatedServices++;
                } else if (mergeServiceResult.action === 'skip') {
                    result.stats.skippedServices++;
                }

                if (mergeServiceResult.warnings) {
                    result.warnings.push(...mergeServiceResult.warnings);
                }
            }

            // 验证合并结果
            if (options.validateResult) {
                const validation = await this.configManager.validateConfig(mergedConfig);
                if (!validation.isValid) {
                    result.errors.push(...validation.errors.map(e => e.message));
                }
                if (validation.warnings) {
                    result.warnings.push(...validation.warnings.map(w => w.message));
                }
            }

            result.config = mergedConfig;
            result.success = result.errors.length === 0;

        } catch (error) {
            result.errors.push(`合并配置失败: ${error instanceof Error ? error.message : String(error)}`);
        }

        return result;
    }

    /**
     * 合并多个配置文件
     * @param configs 配置文件数组
     * @param options 合并选项
     * @returns 合并结果
     */
    async mergeMultipleConfigs(configs: MCPConfig[], options: MergeOptions): Promise<MergeResult> {
        if (configs.length === 0) {
            throw new Error('至少需要一个配置文件');
        }

        if (configs.length === 1) {
            return {
                success: true,
                config: configs[0],
                conflicts: [],
                errors: [],
                warnings: [],
                stats: {
                    totalServices: Object.keys(configs[0].mcpServers || {}).length,
                    addedServices: 0,
                    updatedServices: 0,
                    skippedServices: 0,
                    conflictServices: 0
                }
            };
        }

        let result = configs[0];
        let finalResult: MergeResult = {
            success: true,
            config: result,
            conflicts: [],
            errors: [],
            warnings: [],
            stats: {
                totalServices: 0,
                addedServices: 0,
                updatedServices: 0,
                skippedServices: 0,
                conflictServices: 0
            }
        };

        for (let i = 1; i < configs.length; i++) {
            const mergeResult = await this.mergeConfigs(configs[i], result, options);
            
            if (!mergeResult.success) {
                finalResult.success = false;
                finalResult.errors.push(...mergeResult.errors);
            }
            
            finalResult.conflicts.push(...mergeResult.conflicts);
            finalResult.warnings.push(...mergeResult.warnings);
            
            // 累加统计信息
            finalResult.stats.totalServices += mergeResult.stats.totalServices;
            finalResult.stats.addedServices += mergeResult.stats.addedServices;
            finalResult.stats.updatedServices += mergeResult.stats.updatedServices;
            finalResult.stats.skippedServices += mergeResult.stats.skippedServices;
            finalResult.stats.conflictServices += mergeResult.stats.conflictServices;
            
            if (mergeResult.config) {
                result = mergeResult.config;
            }
        }

        finalResult.config = result;
        return finalResult;
    }

    /**
     * 检测配置冲突
     * @param sourceConfig 源配置
     * @param targetConfig 目标配置
     * @returns 冲突列表
     */
    detectConflicts(sourceConfig: MCPConfig, targetConfig: MCPConfig): ConfigConflict[] {
        const conflicts: ConfigConflict[] = [];
        const sourceServices = sourceConfig.mcpServers || {};
        const targetServices = targetConfig.mcpServers || {};

        for (const [serviceName, sourceService] of Object.entries(sourceServices)) {
            const targetService = targetServices[serviceName];
            
            if (targetService) {
                const conflict = this.detectServiceConflict(serviceName, sourceService, targetService);
                if (conflict) {
                    conflicts.push(conflict);
                }
            }
        }

        return conflicts;
    }

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
    } {
        const services1 = Object.keys(config1.mcpServers || {});
        const services2 = Object.keys(config2.mcpServers || {});
        
        const onlyInFirst = services1.filter(name => !services2.includes(name));
        const onlyInSecond = services2.filter(name => !services1.includes(name));
        const common = services1.filter(name => services2.includes(name));
        
        const different: string[] = [];
        const identical: string[] = [];
        
        for (const serviceName of common) {
            const service1 = config1.mcpServers![serviceName];
            const service2 = config2.mcpServers![serviceName];
            
            if (this.areServicesEqual(service1, service2)) {
                identical.push(serviceName);
            } else {
                different.push(serviceName);
            }
        }
        
        return { onlyInFirst, onlyInSecond, different, identical };
    }

    /**
     * 合并单个服务配置
     * @param serviceName 服务名称
     * @param sourceService 源服务配置
     * @param targetService 目标服务配置
     * @param options 合并选项
     * @returns 合并结果
     */
    private async mergeService(
        serviceName: string,
        sourceService: MCPServiceConfig,
        targetService: MCPServiceConfig | undefined,
        options: MergeOptions
    ): Promise<{
        action: 'add' | 'update' | 'skip';
        config?: MCPServiceConfig;
        conflict?: ConfigConflict;
        warnings?: string[];
    }> {
        const warnings: string[] = [];

        // 如果目标服务不存在，直接添加
        if (!targetService) {
            return {
                action: 'add',
                config: { ...sourceService }
            };
        }

        // 检测冲突
        const conflict = this.detectServiceConflict(serviceName, sourceService, targetService);
        
        if (!conflict) {
            // 没有冲突，可以安全合并
            return {
                action: 'update',
                config: this.mergeServiceConfigs(sourceService, targetService, options.preserveMetadata)
            };
        }

        // 处理冲突
        switch (options.strategy) {
            case MergeStrategy.OVERWRITE:
                return {
                    action: 'update',
                    config: { ...sourceService },
                    warnings: [`服务 "${serviceName}" 已被覆盖`]
                };
                
            case MergeStrategy.SKIP:
                return {
                    action: 'skip',
                    warnings: [`跳过冲突的服务 "${serviceName}"`]
                };
                
            case MergeStrategy.MERGE:
                return {
                    action: 'update',
                    config: this.mergeServiceConfigs(sourceService, targetService, options.preserveMetadata),
                    warnings: [`强制合并服务 "${serviceName}"，可能存在配置冲突`]
                };
                
            case MergeStrategy.PROMPT:
            default:
                return {
                    action: 'skip',
                    conflict
                };
        }
    }

    /**
     * 检测服务配置冲突
     * @param serviceName 服务名称
     * @param sourceService 源服务配置
     * @param targetService 目标服务配置
     * @returns 冲突信息或null
     */
    private detectServiceConflict(
        serviceName: string,
        sourceService: MCPServiceConfig,
        targetService: MCPServiceConfig
    ): ConfigConflict | null {
        const conflicts: string[] = [];

        // 检查命令冲突
        if (sourceService.command !== targetService.command) {
            conflicts.push('command');
        }

        // 检查参数冲突
        if (!this.areArraysEqual(sourceService.args, targetService.args)) {
            conflicts.push('args');
        }

        // 检查环境变量冲突
        if (!this.areObjectsEqual(sourceService.env, targetService.env)) {
            conflicts.push('env');
        }

        // 检查禁用状态冲突
        if (sourceService.disabled !== targetService.disabled) {
            conflicts.push('disabled');
        }

        if (conflicts.length === 0) {
            return null;
        }

        return {
            id: `conflict_${serviceName}_${Date.now()}`,
            serviceName,
            type: 'different-config',
            sourceConfig: sourceService,
            targetConfig: targetService,
            description: `服务 "${serviceName}" 在以下字段存在冲突: ${conflicts.join(', ')}`,
            path: '',
            values: {
                source: sourceService,
                target: targetService
            }
        };
    }

    /**
     * 合并服务配置
     * @param sourceService 源服务配置
     * @param targetService 目标服务配置
     * @param preserveMetadata 是否保留元数据
     * @returns 合并后的服务配置
     */
    private mergeServiceConfigs(
        sourceService: MCPServiceConfig,
        targetService: MCPServiceConfig,
        preserveMetadata: boolean
    ): MCPServiceConfig {
        const merged: MCPServiceConfig = {
            ...targetService,
            ...sourceService
        };

        // 合并环境变量
        if (sourceService.env || targetService.env) {
            merged.env = {
                ...targetService.env,
                ...sourceService.env
            };
        }

        // 合并元数据
        if (preserveMetadata) {
            merged.metadata = this.mergeMetadata(sourceService.metadata, targetService.metadata);
        }

        return merged;
    }

    /**
     * 合并元数据
     * @param sourceMeta 源元数据
     * @param targetMeta 目标元数据
     * @returns 合并后的元数据
     */
    private mergeMetadata(sourceMeta: any, targetMeta: any): any {
        if (!sourceMeta && !targetMeta) {
            return undefined;
        }
        
        return {
            ...targetMeta,
            ...sourceMeta,
            lastModified: Date.now()
        };
    }

    /**
     * 比较版本号
     * @param version1 版本1
     * @param version2 版本2
     * @returns 比较结果（1: version1 > version2, 0: 相等, -1: version1 < version2）
     */
    private compareVersions(version1: string, version2: string): number {
        const v1Parts = version1.split('.').map(Number);
        const v2Parts = version2.split('.').map(Number);
        
        const maxLength = Math.max(v1Parts.length, v2Parts.length);
        
        for (let i = 0; i < maxLength; i++) {
            const v1Part = v1Parts[i] || 0;
            const v2Part = v2Parts[i] || 0;
            
            if (v1Part > v2Part) return 1;
            if (v1Part < v2Part) return -1;
        }
        
        return 0;
    }

    /**
     * 检查两个数组是否相等
     * @param arr1 数组1
     * @param arr2 数组2
     * @returns 是否相等
     */
    private areArraysEqual(arr1: any[] | undefined, arr2: any[] | undefined): boolean {
        if (!arr1 && !arr2) return true;
        if (!arr1 || !arr2) return false;
        if (arr1.length !== arr2.length) return false;
        
        return arr1.every((item, index) => item === arr2[index]);
    }

    /**
     * 检查两个对象是否相等
     * @param obj1 对象1
     * @param obj2 对象2
     * @returns 是否相等
     */
    private areObjectsEqual(obj1: any, obj2: any): boolean {
        if (!obj1 && !obj2) return true;
        if (!obj1 || !obj2) return false;
        
        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);
        
        if (keys1.length !== keys2.length) return false;
        
        return keys1.every(key => obj1[key] === obj2[key]);
    }

    /**
     * 检查两个服务配置是否相等
     * @param service1 服务配置1
     * @param service2 服务配置2
     * @returns 是否相等
     */
    private areServicesEqual(service1: MCPServiceConfig, service2: MCPServiceConfig): boolean {
        return service1.command === service2.command &&
               this.areArraysEqual(service1.args, service2.args) &&
               this.areObjectsEqual(service1.env, service2.env) &&
               service1.disabled === service2.disabled;
    }
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