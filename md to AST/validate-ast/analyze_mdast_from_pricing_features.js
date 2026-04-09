/**
 * MDAST coverage analysis for pricing-page feature markdown
 *
 * Reads existing JSON (default: pricing_features_output.json) — no network fetch.
 * For each feature string: formatMarkdown() → same remark pipeline as process_features_pipeline.js
 * (remark-parse + remark-gfm + remark-tooltip), then walks the resulting MDAST.
 *
 * Usage:
 *   node analyze_mdast_from_pricing_features.js
 *   node analyze_mdast_from_pricing_features.js path/to/input.json path/to/report.json
 *
 * ── What this script measures (for MDAST → HTML planning) ─────────────────
 *
 * 1) Node type inventory
 *    Count of every `node.type` (root, paragraph, heading, strong, table, tooltip, …).
 *    This is the checklist of HTML handlers you need (plus any type with zero count).
 *
 * 2) Parent → child edges
 *    For each non-root node, record parentType → childType frequencies.
 *    Shows allowed nesting (e.g. paragraph → strong → text) and how often it appears.
 *
 * 3) Properties / “data” on nodes (not structure)
 *    Per node type, union of own keys excluding type, position, children.
 *    Examples: heading.depth, link.url / link.title, code.lang / code.meta,
 *    tooltip.text / tooltip.tooltip, table.align.
 *    Your serializer must read these fields, not only switch on `type`.
 *
 * 4) Tree depth
 *    Global max depth; per node type min / max / mean depth (root = 0).
 *    Helps estimate recursion depth and where deep inline stacks appear.
 *
 * 5) “Marks” / inline-like types
 *    Counts for common MDAST inline / annotation nodes: emphasis, strong, delete,
 *    inlineCode, link, linkReference, image, imageReference, break, html,
 *    footnoteReference, and custom tooltip. (GFM may add more; they still appear in
 *    node type counts.)
 *
 * 6) GFM / block shape hints
 *    Heading depth histogram; list ordered vs unordered counts; fenced code `lang`
 *    histogram; blockquote / table / thematicBreak / definition / footnoteDefinition
 *    counts (when present).
 *
 * 7) Parse failures
 *    Features where parse throws: counted and listed with pricing_page_id + key
 *    (capped) so you can fix preprocess or plugins.
 *
 * Output: JSON report with meta + aggregated stats (default: mdast_analysis_report.json).
 */

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

import { formatMarkdown } from '../lib/format-markdown.js';
import { remarkTooltip } from '../plugins/remark-tooltip.js';

// ── Config ───────────────────────────────────────────────────────────

const INPUT = process.argv[2] || 'pricing_features_output.json';
const OUTPUT = process.argv[3] || 'mdast_analysis_report.json';

const INLINE_MARK_TYPES = new Set([
  'emphasis',
  'strong',
  'delete',
  'inlineCode',
  'link',
  'linkReference',
  'image',
  'imageReference',
  'break',
  'html',
  'footnoteReference',
  'tooltip',
]);

const IGNORE_PROPS = new Set(['type', 'position', 'children']);

// ── Parser (must match process_features_pipeline.js) ───────────────

function createParseProcessor() {
  return unified().use(remarkParse).use(remarkGfm).use(remarkTooltip);
}

function edgeKey(parentType, childType) {
  return `${parentType}→${childType}`;
}

function recordDepthStats(byType, nodeType, depth) {
  let s = byType[nodeType];
  if (!s) {
    s = { min: depth, max: depth, sum: 0, count: 0 };
    byType[nodeType] = s;
  }
  s.min = Math.min(s.min, depth);
  s.max = Math.max(s.max, depth);
  s.sum += depth;
  s.count += 1;
}

function walk(node, depth, parentType, ctx) {
  const t = node.type;
  ctx.nodeTypes[t] = (ctx.nodeTypes[t] || 0) + 1;
  ctx.maxDepth = Math.max(ctx.maxDepth, depth);
  recordDepthStats(ctx.depthByType, t, depth);

  if (parentType != null) {
    const ek = edgeKey(parentType, t);
    ctx.edges[ek] = (ctx.edges[ek] || 0) + 1;
  }

  if (INLINE_MARK_TYPES.has(t)) {
    ctx.inlineMarks[t] = (ctx.inlineMarks[t] || 0) + 1;
  }

  for (const key of Object.keys(node)) {
    if (IGNORE_PROPS.has(key)) continue;
    if (!ctx.propsByType[t]) ctx.propsByType[t] = new Set();
    ctx.propsByType[t].add(key);
  }

  if (t === 'heading' && typeof node.depth === 'number') {
    const d = String(node.depth);
    ctx.headingDepths[d] = (ctx.headingDepths[d] || 0) + 1;
  }

  if (t === 'list' && typeof node.ordered === 'boolean') {
    const k = node.ordered ? 'ordered' : 'unordered';
    ctx.listOrdered[k] = (ctx.listOrdered[k] || 0) + 1;
  }

  if (t === 'code' && node.lang != null) {
    const lang = node.lang === '' ? '(empty)' : String(node.lang);
    ctx.codeLangs[lang] = (ctx.codeLangs[lang] || 0) + 1;
  }

  if (t === 'blockquote') ctx.blockquotes += 1;
  if (t === 'table') ctx.tables += 1;
  if (t === 'thematicBreak') ctx.thematicBreaks += 1;
  if (t === 'definition') ctx.definitions += 1;
  if (t === 'footnoteDefinition') ctx.footnoteDefinitions += 1;

  const children = node.children;
  if (!Array.isArray(children)) return;

  for (const child of children) {
    walk(child, depth + 1, t, ctx);
  }
}

function emptyCtx() {
  return {
    nodeTypes: {},
    edges: {},
    propsByType: {},
    depthByType: {},
    maxDepth: 0,
    inlineMarks: {},
    headingDepths: {},
    listOrdered: {},
    codeLangs: {},
    blockquotes: 0,
    tables: 0,
    thematicBreaks: 0,
    definitions: 0,
    footnoteDefinitions: 0,
  };
}

function mergeCtx(globalCtx, pageCtx) {
  for (const [k, v] of Object.entries(pageCtx.nodeTypes)) {
    globalCtx.nodeTypes[k] = (globalCtx.nodeTypes[k] || 0) + v;
  }
  for (const [k, v] of Object.entries(pageCtx.edges)) {
    globalCtx.edges[k] = (globalCtx.edges[k] || 0) + v;
  }
  for (const [t, set] of Object.entries(pageCtx.propsByType)) {
    if (!globalCtx.propsByType[t]) globalCtx.propsByType[t] = new Set();
    for (const p of set) globalCtx.propsByType[t].add(p);
  }
  globalCtx.maxDepth = Math.max(globalCtx.maxDepth, pageCtx.maxDepth);
  for (const [t, s] of Object.entries(pageCtx.depthByType)) {
    const g = globalCtx.depthByType[t];
    if (!g) {
      globalCtx.depthByType[t] = { ...s };
    } else {
      g.min = Math.min(g.min, s.min);
      g.max = Math.max(g.max, s.max);
      g.sum += s.sum;
      g.count += s.count;
    }
  }
  for (const [k, v] of Object.entries(pageCtx.inlineMarks)) {
    globalCtx.inlineMarks[k] = (globalCtx.inlineMarks[k] || 0) + v;
  }
  for (const [k, v] of Object.entries(pageCtx.headingDepths)) {
    globalCtx.headingDepths[k] = (globalCtx.headingDepths[k] || 0) + v;
  }
  for (const [k, v] of Object.entries(pageCtx.listOrdered)) {
    globalCtx.listOrdered[k] = (globalCtx.listOrdered[k] || 0) + v;
  }
  for (const [k, v] of Object.entries(pageCtx.codeLangs)) {
    globalCtx.codeLangs[k] = (globalCtx.codeLangs[k] || 0) + v;
  }
  globalCtx.blockquotes += pageCtx.blockquotes;
  globalCtx.tables += pageCtx.tables;
  globalCtx.thematicBreaks += pageCtx.thematicBreaks;
  globalCtx.definitions += pageCtx.definitions;
  globalCtx.footnoteDefinitions += pageCtx.footnoteDefinitions;
}

function serializePropsByType(propsByType) {
  const out = {};
  for (const [t, set] of Object.entries(propsByType)) {
    out[t] = [...set].sort();
  }
  return out;
}

function finalizeDepthByType(depthByType) {
  const out = {};
  for (const [t, s] of Object.entries(depthByType)) {
    out[t] = {
      minDepth: s.min,
      maxDepth: s.max,
      meanDepth: s.count ? s.sum / s.count : 0,
      nodeCount: s.count,
    };
  }
  return out;
}

function sortEntries(obj) {
  return Object.fromEntries(
    Object.entries(obj).sort((a, b) => b[1] - a[1]),
  );
}

async function main() {
  const inputPath = resolve(INPUT);
  const raw = await readFile(inputPath, 'utf-8');
  const pages = JSON.parse(raw);

  const parseProcessor = createParseProcessor();

  const globalCtx = emptyCtx();
  let featuresTotal = 0;
  let featuresParsed = 0;
  let featuresEmpty = 0;
  const parseErrors = [];

  for (const page of pages) {
    const pid = page.pricing_page_id ?? page.pricingPageId ?? '(unknown)';
    const feats = page.features || {};

    for (const [featKey, featVal] of Object.entries(feats)) {
      featuresTotal += 1;
      const text =
        typeof featVal === 'string'
          ? featVal
          : featVal == null
            ? ''
            : JSON.stringify(featVal);

      if (!text.trim()) {
        featuresEmpty += 1;
        continue;
      }

      let md;
      try {
        md = formatMarkdown(text);
      } catch (e) {
        parseErrors.push({
          pricing_page_id: pid,
          featureKey: featKey,
          stage: 'formatMarkdown',
          message: e.message,
        });
        continue;
      }

      let tree;
      try {
        tree = parseProcessor.parse(md);
      } catch (e) {
        parseErrors.push({
          pricing_page_id: pid,
          featureKey: featKey,
          stage: 'parse',
          message: e.message,
        });
        continue;
      }

      featuresParsed += 1;
      const pageCtx = emptyCtx();
      walk(tree, 0, null, pageCtx);
      mergeCtx(globalCtx, pageCtx);
    }
  }

  const report = {
    meta: {
      generatedAt: new Date().toISOString(),
      inputFile: INPUT,
      parserPipeline: 'formatMarkdown → remark-parse + remark-gfm + remark-tooltip',
      pricingPageCount: pages.length,
      featureStringsTotal: featuresTotal,
      featureStringsNonEmpty: featuresTotal - featuresEmpty,
      featureStringsParsedOk: featuresParsed,
      featureStringsEmptySkipped: featuresEmpty,
      parseErrorCount: parseErrors.length,
    },
    nodeTypes: sortEntries(globalCtx.nodeTypes),
    parentChildEdges: sortEntries(globalCtx.edges),
    propertiesByNodeType: serializePropsByType(globalCtx.propsByType),
    treeDepth: {
      maxDepthAcrossAllTrees: globalCtx.maxDepth,
      perNodeType: finalizeDepthByType(globalCtx.depthByType),
    },
    inlineMarkLikeTypes: sortEntries(globalCtx.inlineMarks),
    gfmAndBlocks: {
      headingDepthHistogram: sortEntries(globalCtx.headingDepths),
      listOrderedVsUnordered: sortEntries(globalCtx.listOrdered),
      fencedCodeLangHistogram: sortEntries(globalCtx.codeLangs),
      blockquoteNodes: globalCtx.blockquotes,
      tableNodes: globalCtx.tables,
      thematicBreakNodes: globalCtx.thematicBreaks,
      definitionNodes: globalCtx.definitions,
      footnoteDefinitionNodes: globalCtx.footnoteDefinitions,
    },
    parseErrors: parseErrors.slice(0, 200),
  };

  if (parseErrors.length > 200) {
    report.meta.parseErrorsTruncated = parseErrors.length - 200;
  }

  const outPath = resolve(OUTPUT);
  await writeFile(outPath, JSON.stringify(report, null, 2), 'utf-8');

  console.log('MDAST analysis complete');
  console.log(`  Input:  ${inputPath}`);
  console.log(`  Report: ${outPath}`);
  console.log(`  Parsed ${featuresParsed} non-empty features (${parseErrors.length} errors)`);
  console.log(`  Distinct node types: ${Object.keys(globalCtx.nodeTypes).length}`);
  console.log(`  Max tree depth: ${globalCtx.maxDepth}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
