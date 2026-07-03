// Scans static/photos/ and writes photos.json — the gallery manifest.
// Runs in GitHub Actions before deploy, so uploading an image is enough to
// make it appear. End a filename with "hide" or "隐藏" to skip it.
//
//   洱海边.jpg          -> { title: "洱海边" }
//   洱海边 hide.jpg     -> skipped (hidden)
//   洱海边 隐藏.jpg     -> skipped (hidden)
//
// Originals live in static/photos/. Each is compressed to a web version in
// static/photos/_web/ (<=2000px wide, webp q82) that the site actually loads;
// the original stays in the repo as a backup. If sharp isn't installed, the
// manifest falls back to the originals so local runs still work.

import { readdirSync, writeFileSync, statSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const DIR = 'static/photos';
const WEB = join(DIR, '_web');
const IMG = /\.(jpe?g|png|webp|gif|avif)$/i;
const HIDDEN = /[ _\-]*(hide|隐藏)$/i;
const MAX_W = 2000;   // longest edge for web version
const QUALITY = 82;   // webp quality

// try to load sharp; compression is optional
let sharp = null;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.warn('sharp not installed — using original images (no compression)');
}

// "newest first" needs upload time. git checkout resets file mtimes, so we
// use each file's last-commit timestamp (falls back to mtime outside git).
function uploadTime(f) {
  try {
    const out = execSync(`git log -1 --format=%ct -- "${join(DIR, f)}"`, {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (out) return Number(out) * 1000;
  } catch { /* not a git repo, or file untracked */ }
  return statSync(join(DIR, f)).mtimeMs;
}

async function toWeb(file) {
  // gif can be animated — leave those untouched
  if (!sharp || /\.gif$/i.test(file)) return `${DIR}/${file}`;
  mkdirSync(WEB, { recursive: true });
  const out = file.replace(IMG, '') + '.webp';
  const outPath = join(WEB, out);
  try {
    await sharp(join(DIR, file))
      .rotate()                                   // respect EXIF orientation
      .resize({ width: MAX_W, height: MAX_W, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(outPath);
    return `${WEB}/${out}`;
  } catch (e) {
    console.warn(`  ! compress failed for ${file}: ${e.message} — using original`);
    return `${DIR}/${file}`;
  }
}

let files = [];
try {
  files = readdirSync(DIR);
} catch {
  console.error(`no ${DIR}/ directory — writing empty manifest`);
}

const visible = files
  .filter((f) => IMG.test(f))
  .filter((f) => !f.startsWith('.') && !f.startsWith('_'))  // skip _web output
  .map((f) => ({ file: f, base: f.replace(IMG, ''), t: uploadTime(f) }))
  .filter(({ base }) => !HIDDEN.test(base))
  .sort((a, b) => b.t - a.t);  // newest upload first

const photos = [];
for (const { file, base } of visible) {
  const src = await toWeb(file);
  photos.push({ title: base.trim(), src });
}

writeFileSync('photos.json', JSON.stringify(photos, null, 2) + '\n');
console.log(`photos.json written: ${photos.length} photo(s)${sharp ? ' (compressed)' : ''}`);
photos.forEach((p) => console.log(`  · ${p.title} -> ${p.src}`));
