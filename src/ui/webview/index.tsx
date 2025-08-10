import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

/**
 * WebView应用入口
 * 初始化React应用并挂载到DOM
 */
function initializeApp() {
  // 获取根容器
  const container = document.getElementById('root');
  if (!container) {
    console.error('找不到根容器元素');
    return;
  }

  // 创建React根实例
  const root = createRoot(container);
  
  // 渲染应用
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// 等待DOM加载完成后初始化应用
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// 导出类型定义供其他模块使用
export type { AppState } from './App';

// 全局错误处理
window.addEventListener('error', (event) => {
  console.error('全局错误:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('未处理的Promise拒绝:', event.reason);
});