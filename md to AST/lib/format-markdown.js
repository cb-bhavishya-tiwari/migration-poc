/**
 * Preprocess database markdown into standard CommonMark.
 *
 * Ported from: src/client/lib/markdown-helper.ts
 * KEEP IN SYNC with the source file above!
 *
 * Handles:
 *  - Setext headings (===) → ATX headings (#)
 *  - Spacing normalization
 *  - Double-underscore bold (__text__) → **text**
 *  - Emoji shortcodes (:fire:) → native unicode emoji
 */

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const emojiData = require('@emoji-mart/data');

export function formatMarkdown(markdown) {
  // 1. Convert Setext headings to ATX headings
  markdown = markdown.replace(/^(.*)\n(\s*)(=+)(\s*)\n/gm, '# $1\n\n');

  // 2. Normalize spacing
  markdown = markdown.replace(/ {2,}/g, ' ');
  markdown = markdown.replace(/ +$/gm, '');
  markdown = markdown.replace(/\n +/g, '\n');

  // 3. Ensure double newlines for paragraph breaks
  markdown = markdown.replace(/\n/g, '\n\n');
  markdown = markdown.replace(/\n{3,}/g, '\n\n');
  markdown = markdown.replace(/\n+$/, '');

  // 4. Convert __ to ** for bold
  markdown = markdown.replace(/ {1}__(.*?)__ {1}/g, ' **$1** ');

  // 5. Convert :emoji_code: to actual emoji
  const emojiRegex = /:(\w+):/g;
  const matches = markdown.match(emojiRegex);
  if (matches) {
    matches.forEach((match) => {
      const emoji = emojiData.emojis[match.replace(/:/g, '')];
      if (emoji) {
        markdown = markdown.replace(match, emoji.skins[0].native);
      }
    });
  }

  return markdown;
}
