/**
 * Markdown → AST Migration Pipeline
 *
 * Reads a raw markdown string from input JSON, preprocesses it into
 * standard CommonMark, parses it to an MDAST tree (with custom tooltip
 * support), validates the result, and writes the AST to output JSON.
 *
 * Usage:
 *   node migrate.js                          # run with default input
 *   node migrate.js path/to/custom-input.json
 *   DRY_RUN=true node migrate.js             # print AST without writing
 */

import { mkdir,readFile, writeFile } from 'node:fs/promises';
import { basename,resolve } from 'node:path';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

import { formatMarkdown } from './lib/format-markdown.js';
import { remarkTooltip } from './plugins/remark-tooltip.js';
import { cleanMDAST, getCleaningStats } from './lib/clean-mdast.js';

// ── Config ─────────────────────────────────────────────────────────
const DRY_RUN = process.env.DRY_RUN === 'true';
const INPUT_PATH = process.argv[2] || 'input/sample-input.json';
const OUTPUT_DIR = 'output';

// ── 1. Read Input ──────────────────────────────────────────────────

async function readInput(filePath) {
  const absolutePath = resolve(filePath);
  const raw = await readFile(absolutePath, 'utf-8');
  const data = JSON.parse(raw);

  if (!data.markdownString) {
    throw new Error(
      `Input JSON must have a "markdownString" key. Got keys: ${Object.keys(data).join(', ')}`,
    );
  }

  console.log('📄 Input file:', absolutePath);
  console.log('📏 Raw string length:', data.markdownString.length, 'chars\n');

  return data.markdownString;
}

// ── 2. Preprocess ──────────────────────────────────────────────────

function preprocess(rawMarkdown) {
  console.log('⚙️  Running formatMarkdown() preprocessing...');

  const normalized = formatMarkdown(rawMarkdown);

  console.log('✅ Preprocessing complete');
  console.log(
    '   Setext headings (===) → # :',
    rawMarkdown.includes('\n===') ? 'converted' : 'none found',
  );
  console.log(
    '   Emoji shortcodes      :',
    (rawMarkdown.match(/:(\w+):/g) || []).length,
    'found',
  );
  console.log(
    '   Double-underscore bold :',
    (rawMarkdown.match(/ __.*?__ /g) || []).length,
    'found\n',
  );

  return normalized;
}

// ── 3. Create Processor ────────────────────────────────────────────

function createProcessor() {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkTooltip);
}

// ── 4. Parse to AST ────────────────────────────────────────────────

function parseToAST(processor, markdown) {
  console.log('🌳 Parsing markdown to MDAST...');

  const ast = processor.parse(markdown);

  console.log('✅ Parse complete');
  console.log('   Root children:', ast.children.length, '\n');

  return ast;
}

// ── 5. Validate AST ────────────────────────────────────────────────

const VALID_NODE_TYPES = new Set([
  'root',
  'paragraph',
  'text',
  'heading',
  'list',
  'listItem',
  'strong',
  'emphasis',
  'delete',
  'link',
  'image',
  'blockquote',
  'code',
  'inlineCode',
  'break',
  'thematicBreak',
  'html',
  'tooltip',
]);

function validateAST(ast) {
  console.log('🔍 Validating AST...');

  const stats = {};
  const unknownTypes = [];

  visit(ast, (node) => {
    stats[node.type] = (stats[node.type] || 0) + 1;

    if (!VALID_NODE_TYPES.has(node.type)) {
      unknownTypes.push(node.type);
    }
  });

  console.log('   Node type counts:');
  Object.entries(stats)
    .sort(([, a], [, b]) => b - a)
    .forEach(([type, count]) => {
      const marker = VALID_NODE_TYPES.has(type) ? '✅' : '❌';
      console.log(`     ${marker} ${type}: ${count}`);
    });

  if (unknownTypes.length > 0) {
    console.log(`\n⚠️  Unknown node types found: ${unknownTypes.join(', ')}`);
    console.log('   These may need to be added to VALID_NODE_TYPES');
  } else {
    console.log('\n✅ All node types are valid');
  }

  return { stats, unknownTypes };
}

// ── 6. Write Output ────────────────────────────────────────────────

async function writeOutput(ast, inputPath) {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const inputName = basename(inputPath, '.json');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFileName = `${inputName}-ast-${timestamp}.json`;
  const outputPath = resolve(OUTPUT_DIR, outputFileName);

  const output = {
    meta: {
      generatedAt: new Date().toISOString(),
      inputFile: inputPath,
      pipeline: 'formatMarkdown → remarkParse + remarkGfm + remarkTooltip',
    },
    ast,
  };

  await writeFile(outputPath, JSON.stringify(output, null, 2));

  console.log(`\n💾 AST written to: ${outputPath}`);

  return outputPath;
}

// ── 7. Roundtrip Test (optional) ───────────────────────────────────

function roundtripTest(ast) {
  console.log('\n🔄 Roundtrip test (AST → markdown):');

  const stringifyProcessor = unified()
    .use(remarkStringify)
    .use(remarkGfm)
    .use(remarkTooltip);

  const markdown = stringifyProcessor.stringify(ast);

  console.log('─'.repeat(50));
  console.log(markdown);
  console.log('─'.repeat(50));
}

// ── Main Pipeline ──────────────────────────────────────────────────

async function main() {
  console.log('═'.repeat(50));
  console.log('  MARKDOWN → AST MIGRATION PIPELINE');
  console.log('═'.repeat(50));
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN (no file writes)' : 'LIVE'}`);
  console.log('═'.repeat(50));
  console.log();

  // Step 1: Read input
  const rawMarkdown = await readInput(INPUT_PATH);

  // Step 2: Preprocess
  const normalizedMarkdown = preprocess(rawMarkdown);
  console.log('normalizedMarkdown below');
  console.log(normalizedMarkdown);
  console.log('normalizedMarkdown above');

  // Step 3: Create processor
  const processor = createProcessor();

  // Step 4: Parse to AST
  const rawAst = parseToAST(processor, normalizedMarkdown);

  // Step 5: Clean AST (remove positions and html nodes)
  console.log('🧹 Cleaning AST (removing positions and html nodes)...');
  const ast = cleanMDAST(rawAst);
  const cleaningStats = getCleaningStats(rawAst, ast);
  
  console.log('✅ AST cleaning complete');
  console.log(`   Removed ${cleaningStats.removedPositions} position properties`);
  console.log(`   Removed ${cleaningStats.removedHtmlNodes} html nodes`);
  console.log(`   Nodes: ${cleaningStats.originalNodes} → ${cleaningStats.cleanedNodes}\n`);

  // Step 6: Validate
  const { unknownTypes } = validateAST(ast);

  // Step 7: Write output
  if (!DRY_RUN) {
    await writeOutput(ast, INPUT_PATH);
  } else {
    console.log('\n📋 DRY RUN — AST preview:');
    console.log(JSON.stringify(ast, null, 2));
  }

  // Step 8: Roundtrip test
  roundtripTest(ast);

  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log('  MIGRATION COMPLETE');
  console.log('═'.repeat(50));
  if (unknownTypes.length > 0) {
    console.log(`  ⚠️  ${unknownTypes.length} unknown node type(s) detected`);
  } else {
    console.log('  ✅ All validations passed');
  }
  console.log('═'.repeat(50));
}

main().catch((err) => {
  console.error('\n💥 Migration failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
