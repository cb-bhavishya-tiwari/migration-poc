/**
 * Test file for the Markdown to MDAST Pipeline
 * 
 * Run with: node test.js
 */

import {
  transformMarkdownToMdast,
  transformMarkdownBatch,
  transformDatabaseRecords,
  getBatchStatistics,
  SECURITY_CONFIG,
  PERFORMANCE_CONFIG,
  DEFAULT_CONFIG
} from './main.js';

// ── Test Data ──────────────────────────────────────────────────────

const testMarkdowns = [
  // Simple markdown
  "# Hello World\n\nThis is **bold** text.",
  
  // Complex markdown with various elements
  `# Feature List

## What's Included

✅ **Premium Features:**
- Advanced analytics
- Priority support
- Custom integrations

> **Note:** All features include 24/7 support.

---

### Pricing Tiers

1. **Basic** - $10/month
2. **Pro** - $25/month  
3. **Enterprise** - Contact us

[Learn more](https://example.com) about our pricing.

![Logo](https://example.com/logo.png)`,

  // Markdown with HTML (should be cleaned)
  `# Test HTML Cleaning

<abbr title="HyperText Markup Language">HTML</abbr> should be removed.

<script>alert('xss')</script>

Regular **markdown** should remain.`,

  // Empty markdown
  "",
  
  // Markdown with emojis
  "# Emoji Test :rocket: :fire:\n\nHello :wave: World :earth_americas:",
  
  // Invalid input (null)
  null
];

const testDatabaseRecords = [
  {
    id: 'record_1',
    title: 'Product A',
    markdown: '# Product A\n\n**Features:** Advanced analytics and reporting.',
    created_at: '2024-01-01'
  },
  {
    id: 'record_2', 
    title: 'Product B',
    markdown: '## Product B Benefits\n\n- Real-time data\n- Custom dashboards\n- API access',
    created_at: '2024-01-02'
  },
  {
    id: 'record_3',
    title: 'Product C',
    markdown: '', // Empty markdown
    created_at: '2024-01-03'
  }
];

// ── Test Functions ─────────────────────────────────────────────────

async function testSingleTransformation() {
  console.log('🧪 Testing Single Transformation');
  console.log('=' .repeat(50));
  
  const markdown = "# Test Heading\n\nThis is **bold** and *italic* text with ~~strikethrough~~.";
  
  console.log('Input markdown:');
  console.log(markdown);
  console.log();
  
  const result = await transformMarkdownToMdast(markdown);
  
  if (result.success) {
    console.log('✅ Success!');
    console.log('📊 Metadata:', result.metadata);
    console.log('🌳 MDAST Preview:');
    console.log(JSON.stringify(result.mdast, null, 2).substring(0, 300) + '...');
  } else {
    console.log('❌ Failed:', result.error);
  }
  
  console.log('\n');
}

async function testBatchProcessing() {
  console.log('🧪 Testing Batch Processing');
  console.log('=' .repeat(50));
  
  console.log(`Processing ${testMarkdowns.length} markdown strings...`);
  
  const results = await transformMarkdownBatch(testMarkdowns);
  const stats = getBatchStatistics(results);
  
  console.log('📊 Batch Statistics:');
  console.log(`  Total: ${stats.total}`);
  console.log(`  Successful: ${stats.successful}`);
  console.log(`  Failed: ${stats.failed}`);
  console.log(`  Success Rate: ${stats.successRate.toFixed(1)}%`);
  console.log(`  Average Nodes: ${stats.averageNodes.toFixed(1)}`);
  
  if (stats.failed > 0) {
    console.log('  Errors by stage:', stats.errors);
  }
  
  console.log('\n📝 Individual Results:');
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    const info = result.success 
      ? `${result.metadata.nodeCount} nodes`
      : result.error.message;
    console.log(`  ${index + 1}. ${status} ${info}`);
  });
  
  console.log('\n');
}

async function testDatabaseProcessing() {
  console.log('🧪 Testing Database Records Processing');
  console.log('=' .repeat(50));
  
  console.log(`Processing ${testDatabaseRecords.length} database records...`);
  
  const results = await transformDatabaseRecords(testDatabaseRecords);
  
  console.log('📊 Results:');
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const recordId = result.recordId;
    const info = result.success
      ? `${result.metadata.nodeCount} nodes`
      : result.error.message;
    
    console.log(`  ${recordId}: ${status} ${info}`);
  });
  
  console.log('\n');
}

async function testDifferentConfigurations() {
  console.log('🧪 Testing Different Configurations');
  console.log('=' .repeat(50));
  
  const testMarkdown = `# Test Config

<abbr title="Test">HTML</abbr> content here.

**Bold** text with :rocket: emoji.`;

  console.log('Input markdown:');
  console.log(testMarkdown);
  console.log();
  
  // Test with different configs
  const configs = [
    { name: 'Default', config: DEFAULT_CONFIG },
    { name: 'Security', config: SECURITY_CONFIG },
    { name: 'Performance', config: PERFORMANCE_CONFIG }
  ];
  
  for (const { name, config } of configs) {
    console.log(`Testing ${name} Configuration:`);
    
    const result = await transformMarkdownToMdast(testMarkdown, config);
    
    if (result.success) {
      console.log(`  ✅ Success - ${result.metadata.nodeCount} nodes`);
      
      // Check if HTML was cleaned
      const hasHtml = JSON.stringify(result.mdast).includes('"type":"html"');
      console.log(`  🧹 HTML cleaned: ${!hasHtml ? 'Yes' : 'No'}`);
      
      // Check if positions were removed
      const hasPositions = JSON.stringify(result.mdast).includes('"position"');
      console.log(`  📍 Positions removed: ${!hasPositions ? 'Yes' : 'No'}`);
    } else {
      console.log(`  ❌ Failed: ${result.error.message}`);
    }
    
    console.log();
  }
}

async function testErrorHandling() {
  console.log('🧪 Testing Error Handling');
  console.log('=' .repeat(50));
  
  const invalidInputs = [
    { name: 'null input', value: null },
    { name: 'undefined input', value: undefined },
    { name: 'number input', value: 123 },
    { name: 'object input', value: { markdown: 'test' } },
    { name: 'array input', value: ['test'] }
  ];
  
  for (const { name, value } of invalidInputs) {
    console.log(`Testing ${name}:`);
    
    const result = await transformMarkdownToMdast(value);
    
    if (result.success) {
      console.log(`  ✅ Handled gracefully`);
    } else {
      console.log(`  ❌ Error (expected): ${result.error.message}`);
    }
  }
  
  console.log('\n');
}

// ── Main Test Runner ───────────────────────────────────────────────

async function runAllTests() {
  console.log('🚀 Markdown to MDAST Pipeline Tests');
  console.log('=' .repeat(60));
  console.log();
  
  try {
    await testSingleTransformation();
    await testBatchProcessing();
    await testDatabaseProcessing();
    await testDifferentConfigurations();
    await testErrorHandling();
    
    console.log('🎉 All tests completed!');
    
  } catch (error) {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}