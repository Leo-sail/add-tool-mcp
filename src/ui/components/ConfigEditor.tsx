import React, { useState, useEffect, useCallback } from 'react';
import { MCPConfig, MCPServiceConfig, ValidationResult } from '../../types';
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
 * 编辑器标签页类型
 */
type EditorTab = 'visual' | 'json' | 'preview';

/**
 * 配置编辑器组件
 * 提供可视化和JSON两种编辑模式，支持配置验证和预览
 */
export const ConfigEditor: React.FC<ConfigEditorProps> = ({
  config,
  readonly = false,
  showValidation = true,
  onConfigChange,
  onSave,
  onReset,
  onImport,
  onExport,
  onValidate
}) => {
  // 组件状态
  const [activeTab, setActiveTab] = useState<EditorTab>('visual');
  const [editingConfig, setEditingConfig] = useState<MCPConfig | null>(config);
  const [jsonContent, setJsonContent] = useState<string>('');
  const [jsonError, setJsonError] = useState<string>('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  /**
   * 初始化编辑器内容
   */
  useEffect(() => {
    if (config) {
      setEditingConfig({ ...config });
      setJsonContent(JSON.stringify(config, null, 2));
      setHasChanges(false);
      setJsonError('');
    }
  }, [config]);

  /**
   * 验证配置
   */
  const validateConfig = useCallback(async (configToValidate: MCPConfig) => {
    if (!onValidate || !showValidation) return;

    setIsValidating(true);
    try {
      const result = onValidate(configToValidate);
      setValidationResult(result);
    } catch (error) {
      console.error('配置验证失败:', error);
    } finally {
      setIsValidating(false);
    }
  }, [onValidate, showValidation]);

  /**
   * 处理配置变更
   */
  const handleConfigChange = useCallback((newConfig: MCPConfig) => {
    setEditingConfig(newConfig);
    setJsonContent(JSON.stringify(newConfig, null, 2));
    setHasChanges(true);
    onConfigChange?.(newConfig);
    
    // 延迟验证以避免频繁验证
    setTimeout(() => validateConfig(newConfig), 500);
  }, [onConfigChange, validateConfig]);

  /**
   * 处理JSON内容变更
   */
  const handleJsonChange = useCallback((content: string) => {
    setJsonContent(content);
    setJsonError('');
    
    try {
      const parsed = JSON.parse(content);
      setEditingConfig(parsed);
      setHasChanges(true);
      onConfigChange?.(parsed);
      validateConfig(parsed);
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : '无效的JSON格式');
    }
  }, [onConfigChange, validateConfig]);

  /**
   * 处理服务配置变更
   */
  const handleServiceChange = useCallback((serviceId: string, serviceConfig: MCPServiceConfig) => {
    if (!editingConfig) return;

    const newConfig = {
      ...editingConfig,
      mcpServers: {
        ...editingConfig.mcpServers,
        [serviceId]: serviceConfig
      }
    };
    
    handleConfigChange(newConfig);
  }, [editingConfig, handleConfigChange]);

  /**
   * 删除服务
   */
  const handleServiceDelete = useCallback((serviceId: string) => {
    if (!editingConfig) return;

    const newServers = { ...editingConfig.mcpServers };
    delete newServers[serviceId];
    
    const newConfig = {
      ...editingConfig,
      mcpServers: newServers
    };
    
    handleConfigChange(newConfig);
  }, [editingConfig, handleConfigChange]);

  /**
   * 添加新服务
   */
  const handleServiceAdd = useCallback(() => {
    if (!editingConfig) return;

    const serviceId = `service_${Date.now()}`;
    const newService: MCPServiceConfig = {
      command: '',
      args: [],
      env: {},
      disabled: false
    };

    handleServiceChange(serviceId, newService);
  }, [editingConfig, handleServiceChange]);

  /**
   * 保存配置
   */
  const handleSave = useCallback(() => {
    if (!editingConfig || !onSave) return;
    
    onSave(editingConfig);
    setHasChanges(false);
  }, [editingConfig, onSave]);

  /**
   * 重置配置
   */
  const handleReset = useCallback(() => {
    if (config) {
      setEditingConfig({ ...config });
      setJsonContent(JSON.stringify(config, null, 2));
      setHasChanges(false);
      setJsonError('');
      setValidationResult(null);
    }
    onReset?.();
  }, [config, onReset]);

  /**
   * 格式化JSON
   */
  const handleFormatJson = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonContent);
      const formatted = JSON.stringify(parsed, null, 2);
      setJsonContent(formatted);
    } catch (error) {
      // JSON格式错误，不进行格式化
    }
  }, [jsonContent]);

  // 如果没有配置，显示空状态
  if (!config && !editingConfig) {
    return (
      <div className="config-editor">
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h3>没有配置文件</h3>
          <p>请先选择或创建一个MCP配置文件</p>
          {onImport && (
            <button className="button primary" onClick={onImport}>
              导入配置
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`config-editor ${readonly ? 'readonly' : ''}`}>
      {/* 编辑器头部 */}
      <div className="editor-header">
        <div className="editor-tabs">
          <button
            className={`tab-button ${activeTab === 'visual' ? 'active' : ''}`}
            onClick={() => setActiveTab('visual')}
          >
            可视化编辑
          </button>
          <button
            className={`tab-button ${activeTab === 'json' ? 'active' : ''}`}
            onClick={() => setActiveTab('json')}
          >
            JSON编辑
          </button>
          <button
            className={`tab-button ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            预览
          </button>
        </div>

        <div className="editor-actions">
          {hasChanges && (
            <span className="changes-indicator">
              <span className="dot"></span>
              未保存的更改
            </span>
          )}
          
          {!readonly && (
            <>
              {onImport && (
                <button className="button secondary small" onClick={onImport}>
                  导入
                </button>
              )}
              {onExport && (
                <button className="button secondary small" onClick={onExport}>
                  导出
                </button>
              )}
              {hasChanges && (
                <button className="button secondary small" onClick={handleReset}>
                  重置
                </button>
              )}
              <button 
                className="button primary small" 
                onClick={handleSave}
                disabled={!hasChanges || !!jsonError}
              >
                保存
              </button>
            </>
          )}
        </div>
      </div>

      {/* 验证结果 */}
      {showValidation && validationResult && (
        <div className="validation-panel">
          {validationResult.errors.length > 0 && (
            <div className="validation-errors">
              <h4>❌ 错误 ({validationResult.errors.length})</h4>
              <ul>
                {validationResult.errors.map((error, index) => (
                  <li key={index}>
                    <strong>{error.path}:</strong> {error.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {validationResult.warnings.length > 0 && (
            <div className="validation-warnings">
              <h4>⚠️ 警告 ({validationResult.warnings.length})</h4>
              <ul>
                {validationResult.warnings.map((warning, index) => (
                  <li key={index}>
                    <strong>{warning.path}:</strong> {warning.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {validationResult.isValid && (
            <div className="validation-success">
              ✅ 配置验证通过
            </div>
          )}
        </div>
      )}

      {/* 编辑器内容 */}
      <div className="editor-content">
        {activeTab === 'visual' && (
          <VisualEditor
            config={editingConfig}
            readonly={readonly}
            onConfigChange={handleConfigChange}
            onServiceChange={handleServiceChange}
            onServiceDelete={handleServiceDelete}
            onServiceAdd={handleServiceAdd}
          />
        )}
        
        {activeTab === 'json' && (
          <JsonEditor
            content={jsonContent}
            error={jsonError}
            readonly={readonly}
            onChange={handleJsonChange}
            onFormat={handleFormatJson}
          />
        )}
        
        {activeTab === 'preview' && (
          <ConfigPreview config={editingConfig} />
        )}
      </div>
    </div>
  );
};

/**
 * 可视化编辑器组件
 */
interface VisualEditorProps {
  config: MCPConfig | null;
  readonly: boolean;
  onConfigChange: (config: MCPConfig) => void;
  onServiceChange: (serviceId: string, serviceConfig: MCPServiceConfig) => void;
  onServiceDelete: (serviceId: string) => void;
  onServiceAdd: () => void;
}

const VisualEditor: React.FC<VisualEditorProps> = ({
  config,
  readonly,
  onConfigChange,
  onServiceChange,
  onServiceDelete,
  onServiceAdd
}) => {
  if (!config) return null;

  const services = Object.entries(config.mcpServers || {});

  return (
    <div className="visual-editor">
      {/* 全局配置 */}
      <div className="config-section">
        <h3>全局配置</h3>
        <div className="form-group">
          <label>配置版本</label>
          <input
            type="text"
            value={config.version || ''}
            readOnly={readonly}
            onChange={(e) => onConfigChange({ ...config, version: e.target.value })}
            placeholder="例如: 1.0.0"
          />
        </div>
      </div>

      {/* 服务配置 */}
      <div className="config-section">
        <div className="section-header">
          <h3>MCP服务配置 ({services.length})</h3>
          {!readonly && (
            <button className="button primary small" onClick={onServiceAdd}>
              添加服务
            </button>
          )}
        </div>
        
        {services.length === 0 ? (
          <div className="empty-services">
            <p>暂无配置的服务</p>
            {!readonly && (
              <button className="button primary" onClick={onServiceAdd}>
                添加第一个服务
              </button>
            )}
          </div>
        ) : (
          <div className="services-list">
            {services.map(([serviceId, serviceConfig]) => (
              <ServiceEditor
                key={serviceId}
                serviceId={serviceId}
                config={serviceConfig}
                readonly={readonly}
                onChange={(newConfig) => onServiceChange(serviceId, newConfig)}
                onDelete={() => onServiceDelete(serviceId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * 服务编辑器组件
 */
interface ServiceEditorProps {
  serviceId: string;
  config: MCPServiceConfig;
  readonly: boolean;
  onChange: (config: MCPServiceConfig) => void;
  onDelete: () => void;
}

const ServiceEditor: React.FC<ServiceEditorProps> = ({
  serviceId,
  config,
  readonly,
  onChange,
  onDelete
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');

  /**
   * 更新配置字段
   */
  const updateField = (field: keyof MCPServiceConfig, value: any) => {
    onChange({ ...config, [field]: value });
  };

  /**
   * 更新参数
   */
  const updateArgs = (index: number, value: string) => {
    const newArgs = [...(config.args || [])];
    newArgs[index] = value;
    updateField('args', newArgs);
  };

  /**
   * 添加参数
   */
  const addArg = () => {
    const newArgs = [...(config.args || []), ''];
    updateField('args', newArgs);
  };

  /**
   * 删除参数
   */
  const removeArg = (index: number) => {
    const newArgs = (config.args || []).filter((_, i) => i !== index);
    updateField('args', newArgs);
  };

  /**
   * 添加环境变量
   */
  const addEnvVar = () => {
    if (!newEnvKey.trim()) return;
    
    const newEnv = { ...config.env, [newEnvKey]: newEnvValue };
    updateField('env', newEnv);
    setNewEnvKey('');
    setNewEnvValue('');
  };

  /**
   * 删除环境变量
   */
  const removeEnvVar = (key: string) => {
    const newEnv = { ...config.env };
    delete newEnv[key];
    updateField('env', newEnv);
  };

  return (
    <div className={`service-editor ${config.disabled ? 'disabled' : ''}`}>
      <div className="service-header">
        <div className="service-title">
          <button
            className="expand-button"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
          <input
            type="text"
            value={serviceId}
            readOnly
            className="service-id"
          />
          <div className="service-status">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={!config.disabled}
                disabled={readonly}
                onChange={(e) => updateField('disabled', !e.target.checked)}
              />
              启用
            </label>
          </div>
        </div>
        
        {!readonly && (
          <button className="button danger small" onClick={onDelete}>
            删除
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="service-content">
          {/* 基本配置 */}
          <div className="form-group">
            <label>命令 *</label>
            <input
              type="text"
              value={config.command}
              readOnly={readonly}
              onChange={(e) => updateField('command', e.target.value)}
              placeholder="例如: node, python, ./script.sh"
            />
          </div>

          {/* 参数配置 */}
          <div className="form-group">
            <label>参数</label>
            <div className="args-list">
              {(config.args || []).map((arg, index) => (
                <div key={index} className="arg-item">
                  <input
                    type="text"
                    value={arg}
                    readOnly={readonly}
                    onChange={(e) => updateArgs(index, e.target.value)}
                    placeholder={`参数 ${index + 1}`}
                  />
                  {!readonly && (
                    <button
                      className="button danger small"
                      onClick={() => removeArg(index)}
                    >
                      删除
                    </button>
                  )}
                </div>
              ))}
              {!readonly && (
                <button className="button secondary small" onClick={addArg}>
                  添加参数
                </button>
              )}
            </div>
          </div>

          {/* 环境变量 */}
          <div className="form-group">
            <label>环境变量</label>
            <div className="env-list">
              {Object.entries(config.env || {}).map(([key, value]) => (
                <div key={key} className="env-item">
                  <input
                    type="text"
                    value={key}
                    readOnly
                    className="env-key"
                  />
                  <span>=</span>
                  <input
                    type="text"
                    value={value}
                    readOnly={readonly}
                    onChange={(e) => updateField('env', { ...config.env, [key]: e.target.value })}
                    className="env-value"
                  />
                  {!readonly && (
                    <button
                      className="button danger small"
                      onClick={() => removeEnvVar(key)}
                    >
                      删除
                    </button>
                  )}
                </div>
              ))}
              {!readonly && (
                <div className="env-add">
                  <input
                    type="text"
                    value={newEnvKey}
                    onChange={(e) => setNewEnvKey(e.target.value)}
                    placeholder="变量名"
                    className="env-key"
                  />
                  <span>=</span>
                  <input
                    type="text"
                    value={newEnvValue}
                    onChange={(e) => setNewEnvValue(e.target.value)}
                    placeholder="变量值"
                    className="env-value"
                  />
                  <button
                    className="button primary small"
                    onClick={addEnvVar}
                    disabled={!newEnvKey.trim()}
                  >
                    添加
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * JSON编辑器组件
 */
interface JsonEditorProps {
  content: string;
  error: string;
  readonly: boolean;
  onChange: (content: string) => void;
  onFormat: () => void;
}

const JsonEditor: React.FC<JsonEditorProps> = ({
  content,
  error,
  readonly,
  onChange,
  onFormat
}) => {
  return (
    <div className="json-editor">
      <div className="json-toolbar">
        {!readonly && (
          <button className="button secondary small" onClick={onFormat}>
            格式化
          </button>
        )}
        {error && (
          <div className="json-error">
            ❌ {error}
          </div>
        )}
      </div>
      
      <textarea
        className={`json-textarea ${error ? 'error' : ''}`}
        value={content}
        readOnly={readonly}
        onChange={(e) => onChange(e.target.value)}
        placeholder="在此输入JSON配置..."
        spellCheck={false}
      />
    </div>
  );
};

/**
 * 配置预览组件
 */
interface ConfigPreviewProps {
  config: MCPConfig | null;
}

const ConfigPreview: React.FC<ConfigPreviewProps> = ({ config }) => {
  if (!config) return null;

  const services = Object.entries(config.mcpServers || {});
  const activeServices = services.filter(([, service]) => !service.disabled);
  const disabledServices = services.filter(([, service]) => service.disabled);

  return (
    <div className="config-preview">
      <div className="preview-section">
        <h3>配置概览</h3>
        <div className="preview-stats">
          <div className="stat-item">
            <span className="stat-label">总服务数:</span>
            <span className="stat-value">{services.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">启用服务:</span>
            <span className="stat-value active">{activeServices.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">禁用服务:</span>
            <span className="stat-value disabled">{disabledServices.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">配置版本:</span>
            <span className="stat-value">{config.version || '未设置'}</span>
          </div>
        </div>
      </div>

      {activeServices.length > 0 && (
        <div className="preview-section">
          <h3>启用的服务</h3>
          <div className="service-list">
            {activeServices.map(([serviceId, serviceConfig]) => (
              <div key={serviceId} className="service-preview">
                <div className="service-name">{serviceId}</div>
                <div className="service-command">
                  <code>{serviceConfig.command} {(serviceConfig.args || []).join(' ')}</code>
                </div>
                {Object.keys(serviceConfig.env || {}).length > 0 && (
                  <div className="service-env">
                    环境变量: {Object.keys(serviceConfig.env || {}).length} 个
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {disabledServices.length > 0 && (
        <div className="preview-section">
          <h3>禁用的服务</h3>
          <div className="service-list disabled">
            {disabledServices.map(([serviceId, serviceConfig]) => (
              <div key={serviceId} className="service-preview">
                <div className="service-name">{serviceId}</div>
                <div className="service-command">
                  <code>{serviceConfig.command} {(serviceConfig.args || []).join(' ')}</code>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfigEditor;