# HTML Comparison Tool - Usage Guide

## Overview

The HTML comparison tool validates that markdown features render identically after AST conversion. It compares the HTML output from both `rawMD` (preprocessed markdown) and `astMD` (markdown regenerated from AST).

## Process Flow

```
pricing_features_processed.json
    ↓
Read rawMD and astMD for each feature
    ↓
Render both to HTML using remark-html
    ↓
Normalize HTML (whitespace, formatting)
    ↓
Compare normalized HTML strings
    ↓
Flag any differences
    ↓
Generate report + JSON output
```

## How It Works

### 1. HTML Rendering

Both `rawMD` and `astMD` are rendered to HTML using the same pipeline:
- `remark-parse` - Parse markdown to AST
- `remark-gfm` - GitHub Flavored Markdown support
- `remarkTooltip` - Custom tooltip plugin
- `remark-html` - Convert AST to HTML

### 2. HTML Normalization

Before comparison, HTML is normalized to ignore minor differences:
- Multiple spaces → single space
- Remove whitespace between tags
- Trim leading/trailing whitespace

This ensures we only flag **meaningful** differences that affect rendering.

### 3. Comparison

For each feature, the tool compares:
- Normalized HTML strings
- Character length
- Flags if not identical

### 4. Report Generation

Creates two outputs:
- **JSON file**: Complete data with all HTML and comparison results
- **Markdown report**: Human-readable summary with flagged features

## Installation

```bash
# Make sure you're in the md to AST directory
cd "../"

# Install remark-html
npm install remark-html

# Go back to validate-ast
cd "validate-ast"
```

## Usage

```bash
# Run with default input (pricing_features_processed.json)
node compare_html_output.js

# Run with custom input
node compare_html_output.js path/to/custom-input.json
```

## Output Files

### 1. `html_comparison_results.json`

Complete comparison data:

```json
{
  "meta": {
    "generatedAt": "2026-03-15T19:24:40.037Z",
    "totalPricingPages": 292,
    "totalFeatures": 2157,
    "flaggedFeatures": 0,
    "identicalFeatures": 2157,
    "flaggedPercentage": "0.00",
    "identicalPercentage": "100.00"
  },
  "results": [
    {
      "pricingPageId": "01JXJE4HENFW7A51F6QP80G4QY",
      "totalFeatures": 3,
      "flaggedFeatures": 0,
      "results": [
        {
          "feature": "feat1",
          "rawMD": "...",
          "astMD": "...",
          "rawHtml": "<h1>What's included</h1>...",
          "astHtml": "<h1>What's included</h1>...",
          "comparison": {
            "identical": true,
            "rawLength": 89,
            "astLength": 89,
            "lengthDiff": 0
          },
          "flagged": false
        }
      ]
    }
  ]
}
```

### 2. `html_comparison_report.md`

Human-readable report with:
- Summary statistics
- List of flagged features (if any)
- Side-by-side markdown and HTML comparison

## Results Interpretation

### ✅ 100% Identical (Ideal)

All features render identically. This means:
- AST conversion is lossless for rendering
- Safe to migrate to AST-based storage
- No visual changes for end users

**Current Status**: ✅ **2,157 features - 100% identical!**

### ⚠️ Flagged Features

If features are flagged, check the report for:

**Harmless Differences:**
- Whitespace variations
- Attribute order in HTML tags
- `---` vs `***` for `<hr>` (both valid)
- Quote styles in attributes

**Concerning Differences:**
- Missing content
- Different HTML structure (e.g., `<h1>` vs `<h2>`)
- Broken links or formatting
- Lost bold/italic/code formatting

## Example: What Gets Compared

**Input Markdown (rawMD)**:
```markdown
# What's included

---

✅ Basic Membership

---
```

**Rendered HTML (rawHtml)**:
```html
<h1>What's included</h1>
<hr>
<p>✅ Basic Membership</p>
<hr>
```

**AST Markdown (astMD)**:
```markdown
# What's included

***

✅ Basic Membership

***
```

**Rendered HTML (astHtml)**:
```html
<h1>What's included</h1>
<hr>
<p>✅ Basic Membership</p>
<hr>
```

**Comparison Result**: ✅ Identical (both render to same HTML)

## Why This Matters

### Visual Output is King

Even if the markdown text differs slightly (`---` vs `***`), what matters is:
- Does it render the same HTML?
- Will users see the same content?
- Is formatting preserved?

This tool validates that the AST conversion is **visually lossless**.

### Migration Confidence

With 100% identical rendering:
- ✅ Safe to store features as AST
- ✅ No visual regressions for users
- ✅ Markdown → AST → Markdown roundtrip works perfectly

## Troubleshooting

### Error: Cannot find module 'remark-html'

```bash
cd "../"
npm install remark-html
cd "validate-ast"
```

### High Memory Usage

The tool processes features sequentially (not in parallel) to avoid memory issues. If you still encounter problems, you can split the input file.

### Large Output Files

The JSON output contains full HTML for every feature. For 2,157 features, expect:
- JSON output: ~5-10 MB
- Markdown report: ~50-100 KB (or larger if many features flagged)

## Next Steps

1. ✅ **All features identical** → Proceed with AST migration
2. ⚠️ **Some features flagged** → Review report, fix issues, re-run
3. 📊 **Track over time** → Run periodically to catch regressions

## Complete Workflow

```bash
# 1. Fetch pricing features
python3 fetch_pricing_features.py

# 2. Process through pipeline
node process_features_pipeline.js

# 3. Compare HTML output
node compare_html_output.js

# 4. Review report
cat html_comparison_report.md
```

---

**Last Run**: 2026-03-15T19:24:40.037Z  
**Result**: ✅ 2,157/2,157 features identical (100.00%)  
**Status**: Ready for AST migration!
