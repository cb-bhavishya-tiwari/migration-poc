/**
 * HTML Comparison Tool: rawMD vs astMD
 *
 * Renders both rawMD and astMD versions to HTML and compares them.
 * Flags any features where the rendered HTML differs.
 *
 * This helps identify markdown patterns that don't survive AST conversion correctly.
 *
 * Usage:
 *   node compare_html_output.js
 *   node compare_html_output.js custom-input.json
 */

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkHtml from 'remark-html';
import { unified } from 'unified';

import { remarkTooltip } from '../plugins/remark-tooltip.js';

// ── Config ─────────────────────────────────────────────────────────
const INPUT_FILE = process.argv[2] || 'pricing_features_processed.json';
const OUTPUT_FILE = 'html_comparison_results.json';
const REPORT_FILE = 'html_comparison_report.md';

// ── HTML Renderer ──────────────────────────────────────────────────

function createHtmlProcessor() {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkTooltip)
    .use(remarkHtml, { sanitize: false });
}

async function renderToHtml(markdown, processor) {
  try {
    const result = await processor.process(markdown);
    return String(result).trim();
  } catch (error) {
    console.error(`Error rendering HTML: ${error.message}`);
    return null;
  }
}

// ── HTML Comparison ────────────────────────────────────────────────

function normalizeHtml(html) {
  if (!html) return '';
  
  // Normalize whitespace
  return html
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();
}

function compareHtml(rawHtml, astHtml) {
  const normalizedRaw = normalizeHtml(rawHtml);
  const normalizedAst = normalizeHtml(astHtml);
  
  return {
    identical: normalizedRaw === normalizedAst,
    rawLength: normalizedRaw.length,
    astLength: normalizedAst.length,
    lengthDiff: Math.abs(normalizedRaw.length - normalizedAst.length),
  };
}

// ── Feature Processing ─────────────────────────────────────────────

async function processFeature(featKey, featValue, processor) {
  const { rawMD, astMD } = featValue;
  
  if (!rawMD && !astMD) {
    return {
      feature: featKey,
      skipped: true,
      reason: 'Empty feature',
    };
  }
  
  // Render both to HTML
  const rawHtml = await renderToHtml(rawMD, processor);
  const astHtml = await renderToHtml(astMD, processor);
  
  // Compare HTML outputs
  const comparison = compareHtml(rawHtml, astHtml);
  
  return {
    feature: featKey,
    rawMD,
    astMD,
    rawHtml,
    astHtml,
    comparison,
    flagged: !comparison.identical,
  };
}

async function processPricingPage(pricingPage, processor) {
  const { pricingPageId, features } = pricingPage;
  
  const results = [];
  let flaggedCount = 0;
  
  for (const [featKey, featValue] of Object.entries(features)) {
    const result = await processFeature(featKey, featValue, processor);
    results.push(result);
    
    if (result.flagged) {
      flaggedCount++;
    }
  }
  
  return {
    pricingPageId,
    totalFeatures: results.length,
    flaggedFeatures: flaggedCount,
    results,
  };
}

// ── Report Generation ──────────────────────────────────────────────

function generateMarkdownReport(comparisonResults, summary) {
  let report = `# HTML Comparison Report: rawMD vs astMD

Generated: ${new Date().toISOString()}

## Summary

- **Total Pricing Pages**: ${summary.totalPricingPages}
- **Total Features**: ${summary.totalFeatures}
- **Flagged Features**: ${summary.flaggedFeatures} (${summary.flaggedPercentage}%)
- **Identical Features**: ${summary.identicalFeatures} (${summary.identicalPercentage}%)

`;

  if (summary.flaggedFeatures === 0) {
    report += `## ✅ All Features Identical!

All features rendered identically from both rawMD and astMD.
No issues detected - the AST conversion preserves markdown rendering perfectly.

`;
  } else {
    report += `## ⚠️ Flagged Features

The following features have differences between rawMD and astMD HTML rendering:

`;

    let flagNumber = 1;
    for (const pageResult of comparisonResults) {
      const flaggedResults = pageResult.results.filter(r => r.flagged);
      
      if (flaggedResults.length > 0) {
        report += `### Pricing Page: \`${pageResult.pricingPageId}\`

`;
        
        for (const result of flaggedResults) {
          report += `#### ${flagNumber}. Feature: \`${result.feature}\`

**Comparison**:
- Raw HTML length: ${result.comparison.rawLength} chars
- AST HTML length: ${result.comparison.astLength} chars
- Difference: ${result.comparison.lengthDiff} chars

**Raw Markdown**:
\`\`\`markdown
${result.rawMD.substring(0, 300)}${result.rawMD.length > 300 ? '...' : ''}
\`\`\`

**AST Markdown**:
\`\`\`markdown
${result.astMD.substring(0, 300)}${result.astMD.length > 300 ? '...' : ''}
\`\`\`

**Raw HTML** (first 400 chars):
\`\`\`html
${result.rawHtml.substring(0, 400)}${result.rawHtml.length > 400 ? '...' : ''}
\`\`\`

**AST HTML** (first 400 chars):
\`\`\`html
${result.astHtml.substring(0, 400)}${result.astHtml.length > 400 ? '...' : ''}
\`\`\`

---

`;
          flagNumber++;
        }
      }
    }
  }
  
  return report;
}

// ── Main Pipeline ──────────────────────────────────────────────────

async function main() {
  console.log('═'.repeat(60));
  console.log('  HTML COMPARISON: rawMD vs astMD');
  console.log('═'.repeat(60));
  console.log();

  // Step 1: Read input JSON
  console.log(`📄 Reading input file: ${INPUT_FILE}`);
  const inputPath = resolve(INPUT_FILE);
  const raw = await readFile(inputPath, 'utf-8');
  const input = JSON.parse(raw);
  const pricingPages = input.data || input;

  console.log(`✅ Loaded ${pricingPages.length} pricing pages`);
  console.log();

  // Step 2: Create HTML processor
  console.log('⚙️  Creating HTML renderer...');
  const processor = createHtmlProcessor();
  console.log('✅ Renderer ready');
  console.log();

  // Step 3: Process all pricing pages
  console.log('🔄 Processing features and comparing HTML...');
  const comparisonResults = [];
  let totalFeatures = 0;
  let flaggedFeatures = 0;

  for (let i = 0; i < pricingPages.length; i++) {
    const page = pricingPages[i];
    const featureCount = Object.keys(page.features || {}).length;
    
    if (featureCount === 0) {
      continue;
    }

    console.log(
      `  [${i + 1}/${pricingPages.length}] Processing ${page.pricingPageId} (${featureCount} features)`
    );

    const result = await processPricingPage(page, processor);
    comparisonResults.push(result);
    
    totalFeatures += result.totalFeatures;
    flaggedFeatures += result.flaggedFeatures;
    
    if (result.flaggedFeatures > 0) {
      console.log(`    ⚠️  ${result.flaggedFeatures} features flagged`);
    }
  }

  console.log();
  console.log('✅ Processing complete');
  console.log(`   Total features: ${totalFeatures}`);
  console.log(`   Flagged features: ${flaggedFeatures}`);
  console.log(`   Identical features: ${totalFeatures - flaggedFeatures}`);
  console.log();

  // Step 4: Calculate summary
  const summary = {
    totalPricingPages: comparisonResults.length,
    totalFeatures,
    flaggedFeatures,
    identicalFeatures: totalFeatures - flaggedFeatures,
    flaggedPercentage: ((flaggedFeatures / totalFeatures) * 100).toFixed(2),
    identicalPercentage: (((totalFeatures - flaggedFeatures) / totalFeatures) * 100).toFixed(2),
  };

  // Step 5: Write JSON output
  console.log(`💾 Writing results to: ${OUTPUT_FILE}`);
  const output = {
    meta: {
      generatedAt: new Date().toISOString(),
      inputFile: INPUT_FILE,
      ...summary,
    },
    results: comparisonResults,
  };

  const outputPath = resolve(OUTPUT_FILE);
  await writeFile(outputPath, JSON.stringify(output, null, 2));
  console.log('✅ JSON output written');
  console.log();

  // Step 6: Generate markdown report
  console.log(`📝 Generating markdown report: ${REPORT_FILE}`);
  const report = generateMarkdownReport(comparisonResults, summary);
  const reportPath = resolve(REPORT_FILE);
  await writeFile(reportPath, report);
  console.log('✅ Report written');
  console.log();

  // Summary
  console.log('═'.repeat(60));
  console.log('  COMPARISON COMPLETE');
  console.log('═'.repeat(60));
  console.log(`  ✅ Processed ${totalFeatures} features`);
  console.log(`  ${flaggedFeatures > 0 ? '⚠️' : '✅'}  ${flaggedFeatures} features flagged`);
  console.log(`  ✅ ${totalFeatures - flaggedFeatures} features identical`);
  console.log();
  console.log(`  📁 Results: ${OUTPUT_FILE}`);
  console.log(`  📄 Report: ${REPORT_FILE}`);
  console.log('═'.repeat(60));
}

main().catch((err) => {
  console.error('\n💥 Comparison failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
