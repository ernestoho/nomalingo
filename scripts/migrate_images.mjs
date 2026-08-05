/**
 * Move photo rendering from React Native's Image to expo-image.
 *
 * Two reasons, one correctness and one polish:
 *   1. On web, an absolutely-positioned RN Image renders at its intrinsic
 *      pixel size rather than stretching to its container, so a tall hero
 *      showed only its top slice. expo-image honours contentFit everywhere.
 *   2. expo-image supports `transition`, so photos fade in instead of popping.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const FILES = [
  'src/app/(tabs)/index.tsx',
  'src/app/(tabs)/meetups.tsx',
  'src/app/(tabs)/profile.tsx',
  'src/app/event/[id].tsx',
  'src/app/venue/[id].tsx',
  'src/app/official/[id].tsx',
];

let touched = 0;

for (const file of FILES) {
  let s = readFileSync(file, 'utf8');
  const before = s;

  // Drop Image from the react-native import list.
  s = s.replace(/^(\s*)Image,\n/m, '');

  // Add the expo-image import right after the react-native import block.
  if (!s.includes("from 'expo-image'")) {
    s = s.replace(/(\n)(import .*from 'react-native';\n)/, "$1$2import { Image } from 'expo-image';\n");
    if (!s.includes("from 'expo-image'")) {
      // react-native import is multi-line
      s = s.replace(/(\n\} from 'react-native';\n)/, "$1import { Image } from 'expo-image';\n");
    }
  }

  // resizeMode prop -> contentFit + transition
  s = s.replace(/resizeMode="cover"/g, 'contentFit="cover"\n            transition={220}');

  // resizeMode inside a style object -> remove (contentFit prop added below)
  s = s.replace(/(\s*)resizeMode: 'cover',\n/g, '\n');

  // Any <Image ...> that now lacks contentFit gets it.
  s = s.replace(/<Image\n(\s+)source=\{([^}]+)\}\n(\s+)style=\{\{([^]*?)\}\}\n(\s*)\/>/g,
    (m, i1, src, i3, styleBody, i5) =>
      m.includes('contentFit')
        ? m
        : `<Image\n${i1}source={${src}}\n${i3}style={{${styleBody}}}\n${i3}contentFit="cover"\n${i3}transition={220}\n${i5}/>`);

  // Guarantee full-bleed sizing where absoluteFill is used.
  s = s.replace(
    /style=\{StyleSheet\.absoluteFill\}\n(\s+)contentFit="cover"/g,
    "style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}\n$1contentFit=\"cover\"",
  );

  if (s !== before) {
    writeFileSync(file, s);
    touched++;
    console.log('  updated', file);
  } else {
    console.log('  unchanged', file);
  }
}

console.log(`${touched} file(s) migrated to expo-image`);
