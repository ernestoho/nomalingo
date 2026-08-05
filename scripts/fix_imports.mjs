/**
 * Normalise relative import depth across src/app.
 *
 * Screens were written against a shared contract but at different directory
 * depths, so `../../components/ui` and `../../../components/ui` both appear.
 * Rather than hand-correcting each one, compute the correct prefix from the
 * file's actual location. Deterministic and complete, which hand-editing
 * across twenty files is not.
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, dirname, sep } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = join(ROOT, 'src');
const APP = join(SRC, 'app');
const TOP_DIRS = ['components', 'theme', 'lib', 'data', 'assets'];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

let changed = 0;
const report = [];

for (const file of walk(APP)) {
  const src = readFileSync(file, 'utf8');
  let next = src;

  for (const top of TOP_DIRS) {
    // Match any run of ../ followed by one of the known top-level dirs.
    const re = new RegExp(`(['"])((?:\\.\\./)+)(${top}/[^'"]*)\\1`, 'g');
    next = next.replace(re, (_m, quote, _dots, tail) => {
      const targetRoot = top === 'assets' ? ROOT : SRC;
      let rel = relative(dirname(file), join(targetRoot, tail)).split(sep).join('/');
      if (!rel.startsWith('.')) rel = `./${rel}`;
      return `${quote}${rel}${quote}`;
    });
  }

  if (next !== src) {
    writeFileSync(file, next);
    changed++;
    report.push(relative(ROOT, file));
  }
}

console.log(`rewrote imports in ${changed} file(s)`);
for (const r of report) console.log('  ' + r);
