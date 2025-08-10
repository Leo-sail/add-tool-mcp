import React from 'react';
import { MCPConfig, ValidationResult } from '../../types';
import './ConfigEditor.css';
/**
 * 配置编辑器组件属性接口
 */
interface ConfigEditorProps {
    /** 当前配置 */
    config: MCPConfig | null;
    /** 是否为只读模式 */
    readonly?: boolean;
    /** 是否显示验证错误 */
    showValidation?: boolean;
    /** 配置变更回调 */
    onConfigChange?: (config: MCPConfig) => void;
    /** 保存配置回调 */
    onSave?: (config: MCPConfig) => void;
    /** 重置配置回调 */
    onReset?: () => void;
    /** 导入配置回调 */
    onImport?: () => void;
    /** 导出配置回调 */
    onExport?: () => void;
    /** 验证配置回调 */
    onValidate?: (config: MCPConfig) => ValidationResult;
}
/**
 * 配置编辑器组件
 * 提供可视化和JSON两种编辑模式，支持配置验证和预览
 */
export declare const ConfigEditor: React.FC<ConfigEditorProps>;
export default ConfigEditor;
//# sourceMappingURL=ConfigEditor.d.ts.map