/**
 * Pricing Features Pipeline: Markdown → AST → Markdown
 *
 * Processes pricing_features_output.json through a complete pipeline:
 * 1. Read features from JSON
 * 2. Apply formatMarkdown() to each feature (rawMD)
 * 3. Generate AST from formatted markdown
 * 4. Convert AST back to markdown (ASTtoMD)
 * 5. Output comparison JSON with both versions
 *
 * Usage:
 *   node process_features_pipeline.js
 *   node process_features_pipeline.js custom-input.json
 */

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';

import { formatMarkdown } from '../lib/format-markdown.js';
import { remarkTooltip } from '../plugins/remark-tooltip.js';

// ── Config ─────────────────────────────────────────────────────────
const INPUT_FILE = process.argv[2] || 'pricing_features_output.json';
const OUTPUT_FILE = 'pricing_features_processed.json';

// ── Processors ─────────────────────────────────────────────────────

function createParseProcessor() {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkTooltip);
}

function createStringifyProcessor() {
  return unified()
    .use(remarkStringify)
    .use(remarkGfm)
    .use(remarkTooltip);
}

// ── Feature Processing ─────────────────────────────────────────────

function processFeature(featureString, parseProcessor, stringifyProcessor) {
  if (!featureString || featureString.trim() === '') {
    return {
      rawMD: '',
      astMD: '',
    };
  }

  try {
    // Step 1: Apply formatMarkdown() preprocessing
    const rawMD = formatMarkdown(featureString);

    // Step 2: Parse to AST
    const ast = parseProcessor.parse(rawMD);

    // Step 3: Convert AST back to markdown
    const astMD = stringifyProcessor.stringify(ast);

    return {
      rawMD,
      astMD,
    };
  } catch (error) {
    console.error(`Error processing feature: ${error.message}`);
    return {
      rawMD: featureString,
      astMD: '',
      error: error.message,
    };
  }
}

function processPricingPage(pricingPage, parseProcessor, stringifyProcessor) {
  const { pricing_page_id, features } = pricingPage;

  // Process each feature
  const processedFeatures = {};

  for (const [featKey, featValue] of Object.entries(features)) {
    processedFeatures[featKey] = processFeature(
      featValue,
      parseProcessor,
      stringifyProcessor
    );
  }

  return {
    pricingPageId: pricing_page_id,
    features: processedFeatures,
  };
}

// ── Main Pipeline ──────────────────────────────────────────────────

async function main() {
  console.log('═'.repeat(60));
  console.log('  PRICING FEATURES PIPELINE: Markdown → AST → Markdown');
  console.log('═'.repeat(60));
  console.log();

  // Step 1: Read input JSON
  console.log(`📄 Reading input file: ${INPUT_FILE}`);
  const inputPath = resolve(INPUT_FILE);
  const raw = await readFile(inputPath, 'utf-8');
  const pricingPages = JSON.parse(raw);

  console.log(`✅ Loaded ${pricingPages.length} pricing pages`);
  console.log();

  // Step 2: Create processors
  console.log('⚙️  Creating markdown processors...');
  const parseProcessor = createParseProcessor();
  const stringifyProcessor = createStringifyProcessor();
  console.log('✅ Processors ready');
  console.log();

  // Step 3: Process all pricing pages
  console.log('🔄 Processing features through pipeline...');
  const results = [];
  let totalFeatures = 0;
  let processedFeatures = 0;
  let errorCount = 0;

  for (let i = 0; i < pricingPages.length; i++) {
    const page = pricingPages[i];
    const featureCount = Object.keys(page.features || {}).length;
    totalFeatures += featureCount;

    if (featureCount === 0) {
      // Skip pages with no features
      results.push({
        pricingPageId: page.pricing_page_id,
        features: {},
      });
      continue;
    }

    console.log(
      `  [${i + 1}/${pricingPages.length}] Processing ${page.pricing_page_id} (${featureCount} features)`
    );

    const processed = processPricingPage(page, parseProcessor, stringifyProcessor);
    results.push(processed);

    // Count successes and errors
    for (const feat of Object.values(processed.features)) {
      if (feat.error) {
        errorCount++;
      } else {
        processedFeatures++;
      }
    }
  }

  console.log();
  console.log('✅ Processing complete');
  console.log(`   Total features: ${totalFeatures}`);
  console.log(`   Processed: ${processedFeatures}`);
  console.log(`   Errors: ${errorCount}`);
  console.log();

  // Step 4: Write output
  console.log(`💾 Writing output to: ${OUTPUT_FILE}`);
  const output = {
    meta: {
      generatedAt: new Date().toISOString(),
      inputFile: INPUT_FILE,
      totalPricingPages: results.length,
      totalFeatures,
      processedFeatures,
      errorCount,
      pipeline: 'formatMarkdown → AST → markdown',
    },
    data: results,
  };

  const outputPath = resolve(OUTPUT_FILE);
  await writeFile(outputPath, JSON.stringify(output, null, 2));

  console.log('✅ Output written successfully');
  console.log();

  // Step 5: Show sample output
  console.log('📋 Sample output (first pricing page with features):');
  console.log('─'.repeat(60));
  const samplePage = results.find((p) => Object.keys(p.features).length > 0);
  if (samplePage) {
    const firstFeature = Object.entries(samplePage.features)[0];
    console.log(`Pricing Page ID: ${samplePage.pricingPageId}`);
    console.log(`Feature: ${firstFeature[0]}`);
    console.log();
    console.log('rawMD (after formatMarkdown):');
    console.log(firstFeature[1].rawMD.substring(0, 200) + '...');
    console.log();
    console.log('astMD (after AST conversion):');
    console.log(firstFeature[1].astMD.substring(0, 200) + '...');
  }
  console.log('─'.repeat(60));
  console.log();

  // Summary
  console.log('═'.repeat(60));
  console.log('  PIPELINE COMPLETE');
  console.log('═'.repeat(60));
  console.log(`  ✅ Processed ${pricingPages.length} pricing pages`);
  console.log(`  ✅ Processed ${processedFeatures} features`);
  if (errorCount > 0) {
    console.log(`  ⚠️  ${errorCount} errors encountered`);
  }
  console.log(`  📁 Output: ${OUTPUT_FILE}`);
  console.log('═'.repeat(60));
}

main().catch((err) => {
  console.error('\n💥 Pipeline failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
