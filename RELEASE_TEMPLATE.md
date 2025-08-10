# Add Tool MCP v1.0.0 Release Notes

## 🎉 首次发布

**Add Tool MCP** 是一个功能强大的 VS Code 扩展，专为管理 Model Context Protocol (MCP) 配置而设计。

## ✨ 主要功能

### 🔧 核心功能
- **智能配置管理**: 自动检测和管理 MCP 配置文件
- **可视化界面**: 直观的 React 前端界面，支持拖拽操作
- **实时监控**: 文件系统监控，自动检测配置变更
- **配置验证**: 内置 JSON Schema 验证，确保配置正确性
- **批量操作**: 支持批量导入、导出和管理多个配置

### 🎨 用户界面
- **服务管理器**: 统一管理所有 MCP 服务
- **配置编辑器**: 语法高亮的 JSON 编辑器
- **设置面板**: 个性化配置选项
- **状态指示器**: 实时显示服务运行状态

### 🚀 集成功能
- **右键菜单**: 快速访问常用功能
- **命令面板**: 支持 VS Code 命令面板集成
- **快捷键**: 自定义快捷键支持
- **工作区集成**: 无缝集成到 VS Code 工作区

## 📦 安装方式

### 方式一：VS Code Marketplace（推荐）
1. 打开 VS Code
2. 进入扩展市场 (Ctrl+Shift+X)
3. 搜索 "Add Tool MCP"
4. 点击安装

### 方式二：手动安装
1. 下载 `.vsix` 文件
2. 在 VS Code 中按 `Ctrl+Shift+P`
3. 输入 "Extensions: Install from VSIX"
4. 选择下载的文件

## 🔧 系统要求

- **VS Code**: 版本 1.74.0 或更高
- **Node.js**: 版本 16.x 或更高
- **操作系统**: Windows 10+, macOS 10.15+, Linux (Ubuntu 18.04+)

## 📚 快速开始

1. **激活扩展**: 安装后自动激活
2. **打开面板**: 使用命令 `Add Tool MCP: Open Manager`
3. **添加配置**: 点击 "添加新配置" 按钮
4. **配置服务**: 填写 MCP 服务信息
5. **保存应用**: 点击保存并应用配置

## 🐛 已知问题

- 大型配置文件可能需要较长加载时间
- 某些复杂嵌套配置的验证可能不够精确
- WebView 在某些主题下可能存在样式问题

## 🔄 更新日志

### v1.0.0 (2024-01-XX)
- 🎉 首次发布
- ✅ 实现核心配置管理功能
- ✅ 完成 React 前端界面
- ✅ 添加文件系统监控
- ✅ 集成右键菜单和命令面板
- ✅ 完善错误处理和用户反馈

## 🤝 贡献指南

我们欢迎社区贡献！请查看 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解详细信息。

### 开发环境设置
```bash
# 克隆仓库
git clone https://github.com/用户名/add-tool-mcp.git
cd add-tool-mcp

# 安装依赖
npm install

# 编译项目
npm run compile

# 启动开发模式
npm run watch
```

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](./LICENSE) 文件了解详情。

## 👨‍💻 作者

**Leo-拥抱AI**
- GitHub: [@Leo-拥抱AI](https://github.com/Leo-拥抱AI)
- Email: contact@example.com

## 🙏 致谢

感谢所有为此项目做出贡献的开发者和用户！

## 📞 支持

如果您遇到问题或有建议，请：

1. 查看 [文档](./README.md)
2. 搜索 [已有问题](https://github.com/用户名/add-tool-mcp/issues)
3. 创建 [新问题](https://github.com/用户名/add-tool-mcp/issues/new)
4. 加入我们的 [讨论区](https://github.com/用户名/add-tool-mcp/discussions)

---

**下载链接**: [add-tool-mcp-1.0.0.vsix](./add-tool-mcp-1.0.0.vsix)

**校验和**: 
- SHA256: `将在发布时生成`
- MD5: `将在发布时生成`