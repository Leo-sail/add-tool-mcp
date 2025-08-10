import React, { useState, useEffect, useCallback } from 'react';
import { ServiceManager } from '../components/ServiceManager';
import { ConfigEditor } from '../components/ConfigEditor';
import { SettingsPanel } from '../components/SettingsPanel';
import { FileDetectionPanel } from '../components/FileDetectionPanel';
import { ConflictResolver } from '../components/ConflictResolver';
import { 
    MCPService, 
    MCPConfig, 
    DetectedFile, 
    ConfigConflict, 
    WebViewMessage, 
    WebViewResponse 
} from '../../types';
import './App.css';

/**
 * 应用状态接口
 */
interface AppState {
    currentView: 'services' | 'editor' | 'settings' | 'detection' | 'conflicts';
    services: MCPService[];
    currentConfig: MCPConfig | null;
    detectedFiles: DetectedFile[];
    conflicts: ConfigConflict[];
    loading: boolean;
    error: string | null;
    selectedConfigPath: string | null;
}

/**
 * VS Code WebView API声明
 */
declare const vscode: {
    postMessage: (message: WebViewMessage) => void;
    getState: () => any;
    setState: (state: any) => void;
};

/**
 * MCP配置管理器主应用组件
 */
export const App: React.FC = () => {
    const [state, setState] = useState<AppState>({
        currentView: 'services',
        services: [],
        currentConfig: null,
        detectedFiles: [],
        conflicts: [],
        loading: false,
        error: null,
        selectedConfigPath: null
    });

    /**
     * 更新应用状态
     */
    const updateState = (updates: Partial<AppState>) => {
        setState(prev => ({ ...prev, ...updates }));
    };

    /**
     * 发送消息到扩展
     */
    const sendMessage = (message: { type: string; data?: any }) => {
        if (vscode && vscode.postMessage) {
            const webViewMessage: WebViewMessage = {
                id: Date.now().toString(),
                type: message.type as any,
                payload: message.data || {}
            };
            vscode.postMessage(webViewMessage);
        }
    };

    /**
     * 处理来自VS Code扩展的消息
     */
    useEffect(() => {
        const handleMessage = (event: MessageEvent<WebViewResponse>) => {
            const message = event.data;
            const { type, data: payload } = message;
            
            if (type === 'error') {
                updateState({ error: payload.message, loading: false });
                return;
            }

            switch (type) {
                case 'servicesLoaded':
                    updateState({ 
                        services: payload.services || [], 
                        selectedConfigPath: payload.filePath,
                        loading: false 
                    });
                    break;

                case 'configValidated':
                    // ValidationResult不包含config，只是验证结果
                    updateState({ 
                        loading: false 
                    });
                    if (!payload.isValid) {
                        updateState({ error: '配置验证失败' });
                    }
                    break;

                case 'filesDetected':
                    updateState({ 
                        loading: false, 
                        detectedFiles: payload.files || [] 
                    });
                    break;
                    
                case 'configsMerged':
                    if (payload.conflicts && payload.conflicts.length > 0) {
                        updateState({ 
                            loading: false, 
                            conflicts: payload.conflicts,
                            currentView: 'conflicts'
                        });
                    } else {
                        updateState({ loading: false });
                        showSuccessMessage('配置合并成功');
                        refreshServices();
                    }
                    break;

                case 'serviceAdded':
            case 'serviceUpdated':
            case 'serviceDeleted':
                    updateState({ loading: false });
                    showSuccessMessage('操作成功');
                    refreshServices();
                    break;

                default:
                    console.log('未处理的消息类型:', type);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    /**
     * 组件挂载时初始化数据
     */
    useEffect(() => {
        refreshServices();
        detectFiles();
    }, []);

    /**
     * 刷新服务列表
     */
    const refreshServices = () => {
        updateState({ loading: true, error: null });
        sendMessage({ type: 'getServices', data: {} });
    };

    /**
     * 检测配置文件
     */
    const detectFiles = () => {
        updateState({ loading: true });
        sendMessage({ type: 'detectFiles', data: {} });
    };

    /**
     * 显示成功消息
     */
    const showSuccessMessage = (message: string) => {
        // 这里可以实现一个临时的成功提示
        console.log('成功:', message);
    };

    /**
     * 切换视图
     */
    const switchView = (view: AppState['currentView']) => {
        updateState({ currentView: view, error: null });
    };

    /**
     * 处理服务操作
     */
    const handleServiceAction = (action: string, serviceData?: any) => {
        updateState({ loading: true, error: null });
        
        switch (action) {
            case 'add':
                sendMessage({ 
                    type: 'addService', 
                    data: { 
                        serviceName: serviceData.name,
                        serviceConfig: serviceData.config,
                        configPath: state.selectedConfigPath 
                    } 
                });
                break;
                
            case 'update':
                sendMessage({ 
                    type: 'updateService', 
                    data: { 
                        serviceName: serviceData.name,
                        serviceConfig: serviceData.config,
                        configPath: state.selectedConfigPath 
                    } 
                });
                break;
                
            case 'delete':
                sendMessage({ 
                    type: 'deleteService', 
                    data: { 
                        serviceName: serviceData.name,
                        configPath: state.selectedConfigPath 
                    } 
                });
                break;
                
            case 'refresh':
                refreshServices();
                break;
        }
    };

    /**
     * 处理配置编辑
     */
    const handleConfigEdit = (config: MCPConfig) => {
        updateState({ loading: true, error: null });
        sendMessage({ 
            type: 'updateConfig', 
            data: { 
                config,
                configPath: state.selectedConfigPath 
            } 
        });
    };

    /**
     * 处理文件合并
     */
    const handleFileMerge = (sourceFiles: string[], targetFile: string, strategy: string) => {
        updateState({ loading: true, error: null });
        sendMessage({ 
            type: 'mergeConfigs', 
            data: { 
                sourceFiles,
                targetFile,
                strategy 
            } 
        });
    };

    /**
     * 处理冲突解决
     */
    const handleConflictResolve = (resolutions: Record<string, 'source' | 'target' | 'merge'>) => {
        updateState({ loading: true, error: null, conflicts: [] });
        sendMessage({ 
            type: 'resolveConflicts', 
            data: { resolutions } 
        });
    };

    /**
     * 渲染导航栏
     */
    const renderNavigation = () => (
        <nav className="app-navigation">
            <div className="nav-buttons">
                <button 
                    className={`nav-button ${state.currentView === 'services' ? 'active' : ''}`}
                    onClick={() => switchView('services')}
                >
                    <span className="nav-icon">🔧</span>
                    服务管理
                </button>
                <button 
                    className={`nav-button ${state.currentView === 'editor' ? 'active' : ''}`}
                    onClick={() => switchView('editor')}
                >
                    <span className="nav-icon">📝</span>
                    配置编辑
                </button>
                <button 
                    className={`nav-button ${state.currentView === 'detection' ? 'active' : ''}`}
                    onClick={() => switchView('detection')}
                >
                    <span className="nav-icon">🔍</span>
                    文件检测
                </button>
                <button 
                    className={`nav-button ${state.currentView === 'settings' ? 'active' : ''}`}
                    onClick={() => switchView('settings')}
                >
                    <span className="nav-icon">⚙️</span>
                    设置
                </button>
                {state.conflicts.length > 0 && (
                    <button 
                        className={`nav-button conflict-indicator ${state.currentView === 'conflicts' ? 'active' : ''}`}
                        onClick={() => switchView('conflicts')}
                    >
                        <span className="nav-icon">⚠️</span>
                        冲突解决 ({state.conflicts.length})
                    </button>
                )}
            </div>
            <div className="nav-status">
                {state.selectedConfigPath && (
                    <span className="config-path" title={state.selectedConfigPath}>
                        📁 {state.selectedConfigPath.split('/').pop()}
                    </span>
                )}
                {state.loading && <span className="loading-indicator">⏳ 加载中...</span>}
            </div>
        </nav>
    );

    /**
     * 渲染错误信息
     */
    const renderError = () => {
        if (!state.error) return null;
        
        return (
            <div className="error-banner">
                <span className="error-icon">❌</span>
                <span className="error-message">{state.error}</span>
                <button 
                    className="error-close"
                    onClick={() => updateState({ error: null })}
                >
                    ✕
                </button>
            </div>
        );
    };

    /**
     * 渲染主要内容
     */
    const renderContent = () => {
        switch (state.currentView) {
            case 'services':
                return (
                    <ServiceManager
                        services={state.services}
                        loading={state.loading}
                        onAction={handleServiceAction}
                        configPath={state.selectedConfigPath}
                    />
                );
                
            case 'editor':
                return (
                    <ConfigEditor
                        config={state.currentConfig}
                        onSave={handleConfigEdit}
                        onConfigChange={(config) => {
                            updateState({ currentConfig: config });
                        }}
                        showValidation={true}
                        readonly={false}
                    />
                );
                
            case 'detection':
                return (
                    <FileDetectionPanel
                        detectedFiles={state.detectedFiles}
                        isDetecting={state.loading}
                        options={{
                            workspacePath: '.',
                            includeSubdirs: true,
                            includeHidden: false,
                            targetApps: ['cursor', 'windsurf', 'vscode'],
                            maxDepth: 3,
                            minConfidence: 0.5,
                            searchPaths: ['.', '~/.config'],
                            filePatterns: ['**/mcp.json', '**/mcp-config.json'],
                            excludePatterns: ['**/node_modules/**', '**/.git/**']
                        }}
                        onDetectFiles={async (options) => {
                            updateState({ loading: true });
                            detectFiles();
                        }}
                        onOpenFile={(filePath) => {
                            sendMessage({ type: 'openFile', data: { filePath } });
                        }}
                        onImportFile={async (filePath) => {
                            sendMessage({ type: 'importFile', data: { filePath } });
                        }}
                        onMergeFiles={async (filePaths) => {
                            handleFileMerge(filePaths, state.selectedConfigPath || '', 'merge');
                        }}
                        onCreateConfig={async (location) => {
                            sendMessage({ type: 'createConfig', data: { location } });
                        }}
                    />
                );
                
            case 'conflicts':
                return (
                    <ConflictResolver
                        conflicts={state.conflicts}
                        mergeOptions={{
                            defaultStrategy: 'prompt',
                            preserveComments: true,
                            validateResult: true
                        }}
                        isResolving={state.loading}
                        onResolveConflicts={async (resolutions) => {
                            const resolutionMap: Record<string, 'source' | 'target' | 'merge'> = {};
                            resolutions.forEach(resolution => {
                                resolutionMap[resolution.conflictId] = resolution.strategy as 'source' | 'target' | 'merge';
                            });
                            handleConflictResolve(resolutionMap);
                        }}
                        onCancel={() => updateState({ conflicts: [], currentView: 'services' })}
                        onPreview={async (resolutions) => {
                            // 返回预览配置
                            return state.currentConfig || { mcpServers: {} };
                        }}
                    />
                );
                
            case 'settings':
                return (
                    <SettingsPanel
                        settings={{
                            autoDetect: true,
                            fileWatcher: true,
                            autoBackup: false,
                            backupRetentionDays: 7,
                            defaultMergeStrategy: 'prompt',
                            detectionPaths: ['~/.config', '~/Documents'],
                            excludePatterns: ['**/node_modules/**', '**/.git/**'],
                            validationLevel: 'normal',
                            showNotifications: true,
                            debugMode: false,
                            theme: 'auto',
                            language: 'zh-CN'
                        }}
                        onSettingsChange={(settings) => {
                            sendMessage({ type: 'updateSettings', data: settings });
                        }}
                        onReset={() => {
                            sendMessage({ type: 'resetSettings' });
                        }}
                        onImport={() => {
                            sendMessage({ type: 'importSettings' });
                        }}
                        onExport={() => {
                            sendMessage({ type: 'exportSettings' });
                        }}
                    />
                );
                
            default:
                return <div className="content-placeholder">选择一个功能开始使用</div>;
        }
    };

    return (
        <div className="mcp-manager-app">
            {renderNavigation()}
            {renderError()}
            <main className="app-content">
                {renderContent()}
            </main>
        </div>
    );
};

export default App;
export type { AppState };