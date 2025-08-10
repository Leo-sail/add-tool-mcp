const path = require('path');

/**
 * 扩展主程序的Webpack配置
 * 用于打包VS Code扩展的主要逻辑
 */
const extensionConfig = {
  target: 'node', // VS Code扩展运行在Node.js环境
  mode: 'none', // 保持原始代码结构便于调试

  entry: './src/extension.ts', // 扩展入口文件
  output: {
    path: path.resolve(__dirname, 'out'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2'
  },
  externals: {
    vscode: 'commonjs vscode' // VS Code API不需要打包
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@/types': path.resolve(__dirname, 'src/types'),
      '@/core': path.resolve(__dirname, 'src/core'),
      '@/ui': path.resolve(__dirname, 'src/ui'),
      '@/utils': path.resolve(__dirname, 'src/utils')
    }
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      }
    ]
  },
  devtool: 'nosources-source-map',
  infrastructureLogging: {
    level: "log", // 启用问题匹配器的日志记录
  },
};

/**
 * WebView前端的Webpack配置
 * 用于打包React前端界面
 */
const webviewConfig = {
  target: ['web', 'es5'], // WebView运行在浏览器环境
  mode: 'none',

  entry: {
    'webview': './src/ui/webview/index.tsx', // WebView入口文件
  },
  output: {
    path: path.resolve(__dirname, 'out'),
    filename: '[name].js',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.css'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@/types': path.resolve(__dirname, 'src/types'),
      '@/core': path.resolve(__dirname, 'src/core'),
      '@/ui': path.resolve(__dirname, 'src/ui'),
      '@/utils': path.resolve(__dirname, 'src/utils')
    }
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              compilerOptions: {
                jsx: 'react-jsx'
              }
            }
          }
        ]
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: {
                localIdentName: '[name]__[local]___[hash:base64:5]'
              }
            }
          }
        ]
      }
    ]
  },
  devtool: 'nosources-source-map',
  infrastructureLogging: {
    level: "log",
  },
};

module.exports = [extensionConfig, webviewConfig];