# Markdown to MDAST Transformation Guide

This document explains the complete process of transforming markdown data from the database to sanitized MDAST (Markdown Abstract Syntax Tree), including comprehensive analysis of the markdown data distribution.

## Overview

The transformation pipeline converts raw markdown strings stored in the database into standardized, sanitized MDAST trees that can be safely rendered to HTML or other formats. This process ensures consistency, security, and maintainability of markdown content.

---

## Transformation Pipeline

### 1. Markdown Preprocessing Phase

**Tool**: `lib/format-markdown.js`
**Purpose**: Normalize and sanitize raw markdown into standard CommonMark format

#### Preprocessing Steps:

1. **Setext Heading Conversion**
   ```markdown
   # Before
   Main Title
   =========
   
   # After  
   # Main Title
   ```

2. **Spacing Normalization**
   - Remove multiple consecutive spaces
   - Trim trailing spaces from lines
   - Normalize paragraph breaks to double newlines

3. **Bold Syntax Standardization**
   ```markdown
   # Before
   __bold text__
   
   # After
   **bold text**
   ```

4. **Emoji Shortcode Conversion**
   ```markdown
   # Before
   :fire: :rocket: :star:
   
   # After
   🔥 🚀 ⭐
   ```
   - Uses `@emoji-mart/data` for accurate emoji mapping
   - Converts shortcodes to native Unicode emoji

### 2. MDAST Parsing Phase

**Tool**: `process_features_pipeline.js`
**Parser Stack**: `unified` + `remark-parse` + `remark-gfm` + `remark-tooltip`

#### Parser Components:

- **`remark-parse`**: Core CommonMark parser
- **`remark-gfm`**: GitHub Flavored Markdown extensions
- **`remark-tooltip`**: Custom tooltip syntax support `[label]{tooltip content}`

#### Process Flow:
```
Raw Markdown String (from database)
    ↓ formatMarkdown()
Normalized Markdown (rawMD)
    ↓ unified().parse()
Raw MDAST Tree (with positions & html nodes)
    ↓ cleanMDAST()
Clean MDAST Tree (production ready)
    ↓ unified().stringify()
Regenerated Markdown (astMD)
```

### 3. MDAST Cleaning Phase

**Tool**: `lib/clean-mdast.js`
**Purpose**: Remove unwanted properties and nodes from MDAST for production use

#### Cleaning Operations:

1. **Position Property Removal**
   - Removes all `position` objects from every node
   - Eliminates line/column/offset metadata
   - Reduces JSON size by ~30-40%

2. **HTML Node Filtering**
   - Completely removes `html` type nodes from the tree
   - Filters out raw HTML content for security
   - Maintains tree structure integrity

#### Process Flow:
```javascript
Raw MDAST (with positions & html nodes)
    ↓ filterHtmlNodes()
MDAST without html nodes
    ↓ removePositions()
Clean MDAST (production ready)
```

### 4. Validation Phase

**Tools**: 
- `analyze_mdast_from_pricing_features.js` - AST structure analysis
- `compare_html_output.js` - HTML rendering validation
- `generate_clean_mdast.js` - Production-ready clean MDAST generator

#### Validation Checks:
- **Node Type Validation**: Ensures all MDAST nodes are recognized
- **Roundtrip Testing**: Verifies markdown → AST → markdown consistency  
- **HTML Rendering**: Compares HTML output between rawMD and astMD versions
- **Structure Analysis**: Analyzes nesting patterns and tree depth
- **Cleaning Verification**: Confirms positions and html nodes are removed

---

## Data Distribution Analysis

Based on analysis of **328 pricing pages** containing **2,157 feature strings**:

### Dataset Overview

| Metric | Value |
|--------|------:|
| Pricing pages processed | 328 |
| Feature strings (non-empty) | 2,157 |
| Parse success rate | 100% (0 errors) |
| Distinct MDAST node types | 15 |
| Maximum tree depth | 6 levels |

### Node Type Distribution

**Most Common Elements** (sorted by frequency):

| Node Type | Count | Percentage | Purpose |
|-----------|------:|-----------:|---------|
| `text` | 17,343 | 35.2% | Leaf text content |
| `paragraph` | 13,713 | 27.8% | Block paragraphs |
| `listItem` | 8,367 | 17.0% | Individual list items |
| `root` | 2,157 | 4.4% | Document roots |
| `list` | 2,045 | 4.1% | List containers |
| `heading` | 1,958 | 4.0% | Section headings |
| `strong` | 1,682 | 3.4% | Bold text |
| `blockquote` | 1,286 | 2.6% | Quoted blocks |
| `tooltip` | 412 | 0.8% | Custom tooltips |
| `emphasis` | 394 | 0.8% | Italic text |
| `link` | 288 | 0.6% | Hyperlinks |
| `delete` | 245 | 0.5% | Strikethrough |
| `image` | 153 | 0.3% | Images |
| `thematicBreak` | 77 | 0.2% | Horizontal rules |
| `html` | 30 | 0.1% | Raw HTML |

### Content Structure Patterns

#### Heading Distribution
- **H1 headings**: 1,956 (99.9%) - Almost all headings are top-level
- **H3 headings**: 2 (0.1%) - Very few sub-headings

#### List Characteristics
- **Unordered lists only**: 100% of lists use bullet points
- **Ordered lists**: 0% - No numbered lists found
- **Average items per list**: ~4.1 items

#### Inline Formatting Usage
- **Bold text**: 1,682 instances (most common formatting)
- **Italic text**: 394 instances 
- **Strikethrough**: 245 instances
- **Custom tooltips**: 412 instances (unique feature)

### Nesting Complexity

**Common Nesting Patterns**:
```
root → heading/paragraph/list/blockquote
list → listItem → paragraph → (text|strong|emphasis|link|tooltip)
paragraph → strong → text
blockquote → paragraph → text
heading → strong/tooltip/image
```

**Maximum Depth**: 6 levels deep
- Occurs when combining block elements with multiple inline wrappers
- Example: `root → list → listItem → paragraph → strong → emphasis → text`

### Raw HTML Analysis

**HTML Node Distribution** (30 total instances):

| HTML Content | Count | Usage |
|--------------|------:|-------|
| `<abbr title="...">` | 14 | Tooltip abbreviations (opening tags) |
| `</abbr>` | 14 | Tooltip abbreviations (closing tags) |
| `</b>` | 2 | Malformed bold tags |

**Key Insights**:
- 93% of raw HTML is semantic `<abbr>` elements for tooltips
- 7% are malformed closing tags requiring sanitization
- No dangerous HTML elements (script, iframe, etc.) detected

### Content Complexity Metrics

#### Text Content Distribution
- **Average text nodes per feature**: 8.0
- **Average paragraph count per feature**: 6.4
- **Features with lists**: ~95% contain at least one list
- **Features with formatting**: ~78% use bold or italic text

#### Custom Element Usage
- **Tooltip adoption**: 19% of features use custom tooltip syntax
- **Image inclusion**: 7% of features contain images
- **Link density**: 13% of features include hyperlinks

---

## Security and Sanitization

### HTML Sanitization Strategy

1. **Allowlist Approach**: Only permit safe HTML elements
   ```javascript
   const allowedTags = ['abbr', 'strong', 'em', 'del', 'a', 'img'];
   const allowedAttributes = {
     abbr: ['title'],
     a: ['href', 'title'],
     img: ['src', 'alt', 'title']
   };
   ```

2. **Raw HTML Handling**:
   - Sanitize `<abbr>` elements with title attributes
   - Strip malformed tags like stray `</b>`
   - Escape unknown HTML as text content

3. **Link Security**:
   - Validate URL schemes (http/https only)
   - Add `rel="noopener noreferrer"` to external links
   - Sanitize link titles and alt text

### MDAST Node Validation

**Required Node Properties**:
```javascript
const nodeSchemas = {
  heading: ['depth'], // 1-6
  text: ['value'],
  list: ['ordered', 'spread', 'start'],
  listItem: ['checked', 'spread'],
  tooltip: ['text', 'tooltip'],
  image: ['alt', 'title', 'url'],
  link: ['title', 'url'],
  html: ['value'] // requires sanitization
};
```

---

## Implementation Guide

### 1. Database Integration

```javascript
// Example: Transform markdown field during migration
async function transformMarkdownField(record) {
  const rawMarkdown = record.markdown_content;
  
  // Step 1: Preprocess
  const normalizedMD = formatMarkdown(rawMarkdown);
  
  // Step 2: Parse to MDAST
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkTooltip);
  
  const mdast = processor.parse(normalizedMD);
  
  // Step 3: Validate and sanitize
  const sanitizedMDAST = sanitizeAST(mdast);
  
  return {
    ...record,
    mdast_content: JSON.stringify(sanitizedMDAST),
    original_markdown: rawMarkdown
  };
}
```

### 2. Runtime HTML Generation

```javascript
// Example: MDAST to HTML serializer
function mdastToHTML(node) {
  switch (node.type) {
    case 'root':
      return `<div class="content">${serializeChildren(node)}</div>`;
    
    case 'heading':
      const level = Math.min(Math.max(node.depth, 1), 6);
      return `<h${level}>${serializeChildren(node)}</h${level}>`;
    
    case 'paragraph':
      return `<p>${serializeChildren(node)}</p>`;
    
    case 'strong':
      return `<strong>${serializeChildren(node)}</strong>`;
    
    case 'tooltip':
      return `<abbr title="${escapeHTML(node.tooltip)}">${escapeHTML(node.text)}</abbr>`;
    
    case 'text':
      return escapeHTML(node.value);
    
    // ... handle other node types
  }
}
```

### 3. Performance Considerations

- **Batch Processing**: Process records in chunks of 50-100
- **Caching**: Cache parsed MDAST for frequently accessed content
- **Lazy Loading**: Parse MDAST only when rendering is needed
- **Memory Management**: Clear intermediate processing data

---

## Migration Checklist

### Pre-Migration
- [ ] Backup original markdown data
- [ ] Set up processing environment (Node.js)
- [ ] Install dependencies (`unified`, `remark-*`, `@emoji-mart/data`)
- [ ] Test pipeline on sample data

### During Migration  
- [ ] Extract markdown data from database
- [ ] Execute transformation pipeline (`process_features_pipeline.js`)
- [ ] Generate clean MDAST (`generate_clean_mdast.js`)
- [ ] Validate results (`analyze_mdast_from_pricing_features.js`)
- [ ] Compare HTML output (`compare_html_output.js`)
- [ ] Review flagged content manually

### Post-Migration
- [ ] Update application code to use MDAST
- [ ] Implement HTML serializer
- [ ] Add security sanitization
- [ ] Performance test with production load
- [ ] Monitor for rendering issues

---

## Troubleshooting

### Common Issues

1. **Parse Errors**: Usually caused by malformed HTML or unsupported markdown syntax
   - **Solution**: Enhance preprocessing in `formatMarkdown()`

2. **HTML Differences**: rawMD vs astMD produce different HTML
   - **Solution**: Check `html_comparison_report.md` for specific differences

3. **Missing Node Types**: New markdown patterns not covered
   - **Solution**: Update parser plugins or add custom handlers

4. **Performance Issues**: Large datasets cause memory problems
   - **Solution**: Increase batch sizes or process in smaller chunks

### Validation Commands

```bash
# Regenerate analysis report
node analyze_mdast_from_pricing_features.js

# Compare HTML output
node compare_html_output.js

# Test individual markdown string
DRY_RUN=true node migrate.js input/test-sample.json
```

---

## Conclusion

This transformation pipeline provides a robust, scalable approach to migrating from raw markdown storage to structured MDAST. The analysis shows that the content is well-suited for this transformation, with consistent patterns and minimal edge cases requiring special handling.

The high success rate (100% parse success) and detailed analysis of content patterns provide confidence that this approach will work reliably in production environments.