import { MCPConfig, MCPServiceConfig, ValidationResult, ValidationError } from '../types';
/**
 * 验证规则类型枚举
 */
export declare enum ValidationRuleType {
    REQUIRED = "required",
    FORMAT = "format",
    TYPE = "type",
    RANGE = "range",
    PATTERN = "pattern",
    CUSTOM = "custom",
    DEPENDENCY = "dependency",
    UNIQUENESS = "uniqueness"
}
/**
 * 验证严重程度枚举
 */
export declare enum ValidationSeverity {
    ERROR = "error",
    WARNING = "warning",
    INFO = "info"
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
export declare class Validator {
    private rules;
    private customValidators;
    private settings;
    constructor();
    /**
     * 加载验证设置
     */
    private loadSettings;
    /**
     * 初始化默认验证规则
     */
    private initializeDefaultRules;
    /**
     * 添加验证规则
     */
    addRule(rule: ValidationRule): void;
    /**
     * 移除验证规则
     */
    removeRule(field: string, type: ValidationRuleType): void;
    /**
     * 添加自定义验证器
     */
    addCustomValidator(name: string, validator: (value: any, context?: any) => boolean): void;
    /**
     * 验证完整配置
     */
    validateConfiguration(config: MCPConfig, filePath?: string): ValidationResult;
    /**
     * 验证单个服务
     */
    validateService(serviceId: string, service: MCPServiceConfig, context?: ValidationContext): ValidationError[];
    /**
     * 验证字段值
     */
    validateField(field: string, value: any, context?: ValidationContext): ValidationError[];
    /**
     * 创建验证错误对象
     */
    private createValidationError;
    /**
     * 验证命令是否存在
     */
    private validateCommandExists;
    /**
     * 生成建议
     */
    private generateSuggestions;
    /**
     * 快速验证（仅检查关键错误）
     */
    quickValidate(config: MCPConfig): boolean;
    /**
     * 获取验证规则
     */
    getRules(): ValidationRule[];
    /**
     * 获取字段的验证规则
     */
    getRulesForField(field: string): ValidationRule[];
    /**
     * 更新设置
     */
    updateSettings(newSettings: Partial<typeof this.settings>): void;
    /**
     * 获取设置
     */
    getSettings(): typeof this.settings;
    /**
     * 重置为默认规则
     */
    resetToDefaults(): void;
    /**
     * 导出验证规则
     */
    exportRules(): any;
    /**
     * 导入验证规则
     */
    importRules(data: any): void;
}
export {};
//# sourceMappingURL=Validator.d.ts.map