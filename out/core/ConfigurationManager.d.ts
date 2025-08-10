import { MCPConfig, MCPServiceConfig, MCPService, ValidationResult } from '../types';
/**
     * 配置管理器
     * 负责MCP配置文件的读取、写入、验证和管理
     */
export declare class ConfigurationManager {
    private configCache;
    private readonly encoding;
    private currentConfigPath;
    private currentConfig;
    /**
     * 读取MCP配置文件
     * @param filePath 配置文件路径
     * @returns 解析后的配置对象
     */
    readConfig(filePath: string): Promise<MCPConfig>;
    /**
     * 写入MCP配置文件
     * @param filePath 配置文件路径
     * @param config 配置对象
     * @param backup 是否创建备份
     */
    writeConfig(filePath: string, config: MCPConfig, backup?: boolean): Promise<void>;
    /**
     * 验证MCP配置
     * @param config 配置对象（可选，如果不提供则验证当前配置）
     * @returns 验证结果
     */
    validateConfig(config?: MCPConfig): Promise<ValidationResult>;
    /**
     * 同步验证MCP配置
     * @param config 配置对象
     * @returns 验证结果
     */
    private validateConfigSync;
    /**
     * 验证单个服务配置
     * @param serviceName 服务名称
     * @param config 服务配置
     * @param errors 错误列表
     * @param warnings 警告列表
     */
    private validateServiceConfig;
    /**
     * 获取配置文件中的所有服务
     * @param filePath 配置文件路径
     * @returns 服务列表
     */
    getServices(filePath: string): Promise<MCPService[]>;
    /**
     * 添加服务到配置文件
     * @param filePath 配置文件路径
     * @param serviceName 服务名称
     * @param serviceConfig 服务配置
     */
    addService(filePath: string, serviceName: string, serviceConfig: MCPServiceConfig): Promise<void>;
    /**
     * 更新服务配置
     * @param filePath 配置文件路径
     * @param serviceName 服务名称
     * @param serviceConfig 新的服务配置
     */
    updateService(filePath: string, serviceName: string, serviceConfig: MCPServiceConfig): Promise<void>;
    /**
     * 删除服务
     * @param filePath 配置文件路径
     * @param serviceName 服务名称
     */
    deleteService(filePath: string, serviceName: string): Promise<void>;
    /**
     * 移除服务（deleteService的别名）
     */
    removeService(filePath: string, serviceName: string): Promise<void>;
    /**
     * 清除缓存
     * @param filePath 可选的文件路径，如果不提供则清除所有缓存
     */
    clearCache(filePath?: string): void;
    /**
     * 检查文件是否存在
     * @param filePath 文件路径
     * @returns 文件是否存在
     */
    private fileExists;
    /**
     * 创建配置文件备份
     * @param filePath 原文件路径
     */
    private createBackup;
    /**
     * 生成服务ID
     * @param serviceName 服务名称
     * @returns 服务ID
     */
    private generateServiceId;
    /**
     * 获取当前配置文件路径
     * @returns 当前配置文件路径
     */
    getConfigPath(): string | undefined;
    /**
     * 获取当前配置
     * @returns 当前配置对象
     */
    getConfig(): MCPConfig | undefined;
    /**
     * 设置当前配置路径
     * @param filePath 配置文件路径
     */
    setCurrentConfigPath(filePath: string): void;
    /**
     * 设置当前配置
     * @param config 配置对象
     */
    setCurrentConfig(config: MCPConfig): void;
    /**
     * 更新配置文件
     * @param config 新的配置对象
     * @param filePath 可选的文件路径，如果不提供则使用当前配置路径
     */
    updateConfig(config: MCPConfig, filePath?: string): Promise<void>;
}
/**
 * ConfigurationManager - MCP配置管理器
 *
 * @author Leo-拥抱AI
 * @version 1.0.0
 * @description 负责MCP配置文件的读取、写入和管理
 * @license MIT
 *
 * © 2024 Leo-拥抱AI. All rights reserved.
 *
 * 专注于AI工具开发，让开发更高效
 */ 
//# sourceMappingURL=ConfigurationManager.d.ts.map