/**
 * Example Usage: Simple function that takes raw markdown and returns MDAST JSON
 * 
 * This demonstrates the exact use case requested:
 * - Input: Raw unprocessed markdown string from database
 * - Output: Clean MDAST JSON
 */

import { transformMarkdownToMdast } from './main.js';

/**
 * Simple wrapper function that takes raw markdown and returns clean MDAST
 * @param {string} rawMarkdown - Raw markdown string from database
 * @returns {Promise<Object|null>} - Clean MDAST JSON or null if failed
 */
async function markdownToMdast(rawMarkdown) {
  const result = await transformMarkdownToMdast(rawMarkdown);
  
  if (result.success) {
    return result.mdast;
  } else {
    console.error('Failed to convert markdown to MDAST:', result.error);
    return null;
  }
}

// ── Example Usage ──────────────────────────────────────────────────

async function example() {
  console.log('📝 Simple Markdown to MDAST Example\n');
  
  // Raw markdown string from database
  const rawMarkdown = `# Product Features

**What's included:**

- Advanced analytics dashboard
- Real-time data sync
- 24/7 priority support

> Special offer: Get 30% off this month!

[Learn more](https://example.com)`;

  console.log('Input (raw markdown from database):');
  console.log(rawMarkdown);
  console.log('\n' + '='.repeat(50) + '\n');

  // Convert to MDAST
  const mdast = await markdownToMdast(rawMarkdown);
  
  if (mdast) {
    console.log('Output (clean MDAST JSON):');
    console.log(JSON.stringify(mdast, null, 2));
    
    console.log('\n✅ Success! You can now:');
    console.log('   1. Store this MDAST JSON in your database');
    console.log('   2. Use it to render HTML safely');
    console.log('   3. Transform it to other formats');
  } else {
    console.log('❌ Failed to convert markdown to MDAST');
  }
}

// Run example
example();

// Export the simple function for use in other files
export { markdownToMdast };