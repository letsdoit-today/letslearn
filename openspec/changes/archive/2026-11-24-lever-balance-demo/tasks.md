# Tasks

## 1. 物理层

- [x] 1.1 新建 `src/lib/physics/lever.ts`：定义 `LeverParams` / `LeverState`，实现 `computeLever()`，按 `arm = L·sinθ` 计算有效力臂、`m1`/`m2`、`net = m2 - m1`、相对平衡判据（1%）、`tilt` 映射（不平衡时 `sign(net)·(2° + 6°·ratio)`）、`leverType`；同文件导出四组 `LEVER_PRESETS` 常量。验证：`npx tsc --noEmit` 通过。
- [x] 1.2 手算校验物理函数：`F1=20, L1=1.0, θ1=90, F2=20, L2=1.0, θ2=90` → `m1=m2=20`、`balanced=true`、`tilt=0`、`leverType='等臂'`；`θ1=45` 时 `arm1≈0.707`、`m1≈14.14`、`net≈+5.86`、`tilt≈+3.03°`（左侧力矩变小，横梁右端下沉）。验证：以临时脚本输出与手算一致（已用 esbuild 编译 + node 断言通过）。

## 2. 绘制层

- [x] 2.1 新建 `src/demos/LeverBalance.tsx` 骨架：`useSEO` + `DemoPage`/`SimulationCanvas`/`DemoSidebar` 布局，`useSVGScene` 内创建旋转 group（横梁矩形、两侧挂点、支点三角、地面线、力矩弧形箭头）与静止元素，并存入 snap ref。验证：页面渲染出横梁、支点、地面，无控制台报错。（支点几何须与旋转中心严格重合：三角顶点 = 横梁底边中点 = `(PIVOT_X, PIVOT_Y)`；并在该点叠加铰点圆 + `O` 标注。变换矩阵 MUST 为 `Matrix().rotate(tilt).translate(PIVOT_X, PIVOT_Y)`——svg.js 的 `Matrix` 是后乘，写成 `translate(...).rotate(tilt, 0, 0)` 会绕**画布原点**旋转，支点自身随之漂移，表现为横梁脱离支点腾空）
- [x] 2.2 实现力臂层：按 D6 公式计算垂足 `F`，绘制 `O→F` 虚线 + 双端尺寸标记 + 垂足直角标记 + `L′` 标注；`θ=90°` 时虚线沿横梁、直角标记退化（视觉即「力臂 = 水平距离」）。验证：`θ=90°` 时力臂线贴合横梁，`θ=45°` 时力臂线明显短于作用点距离。
- [x] 2.3 实现力层：作用线虚线 + 沿 `u` 的力箭头（长度 ∝ 力值）+ `F1`/`F2` 标注；箭头方向随 θ 变化。验证：拖动 θ 滑块，箭头由垂直转为倾斜且长度不变。
- [x] 2.4 实现力矩层：支点两侧弧形箭头（左 `M1`、右 `M2`），弧线用采样点折线 + 末端切向箭头绘制。验证：两侧弧形方向互为镜像，标注数值与数据面板一致。

## 3. 交互层

- [x] 3.1 接入 6 个 `ParamSlider`：`F1`(10–50 N)、`L1`(0.1–1.4 m)、`θ1`(30–90°)、`F2`、`L2`、`θ2`；参数变化触发重绘。验证：任一滑块变动后画面与数据面板同步更新。（`F` 下限取 10 N：箭头长度 = 力值 × 2.4 px/N，5 N 仅 12 px，箭头会被 11 px 的箭头头部吃掉）
- [x] 3.2 接入 4 个预设按钮（等臂天平 / 省力杠杆 / 费力杠杆 / 斜向施力对比），点击后批量写入 6 个参数。验证：点击「等臂天平」后状态显示平衡、横梁水平；点击「斜向施力对比」后横梁明显倾斜。
- [x] 3.3 实现 RAF 缓动：`tiltCurrent += (tiltTarget - tiltCurrent) * 0.15`，差值收敛到 0.05° 内停止，旋转 group 每帧按当前倾角重绘。验证：快速切换预设时横梁平滑过渡而非跳变，且动画结束后无残留 RAF 循环。
- [x] 3.4 接入 `DataPanel`（有效力臂、`M1`、`M2`、净力矩高亮、平衡状态、杠杆类型）与 3 张 `PrincipleCard`（力矩定义强调力臂为垂距、杠杆平衡条件、三类杠杆判据）。验证：数据项数值与画面几何一致，原理文案覆盖三个考点。

## 4. 集成

- [x] 4.1 注册新 demo：`src/lib/demos.json` 追加 `lever-balance` 元数据、`src/lib/demoIcons.tsx` 加 `Scale` 图标映射、`src/App.tsx` 加 import 与 `demoComponents` 映射。验证：首页出现新卡片，`/lever-balance/` 路由可访问且标题描述正确。（首页卡片由 `Demos.map` 自动派生；构建产物中已确认包含 `杠杆力矩实验` 与 `lever-balance`）
- [x] 4.2 更新 `README.md`：勾选路线图中的「杠杆力矩」，并把已过期的「新增 demo 步骤」改为以 `demos.json` 为单一数据源的正确描述。验证：README 描述与实际注册点一致。
- [x] 4.3 运行 `npm run build` 通过（tsc 无类型错误 + vite 构建成功）。验证：命令退出码为 0。（1554 modules transformed，built in 1.76s）

## Workflow follow-up

- 归档本变更。