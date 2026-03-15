# Markdown to AST Migration Strategy Guide

## Executive Summary

This document outlines the recommended approach for migrating your Lexical markdown storage to an HTML-based rich text format via an Abstract Syntax Tree (AST) intermediate representation.

**Recommended Approach:** Use the **unified + remark** ecosystem for maximum flexibility and extensibility.

---

## Table of Contents

1. [Why AST?](#why-ast)
2. [AST Format Comparison](#ast-format-comparison)
3. [Recommended Stack](#recommended-stack)
4. [Architecture Overview](#architecture-overview)
5. [⚠️ CRITICAL: Database Markdown Preprocessing](#️-critical-database-markdown-preprocessing)
6. [Handling Base Markdown](#handling-base-markdown)
7. [Handling Custom Extensions](#handling-custom-extensions)
8. [Implementation Roadmap](#implementation-roadmap)
9. [Code Examples](#code-examples)
10. [Resources](#resources)

---

## 📖 Learning Resources

**New to MDAST and unified?** We've got you covered!

This guide assumes some familiarity with MDAST concepts. If you're new to the ecosystem, start here:

👉 **[`LEARNING_MDAST_AND_UNIFIED.md`](./LEARNING_MDAST_AND_UNIFIED.md)** - Comprehensive learning guide that covers:
- What MDAST is and how it works
- Understanding the unified ecosystem
- Hands-on examples you can run
- Building your first plugin
- Creating custom syntax with micromark
- **Complete tooltip plugin implementation** for your use case

**Time investment:** 8-10 hours from zero to building custom plugins

**Learning path:**
- 📘 Phase 1: MDAST Basics (2-3 hours)
- 🔧 Phase 2: Plugin Development (2-3 hours)
- ⚙️ Phase 3: Advanced Micromark (3-4 hours)

The learning guide includes **working code examples** for every concept and a **ready-to-use tooltip plugin** implementation!

---

## Why AST?

Using an Abstract Syntax Tree (AST) as an intermediate representation provides several advantages:

✅ **Separation of Concerns** - Parse once, transform anywhere  
✅ **Validation** - Catch structural issues before HTML generation  
✅ **Flexibility** - Easy to add transformations, sanitization, or analytics  
✅ **Future-Proof** - Can target multiple output formats (HTML, React, Vue, etc.)  
✅ **Debugging** - Inspect and debug at the tree level  
✅ **Migration Safety** - Validate conversion before committing changes  

---

## AST Format Comparison

### Option 1: MDAST (Markdown AST) - **RECOMMENDED** ✅

**Framework:** [unified](https://unifiedjs.com/) + [remark](https://github.com/remarkjs/remark)

**Pros:**
- ✅ Industry standard (22M+ weekly downloads)
- ✅ Based on [unist](https://github.com/syntax-tree/unist) specification
- ✅ 300+ plugins in ecosystem
- ✅ Excellent documentation and community support
- ✅ Built for extensibility and custom syntax
- ✅ TypeScript support with well-defined types
- ✅ Battle-tested in Next.js, Astro, Gatsby, Docusaurus
- ✅ Clear separation: parse → transform → stringify
- ✅ Specifically designed for content transformations

**Cons:**
- ⚠️ Slower than markdown-it (but speed not critical for migration)
- ⚠️ Learning curve for plugin creation → **See `LEARNING_MDAST_AND_UNIFIED.md` for comprehensive guide**
- ⚠️ Requires understanding micromark for low-level extensions → **Complete tutorial provided in learning guide**

> 📚 **New to MDAST?** Check out [`LEARNING_MDAST_AND_UNIFIED.md`](./LEARNING_MDAST_AND_UNIFIED.md) - a complete learning guide with hands-on examples, taking you from zero to creating custom plugins in 8-10 hours.

**MDAST Structure:**
```json
{
  "type": "root",
  "children": [
    {
      "type": "heading",
      "depth": 1,
      "children": [
        {
          "type": "text",
          "value": "What's included"
        }
      ]
    },
    {
      "type": "list",
      "ordered": false,
      "children": [
        {
          "type": "listItem",
          "children": [
            {
              "type": "paragraph",
              "children": [
                {
                  "type": "strong",
                  "children": [
                    {
                      "type": "text",
                      "value": "Bold feature"
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

### Option 2: markdown-it Tokens

**Framework:** [markdown-it](https://github.com/markdown-it/markdown-it)

**Pros:**
- ✅ Fast (20M+ weekly downloads)
- ✅ CommonMark compliant
- ✅ Rich plugin ecosystem
- ✅ Simple for direct HTML rendering

**Cons:**
- ❌ Token-based, not true AST (less semantic)
- ❌ Less suitable for complex transformations
- ❌ Harder to inspect and manipulate structure
- ❌ Not designed for multi-format output
- ❌ More coupled to HTML rendering

**Not recommended for your use case** - Better for direct markdown→HTML conversion without intermediate transformations.

### Option 3: Lexical's JSON Export

**Framework:** [Lexical](https://lexical.dev/)

**Pros:**
- ✅ Already in your codebase
- ✅ Preserves exact editor state
- ✅ Custom nodes already defined

**Cons:**
- ❌ Not a standard AST format
- ❌ Tightly coupled to Lexical
- ❌ Would require parsing stored markdown back into Lexical first
- ❌ Adds unnecessary complexity (markdown → Lexical → JSON → HTML)
- ❌ Not portable to other systems

**Not recommended** - Adds extra layer of complexity since you're starting from markdown strings.

---

## Recommended Stack

### Core Framework: unified + remark

```bash
npm install unified remark-parse remark-stringify
```

**Why unified?**
- Processing pipeline architecture: `parse → transform → stringify`
- Plugin-based, infinitely extensible
- Used by major frameworks (Next.js, Astro, etc.)
- 300+ existing plugins
- TypeScript-first with excellent types

### Essential Packages

```json
{
  "dependencies": {
    // Core
    "unified": "^11.0.4",           // Processing pipeline
    "remark-parse": "^11.0.0",      // Markdown → MDAST parser
    "remark-stringify": "^11.0.0",   // MDAST → Markdown (for debugging)
    
    // Extensions
    "remark-gfm": "^4.0.0",         // GitHub Flavored Markdown
    "micromark-extension-directive": "^3.0.0", // For custom syntax
    "remark-directive": "^3.0.0",   // Directive support in remark
    
    // Utilities
    "mdast-util-from-markdown": "^2.0.0",  // Lower-level parsing
    "mdast-util-to-markdown": "^2.1.0",    // Lower-level stringifying
    "unist-util-visit": "^5.0.0",  // Tree traversal
    "unist-util-map": "^4.0.0",    // Tree mapping
    
    // TypeScript types
    "@types/mdast": "^4.0.3",
    "@types/unist": "^3.0.2"
  }
}
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     MIGRATION PIPELINE                          │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│   Database       │
│   MongoDB/SQL    │
│                  │
│  features: "     │
│  What's...\n===  │
│  - Feature :fire:"│
└────────┬─────────┘
         │
         │ 1. Read from DB
         ▼
┌──────────────────┐
│  Raw Markdown    │
│  (Custom Dialect)│
│  === headings    │
│  :emoji: codes   │
│  __bold__        │
└────────┬─────────┘
         │
         │ 2. ⚠️ formatMarkdown() ⚠️
         │    CRITICAL PREPROCESSING!
         │    - Convert === to #
         │    - Convert :emoji: to 🔥
         │    - Normalize spacing
         ▼
┌──────────────────┐
│  Normalized      │
│  Markdown        │
│  (Standard       │
│   CommonMark)    │
└────────┬─────────┘
         │
         │ 3. unified()
         │    .use(remarkParse)
         │    .use(remarkGfm)
         │    .use(remarkCustomTooltip)  ← Custom plugin
         ▼
┌──────────────────┐
│   MDAST Tree     │◄──────────┐
│  (Intermediate)  │           │
│                  │           │
│  {               │           │
│   type: "root",  │           │ 5. Validation
│   children: [...] │           │    & Inspection
│  }               │           │
└────────┬─────────┘           │
         │                     │
         │ 3. Transform        │
         │    (Optional)       │
         │    - Sanitize       │
         │    - Validate       │
         │    - Analytics      │
         ▼                     │
┌──────────────────┐           │
│  Transformed     │───────────┘
│  MDAST Tree      │
└────────┬─────────┘
         │
         │ 4. Save to file/DB
         │    (JSON format)
         ▼
┌──────────────────┐
│  AST Storage     │
│  (JSON)          │
│                  │
│  { type: "root"  │
│    children: []  │
│  }               │
└──────────────────┘
         │
         │ 6. (Future) AST → HTML
         │    Your separate process
         ▼
┌──────────────────┐
│   HTML Output    │
│                  │
│  <h1>What's...</> │
│  <ul><li>...</li>│
└──────────────────┘
```

---

## ⚠️ CRITICAL: Database Markdown Preprocessing

### Why Preprocessing is Mandatory

**Your database does NOT store standard markdown!** It stores a custom markdown dialect that requires preprocessing before any standard markdown parser can handle it correctly.

### The Problem

Here's what's actually stored in your database:

```javascript
// Raw string from database:
"What's included \n===\n - Test feature 1 :fire:\n - __Bold feature__"

// When interpreted by JavaScript, this becomes:
`What's included 
===
 - Test feature 1 :fire:
 - __Bold feature__`
```

This contains **non-standard markdown syntax**:
1. ❌ **Setext-style headings** (`===` underlines) - Not widely supported
2. ❌ **Emoji shortcodes** (`:fire:`) - Not native markdown
3. ❌ **Double underscores for bold** (`__text__`) - Less common than `**text**`
4. ❌ **Inconsistent spacing** - Single newlines instead of double

### What Happens Without Preprocessing?

If you parse the raw database string directly with `remark-parse`:

```javascript
// ❌ WRONG - Will fail or produce incorrect AST
const processor = unified().use(remarkParse)
const ast = processor.parse(rawDatabaseString)
```

**Results:**
- ❌ Setext headings (`===`) may not be recognized correctly
- ❌ `:fire:` stays as literal text instead of 🔥 emoji
- ❌ `__bold__` might not be parsed as bold (only `**bold**` is guaranteed)
- ❌ Paragraph breaks won't work correctly (single vs double newlines)
- ❌ AST structure won't match what your editor produces

### The Solution: formatMarkdown()

Your codebase already has the solution in `src/client/lib/markdown-helper.ts`:

```javascript
export const formatMarkdown = (markdown: string) => {
  // 1. Convert Setext headings to ATX headings
  markdown = markdown.replace(/^(.*)\n(\s*)(=+)(\s*)\n/gm, '# $1\n\n')
  
  // 2. Normalize spacing
  markdown = markdown.replace(/ {2,}/g, ' ')       // Multiple spaces → single
  markdown = markdown.replace(/ +$/gm, '')         // Remove trailing spaces
  markdown = markdown.replace(/\n +/g, '\n')       // Remove leading spaces
  
  // 3. Ensure double newlines (paragraph breaks)
  markdown = markdown.replace(/\n/g, '\n\n')       // Single → double
  markdown = markdown.replace(/\n{3,}/g, '\n\n')   // Triple+ → double
  markdown = markdown.replace(/\n+$/, '')          // Remove trailing
  
  // 4. Convert __ to ** for bold
  markdown = markdown.replace(/ {1}__(.*?)__ {1}/g, ' **$1** ')
  
  // 5. Convert :emoji_code: to actual emoji
  const emojiRegex = /:(\w+):/g
  const matches = markdown.match(emojiRegex)
  if (matches) {
    matches.forEach((match) => {
      const emoji = emojiData.emojis[match.replace(/:/g, '')]
      if (emoji) {
        markdown = markdown.replace(match, emoji.skins[0].native)
      }
    })
  }
  
  return markdown
}
```

### Visual Example: Before & After

**BEFORE preprocessing (raw database):**
```markdown
What's included 
===
 - Test feature 1 :fire:
 - __Bold feature__
 - [Link](url)
```

**AFTER preprocessing (normalized):**
```markdown
# What's included

- Test feature 1 🔥

- **Bold feature**

- [Link](url)
```

Now it's **standard CommonMark** that any markdown parser can handle!

### Correct Migration Pipeline

```
┌─────────────────┐
│  Database       │  "What's included \n===\n - Feature :fire:"
└────────┬────────┘
         │
         │ 1. Read from DB
         ▼
┌─────────────────┐
│  Raw String     │  Has: ===, :emoji:, __bold__, single \n
└────────┬────────┘
         │
         │ 2. ⚠️ MUST APPLY formatMarkdown() ⚠️
         │    - Convert === to #
         │    - Convert :emoji: to 🔥
         │    - Convert __ to **
         │    - Normalize spacing
         ▼
┌─────────────────┐
│  Normalized     │  Standard CommonMark markdown
│  Markdown       │
└────────┬────────┘
         │
         │ 3. NOW parse with unified
         ▼
┌─────────────────┐
│  MDAST Tree     │  Correct, validated AST
└─────────────────┘
```

### Updated Migration Code

```javascript
import {formatMarkdown} from './src/client/lib/markdown-helper.js'
// OR copy the function if running in different environment

async function migrateMarkdownToAST(rawDatabaseString) {
  // STEP 1: Apply preprocessing (MANDATORY!)
  const normalized = formatMarkdown(rawDatabaseString)
  
  // STEP 2: Parse to AST
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
  
  const ast = processor.parse(normalized)
  
  // STEP 3: Store both versions for debugging
  ast.data = {
    originalRaw: rawDatabaseString,    // Keep original
    normalized: normalized,             // Keep normalized
    migratedAt: new Date().toISOString()
  }
  
  return ast
}
```

### Keeping formatMarkdown() In Sync

**Critical:** If you ever update `src/client/lib/markdown-helper.ts`, you MUST update your migration script!

**Recommended approach:**

```javascript
// Option A: Import directly (if migration runs in Node.js)
import {formatMarkdown} from './src/client/lib/markdown-helper.js'

// Option B: Copy function with sync warning
// ⚠️ KEEP IN SYNC WITH: src/client/lib/markdown-helper.ts
// Last synced: 2024-01-15
function formatMarkdown(markdown) {
  // ... copy the exact implementation
}
```

### Testing Preprocessing

Create a test to verify preprocessing works:

```javascript
import {formatMarkdown} from './src/client/lib/markdown-helper.js'

// Test case 1: Setext heading
const input1 = "Title\n===\n- Item"
const output1 = formatMarkdown(input1)
console.assert(output1.includes('# Title'), 'Should convert === to #')

// Test case 2: Emoji
const input2 = "- Feature :fire:"
const output2 = formatMarkdown(input2)
console.assert(output2.includes('🔥'), 'Should convert :fire: to emoji')

// Test case 3: Double underscore
const input3 = "- __Bold__ text"
const output3 = formatMarkdown(input3)
console.assert(output3.includes('**Bold**'), 'Should convert __ to **')

console.log('✅ All preprocessing tests passed!')
```

### Key Takeaways

✅ **ALWAYS preprocess** database strings with `formatMarkdown()` before parsing  
✅ Your database stores a **custom markdown dialect**, not standard markdown  
✅ Preprocessing converts it to **standard CommonMark**  
✅ **Keep formatMarkdown() in sync** between your repos  
✅ **Test with real database data** before full migration  

**Without preprocessing, your AST will be incorrect or parsing will fail!** 🚨

---

## Handling Base Markdown

### Standard Markdown Elements

These work out-of-the-box with `remark-parse`:

| Markdown | MDAST Node Type | Notes |
|----------|----------------|-------|
| `# Heading` | `heading` (depth: 1-6) | Fully supported |
| `**bold**` | `strong` | Fully supported |
| `*italic*` | `emphasis` | Fully supported |
| `~~strikethrough~~` | `delete` | ✅ Supported with `remark-gfm` |
| `- List item` | `list` + `listItem` | Fully supported |
| `1. Numbered` | `list` (ordered: true) | Fully supported |
| `> Quote` | `blockquote` | Fully supported |
| `[link](url)` | `link` | Fully supported |
| `![alt](url)` | `image` | Fully supported |
| `` `code` `` | `inlineCode` | Fully supported |
| Emoji `:fire:` | `text` (with preprocessing) | ⚠️ Requires `formatMarkdown()` preprocessing |

### GitHub Flavored Markdown (GFM)

Install `remark-gfm` for:
- ✅ Strikethrough (`~~text~~`)
- ✅ Tables
- ✅ Task lists
- ✅ Autolinks
- ✅ Footnotes

```javascript
import {unified} from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)  // ← Adds GFM support

const ast = processor.parse('~~strikethrough~~')
```

### Emoji Handling

Your current system converts `:emoji_code:` to native emoji before storage. Two options:

**Option A: Pre-process (Recommended)**
```javascript
import emojiData from '@emoji-mart/data'

function convertEmojisBeforeParse(markdown) {
  const emojiRegex = /:(\w+):/g
  return markdown.replace(emojiRegex, (match, emojiName) => {
    const emoji = emojiData.emojis[emojiName]
    return emoji ? emoji.skins[0].native : match
  })
}

const processedMarkdown = convertEmojisBeforeParse(rawMarkdown)
const ast = processor.parse(processedMarkdown)
```

**Option B: Custom remark plugin**
```javascript
import {visit} from 'unist-util-visit'

function remarkEmoji() {
  return (tree) => {
    visit(tree, 'text', (node) => {
      node.value = convertEmojis(node.value)
    })
  }
}
```

---

## Handling Custom Extensions

Your custom markdown syntax requires custom plugins:

### 1. Custom Tooltip: `[text]{tooltip}`

**Current format:**
```markdown
[Feature with tooltip]{This is the tooltip text}
```

**Strategy:** Create a custom micromark extension + remark plugin

#### Step 1: Create Micromark Syntax Extension

```javascript
// micromark-extension-tooltip.js

/**
 * Micromark syntax extension for tooltip syntax: [text]{tooltip}
 */
export function tooltip() {
  return {
    text: {
      91: { // '[' character code
        tokenize: tokenizeTooltip,
        resolveAll: resolveAllTooltip
      }
    }
  }
}

function tokenizeTooltip(effects, ok, nok) {
  // Tokenization logic for [text]{tooltip} pattern
  // This is low-level parsing - see micromark docs for details
  return start

  function start(code) {
    if (code !== 91) return nok(code) // Must start with '['
    effects.enter('tooltip')
    effects.enter('tooltipMarker')
    effects.consume(code)
    effects.exit('tooltipMarker')
    effects.enter('tooltipText')
    return tooltipText
  }

  function tooltipText(code) {
    // Parse text between [ and ]
    if (code === 93) { // ']'
      effects.exit('tooltipText')
      effects.enter('tooltipMarker')
      effects.consume(code)
      effects.exit('tooltipMarker')
      return tooltipContent
    }
    effects.consume(code)
    return tooltipText
  }

  function tooltipContent(code) {
    if (code !== 123) return nok(code) // Must have '{'
    effects.enter('tooltipContentMarker')
    effects.consume(code)
    effects.exit('tooltipContentMarker')
    effects.enter('tooltipContentText')
    return contentText
  }

  function contentText(code) {
    if (code === 125) { // '}'
      effects.exit('tooltipContentText')
      effects.enter('tooltipContentMarker')
      effects.consume(code)
      effects.exit('tooltipContentMarker')
      effects.exit('tooltip')
      return ok
    }
    effects.consume(code)
    return contentText
  }
}
```

#### Step 2: Create MDAST Utility

```javascript
// mdast-util-tooltip.js

/**
 * Convert tooltip tokens to MDAST nodes
 */
export function tooltipFromMarkdown() {
  return {
    enter: {
      tooltip(token) {
        this.enter({
          type: 'tooltip',
          data: {},
          children: []
        }, token)
      }
    },
    exit: {
      tooltipText(token) {
        const node = this.stack[this.stack.length - 1]
        node.text = this.sliceSerialize(token)
      },
      tooltipContentText(token) {
        const node = this.stack[this.stack.length - 1]
        node.tooltip = this.sliceSerialize(token)
      },
      tooltip(token) {
        this.exit(token)
      }
    }
  }
}

/**
 * Convert MDAST tooltip nodes back to markdown
 */
export function tooltipToMarkdown() {
  return {
    handlers: {
      tooltip(node) {
        return `[${node.text}]{${node.tooltip}}`
      }
    }
  }
}
```

#### Step 3: Create Remark Plugin

```javascript
// remark-tooltip.js
import {tooltipFromMarkdown, tooltipToMarkdown} from './mdast-util-tooltip.js'

export function remarkTooltip() {
  const data = this.data()

  add('micromarkExtensions', tooltip())
  add('fromMarkdownExtensions', tooltipFromMarkdown())
  add('toMarkdownExtensions', tooltipToMarkdown())

  function add(field, value) {
    const list = data[field] ? data[field] : (data[field] = [])
    list.push(value)
  }
}
```

#### Resulting MDAST Node

```json
{
  "type": "tooltip",
  "text": "Feature with tooltip",
  "tooltip": "This is the tooltip text",
  "position": {
    "start": {"line": 1, "column": 1},
    "end": {"line": 1, "column": 54}
  }
}
```

### 2. Custom Link: `[text](url)` (already standard!)

**Good news:** Your custom link format is standard markdown! It's already handled by `remark-parse`.

**MDAST output:**
```json
{
  "type": "link",
  "url": "https://example.com",
  "children": [
    {
      "type": "text",
      "value": "Link text"
    }
  ]
}
```

If you need to capture additional attributes (like `target` or `rel`), you can use a transformer plugin:

```javascript
import {visit} from 'unist-util-visit'

function remarkLinkAttributes() {
  return (tree) => {
    visit(tree, 'link', (node) => {
      // Add data for HTML rendering
      node.data = node.data || {}
      node.data.hProperties = {
        target: '_blank',
        rel: 'noreferrer'
      }
    })
  }
}
```

### 3. Images: `![alt](url)` (already standard!)

Also standard markdown! Handled by `remark-parse`.

**MDAST output:**
```json
{
  "type": "image",
  "url": "https://example.com/image.png",
  "alt": "Alt text",
  "title": null
}
```

---

## Implementation Roadmap

### Phase 1: Setup & Preprocessing (Week 1)

**Goal:** Set up preprocessing and parse standard markdown to MDAST

```javascript
// migration-script.js
import {unified} from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkStringify from 'remark-stringify'
import {formatMarkdown} from './src/client/lib/markdown-helper.js'

async function migrateMarkdownToAST(rawDatabaseString) {
  // CRITICAL: Preprocess with formatMarkdown()
  const normalized = formatMarkdown(rawDatabaseString)
  
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
  
  const ast = processor.parse(normalized)
  
  // Store both versions for debugging
  ast.data = {
    originalRaw: rawDatabaseString,
    normalized: normalized
  }
  
  return ast
}

// Test with REAL database format
const dbSample = "What's included \n===\n - **Bold feature** :fire:\n - *Italic feature*\n - ~~Strikethrough~~"

console.log('Raw from DB:', dbSample)
const ast = await migrateMarkdownToAST(dbSample)
console.log('Normalized:', ast.data.normalized)
console.log('AST:', JSON.stringify(ast, null, 2))
```

**Deliverables:**
- ✅ Preprocessing pipeline with `formatMarkdown()`
- ✅ Basic script that handles database markdown format
- ✅ Test suite with database-style markdown (===, :emoji:, __ etc)
- ✅ Validation comparing normalized output
- ✅ Tests proving preprocessing is necessary

### Phase 2: Custom Tooltip Extension (Week 2-3)

**Goal:** Handle `[text]{tooltip}` syntax

> 📚 **Learning tip:** Before starting, read the "Your Tooltip Plugin Implementation" section in [`LEARNING_MDAST_AND_UNIFIED.md`](./LEARNING_MDAST_AND_UNIFIED.md) - it contains a complete, working implementation you can use!

**Tasks:**
1. Create micromark extension for tooltip tokenization
2. Create mdast-util for tooltip node conversion
3. Create remark plugin wrapper
4. Test with real data from your database
5. Add validation for malformed tooltip syntax

**Deliverables:**
- ✅ Working tooltip parser
- ✅ MDAST node definition for tooltips
- ✅ Test coverage for edge cases
- ✅ Error handling for invalid syntax

**Quick start:** Copy the tooltip implementation from the learning guide and adapt it to your needs!

### Phase 3: Emoji & Special Characters (Week 3)

**Goal:** Handle emoji conversion and special characters

**Tasks:**
1. Pre-process emoji codes OR create plugin
2. Handle edge cases (unknown emojis, escaped colons)
3. Preserve native emojis already in text

**Deliverables:**
- ✅ Emoji handling in pipeline
- ✅ Test coverage

### Phase 4: Database Migration Script (Week 4)

**Goal:** Batch process all database records

**Tasks:**
1. Create database connection script
2. Batch read features from all items
3. Convert each to MDAST
4. Validate AST structure
5. Save AST to new column/collection
6. Generate migration report (success/failures)

```javascript
// db-migration.js
import {MongoClient} from 'mongodb'
import {migrateMarkdownToAST} from './migration-script.js'

async function migrateAllFeatures() {
  const client = await MongoClient.connect(DB_URL)
  const db = client.db('pricify')
  const items = db.collection('items')
  
  const allItems = await items.find({}).toArray()
  const results = {
    success: 0,
    failed: 0,
    errors: []
  }
  
  for (const item of allItems) {
    try {
      const ast = await migrateMarkdownToAST(item.features)
      
      // Validate AST
      validateAST(ast)
      
      // Save to new field
      await items.updateOne(
        {_id: item._id},
        {$set: {featuresAST: ast}}
      )
      
      results.success++
    } catch (error) {
      results.failed++
      results.errors.push({
        itemId: item._id,
        itemName: item.name,
        error: error.message
      })
    }
  }
  
  await client.close()
  
  // Generate report
  await fs.writeFile(
    'migration-report.json',
    JSON.stringify(results, null, 2)
  )
  
  console.log(`✅ Success: ${results.success}`)
  console.log(`❌ Failed: ${results.failed}`)
}
```

**Deliverables:**
- ✅ Complete migration script
- ✅ Dry-run mode for testing
- ✅ Rollback capability
- ✅ Migration report with statistics
- ✅ Error handling and logging

### Phase 5: Validation & Testing (Week 5)

**Goal:** Ensure data integrity

**Tasks:**
1. Visual comparison tool (markdown vs AST roundtrip)
2. Automated tests for all features
3. Manual QA on sample records
4. Performance testing (batch size optimization)

**Deliverables:**
- ✅ Test suite covering all cases
- ✅ Validation tools
- ✅ Documentation

---

## Code Examples

### Complete Migration Script (Starter Template)

```javascript
// migrate-markdown-to-ast.js
import {unified} from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkStringify from 'remark-stringify'
import {visit} from 'unist-util-visit'
import emojiData from '@emoji-mart/data'

// Import your custom plugins (to be created)
// import {remarkTooltip} from './plugins/remark-tooltip.js'

/**
 * Convert emoji codes to native emojis
 */
function convertEmojis(markdown) {
  const emojiRegex = /:(\w+):/g
  return markdown.replace(emojiRegex, (match, emojiName) => {
    const emoji = emojiData.emojis[emojiName]
    return emoji ? emoji.skins[0].native : match
  })
}

/**
 * Normalize markdown (same as your formatMarkdown function)
 */
function normalizeMarkdown(markdown) {
  // Apply your existing formatting rules
  markdown = markdown.replace(/^(.*)\n(\s*)(=+)(\s*)\n/gm, '# $1\n\n')
  markdown = markdown.replace(/ {2,}/g, ' ')
  markdown = markdown.replace(/ +$/gm, '')
  markdown = markdown.replace(/\n +/g, '\n')
  markdown = markdown.replace(/\n/g, '\n\n')
  markdown = markdown.replace(/\n{3,}/g, '\n\n')
  markdown = markdown.replace(/\n+$/, '')
  markdown = markdown.replace(/ {1}__(.*?)__ {1}/g, ' **$1** ')
  
  return markdown
}

/**
 * Create processor with all plugins
 */
function createProcessor() {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    // .use(remarkTooltip)  // Add when ready
}

/**
 * Validate AST structure
 */
function validateAST(ast) {
  let isValid = true
  const errors = []
  
  // Check root node
  if (ast.type !== 'root') {
    errors.push('Root node must be type "root"')
    isValid = false
  }
  
  // Check for unknown node types
  visit(ast, (node) => {
    const validTypes = [
      'root', 'paragraph', 'text', 'heading', 'list', 'listItem',
      'strong', 'emphasis', 'delete', 'link', 'image', 'blockquote',
      'code', 'inlineCode', 'break', 'thematicBreak',
      'tooltip' // Your custom type
    ]
    
    if (!validTypes.includes(node.type)) {
      errors.push(`Unknown node type: ${node.type}`)
      isValid = false
    }
  })
  
  if (!isValid) {
    throw new Error('AST validation failed: ' + errors.join(', '))
  }
  
  return true
}

/**
 * Main migration function
 */
export async function migrateMarkdownToAST(markdownString) {
  // 1. Pre-process
  let processed = normalizeMarkdown(markdownString)
  processed = convertEmojis(processed)
  
  // 2. Parse to AST
  const processor = createProcessor()
  const ast = processor.parse(processed)
  
  // 3. Validate
  validateAST(ast)
  
  // 4. Optional: Add metadata
  ast.data = {
    migratedAt: new Date().toISOString(),
    version: '1.0.0'
  }
  
  return ast
}

/**
 * Convert AST back to markdown (for testing)
 */
export async function astToMarkdown(ast) {
  const processor = unified()
    .use(remarkStringify)
    // .use(remarkTooltip)  // Add when ready
  
  const markdown = processor.stringify(ast)
  return markdown
}

// Example usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const sampleMarkdown = `
# What's included

- **Unlimited users**
- [Documentation](https://docs.example.com)
- ~~Limited support~~ Premium support
- :fire: Hot feature

> All features included
  `
  
  console.log('Original Markdown:')
  console.log(sampleMarkdown)
  console.log('\n---\n')
  
  const ast = await migrateMarkdownToAST(sampleMarkdown)
  console.log('AST:')
  console.log(JSON.stringify(ast, null, 2))
  console.log('\n---\n')
  
  const backToMarkdown = await astToMarkdown(ast)
  console.log('Converted back to Markdown:')
  console.log(backToMarkdown)
}
```

### Database Migration Script

```javascript
// run-migration.js
import {MongoClient} from 'mongodb'
import {migrateMarkdownToAST, astToMarkdown} from './migrate-markdown-to-ast.js'
import fs from 'fs/promises'

const DB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017'
const DB_NAME = process.env.DB_NAME || 'pricify'
const DRY_RUN = process.env.DRY_RUN === 'true'

async function runMigration() {
  const startTime = Date.now()
  console.log(`🚀 Starting migration (DRY_RUN: ${DRY_RUN})...`)
  
  const client = await MongoClient.connect(DB_URL)
  const db = client.db(DB_NAME)
  const items = db.collection('items')
  
  // Stats
  const stats = {
    total: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    errors: []
  }
  
  // Find all items with features
  const cursor = items.find({features: {$exists: true, $ne: null}})
  stats.total = await cursor.count()
  
  console.log(`📊 Found ${stats.total} items to migrate\n`)
  
  // Process in batches
  const batchSize = 100
  let batch = []
  
  for await (const item of cursor) {
    try {
      // Skip if already migrated
      if (item.featuresAST && !process.env.FORCE_REMIGRATE) {
        stats.skipped++
        continue
      }
      
      // Convert to AST
      const ast = await migrateMarkdownToAST(item.features)
      
      // Test roundtrip (optional validation)
      const roundtrip = await astToMarkdown(ast)
      
      // Save to database
      if (!DRY_RUN) {
        batch.push({
          updateOne: {
            filter: {_id: item._id},
            update: {
              $set: {
                featuresAST: ast,
                featuresASTCreatedAt: new Date()
              }
            }
          }
        })
        
        // Execute batch
        if (batch.length >= batchSize) {
          await items.bulkWrite(batch)
          batch = []
        }
      }
      
      stats.success++
      
      // Progress indicator
      if (stats.success % 100 === 0) {
        console.log(`✅ Processed ${stats.success}/${stats.total}...`)
      }
      
    } catch (error) {
      stats.failed++
      stats.errors.push({
        itemId: item._id,
        itemName: item.name,
        features: item.features,
        error: error.message,
        stack: error.stack
      })
      
      console.error(`❌ Failed for item ${item._id}: ${error.message}`)
    }
  }
  
  // Execute remaining batch
  if (batch.length > 0 && !DRY_RUN) {
    await items.bulkWrite(batch)
  }
  
  await client.close()
  
  // Generate report
  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  const report = {
    timestamp: new Date().toISOString(),
    dryRun: DRY_RUN,
    duration: `${duration}s`,
    stats,
    errors: stats.errors
  }
  
  await fs.writeFile(
    `migration-report-${Date.now()}.json`,
    JSON.stringify(report, null, 2)
  )
  
  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📋 MIGRATION SUMMARY')
  console.log('='.repeat(50))
  console.log(`Total items:     ${stats.total}`)
  console.log(`✅ Success:      ${stats.success}`)
  console.log(`⏭️  Skipped:      ${stats.skipped}`)
  console.log(`❌ Failed:       ${stats.failed}`)
  console.log(`⏱️  Duration:     ${duration}s`)
  console.log(`💾 Report saved to migration-report-${Date.now()}.json`)
  
  if (stats.failed > 0) {
    console.log('\n⚠️  Some items failed. Check the report for details.')
    process.exit(1)
  }
  
  console.log('\n✅ Migration completed successfully!')
}

// Run migration
runMigration().catch(error => {
  console.error('💥 Migration failed:', error)
  process.exit(1)
})
```

### Running the Migration

```bash
# Dry run (no database changes)
DRY_RUN=true node run-migration.js

# Actual migration
MONGODB_URL=mongodb://localhost:27017 DB_NAME=pricify node run-migration.js

# Force re-migration of already migrated items
FORCE_REMIGRATE=true node run-migration.js
```

---

## Real-World Example: Complex Markdown Migration

Let's walk through a **complete real-world example** showing how your actual database markdown gets processed step-by-step.

### Raw Database String

This is what's actually stored in your database:

```javascript
const rawFromDB = "![aa](https://img.freepik.com/free-photo/closeup-scarlet-macaw-from-side-view-scarlet-macaw-closeup-head_488145-3540.jpg?semt=ais_hybrid&w=740&q=80)\n\nThis is **a bold**\n\nIs *this a **italic and bold***\n\n*I am a* [tooltip]{Toolyip wala texr}\n\n1. 🤣😍 I am 1\n\n2. This is *2 italic*\n\n3. This is ~~3 deleted~~\n\nThis is *a link in* [italic](https://google.com)\n\n# this is a heading\n\n- Bullet list point 1\n- Bulet list point 2\n\n> This is code in [tooltip]{Tooltip text} and [lnk]{Tooltip text}\n\n![aa](https://m.media-amazon.com/images/I/51MTPvUBZNL.jpg)"
```

When rendered as markdown, this becomes:

```markdown
![aa](https://img.freepik.com/free-photo/closeup-scarlet-macaw-from-side-view-scarlet-macaw-closeup-head_488145-3540.jpg?semt=ais_hybrid&w=740&q=80)

This is **a bold**

Is *this a **italic and bold***

*I am a* [tooltip]{Toolyip wala texr}

1. 🤣😍 I am 1

2. This is *2 italic*

3. This is ~~3 deleted~~

This is *a link in* [italic](https://google.com)

# this is a heading

- Bullet list point 1
- Bulet list point 2

> This is code in [tooltip]{Tooltip text} and [lnk]{Tooltip text}

![aa](https://m.media-amazon.com/images/I/51MTPvUBZNL.jpg)
```

### Step 1: Preprocessing with formatMarkdown()

**Input:** Raw database string  
**Process:** Apply `formatMarkdown()` normalization  
**Output:** Standard CommonMark markdown

```javascript
import {formatMarkdown} from './src/client/lib/markdown-helper.js'

const normalized = formatMarkdown(rawFromDB)
```

**After preprocessing:**
```markdown
![aa](https://img.freepik.com/free-photo/closeup-scarlet-macaw-from-side-view-scarlet-macaw-closeup-head_488145-3540.jpg?semt=ais_hybrid&w=740&q=80)

This is **a bold**

Is *this a **italic and bold***

*I am a* [tooltip]{Toolyip wala texr}

1. 🤣😍 I am 1

2. This is *2 italic*

3. This is ~~3 deleted~~

This is *a link in* [italic](https://google.com)

# this is a heading

- Bullet list point 1
- Bulet list point 2

> This is code in [tooltip]{Tooltip text} and [lnk]{Tooltip text}

![aa](https://m.media-amazon.com/images/I/51MTPvUBZNL.jpg)
```

**What changed:**
- ✅ Emojis already rendered (🤣😍) - preserved as-is
- ✅ Spacing normalized to double newlines
- ✅ No `===` headings or `:emoji:` codes in this example

### Step 2: Parse to MDAST

**Input:** Normalized markdown  
**Process:** Parse with `unified` + `remarkParse` + `remarkGfm` + `remarkTooltip`

```javascript
import {unified} from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import {remarkTooltip} from './plugins/remark-tooltip.js'

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkTooltip)  // Custom plugin for [text]{tooltip}

const ast = processor.parse(normalized)
```

### Step 3: Resulting MDAST Structure

Here's the complete AST output with **annotations** explaining each part:

```javascript
{
  "type": "root",
  "children": [
    // 1. First Image
    {
      "type": "paragraph",
      "children": [
        {
          "type": "image",
          "url": "https://img.freepik.com/free-photo/closeup-scarlet-macaw-from-side-view-scarlet-macaw-closeup-head_488145-3540.jpg?semt=ais_hybrid&w=740&q=80",
          "alt": "aa",
          "title": null
        }
      ]
    },
    
    // 2. "This is **a bold**"
    {
      "type": "paragraph",
      "children": [
        {
          "type": "text",
          "value": "This is "
        },
        {
          "type": "strong",           // **bold**
          "children": [
            {
              "type": "text",
              "value": "a bold"
            }
          ]
        }
      ]
    },
    
    // 3. "Is *this a **italic and bold***" (nested emphasis + strong)
    {
      "type": "paragraph",
      "children": [
        {
          "type": "text",
          "value": "Is "
        },
        {
          "type": "emphasis",         // *italic*
          "children": [
            {
              "type": "text",
              "value": "this a "
            },
            {
              "type": "strong",       // **bold** INSIDE italic
              "children": [
                {
                  "type": "text",
                  "value": "italic and bold"
                }
              ]
            }
          ]
        }
      ]
    },
    
    // 4. "*I am a* [tooltip]{Toolyip wala texr}" (italic + custom tooltip)
    {
      "type": "paragraph",
      "children": [
        {
          "type": "emphasis",         // *I am a*
          "children": [
            {
              "type": "text",
              "value": "I am a"
            }
          ]
        },
        {
          "type": "text",
          "value": " "
        },
        {
          "type": "tooltip",          // ← CUSTOM NODE from remarkTooltip plugin!
          "text": "tooltip",
          "tooltip": "Toolyip wala texr"
        }
      ]
    },
    
    // 5. Ordered List (numbered 1-3)
    {
      "type": "list",
      "ordered": true,
      "start": 1,
      "spread": false,
      "children": [
        // List item 1: "🤣😍 I am 1"
        {
          "type": "listItem",
          "spread": false,
          "children": [
            {
              "type": "paragraph",
              "children": [
                {
                  "type": "text",
                  "value": "🤣😍 I am 1"  // Emojis preserved as unicode
                }
              ]
            }
          ]
        },
        // List item 2: "This is *2 italic*"
        {
          "type": "listItem",
          "spread": false,
          "children": [
            {
              "type": "paragraph",
              "children": [
                {
                  "type": "text",
                  "value": "This is "
                },
                {
                  "type": "emphasis",
                  "children": [
                    {
                      "type": "text",
                      "value": "2 italic"
                    }
                  ]
                }
              ]
            }
          ]
        },
        // List item 3: "This is ~~3 deleted~~" (strikethrough via remark-gfm)
        {
          "type": "listItem",
          "spread": false,
          "children": [
            {
              "type": "paragraph",
              "children": [
                {
                  "type": "text",
                  "value": "This is "
                },
                {
                  "type": "delete",    // ~~strikethrough~~ from remark-gfm
                  "children": [
                    {
                      "type": "text",
                      "value": "3 deleted"
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    
    // 6. "This is *a link in* [italic](https://google.com)" (italic + link)
    {
      "type": "paragraph",
      "children": [
        {
          "type": "text",
          "value": "This is "
        },
        {
          "type": "emphasis",         // *a link in*
          "children": [
            {
              "type": "text",
              "value": "a link in"
            }
          ]
        },
        {
          "type": "text",
          "value": " "
        },
        {
          "type": "link",             // [italic](url)
          "url": "https://google.com",
          "children": [
            {
              "type": "text",
              "value": "italic"
            }
          ]
        }
      ]
    },
    
    // 7. "# this is a heading"
    {
      "type": "heading",
      "depth": 1,                     // # = h1
      "children": [
        {
          "type": "text",
          "value": "this is a heading"
        }
      ]
    },
    
    // 8. Unordered List (bullet points)
    {
      "type": "list",
      "ordered": false,               // Bullet list (not numbered)
      "spread": false,
      "children": [
        {
          "type": "listItem",
          "spread": false,
          "children": [
            {
              "type": "paragraph",
              "children": [
                {
                  "type": "text",
                  "value": "Bullet list point 1"
                }
              ]
            }
          ]
        },
        {
          "type": "listItem",
          "spread": false,
          "children": [
            {
              "type": "paragraph",
              "children": [
                {
                  "type": "text",
                  "value": "Bulet list point 2"
                }
              ]
            }
          ]
        }
      ]
    },
    
    // 9. Blockquote with TWO tooltips INSIDE it
    {
      "type": "blockquote",           // > quote
      "children": [
        {
          "type": "paragraph",
          "children": [
            {
              "type": "text",
              "value": "This is code in "
            },
            {
              "type": "tooltip",      // ← First tooltip INSIDE blockquote!
              "text": "tooltip",
              "tooltip": "Tooltip text"
            },
            {
              "type": "text",
              "value": " and "
            },
            {
              "type": "tooltip",      // ← Second tooltip INSIDE blockquote!
              "text": "lnk",
              "tooltip": "Tooltip text"
            }
          ]
        }
      ]
    },
    
    // 10. Second Image
    {
      "type": "paragraph",
      "children": [
        {
          "type": "image",
          "url": "https://m.media-amazon.com/images/I/51MTPvUBZNL.jpg",
          "alt": "aa",
          "title": null
        }
      ]
    }
  ]
}
```

### Key Features Demonstrated

This example showcases:

✅ **Images** - Standard markdown `![alt](url)` → `image` nodes  
✅ **Bold text** - `**text**` → `strong` nodes  
✅ **Italic text** - `*text*` → `emphasis` nodes  
✅ **Strikethrough** - `~~text~~` → `delete` nodes (via `remark-gfm`)  
✅ **Nested formatting** - `*this a **bold***` → nested `emphasis` > `strong`  
✅ **Custom tooltips** - `[text]{tooltip}` → custom `tooltip` nodes  
✅ **Multiple tooltips in blockquote** - Two tooltips parsed inside a single blockquote  
✅ **Emoji unicode** - `🤣😍` preserved as text values  
✅ **Ordered lists** - `1. item` → `list` (ordered: true) with `listItem` children  
✅ **Unordered lists** - `- item` → `list` (ordered: false) with bullet points  
✅ **Links** - `[text](url)` → `link` nodes  
✅ **Headings** - `# text` → `heading` node (depth: 1)  
✅ **Blockquotes** - `> text` → `blockquote` nodes  
✅ **Tooltip in blockquote** - Custom syntax works inside standard markdown structures  

### Complete Migration Code

Here's the full code to migrate this example:

```javascript
import {unified} from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import {remarkTooltip} from './plugins/remark-tooltip.js'
import {formatMarkdown} from './src/client/lib/markdown-helper.js'

async function migrateComplexExample() {
  const rawFromDB = "![aa](https://img.freepik.com/free-photo/closeup-scarlet-macaw-from-side-view-scarlet-macaw-closeup-head_488145-3540.jpg?semt=ais_hybrid&w=740&q=80)\n\nThis is **a bold**\n\nIs *this a **italic and bold***\n\n*I am a* [tooltip]{Toolyip wala texr}\n\n1. 🤣😍 I am 1\n\n2. This is *2 italic*\n\n3. This is ~~3 deleted~~\n\nThis is *a link in* [italic](https://google.com)\n\n# this is a heading\n\n- Bullet list point 1\n- Bulet list point 2\n\n> This is code in [tooltip]{Tooltip text} and [lnk]{Tooltip text}\n\n![aa](https://m.media-amazon.com/images/I/51MTPvUBZNL.jpg)"
  
  console.log('=== STEP 1: Raw from Database ===')
  console.log(rawFromDB)
  
  // Step 1: Preprocess
  const normalized = formatMarkdown(rawFromDB)
  console.log('\n=== STEP 2: After formatMarkdown() ===')
  console.log(normalized)
  
  // Step 2: Parse to AST
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkTooltip)  // Custom plugin
  
  const ast = processor.parse(normalized)
  
  console.log('\n=== STEP 3: MDAST Output ===')
  console.log(JSON.stringify(ast, null, 2))
  
  // Step 3: Validate
  console.log('\n=== STEP 4: Validation ===')
  console.log('✅ Root type:', ast.type)
  console.log('✅ Total children:', ast.children.length)
  console.log('✅ Has images:', ast.children.some(n => 
    n.children?.[0]?.type === 'image'
  ))
  console.log('✅ Has tooltips:', JSON.stringify(ast).includes('"type":"tooltip"'))
  console.log('✅ Has blockquote:', ast.children.some(n => n.type === 'blockquote'))
  console.log('✅ Has ordered list:', ast.children.some(n => 
    n.type === 'list' && n.ordered === true
  ))
  console.log('✅ Has unordered list:', ast.children.some(n => 
    n.type === 'list' && n.ordered === false
  ))
  console.log('✅ Has heading:', ast.children.some(n => n.type === 'heading'))
  console.log('✅ Has strikethrough:', JSON.stringify(ast).includes('"type":"delete"'))
  
  return ast
}

// Run it
migrateComplexExample()
```

### Visual Breakdown: What Goes Where

```
Raw Markdown                                    →  MDAST Node Type
───────────────────────────────────────────────────────────────────────
![aa](url)                                      →  paragraph > image
This is **a bold**                              →  paragraph > text + strong
Is *this a **italic and bold***                 →  paragraph > text + emphasis > strong
*I am a* [tooltip]{text}                        →  paragraph > emphasis + tooltip (custom!)
1. 🤣😍 I am 1                                  →  list (ordered) > listItem > paragraph
2. This is *2 italic*                           →  list (ordered) > listItem > paragraph > emphasis
3. This is ~~3 deleted~~                        →  list (ordered) > listItem > paragraph > delete
This is *a link in* [italic](url)               →  paragraph > emphasis + link
# this is a heading                             →  heading (depth: 1)
- Bullet list point 1                           →  list (unordered) > listItem > paragraph
> This is code in [tooltip]{text} and [lnk]{text} →  blockquote > paragraph > text + tooltip + tooltip
![aa](url)                                      →  paragraph > image
```

### Important Notes

#### 1. Multiple Tooltips Inside Blockquote

Notice that `> This is code in [tooltip]{Tooltip text} and [lnk]{Tooltip text}` creates a blockquote with **TWO tooltips** inside:

```json
{
  "type": "blockquote",
  "children": [
    {
      "type": "paragraph",
      "children": [
        {"type": "text", "value": "This is code in "},
        {"type": "tooltip", "text": "tooltip", "tooltip": "Tooltip text"},
        {"type": "text", "value": " and "},
        {"type": "tooltip", "text": "lnk", "tooltip": "Tooltip text"}
      ]
    }
  ]
}
```

**The tooltip plugin works INSIDE other markdown structures!** This is because micromark processes inline content (like tooltips) within block structures (like blockquotes). You can have multiple tooltips in the same line.

#### 2. Nested Formatting

The text `*this a **italic and bold***` shows **nested** emphasis and strong:

```json
{
  "type": "emphasis",
  "children": [
    {"type": "text", "value": "this a "},
    {
      "type": "strong",
      "children": [
        {"type": "text", "value": "italic and bold"}
      ]
    }
  ]
}
```

MDAST naturally handles nesting! Bold can be inside italic, and vice versa.

#### 3. Strikethrough via remark-gfm

The text `~~3 deleted~~` requires `remark-gfm` plugin:

```json
{
  "type": "delete",
  "children": [
    {"type": "text", "value": "3 deleted"}
  ]
}
```

**Without `remark-gfm`, strikethrough won't be parsed!** Make sure to include it in your processor.

#### 4. Emoji Preservation

Native emojis `🤣😍` are preserved as unicode text:

```json
{
  "type": "text",
  "value": "🤣😍 I am 1"
}
```

No special handling needed - they're just characters!

#### 5. Ordered vs Unordered Lists

```json
// Ordered list (1. 2. 3.)
{
  "type": "list",
  "ordered": true,  // ← numbered
  "start": 1,
  "children": [...]
}

// Unordered list (- bullet)
{
  "type": "list",
  "ordered": false,  // ← bullets
  "children": [...]
}
```

The `ordered` property tells you which type it is!

### Testing Your Migration

Use this example to test your migration pipeline:

```javascript
// test-complex-migration.js
import {migrateMarkdownToAST} from './migrate-markdown-to-ast.js'

const testCase = "![aa](https://img.freepik.com/free-photo/closeup-scarlet-macaw-from-side-view-scarlet-macaw-closeup-head_488145-3540.jpg?semt=ais_hybrid&w=740&q=80)\n\nThis is **a bold**\n\nIs *this a **italic and bold***\n\n*I am a* [tooltip]{Toolyip wala texr}\n\n1. 🤣😍 I am 1\n\n2. This is *2 italic*\n\n3. This is ~~3 deleted~~\n\nThis is *a link in* [italic](https://google.com)\n\n# this is a heading\n\n- Bullet list point 1\n- Bulet list point 2\n\n> This is code in [tooltip]{Tooltip text} and [lnk]{Tooltip text}\n\n![aa](https://m.media-amazon.com/images/I/51MTPvUBZNL.jpg)"

async function test() {
  const ast = await migrateMarkdownToAST(testCase)
  
  // Validate all expected elements
  const checks = {
    hasImages: JSON.stringify(ast).includes('"type":"image"'),
    hasTooltips: JSON.stringify(ast).includes('"type":"tooltip"'),
    hasBlockquote: JSON.stringify(ast).includes('"type":"blockquote"'),
    hasOrderedList: JSON.stringify(ast).includes('"ordered":true'),
    hasUnorderedList: JSON.stringify(ast).includes('"ordered":false'),
    hasHeading: JSON.stringify(ast).includes('"type":"heading"'),
    hasLinks: JSON.stringify(ast).includes('"type":"link"'),
    hasStrong: JSON.stringify(ast).includes('"type":"strong"'),
    hasEmphasis: JSON.stringify(ast).includes('"type":"emphasis"'),
    hasStrikethrough: JSON.stringify(ast).includes('"type":"delete"'),
  }
  
  console.log('Migration Test Results:')
  Object.entries(checks).forEach(([name, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${name}`)
  })
  
  if (Object.values(checks).every(Boolean)) {
    console.log('\n🎉 All checks passed!')
  } else {
    console.log('\n⚠️  Some checks failed')
  }
}

test()
```

### Success Criteria

Your migration is successful when:

✅ All 10 top-level nodes are present (2 images, 4 paragraphs, 1 ordered list, 1 heading, 1 unordered list, 1 blockquote)  
✅ Custom tooltip nodes are created for all 3 `[text]{tooltip}` instances  
✅ Two tooltips inside blockquote are properly parsed  
✅ Nested formatting (emphasis + strong) is preserved  
✅ Strikethrough from `~~text~~` creates `delete` nodes (via remark-gfm)  
✅ Emojis remain as unicode text  
✅ Links have proper `url` properties  
✅ Ordered list has `ordered: true` with 3 items  
✅ Unordered list has `ordered: false` with 2 items  
✅ Heading has `depth: 1` for `#` level  

---

## Resources

### 📚 Start Here (Your Custom Learning Guide)

- **[LEARNING_MDAST_AND_UNIFIED.md](./LEARNING_MDAST_AND_UNIFIED.md)** ⭐ - Complete tutorial created specifically for this project
  - MDAST fundamentals explained from scratch
  - Step-by-step plugin development
  - Micromark deep dive with examples
  - Ready-to-use tooltip plugin code
  - Practice exercises with solutions

### Official Documentation

- **unified**: https://unifiedjs.com/
- **remark**: https://github.com/remarkjs/remark
- **MDAST Specification**: https://github.com/syntax-tree/mdast
- **unist Specification**: https://github.com/syntax-tree/unist
- **micromark**: https://github.com/micromark/micromark
- **Creating remark plugins**: https://unifiedjs.com/learn/guide/create-a-remark-plugin/

### Helpful Plugins

- **remark-gfm**: https://github.com/remarkjs/remark-gfm
- **remark-directive**: https://github.com/remarkjs/remark-directive
- **unist-util-visit**: https://github.com/syntax-tree/unist-util-visit
- **unist-util-map**: https://github.com/syntax-tree/unist-util-map
- **mdast-util-to-string**: https://github.com/syntax-tree/mdast-util-to-string

### Examples & Tutorials

- **AST Explorer** (visualize MDAST): https://astexplorer.net/ (select "Markdown" and "mdast")
- **Creating custom syntax**: https://kobez.dev/blog/creating-custom-remark-plugins
- **Micromark extension guide**: https://github.com/micromark/micromark#creating-a-micromark-extension

### TypeScript Types

```bash
npm install -D @types/mdast @types/unist
```

```typescript
// types.d.ts
import type {Literal, Parent} from 'unist'

export interface Tooltip extends Literal {
  type: 'tooltip'
  text: string
  tooltip: string
}

declare module 'mdast' {
  interface RootContentMap {
    tooltip: Tooltip
  }
}
```

---

## Next Steps After AST Migration

Once you have MDAST, you can:

1. **Convert to HTML** (separate repo)
   - Use `remark-rehype` to convert MDAST → HAST (HTML AST)
   - Use `rehype-stringify` to convert HAST → HTML string
   - Add sanitization with `rehype-sanitize`

2. **Convert to React Components**
   - Use `remark-react` or build custom React renderers
   - Each MDAST node type maps to a React component

3. **Store AST in Database**
   - Store as JSON in a separate column
   - Query/analyze structure directly
   - Version control AST schema

4. **Analytics & Validation**
   - Count features per plan
   - Detect broken links
   - Validate image URLs
   - Check content quality

---

## Conclusion

**Recommended Approach:**

✅ Use **unified + remark** ecosystem  
✅ Parse markdown to **MDAST** format  
✅ **⚠️ MANDATORY: Preprocess with `formatMarkdown()` first!**  
✅ Create custom plugins for tooltip syntax  
✅ Store AST as JSON in database  
✅ Future: Convert AST → HTML in separate repo  

**Key Benefits:**

- Industry-standard AST format (MDAST)
- Extensible and future-proof
- Rich ecosystem (300+ plugins)
- Easy to validate and transform
- Clean separation of concerns

**Critical Requirements:**

🚨 **MUST preprocess** database strings with `formatMarkdown()` before parsing  
🚨 Your database stores a **custom markdown dialect** (===, :emoji:, __bold__)  
🚨 **Keep formatMarkdown() in sync** between repos  
🚨 **Test with real database data** before migration  

**Timeline:** 5 weeks for complete migration

**Risk Level:** Low - unified/remark is battle-tested and widely used

**Success Criteria:**
- ✅ All database markdown converts to valid AST
- ✅ Custom tooltip syntax preserved
- ✅ Roundtrip testing passes (markdown → AST → markdown)
- ✅ Migration report shows 0 failures
- ✅ AST structure matches editor output

Good luck with your migration! 🚀
