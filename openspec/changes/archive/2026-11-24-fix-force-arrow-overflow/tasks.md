# Tasks

## 1. 斜面摩擦实验 viewBox 加高

- [x] 1.1 将 `FrictionInclinedPlane.tsx` 中 `<SimulationCanvas viewBox="0 0 700 400">` 改为 `viewBox="0 0 700 500"`；验证：初始状态（角度 0）下重力箭头尖端与 "G" 标签完整可见、无底部裁剪
- [x] 1.2 在浏览器走查斜面摩擦实验（含自动演示至 80°），确认木板顶端、物块与四根箭头在任意角度均不越界；验证：无横向或纵向裁剪

## 2. 球体落入液体实验箭头与画布调整

- [x] 2.1 将 `FallingBall.tsx` 中 `const arrowScale = 2` 改为 `const arrowScale = 1`；验证：拖动时间轴到球体沉底时刻，向下重力箭头不再被底部裁剪
- [x] 2.2 新增底部边距常量（如 `const bottomMargin = 120`），并将 `viewBox={`0 0 ${width} ${height}`}` 改为 `viewBox={`0 0 ${width} ${height + bottomMargin}`}`，物理底面保持 `height = 500`；验证：球体沉底时向下箭头完整落在 viewBox 内
- [x] 2.3 走查球体落入液体实验全过程，确认 G/Fb/Fd/N 四根箭头相对大小仍可区分、无重叠或越界；验证：无横向滚动、箭头完整可见

## 3. 集成验证

- [x] 3.1 `npm run build`（tsc + vite build）全量通过；验证：无类型错误且产物正常生成
- [x] 3.2 浏览器 DevTools 走查两个实验（375px 与桌面视口），确认箭头无裁剪；验证：无横向滚动、无内容重叠

## Workflow follow-up

- 实现完成后按项目评审要求归档本 change（`openspec archive`）。