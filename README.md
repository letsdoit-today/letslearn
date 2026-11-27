# How to add a new demo

To add a new demo to this project, follow these steps:

-  Create a new demo file in the `src/demos/` directory.
-  Add the demo metadata (name / slug / category / path / description / keywords / topic) to `src/lib/demos.json`. This file is the single source of truth: the router, the prerender script and the sitemap generator all derive their routes from it, so `vite.config.ts` and `scripts/prerender.js` need no changes. `topic` is optional and only feeds the page title template (e.g. 「物理·光学」).
-  Add an icon mapping for the new `slug` in `src/lib/demoIcons.tsx`.
-  Register the component in the `demoComponents` map in `App.tsx`.
-  In the demo component, call `useSEO(buildDemoSEO(SLUG))` once — do **not** hand-write title/description/keywords. `buildDemoSEO` in `src/lib/Meta.tsx` derives the title template, keywords, canonical, og/twitter tags and the page-level `BreadcrumbList` JSON-LD from `demos.json`.
-  Run `npm run sitemap` to regenerate `public/sitemap.xml` from `demos.json` (`npm run sitemap:check` verifies it is in sync).
-  Update the corresponding entry in `ROADMAP.md` (tick the checkbox and add the slug).


PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true


PUPPETEER_EXECUTABLE_PATH=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe


# Roadmap

站点要做什么、优先级如何、各章节覆盖到哪，统一记录在 [ROADMAP.md](./ROADMAP.md)。

站点覆盖小学 / 初中 / 高中的 **数学、物理、化学、地理、生物** 五科，目前仅有物理内容。
优先级约定：**先学段、后学科 —— 初中 > 小学 > 高中**。新增 demo 后请同步更新该文件。