import React from 'react';
import { MCPService } from '../../types';
import './ServiceManager.css';
/**
 * 服务管理器属性接口
 */
interface ServiceManagerProps {
    services: MCPService[];
    loading: boolean;
    onAction: (action: string, data?: any) => void;
    configPath: string | null;
}
/**
 * 服务管理器组件
 * 用于显示和管理MCP服务列表
 */
export declare const ServiceManager: React.FC<ServiceManagerProps>;
export default ServiceManager;
//# sourceMappingURL=ServiceManager.d.ts.map