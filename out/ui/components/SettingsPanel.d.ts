import React from 'react';
import './SettingsPanel.css';
/**
 * 扩展设置接口
 */
interface ExtensionSettings {
    /** 自动检测配置文件 */
    autoDetect: boolean;
    /** 文件监控 */
    fileWatcher: boolean;
    /** 自动备份 */
    autoBackup: boolean;
    /** 备份保留天数 */
    backupRetentionDays: number;
    /** 默认合并策略 */
    defaultMergeStrategy: 'overwrite' | 'skip' | 'merge' | 'prompt';
    /** 检测路径 */
    detectionPaths: string[];
    /** 排除模式 */
    excludePatterns: string[];
    /** 验证级别 */
    validationLevel: 'strict' | 'normal' | 'loose';
    /** 显示通知 */
    showNotifications: boolean;
    /** 调试模式 */
    debugMode: boolean;
    /** 主题 */
    theme: 'auto' | 'light' | 'dark';
    /** 语言 */
    language: 'zh-CN' | 'en-US';
}
/**
 * 设置面板组件属性接口
 */
interface SettingsPanelProps {
    /** 当前设置 */
    settings: ExtensionSettings;
    /** 设置变更回调 */
    onSettingsChange: (settings: ExtensionSettings) => void;
    /** 重置设置回调 */
    onReset: () => void;
    /** 导入设置回调 */
    onImport: () => void;
    /** 导出设置回调 */
    onExport: () => void;
}
/**
 * 设置面板组件
 * 提供扩展的各种配置选项管理
 */
export declare const SettingsPanel: React.FC<SettingsPanelProps>;
export default SettingsPanel;
//# sourceMappingURL=SettingsPanel.d.ts.map