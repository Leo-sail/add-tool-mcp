import React from 'react';
import { MCPService, MCPConfig, DetectedFile, ConfigConflict } from '../../types';
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
 * MCP配置管理器主应用组件
 */
export declare const App: React.FC;
export default App;
export type { AppState };
//# sourceMappingURL=App.d.ts.map