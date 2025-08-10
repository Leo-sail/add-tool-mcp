import React, { useState, useEffect } from 'react';
import './FileDetectionPanel.css';
import {
  DetectedFile,
  FileDetectionOptions,
  FileRecommendation,
  MCPConfig
} from '../../types';

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
export const FileDetectionPanel: React.FC<FileDetectionPanelProps> = ({
  detectedFiles,
  isDetecting,
  options,
  onDetectFiles,
  onOpenFile,
  onImportFile,
  onMergeFiles,
  onCreateConfig
}) => {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [detectionOptions, setDetectionOptions] = useState<FileDetectionOptions>(options);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'valid' | 'invalid' | 'recommended'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'confidence' | 'lastModified' | 'size'>('confidence');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  /**
   * 处理文件选择
   */
  const handleFileSelect = (filePath: string, selected: boolean) => {
    if (selected) {
      setSelectedFiles(prev => [...prev, filePath]);
    } else {
      setSelectedFiles(prev => prev.filter(path => path !== filePath));
    }
  };

  /**
   * 处理全选/取消全选
   */
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const validFiles = getFilteredFiles().filter(file => file.isValid).map(file => file.path);
      setSelectedFiles(validFiles);
    } else {
      setSelectedFiles([]);
    }
  };

  /**
   * 处理检测选项变更
   */
  const handleOptionsChange = (newOptions: Partial<FileDetectionOptions>) => {
    setDetectionOptions((prev: FileDetectionOptions) => ({ ...prev, ...newOptions }));
  };

  /**
   * 执行文件检测
   */
  const handleDetect = async () => {
    await onDetectFiles(detectionOptions);
    setSelectedFiles([]);
  };

  /**
   * 批量导入选中的文件
   */
  const handleBatchImport = async () => {
    if (selectedFiles.length === 0) {
      return;
    }

    try {
      if (selectedFiles.length === 1) {
        await onImportFile(selectedFiles[0]);
      } else {
        await onMergeFiles(selectedFiles);
      }
      setSelectedFiles([]);
    } catch (error) {
      console.error('批量导入失败:', error);
    }
  };

  /**
   * 获取过滤后的文件列表
   */
  const getFilteredFiles = (): DetectedFile[] => {
    let filtered = detectedFiles;

    // 按类型过滤
    switch (filterType) {
      case 'valid':
        filtered = filtered.filter(file => file.isValid);
        break;
      case 'invalid':
        filtered = filtered.filter(file => !file.isValid);
        break;
      case 'recommended':
        filtered = filtered.filter(file => file.confidence > 0.7);
        break;
    }

    // 排序
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'confidence':
          comparison = a.confidence - b.confidence;
          break;
        case 'lastModified':
          comparison = new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime();
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  };

  /**
   * 格式化文件大小
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  /**
   * 格式化置信度
   */
  const formatConfidence = (confidence: number): string => {
    return `${Math.round(confidence * 100)}%`;
  };

  /**
   * 获取置信度颜色类
   */
  const getConfidenceClass = (confidence: number): string => {
    if (confidence >= 0.8) return 'confidence-high';
    if (confidence >= 0.5) return 'confidence-medium';
    return 'confidence-low';
  };

  const filteredFiles = getFilteredFiles();
  const validFiles = detectedFiles.filter(file => file.isValid);
  const selectedValidFiles = selectedFiles.filter(path => 
    validFiles.some(file => file.path === path)
  );

  return (
    <div className="file-detection-panel">
      {/* 头部 */}
      <div className="panel-header">
        <h2>文件检测</h2>
        <div className="header-actions">
          <button
            className="btn btn-secondary"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? '隐藏高级选项' : '显示高级选项'}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleDetect}
            disabled={isDetecting}
          >
            {isDetecting ? '检测中...' : '重新检测'}
          </button>
        </div>
      </div>

      {/* 高级选项 */}
      {showAdvanced && (
        <div className="advanced-options">
          <div className="form-group">
            <label>检测路径</label>
            <textarea
              value={detectionOptions.searchPaths?.join('\n') || ''}
              onChange={(e) => handleOptionsChange({
                searchPaths: e.target.value.split('\n').filter(path => path.trim())
              })}
              placeholder="每行一个路径，留空使用默认路径"
              rows={3}
            />
          </div>
          
          <div className="form-group">
            <label>排除模式</label>
            <textarea
              value={detectionOptions.excludePatterns?.join('\n') || ''}
              onChange={(e) => handleOptionsChange({
                excludePatterns: e.target.value.split('\n').filter(pattern => pattern.trim())
              })}
              placeholder="每行一个glob模式，如：**/node_modules/**"
              rows={3}
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>最大深度</label>
              <input
                type="number"
                value={detectionOptions.maxDepth || 5}
                onChange={(e) => handleOptionsChange({
                  maxDepth: parseInt(e.target.value) || 5
                })}
                min={1}
                max={20}
              />
            </div>
            
            <div className="form-group">
              <label>最小置信度</label>
              <input
                type="number"
                value={detectionOptions.minConfidence || 0.3}
                onChange={(e) => handleOptionsChange({
                  minConfidence: parseFloat(e.target.value) || 0.3
                })}
                min={0}
                max={1}
                step={0.1}
              />
            </div>
          </div>
          
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={detectionOptions.includeHidden || false}
                onChange={(e) => handleOptionsChange({
                  includeHidden: e.target.checked
                })}
              />
              包含隐藏文件
            </label>
          </div>
        </div>
      )}

      {/* 统计信息 */}
      <div className="detection-stats">
        <div className="stat-item">
          <span className="stat-label">总计:</span>
          <span className="stat-value">{detectedFiles.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">有效:</span>
          <span className="stat-value valid">{validFiles.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">无效:</span>
          <span className="stat-value invalid">{detectedFiles.length - validFiles.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">已选:</span>
          <span className="stat-value selected">{selectedValidFiles.length}</span>
        </div>
      </div>

      {/* 工具栏 */}
      <div className="toolbar">
        <div className="toolbar-left">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="filter-select"
          >
            <option value="all">全部文件</option>
            <option value="valid">有效文件</option>
            <option value="invalid">无效文件</option>
            <option value="recommended">推荐文件</option>
          </select>
          
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field as any);
              setSortOrder(order as any);
            }}
            className="sort-select"
          >
            <option value="confidence-desc">置信度 ↓</option>
            <option value="confidence-asc">置信度 ↑</option>
            <option value="name-asc">名称 ↑</option>
            <option value="name-desc">名称 ↓</option>
            <option value="lastModified-desc">修改时间 ↓</option>
            <option value="lastModified-asc">修改时间 ↑</option>
            <option value="size-desc">大小 ↓</option>
            <option value="size-asc">大小 ↑</option>
          </select>
        </div>
        
        <div className="toolbar-right">
          {validFiles.length > 0 && (
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={selectedValidFiles.length === validFiles.length && validFiles.length > 0}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
              全选有效文件
            </label>
          )}
          
          {selectedFiles.length > 0 && (
            <button
              className="btn btn-primary"
              onClick={handleBatchImport}
            >
              {selectedFiles.length === 1 ? '导入选中文件' : `合并 ${selectedFiles.length} 个文件`}
            </button>
          )}
        </div>
      </div>

      {/* 文件列表 */}
      <div className="file-list">
        {isDetecting ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>正在检测文件...</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="empty-state">
            {detectedFiles.length === 0 ? (
              <>
                <p>未检测到MCP配置文件</p>
                <button
                  className="btn btn-primary"
                  onClick={() => onCreateConfig('.')}
                >
                  创建新配置文件
                </button>
              </>
            ) : (
              <p>没有符合筛选条件的文件</p>
            )}
          </div>
        ) : (
          <div className="file-table">
            <div className="file-table-header">
              <div className="file-cell file-select"></div>
              <div className="file-cell file-name">文件名</div>
              <div className="file-cell file-confidence">置信度</div>
              <div className="file-cell file-size">大小</div>
              <div className="file-cell file-modified">修改时间</div>
              <div className="file-cell file-actions">操作</div>
            </div>
            
            {filteredFiles.map((file) => (
              <div key={file.path} className={`file-row ${!file.isValid ? 'invalid' : ''}`}>
                <div className="file-cell file-select">
                  {file.isValid && (
                    <input
                      type="checkbox"
                      checked={selectedFiles.includes(file.path)}
                      onChange={(e) => handleFileSelect(file.path, e.target.checked)}
                    />
                  )}
                </div>
                
                <div className="file-cell file-name">
                  <div className="file-info">
                    <span className="file-name-text" title={file.path}>
                      {file.name}
                    </span>
                    <span className="file-path">{file.path}</span>
                    {!file.isValid && (
                      <span className="file-error" title="文件无效">
                        文件无效
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="file-cell file-confidence">
                  <span className={`confidence-badge ${getConfidenceClass(file.confidence)}`}>
                    {formatConfidence(file.confidence)}
                  </span>
                </div>
                
                <div className="file-cell file-size">
                  {formatFileSize(file.size)}
                </div>
                
                <div className="file-cell file-modified">
                  {new Date(file.lastModified).toLocaleString()}
                </div>
                
                <div className="file-cell file-actions">
                  <button
                    className="btn btn-small btn-secondary"
                    onClick={() => onOpenFile(file.path)}
                    title="在编辑器中打开"
                  >
                    打开
                  </button>
                  
                  {file.isValid && (
                    <button
                      className="btn btn-small btn-primary"
                      onClick={() => onImportFile(file.path)}
                      title="导入此配置文件"
                    >
                      导入
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 推荐位置 */}
      {detectedFiles.length === 0 && !isDetecting && (
        <div className="recommendations">
          <h3>推荐的配置文件位置</h3>
          <div className="recommendation-list">
            <div className="recommendation-item">
              <span className="recommendation-path">~/.config/mcp/config.json</span>
              <button
                className="btn btn-small btn-primary"
                onClick={() => onCreateConfig('~/.config/mcp/config.json')}
              >
                在此创建
              </button>
            </div>
            <div className="recommendation-item">
              <span className="recommendation-path">./mcp-config.json</span>
              <button
                className="btn btn-small btn-primary"
                onClick={() => onCreateConfig('./mcp-config.json')}
              >
                在此创建
              </button>
            </div>
            <div className="recommendation-item">
              <span className="recommendation-path">./.mcp/config.json</span>
              <button
                className="btn btn-small btn-primary"
                onClick={() => onCreateConfig('./.mcp/config.json')}
              >
                在此创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileDetectionPanel;