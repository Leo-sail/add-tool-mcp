import { MCPConfig, MCPServiceConfig, ValidationResult, ValidationError } from '../types';

/**
 * JSON解析器
 * 负责解析和处理各种格式的JSON配置文件
 */
export class JsonParser {
    private readonly maxDepth = 10;
    private readonly maxSize = 10 * 1024 * 1024; // 10MB

    /**
     * 解析JSON字符串为MCP配置
     * @param jsonString JSON字符串
     * @param strict 是否严格模式
     * @returns 解析后的配置对象
     */
    parseConfig(jsonString: string, strict: boolean = false): MCPConfig {
        try {
            // 检查文件大小
            if (jsonString.length > this.maxSize) {
                throw new Error(`JSON文件过大，超过${this.maxSize / 1024 / 1024}MB限制`);
            }

            // 预处理JSON字符串
            const cleanedJson = this.preprocessJson(jsonString, strict);
            
            // 解析JSON
            const parsed = JSON.parse(cleanedJson);
            
            // 验证解析深度
            this.validateDepth(parsed, 0);
            
            // 转换为MCP配置格式
            return this.convertToMCPConfig(parsed);
        } catch (error) {
            if (error instanceof SyntaxError) {
                throw new Error(`JSON语法错误: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * 将对象序列化为格式化的JSON字符串
     * @param config 配置对象
     * @param indent 缩进空格数
     * @returns 格式化的JSON字符串
     */
    stringify(config: MCPConfig, indent: number = 2): string {
        try {
            return JSON.stringify(config, this.jsonReplacer, indent);
        } catch (error) {
            throw new Error(`序列化JSON失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * 解析剪贴板内容
     * @param clipboardText 剪贴板文本
     * @returns 解析结果
     */
    parseClipboard(clipboardText: string): { config?: MCPConfig; services?: MCPServiceConfig[]; error?: string } {
        try {
            const trimmed = clipboardText.trim();
            
            // 尝试解析为完整配置
            if (trimmed.startsWith('{') && trimmed.includes('mcpServers')) {
                const config = this.parseConfig(trimmed, false);
                return { config };
            }
            
            // 尝试解析为服务配置数组
            if (trimmed.startsWith('[')) {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    const services = parsed.filter(item => this.isValidServiceConfig(item));
                    return { services };
                }
            }
            
            // 尝试解析为单个服务配置
            if (trimmed.startsWith('{')) {
                const parsed = JSON.parse(trimmed);
                if (this.isValidServiceConfig(parsed)) {
                    return { services: [parsed] };
                }
            }
            
            // 尝试解析为服务对象（键值对形式）
            const serviceObject = this.parseServiceObject(trimmed);
            if (serviceObject) {
                return { services: Object.values(serviceObject) };
            }
            
            return { error: '无法识别的配置格式' };
        } catch (error) {
            return { error: `解析失败: ${error instanceof Error ? error.message : String(error)}` };
        }
    }

    /**
     * 验证JSON结构
     * @param jsonString JSON字符串
     * @returns 验证结果
     */
    validateJson(jsonString: string): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: any[] = [];

        try {
            // 基本语法检查
            JSON.parse(jsonString);
            
            // 检查常见问题
            this.checkCommonIssues(jsonString, errors, warnings);
            
        } catch (error) {
            if (error instanceof SyntaxError) {
                errors.push({
                    field: 'json',
                    message: `JSON语法错误: ${error.message}`,
                    value: jsonString.substring(0, 100) + '...'
                });
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * 修复常见的JSON问题
     * @param jsonString 原始JSON字符串
     * @returns 修复后的JSON字符串
     */
    fixCommonIssues(jsonString: string): string {
        let fixed = jsonString;
        
        // 移除注释
        fixed = this.removeComments(fixed);
        
        // 修复尾随逗号
        fixed = this.fixTrailingCommas(fixed);
        
        // 修复单引号
        fixed = this.fixSingleQuotes(fixed);
        
        // 修复未引用的键
        fixed = this.fixUnquotedKeys(fixed);
        
        return fixed;
    }

    /**
     * 预处理JSON字符串
     * @param jsonString 原始JSON字符串
     * @param strict 是否严格模式
     * @returns 处理后的JSON字符串
     */
    private preprocessJson(jsonString: string, strict: boolean): string {
        let processed = jsonString.trim();
        
        if (!strict) {
            processed = this.fixCommonIssues(processed);
        }
        
        return processed;
    }

    /**
     * 验证对象深度
     * @param obj 要验证的对象
     * @param currentDepth 当前深度
     */
    private validateDepth(obj: any, currentDepth: number): void {
        if (currentDepth > this.maxDepth) {
            throw new Error(`对象嵌套深度超过限制(${this.maxDepth})`);
        }
        
        if (typeof obj === 'object' && obj !== null) {
            for (const value of Object.values(obj)) {
                this.validateDepth(value, currentDepth + 1);
            }
        }
    }

    /**
     * 转换为MCP配置格式
     * @param parsed 解析后的对象
     * @returns MCP配置对象
     */
    private convertToMCPConfig(parsed: any): MCPConfig {
        // 如果已经是MCP配置格式
        if (parsed.mcpServers) {
            return parsed as MCPConfig;
        }
        
        // 如果是服务对象格式，转换为MCP配置
        if (typeof parsed === 'object' && !Array.isArray(parsed)) {
            const hasServiceLikeProperties = Object.values(parsed).some((value: any) => 
                typeof value === 'object' && 
                value !== null && 
                (value.command || value.args || value.env)
            );
            
            if (hasServiceLikeProperties) {
                return {
                    mcpServers: parsed,
                    version: '1.0'
                };
            }
        }
        
        throw new Error('无法识别的配置格式，请确保包含mcpServers字段');
    }

    /**
     * 检查是否为有效的服务配置
     * @param obj 要检查的对象
     * @returns 是否为有效的服务配置
     */
    private isValidServiceConfig(obj: any): boolean {
        return typeof obj === 'object' && 
               obj !== null && 
               (obj.command || obj.args || obj.env);
    }

    /**
     * 解析服务对象格式
     * @param jsonString JSON字符串
     * @returns 服务对象或null
     */
    private parseServiceObject(jsonString: string): Record<string, MCPServiceConfig> | null {
        try {
            const parsed = JSON.parse(jsonString);
            if (typeof parsed === 'object' && !Array.isArray(parsed)) {
                const isServiceObject = Object.values(parsed).every(value => 
                    this.isValidServiceConfig(value)
                );
                if (isServiceObject) {
                    return parsed;
                }
            }
        } catch {
            // 忽略解析错误
        }
        return null;
    }

    /**
     * 检查常见问题
     * @param jsonString JSON字符串
     * @param errors 错误列表
     * @param warnings 警告列表
     */
    private checkCommonIssues(jsonString: string, errors: ValidationError[], warnings: any[]): void {
        // 检查尾随逗号
        if (/,\s*[}\]]/.test(jsonString)) {
            warnings.push({
                field: 'format',
                message: '发现尾随逗号，可能导致解析错误',
                suggestion: '移除多余的逗号'
            });
        }
        
        // 检查单引号
        if (/'[^']*'\s*:/.test(jsonString) || /:\s*'[^']*'/.test(jsonString)) {
            warnings.push({
                field: 'format',
                message: '发现单引号，JSON标准要求使用双引号',
                suggestion: '将单引号替换为双引号'
            });
        }
        
        // 检查注释
        if (/\/\//.test(jsonString) || /\/\*[\s\S]*?\*\//.test(jsonString)) {
            warnings.push({
                field: 'format',
                message: '发现注释，标准JSON不支持注释',
                suggestion: '移除注释内容'
            });
        }
    }

    /**
     * 移除注释
     * @param jsonString JSON字符串
     * @returns 移除注释后的字符串
     */
    private removeComments(jsonString: string): string {
        // 移除单行注释
        let result = jsonString.replace(/\/\/.*$/gm, '');
        
        // 移除多行注释
        result = result.replace(/\/\*[\s\S]*?\*\//g, '');
        
        return result;
    }

    /**
     * 修复尾随逗号
     * @param jsonString JSON字符串
     * @returns 修复后的字符串
     */
    private fixTrailingCommas(jsonString: string): string {
        return jsonString.replace(/,\s*([}\]])/g, '$1');
    }

    /**
     * 修复单引号
     * @param jsonString JSON字符串
     * @returns 修复后的字符串
     */
    private fixSingleQuotes(jsonString: string): string {
        // 简单的单引号替换（可能需要更复杂的逻辑来处理嵌套情况）
        return jsonString.replace(/'/g, '"');
    }

    /**
     * 修复未引用的键
     * @param jsonString JSON字符串
     * @returns 修复后的字符串
     */
    private fixUnquotedKeys(jsonString: string): string {
        // 匹配未引用的键
        return jsonString.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
    }

    /**
     * JSON序列化替换函数
     * @param key 键
     * @param value 值
     * @returns 处理后的值
     */
    private jsonReplacer(key: string, value: any): any {
        // 过滤掉undefined值
        if (value === undefined) {
            return null;
        }
        
        // 处理函数（转换为字符串）
        if (typeof value === 'function') {
            return value.toString();
        }
        
        return value;
    }
}

/**
 * JsonParser - JSON配置解析器
 * 
 * @author Leo-拥抱AI
 * @version 1.0.0
 * @description 解析和验证MCP配置JSON文件
 * @license MIT
 * 
 * © 2024 Leo-拥抱AI. All rights reserved.
 * 
 * 专注于AI工具开发，让开发更高效
 */

export default JsonParser;