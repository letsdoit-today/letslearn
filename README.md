# How to add a new demo

To add a new demo to this project, follow these steps:

-  Create a new demo file in the `src/demos/` directory.
-  Add the demo metadata (name / slug / category / path / description / keywords / topic) to `src/lib/demos.json`. This file is the single source of truth: the router, the prerender script and the sitemap generator all derive their routes from it, so `vite.config.ts` and `scripts/prerender.js` need no changes. `topic` is optional and only feeds the page title template (e.g. 「物理·光学」). `title` is optional too: set it only when a page needs to target a specific search query — otherwise `buildDemoSEO` builds `{name} - {学科}{topic}互动演示 | {siteName}` for you.
-  Add an icon mapping for the new `slug` in `src/lib/demoIcons.tsx`.
-  Register the component in the `demoComponents` map in `App.tsx`.
-  In the demo component, call `useSEO(buildDemoSEO(SLUG))` once — do **not** hand-write title/description/keywords. `buildDemoSEO` in `src/lib/Meta.tsx` derives the title template, keywords, canonical, og/twitter tags and the page-level JSON-LD (`BreadcrumbList` + `LearningResource`) from `demos.json`.
-  Run `npm run sitemap` to regenerate `public/sitemap.xml` from `demos.json` (`npm run sitemap:check` verifies it is in sync). `lastmod` is computed per page from the git history of that page's own source file (`src/demos/<File>.tsx`, plus `demos.json` / `index.html` / `App.tsx` / `Dashboard.tsx` for the homepage) — never add `demos.json` to a demo page's path set, or adding one demo would refresh the `lastmod` of every page.
-  Run `npm run og:image` after `vite build` to regenerate the social share images (`public/og-{slug}.jpg`, 1200x630). The route list is derived from `demos.json` (the homepage is included as slug `dashboard`), so a new demo needs no edit in `scripts/gen-og-image.js`; the script fails loudly if any route ends up without an image.
-  SEO checklist — required for every page, see `ROADMAP.md` §5 item 7 for the full rules:
   -  `canonical` must be self-referencing and byte-identical to the sitemap URL, trailing slash included (`${siteUrl}/` for the homepage, `${siteUrl}/{slug}/` for demos). Never hand-write it — `buildDemoSEO` already does this.
   -  Every route must have a real `og:image`; never reference legacy filenames such as `og-image.jpg` / `twitter-image.jpg`.
   -  Use the single brand name 「理科演示平台」 everywhere (page titles, `index.html`, `manifest.json`, `404.html`, JSON-LD). `siteName` in `src/lib/Meta.tsx` is the only source of truth: `buildDemoSEO` appends ` | 理科演示平台` to every demo title, so never write the brand into a `demos.json` `title` yourself. Do not introduce an English brand — the site covers four subjects, so a name like "Physics Learn" misstates its scope.
   -  Do not add `Crawl-delay` or `Disallow` entries to `public/robots.txt` — it only needs `User-agent: * / Allow: /` plus the `Sitemap` line.
   -  Any asset referenced from JSON-LD (`logo`, `image`) must actually exist in `public/`.
-  `DemoPage` accepts an optional `extra` prop for content rendered below the demo workspace (comparison tables, related-demo links). Keep it outside the workspace row so the layout verifier still measures canvas / KPI / sidebar only.
-  Canvas overlays are plain SVG groups drawn inside the scene (e.g. the movable screen in `ConvexLensSim`): bind pointer events on the root `<svg>` in a `useEffect`, map client coordinates back through `getScreenCTM().inverse()`, and hit-test in viewBox units so the overlay stays aligned at every viewport. Draw overlays *below* the arrows they must not cover, and call `svg.setPointerCapture` so dragging continues outside the element.
-  When a demo adds sidebar controls, keep the total sidebar content height under one viewport: `npm run verify:layout` measures the real content height (last sidebar child's bottom minus sidebar top) and fails if it exceeds the viewport.
-  Update the corresponding entry in `ROADMAP.md` (tick the checkbox and add the slug).


PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true


PUPPETEER_EXECUTABLE_PATH=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe


# Roadmap

站点要做什么、优先级如何、各章节覆盖到哪，统一记录在 [ROADMAP.md](./ROADMAP.md)。

站点覆盖小学 / 初中 / 高中的 **数学、物理、化学、地理、生物** 五科，目前仅有物理内容。
优先级约定：**先学段、后学科 —— 初中 > 小学 > 高中**。新增 demo 后请同步更新该文件。