# Tasks

## 1. 物理内核与自适应数值

- [x] 1.1 新建 `src/lib/physics/induction.ts`，定义 `InductionParams`（B、L、R、m、v0、force、vTarget）、`InductionFrame`（t、x、v、emf、current、ampForce、kinetic、heat）与三种模式类型；`npm run build` 的 tsc 阶段通过即验证类型定义可用。
- [x] 1.2 实现共享派生量函数，逐帧计算 ε = BLv、I = ε/R、F_A = B²L²v/R、P = I²R 并累积 Q = ∫I²R dt；验证方式：在开发页控制台对照 B=0.5 T、L=0.5 m、R=2 Ω、v=2 m/s 手算 ε=0.5 V、I=0.25 A、F_A=0.0625 N，数值一致。
- [x] 1.3 实现半隐式欧拉积分器与自适应采样（duration = 5τ、固定约 800 帧、stepDt = min(sampleDt/5, τ/20）），覆盖惯性滑行（F_ext = 0，v(0) = v₀）与恒力驱动（F_ext = F，v(0) = 0）；验证方式：帧数组长度稳定在 800 附近，且 v(t) 与解析解 v₀e^(−t/τ)、v∞(1−e^(−t/τ)) 在末帧的相对误差小于 1%。
- [x] 1.4 实现匀速拖动模式的代数求解（v 恒定、反解 F_ext = F_A、固定 3 s 观察窗、Q 线性累积）；验证方式：该模式帧中 v 恒为 v_target，F_ext 与 F_A 数值相等，Q 末帧等于 P × 3 s。
- [x] 1.5 导出默认参数、预设场景与 `τ`、`v∞`、`x_total` 等派生量的计算函数；验证方式：`npm run build` 通过，且预设对象在开发页可正常载入。

## 2. 调色板与场景骨架

- [x] 2.1 在 `src/lib/palette.ts` 新增磁场、感应电流、电动势语义色（沿用「颜色即语义」注释风格，色值取自 Tailwind 色阶）；验证方式：tsc 通过且新 key 在场景中被实际引用。
- [x] 2.2 新建 `src/demos/ElectromagneticInduction.tsx`，用 `DemoPage` + `SimulationCanvas` 搭出导轨、回路、电阻符号、磁场 `×` 符号阵列与坐标区；验证方式：`npm run dev` 打开该路由，静态场景完整显示且无控制台报错。
- [x] 2.3 绘制导体棒、`v` 箭头与 `F_A` 箭头（恒反向），并在模式 3 追加与 `F_A` 等长反向的 `F_外` 箭头；验证方式：切换模式时箭头出现/消失与方向正确。
- [x] 2.4 实现沿回路流动的电流小点动画，方向由 `sign(v)` 决定、速率由 `|I|` 归一化；验证方式：反向速度时流动方向反转。
- [x] 2.5 实现轨道行程自适应映射（`[0, x_total]` → 可视长度）并在画布标注「按比例缩放，数值以数据面板为准」；验证方式：分别用小 τ 与大 τ 参数组合，棒均不越出画布且标注可见。

## 3. 交互控件、图表与数据面板

- [x] 3.1 接入 `DemoControls` 播放/暂停/重置与时间轴拖动，驱动 `useSimulation`；验证方式：播放时画面连续推进，拖动时间轴可定位任意时刻。
- [x] 3.2 加入 B、L、R、m 共享滑块与 v₀、F、v_target 模式专属滑块，切换模式时共享参数保持不变；验证方式：改 B 后切换模式，B 值不被重置。
- [x] 3.3 实现模式 1/2 的时间曲线图（v(t) 与 I(t) 叠加理论虚线 e^(−t/τ)），轴按真实秒数标注；验证方式：曲线与理论虚线在 5τ 窗口内贴合。
- [x] 3.4 实现模式 3 的 ε–v 特性直线与随滑块移动的工作点，切换模式时图表语义正确切换；验证方式：拖 v 滑块时工作点沿直线移动，且切回模式 1/2 后恢复时间曲线。
- [x] 3.5 填充 `DataPanel` 实时数据（ε、I、F_A、P、Q、v、x、τ、v∞）与能量条（KE 与累积 Q），终态校验 KE→0、Q→KE₀；验证方式：惯性滑行跑完后能量条数值满足守恒关系，差值在容差内。
- [x] 3.6 补充 `PrincipleCard` 原理说明（法拉第定律、楞次定律、能量守恒、收尾速度与电磁阻尼）与预设场景按钮；验证方式：预设点击后参数与画面同步变化。

## 4. 站点集成与索引

- [x] 4.1 在 `src/lib/demos.json` 新增元数据（slug、name、path、description、keywords）；验证方式：Dashboard 出现新卡片且路由 `/electromagnetic-induction/` 可访问。
- [x] 4.2 在 `src/lib/demoIcons.tsx` 新增图标映射（Magnet 或 Zap），并在 `src/App.tsx` 的 `demoComponents` 注册组件；验证方式：卡片图标正确且页面经路由渲染。
- [x] 4.3 更新 `public/sitemap.xml`：新增本条路由，补齐遗漏的 `lever-balance`、`pendulum-oscillation`，将 `friction-inclined-plane` 统一为带结尾斜杠；验证方式：文件内 10 个 `<url>` 与 `demos.json` 逐条对应且格式一致。
- [x] 4.4 更新 `README.md` 路线图，勾选「电磁感应」；验证方式：路线图对应项显示为已完成。

## 5. 集成验证

- [x] 5.1 运行 `npm run build`，确认 tsc 与 vite 构建均无错误。
- [x] 5.2 运行 `npm run build:prerender`，确认 `dist/electromagnetic-induction/index.html` 生成成功且预渲染无报错。
- [x] 5.3 在三种模式下逐一核对「物理真值 + 自适应时长 + 行程缩放」三组边界参数（最小 τ、最大 τ、中等参数），确认画面可读、数值与解析解一致。

## Workflow follow-up

- 项目评审要求满足后归档该 change。
- 归档后核对主 spec `electromagnetic-induction` 的 Purpose 与需求内容完整。