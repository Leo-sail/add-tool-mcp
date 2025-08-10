import React from 'react';
import './FileDetectionPanel.css';
import { DetectedFile, FileDetectionOptions } from '../../types';
/**
 * 文件检测面板属性接口
 */
interface FileDetectionPanelProps {
    /** 检测到的文件列表 */
    detectedFiles: DetectedFile[];
    /** 是否正在检测 */
    isDetecting: boolean;
    /** 检测选项 */
    options: FileDetectionOptions;
    /** 检测文件回调 */
    onDetectFiles: (options: FileDetectionOptions) => Promise<void>;
    /** 打开文件回调 */
    onOpenFile: (filePath: string) => void;
    /** 导入文件回调 */
    onImportFile: (filePath: string) => Promise<void>;
    /** 合并文件回调 */
    onMergeFiles: (filePaths: string[]) => Promise<void>;
    /** 创建配置文件回调 */
    onCreateConfig: (location: string) => Promise<void>;
}
/**
 * 文件检测面板组件
 * 用于显示和管理检测到的MCP配置文件
 */
export declare const FileDetectionPanel: React.FC<FileDetectionPanelProps>;
export default FileDetectionPanel;
//# sourceMappingURL=FileDetectionPanel.d.ts.map