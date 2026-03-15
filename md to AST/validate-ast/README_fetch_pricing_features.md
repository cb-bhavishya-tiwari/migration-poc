# Pricing Features Fetcher

## Overview

This script fetches pricing page data from the Chargebee Pricify API and extracts feature information from each pricing page. It uses parallel processing with memory-efficient batching to handle large datasets without overwhelming system resources.

## What It Does

1. **Reads CSV Input**: Processes a CSV file containing `pricing_page_id` and `site_id` columns
2. **Fetches Pricing Pages**: Makes API calls to `https://api.pricify.chargebee.com/api/v1/public/sites/{site_id}/pricing_pages/{pricing_page_id}`
3. **Extracts Features**: Parses `response.pricingTable.items[].features` from each pricing page
4. **Generates JSON Output**: Creates a JSON file with the structure:
   ```json
   [
     {
       "pricing_page_id": "01JXJE4HENFW7A51F6QP80G4QY",
       "features": {
         "feat1": "feature string 1",
         "feat2": "feature string 2"
       }
     }
   ]
   ```

## Architecture

### Parallel Processing
- **8 concurrent processes** running simultaneously
- **Batch size: 50 items** per batch
- Processes work in **rounds**: each round processes 8 batches in parallel

### Memory Efficiency
- Maximum memory usage: **400 items** (8 processes × 50 items) at any time
- Results are **written incrementally** to disk after each round
- Memory is **cleared between rounds** to prevent overflow
- Scales to any dataset size (300, 3,000, or 30,000+ items)

### Example Execution Flow
For 328 items in CSV:
- **Round 1**: Batches 1-7 process 50 items each, Batch 8 processes 28 items
  - 8 processes run in parallel
  - Results written to file
  - Memory cleared

For 3,000 items:
- **Round 1**: Batches 1-8 (400 items) → Write → Clear
- **Round 2**: Batches 9-16 (400 items) → Write → Clear
- ... continues for 8 rounds total

## Configuration

You can modify these settings at the top of the `main()` function:

```python
CSV_INPUT = "mostVisitedPricingPages.csv"
JSON_OUTPUT = "pricing_features_output.json"
NUM_PROCESSES = 8        # Number of parallel processes
BATCH_SIZE = 50          # Items per batch per process
```

## Requirements

- Python 3.7+
- `requests` library

## Installation

1. **Install dependencies**:
   ```bash
   pip3 install -r requirements.txt
   ```
   
   Or install directly:
   ```bash
   pip3 install requests
   ```

## How to Run

### Important: Use `python3` and `pip3` instead of `python` and `pip`

If you encounter `command not found: pip` errors, use `pip3` and `python3` instead:

```bash
# Install dependencies
pip3 install -r requirements.txt

# Run the script
python3 fetch_pricing_features.py
```

### Basic Usage

From the `generate-markdown` folder:

```bash
python3 fetch_pricing_features.py
```

### From Project Root

```bash
cd "md to AST/validate-ast/generate-markdown"
python3 fetch_pricing_features.py
```

## Output

- **Console**: Real-time progress showing which pricing pages are being fetched
- **File**: `pricing_features_output.json` containing all extracted features

### Progress Information
The script displays:
- Total pricing pages to process
- Current round and batch being processed
- Success/failure count for each round
- Final statistics (total processed, successful, failed)

### Example Console Output
```
Reading CSV file: mostVisitedPricingPages.csv
Found 328 pricing pages to fetch
Using 8 parallel processes
Batch size: 50 items per batch
------------------------------------------------------------
Split into 7 batches
------------------------------------------------------------

============================================================
Round 1/1: Processing batches 1 to 7
============================================================
[Row 1] Fetching: 01JXJE4HENFW7A51F6QP80G4QY
[Row 2] Fetching: 01JNJSG972BKD0ECEXS8NDG3F6
...
[Batch 1] ✓ Completed 50 tasks
...
[Round 1] All batches completed. Aggregating...
[Round 1] Collected 328 results
[Round 1] Success: 325, Failed: 3
[Round 1] Writing to file...
[Round 1] ✓ Written to file

============================================================
✓ All processing complete!
Total processed: 328
Successful: 325, Failed: 3
Results saved to: pricing_features_output.json
============================================================
```

## Error Handling

- **Network errors**: Logged to stderr with pricing page ID
- **Parsing errors**: Captured and included in output with `error` field
- **Failed requests**: Still included in output with empty features and error message

## Performance

- **Small datasets (300 items)**: ~30-60 seconds (depending on API response time)
- **Large datasets (3,000 items)**: ~5-10 minutes
- **Very large datasets (30,000 items)**: ~50-100 minutes

Actual time depends on:
- Network latency
- API response time
- Number of parallel processes configured

## Troubleshooting

### Import Error: requests module not found
```bash
pip3 install requests
```

### Command not found: pip
Use `pip3` and `python3` instead of `pip` and `python`:
```bash
pip3 install -r requirements.txt
python3 fetch_pricing_features.py
```

### CSV file not found
Ensure you're running the script from the correct directory or update the `CSV_INPUT` path in the script.

### Memory issues (even with batching)
Reduce `BATCH_SIZE` or `NUM_PROCESSES` in the script configuration.

### API rate limiting
The API may have rate limits. If you encounter 429 errors, reduce `NUM_PROCESSES` to slow down the request rate.

## File Safety

- **No race conditions**: Processes run in parallel, but file writes are sequential
- **Atomic writes**: Each round completes fully before writing
- **Valid JSON**: Output is always a properly formatted JSON array

---

# Pricing Features Processing Pipeline

After fetching the pricing features, you can process them through a markdown formatting and AST conversion pipeline.

## What the Pipeline Does

The `process_features_pipeline.js` script processes each feature through a complete pipeline:

1. **Read Features**: Loads `pricing_features_output.json` 
2. **Format Markdown**: Applies `formatMarkdown()` to normalize each feature string
   - Converts Setext headings (===) to ATX headings (#)
   - Normalizes spacing
   - Converts double-underscore bold to asterisk bold
   - Converts emoji shortcodes to native emoji
3. **Generate AST**: Parses formatted markdown to Abstract Syntax Tree
4. **Convert Back**: Converts AST back to markdown
5. **Output Comparison**: Creates JSON with both versions for validation

## Output Format

```json
{
  "meta": {
    "generatedAt": "2026-03-16T00:00:00.000Z",
    "inputFile": "pricing_features_output.json",
    "totalPricingPages": 328,
    "totalFeatures": 2156,
    "processedFeatures": 2156,
    "errorCount": 0,
    "pipeline": "formatMarkdown → AST → markdown"
  },
  "data": [
    {
      "pricingPageId": "01JXJE4HENFW7A51F6QP80G4QY",
      "features": {
        "feat1": {
          "rawMD": "# What's included\n\n...",
          "astMD": "# What's included\n\n..."
        },
        "feat2": {
          "rawMD": "# What's included\n\n...",
          "astMD": "# What's included\n\n..."
        }
      }
    }
  ]
}
```

## Prerequisites

Make sure you have the required dependencies installed in the parent directory:

```bash
cd "md to AST"
npm install
```

Required packages (should already be in package.json):
- `unified`
- `remark-parse`
- `remark-stringify`
- `remark-gfm`
- `@emoji-mart/data`

## How to Run the Pipeline

### Step 1: Fetch Pricing Features (if not done already)

```bash
python3 fetch_pricing_features.py
```

This creates `pricing_features_output.json`.

### Step 2: Process Through Pipeline

```bash
node process_features_pipeline.js
```

Or specify a custom input file:

```bash
node process_features_pipeline.js custom-features.json
```

### Output

The pipeline creates `pricing_features_processed.json` with:
- **rawMD**: Feature text after `formatMarkdown()` preprocessing
- **astMD**: Feature text after AST conversion (roundtrip)

## Use Cases

### 1. Validation
Compare `rawMD` vs `astMD` to ensure AST conversion preserves markdown structure:

```bash
node process_features_pipeline.js
# Check output to compare both versions
```

### 2. Migration Testing
Test if your markdown can survive the full AST conversion pipeline before migrating to production.

### 3. Debugging
Identify which features have markdown that doesn't roundtrip correctly through AST conversion.

## Example Console Output

```
════════════════════════════════════════════════════════════
  PRICING FEATURES PIPELINE: Markdown → AST → Markdown
════════════════════════════════════════════════════════════

📄 Reading input file: pricing_features_output.json
✅ Loaded 328 pricing pages

⚙️  Creating markdown processors...
✅ Processors ready

🔄 Processing features through pipeline...
  [1/328] Processing 01JXJE4HENFW7A51F6QP80G4QY (3 features)
  [2/328] Processing 01JNJSG972BKD0ECEXS8NDG3F6 (4 features)
  ...

✅ Processing complete
   Total features: 2156
   Processed: 2156
   Errors: 0

💾 Writing output to: pricing_features_processed.json
✅ Output written successfully

════════════════════════════════════════════════════════════
  PIPELINE COMPLETE
════════════════════════════════════════════════════════════
  ✅ Processed 328 pricing pages
  ✅ Processed 2156 features
  📁 Output: pricing_features_processed.json
════════════════════════════════════════════════════════════
```

## Complete Workflow

```bash
# 1. Install Python dependencies
pip3 install -r requirements.txt

# 2. Fetch pricing features from API
python3 fetch_pricing_features.py
# Output: pricing_features_output.json

# 3. Install Node.js dependencies (from parent directory)
cd "../"
npm install
npm install remark-html
cd "validate-ast"

# 4. Process features through markdown pipeline
node process_features_pipeline.js
# Output: pricing_features_processed.json

# 5. Compare HTML output from rawMD vs astMD
node compare_html_output.js
# Output: html_comparison_results.json & html_comparison_report.md
```

---

# HTML Comparison Tool

After processing features through the pipeline, you can validate that the HTML rendering is identical for both `rawMD` and `astMD` versions.

## What It Does

The `compare_html_output.js` script:

1. **Reads** `pricing_features_processed.json`
2. **Renders** both `rawMD` and `astMD` to HTML using `remark-html`
3. **Compares** the HTML output to check if they're identical
4. **Flags** any features where HTML rendering differs
5. **Generates** a detailed report with examples

## Why This Matters

Even if markdown text looks different (e.g., `---` vs `***` for horizontal rules), they should render to the **same HTML**. This tool validates that the AST conversion preserves the visual output.

## How to Run

```bash
# Run comparison on default input
node compare_html_output.js

# Or specify custom input
node compare_html_output.js custom-processed-features.json
```

## Output Files

### 1. `html_comparison_results.json`

Complete comparison data in JSON format with all HTML outputs and comparison details.

### 2. `html_comparison_report.md`

Human-readable markdown report with:
- Summary statistics (total features, flagged count, percentages)
- List of all flagged features with differences
- Side-by-side comparison of markdown and HTML
- Specific differences highlighted

## Example Report

```markdown
# HTML Comparison Report: rawMD vs astMD

## Summary

- **Total Pricing Pages**: 328
- **Total Features**: 2157
- **Flagged Features**: 5 (0.23%)
- **Identical Features**: 2152 (99.77%)

## ✅ All Features Identical!

All features rendered identically from both rawMD and astMD.
No issues detected - the AST conversion preserves markdown rendering perfectly.
```

Or if there are differences:

```markdown
## ⚠️ Flagged Features

### Pricing Page: `01JXJE4HENFW7A51F6QP80G4QY`

#### 1. Feature: `feat2`

**Comparison**:
- Raw HTML length: 1234 chars
- AST HTML length: 1240 chars  
- Difference: 6 chars

**Raw Markdown** (excerpt)
**AST Markdown** (excerpt)
**Raw HTML** (excerpt)
**AST HTML** (excerpt)
```

## Interpreting Results

### ✅ Identical (Goal: 99%+)
When features are identical:
- AST conversion preserves markdown structure perfectly
- Both versions render the same visual output
- Safe to migrate to AST-based storage

### ⚠️ Flagged Features
If features are flagged, review the report to check:
- Is it just whitespace differences? (Usually harmless)
- HTML entity encoding differences? (e.g., `&amp;` vs `&`)
- Structural differences that affect rendering?
- Edge cases in markdown syntax?

## Common Differences (Usually Harmless)

1. **Whitespace normalization** - Extra spaces/newlines
2. **Horizontal rules** - `<hr>` rendered same way regardless
3. **List formatting** - Different HTML structure but same visual output
4. **Link formatting** - URL encoding differences

## Common Differences (Need Attention)

1. **Missing content** - Text dropped during conversion
2. **Different heading levels** - `<h1>` vs `<h2>`
3. **Broken links** - `<a>` tags malformed
4. **Lost formatting** - Bold/italic not preserved

---

## Troubleshooting Pipeline

### Error: Cannot find module 'unified'

The pipeline requires Node.js packages. Install them from the `md to AST` directory:

```bash
cd "../../"
npm install
cd "validate-ast/generate-markdown"
node process_features_pipeline.js
```

### Error: Cannot find '../lib/format-markdown.js'

Make sure you're running the script from the `generate-markdown` folder, and the parent directory structure is intact.

### Features with errors in output

Check the `error` field in the output JSON for features that failed processing. Common issues:
- Invalid markdown syntax
- Unrecognized markdown patterns
- Empty or malformed feature strings

