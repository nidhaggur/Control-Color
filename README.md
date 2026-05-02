# Control Color

专业色彩设计工作台 — 提取 · 迁移 · 分析 · 无障碍

## 功能特性

- **配色提取** — 基于 K-Means / Median Cut 算法从图片中智能提取主色调，支持忽略空白/透明像素
- **配色迁移** — Reinhard 均值标准差匹配 / 直方图匹配算法，将色彩风格迁移到目标图片
- **色轮编辑** — 交互式 OKLCH 色轮，支持互补色、类似色、三角和谐等 6 种色彩理论方案
- **无障碍检查** — WCAG 2.1 对比度验证（AA/AAA 标准）+ 8 种色盲类型模拟
- **灰阶着色** — 亮度区间到渐变色的映射，支持 3 区域独立配置
- **通道分离** — RGB 通道独立强度调节、自定义混合权重、通道互换
- **灰度转换** — 最大值法 / 平均值法 / 加权法三种灰度算法
- **图片预处理** — 缩放、旋转、翻转、裁剪工具
- **渐变生成** — 多色渐变编辑器，支持线性/径向/锥形方向
- **流星拾色器** — 粒子特效驱动的随机配色方案生成，碰撞文字物理模拟
- **历史记录** — 50 步操作历史，支持撤销/重做/跳转
- **配色分享** — 水平/垂直/网格三种布局，Canvas 2x 高清渲染导出
- **调色板管理** — 拖拽排序、重命名、导入/导出 JSON

## 交互设计

- 拖放/粘贴图片上传
- 右键上下文菜单
- 键盘快捷键（Space 对比切换、Delete 删除、Ctrl+Z 撤销）
- 交互式新手引导
- 响应式布局

## 技术栈

| 类别 | 技术 |
|------|------|
| 构建工具 | Vite 5 |
| 前端框架 | React 18 + TypeScript 5 |
| 样式方案 | Tailwind CSS 3.4（CSS Variables Design Tokens） |
| 状态管理 | Zustand 4（persist 持久化） |
| 路由 | React Router 7 |
| 图形渲染 | Canvas 2D（流星/色轮/直方图/分享图） |
| 音效 | Web Audio API |
| 工具库 | lodash-es |

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 项目结构

```
src/
├── components/
│   ├── features/     # 功能面板（提取、迁移、通道、灰阶等）
│   ├── layout/       # 布局组件（Layout, ToolRail, TopNav）
│   └── ui/           # 通用 UI 组件（色轮、流星、Toast 等）
├── hooks/            # 自定义 Hooks（右键菜单、键盘快捷键）
├── pages/            # 页面组件（HomePage）
├── stores/           # Zustand 状态管理（6 个 store）
├── types/            # TypeScript 类型定义
└── utils/            # 工具函数（色彩、图像、预设、分享）
```

## License

MIT
