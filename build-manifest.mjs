// Scans static/photos/ and writes photos.json — the gallery manifest.
// Runs in GitHub Actions before deploy, so uploading an image is enough to
// make it appear. End a filename with "hide" or "隐藏" to skip it.
//
//   洱海边.jpg          -> { title: "洱海边" }
//   洱海边 hide.jpg     -> skipped (hidden)
//   洱海边 隐藏.jpg     -> skipped (hidden)

import { readdirSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const DIR = 'static/photos';
const IMG = /\.(jpe?g|png|webp|gif|avif)$/i;
const HIDDEN = /[ _\-]*(hide|隐藏)$/i;

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

let files = [];
try {
  files = readdirSync(DIR);
} catch {
  console.error(`no ${DIR}/ directory — writing empty manifest`);
}

const photos = files
  .filter((f) => IMG.test(f))
  .filter((f) => !f.startsWith('.'))
  .map((f) => ({ file: f, base: f.replace(IMG, ''), t: uploadTime(f) }))
  .filter(({ base }) => !HIDDEN.test(base))
  .sort((a, b) => b.t - a.t)  // newest upload first
  .map(({ file, base }) => ({ title: base.trim(), src: `${DIR}/${file}` }));

writeFileSync('photos.json', JSON.stringify(photos, null, 2) + '\n');
console.log(`photos.json written: ${photos.length} photo(s)`);
photos.forEach((p) => console.log(`  · ${p.title}`));
