/**
 * Remark plugin for [text]{tooltip} syntax.
 *
 * Glue layer that registers:
 *  1. micromark extension  → tokenization
 *  2. fromMarkdown utility → tokens to MDAST nodes
 *  3. toMarkdown utility   → MDAST nodes back to markdown
 */

import { tooltip } from './micromark-extension-tooltip.js';
import {
  tooltipFromMarkdown,
  tooltipToMarkdown,
} from './mdast-util-tooltip.js';

export function remarkTooltip() {
  const data = this.data();

  add('micromarkExtensions', tooltip());
  add('fromMarkdownExtensions', tooltipFromMarkdown());
  add('toMarkdownExtensions', tooltipToMarkdown());

  function add(field, value) {
    const list = data[field] ? data[field] : (data[field] = []);
    list.push(value);
  }
}
