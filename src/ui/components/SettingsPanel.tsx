import React, { useState, useEffect, useCallback } from 'react';
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
 * 设置分组类型
 */
type SettingsGroup = 'general' | 'detection' | 'backup' | 'validation' | 'advanced';

/**
 * 设置面板组件
 * 提供扩展的各种配置选项管理
 */
export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onSettingsChange,
  onReset,
  onImport,
  onExport
}) => {
  // 组件状态
  const [activeGroup, setActiveGroup] = useState<SettingsGroup>('general');
  const [editingSettings, setEditingSettings] = useState<ExtensionSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);
  const [newDetectionPath, setNewDetectionPath] = useState('');
  const [newExcludePattern, setNewExcludePattern] = useState('');

  /**
   * 初始化设置
   */
  useEffect(() => {
    setEditingSettings(settings);
    setHasChanges(false);
  }, [settings]);

  /**
   * 更新设置字段
   */
  const updateSetting = useCallback(<K extends keyof ExtensionSettings>(
    key: K,
    value: ExtensionSettings[K]
  ) => {
    const newSettings = { ...editingSettings, [key]: value };
    setEditingSettings(newSettings);
    setHasChanges(true);
    onSettingsChange(newSettings);
  }, [editingSettings, onSettingsChange]);

  /**
   * 添加检测路径
   */
  const addDetectionPath = useCallback(() => {
    if (!newDetectionPath.trim()) return;
    
    const newPaths = [...editingSettings.detectionPaths, newDetectionPath.trim()];
    updateSetting('detectionPaths', newPaths);
    setNewDetectionPath('');
  }, [editingSettings.detectionPaths, newDetectionPath, updateSetting]);

  /**
   * 删除检测路径
   */
  const removeDetectionPath = useCallback((index: number) => {
    const newPaths = editingSettings.detectionPaths.filter((_, i) => i !== index);
    updateSetting('detectionPaths', newPaths);
  }, [editingSettings.detectionPaths, updateSetting]);

  /**
   * 添加排除模式
   */
  const addExcludePattern = useCallback(() => {
    if (!newExcludePattern.trim()) return;
    
    const newPatterns = [...editingSettings.excludePatterns, newExcludePattern.trim()];
    updateSetting('excludePatterns', newPatterns);
    setNewExcludePattern('');
  }, [editingSettings.excludePatterns, newExcludePattern, updateSetting]);

  /**
   * 删除排除模式
   */
  const removeExcludePattern = useCallback((index: number) => {
    const newPatterns = editingSettings.excludePatterns.filter((_, i) => i !== index);
    updateSetting('excludePatterns', newPatterns);
  }, [editingSettings.excludePatterns, updateSetting]);

  /**
   * 重置设置
   */
  const handleReset = useCallback(() => {
    setEditingSettings(settings);
    setHasChanges(false);
    onReset();
  }, [settings, onReset]);

  /**
   * 设置分组配置
   */
  const settingsGroups = [
    {
      id: 'general' as SettingsGroup,
      name: '常规设置',
      icon: '⚙️',
      description: '基本功能和界面设置'
    },
    {
      id: 'detection' as SettingsGroup,
      name: '文件检测',
      icon: '🔍',
      description: '配置文件自动检测设置'
    },
    {
      id: 'backup' as SettingsGroup,
      name: '备份设置',
      icon: '💾',
      description: '配置文件备份和恢复设置'
    },
    {
      id: 'validation' as SettingsGroup,
      name: '验证设置',
      icon: '✅',
      description: '配置验证和错误检查设置'
    },
    {
      id: 'advanced' as SettingsGroup,
      name: '高级设置',
      icon: '🔧',
      description: '调试和开发者选项'
    }
  ];

  return (
    <div className="settings-panel">
      {/* 设置头部 */}
      <div className="settings-header">
        <div className="header-title">
          <h2>扩展设置</h2>
          <p>配置MCP配置管理器的行为和偏好</p>
        </div>
        
        <div className="header-actions">
          {hasChanges && (
            <span className="changes-indicator">
              <span className="dot"></span>
              有未保存的更改
            </span>
          )}
          
          <button className="button secondary small" onClick={onImport}>
            导入设置
          </button>
          <button className="button secondary small" onClick={onExport}>
            导出设置
          </button>
          {hasChanges && (
            <button className="button secondary small" onClick={handleReset}>
              重置
            </button>
          )}
        </div>
      </div>

      <div className="settings-content">
        {/* 设置导航 */}
        <div className="settings-nav">
          {settingsGroups.map((group) => (
            <button
              key={group.id}
              className={`nav-item ${activeGroup === group.id ? 'active' : ''}`}
              onClick={() => setActiveGroup(group.id)}
            >
              <span className="nav-icon">{group.icon}</span>
              <div className="nav-text">
                <div className="nav-name">{group.name}</div>
                <div className="nav-description">{group.description}</div>
              </div>
            </button>
          ))}
        </div>

        {/* 设置面板 */}
        <div className="settings-main">
          {activeGroup === 'general' && (
            <GeneralSettings
              settings={editingSettings}
              onUpdate={updateSetting}
            />
          )}
          
          {activeGroup === 'detection' && (
            <DetectionSettings
              settings={editingSettings}
              onUpdate={updateSetting}
              newDetectionPath={newDetectionPath}
              setNewDetectionPath={setNewDetectionPath}
              onAddDetectionPath={addDetectionPath}
              onRemoveDetectionPath={removeDetectionPath}
              newExcludePattern={newExcludePattern}
              setNewExcludePattern={setNewExcludePattern}
              onAddExcludePattern={addExcludePattern}
              onRemoveExcludePattern={removeExcludePattern}
            />
          )}
          
          {activeGroup === 'backup' && (
            <BackupSettings
              settings={editingSettings}
              onUpdate={updateSetting}
            />
          )}
          
          {activeGroup === 'validation' && (
            <ValidationSettings
              settings={editingSettings}
              onUpdate={updateSetting}
            />
          )}
          
          {activeGroup === 'advanced' && (
            <AdvancedSettings
              settings={editingSettings}
              onUpdate={updateSetting}
            />
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * 常规设置组件
 */
interface GeneralSettingsProps {
  settings: ExtensionSettings;
  onUpdate: <K extends keyof ExtensionSettings>(key: K, value: ExtensionSettings[K]) => void;
}

const GeneralSettings: React.FC<GeneralSettingsProps> = ({ settings, onUpdate }) => {
  return (
    <div className="settings-group">
      <h3>常规设置</h3>
      
      <div className="setting-item">
        <div className="setting-label">
          <label>主题</label>
          <p>选择界面主题</p>
        </div>
        <select
          value={settings.theme}
          onChange={(e) => onUpdate('theme', e.target.value as ExtensionSettings['theme'])}
        >
          <option value="auto">跟随系统</option>
          <option value="light">浅色主题</option>
          <option value="dark">深色主题</option>
        </select>
      </div>

      <div className="setting-item">
        <div className="setting-label">
          <label>语言</label>
          <p>选择界面语言</p>
        </div>
        <select
          value={settings.language}
          onChange={(e) => onUpdate('language', e.target.value as ExtensionSettings['language'])}
        >
          <option value="zh-CN">简体中文</option>
          <option value="en-US">English</option>
        </select>
      </div>

      <div className="setting-item">
        <div className="setting-label">
          <label>显示通知</label>
          <p>在重要操作时显示通知消息</p>
        </div>
        <label className="switch">
          <input
            type="checkbox"
            checked={settings.showNotifications}
            onChange={(e) => onUpdate('showNotifications', e.target.checked)}
          />
          <span className="slider"></span>
        </label>
      </div>

      <div className="setting-item">
        <div className="setting-label">
          <label>文件监控</label>
          <p>自动监控配置文件变化</p>
        </div>
        <label className="switch">
          <input
            type="checkbox"
            checked={settings.fileWatcher}
            onChange={(e) => onUpdate('fileWatcher', e.target.checked)}
          />
          <span className="slider"></span>
        </label>
      </div>
    </div>
  );
};

/**
 * 文件检测设置组件
 */
interface DetectionSettingsProps {
  settings: ExtensionSettings;
  onUpdate: <K extends keyof ExtensionSettings>(key: K, value: ExtensionSettings[K]) => void;
  newDetectionPath: string;
  setNewDetectionPath: (path: string) => void;
  onAddDetectionPath: () => void;
  onRemoveDetectionPath: (index: number) => void;
  newExcludePattern: string;
  setNewExcludePattern: (pattern: string) => void;
  onAddExcludePattern: () => void;
  onRemoveExcludePattern: (index: number) => void;
}

const DetectionSettings: React.FC<DetectionSettingsProps> = ({
  settings,
  onUpdate,
  newDetectionPath,
  setNewDetectionPath,
  onAddDetectionPath,
  onRemoveDetectionPath,
  newExcludePattern,
  setNewExcludePattern,
  onAddExcludePattern,
  onRemoveExcludePattern
}) => {
  return (
    <div className="settings-group">
      <h3>文件检测设置</h3>
      
      <div className="setting-item">
        <div className="setting-label">
          <label>自动检测</label>
          <p>启动时自动检测工作区中的MCP配置文件</p>
        </div>
        <label className="switch">
          <input
            type="checkbox"
            checked={settings.autoDetect}
            onChange={(e) => onUpdate('autoDetect', e.target.checked)}
          />
          <span className="slider"></span>
        </label>
      </div>

      <div className="setting-item">
        <div className="setting-label">
          <label>检测路径</label>
          <p>指定要检测配置文件的目录路径</p>
        </div>
        <div className="list-editor">
          <div className="list-items">
            {settings.detectionPaths.map((path, index) => (
              <div key={index} className="list-item">
                <span className="item-text">{path}</span>
                <button
                  className="button danger small"
                  onClick={() => onRemoveDetectionPath(index)}
                >
                  删除
                </button>
              </div>
            ))}
          </div>
          <div className="list-add">
            <input
              type="text"
              value={newDetectionPath}
              onChange={(e) => setNewDetectionPath(e.target.value)}
              placeholder="输入检测路径，如: ~/.config"
              onKeyPress={(e) => e.key === 'Enter' && onAddDetectionPath()}
            />
            <button
              className="button primary small"
              onClick={onAddDetectionPath}
              disabled={!newDetectionPath.trim()}
            >
              添加
            </button>
          </div>
        </div>
      </div>

      <div className="setting-item">
        <div className="setting-label">
          <label>排除模式</label>
          <p>指定要排除的文件或目录模式</p>
        </div>
        <div className="list-editor">
          <div className="list-items">
            {settings.excludePatterns.map((pattern, index) => (
              <div key={index} className="list-item">
                <code className="item-text">{pattern}</code>
                <button
                  className="button danger small"
                  onClick={() => onRemoveExcludePattern(index)}
                >
                  删除
                </button>
              </div>
            ))}
          </div>
          <div className="list-add">
            <input
              type="text"
              value={newExcludePattern}
              onChange={(e) => setNewExcludePattern(e.target.value)}
              placeholder="输入排除模式，如: **/node_modules/**"
              onKeyPress={(e) => e.key === 'Enter' && onAddExcludePattern()}
            />
            <button
              className="button primary small"
              onClick={onAddExcludePattern}
              disabled={!newExcludePattern.trim()}
            >
              添加
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 备份设置组件
 */
interface BackupSettingsProps {
  settings: ExtensionSettings;
  onUpdate: <K extends keyof ExtensionSettings>(key: K, value: ExtensionSettings[K]) => void;
}

const BackupSettings: React.FC<BackupSettingsProps> = ({ settings, onUpdate }) => {
  return (
    <div className="settings-group">
      <h3>备份设置</h3>
      
      <div className="setting-item">
        <div className="setting-label">
          <label>自动备份</label>
          <p>在修改配置文件前自动创建备份</p>
        </div>
        <label className="switch">
          <input
            type="checkbox"
            checked={settings.autoBackup}
            onChange={(e) => onUpdate('autoBackup', e.target.checked)}
          />
          <span className="slider"></span>
        </label>
      </div>

      <div className="setting-item">
        <div className="setting-label">
          <label>备份保留天数</label>
          <p>自动删除超过指定天数的备份文件</p>
        </div>
        <input
          type="number"
          value={settings.backupRetentionDays}
          onChange={(e) => onUpdate('backupRetentionDays', parseInt(e.target.value) || 7)}
          min="1"
          max="365"
        />
      </div>

      <div className="setting-item">
        <div className="setting-label">
          <label>默认合并策略</label>
          <p>配置文件冲突时的默认处理方式</p>
        </div>
        <select
          value={settings.defaultMergeStrategy}
          onChange={(e) => onUpdate('defaultMergeStrategy', e.target.value as ExtensionSettings['defaultMergeStrategy'])}
        >
          <option value="overwrite">覆盖</option>
          <option value="skip">跳过</option>
          <option value="merge">合并</option>
          <option value="prompt">询问</option>
        </select>
      </div>
    </div>
  );
};

/**
 * 验证设置组件
 */
interface ValidationSettingsProps {
  settings: ExtensionSettings;
  onUpdate: <K extends keyof ExtensionSettings>(key: K, value: ExtensionSettings[K]) => void;
}

const ValidationSettings: React.FC<ValidationSettingsProps> = ({ settings, onUpdate }) => {
  return (
    <div className="settings-group">
      <h3>验证设置</h3>
      
      <div className="setting-item">
        <div className="setting-label">
          <label>验证级别</label>
          <p>配置文件验证的严格程度</p>
        </div>
        <select
          value={settings.validationLevel}
          onChange={(e) => onUpdate('validationLevel', e.target.value as ExtensionSettings['validationLevel'])}
        >
          <option value="strict">严格 - 检查所有错误和警告</option>
          <option value="normal">普通 - 检查错误和重要警告</option>
          <option value="loose">宽松 - 仅检查严重错误</option>
        </select>
      </div>

      <div className="setting-info">
        <h4>验证级别说明</h4>
        <ul>
          <li><strong>严格模式:</strong> 检查所有语法错误、类型错误、格式问题和最佳实践建议</li>
          <li><strong>普通模式:</strong> 检查语法错误、类型错误和重要的配置问题</li>
          <li><strong>宽松模式:</strong> 仅检查会导致功能异常的严重错误</li>
        </ul>
      </div>
    </div>
  );
};

/**
 * 高级设置组件
 */
interface AdvancedSettingsProps {
  settings: ExtensionSettings;
  onUpdate: <K extends keyof ExtensionSettings>(key: K, value: ExtensionSettings[K]) => void;
}

const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({ settings, onUpdate }) => {
  return (
    <div className="settings-group">
      <h3>高级设置</h3>
      
      <div className="setting-item">
        <div className="setting-label">
          <label>调试模式</label>
          <p>启用详细的调试日志和开发者工具</p>
        </div>
        <label className="switch">
          <input
            type="checkbox"
            checked={settings.debugMode}
            onChange={(e) => onUpdate('debugMode', e.target.checked)}
          />
          <span className="slider"></span>
        </label>
      </div>

      <div className="setting-warning">
        <h4>⚠️ 注意</h4>
        <p>调试模式会产生大量日志信息，可能影响性能。建议仅在需要排查问题时启用。</p>
      </div>

      <div className="setting-info">
        <h4>扩展信息</h4>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">版本:</span>
            <span className="info-value">1.0.0</span>
          </div>
          <div className="info-item">
            <span className="info-label">作者:</span>
            <span className="info-value">MCP Team</span>
          </div>
          <div className="info-item">
            <span className="info-label">许可证:</span>
            <span className="info-value">MIT</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;