/**
 * Demo: Markdown to MDAST Pipeline
 * 
 * Demonstrates the main transformMarkdownToMdast function with real-world examples
 */

import { transformMarkdownToMdast, SECURITY_CONFIG } from './main.js';

// ── Demo Data ──────────────────────────────────────────────────────

const demoMarkdowns = [
  {
    name: "Simple Feature List",
    markdown: `# What's included

✅ **Basic Membership**

✅ Point of Sale (Quick App & Full App)

✅ Portals for Borrower, Broker, & LO

---

💸 **Add Ons** (Any 2 Monthly Add Ons Included)

➕ Lender MarketPlace

➕ Loan Servicing`
  },
  
  {
    name: "Complex Pricing Page",
    markdown: `# Premium Plan Features

## Core Features

- **Advanced Analytics** - Real-time insights
- **Priority Support** - 24/7 dedicated team  
- **Custom Integrations** - API access included

> **Note:** All features include unlimited usage

### Pricing Tiers

1. **Starter** - $29/month
2. **Professional** - $99/month
3. **Enterprise** - [Contact us](mailto:sales@example.com)

---

![Premium Badge](https://example.com/premium.png)

*Upgrade today and save 20%!*`
  },

  {
    name: "HTML Content (Security Test)",
    markdown: `# Security Test

<abbr title="This should be removed">Hover text</abbr>

<script>alert('This is dangerous')</script>

Regular **markdown** should remain.

<div class="custom">This HTML will be cleaned</div>`
  },

  {
    name: "Empty Content",
    markdown: ""
  },

  {
    name: "Database-style Content",
    markdown: `Product Features
===============

**Core Benefits:**
- Real-time synchronization
- Advanced reporting dashboard  
- Multi-user collaboration

__Legacy bold formatting__ should be converted.

Contact support at: support@company.com`
  }
];

// ── Demo Functions ─────────────────────────────────────────────────

async function demonstratePipeline() {
  console.log('🚀 Markdown to MDAST Pipeline Demonstration');
  console.log('=' .repeat(60));
  console.log();

  for (let i = 0; i < demoMarkdowns.length; i++) {
    const { name, markdown } = demoMarkdowns[i];
    
    console.log(`📝 Demo ${i + 1}: ${name}`);
    console.log('-'.repeat(40));
    
    console.log('Input markdown:');
    if (markdown.trim()) {
      console.log(markdown.substring(0, 200) + (markdown.length > 200 ? '...' : ''));
    } else {
      console.log('(empty string)');
    }
    console.log();
    
    // Transform with security config for safety
    const result = await transformMarkdownToMdast(markdown, SECURITY_CONFIG);
    
    if (result.success) {
      console.log('✅ Transformation successful!');
      console.log(`📊 Generated ${result.metadata.nodeCount} MDAST nodes`);
      console.log(`📏 Input: ${result.metadata.inputLength} chars → Processed: ${result.metadata.processedLength} chars`);
      
      // Show node type distribution
      if (result.metadata.validation) {
        const nodeTypes = result.metadata.validation.nodeTypes;
        const topTypes = Object.entries(nodeTypes)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([type, count]) => `${type}(${count})`)
          .join(', ');
        console.log(`🏗️  Top node types: ${topTypes}`);
      }
      
      // Security verification
      const mdastStr = JSON.stringify(result.mdast);
      const hasHtml = mdastStr.includes('"type":"html"');
      const hasPositions = mdastStr.includes('"position"');
      
      console.log(`🔒 Security: HTML removed(${!hasHtml ? '✅' : '❌'}), Positions removed(${!hasPositions ? '✅' : '❌'})`);
      
      // Show sample MDAST structure
      if (result.mdast.children && result.mdast.children.length > 0) {
        const firstChild = result.mdast.children[0];
        console.log(`🌳 First node: ${firstChild.type}${firstChild.depth ? ` (depth: ${firstChild.depth})` : ''}`);
      }
      
    } else {
      console.log('❌ Transformation failed!');
      console.log(`🚨 Error in ${result.error.stage}: ${result.error.message}`);
    }
    
    console.log();
  }
}

async function demonstrateRealWorldUsage() {
  console.log('💼 Real-World Usage Example');
  console.log('=' .repeat(60));
  console.log();
  
  // Simulate database record
  const dbRecord = {
    id: 'product_123',
    name: 'Premium Software Package',
    markdown_content: `# Premium Software Package

## What's Included

✅ **Core Features:**
- Advanced reporting dashboard
- Real-time data synchronization  
- Multi-user collaboration tools

✅ **Support & Training:**
- 24/7 priority support
- Onboarding assistance
- Training materials

> **Special Offer:** Sign up this month and get 3 months free!

---

### Pricing

| Plan | Price | Features |
|------|-------|----------|
| Basic | $29/mo | Core features |
| Pro | $99/mo | Everything + Priority support |

[Get started today](https://example.com/signup)`
  };
  
  console.log('📋 Processing database record:');
  console.log(`   ID: ${dbRecord.id}`);
  console.log(`   Name: ${dbRecord.name}`);
  console.log(`   Content length: ${dbRecord.markdown_content.length} characters`);
  console.log();
  
  // Transform the content
  const result = await transformMarkdownToMdast(dbRecord.markdown_content);
  
  if (result.success) {
    console.log('✅ Database record processed successfully!');
    console.log();
    
    // This is what you would save back to the database
    const mdastForDatabase = {
      id: dbRecord.id,
      name: dbRecord.name,
      mdast_content: JSON.stringify(result.mdast),
      processed_at: result.metadata.processedAt,
      node_count: result.metadata.nodeCount,
      original_length: result.metadata.inputLength
    };
    
    console.log('💾 Ready for database storage:');
    console.log(`   MDAST size: ${mdastForDatabase.mdast_content.length} characters`);
    console.log(`   Node count: ${mdastForDatabase.node_count}`);
    console.log(`   Processed at: ${mdastForDatabase.processed_at}`);
    console.log();
    
    // Show what the MDAST structure looks like
    console.log('🌳 MDAST structure preview:');
    const preview = JSON.stringify(result.mdast, null, 2).substring(0, 500);
    console.log(preview + '...');
    
  } else {
    console.log('❌ Failed to process database record');
    console.log(`Error: ${result.error.message}`);
  }
}

// ── Main Demo Runner ───────────────────────────────────────────────

async function runDemo() {
  try {
    await demonstratePipeline();
    await demonstrateRealWorldUsage();
    
    console.log('🎉 Demo completed successfully!');
    console.log();
    console.log('💡 Next steps:');
    console.log('   1. Integrate transformMarkdownToMdast() into your application');
    console.log('   2. Use SECURITY_CONFIG for production environments');
    console.log('   3. Store the result.mdast in your database');
    console.log('   4. Use the clean MDAST for safe HTML rendering');
    
  } catch (error) {
    console.error('💥 Demo failed:', error);
  }
}

// Run demo
runDemo();