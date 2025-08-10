import * as path from 'path';
import * as fs from 'fs';
import { MCPConfig, MCPService, MCPServiceConfig, ValidationResult, ValidationError } from '../types';

/**
 * 验证规则类型枚举
 */
export enum ValidationRuleType {
    REQUIRED = 'required',
    FORMAT = 'format',
    TYPE = 'type',
    RANGE = 'range',
    PATTERN = 'pattern',
    CUSTOM = 'custom',
    DEPENDENCY = 'dependency',
    UNIQUENESS = 'uniqueness'
}

/**
 * 验证严重程度枚举
 */
export enum ValidationSeverity {
    ERROR = 'error',
    WARNING = 'warning',
    INFO = 'info'
}

/**
 * 验证规则接口
 */
interface ValidationRule {
    type: ValidationRuleType;
    severity: ValidationSeverity;
    field: string;
    message: string;
    validator: (value: any, context?: any) => boolean;
    suggestion?: string;
}

/**
 * 验证上下文接口
 */
interface ValidationContext {
    configuration?: MCPConfig;
    filePath?: string;
    serviceId?: string;
    field?: string;
    value?: any;
}

/**
 * 验证器类
 * 负责验证MCP配置的完整性和正确性
 */
export class Validator {
    private rules: ValidationRule[] = [];
    private customValidators: Map<string, (value: any, context?: any) => boolean> = new Map();
    private settings: {
        enableStrictMode: boolean;
        enableWarnings: boolean;
        enableSuggestions: boolean;
        maxErrors: number;
    };

    constructor() {
        this.settings = this.loadSettings();
        this.initializeDefaultRules();
    }

    /**
     * 加载验证设置
     */
    private loadSettings() {
        // 这里可以从VS Code配置中加载设置
        return {
            enableStrictMode: true,
            enableWarnings: true,
            enableSuggestions: true,
            maxErrors: 50
        };
    }

    /**
     * 初始化默认验证规则
     */
    private initializeDefaultRules(): void {
        // 配置结构验证
        this.addRule({
            type: ValidationRuleType.REQUIRED,
            severity: ValidationSeverity.ERROR,
            field: 'mcpServers',
            message: 'MCP配置必须包含mcpServers字段',
            validator: (config: MCPConfig) => {
                return config && typeof config === 'object' && 'mcpServers' in config;
            },
            suggestion: '添加mcpServers字段到配置根级别'
        });

        // 服务ID验证
        this.addRule({
            type: ValidationRuleType.PATTERN,
            severity: ValidationSeverity.ERROR,
            field: 'serviceId',
            message: '服务ID必须是有效的标识符',
            validator: (serviceId: string) => {
                return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(serviceId);
            },
            suggestion: '使用字母开头，只包含字母、数字、下划线和连字符的标识符'
        });

        // 服务ID唯一性验证
        this.addRule({
            type: ValidationRuleType.UNIQUENESS,
            severity: ValidationSeverity.ERROR,
            field: 'serviceId',
            message: '服务ID必须唯一',
            validator: (serviceId: string, context: ValidationContext) => {
                if (!context.configuration?.mcpServers) return true;
                const ids = Object.keys(context.configuration.mcpServers);
                return ids.filter(id => id === serviceId).length <= 1;
            },
            suggestion: '使用不同的服务ID'
        });

        // 命令字段验证
        this.addRule({
            type: ValidationRuleType.REQUIRED,
            severity: ValidationSeverity.ERROR,
            field: 'command',
            message: '服务必须指定command字段',
            validator: (service: MCPServiceConfig) => {
                return service && typeof service.command === 'string' && service.command.trim().length > 0;
            },
            suggestion: '添加有效的command字段'
        });

        // 命令可执行性验证
        this.addRule({
            type: ValidationRuleType.CUSTOM,
            severity: ValidationSeverity.WARNING,
            field: 'command',
            message: '命令可能不存在或不可执行',
            validator: (service: MCPServiceConfig) => {
                if (!service.command) return false;
                return this.validateCommandExists(service.command);
            },
            suggestion: '检查命令路径是否正确，或确保命令在PATH环境变量中'
        });

        // 参数类型验证
        this.addRule({
            type: ValidationRuleType.TYPE,
            severity: ValidationSeverity.ERROR,
            field: 'args',
            message: 'args字段必须是字符串数组',
            validator: (service: MCPServiceConfig) => {
                if (!service.args) return true; // args是可选的
                return Array.isArray(service.args) && service.args.every((arg: any) => typeof arg === 'string');
            },
            suggestion: '确保args是字符串数组，例如: ["--option", "value"]'
        });

        // 环境变量验证
        this.addRule({
            type: ValidationRuleType.TYPE,
            severity: ValidationSeverity.ERROR,
            field: 'env',
            message: 'env字段必须是字符串键值对对象',
            validator: (service: MCPServiceConfig) => {
                if (!service.env) return true; // env是可选的
                if (typeof service.env !== 'object' || Array.isArray(service.env)) return false;
                return Object.entries(service.env).every(
                    ([key, value]) => typeof key === 'string' && typeof value === 'string'
                );
            },
            suggestion: '确保env是对象，包含字符串键值对，例如: {"KEY": "value"}'
        });

        // 环境变量名称验证
        this.addRule({
            type: ValidationRuleType.PATTERN,
            severity: ValidationSeverity.WARNING,
            field: 'env',
            message: '环境变量名称应遵循命名约定',
            validator: (service: MCPServiceConfig) => {
                if (!service.env) return true;
                return Object.keys(service.env).every(key => /^[A-Z][A-Z0-9_]*$/.test(key));
            },
            suggestion: '使用大写字母和下划线的环境变量名称，例如: API_KEY'
        });

        // 禁用状态验证
        this.addRule({
            type: ValidationRuleType.TYPE,
            severity: ValidationSeverity.ERROR,
            field: 'disabled',
            message: 'disabled字段必须是布尔值',
            validator: (service: MCPServiceConfig) => {
                if (service.disabled === undefined) return true;
                return typeof service.disabled === 'boolean';
            },
            suggestion: '使用true或false作为disabled字段的值'
        });

        // 工作目录验证
        this.addRule({
            type: ValidationRuleType.CUSTOM,
            severity: ValidationSeverity.WARNING,
            field: 'cwd',
            message: '工作目录不存在',
            validator: (service: MCPServiceConfig) => {
                if (!service.cwd) return true;
                return fs.existsSync(service.cwd);
            },
            suggestion: '确保指定的工作目录存在'
        });

        // 超时设置验证
        this.addRule({
            type: ValidationRuleType.RANGE,
            severity: ValidationSeverity.WARNING,
            field: 'timeout',
            message: '超时设置应在合理范围内',
            validator: (service: MCPServiceConfig) => {
                if (!service.timeout) return true;
                const timeout = Number(service.timeout);
                return !isNaN(timeout) && timeout > 0 && timeout <= 300000; // 最大5分钟
            },
            suggestion: '设置合理的超时时间（1-300000毫秒）'
        });
    }

    /**
     * 添加验证规则
     */
    public addRule(rule: ValidationRule): void {
        this.rules.push(rule);
    }

    /**
     * 移除验证规则
     */
    public removeRule(field: string, type: ValidationRuleType): void {
        this.rules = this.rules.filter(rule => !(rule.field === field && rule.type === type));
    }

    /**
     * 添加自定义验证器
     */
    public addCustomValidator(
        name: string,
        validator: (value: any, context?: any) => boolean
    ): void {
        this.customValidators.set(name, validator);
    }

    /**
     * 验证完整配置
     */
    public validateConfiguration(config: MCPConfig, filePath?: string): ValidationResult {
        const errors: ValidationError[] = [];
        const context: ValidationContext = {
            configuration: config,
            filePath
        };

        // 验证配置结构
        for (const rule of this.rules) {
            if (rule.field === 'mcpServers' || rule.field === 'serviceId') {
                const isValid = rule.validator(config, context);
                if (!isValid) {
                    errors.push(this.createValidationError(rule, config, context));
                }
            }
        }

        // 验证每个服务
        if (config.mcpServers) {
            for (const [serviceId, service] of Object.entries(config.mcpServers)) {
                const serviceErrors = this.validateService(serviceId, service, context);
                errors.push(...serviceErrors);
            }
        }

        // 限制错误数量
        const limitedErrors = errors.slice(0, this.settings.maxErrors);
        
        return {
            isValid: limitedErrors.filter(e => e.severity === ValidationSeverity.ERROR).length === 0,
            errors: limitedErrors,
            warnings: limitedErrors.filter(e => e.severity === ValidationSeverity.WARNING),
            suggestions: this.generateSuggestions(limitedErrors)
        };
    }

    /**
     * 验证单个服务
     */
    public validateService(
        serviceId: string,
        service: MCPServiceConfig,
        context?: ValidationContext
    ): ValidationError[] {
        const errors: ValidationError[] = [];
        const serviceContext: ValidationContext = {
            ...context,
            serviceId,
            configuration: context?.configuration || { mcpServers: { [serviceId]: service } }
        };

        // 验证服务ID
        for (const rule of this.rules) {
            if (rule.field === 'serviceId') {
                const isValid = rule.validator(serviceId, serviceContext);
                if (!isValid) {
                    errors.push(this.createValidationError(rule, serviceId, serviceContext));
                }
            }
        }

        // 验证服务字段
        for (const rule of this.rules) {
            if (['command', 'args', 'env', 'disabled', 'cwd', 'timeout'].includes(rule.field)) {
                const isValid = rule.validator(service, serviceContext);
                if (!isValid) {
                    errors.push(this.createValidationError(rule, service, serviceContext));
                }
            }
        }

        return errors;
    }

    /**
     * 验证字段值
     */
    public validateField(
        field: string,
        value: any,
        context?: ValidationContext
    ): ValidationError[] {
        const errors: ValidationError[] = [];
        const fieldContext: ValidationContext = {
            ...context,
            field,
            value
        };

        for (const rule of this.rules) {
            if (rule.field === field) {
                const isValid = rule.validator(value, fieldContext);
                if (!isValid) {
                    errors.push(this.createValidationError(rule, value, fieldContext));
                }
            }
        }

        return errors;
    }

    /**
     * 创建验证错误对象
     */
    private createValidationError(
        rule: ValidationRule,
        value: any,
        context: ValidationContext
    ): ValidationError {
        return {
            field: rule.field,
            message: rule.message,
            value,
            path: context.filePath
        };
    }

    /**
     * 验证命令是否存在
     */
    private validateCommandExists(command: string): boolean {
        try {
            // 检查是否是绝对路径
            if (path.isAbsolute(command)) {
                return fs.existsSync(command);
            }

            // 检查是否在PATH中
            const { execSync } = require('child_process');
            const isWindows = process.platform === 'win32';
            const cmd = isWindows ? `where ${command}` : `which ${command}`;
            
            try {
                execSync(cmd, { stdio: 'ignore' });
                return true;
            } catch {
                return false;
            }
        } catch {
            return false;
        }
    }

    /**
     * 生成建议
     */
    private generateSuggestions(errors: ValidationError[]): string[] {
        const suggestions: string[] = [];
        const suggestionSet = new Set<string>();

        for (const error of errors) {
            if (error.suggestion && !suggestionSet.has(error.suggestion)) {
                suggestions.push(error.suggestion);
                suggestionSet.add(error.suggestion);
            }
        }

        // 添加通用建议
        if (errors.some(e => e.type === ValidationRuleType.REQUIRED)) {
            const suggestion = '确保所有必需字段都已填写';
            if (!suggestionSet.has(suggestion)) {
                suggestions.push(suggestion);
            }
        }

        if (errors.some(e => e.type === ValidationRuleType.FORMAT)) {
            const suggestion = '检查字段格式是否符合要求';
            if (!suggestionSet.has(suggestion)) {
                suggestions.push(suggestion);
            }
        }

        return suggestions;
    }

    /**
     * 快速验证（仅检查关键错误）
     */
    public quickValidate(config: MCPConfig): boolean {
        if (!config || typeof config !== 'object') {
            return false;
        }

        if (!config.mcpServers || typeof config.mcpServers !== 'object') {
            return false;
        }

        for (const [serviceId, service] of Object.entries(config.mcpServers)) {
            // 检查服务ID
            if (!serviceId || typeof serviceId !== 'string') {
                return false;
            }

            // 检查必需字段
            if (!service || typeof service !== 'object') {
                return false;
            }

            if (!service.command || typeof service.command !== 'string') {
                return false;
            }
        }

        return true;
    }

    /**
     * 获取验证规则
     */
    public getRules(): ValidationRule[] {
        return [...this.rules];
    }

    /**
     * 获取字段的验证规则
     */
    public getRulesForField(field: string): ValidationRule[] {
        return this.rules.filter(rule => rule.field === field);
    }

    /**
     * 更新设置
     */
    public updateSettings(newSettings: Partial<typeof this.settings>): void {
        this.settings = { ...this.settings, ...newSettings };
    }

    /**
     * 获取设置
     */
    public getSettings(): typeof this.settings {
        return { ...this.settings };
    }

    /**
     * 重置为默认规则
     */
    public resetToDefaults(): void {
        this.rules = [];
        this.customValidators.clear();
        this.initializeDefaultRules();
    }

    /**
     * 导出验证规则
     */
    public exportRules(): any {
        return {
            rules: this.rules.map(rule => ({
                type: rule.type,
                severity: rule.severity,
                field: rule.field,
                message: rule.message,
                suggestion: rule.suggestion
            })),
            settings: this.settings
        };
    }

    /**
     * 导入验证规则
     */
    public importRules(data: any): void {
        if (data.rules && Array.isArray(data.rules)) {
            // 注意：这里不能直接导入validator函数，需要重新构建
            console.warn('导入验证规则时，validator函数需要重新定义');
        }

        if (data.settings) {
            this.updateSettings(data.settings);
        }
    }
}