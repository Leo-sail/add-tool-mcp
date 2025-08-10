#!/bin/bash

# Add Tool MCP - GitHub发布脚本
# 作者: Leo-拥抱AI

echo "🚀 Add Tool MCP - GitHub发布助手"
echo "======================================"

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 请在add_tool_mcp目录中运行此脚本"
    exit 1
fi

# 检查git状态
if [ ! -d ".git" ]; then
    echo "❌ 错误: 当前目录不是git仓库"
    exit 1
fi

echo "📋 当前项目信息:"
echo "   项目名称: $(grep '"name"' package.json | cut -d'"' -f4)"
echo "   版本: $(grep '"version"' package.json | cut -d'"' -f4)"
echo "   作者: $(grep '"author"' package.json | cut -d'"' -f4)"
echo ""

# 提示用户输入GitHub仓库URL
echo "🔗 请输入GitHub仓库URL:"
echo "   格式: https://github.com/用户名/add-tool-mcp.git"
echo "   或者: git@github.com:用户名/add-tool-mcp.git"
read -p "GitHub仓库URL: " REPO_URL

if [ -z "$REPO_URL" ]; then
    echo "❌ 错误: 仓库URL不能为空"
    exit 1
fi

# 添加远程仓库
echo "📡 添加远程仓库..."
git remote add origin "$REPO_URL"

if [ $? -ne 0 ]; then
    echo "⚠️  远程仓库可能已存在，尝试更新..."
    git remote set-url origin "$REPO_URL"
fi

# 推送到GitHub
echo "📤 推送代码到GitHub..."
git push -u origin main

if [ $? -ne 0 ]; then
    echo "⚠️  推送到main分支失败，尝试推送到master分支..."
    git push -u origin master
fi

if [ $? -eq 0 ]; then
    echo "✅ 代码推送成功！"
    echo ""
    echo "🎉 发布完成！"
    echo "======================================"
    echo "📍 仓库地址: $REPO_URL"
    echo "🌐 访问链接: ${REPO_URL%.git}"
    echo ""
    echo "📋 后续步骤:"
    echo "   1. 访问GitHub仓库页面"
    echo "   2. 编辑仓库描述和标签"
    echo "   3. 创建Release发布版本"
    echo "   4. 添加Topics标签 (如: vscode-extension, mcp, typescript)"
    echo "   5. 考虑发布到VS Code Marketplace"
    echo ""
    echo "🔧 VS Code Marketplace发布:"
    echo "   npm install -g vsce"
    echo "   vsce package"
    echo "   vsce publish"
else
    echo "❌ 推送失败，请检查:"
    echo "   1. GitHub仓库URL是否正确"
    echo "   2. 是否有推送权限"
    echo "   3. 网络连接是否正常"
    echo "   4. 是否需要先在GitHub创建仓库"
fi

echo ""
echo "👨‍💻 作者: Leo-拥抱AI"
echo "📧 如有问题，请通过GitHub Issues反馈"