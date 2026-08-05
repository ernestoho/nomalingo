/**
 * Pin horizontal ScrollViews so they stop eating vertical space.
 *
 * A horizontal ScrollView inside a flex column has no intrinsic height, so it
 * grows to fill whatever is available and the next sibling ends up drawn on
 * top of it. On the meetups tab this put the "Crear encuentro" button straight
 * over the category chips. `flexGrow: 0` makes the row hug its content, which
 * is what a filter rail should always do.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const FILES = [
  'src/app/(tabs)/index.tsx',
  'src/app/(tabs)/discover.tsx',
  'src/app/(tabs)/meetups.tsx',
  'src/app/chat/[id].tsx',
];

let total = 0;

for (const file of FILES) {
  let s = readFileSync(file, 'utf8');
  const before = s;

  // <ScrollView\n <indent>horizontal   →   inject a pinning style right after
  s = s.replace(
    /(<ScrollView\n)(\s+)horizontal\n/g,
    (m, open, indent) => `${open}${indent}horizontal\n${indent}style={{ flexGrow: 0, flexShrink: 0 }}\n`,
  );

  // Don't double-apply if a style prop already follows.
  s = s.replace(
    /style=\{\{ flexGrow: 0, flexShrink: 0 \}\}\n(\s+)style=/g,
    'style=',
  );

  if (s !== before) {
    const n = (s.match(/flexGrow: 0, flexShrink: 0/g) || []).length;
    writeFileSync(file, s);
    console.log(`  ${file}: ${n} horizontal rail(s) pinned`);
    total += n;
  }
}

console.log(`${total} pinned`);
