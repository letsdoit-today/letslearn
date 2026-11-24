# How to add a new demo

To add a new demo to this project, follow these steps:

-  Create a new demo file in the `src/demos/` directory.
-  Add the demo metadata (name / slug / path / description / keywords) to `src/lib/demos.json`. This file is the single source of truth: both the router and the prerender script derive their routes from it, so `vite.config.ts` and `scripts/prerender.js` need no changes.
-  Add an icon mapping for the new `slug` in `src/lib/demoIcons.tsx`.
-  Register the component in the `demoComponents` map in `App.tsx`.
-  Update the roadmap section of the `README.md` file with the new demo.


PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true


PUPPETEER_EXECUTABLE_PATH=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe


物理学习站点 —— 覆盖 vs 空白
=====================================================
力学 (4/6)
  [x] 球体落液    [x] 斜面摩擦    [x] 杠杆力矩
  [ ] 抛体运动    [x] 单摆/简谐    [ ] 碰撞动量
  [ ] 弹簧振子    [ ] 圆周运动

光学 (4/6)  ← 已接近饱和，边际价值低
  [x] 折射  [x] 凸透镜  [x] 凹透镜  [x] 人眼

电磁学 (0)  ← 最大空白
  [ ] 库仑/电场   [ ] 磁场/洛伦兹   [ ] 电磁感应

波动 (0)     [ ] 干涉   [ ] 多普勒   [ ] 驻波
热学 (0)     [ ] 理想气体 [ ] 热传导