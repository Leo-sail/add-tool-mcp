import React from 'react';
import './ConflictResolver.css';
import { ConfigConflict, MergeStrategy, MergeOptions, MCPConfig } from '../../types';
/**
 * 冲突解决器属性接口
 */
interface ConflictResolverProps {
    /** 冲突列表 */
    conflicts: ConfigConflict[];
    /** 合并选项 */
    mergeOptions: MergeOptions;
    /** 是否正在解决冲突 */
    isResolving: boolean;
    /** 解决冲突回调 */
    onResolveConflicts: (resolutions: ConflictResolution[]) => Promise<void>;
    /** 取消回调 */
    onCancel: () => void;
    /** 预览合并结果回调 */
    onPreview: (resolutions: ConflictResolution[]) => Promise<MCPConfig>;
}
/**
 * 冲突解决方案接口
 */
interface ConflictResolution {
    /** 冲突ID */
    conflictId: string;
    /** 解决策略 */
    strategy: MergeStrategy;
    /** 选择的值（如果适用） */
    selectedValue?: any;
    /** 自定义值（如果适用） */
    customValue?: any;
}
/**
 * 冲突解决器组件
 * 用于处理配置合并时的冲突
 */
export declare const ConflictResolver: React.FC<ConflictResolverProps>;
export default ConflictResolver;
//# sourceMappingURL=ConflictResolver.d.ts.map