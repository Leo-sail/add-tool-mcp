/**
 * MCP配置管理器的核心类型定义
 * 包含所有与MCP服务配置相关的接口和类型
 */
/**
 * MCP配置文件的根结构
 */
export interface MCPConfig {
    /** MCP服务配置对象，键为服务名称 */
    mcpServers: Record<string, MCPServiceConfig>;
    /** 配置文件版本 */
    version?: string;
    /** 配置文件元数据 */
    metadata?: ConfigMetadata;
    /** JSON Schema引用 */
    $schema?: string;
}
/**
 * 单个MCP服务的配置
 */
export interface MCPServiceConfig {
    /** 服务启动命令 */
    command: string;
    /** 命令参数数组 */
    args?: string[];
    /** 环境变量配置 */
    env?: Record<string, string>;
    /** 是否禁用此服务 */
    disabled?: boolean;
    /** 工作目录 */
    cwd?: string;
    /** 超时设置（毫秒） */
    timeout?: number;
    /** 服务元数据 */
    metadata?: ServiceMetadata;
}
/**
 * 服务元数据信息
 */
export interface ServiceMetadata {
    /** 服务描述 */
    description?: string;
    /** 服务作者 */
    author?: string;
    /** 服务版本 */
    version?: string;
    /** 服务标签 */
    tags?: string[];
    /** 最后修改时间戳 */
    lastModified?: number;
    /** 服务来源：手动创建、模板导入等 */
    source?: 'manual' | 'template' | 'import' | 'clipboard';
}
/**
 * 配置文件元数据
 */
export interface ConfigMetadata {
    /** 创建者 */
    createdBy: string;
    /** 创建时间戳 */
    createdAt: number;
    /** 最后修改时间戳 */
    lastModified: number;
    /** 配置版本 */
    version: string;
    /** 文件校验和 */
    checksum?: string;
}
/**
 * 工作区配置选项
 */
export interface WorkspaceConfig {
    /** 是否自动检测配置文件 */
    autoDetect: boolean;
    /** 是否监控文件变化 */
    watchFiles: boolean;
    /** 保存时是否自动备份 */
    backupOnSave: boolean;
    /** 配置合并策略 */
    mergeStrategy: 'smart' | 'manual' | 'always-prompt';
    /** 检测路径模式 */
    detectionPaths: string[];
    /** 排除模式 */
    excludePatterns: string[];
}
/**
 * 插件状态管理
 */
export interface ExtensionState {
    /** 当前活动的工作区路径 */
    activeWorkspace?: string;
    /** 已打开的配置文件映射 */
    openConfigs: Map<string, MCPConfig>;
    /** 最近访问的文件列表 */
    recentFiles: string[];
    /** 用户设置 */
    userSettings: WorkspaceConfig;
    /** 检测到的文件列表 */
    detectedFiles: DetectedFile[];
}
/**
 * 检测到的配置文件信息
 */
export interface DetectedFile {
    /** 文件路径 */
    path: string;
    /** 文件名 */
    name: string;
    /** 文件类型 */
    type: 'mcp.json' | 'settings.json';
    /** 所属应用 */
    app: 'cursor' | 'windsurf' | 'vscode' | 'unknown';
    /** 是否包含MCP服务配置 */
    hasServers: boolean;
    /** 服务数量 */
    serverCount: number;
    /** 文件大小（字节） */
    size: number;
    /** 最后修改时间 */
    lastModified: string;
    /** 置信度（0-1） */
    confidence: number;
    /** 检测到的应用类型 */
    detectedApp: 'cursor' | 'windsurf' | 'vscode' | 'unknown';
    /** 文件内容预览 */
    preview?: string;
    /** 文件是否有效 */
    isValid: boolean;
}
/**
 * 文件检测选项
 */
export interface FileDetectionOptions {
    /** 工作区路径 */
    workspacePath: string;
    /** 是否包含子目录 */
    includeSubdirs: boolean;
    /** 是否包含隐藏文件 */
    includeHidden: boolean;
    /** 目标应用列表 */
    targetApps: ('cursor' | 'windsurf' | 'vscode')[];
    /** 最大检测深度 */
    maxDepth: number;
    /** 最小置信度 */
    minConfidence: number;
    /** 搜索路径 */
    searchPaths: string[];
    /** 文件模式 */
    filePatterns: string[];
    /** 排除模式 */
    excludePatterns: string[];
}
/**
 * 文件检测建议
 */
export interface FileRecommendation {
    /** 建议类型 */
    type: 'import' | 'merge' | 'backup' | 'update';
    /** 建议消息 */
    message: string;
    /** 目标文件路径 */
    filePath: string;
    /** 建议的操作 */
    action?: string;
}
/**
 * 配置冲突信息
 */
export interface ConfigConflict {
    /** 冲突唯一标识 */
    id: string;
    /** 冲突的服务名称 */
    serviceName: string;
    /** 冲突类型 */
    type: 'duplicate' | 'different-config' | 'version-mismatch' | 'missing_dependency';
    /** 源配置 */
    sourceConfig: MCPServiceConfig;
    /** 目标配置 */
    targetConfig: MCPServiceConfig;
    /** 冲突描述 */
    description: string;
    /** 冲突路径 */
    path: string;
    /** 建议的解决方案 */
    resolution?: 'keep-source' | 'keep-target' | 'merge' | 'rename';
    /** 冲突值 */
    values: {
        source: any;
        target: any;
    };
}
/** 合并策略类型 */
export type MergeStrategy = 'overwrite' | 'merge' | 'skip' | 'prompt';
/** 合并选项接口 */
export interface MergeOptions {
    /** 默认策略 */
    defaultStrategy?: MergeStrategy;
    /** 是否保留注释 */
    preserveComments?: boolean;
    /** 是否验证结果 */
    validateResult?: boolean;
    /** 自定义合并规则 */
    customRules?: Record<string, MergeStrategy>;
}
/**
 * 操作历史记录
 */
export interface OperationHistory {
    /** 操作ID */
    id: string;
    /** 操作时间戳 */
    timestamp: number;
    /** 操作类型 */
    operation: 'add' | 'edit' | 'delete' | 'merge' | 'import' | 'export';
    /** 操作目标 */
    target: string;
    /** 操作前的状态 */
    before?: any;
    /** 操作后的状态 */
    after?: any;
    /** 操作用户 */
    user: string;
    /** 操作描述 */
    description?: string;
}
/**
 * 验证规则定义
 */
export interface ValidationRule {
    /** 验证字段路径 */
    field: string;
    /** 验证类型 */
    type: 'required' | 'format' | 'custom';
    /** 错误消息 */
    message: string;
    /** 自定义验证函数 */
    validator?: (value: any) => boolean;
}
/**
 * 验证结果
 */
export interface ValidationResult {
    /** 是否验证通过 */
    isValid: boolean;
    /** 错误列表 */
    errors: ValidationError[];
    /** 警告列表 */
    warnings: ValidationWarning[];
    /** 建议列表 */
    suggestions?: string[];
}
/**
 * 验证错误
 */
export interface ValidationError {
    /** 错误字段路径 */
    field: string;
    /** 错误消息 */
    message: string;
    /** 错误值 */
    value?: any;
    /** 错误路径 */
    path?: string;
    /** 错误位置（行号等） */
    location?: {
        line: number;
        column: number;
    };
    /** 错误类型 */
    type?: string;
    /** 错误严重程度 */
    severity?: string;
    /** 建议的修复方案 */
    suggestion?: string;
}
/**
 * 验证警告
 */
export interface ValidationWarning {
    /** 警告字段路径 */
    field: string;
    /** 警告消息 */
    message: string;
    /** 警告值 */
    value?: any;
    /** 警告路径 */
    path?: string;
    /** 建议的修复方案 */
    suggestion?: string;
}
/**
 * API请求和响应类型
 */
/**
 * 获取服务列表请求
 */
export interface GetServicesRequest {
    /** 请求ID */
    id: string;
    /** 配置文件路径 */
    filePath?: string;
    /** 是否包含禁用的服务 */
    includeDisabled?: boolean;
}
/**
 * 获取服务列表响应
 */
export interface GetServicesResponse {
    /** 服务列表 */
    services: MCPService[];
    /** 配置文件路径 */
    filePath: string;
    /** 最后修改时间 */
    lastModified: number;
}
/**
 * MCP服务信息（包含ID）
 */
export interface MCPService extends MCPServiceConfig {
    /** 服务唯一标识 */
    id: string;
    /** 服务名称 */
    name: string;
    /** 服务状态 */
    status?: 'active' | 'inactive' | 'error';
}
/**
 * 添加服务请求
 */
export interface AddServiceRequest {
    /** 请求ID */
    id: string;
    /** 服务名称 */
    serviceName: string;
    /** 服务配置 */
    serviceConfig: MCPServiceConfig;
    /** 目标文件路径 */
    filePath: string;
    /** 插入位置 */
    position?: 'start' | 'end' | number;
}
/**
 * 添加服务响应
 */
export interface AddServiceResponse {
    /** 操作是否成功 */
    success: boolean;
    /** 新服务的ID */
    serviceId: string;
    /** 响应消息 */
    message?: string;
}
/**
 * 合并配置请求
 */
export interface MergeConfigsRequest {
    /** 请求ID */
    id: string;
    /** 源文件路径列表 */
    sourcePaths: string[];
    /** 目标文件路径 */
    targetPath: string;
    /** 合并策略 */
    strategy: 'merge' | 'replace' | 'append';
    /** 冲突解决方案 */
    conflictResolution: 'keep-source' | 'keep-target' | 'prompt';
}
/**
 * 合并配置响应
 */
export interface MergeConfigsResponse {
    /** 操作是否成功 */
    success: boolean;
    /** 冲突列表 */
    conflicts: ConfigConflict[];
    /** 合并后的配置 */
    mergedConfig: MCPConfig;
}
/**
 * 合并结果
 */
export interface MergeResult {
    /** 操作是否成功 */
    success: boolean;
    /** 合并后的配置 */
    config: MCPConfig;
    /** 冲突列表 */
    conflicts: ConfigConflict[];
    /** 操作消息 */
    message?: string;
}
/**
 * 更新服务请求
 */
export interface UpdateServiceRequest {
    /** 请求ID */
    id: string;
    /** 服务ID */
    serviceId: string;
    /** 服务名称 */
    serviceName: string;
    /** 服务配置 */
    serviceConfig: MCPServiceConfig;
    /** 文件路径 */
    filePath: string;
}
/**
 * 删除服务请求
 */
export interface DeleteServiceRequest {
    /** 请求ID */
    id: string;
    /** 服务名称 */
    serviceName: string;
    /** 配置文件路径 */
    filePath?: string;
}
/**
 * 获取配置请求
 */
export interface GetConfigRequest {
    /** 请求ID */
    id: string;
    /** 文件路径 */
    filePath: string;
}
/**
 * 更新配置请求
 */
export interface UpdateConfigRequest {
    /** 请求ID */
    id: string;
    /** 配置内容 */
    config: MCPConfig;
    /** 文件路径 */
    filePath: string;
}
/**
 * 验证配置请求
 */
export interface ValidateConfigRequest {
    /** 请求ID */
    id: string;
    /** 配置内容 */
    config: MCPConfig;
    /** 文件路径 */
    filePath?: string;
}
/**
 * 从剪贴板导入请求
 */
export interface ImportFromClipboardRequest {
    /** 请求ID */
    id: string;
    /** 剪贴板内容 */
    content?: string;
}
/**
 * 导出配置请求
 */
export interface ExportConfigRequest {
    /** 请求ID */
    id: string;
    /** 配置内容 */
    config: MCPConfig;
    /** 导出路径 */
    filePath: string;
    /** 导出格式 */
    format: 'json' | 'yaml';
}
/**
 * 检测文件请求
 */
export interface DetectFilesRequest {
    /** 请求ID */
    id: string;
    /** 工作区路径 */
    workspacePath: string;
    /** 是否包含子目录 */
    includeSubdirs?: boolean;
    /** 目标应用列表 */
    targetApps?: ('cursor' | 'windsurf' | 'vscode')[];
}
/**
 * 检测文件响应
 */
export interface DetectFilesResponse {
    /** 检测到的文件列表 */
    files: DetectedFile[];
    /** 建议列表 */
    recommendations: FileRecommendation[];
}
/**
 * WebView消息类型
 */
export interface WebViewMessage {
    /** 消息ID */
    id: string;
    /** 消息类型 */
    type: 'getServices' | 'addService' | 'editService' | 'deleteService' | 'mergeConfigs' | 'detectFiles' | 'validateConfig' | 'exportConfig' | 'updateConfig' | 'resolveConflicts' | 'openFile' | 'importFile' | 'createConfig' | 'updateSettings' | 'resetSettings' | 'importSettings' | 'exportSettings';
    /** 消息载荷 */
    payload?: any;
}
/**
 * WebView响应类型
 */
export interface WebViewResponse {
    /** 响应ID */
    id: string;
    /** 响应类型 */
    type: 'getServices' | 'servicesLoaded' | 'serviceAdded' | 'serviceUpdated' | 'serviceDeleted' | 'configLoaded' | 'configUpdated' | 'configsMerged' | 'filesDetected' | 'configValidated' | 'settingsImported' | 'configExported' | 'resolveConflicts' | 'openFile' | 'importFile' | 'createConfig' | 'updateSettings' | 'resetSettings' | 'exportSettings' | 'error';
    /** 操作是否成功 */
    success: boolean;
    /** 响应数据 */
    data?: any;
    /** 错误消息 */
    message?: string;
}
/**
 * 配置模板定义
 */
export interface ConfigTemplate {
    /** 模板ID */
    id: string;
    /** 模板名称 */
    name: string;
    /** 模板描述 */
    description: string;
    /** 模板分类 */
    category: string;
    /** 模板配置 */
    config: MCPServiceConfig;
    /** 模板标签 */
    tags: string[];
    /** 是否为内置模板 */
    builtin: boolean;
}
//# sourceMappingURL=index.d.ts.map