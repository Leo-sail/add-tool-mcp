# Add Tool MCP - 安装指南

## 📦 插件包说明

这是一个完整的 VS Code 插件包，包含了 Add Tool MCP 插件的所有源代码和编译文件。

## 🚀 安装方法

### 方法一：开发模式安装

1. **安装依赖**
   ```bash
   cd add_tool_mcp
   npm install
   ```

2. **编译插件**
   ```bash
   npm run compile
   ```

3. **在 VS Code 中测试**
   ```bash
   code --extensionDevelopmentPath=. --new-window
   ```

### 方法二：打包安装

1. **安装 vsce 工具**
   ```bash
   npm install -g vsce
   ```

2. **打包插件**
   ```bash
   cd add_tool_mcp
   vsce package
   ```

3. **安装 .vsix 文件**
   - 在 VS Code 中按 `Ctrl+Shift+P` (Windows/Linux) 或 `Cmd+Shift+P` (Mac)
   - 输入 "Extensions: Install from VSIX..."
   - 选择生成的 `.vsix` 文件

## 📁 文件结构

```
add_tool_mcp/
├── src/                    # 源代码
│   ├── commands/          # 命令管理
│   ├── core/              # 核心功能
│   ├── types/             # 类型定义
│   ├── ui/                # 用户界面
│   └── extension.ts       # 主入口
├── out/                   # 编译输出
├── package.json           # 插件配置
├── tsconfig.json          # TypeScript配置
├── webpack.config.js      # Webpack配置
├── README.md              # 详细说明
├── USAGE_GUIDE.md         # 使用指南
└── INSTALL.md             # 本文件
```

## ⚙️ 系统要求

- **VS Code**: 版本 1.74.0 或更高
- **Node.js**: 版本 16.0 或更高
- **npm**: 版本 8.0 或更高

## 🔧 开发环境设置

如果您想修改或扩展插件功能：

1. **克隆或复制项目**
2. **安装依赖**: `npm install`
3. **启动开发模式**: `npm run watch`
4. **在新窗口测试**: `F5` 或使用调试配置

## 📚 相关文档

- [README.md](./README.md) - 插件详细介绍
- [USAGE_GUIDE.md](./USAGE_GUIDE.md) - 使用指南
- [VS Code 扩展开发文档](https://code.visualstudio.com/api)

## 🆘 问题排查

### 常见问题

1. **编译失败**
   - 确保 Node.js 版本正确
   - 删除 `node_modules` 重新安装: `rm -rf node_modules && npm install`

2. **插件无法加载**
   - 检查 VS Code 版本是否满足要求
   - 查看开发者控制台错误信息

3. **功能异常**
   - 重启 VS Code
   - 检查工作区是否包含 MCP 配置文件

## 👨‍💻 作者信息

**作者**: Leo-拥抱AI  
**版本**: 1.0.0  
**许可证**: MIT License  

---

**© 2024 Leo-拥抱AI. All rights reserved.**

专注于AI工具开发，让开发更高效 🚀