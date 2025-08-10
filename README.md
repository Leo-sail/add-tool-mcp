# Add Tool MCP - VS Code插件

一个强大的VS Code扩展，用于管理和配置Model Context Protocol (MCP) 服务。

## 功能特性

### 🚀 核心功能
- **可视化配置管理**: 通过直观的Web界面管理MCP服务配置
- **智能文件检测**: 自动检测工作区中的MCP配置文件
- **实时配置验证**: 实时验证配置文件的语法和结构
- **配置合并**: 支持多个配置文件的智能合并
- **服务管理**: 添加、编辑、删除MCP服务配置

### 🎯 用户界面
- **状态栏集成**: 在状态栏显示MCP配置状态
- **右键菜单**: 在文件资源管理器中快速访问MCP功能
- **命令面板**: 通过命令面板快速执行MCP相关操作
- **WebView界面**: 现代化的React界面用于配置管理

### 🔧 高级功能
- **文件监控**: 自动监控配置文件变化
- **错误处理**: 完善的错误提示和处理机制
- **用户反馈**: 实时的操作反馈和通知
- **配置备份**: 自动备份和恢复配置

## 安装和使用

### 开发环境设置

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd notion插件
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **编译项目**
   ```bash
   npm run compile
   ```

4. **启动开发环境**
   ```bash
   code --extensionDevelopmentPath=. --new-window
   ```

### 使用方法

#### 1. 打开MCP管理器
- 使用命令面板 (`Cmd+Shift+P`) 搜索 "MCP Manager"
- 或点击状态栏中的MCP图标
- 或在文件资源管理器中右键选择MCP相关选项

#### 2. 管理MCP服务
- **添加服务**: 在管理界面中点击"添加服务"按钮
- **编辑服务**: 选择现有服务进行编辑
- **删除服务**: 删除不需要的服务配置
- **验证配置**: 实时验证配置文件的正确性

#### 3. 配置文件操作
- **自动检测**: 插件会自动检测工作区中的 `mcp.json` 文件
- **手动指定**: 可以手动指定配置文件路径
- **配置合并**: 支持合并多个配置文件

## 项目结构

```
src/
├── commands/           # 命令处理器
│   └── CommandManager.ts
├── core/              # 核心业务逻辑
│   ├── AutoDetectionService.ts
│   ├── ConfigMerger.ts
│   ├── ConfigurationManager.ts
│   ├── ErrorHandler.ts
│   ├── FeedbackManager.ts
│   ├── FileDetector.ts
│   ├── FileWatcher.ts
│   ├── JsonParser.ts
│   ├── MCPManagerProvider.ts
│   ├── NotificationManager.ts
│   └── Validator.ts
├── types/             # TypeScript类型定义
│   └── index.ts
├── ui/                # 用户界面组件
│   ├── components/    # React组件
│   ├── webview/       # WebView相关
│   ├── ContextMenuProvider.ts
│   └── StatusBarProvider.ts
└── extension.ts       # 扩展入口文件
```

## 技术栈

- **后端**: TypeScript + VS Code Extension API
- **前端**: React + TypeScript
- **构建工具**: Webpack
- **代码质量**: ESLint + TypeScript

## 开发指南

### 编译和构建

```bash
# 开发模式编译
npm run compile

# 监听模式编译
npm run watch

# 构建生产版本
npm run package
```

### 测试

```bash
# 运行测试
npm test

# 运行插件功能测试
node test-plugin.js
```

### 调试

1. 在VS Code中打开项目
2. 按 `F5` 启动调试模式
3. 在新窗口中测试插件功能

## 配置示例

### 基本MCP配置文件 (mcp.json)

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/files"],
      "env": {
        "NODE_ENV": "production"
      }
    },
    "git": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-git", "--repository", "/path/to/git/repo"]
    }
  }
}
```

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 支持

如果您遇到问题或有功能建议，请在 GitHub 上创建 issue。

---

**享受使用Add Tool MCP！** 🎉

---

## 📄 声明

本插件为开源项目，旨在为开发者提供便捷的MCP配置管理工具。

### 🏷️ 版权信息

- **项目名称**: Add Tool MCP
- **作者**: Leo-拥抱AI
- **版本**: 1.0.0
- **许可证**: MIT License

### 👨‍💻 关于作者

**Leo-拥抱AI** 是一位专注于AI工具开发和自动化解决方案的开发者，致力于为开发者社区提供高质量的工具和插件。

- 🌟 专注领域：AI工具开发、VS Code插件、自动化工具
- 🎯 理念：拥抱AI，让开发更高效
- 📧 联系方式：通过GitHub Issues或项目仓库联系

### 🤝 贡献与支持

如果您觉得这个插件对您有帮助，欢迎：
- ⭐ 给项目点星支持
- 🐛 报告问题和建议
- 🔧 提交代码贡献
- 📢 分享给更多开发者

### 📜 免责声明

本插件按"现状"提供，作者不对使用本插件可能产生的任何直接或间接损失承担责任。使用前请仔细阅读文档并在测试环境中验证功能。

---

**© 2024 Leo-拥抱AI. All rights reserved.**