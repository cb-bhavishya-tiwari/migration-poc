# Learning MDAST and the unified Ecosystem

A comprehensive guide from basics to advanced plugin creation.

---

## Table of Contents

1. [What is MDAST?](#what-is-mdast)
2. [Understanding the unified Ecosystem](#understanding-the-unified-ecosystem)
3. [Core Concepts](#core-concepts)
4. [Learning Path](#learning-path)
5. [Hands-On Examples](#hands-on-examples)
6. [Creating Custom Plugins](#creating-custom-plugins)
7. [Understanding Micromark](#understanding-micromark)
8. [Your Tooltip Plugin Implementation](#your-tooltip-plugin-implementation)
9. [Practice Exercises](#practice-exercises)
10. [Resources](#resources)

---

## What is MDAST?

### Definition

**MDAST** = **M**ark**d**own **A**bstract **S**yntax **T**ree

It's a **specification** (not code!) that defines how to represent markdown as a tree structure in JSON format.

### Why "Abstract"?

"Abstract" means it represents the **meaning** of the document, not the literal text:

```markdown
**bold text**
```

**Concrete representation** (text): The string `**bold text**`  
**Abstract representation** (MDAST): A "strong" node containing a "text" node with value "bold text"

### The Tree Structure

Think of markdown as nested boxes:

```
Document (root)
├─ Heading
│  └─ Text "What's included"
├─ List
│  ├─ ListItem
│  │  └─ Paragraph
│  │     └─ Text "Feature 1"
│  └─ ListItem
│     └─ Paragraph
│        ├─ Strong
│        │  └─ Text "Bold"
│        └─ Text " feature"
```

### MDAST in JSON

The above tree looks like this in MDAST:

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
                  "type": "text",
                  "value": "Feature 1"
                }
              ]
            }
          ]
        },
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
                      "value": "Bold"
                    }
                  ]
                },
                {
                  "type": "text",
                  "value": " feature"
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

### Key Node Types

MDAST defines these standard node types:

#### Block Nodes (structure)
- `root` - Top-level container
- `heading` - Headings (depth: 1-6)
- `paragraph` - Paragraphs
- `list` - Lists (ordered or unordered)
- `listItem` - List items
- `blockquote` - Quotes
- `code` - Code blocks

#### Inline Nodes (text formatting)
- `text` - Plain text
- `strong` - Bold text
- `emphasis` - Italic text
- `delete` - Strikethrough (from remark-gfm)
- `link` - Hyperlinks
- `image` - Images
- `inlineCode` - Inline code

#### Special Nodes
- `break` - Line break
- `thematicBreak` - Horizontal rule (---)

### Node Structure

Every MDAST node has:

```typescript
interface Node {
  type: string;           // Node type (e.g., "heading", "text")
  position?: Position;    // Source location (optional)
  data?: object;          // Custom data (optional)
}
```

**Parent nodes** (contain children):
```typescript
interface Parent extends Node {
  children: Node[];
}
```

**Literal nodes** (contain text):
```typescript
interface Literal extends Node {
  value: string;
}
```

**Example - Heading node:**
```json
{
  "type": "heading",
  "depth": 1,
  "children": [
    {
      "type": "text",
      "value": "Hello World"
    }
  ],
  "position": {
    "start": {"line": 1, "column": 1},
    "end": {"line": 1, "column": 14}
  }
}
```

---

## Understanding the unified Ecosystem

### The Big Picture

unified is a **processing pipeline** for content transformation:

```
Input → Parse → Transform → Stringify → Output
```

Think of it like a factory assembly line:
1. **Raw material** (markdown string)
2. **Parse** - Convert to tree (AST)
3. **Transform** - Modify the tree (plugins)
4. **Stringify** - Convert back to text
5. **Final product** (HTML, markdown, etc.)

### The Family Tree

```
unified (core)
├─ remark (markdown processor)
│  ├─ remark-parse (markdown → MDAST)
│  └─ remark-stringify (MDAST → markdown)
├─ rehype (HTML processor)
│  ├─ rehype-parse (HTML → HAST)
│  └─ rehype-stringify (HAST → HTML)
└─ retext (natural language processor)
```

### What is "remark"?

**remark** is unified configured for markdown:

```javascript
import {unified} from 'unified'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'

// This:
const processor = unified()
  .use(remarkParse)
  .use(remarkStringify)

// Is essentially "remark"
```

**Shortcut:**
```javascript
import {remark} from 'remark'

const processor = remark() // unified + parse + stringify
```

### The Processing Pipeline

```javascript
import {unified} from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'

// 1. Create processor
const processor = unified()
  .use(remarkParse)     // Parser: markdown → MDAST
  .use(remarkGfm)       // Transform: adds GFM support
  // .use(myPlugin)     // Transform: your custom logic

// 2. Parse (markdown → AST)
const ast = processor.parse('# Hello')

// 3. Transform (optional - run through plugins)
const transformedAst = await processor.run(ast)

// 4. Stringify (AST → markdown)
const markdown = processor.stringify(transformedAst)

// OR: Do it all at once
const result = await processor.process('# Hello')
console.log(String(result)) // Transformed markdown
```

### Key Methods

| Method | Purpose | Input | Output |
|--------|---------|-------|--------|
| `parse()` | Convert text to AST | String | AST |
| `run()` | Apply transformations | AST | AST (transformed) |
| `stringify()` | Convert AST to text | AST | String |
| `process()` | Do all three | String | VFile (contains string) |

---

## Core Concepts

### 1. Plugins

Plugins are **functions** that modify the processor:

```javascript
function myPlugin(options) {
  return function transformer(tree, file) {
    // Modify the tree
  }
}

// Use it
processor.use(myPlugin, {someOption: true})
```

**Two types:**

#### Parser/Compiler Plugins
Change how parsing/stringifying works:
```javascript
processor.use(remarkParse)     // Parser
processor.use(remarkStringify) // Compiler
```

#### Transform Plugins
Modify the AST:
```javascript
function addIds() {
  return (tree) => {
    // Walk the tree and modify nodes
    visit(tree, 'heading', (node) => {
      node.data = {id: 'some-id'}
    })
  }
}
```

### 2. Tree Traversal

**Visit pattern** - Walk through the tree:

```javascript
import {visit} from 'unist-util-visit'

function myPlugin() {
  return (tree) => {
    // Visit all heading nodes
    visit(tree, 'heading', (node, index, parent) => {
      console.log('Found heading:', node)
      console.log('Heading text:', node.children[0].value)
      
      // Modify the node
      node.depth = 2
      
      // Remove the node
      // parent.children.splice(index, 1)
      
      // Replace the node
      // parent.children[index] = newNode
    })
  }
}
```

**Available visitors:**

- `visit(tree, nodeType, callback)` - Visit specific node types
- `visit(tree, callback)` - Visit all nodes
- `visitParents(tree, callback)` - Visit with access to all ancestors
- `SKIP` - Skip this node's children
- `EXIT` - Stop traversal

### 3. Node Manipulation

#### Creating nodes:

```javascript
const textNode = {
  type: 'text',
  value: 'Hello'
}

const strongNode = {
  type: 'strong',
  children: [textNode]
}

const paragraphNode = {
  type: 'paragraph',
  children: [strongNode]
}
```

#### Helper utilities:

```javascript
import {u} from 'unist-builder'

// Shorthand for building nodes
const tree = u('root', [
  u('heading', {depth: 1}, [
    u('text', 'Title')
  ]),
  u('paragraph', [
    u('strong', [
      u('text', 'Bold')
    ])
  ])
])
```

### 4. Position Information

Every node can track its source location:

```json
{
  "type": "text",
  "value": "Hello",
  "position": {
    "start": {"line": 1, "column": 1, "offset": 0},
    "end": {"line": 1, "column": 6, "offset": 5}
  }
}
```

Useful for:
- Error reporting
- Source maps
- Syntax highlighting

### 5. Data Property

Store custom metadata on nodes:

```javascript
{
  type: 'heading',
  data: {
    id: 'my-heading',           // Custom ID
    hProperties: {              // HTML properties
      className: 'custom-class'
    }
  },
  children: [...]
}
```

The `data.hProperties` is used when converting to HTML.

---

## Learning Path

### Phase 1: Foundations (1-2 hours)

**Goal:** Understand the basics

#### Step 1.1: Install and Setup

```bash
mkdir mdast-learning
cd mdast-learning
npm init -y
npm install unified remark-parse remark-stringify unist-util-visit
```

Create `package.json`:
```json
{
  "type": "module"
}
```

#### Step 1.2: Your First Parse

Create `01-basic-parse.js`:

```javascript
import {unified} from 'unified'
import remarkParse from 'remark-parse'

const markdown = `
# Hello World

This is **bold** and *italic*.

- Item 1
- Item 2
`

const processor = unified().use(remarkParse)
const ast = processor.parse(markdown)

console.log(JSON.stringify(ast, null, 2))
```

Run:
```bash
node 01-basic-parse.js
```

**Exercise:** 
- Try different markdown syntax
- Observe the AST structure
- Identify node types

#### Step 1.3: Tree Traversal

Create `02-tree-walk.js`:

```javascript
import {unified} from 'unified'
import remarkParse from 'remark-parse'
import {visit} from 'unist-util-visit'

const markdown = `
# Heading

Some **bold** text with *italic*.
`

const ast = unified().use(remarkParse).parse(markdown)

console.log('=== All Nodes ===')
visit(ast, (node) => {
  console.log(`Type: ${node.type}`)
  if (node.value) console.log(`  Value: ${node.value}`)
})

console.log('\n=== Only Text Nodes ===')
visit(ast, 'text', (node) => {
  console.log(node.value)
})

console.log('\n=== Only Strong Nodes ===')
visit(ast, 'strong', (node) => {
  console.log('Found bold text:', node.children[0].value)
})
```

**Exercise:**
- Print all heading depths
- Count total number of list items
- Find all links

#### Step 1.4: Modifying the Tree

Create `03-modify-tree.js`:

```javascript
import {unified} from 'unified'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import {visit} from 'unist-util-visit'

const markdown = `
# Hello

Some text.
`

const processor = unified()
  .use(remarkParse)
  .use(() => (tree) => {
    // Make all headings h2
    visit(tree, 'heading', (node) => {
      node.depth = 2
    })
  })
  .use(remarkStringify)

const result = await processor.process(markdown)
console.log(String(result))
```

**Exercise:**
- Make all text UPPERCASE
- Add "🔥" emoji to every list item
- Convert all headings to bold paragraphs

### Phase 2: Plugin Development (2-3 hours)

**Goal:** Create reusable plugins

#### Step 2.1: Your First Plugin

Create `04-first-plugin.js`:

```javascript
import {unified} from 'unified'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import {visit} from 'unist-util-visit'

// Plugin: Add IDs to headings
function remarkHeadingId() {
  return (tree) => {
    visit(tree, 'heading', (node) => {
      // Get heading text
      const text = node.children
        .filter(child => child.type === 'text')
        .map(child => child.value)
        .join('')
      
      // Create slug
      const slug = text
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '')
      
      // Add to data
      node.data = node.data || {}
      node.data.id = slug
      
      console.log(`Added ID "${slug}" to heading "${text}"`)
    })
  }
}

const markdown = `
# Hello World
## Getting Started
### Installation Steps
`

const processor = unified()
  .use(remarkParse)
  .use(remarkHeadingId)
  .use(remarkStringify)

const result = await processor.process(markdown)
console.log(JSON.stringify(processor.parse(markdown), null, 2))
```

#### Step 2.2: Plugin with Options

Create `05-plugin-options.js`:

```javascript
import {unified} from 'unified'
import remarkParse from 'remark-parse'
import {visit} from 'unist-util-visit'

// Plugin: Emoji replacer
function remarkEmoji(options = {}) {
  const emojiMap = options.emojiMap || {
    ':fire:': '🔥',
    ':heart:': '❤️',
    ':rocket:': '🚀'
  }
  
  return (tree) => {
    visit(tree, 'text', (node) => {
      let text = node.value
      
      // Replace all emoji codes
      for (const [code, emoji] of Object.entries(emojiMap)) {
        text = text.replace(new RegExp(code, 'g'), emoji)
      }
      
      node.value = text
    })
  }
}

const markdown = 'This is :fire: and :heart: text!'

const ast = unified()
  .use(remarkParse)
  .use(remarkEmoji, {
    emojiMap: {
      ':fire:': '🔥',
      ':heart:': '💖',  // Custom emoji
      ':smile:': '😊'
    }
  })
  .parse(markdown)

visit(ast, 'text', (node) => {
  console.log(node.value)
})
```

**Exercise:**
- Add a `prefix` option to add text before headings
- Add a `maxDepth` option to limit heading levels
- Add a `transform` option that's a custom function

#### Step 2.3: Creating New Node Types

Create `06-custom-node.js`:

```javascript
import {unified} from 'unified'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import {visit} from 'unist-util-visit'

// Plugin: Convert **text**{.class} to custom nodes
function remarkCustomClass() {
  return (tree) => {
    visit(tree, 'strong', (node, index, parent) => {
      // Check if next sibling is text with {.class}
      const nextSibling = parent.children[index + 1]
      
      if (nextSibling?.type === 'text') {
        const match = nextSibling.value.match(/^\{\.(\w+)\}/)
        
        if (match) {
          const className = match[1]
          
          // Create custom node
          const customNode = {
            type: 'customStrong',
            className: className,
            children: node.children,
            data: {
              hProperties: {
                className: className
              }
            }
          }
          
          // Replace strong node
          parent.children[index] = customNode
          
          // Remove class syntax from text
          nextSibling.value = nextSibling.value.slice(match[0].length)
        }
      }
    })
  }
}

const markdown = 'This is **important**{.highlight} text'

const ast = unified()
  .use(remarkParse)
  .use(remarkCustomClass)
  .parse(markdown)

console.log(JSON.stringify(ast, null, 2))
```

### Phase 3: Understanding Micromark (3-4 hours)

**Goal:** Learn low-level parsing for custom syntax

#### What is Micromark?

Micromark is the **parser** that powers remark-parse. It's like the engine under the hood.

**Two layers:**

1. **Tokenization** - Break text into tokens (low-level)
2. **AST Construction** - Build tree from tokens (high-level)

For custom syntax like `[text]{tooltip}`, you need to work at the tokenization layer.

#### The Micromark Flow

```
Input: "[text]{tooltip}"
   ↓
Tokenizer: Breaks into tokens
   → '[' (marker)
   → 'text' (content)
   → ']' (marker)
   → '{' (marker)
   → 'tooltip' (content)
   → '}' (marker)
   ↓
AST Constructor: Builds tree
   → tooltipNode {text: 'text', tooltip: 'tooltip'}
```

#### Micromark Extension Structure

A micromark extension has **two parts**:

##### 1. Syntax Extension (Tokenization)

```javascript
function tooltipSyntax() {
  return {
    text: {
      // Character code for '[' is 91
      91: {
        tokenize: tokenizeTooltip,
        resolveAll: resolveTooltip
      }
    }
  }
}
```

##### 2. HTML Extension (Optional - for rendering)

```javascript
function tooltipHtml() {
  return {
    enter: {
      tooltip(token) {
        this.tag('<span class="tooltip">')
      }
    },
    exit: {
      tooltip(token) {
        this.tag('</span>')
      }
    }
  }
}
```

#### Tokenizer Function

The tokenizer is a **state machine**:

```javascript
function tokenizeTooltip(effects, ok, nok) {
  // effects = methods to consume characters
  // ok = success callback
  // nok = failure callback
  
  return start
  
  function start(code) {
    if (code !== 91) return nok(code) // Not '['
    
    effects.enter('tooltip')
    effects.enter('tooltipMarker')
    effects.consume(code) // Consume '['
    effects.exit('tooltipMarker')
    effects.enter('tooltipText')
    return text
  }
  
  function text(code) {
    if (code === 93) { // ']'
      effects.exit('tooltipText')
      effects.enter('tooltipMarker')
      effects.consume(code)
      effects.exit('tooltipMarker')
      return content
    }
    
    effects.consume(code)
    return text
  }
  
  function content(code) {
    if (code !== 123) return nok(code) // Not '{'
    
    effects.enter('tooltipContentMarker')
    effects.consume(code) // Consume '{'
    effects.exit('tooltipContentMarker')
    effects.enter('tooltipContent')
    return contentText
  }
  
  function contentText(code) {
    if (code === 125) { // '}'
      effects.exit('tooltipContent')
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

**Key concepts:**

- **State machine**: Each function is a "state"
- **effects.consume()**: Move to next character
- **effects.enter/exit()**: Mark token boundaries
- **Return next state**: Function returns the next state function
- **ok/nok**: Success or failure

#### Complete Example: Simple Alert Syntax

Let's build `::alert::text::` syntax step by step.

Create `07-micromark-alert.js`:

```javascript
import {unified} from 'unified'
import remarkParse from 'remark-parse'
import {visit} from 'unist-util-visit'

// Step 1: Micromark syntax extension
function alertSyntax() {
  return {
    text: {
      58: { // ':' character code
        tokenize: tokenizeAlert
      }
    }
  }
}

function tokenizeAlert(effects, ok, nok) {
  return start
  
  function start(code) {
    if (code !== 58) return nok(code) // ':'
    effects.enter('alert')
    effects.enter('alertMarker')
    effects.consume(code)
    return secondColon
  }
  
  function secondColon(code) {
    if (code !== 58) return nok(code)
    effects.consume(code)
    effects.exit('alertMarker')
    effects.enter('alertLabel')
    return label
  }
  
  function label(code) {
    if (code === 58) {
      effects.exit('alertLabel')
      effects.enter('alertMarker')
      effects.consume(code)
      return labelEnd
    }
    effects.consume(code)
    return label
  }
  
  function labelEnd(code) {
    if (code !== 58) return nok(code)
    effects.consume(code)
    effects.exit('alertMarker')
    effects.enter('alertText')
    return text
  }
  
  function text(code) {
    if (code === 58) {
      effects.exit('alertText')
      effects.enter('alertMarker')
      effects.consume(code)
      return closeFirst
    }
    effects.consume(code)
    return text
  }
  
  function closeFirst(code) {
    if (code !== 58) return nok(code)
    effects.consume(code)
    effects.exit('alertMarker')
    effects.exit('alert')
    return ok
  }
}

// Step 2: MDAST utility
function alertFromMarkdown() {
  return {
    enter: {
      alert(token) {
        this.enter({
          type: 'alert',
          label: '',
          value: ''
        }, token)
      }
    },
    exit: {
      alertLabel(token) {
        const node = this.stack[this.stack.length - 1]
        node.label = this.sliceSerialize(token)
      },
      alertText(token) {
        const node = this.stack[this.stack.length - 1]
        node.value = this.sliceSerialize(token)
      },
      alert(token) {
        this.exit(token)
      }
    }
  }
}

// Step 3: Remark plugin
function remarkAlert() {
  const data = this.data()
  
  add('micromarkExtensions', alertSyntax())
  add('fromMarkdownExtensions', alertFromMarkdown())
  
  function add(field, value) {
    const list = data[field] ? data[field] : (data[field] = [])
    list.push(value)
  }
}

// Test it
const markdown = 'This is ::warning::Be careful!:: text'

const ast = unified()
  .use(remarkParse)
  .use(remarkAlert)
  .parse(markdown)

console.log(JSON.stringify(ast, null, 2))

visit(ast, 'alert', (node) => {
  console.log(`\nFound alert: ${node.label}`)
  console.log(`Content: ${node.value}`)
})
```

This gives you the pattern for ANY custom syntax!

---

## Your Tooltip Plugin Implementation

Now let's build the tooltip plugin for `[text]{tooltip}`:

### Step 1: Micromark Extension

Create `plugins/micromark-extension-tooltip.js`:

```javascript
/**
 * Tokenize [text]{tooltip} syntax
 */
export function tooltip() {
  return {
    text: {
      91: { // '[' character
        tokenize: tokenizeTooltip
      }
    }
  }
}

function tokenizeTooltip(effects, ok, nok) {
  return start

  function start(code) {
    if (code !== 91) return nok(code)
    effects.enter('tooltip')
    effects.enter('tooltipTextMarker')
    effects.consume(code)
    effects.exit('tooltipTextMarker')
    effects.enter('tooltipText')
    return text
  }

  function text(code) {
    if (code === null) return nok(code)
    if (code === 93) { // ']'
      effects.exit('tooltipText')
      effects.enter('tooltipTextMarker')
      effects.consume(code)
      effects.exit('tooltipTextMarker')
      return contentStart
    }
    effects.consume(code)
    return text
  }

  function contentStart(code) {
    if (code !== 123) return nok(code) // '{'
    effects.enter('tooltipContentMarker')
    effects.consume(code)
    effects.exit('tooltipContentMarker')
    effects.enter('tooltipContent')
    return content
  }

  function content(code) {
    if (code === null) return nok(code)
    if (code === 125) { // '}'
      effects.exit('tooltipContent')
      effects.enter('tooltipContentMarker')
      effects.consume(code)
      effects.exit('tooltipContentMarker')
      effects.exit('tooltip')
      return ok
    }
    effects.consume(code)
    return content
  }
}
```

### Step 2: MDAST Utility

Create `plugins/mdast-util-tooltip.js`:

```javascript
/**
 * Convert tooltip tokens to MDAST nodes
 */
export function tooltipFromMarkdown() {
  return {
    enter: {
      tooltip(token) {
        this.enter({
          type: 'tooltip',
          text: '',
          tooltip: ''
        }, token)
      }
    },
    exit: {
      tooltipText(token) {
        const node = this.stack[this.stack.length - 1]
        node.text = this.sliceSerialize(token)
      },
      tooltipContent(token) {
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

### Step 3: Remark Plugin

Create `plugins/remark-tooltip.js`:

```javascript
import {tooltip} from './micromark-extension-tooltip.js'
import {tooltipFromMarkdown, tooltipToMarkdown} from './mdast-util-tooltip.js'

/**
 * Remark plugin to support [text]{tooltip} syntax
 */
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

### Step 4: Use It!

Create `test-tooltip.js`:

```javascript
import {unified} from 'unified'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import {visit} from 'unist-util-visit'
import {remarkTooltip} from './plugins/remark-tooltip.js'

const markdown = `
# Features

- [Premium support]{Get help within 24 hours}
- [Cloud storage]{Store up to 100GB}
- Regular feature
`

const processor = unified()
  .use(remarkParse)
  .use(remarkTooltip)
  .use(remarkStringify)

const ast = processor.parse(markdown)

console.log('=== AST ===')
console.log(JSON.stringify(ast, null, 2))

console.log('\n=== Tooltips Found ===')
visit(ast, 'tooltip', (node) => {
  console.log(`Text: "${node.text}"`)
  console.log(`Tooltip: "${node.tooltip}"`)
  console.log('---')
})

// Test roundtrip
const result = await processor.process(markdown)
console.log('\n=== Roundtrip Markdown ===')
console.log(String(result))
```

Run:
```bash
node test-tooltip.js
```

---

## Practice Exercises

### Exercise 1: Word Counter Plugin

Create a plugin that counts words and adds it to file data:

```javascript
function remarkWordCount() {
  return (tree, file) => {
    let wordCount = 0
    
    visit(tree, 'text', (node) => {
      wordCount += node.value.split(/\s+/).length
    })
    
    file.data.wordCount = wordCount
  }
}
```

### Exercise 2: Link Validator

Create a plugin that checks if all links are valid URLs:

```javascript
function remarkLinkValidator() {
  return (tree, file) => {
    visit(tree, 'link', (node) => {
      try {
        new URL(node.url)
      } catch {
        file.message(`Invalid URL: ${node.url}`, node.position)
      }
    })
  }
}
```

### Exercise 3: Custom Admonition Syntax

Build support for `!!! note` admonitions:

```markdown
!!! note
    This is a note
```

Should create:
```json
{
  "type": "admonition",
  "kind": "note",
  "children": [...]
}
```

### Exercise 4: Hashtag Parser

Parse `#hashtag` into custom nodes:

```markdown
This is #cool and #awesome
```

Should recognize hashtag nodes.

---

## Resources

### Official Documentation

- **unified**: https://unifiedjs.com/
- **remark**: https://github.com/remarkjs/remark
- **MDAST spec**: https://github.com/syntax-tree/mdast
- **unist spec**: https://github.com/syntax-tree/unist
- **micromark**: https://github.com/micromark/micromark

### Interactive Tools

- **AST Explorer**: https://astexplorer.net/ (Select "Markdown" → "mdast")
  - Paste markdown and see the AST in real-time!
  - Essential for learning

### Tutorials

- **Creating a remark plugin**: https://unifiedjs.com/learn/guide/create-a-remark-plugin/
- **Creating a micromark extension**: https://github.com/micromark/micromark#creating-a-micromark-extension
- **Custom syntax guide**: https://kobez.dev/blog/creating-custom-remark-plugins

### Useful Packages

```bash
# Core
npm install unified remark-parse remark-stringify

# Tree utilities
npm install unist-util-visit unist-util-map unist-util-filter
npm install unist-builder  # Helper for creating nodes

# Testing
npm install mdast-util-from-markdown mdast-util-to-markdown
```

### Example Repos

- **remark-gfm**: https://github.com/remarkjs/remark-gfm
  - Great example of extending markdown syntax
- **remark-directive**: https://github.com/remarkjs/remark-directive
  - Shows how to build complex custom syntax
- **micromark-extension-gfm**: https://github.com/micromark/micromark-extension-gfm
  - Shows complete micromark extension structure

### Character Code Reference

Common characters for micromark:

```javascript
33  // !
35  // #
42  // *
45  // -
58  // :
60  // <
91  // [
93  // ]
95  // _
96  // `
123 // {
125 // }
126 // ~
```

---

## Summary: What You Need to Know

### Level 1: Basic Usage (for migration)
✅ What MDAST is (tree structure representing markdown)  
✅ How to parse markdown to AST  
✅ How to traverse the tree with `visit`  
✅ Node types and structure  
✅ How to use existing plugins  

**Time:** 2-3 hours  
**Sufficient for:** Running your migration script

### Level 2: Plugin Development (for simple transformations)
✅ How to create transform plugins  
✅ How to modify nodes  
✅ How to add/remove nodes  
✅ Plugin options and configuration  

**Time:** +2-3 hours  
**Sufficient for:** Creating helper utilities, simple modifications

### Level 3: Advanced (for custom syntax)
✅ Understanding micromark tokenization  
✅ Creating syntax extensions  
✅ Building MDAST utilities  
✅ Complete plugin packages  

**Time:** +4-5 hours  
**Needed for:** `[text]{tooltip}` custom syntax

---

## Quick Start Checklist

For your migration project, focus on:

- [x] **Understand MDAST structure** (1 hour)
  - Use AST Explorer
  - Parse some markdown
  - Inspect the output

- [x] **Learn tree traversal** (30 min)
  - Use `visit` to find nodes
  - Print node information

- [x] **Test with your data** (1 hour)
  - Parse actual database markdown
  - See what the AST looks like
  - Verify all nodes are correct

- [ ] **Build tooltip plugin** (4-5 hours)
  - Follow the tooltip implementation above
  - Test with real examples
  - Handle edge cases

- [ ] **Integrate and test** (2-3 hours)
  - Add to migration script
  - Run on sample database records
  - Validate output

**Total time estimate: 8-10 hours** to go from zero to having a working migration with custom tooltip support!

Good luck! 🚀
