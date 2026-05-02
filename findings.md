# Findings & Decisions

## Requirements
- 配色提取：K-Means / Median Cut，3~12 色，默认 6 色
- 配色迁移：Reinhard / 直方图匹配，lαβ 色彩空间，保护素描关系
- 预设配色：OKLCH 空间，6 种配色规则
- 智能推荐：纯规则算法，OKLCH 空间计算
- 灰度转换：3 种方法
- RGB 通道分离：强度调节 0~200%
- 灰阶区域配色：直方图 + 区域映射
- 导出：CSS/Tailwind/JSON/SVG/图片
- 用户系统：Supabase Auth，邮箱 + 社交登录
- 收藏：上限 200 个，标签系统
- 流星特效：Canvas 2D，文字碰撞
- 国际化：中英文
- 主题：暗色/亮色

## Research Findings
- culori ^3.0.0 支持 OKLCH、lαβ 等色彩空间
- Zustand ^4.5.0 支持中间件（persist、devtools）
- Radix UI 提供无障碍组件原语
- @chenglou/pretext 用于文本精确测量，P2 阶段集成

## Technical Decisions
| Decision | Rationale |
|---|---|
| Vite 5 + React 18 + TypeScript 5 | PRD 指定，现代前端最佳实践 |
| Zustand 4 | 轻量状态管理，支持 persist/devtools 中间件 |
| Tailwind CSS 3.4 | 实用主义 CSS，与 Design Token 完美集成 |
| culori 3 | 功能全面的色彩空间转换库 |
| Web Workers + Transferable Objects | 避免阻塞主线程，零拷贝传输 |
| CSS Variables 定义 Design Token | 支持主题切换，映射到 Tailwind |

## Issues Encountered
| Issue | Resolution |

## Resources
- PRD 文档：control-color-prd-v1.4.md
- culori 文档：https://culorijs.org/
- Zustand 文档：https://zustand-demo.pmnd.rs/
- Radix UI 文档：https://www.radix-ui.com/
- Tailwind CSS 文档：https://tailwindcss.com/

## Visual/Browser Findings
- 暗色主题主色：#1a1a2e
- 亮色主题流星背景：#f0f0f5
- 字体：Inter（英文）+ 系统中文字体栈
