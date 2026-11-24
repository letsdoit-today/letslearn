# Tasks

## 1. 内边距响应式收紧

- [x] 1.1 将 `src/components/Layout.tsx` 内容包裹层 `p-6` 改为 `p-3 sm:p-6`；验证：375px 视口下内容左右贴边约 12px，`sm` 及以上仍为 24px
- [x] 1.2 将 `src/components/Layout.tsx` 顶栏 `px-6` 改为 `px-3 sm:px-6`；验证：移动端顶栏元素不溢出、桌面端间距不变
- [x] 1.3 将 `src/components/demo/DemoPage.tsx` 容器 `p-4` 改为 `p-2 sm:p-4`；验证：移动端外层 gutter（Layout + DemoPage）合计约 20px
- [x] 1.4 为 `src/components/Dashboard.tsx` 容器追加 `px-3 sm:px-8`；验证：移动端 12px、桌面端保持 32px（与 container 的 2rem 一致）
- [x] 1.5 将 `src/components/ui/card.tsx` 的 `CardHeader` `p-6` 改为 `p-4 sm:p-6`、`CardContent` `p-6 pt-0` 改为 `p-4 pt-0 sm:p-6 sm:pt-0`；验证：首页卡片与 demo 卡片移动端更紧凑、桌面端不变

## 2. 侧边栏响应式抽屉

- [x] 2.1 新增 `src/hooks/useMediaQuery.ts`，封装 `matchMedia` 订阅与无 `window` 时的安全默认值；验证：窗口跨断点缩放时返回值正确更新，且无 `window` 环境不报错
- [x] 2.2 在 `src/components/Layout.tsx` 用 `useMediaQuery('(min-width: 768px)')` 拆分 `desktopOpen`（默认 `true`）与 `mobileOpen`（默认 `false`）；验证：移动端进入页面侧边栏不显示、桌面端默认显示
- [x] 2.3 移动端侧边栏改为 fixed 浮层（`inset-y-0 left-0 z-50 w-64` + `translate-x` 滑动），桌面端保持 static `w-64`/`w-0` 折叠；验证：两种断点下展开/收起动画正确且互不影响
- [x] 2.4 新增遮罩层（`fixed inset-0 z-40 bg-black/40`），仅在移动端且展开时渲染，点击遮罩收起；验证：点遮罩关闭抽屉
- [x] 2.5 移动端点击导航项后自动收起抽屉；验证：点菜单项后抽屉关闭并正常跳转

## 3. 集成验证

- [x] 3.1 `npm run build`（`tsc` + `vite build`）全量通过；验证：无类型错误且产物正常生成
- [x] 3.2 用浏览器 DevTools 以 375px 视口走查首页与 6 个实验页，确认内边距紧凑、抽屉可用；验证：无横向滚动、内容不重叠
- [x] 3.3 桌面端（≥768px）走查，确认侧边栏折叠/展开与现状一致；验证：无回归

## Workflow follow-up

- 实现完成后按项目评审要求归档本 change（`openspec archive`）。
- 归档后复核 GitHub Pages 部署产物。