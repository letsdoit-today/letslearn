# Tasks

## 1. 物理内核 `src/lib/physics/pendulum.ts`

- [x] 1.1 定义 `PendulumParams`（`length` / `mass` / `theta0Deg`）、`PendulumFrame`（`t` / `theta` / `omega` / `energy`）、`PendulumState`（周期与偏差）接口，导出 `PENDULUM_DEFAULT_PARAMS`；验证 `npx tsc --noEmit` 无类型错误
- [x] 1.2 实现 `agm(a, b)` 与 `exactPeriod(length, theta0Deg)`（第一类完全椭圆积分 + AGM，迭代上限 20 次），验证 L=1 m 时 `T0 ≈ 2.007 s`、`T_exact(60°) ≈ 2.154 s`、比值 `≈ 1.073`
- [x] 1.3 实现 `integrate(params, { duration, sampleDt, stepDt })`，用 velocity Verlet（`h = 0.005`、采样 `0.01`）生成帧数组；验证 θ₀=60° 时 8 s 后振幅仍为 60°（误差 < 0.5°），即能量无漂移
- [x] 1.4 在帧内计算动能 / 势能 / 总机械能，并实现 `forces(params, theta, omega)`（返回 `gravity` / `tension` / `tangential`）；验证 θ₀=60° 释放瞬间 `tension = 0.5·mg`
- [x] 1.5 实现 `harmonicRatio(length, t)`（归一化简谐近似 `cos(√(g/L)·t)`）供曲线虚线使用；验证 t=0 时返回 1.0

## 2. 公共 hook 与调色板

- [x] 2.1 `useSimulation` 新增 `loop?: boolean`（默认 `false`），回绕逻辑为 `next % maxTime` 且保持 `isRunning`；验证未传 `loop` 时既有 4 个 demo 的播放/暂停/重置行为不变
- [x] 2.2 `palette` 新增语义色 `forceTension`（青，如 `#0891b2` cyan-600）；验证 `npx tsc --noEmit` 通过

## 3. 主组件 `src/demos/PendulumOscillation.tsx`

- [x] 3.1 搭建场景骨架：天花板横梁、两个枢轴 `(250,60)` / `(550,60)`、两根绳（`line`）、两个摆球（`circle`），并在 y=280..470 画出曲线区边框与零线；验证挂载后画布无 JS 报错、元素齐全
- [x] 3.2 接入 `useSimulation`（`dt=0.01`、`loop: true`）与 `maxTime ≈ 8 s`，按 `currentFrame` 驱动两根绳与两个摆球的坐标（`x = pivotX + L·sinθ·PX_PER_M`、`y = 60 + L·cosθ·PX_PER_M`）；验证播放时两摆同步摆动且周期不同
- [x] 3.3 实现力层（仅大摆）：重力 `mg` 竖直向下、张力 `T` 沿绳指向枢轴、切向回复力 `−mg sinθ` 沿切向，箭头像素比例 `2.5 px/N`，标注位置 `clamp` 到安全区；验证 `m=2.0 kg`、θ=0 时重力箭头尖端 `y ≤ 262`，不出画布
- [x] 3.4 实现曲线层：把两摆的 `θ/θ₀` 与简谐近似虚线按 `每 4 帧取 1` 抽稀成 200 点折线，绘制到 y=280..470 区域；验证三条曲线起点均为 1.0，且大摆真实曲线与虚线在第 3 个周期明显分离
- [x] 3.5 接入侧栏：3 个 `ParamSlider`（`L ∈ [0.4,1.0]`、`m ∈ [0.1,2.0]`、`θ₀` 预设）、5 个预设按钮 + 重置、`DataPanel`（T0 / T_exact / 偏差百分比 / 质量不影响周期的提示）、能量堆叠条（KE / PE / E_total）、3 张 `PrincipleCard`；验证拖动 `m` 滑块时摆的运动不变、仅力箭头长度与能量数值变化
- [x] 3.6 接入 `useSEO`（title / description / keywords / canonical / ogImage），验证页面 title 为「单摆/简谐振动实验 - 力学物理演示 | Physics Learn」

## 4. 注册与文档

- [x] 4.1 `demos.json` 追加 `pendulum-oscillation` 元数据（`path: /pendulum-oscillation/`），验证 JSON 合法且 `Demos` 数组长度 +1
- [x] 4.2 `demoIcons.tsx` 新增图标映射（如 `Timer` / `Activity`），验证首页卡片显示正确图标
- [x] 4.3 `App.tsx` 导入并注册 `PendulumOscillation`，验证 `/pendulum-oscillation/` 路由可访问
- [x] 4.4 `README.md` 路线图勾选「单摆/简谐」，力学计数 3/6 → 4/6，验证文本与实现一致

## 5. 集成验证

- [x] 5.1 运行 `npm run build`，验证退出码 0、无类型错误、产物正常生成
- [x] 5.2 人工回归既有 4 个 demo（球体落液 / 斜面摩擦 / 杠杆力矩 / 任一光学 demo）的播放、暂停、重置，验证 `loop` 默认关闭未引入行为变化

## Workflow follow-up

- 归档本变更（`openspec archive pendulum-harmonic-demo --yes --skip-specs`）。