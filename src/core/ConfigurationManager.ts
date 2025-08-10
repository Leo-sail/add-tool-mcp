import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { 
    MCPConfig, 
    MCPServiceConfig, 
    MCPService, 
    ValidationResult, 
    ValidationError, 
    ValidationWarning,
    ConfigMetadata
} from '../types';

/**
     * 配置管理器
     * 负责MCP配置文件的读取、写入、验证和管理
     */
export class ConfigurationManager {
    private configCache: Map<string, MCPConfig> = new Map();
    private readonly encoding = 'utf8';
    private currentConfigPath: string | undefined = undefined;
    private currentConfig: MCPConfig | undefined = undefined;

    /**
     * 读取MCP配置文件
     * @param filePath 配置文件路径
     * @returns 解析后的配置对象
     */
    async readConfig(filePath: string): Promise<MCPConfig> {
        try {
            // 检查缓存
            if (this.configCache.has(filePath)) {
                const cached = this.configCache.get(filePath)!;
                // 检查文件是否被修改
                const stats = await fs.promises.stat(filePath);
                if (cached.metadata?.lastModified === stats.mtime.getTime()) {
                    return cached;
                }
            }

            // 读取文件内容
            const content = await fs.promises.readFile(filePath, this.encoding);
            const config = JSON.parse(content) as MCPConfig;

            // 添加元数据
            const stats = await fs.promises.stat(filePath);
            if (!config.metadata) {
                config.metadata = {
                    createdBy: 'MCP配置管理器',
                    createdAt: stats.birthtime.getTime(),
                    lastModified: stats.mtime.getTime(),
                    version: '1.0.0'
                };
            } else {
                config.metadata.lastModified = stats.mtime.getTime();
            }

            // 缓存配置
            this.configCache.set(filePath, config);
            
            return config;
        } catch (error) {
            throw new Error(`读取配置文件失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * 写入MCP配置文件
     * @param filePath 配置文件路径
     * @param config 配置对象
     * @param backup 是否创建备份
     */
    async writeConfig(filePath: string, config: MCPConfig, backup: boolean = true): Promise<void> {
        try {
            // 创建备份
            if (backup && await this.fileExists(filePath)) {
                await this.createBackup(filePath);
            }

            // 更新元数据
            const now = Date.now();
            if (!config.metadata) {
                config.metadata = {
                    createdBy: 'MCP配置管理器',
                    createdAt: now,
                    lastModified: now,
                    version: '1.0.0'
                };
            } else {
                config.metadata.lastModified = now;
            }

            // 确保目录存在
            const dir = path.dirname(filePath);
            await fs.promises.mkdir(dir, { recursive: true });

            // 格式化JSON并写入文件
            const content = JSON.stringify(config, null, 2);
            await fs.promises.writeFile(filePath, content, this.encoding);

            // 更新缓存
            this.configCache.set(filePath, config);

            console.log(`配置文件已保存: ${filePath}`);
        } catch (error) {
            throw new Error(`写入配置文件失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * 验证MCP配置
     * @param config 配置对象（可选，如果不提供则验证当前配置）
     * @returns 验证结果
     */
    async validateConfig(config?: MCPConfig): Promise<ValidationResult> {
        let configToValidate = config;
        
        if (!configToValidate) {
            configToValidate = await this.getConfig();
            if (!configToValidate) {
                return {
                    isValid: false,
                    errors: [{
                        field: 'config',
                        message: '没有找到配置文件',
                        value: undefined,
                        path: ''
                    }],
                    warnings: []
                };
            }
        }
        
        return this.validateConfigSync(configToValidate);
    }

    /**
     * 同步验证MCP配置
     * @param config 配置对象
     * @returns 验证结果
     */
    private validateConfigSync(config: MCPConfig): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        // 检查必需字段
        if (!config.mcpServers) {
            errors.push({
                field: 'mcpServers',
                message: 'mcpServers字段是必需的',
                value: config.mcpServers
            });
        } else {
            // 验证每个服务配置
            Object.entries(config.mcpServers).forEach(([serviceName, serviceConfig]) => {
                this.validateServiceConfig(serviceName, serviceConfig, errors, warnings);
            });
        }

        // 检查版本格式
        if (config.version && !/^\d+\.\d+(\.\d+)?$/.test(config.version)) {
            warnings.push({
                field: 'version',
                message: '版本号格式建议使用语义化版本（如1.0.0）',
                value: config.version,
                suggestion: '使用x.y.z格式的版本号'
            });
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * 验证单个服务配置
     * @param serviceName 服务名称
     * @param config 服务配置
     * @param errors 错误列表
     * @param warnings 警告列表
     */
    private validateServiceConfig(
        serviceName: string, 
        config: MCPServiceConfig, 
        errors: ValidationError[], 
        warnings: ValidationWarning[]
    ): void {
        const fieldPrefix = `mcpServers.${serviceName}`;

        // 检查必需字段
        if (!config.command) {
            errors.push({
                field: `${fieldPrefix}.command`,
                message: '每个服务必须指定command字段',
                value: config.command
            });
        }

        // 检查args格式
        if (config.args && !Array.isArray(config.args)) {
            errors.push({
                field: `${fieldPrefix}.args`,
                message: 'args字段必须是字符串数组',
                value: config.args
            });
        } else if (config.args) {
            const invalidArgs = config.args.filter(arg => typeof arg !== 'string');
            if (invalidArgs.length > 0) {
                errors.push({
                    field: `${fieldPrefix}.args`,
                    message: 'args数组中的所有元素必须是字符串',
                    value: invalidArgs
                });
            }
        }

        // 检查env格式
        if (config.env && typeof config.env !== 'object') {
            errors.push({
                field: `${fieldPrefix}.env`,
                message: 'env字段必须是对象',
                value: config.env
            });
        } else if (config.env) {
            Object.entries(config.env).forEach(([key, value]) => {
                if (typeof value !== 'string') {
                    errors.push({
                        field: `${fieldPrefix}.env.${key}`,
                        message: '环境变量值必须是字符串',
                        value: value
                    });
                }
            });
        }

        // 检查disabled字段
        if (config.disabled !== undefined && typeof config.disabled !== 'boolean') {
            errors.push({
                field: `${fieldPrefix}.disabled`,
                message: 'disabled字段必须是布尔值',
                value: config.disabled
            });
        }

        // 警告：缺少描述
        if (!config.metadata?.description) {
            warnings.push({
                field: `${fieldPrefix}.metadata.description`,
                message: '建议为服务添加描述信息',
                suggestion: '在metadata中添加description字段'
            });
        }
    }

    /**
     * 获取配置文件中的所有服务
     * @param filePath 配置文件路径
     * @returns 服务列表
     */
    async getServices(filePath: string): Promise<MCPService[]> {
        try {
            const config = await this.readConfig(filePath);
            const services: MCPService[] = [];

            Object.entries(config.mcpServers || {}).forEach(([name, serviceConfig]) => {
                services.push({
                    id: this.generateServiceId(name),
                    name,
                    ...serviceConfig,
                    status: serviceConfig.disabled ? 'inactive' : 'active'
                });
            });

            return services;
        } catch (error) {
            console.error(`获取服务列表失败: ${error}`);
            return [];
        }
    }

    /**
     * 添加服务到配置文件
     * @param filePath 配置文件路径
     * @param serviceName 服务名称
     * @param serviceConfig 服务配置
     */
    async addService(filePath: string, serviceName: string, serviceConfig: MCPServiceConfig): Promise<void> {
        try {
            let config: MCPConfig;
            
            if (await this.fileExists(filePath)) {
                config = await this.readConfig(filePath);
            } else {
                config = {
                    mcpServers: {},
                    version: '1.0'
                };
            }

            // 检查服务名称是否已存在
            if (config.mcpServers[serviceName]) {
                throw new Error(`服务 "${serviceName}" 已存在`);
            }

            // 添加元数据
            if (!serviceConfig.metadata) {
                serviceConfig.metadata = {
                    source: 'manual',
                    lastModified: Date.now()
                };
            }

            config.mcpServers[serviceName] = serviceConfig;
            await this.writeConfig(filePath, config);
        } catch (error) {
            throw new Error(`添加服务失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * 更新服务配置
     * @param filePath 配置文件路径
     * @param serviceName 服务名称
     * @param serviceConfig 新的服务配置
     */
    async updateService(filePath: string, serviceName: string, serviceConfig: MCPServiceConfig): Promise<void> {
        try {
            const config = await this.readConfig(filePath);
            
            if (!config.mcpServers[serviceName]) {
                throw new Error(`服务 "${serviceName}" 不存在`);
            }

            // 更新元数据
            if (!serviceConfig.metadata) {
                serviceConfig.metadata = config.mcpServers[serviceName].metadata || {};
            }
            serviceConfig.metadata.lastModified = Date.now();

            config.mcpServers[serviceName] = serviceConfig;
            await this.writeConfig(filePath, config);
        } catch (error) {
            throw new Error(`更新服务失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * 删除服务
     * @param filePath 配置文件路径
     * @param serviceName 服务名称
     */
    async deleteService(filePath: string, serviceName: string): Promise<void> {
        try {
            const config = await this.readConfig(filePath);
            
            if (!config.mcpServers[serviceName]) {
                throw new Error(`服务 "${serviceName}" 不存在`);
            }

            delete config.mcpServers[serviceName];
            await this.writeConfig(filePath, config);
        } catch (error) {
            throw new Error(`删除服务失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * 移除服务（deleteService的别名）
     */
    async removeService(filePath: string, serviceName: string): Promise<void> {
        return this.deleteService(filePath, serviceName);
    }

    /**
     * 清除缓存
     * @param filePath 可选的文件路径，如果不提供则清除所有缓存
     */
    clearCache(filePath?: string): void {
        if (filePath) {
            this.configCache.delete(filePath);
        } else {
            this.configCache.clear();
        }
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
     * 创建配置文件备份
     * @param filePath 原文件路径
     */
    private async createBackup(filePath: string): Promise<void> {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = `${filePath}.backup.${timestamp}`;
            await fs.promises.copyFile(filePath, backupPath);
            console.log(`已创建备份文件: ${backupPath}`);
        } catch (error) {
            console.warn(`创建备份失败: ${error}`);
        }
    }

    /**
     * 生成服务ID
     * @param serviceName 服务名称
     * @returns 服务ID
     */
    private generateServiceId(serviceName: string): string {
        return `service_${serviceName.replace(/[^a-zA-Z0-9]/g, '_')}`;
    }

    /**
     * 获取当前配置文件路径
     * @returns 当前配置文件路径
     */
    getConfigPath(): string | undefined {
        return this.currentConfigPath || undefined;
    }

    /**
     * 获取当前配置
     * @returns 当前配置对象
     */
    getConfig(): MCPConfig | undefined {
        return this.currentConfig || undefined;
    }

    /**
     * 设置当前配置路径
     * @param filePath 配置文件路径
     */
    setCurrentConfigPath(filePath: string): void {
        this.currentConfigPath = filePath;
    }

    /**
     * 设置当前配置
     * @param config 配置对象
     */
    setCurrentConfig(config: MCPConfig): void {
        this.currentConfig = config;
    }

    /**
     * 更新配置文件
     * @param config 新的配置对象
     * @param filePath 可选的文件路径，如果不提供则使用当前配置路径
     */
    async updateConfig(config: MCPConfig, filePath?: string): Promise<void> {
        const targetPath = filePath || this.currentConfigPath;
        if (!targetPath) {
            throw new Error('没有指定配置文件路径');
        }
        
        await this.writeConfig(targetPath, config);
        this.setCurrentConfig(config);
    }
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