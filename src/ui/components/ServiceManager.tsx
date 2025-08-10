import React, { useState, useMemo } from 'react';
import { MCPService, MCPServiceConfig } from '../../types';
import { ServiceForm } from './ServiceForm';
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
 * 排序选项
 */
type SortOption = 'name' | 'status' | 'lastModified';
type SortDirection = 'asc' | 'desc';

/**
 * 过滤选项
 */
type FilterOption = 'all' | 'active' | 'inactive';

/**
 * 服务管理器组件
 * 用于显示和管理MCP服务列表
 */
export const ServiceManager: React.FC<ServiceManagerProps> = ({
    services,
    loading,
    onAction,
    configPath
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [filterBy, setFilterBy] = useState<FilterOption>('all');
    const [selectedService, setSelectedService] = useState<MCPService | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [formMode, setFormMode] = useState<'add' | 'edit'>('add');

    /**
     * 过滤和排序后的服务列表
     */
    const filteredAndSortedServices = useMemo(() => {
        let filtered = services;

        // 搜索过滤
        if (searchTerm) {
            filtered = filtered.filter(service => 
                service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                service.command?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                service.metadata?.description?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // 状态过滤
        if (filterBy !== 'all') {
            filtered = filtered.filter(service => service.status === filterBy);
        }

        // 排序
        filtered.sort((a, b) => {
            let aValue: any, bValue: any;
            
            switch (sortBy) {
                case 'name':
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                case 'status':
                    aValue = a.status;
                    bValue = b.status;
                    break;
                case 'lastModified':
                    aValue = a.metadata?.lastModified || 0;
                    bValue = b.metadata?.lastModified || 0;
                    break;
                default:
                    return 0;
            }

            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [services, searchTerm, sortBy, sortDirection, filterBy]);

    /**
     * 处理排序变化
     */
    const handleSortChange = (newSortBy: SortOption) => {
        if (sortBy === newSortBy) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(newSortBy);
            setSortDirection('asc');
        }
    };

    /**
     * 打开添加服务表单
     */
    const handleAddService = () => {
        setSelectedService(null);
        setFormMode('add');
        setShowForm(true);
    };

    /**
     * 打开编辑服务表单
     */
    const handleEditService = (service: MCPService) => {
        setSelectedService(service);
        setFormMode('edit');
        setShowForm(true);
    };

    /**
     * 删除服务
     */
    const handleDeleteService = (service: MCPService) => {
        if (window.confirm(`确定要删除服务 "${service.name}" 吗？`)) {
            onAction('delete', { name: service.name });
        }
    };

    /**
     * 切换服务状态
     */
    const handleToggleService = (service: MCPService) => {
        const updatedConfig: MCPServiceConfig = {
            ...service,
            disabled: service.status === 'active'
        };
        onAction('update', { name: service.name, config: updatedConfig });
    };

    /**
     * 处理表单提交
     */
    const handleFormSubmit = (serviceName: string, serviceConfig: MCPServiceConfig) => {
        if (formMode === 'add') {
            onAction('add', { name: serviceName, config: serviceConfig });
        } else {
            onAction('update', { name: serviceName, config: serviceConfig });
        }
        setShowForm(false);
        setSelectedService(null);
    };

    /**
     * 格式化最后修改时间
     */
    const formatLastModified = (timestamp?: number) => {
        if (!timestamp) return '未知';
        return new Date(timestamp).toLocaleString('zh-CN');
    };

    /**
     * 获取服务状态显示
     */
    const getStatusDisplay = (service: MCPService) => {
        const isActive = service.status === 'active';
        return {
            text: isActive ? '活跃' : '禁用',
            className: isActive ? 'status-active' : 'status-inactive',
            icon: isActive ? '🟢' : '🔴'
        };
    };

    /**
     * 渲染工具栏
     */
    const renderToolbar = () => (
        <div className="service-toolbar">
            <div className="toolbar-left">
                <div className="search-box">
                    <input
                        type="text"
                        className="input search-input"
                        placeholder="搜索服务名称、命令或描述..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <span className="search-icon">🔍</span>
                </div>
                
                <select 
                    className="select filter-select"
                    value={filterBy}
                    onChange={(e) => setFilterBy(e.target.value as FilterOption)}
                >
                    <option value="all">全部状态</option>
                    <option value="active">活跃</option>
                    <option value="inactive">禁用</option>
                </select>
            </div>
            
            <div className="toolbar-right">
                <button 
                    className="button"
                    onClick={() => onAction('refresh')}
                    disabled={loading}
                >
                    🔄 刷新
                </button>
                <button 
                    className="button"
                    onClick={handleAddService}
                    disabled={!configPath}
                >
                    ➕ 添加服务
                </button>
            </div>
        </div>
    );

    /**
     * 渲染表头
     */
    const renderTableHeader = () => (
        <thead>
            <tr>
                <th 
                    className={`sortable ${sortBy === 'name' ? 'sorted' : ''}`}
                    onClick={() => handleSortChange('name')}
                >
                    服务名称
                    {sortBy === 'name' && (
                        <span className="sort-indicator">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                    )}
                </th>
                <th 
                    className={`sortable ${sortBy === 'status' ? 'sorted' : ''}`}
                    onClick={() => handleSortChange('status')}
                >
                    状态
                    {sortBy === 'status' && (
                        <span className="sort-indicator">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                    )}
                </th>
                <th>命令</th>
                <th>描述</th>
                <th 
                    className={`sortable ${sortBy === 'lastModified' ? 'sorted' : ''}`}
                    onClick={() => handleSortChange('lastModified')}
                >
                    最后修改
                    {sortBy === 'lastModified' && (
                        <span className="sort-indicator">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                    )}
                </th>
                <th>操作</th>
            </tr>
        </thead>
    );

    /**
     * 渲染服务行
     */
    const renderServiceRow = (service: MCPService) => {
        const status = getStatusDisplay(service);
        
        return (
            <tr key={service.id} className="service-row">
                <td className="service-name">
                    <div className="name-cell">
                        <span className="name">{service.name}</span>
                        {service.metadata?.source && (
                            <span className="badge small">{service.metadata.source}</span>
                        )}
                    </div>
                </td>
                <td className="service-status">
                    <span className={`status-badge ${status.className}`}>
                        {status.icon} {status.text}
                    </span>
                </td>
                <td className="service-command">
                    <code className="command-text">{service.command}</code>
                </td>
                <td className="service-description">
                    <span className="description-text">
                        {service.metadata?.description || '无描述'}
                    </span>
                </td>
                <td className="service-modified">
                    <span className="modified-text">
                        {formatLastModified(service.metadata?.lastModified)}
                    </span>
                </td>
                <td className="service-actions">
                    <div className="action-buttons">
                        <button
                            className="button small"
                            onClick={() => handleToggleService(service)}
                            title={service.status === 'active' ? '禁用服务' : '启用服务'}
                        >
                            {service.status === 'active' ? '⏸️' : '▶️'}
                        </button>
                        <button
                            className="button small"
                            onClick={() => handleEditService(service)}
                            title="编辑服务"
                        >
                            ✏️
                        </button>
                        <button
                            className="button small danger"
                            onClick={() => handleDeleteService(service)}
                            title="删除服务"
                        >
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        );
    };

    /**
     * 渲染空状态
     */
    const renderEmptyState = () => {
        if (loading) {
            return (
                <div className="empty-state">
                    <div className="spinner"></div>
                    <p>加载服务列表中...</p>
                </div>
            );
        }

        if (!configPath) {
            return (
                <div className="empty-state">
                    <span className="empty-icon">📁</span>
                    <h3>未选择配置文件</h3>
                    <p>请先选择或创建一个MCP配置文件</p>
                    <button className="button" onClick={() => onAction('selectConfig')}>
                        选择配置文件
                    </button>
                </div>
            );
        }

        if (services.length === 0) {
            return (
                <div className="empty-state">
                    <span className="empty-icon">🔧</span>
                    <h3>暂无服务</h3>
                    <p>开始添加您的第一个MCP服务</p>
                    <button className="button" onClick={handleAddService}>
                        添加服务
                    </button>
                </div>
            );
        }

        if (filteredAndSortedServices.length === 0) {
            return (
                <div className="empty-state">
                    <span className="empty-icon">🔍</span>
                    <h3>未找到匹配的服务</h3>
                    <p>尝试调整搜索条件或过滤器</p>
                    <button className="button secondary" onClick={() => {
                        setSearchTerm('');
                        setFilterBy('all');
                    }}>
                        清除过滤器
                    </button>
                </div>
            );
        }

        return null;
    };

    return (
        <div className="service-manager">
            <div className="section">
                <div className="section-header">
                    <h2 className="section-title">
                        🔧 服务管理
                        <span className="service-count">({filteredAndSortedServices.length}/{services.length})</span>
                    </h2>
                    {configPath && (
                        <div className="config-info">
                            <span className="config-label">配置文件:</span>
                            <span className="config-path" title={configPath}>
                                {configPath.split('/').pop()}
                            </span>
                        </div>
                    )}
                </div>
                
                {renderToolbar()}
                
                {renderEmptyState() || (
                    <div className="service-table-container">
                        <table className="service-table">
                            {renderTableHeader()}
                            <tbody>
                                {filteredAndSortedServices.map(renderServiceRow)}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            
            {showForm && (
                <ServiceForm
                    mode={formMode}
                    service={selectedService}
                    onSubmit={handleFormSubmit}
                    onCancel={() => {
                        setShowForm(false);
                        setSelectedService(null);
                    }}
                />
            )}
        </div>
    );
};

export default ServiceManager;