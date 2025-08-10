import React, { useState, useEffect } from 'react';
import './ConflictResolver.css';
import {
  ConfigConflict,
  MergeStrategy,
  MergeOptions,
  MCPConfig,
  MCPServiceConfig
} from '../../types';

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
export const ConflictResolver: React.FC<ConflictResolverProps> = ({
  conflicts,
  mergeOptions,
  isResolving,
  onResolveConflicts,
  onCancel,
  onPreview
}) => {
  const [resolutions, setResolutions] = useState<ConflictResolution[]>([]);
  const [previewConfig, setPreviewConfig] = useState<MCPConfig | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [currentConflictIndex, setCurrentConflictIndex] = useState(0);
  const [autoResolveMode, setAutoResolveMode] = useState(false);
  const [defaultStrategy, setDefaultStrategy] = useState<MergeStrategy>('prompt');

  /**
   * 初始化解决方案
   */
  useEffect(() => {
    const initialResolutions: ConflictResolution[] = conflicts.map(conflict => ({
      conflictId: conflict.id,
      strategy: mergeOptions.defaultStrategy || 'prompt'
    }));
    setResolutions(initialResolutions);
  }, [conflicts, mergeOptions]);

  /**
   * 更新解决方案
   */
  const updateResolution = (conflictId: string, updates: Partial<ConflictResolution>) => {
    setResolutions(prev => prev.map(resolution => 
      resolution.conflictId === conflictId 
        ? { ...resolution, ...updates }
        : resolution
    ));
  };

  /**
   * 应用默认策略到所有冲突
   */
  const applyDefaultStrategy = () => {
    setResolutions(prev => prev.map(resolution => ({
      ...resolution,
      strategy: defaultStrategy,
      selectedValue: undefined,
      customValue: undefined
    })));
  };

  /**
   * 自动解决冲突
   */
  const autoResolveConflicts = () => {
    const autoResolutions: ConflictResolution[] = conflicts.map(conflict => {
      let strategy: MergeStrategy = 'merge';
      let selectedValue: any = undefined;
      
      // 根据冲突类型自动选择策略
      switch (conflict.type) {
        case 'duplicate':
          // 对于重复服务，默认选择源配置
          strategy = 'overwrite';
          selectedValue = conflict.values.source;
          break;
        case 'different-config':
          // 对于冲突值，尝试合并或选择最新的
          if (typeof conflict.values.source === 'object') {
            strategy = 'merge';
          } else {
            strategy = 'overwrite';
            selectedValue = conflict.values.target;
          }
          break;
        case 'missing_dependency':
          // 对于缺失依赖，跳过
          strategy = 'skip';
          break;
        default:
          strategy = 'prompt';
      }
      
      return {
        conflictId: conflict.id,
        strategy,
        selectedValue
      };
    });
    
    setResolutions(autoResolutions);
  };

  /**
   * 预览合并结果
   */
  const handlePreview = async () => {
    try {
      const config = await onPreview(resolutions);
      setPreviewConfig(config);
      setShowPreview(true);
    } catch (error) {
      console.error('预览失败:', error);
    }
  };

  /**
   * 解决冲突
   */
  const handleResolve = async () => {
    // 验证所有冲突都有解决方案
    const unresolved = resolutions.filter(resolution => 
      resolution.strategy === 'prompt' || 
      (resolution.strategy === 'overwrite' && !resolution.selectedValue && !resolution.customValue)
    );
    
    if (unresolved.length > 0) {
      alert(`还有 ${unresolved.length} 个冲突需要解决`);
      return;
    }
    
    await onResolveConflicts(resolutions);
  };

  /**
   * 导航到指定冲突
   */
  const navigateToConflict = (index: number) => {
    setCurrentConflictIndex(Math.max(0, Math.min(index, conflicts.length - 1)));
  };

  /**
   * 格式化冲突值
   */
  const formatConflictValue = (value: any): string => {
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  /**
   * 获取冲突类型显示名称
   */
  const getConflictTypeName = (type: string): string => {
    const typeNames: Record<string, string> = {
      'duplicate_service': '重复服务',
      'conflicting_value': '冲突值',
      'missing_dependency': '缺失依赖',
      'version_mismatch': '版本不匹配',
      'schema_conflict': '架构冲突'
    };
    return typeNames[type] || type;
  };

  /**
   * 获取策略显示名称
   */
  const getStrategyName = (strategy: MergeStrategy): string => {
    const strategyNames: Record<MergeStrategy, string> = {
      'overwrite': '覆盖',
      'skip': '跳过',
      'merge': '合并',
      'prompt': '手动选择'
    };
    return strategyNames[strategy];
  }

  const currentConflict = conflicts[currentConflictIndex];
  const currentResolution = resolutions.find(r => r.conflictId === currentConflict?.id);
  const resolvedCount = resolutions.filter(r => r.strategy !== 'prompt').length;
  const totalCount = conflicts.length;

  return (
    <div className="conflict-resolver">
      {/* 头部 */}
      <div className="resolver-header">
        <h2>解决配置冲突</h2>
        <div className="conflict-progress">
          <span className="progress-text">
            已解决 {resolvedCount} / {totalCount} 个冲突
          </span>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${(resolvedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* 工具栏 */}
      <div className="resolver-toolbar">
        <div className="toolbar-left">
          <button
            className="btn btn-secondary"
            onClick={() => setAutoResolveMode(!autoResolveMode)}
          >
            {autoResolveMode ? '手动模式' : '自动模式'}
          </button>
          
          {autoResolveMode && (
            <>
              <select
                value={defaultStrategy}
                onChange={(e) => setDefaultStrategy(e.target.value as MergeStrategy)}
                className="strategy-select"
              >
                <option value="overwrite">覆盖</option>
                <option value="skip">跳过</option>
                <option value="merge">合并</option>
              </select>
              <button
                className="btn btn-secondary"
                onClick={applyDefaultStrategy}
              >
                应用到全部
              </button>
              <button
                className="btn btn-secondary"
                onClick={autoResolveConflicts}
              >
                智能解决
              </button>
            </>
          )}
        </div>
        
        <div className="toolbar-right">
          <button
            className="btn btn-secondary"
            onClick={handlePreview}
            disabled={resolvedCount === 0}
          >
            预览结果
          </button>
          <button
            className="btn btn-primary"
            onClick={handleResolve}
            disabled={resolvedCount < totalCount || isResolving}
          >
            {isResolving ? '解决中...' : '应用解决方案'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={onCancel}
          >
            取消
          </button>
        </div>
      </div>

      {/* 主内容 */}
      <div className="resolver-content">
        {/* 冲突导航 */}
        <div className="conflict-navigation">
          <div className="nav-header">
            <h3>冲突列表</h3>
            <span className="conflict-count">{conflicts.length} 个冲突</span>
          </div>
          
          <div className="conflict-list">
            {conflicts.map((conflict, index) => {
              const resolution = resolutions.find(r => r.conflictId === conflict.id);
              const isResolved = resolution?.strategy !== 'prompt';
              const isCurrent = index === currentConflictIndex;
              
              return (
                <div
                  key={conflict.id}
                  className={`conflict-item ${
                    isCurrent ? 'current' : ''
                  } ${
                    isResolved ? 'resolved' : 'unresolved'
                  }`}
                  onClick={() => navigateToConflict(index)}
                >
                  <div className="conflict-info">
                    <span className="conflict-title">
                      {conflict.path || `冲突 ${index + 1}`}
                    </span>
                    <span className="conflict-type">
                      {getConflictTypeName(conflict.type)}
                    </span>
                  </div>
                  
                  <div className="conflict-status">
                    {isResolved ? (
                      <span className="status-resolved">
                        {getStrategyName(resolution?.strategy || 'prompt')}
                      </span>
                    ) : (
                      <span className="status-unresolved">待解决</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 冲突详情 */}
        {currentConflict && currentResolution && (
          <div className="conflict-details">
            <div className="details-header">
              <h3>冲突详情</h3>
              <div className="conflict-navigation-buttons">
                <button
                  className="btn btn-small btn-secondary"
                  onClick={() => navigateToConflict(currentConflictIndex - 1)}
                  disabled={currentConflictIndex === 0}
                >
                  上一个
                </button>
                <span className="conflict-position">
                  {currentConflictIndex + 1} / {conflicts.length}
                </span>
                <button
                  className="btn btn-small btn-secondary"
                  onClick={() => navigateToConflict(currentConflictIndex + 1)}
                  disabled={currentConflictIndex === conflicts.length - 1}
                >
                  下一个
                </button>
              </div>
            </div>
            
            <div className="conflict-info-panel">
              <div className="info-item">
                <label>冲突路径:</label>
                <span>{currentConflict.path}</span>
              </div>
              <div className="info-item">
                <label>冲突类型:</label>
                <span>{getConflictTypeName(currentConflict.type)}</span>
              </div>
              {currentConflict.description && (
                <div className="info-item">
                  <label>描述:</label>
                  <span>{currentConflict.description}</span>
                </div>
              )}
            </div>
            
            {/* 解决策略选择 */}
            <div className="resolution-panel">
              <h4>解决策略</h4>
              
              <div className="strategy-options">
                <label className="strategy-option">
                  <input
                    type="radio"
                    name={`strategy-${currentConflict.id}`}
                    value="overwrite"
                    checked={currentResolution.strategy === 'overwrite'}
                    onChange={(e) => updateResolution(currentConflict.id, {
                      strategy: e.target.value as MergeStrategy
                    })}
                  />
                  <span className="strategy-label">覆盖</span>
                  <span className="strategy-description">使用选择的值覆盖冲突</span>
                </label>
                
                <label className="strategy-option">
                  <input
                    type="radio"
                    name={`strategy-${currentConflict.id}`}
                    value="skip"
                    checked={currentResolution.strategy === 'skip'}
                    onChange={(e) => updateResolution(currentConflict.id, {
                      strategy: e.target.value as MergeStrategy
                    })}
                  />
                  <span className="strategy-label">跳过</span>
                  <span className="strategy-description">忽略此冲突，保持原值</span>
                </label>
                
                <label className="strategy-option">
                  <input
                    type="radio"
                    name={`strategy-${currentConflict.id}`}
                    value="merge"
                    checked={currentResolution.strategy === 'merge'}
                    onChange={(e) => updateResolution(currentConflict.id, {
                      strategy: e.target.value as MergeStrategy
                    })}
                  />
                  <span className="strategy-label">合并</span>
                  <span className="strategy-description">尝试智能合并冲突值</span>
                </label>
              </div>
              
              {/* 值选择 */}
              {currentResolution.strategy === 'overwrite' && (
                <div className="value-selection">
                  <h5>选择要保留的值:</h5>
                  
                  <div className="value-options">
                    {currentConflict.values && [
                      { label: '源配置', value: currentConflict.values.source },
                      { label: '目标配置', value: currentConflict.values.target }
                    ].map((item, index) => (
                      <label key={index} className="value-option">
                        <input
                          type="radio"
                          name={`value-${currentConflict.id}`}
                          checked={currentResolution.selectedValue === item.value}
                          onChange={() => updateResolution(currentConflict.id, {
                            selectedValue: item.value,
                            customValue: undefined
                          })}
                        />
                        <div className="value-content">
                          <div className="value-source">{item.label}</div>
                          <pre className="value-preview">
                            {formatConflictValue(item.value)}
                          </pre>
                        </div>
                      </label>
                    ))}
                    
                    <label className="value-option custom-value">
                      <input
                        type="radio"
                        name={`value-${currentConflict.id}`}
                        checked={!!currentResolution.customValue}
                        onChange={() => updateResolution(currentConflict.id, {
                          selectedValue: undefined,
                          customValue: currentConflict.values?.source || ''
                        })}
                      />
                      <div className="value-content">
                        <div className="value-source">自定义值</div>
                        <textarea
                    className="custom-value-input"
                    value={formatConflictValue(currentResolution?.customValue || '')}
                    onChange={(e) => {
                      try {
                        const value = JSON.parse(e.target.value);
                        updateResolution(currentConflict.id, {
                          selectedValue: undefined,
                          customValue: value
                        });
                      } catch {
                        updateResolution(currentConflict.id, {
                          selectedValue: undefined,
                          customValue: e.target.value
                        });
                      }
                    }}
                    placeholder="输入自定义值（JSON格式）"
                    rows={4}
                  />
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 预览模态框 */}
      {showPreview && previewConfig && (
        <div className="preview-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>合并结果预览</h3>
              <button
                className="btn btn-small btn-secondary"
                onClick={() => setShowPreview(false)}
              >
                关闭
              </button>
            </div>
            
            <div className="modal-body">
              <pre className="config-preview">
                {JSON.stringify(previewConfig, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConflictResolver;