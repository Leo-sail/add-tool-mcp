import { MCPConfig, MCPServiceConfig, ValidationResult } from '../types';
/**
 * JSON解析器
 * 负责解析和处理各种格式的JSON配置文件
 */
export declare class JsonParser {
    private readonly maxDepth;
    private readonly maxSize;
    /**
     * 解析JSON字符串为MCP配置
     * @param jsonString JSON字符串
     * @param strict 是否严格模式
     * @returns 解析后的配置对象
     */
    parseConfig(jsonString: string, strict?: boolean): MCPConfig;
    /**
     * 将对象序列化为格式化的JSON字符串
     * @param config 配置对象
     * @param indent 缩进空格数
     * @returns 格式化的JSON字符串
     */
    stringify(config: MCPConfig, indent?: number): string;
    /**
     * 解析剪贴板内容
     * @param clipboardText 剪贴板文本
     * @returns 解析结果
     */
    parseClipboard(clipboardText: string): {
        config?: MCPConfig;
        services?: MCPServiceConfig[];
        error?: string;
    };
    /**
     * 验证JSON结构
     * @param jsonString JSON字符串
     * @returns 验证结果
     */
    validateJson(jsonString: string): ValidationResult;
    /**
     * 修复常见的JSON问题
     * @param jsonString 原始JSON字符串
     * @returns 修复后的JSON字符串
     */
    fixCommonIssues(jsonString: string): string;
    /**
     * 预处理JSON字符串
     * @param jsonString 原始JSON字符串
     * @param strict 是否严格模式
     * @returns 处理后的JSON字符串
     */
    private preprocessJson;
    /**
     * 验证对象深度
     * @param obj 要验证的对象
     * @param currentDepth 当前深度
     */
    private validateDepth;
    /**
     * 转换为MCP配置格式
     * @param parsed 解析后的对象
     * @returns MCP配置对象
     */
    private convertToMCPConfig;
    /**
     * 检查是否为有效的服务配置
     * @param obj 要检查的对象
     * @returns 是否为有效的服务配置
     */
    private isValidServiceConfig;
    /**
     * 解析服务对象格式
     * @param jsonString JSON字符串
     * @returns 服务对象或null
     */
    private parseServiceObject;
    /**
     * 检查常见问题
     * @param jsonString JSON字符串
     * @param errors 错误列表
     * @param warnings 警告列表
     */
    private checkCommonIssues;
    /**
     * 移除注释
     * @param jsonString JSON字符串
     * @returns 移除注释后的字符串
     */
    private removeComments;
    /**
     * 修复尾随逗号
     * @param jsonString JSON字符串
     * @returns 修复后的字符串
     */
    private fixTrailingCommas;
    /**
     * 修复单引号
     * @param jsonString JSON字符串
     * @returns 修复后的字符串
     */
    private fixSingleQuotes;
    /**
     * 修复未引用的键
     * @param jsonString JSON字符串
     * @returns 修复后的字符串
     */
    private fixUnquotedKeys;
    /**
     * JSON序列化替换函数
     * @param key 键
     * @param value 值
     * @returns 处理后的值
     */
    private jsonReplacer;
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
//# sourceMappingURL=JsonParser.d.ts.map