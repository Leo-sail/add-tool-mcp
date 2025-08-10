import React from 'react';
import { MCPService, MCPServiceConfig } from '../../types';
import './ServiceForm.css';
/**
 * 服务表单属性接口
 */
interface ServiceFormProps {
    /** 表单模式 */
    mode: 'add' | 'edit';
    /** 要编辑的服务（编辑模式时） */
    service: MCPService | null;
    /** 提交回调 */
    onSubmit: (serviceName: string, serviceConfig: MCPServiceConfig) => void;
    /** 取消回调 */
    onCancel: () => void;
}
/**
 * 服务表单组件
 * 用于添加和编辑MCP服务配置
 */
export declare const ServiceForm: React.FC<ServiceFormProps>;
export {};
//# sourceMappingURL=ServiceForm.d.ts.map