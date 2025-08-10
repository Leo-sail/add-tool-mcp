import React, { useState } from 'react';
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
export const ServiceForm: React.FC<ServiceFormProps> = ({
  mode,
  service,
  onSubmit,
  onCancel
}) => {
  // 表单状态
  const [formData, setFormData] = useState<{
    name: string;
    command: string;
    args: string[];
    env: Record<string, string>;
    disabled: boolean;
  }>(() => {
    if (mode === 'edit' && service) {
      return {
        name: service.name,
        command: service.command,
        args: service.args || [],
        env: service.env || {},
        disabled: service.disabled || false
      };
    }
    return {
      name: '',
      command: '',
      args: [],
      env: {},
      disabled: false
    };
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * 验证表单
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '服务名称不能为空';
    }

    if (!formData.command.trim()) {
      newErrors.command = '命令不能为空';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * 处理表单提交
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      const config: MCPServiceConfig = {
        command: formData.command,
        args: formData.args,
        env: formData.env,
        disabled: formData.disabled
      };
      onSubmit(formData.name, config);
    }
  };

  /**
   * 更新表单字段
   */
  const updateFormData = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  /**
   * 添加参数
   */
  const addArg = () => {
    updateFormData('args', [...formData.args, '']);
  };

  /**
   * 更新参数
   */
  const updateArg = (index: number, value: string) => {
    const newArgs = [...formData.args];
    newArgs[index] = value;
    updateFormData('args', newArgs);
  };

  /**
   * 删除参数
   */
  const removeArg = (index: number) => {
    const newArgs = formData.args.filter((_, i) => i !== index);
    updateFormData('args', newArgs);
  };

  /**
   * 添加环境变量
   */
  const addEnvVar = () => {
    const key = prompt('请输入环境变量名称:');
    if (key && key.trim()) {
      updateFormData('env', { ...formData.env, [key.trim()]: '' });
    }
  };

  /**
   * 更新环境变量
   */
  const updateEnvVar = (key: string, value: string) => {
    updateFormData('env', { ...formData.env, [key]: value });
  };

  /**
   * 删除环境变量
   */
  const removeEnvVar = (key: string) => {
    const newEnv = { ...formData.env };
    delete newEnv[key];
    updateFormData('env', newEnv);
  };

  return (
    <div className="service-form-overlay">
      <div className="service-form">
        <div className="form-header">
          <h3>{mode === 'add' ? '添加服务' : '编辑服务'}</h3>
          <button className="close-button" onClick={onCancel}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* 服务名称 */}
          <div className="form-group">
            <label htmlFor="serviceName">服务名称 *</label>
            <input
              id="serviceName"
              type="text"
              value={formData.name}
              onChange={(e) => updateFormData('name', e.target.value)}
              className={errors.name ? 'error' : ''}
              disabled={mode === 'edit'}
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          {/* 命令 */}
          <div className="form-group">
            <label htmlFor="command">命令 *</label>
            <input
              id="command"
              type="text"
              value={formData.command}
              onChange={(e) => updateFormData('command', e.target.value)}
              className={errors.command ? 'error' : ''}
              placeholder="例如: python"
            />
            {errors.command && <span className="error-message">{errors.command}</span>}
          </div>

          {/* 参数 */}
          <div className="form-group">
            <label>参数</label>
            <div className="args-list">
              {formData.args.map((arg, index) => (
                <div key={index} className="arg-item">
                  <input
                    type="text"
                    value={arg}
                    onChange={(e) => updateArg(index, e.target.value)}
                    placeholder={`参数 ${index + 1}`}
                  />
                  <button
                    type="button"
                    className="remove-button"
                    onClick={() => removeArg(index)}
                  >
                    删除
                  </button>
                </div>
              ))}
              <button type="button" className="add-button" onClick={addArg}>
                + 添加参数
              </button>
            </div>
          </div>

          {/* 环境变量 */}
          <div className="form-group">
            <label>环境变量</label>
            <div className="env-list">
              {Object.entries(formData.env).map(([key, value]) => (
                <div key={key} className="env-item">
                  <span className="env-key">{key}</span>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => updateEnvVar(key, e.target.value)}
                    placeholder="环境变量值"
                  />
                  <button
                    type="button"
                    className="remove-button"
                    onClick={() => removeEnvVar(key)}
                  >
                    删除
                  </button>
                </div>
              ))}
              <button type="button" className="add-button" onClick={addEnvVar}>
                + 添加环境变量
              </button>
            </div>
          </div>

          {/* 禁用状态 */}
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.disabled}
                onChange={(e) => updateFormData('disabled', e.target.checked)}
              />
              禁用此服务
            </label>
          </div>

          {/* 表单按钮 */}
          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={onCancel}>
              取消
            </button>
            <button type="submit" className="submit-button">
              {mode === 'add' ? '添加' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};