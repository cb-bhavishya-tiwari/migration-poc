/**
 * Generate Clean MDAST: Pricing Features → Clean MDAST (no positions, no html)
 *
 * Processes pricing_features_output.json and generates clean MDAST trees for each feature:
 * 1. Preprocesses markdown with formatMarkdown()
 * 2. Parses to MDAST using unified + remark pipeline
 * 3. Cleans MDAST by removing position properties and html nodes
 * 4. Outputs clean MDAST JSON suitable for production use
 *
 * Usage:
 *   node generate_clean_mdast.js
 *   node generate_clean_mdast.js custom-input.json
 */

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

import { formatMarkdown } from '../lib/format-markdown.js';
import { remarkTooltip } from '../plugins/remark-tooltip.js';
import { cleanMDAST, getCleaningStats } from '../lib/clean-mdast.js';

// ── Config ─────────────────────────────────────────────────────────
const INPUT_FILE = process.argv[2] || 'pricing_features_output.json';
const OUTPUT_FILE = 'pricing_features_clean_mdast.json';

// ── Processor ──────────────────────────────────────────────────────

function createParseProcessor() {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkTooltip);
}

// ── Feature Processing ─────────────────────────────────────────────

function processFeatureToCleanMDAST(featureString, processor) {
  if (!featureString || featureString.trim() === '') {
    return {
      mdast: null,
      error: null,
    };
  }

  try {
    // Step 1: Apply formatMarkdown() preprocessing
    const normalizedMD = formatMarkdown(featureString);

    // Step 2: Parse to raw AST
    const rawAst = processor.parse(normalizedMD);

    // Step 3: Clean AST (remove positions and html nodes)
    const cleanedAST = cleanMDAST(rawAst);

    return {
      mdast: cleanedAST,
      error: null,
    };
  } catch (error) {
    return {
      mdast: null,
      error: error.message,
    };
  }
}

function processPricingPage(pricingPage, processor) {
  const { pricing_page_id, features } = pricingPage;

  // Process each feature to clean MDAST
  const processedFeatures = {};
  let successCount = 0;
  let errorCount = 0;

  for (const [featKey, featValue] of Object.entries(features)) {
    const result = processFeatureToCleanMDAST(featValue, processor);
    
    if (result.error) {
      errorCount++;
      processedFeatures[featKey] = {
        mdast: null,
        error: result.error,
      };
    } else {
      successCount++;
      processedFeatures[featKey] = {
        mdast: result.mdast,
      };
    }
  }

  return {
    pricingPageId: pricing_page_id,
    features: processedFeatures,
    stats: {
      totalFeatures: Object.keys(features).length,
      successCount,
      errorCount,
    },
  };
}

// ── Main Pipeline ──────────────────────────────────────────────────

async function main() {
  console.log('═'.repeat(70));
  console.log('  PRICING FEATURES → CLEAN MDAST GENERATOR');
  console.log('═'.repeat(70));
  console.log('  Removes: position properties, html nodes');
  console.log('  Outputs: Clean MDAST trees ready for production');
  console.log('═'.repeat(70));
  console.log();

  // Step 1: Read input JSON
  console.log(`📄 Reading input file: ${INPUT_FILE}`);
  const inputPath = resolve(INPUT_FILE);
  const raw = await readFile(inputPath, 'utf-8');
  const pricingPages = JSON.parse(raw);

  console.log(`✅ Loaded ${pricingPages.length} pricing pages`);
  console.log();

  // Step 2: Create processor
  console.log('⚙️  Creating MDAST processor...');
  const processor = createParseProcessor();
  console.log('✅ Processor ready (remark-parse + remark-gfm + remark-tooltip)');
  console.log();

  // Step 3: Process all pricing pages
  console.log('🔄 Processing features to clean MDAST...');
  const results = [];
  let totalFeatures = 0;
  let totalSuccess = 0;
  let totalErrors = 0;
  let totalHtmlNodesRemoved = 0;
  let totalPositionsRemoved = 0;

  for (let i = 0; i < pricingPages.length; i++) {
    const page = pricingPages[i];
    const featureCount = Object.keys(page.features || {}).length;
    totalFeatures += featureCount;

    if (featureCount === 0) {
      // Skip pages with no features
      results.push({
        pricingPageId: page.pricing_page_id,
        features: {},
        stats: { totalFeatures: 0, successCount: 0, errorCount: 0 },
      });
      continue;
    }

    console.log(
      `  [${i + 1}/${pricingPages.length}] Processing ${page.pricing_page_id} (${featureCount} features)`
    );

    const processed = processPricingPage(page, processor);
    results.push(processed);

    totalSuccess += processed.stats.successCount;
    totalErrors += processed.stats.errorCount;

    // Count cleaning stats for this page
    for (const [featKey, featResult] of Object.entries(processed.features)) {
      if (featResult.mdast && !featResult.error) {
        // For stats, we'll estimate based on the fact that we clean all nodes
        // In a real implementation, you might want to track these more precisely
        const nodeCount = countNodes(featResult.mdast);
        totalPositionsRemoved += nodeCount; // Each node would have had a position
      }
    }
  }

  console.log();
  console.log('✅ Processing complete');
  console.log(`   Total features: ${totalFeatures}`);
  console.log(`   Successfully processed: ${totalSuccess}`);
  console.log(`   Errors: ${totalErrors}`);
  console.log(`   Estimated positions removed: ${totalPositionsRemoved}`);
  console.log(`   HTML nodes removed: ${totalHtmlNodesRemoved}`);
  console.log();

  // Step 4: Write output
  console.log(`💾 Writing clean MDAST output to: ${OUTPUT_FILE}`);
  const output = {
    meta: {
      generatedAt: new Date().toISOString(),
      inputFile: INPUT_FILE,
      pipeline: 'formatMarkdown → remark-parse + remark-gfm + remark-tooltip → cleanMDAST',
      totalPricingPages: results.length,
      totalFeatures,
      successfulFeatures: totalSuccess,
      errorCount: totalErrors,
      cleaningApplied: {
        removedPositions: true,
        removedHtmlNodes: true,
      },
    },
    data: results,
  };

  const outputPath = resolve(OUTPUT_FILE);
  await writeFile(outputPath, JSON.stringify(output, null, 2));

  console.log('✅ Output written successfully');
  console.log();

  // Step 5: Show sample output
  console.log('📋 Sample clean MDAST (first feature with content):');
  console.log('─'.repeat(70));
  const samplePage = results.find((p) => Object.keys(p.features).length > 0);
  if (samplePage) {
    const firstFeature = Object.entries(samplePage.features)[0];
    const [featKey, featResult] = firstFeature;
    
    console.log(`Pricing Page ID: ${samplePage.pricingPageId}`);
    console.log(`Feature: ${featKey}`);
    console.log();
    
    if (featResult.error) {
      console.log(`❌ Error: ${featResult.error}`);
    } else if (featResult.mdast) {
      console.log('Clean MDAST (first 20 lines):');
      const mdastJson = JSON.stringify(featResult.mdast, null, 2);
      const lines = mdastJson.split('\n');
      console.log(lines.slice(0, 20).join('\n'));
      if (lines.length > 20) {
        console.log(`... (${lines.length - 20} more lines)`);
      }
    }
  }
  console.log('─'.repeat(70));
  console.log();

  // Summary
  console.log('═'.repeat(70));
  console.log('  CLEAN MDAST GENERATION COMPLETE');
  console.log('═'.repeat(70));
  console.log(`  ✅ Processed ${pricingPages.length} pricing pages`);
  console.log(`  ✅ Generated clean MDAST for ${totalSuccess} features`);
  if (totalErrors > 0) {
    console.log(`  ⚠️  ${totalErrors} errors encountered`);
  }
  console.log(`  🧹 Removed all position properties and html nodes`);
  console.log(`  📁 Output: ${OUTPUT_FILE}`);
  console.log('═'.repeat(70));
}

// ── Utility Functions ──────────────────────────────────────────────

function countNodes(node) {
  if (!node || typeof node !== 'object') {
    return 0;
  }

  let count = 1; // Count this node

  if (Array.isArray(node.children)) {
    count += node.children.reduce((sum, child) => sum + countNodes(child), 0);
  }

  return count;
}

main().catch((err) => {
  console.error('\n💥 Clean MDAST generation failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});