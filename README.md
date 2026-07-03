# camera — 4587.fun 摄影站

[https://camera.4587.fun](https://camera.4587.fun) 的相册，瀑布流布局，点击看大图。
相册**不用写代码**——构建时自动扫描 `static/photos/` 目录生成。

## 加一张照片

把图片传到 `static/photos/` 目录即可（GitHub 网页：进目录 → Add file → Upload files → 拖入 → Commit）。

- **文件名 = 图片标题**（鼠标悬停时显示、看大图时显示）。如 `洱海边.jpg` → 标题「洱海边」
- **最新上传的自动排在最前面**（按 git 提交时间排序）
- 支持格式：jpg / jpeg / png / webp / gif / avif

> ✅ **不用手动压缩**：直接传原图就行。构建时会自动生成压缩版（最宽 2000px、webp 质量 82%）供网页显示，通常缩到原图的 1/15~1/30，画质几乎无损。原图仍保留在仓库里做备份。
>
> 唯一要注意：原图会占仓库空间（GitHub 仓库软上限约 1GB）。几百张精选照片没问题；真到量很大再考虑迁图床。

## 隐藏一张照片（不删文件）

在文件名**结尾**加 `hide` 或 `隐藏`（扩展名之前）：

- `洱海边 hide.jpg` → 不显示
- `洱海边 隐藏.jpg` → 不显示
- 想恢复：去掉结尾的 `hide` / `隐藏`

## 浏览行为

- 瀑布流布局，宽屏 4 列，自适应到手机 1 列
- 点任意图 → 全屏看大图；大图里左右箭头（或键盘 ← →）切换、ESC 关闭

## 原理（无需关心，仅备查）

- push 后 GitHub Actions 装 `sharp`，跑 `build-manifest.mjs`：扫描 `static/photos/`，把每张原图压缩成 `static/photos/_web/*.webp`，并生成 `photos.json`（指向压缩版）
- 页面加载 `photos.json` 渲染相册，实际显示的是压缩版
- 排序按 git 提交时间倒序，所以 workflow 里 checkout 用了 `fetch-depth: 0`（拉全历史）
- `photos.json` 和 `_web/` 都是自动生成的，不提交进仓库（已在 `.gitignore`）
- 压缩参数在 `build-manifest.mjs` 顶部：`MAX_W`（最宽像素）、`QUALITY`（webp 质量）

## 图片多到超过 GitHub 限制怎么办

当前图片直接放在仓库里，适合精选、压缩过的量（几十到一两百张）。如果以后图多到撑爆仓库/流量限制，可迁移到对象存储（如 Cloudflare R2），页面只留缩略图或改引用外链——那时再说。

## 部署

- GitHub Pages，Source = GitHub Actions；域名 `CNAME` = `camera.4587.fun`
- 改完 push 即发布，几十秒生效
