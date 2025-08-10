import * as vscode from 'vscode';
import { MCPManagerProvider } from './core/MCPManagerProvider';
import { CommandManager } from './commands/CommandManager';
import { FileWatcher } from './core/FileWatcher';
import { AutoDetectionService } from './core/AutoDetectionService';
import { NotificationManager, NotificationType } from './core/NotificationManager';
import { ErrorHandler } from './core/ErrorHandler';
import { Validator } from './core/Validator';
import { FeedbackManager } from './core/FeedbackManager';
import { ConfigurationManager } from './core/ConfigurationManager';
import { FileDetector } from './core/FileDetector';
import { ContextMenuProvider } from './ui/ContextMenuProvider';
import { StatusBarProvider } from './ui/StatusBarProvider';

/**
 * 扩展激活函数
 * 当VS Code启动或满足激活条件时调用
 * @param context 扩展上下文，用于注册命令、提供者等
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('MCP配置管理器插件正在激活...');

    // 初始化核心组件
    const configManager = new ConfigurationManager();
    const fileDetector = new FileDetector();
    const notificationManager = new NotificationManager();
    const errorHandler = new ErrorHandler(notificationManager);
    const validator = new Validator();
    const feedbackManager = new FeedbackManager(notificationManager, errorHandler);
    
    // 创建文件监控器
    const fileWatcher = new FileWatcher(configManager, fileDetector);
    
    // 创建自动检测服务
    const autoDetectionService = new AutoDetectionService(fileDetector, configManager);
    
    // 创建WebView提供者
    const mcpManagerProvider = new MCPManagerProvider(context, configManager, fileDetector);
    
    // 创建命令管理器
    const commandManager = new CommandManager(context, mcpManagerProvider, configManager, fileDetector);
    
    // 创建右键菜单提供者
    const contextMenuProvider = new ContextMenuProvider(context, configManager, fileDetector);
    
    // 创建状态栏提供者
    const statusBarProvider = new StatusBarProvider(configManager, fileDetector);

    // 注册WebView提供者
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            MCPManagerProvider.viewType,
            mcpManagerProvider
        )
    );

    // 注册CommandManager的命令
    commandManager.registerCommands();
    
    // 注册其他命令
    registerCommands(context, commandManager, autoDetectionService, notificationManager, errorHandler, validator, feedbackManager, configManager);

    // 注册右键菜单
    contextMenuProvider.register();

    // 启动各种服务
    const config = vscode.workspace.getConfiguration('mcpManager');
    
    // 启动自动检测服务（如果启用）
    if (config.get('autoDetection.enabled', true)) {
        autoDetectionService.start();
    }
    
    // 添加到订阅列表以便清理
    context.subscriptions.push(
        fileWatcher,
        autoDetectionService,
        notificationManager,
        errorHandler,
        feedbackManager,
        statusBarProvider
    );

    // 初始化状态栏
    statusBarProvider.show();

    console.log('MCP配置管理器插件激活完成');
}

/**
 * 注册所有插件命令
 * @param context 扩展上下文
 * @param commandManager 命令管理器实例
 * @param autoDetectionService 自动检测服务实例
 * @param notificationManager 通知管理器实例
 */
function registerCommands(
    context: vscode.ExtensionContext, 
    commandManager: CommandManager,
    autoDetectionService: AutoDetectionService,
    notificationManager: NotificationManager,
    errorHandler: ErrorHandler,
    validator: Validator,
    feedbackManager: FeedbackManager,
    configManager: ConfigurationManager
) {
    const commands = [
        
        // 自动检测相关命令
        vscode.commands.registerCommand('mcpManager.toggleAutoDetection', () => {
            autoDetectionService.toggle();
        }),
        
        vscode.commands.registerCommand('mcpManager.triggerDetection', () => {
            return autoDetectionService.triggerManualDetection();
        }),
        
        vscode.commands.registerCommand('mcpManager.clearDetectionHistory', () => {
            autoDetectionService.clearHistory();
        }),
        
        // 通知管理命令
        vscode.commands.registerCommand('mcpManager.showNotificationHistory', () => {
            const history = notificationManager.getNotificationHistory();
            if (history.length === 0) {
                notificationManager.showNotification({
                     type: NotificationType.INFO,
                     message: '暂无通知历史记录'
                 });
            } else {
                // 显示通知历史面板
                vscode.commands.executeCommand('mcpManager.openPanel');
            }
        }),
        
        vscode.commands.registerCommand('mcpManager.clearNotificationHistory', () => {
            notificationManager.clearHistory();
        }),

        // 错误处理命令
        vscode.commands.registerCommand('mcpManager.showErrorHistory', () => {
            vscode.window.showInformationMessage('错误历史功能暂未实现');
        }),
        vscode.commands.registerCommand('mcpManager.clearErrorHistory', () => {
            vscode.window.showInformationMessage('清除错误历史功能暂未实现');
        }),

        // 验证命令
        vscode.commands.registerCommand('mcpManager.validateConfiguration', async (filePath?: string) => {
            try {
                vscode.window.showInformationMessage('配置验证功能暂未实现');
            } catch (error) {
                vscode.window.showErrorMessage('验证失败: 配置验证过程中发生错误');
            }
        }),
        vscode.commands.registerCommand('mcpManager.quickValidate', async () => {
            try {
                vscode.window.showInformationMessage('快速验证功能暂未实现');
            } catch (error) {
                vscode.window.showErrorMessage('验证失败: 快速验证过程中发生错误');
            }
        }),

        // 反馈管理命令
        vscode.commands.registerCommand('mcpManager.showFeedbackHistory', () => {
            const history = feedbackManager.getFeedbackHistory();
            const content = history.map(h => 
                `${new Date(h.timestamp).toLocaleString()} - ${h.type}: ${h.title} (${h.userAction})`
            ).join('\n');
            
            vscode.workspace.openTextDocument({
                content: `反馈历史:\n\n${content}`,
                language: 'plaintext'
            }).then(doc => vscode.window.showTextDocument(doc));
        }),
        vscode.commands.registerCommand('mcpManager.clearFeedbackHistory', () => {
            feedbackManager.clearFeedbackHistory();
            feedbackManager.showSuccess('历史清除', '反馈历史已清除');
        }),
        vscode.commands.registerCommand('mcpManager.showUsageStatistics', () => {
            const stats = feedbackManager.getUsageStatistics();
            if (!stats) {
                feedbackManager.showInfo('统计信息', '使用统计功能未启用');
                return;
            }
            
            const content = `使用统计:\n\n总交互次数: ${stats.totalInteractions}\n平均响应时间: ${stats.averageResponseTime}ms\n\n交互类型分布:\n${Object.entries(stats.interactionsByType).map(([type, count]) => `- ${type}: ${count}`).join('\n')}\n\n常见操作:\n${Object.entries(stats.mostCommonActions).map(([action, count]) => `- ${action}: ${count}`).join('\n')}`;
            
            vscode.workspace.openTextDocument({
                content,
                language: 'plaintext'
            }).then(doc => vscode.window.showTextDocument(doc));
        })
    ];

    // 将所有命令添加到订阅列表
    context.subscriptions.push(...commands);
}



/**
 * 扩展停用函数
 * 当扩展被停用时调用，用于清理资源
 */
export function deactivate() {
    console.log('MCP配置管理器插件正在停用...');
    // 清理工作将由dispose方法自动处理
}

/**
 * Add Tool MCP - VS Code Extension
 * 
 * @author Leo-拥抱AI
 * @version 1.0.0
 * @description A powerful VS Code extension for managing Model Context Protocol (MCP) configurations
 * @license MIT
 * 
 * © 2024 Leo-拥抱AI. All rights reserved.
 * 
 * 专注于AI工具开发，让开发更高效
 * GitHub: https://github.com/Leo-拥抱AI
 */