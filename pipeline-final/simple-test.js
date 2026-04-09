/**
 * Simple test for the pipeline without emoji dependencies
 */

import { transformMarkdownToMdast } from './main.js';

async function simpleTest() {
  console.log('🚀 Testing Markdown to MDAST Pipeline\n');
  
  const testMarkdown = `# Sample Heading

This is **bold** text with *italic* and ~~strikethrough~~.

- List item 1
- List item 2 with [link](https://example.com)

> A blockquote with some content.

---

Final paragraph.`;

  console.log('Input markdown:');
  console.log(testMarkdown);
  console.log('\n' + '='.repeat(50) + '\n');

  try {
    const result = await transformMarkdownToMdast(testMarkdown);
    
    if (result.success) {
      console.log('✅ Pipeline Success!');
      console.log('\n📊 Metadata:');
      console.log(JSON.stringify(result.metadata, null, 2));
      
      console.log('\n🌳 Clean MDAST (first 1000 chars):');
      const mdastStr = JSON.stringify(result.mdast, null, 2);
      console.log(mdastStr.substring(0, 1000));
      if (mdastStr.length > 1000) {
        console.log('... (truncated)');
      }
      
      // Verify cleaning
      const hasPositions = mdastStr.includes('"position"');
      const hasHtml = mdastStr.includes('"type":"html"');
      
      console.log('\n🧹 Cleaning Verification:');
      console.log(`  Position properties removed: ${!hasPositions ? '✅' : '❌'}`);
      console.log(`  HTML nodes removed: ${!hasHtml ? '✅' : '❌'}`);
      
    } else {
      console.log('❌ Pipeline Failed!');
      console.log('Error:', result.error);
    }
    
  } catch (error) {
    console.error('💥 Test failed with exception:', error.message);
    console.error(error.stack);
  }
}

simpleTest();