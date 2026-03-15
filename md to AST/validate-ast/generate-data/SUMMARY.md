# Pricing Features Processing Summary

## Files Created

1. **`fetch_pricing_features.py`** - Fetches pricing pages from Chargebee API
2. **`process_features_pipeline.js`** - Processes features through markdown → AST → markdown pipeline
3. **`README_fetch_pricing_features.md`** - Complete documentation for both tools

## Pipeline Flow

```
CSV Input (mostVisitedPricingPages.csv)
    ↓
[Python Script] fetch_pricing_features.py
    ↓
pricing_features_output.json (696 KB, 328 pricing pages, 2157 features)
    ↓
[Node.js Script] process_features_pipeline.js
    ↓
pricing_features_processed.json (1.4 MB)
```

## What Each Script Does

### 1. fetch_pricing_features.py (Python)
- **Input**: CSV with pricing_page_id and site_id
- **Process**:
  - Fetches pricing pages from API in parallel (8 processes)
  - Batches of 50 items per process for memory efficiency
  - Extracts features from `pricingTable.items[].features`
- **Output**: JSON array with pricing page ID and raw feature strings

### 2. process_features_pipeline.js (Node.js)
- **Input**: pricing_features_output.json
- **Process**:
  - Applies `formatMarkdown()` to normalize markdown (rawMD)
  - Parses to AST using unified/remark
  - Converts AST back to markdown (ASTtoMD)
- **Output**: JSON with both versions for comparison

## Output Format

```json
{
  "meta": {
    "generatedAt": "2026-03-15T19:09:24.684Z",
    "totalPricingPages": 328,
    "totalFeatures": 2157,
    "processedFeatures": 2157,
    "errorCount": 0,
    "pipeline": "formatMarkdown → AST → markdown"
  },
  "data": [
    {
      "pricingPageId": "01JXJE4HENFW7A51F6QP80G4QY",
      "features": {
        "feat1": {
          "rawMD": "# What's included\n\n---\n\n✅ Basic Membership\n\n---",
          "ASTtoMD": "# What's included\n\n***\n\n✅ Basic Membership\n\n***\n"
        }
      }
    }
  ]
}
```

## Results

### Fetch Script (Python)
- ✅ Processed: 328 pricing pages
- ✅ Successful: 326 (99.4%)
- ❌ Failed: 2 (404 errors - pages not found)
- ⏱️ Time: ~55 seconds
- 📁 Output: 696 KB

### Pipeline Script (Node.js)
- ✅ Processed: 328 pricing pages
- ✅ Features processed: 2,157
- ❌ Errors: 0
- ⏱️ Time: ~2 seconds
- 📁 Output: 1.4 MB

## How to Run

### Complete Workflow

```bash
# 1. Install Python dependencies
pip3 install -r requirements.txt

# 2. Fetch pricing features from API
python3 fetch_pricing_features.py

# 3. Install Node.js dependencies (from parent directory)
cd "../../"
npm install
cd "validate-ast/generate-markdown"

# 4. Process features through markdown pipeline
node process_features_pipeline.js
```

## Key Features

### Memory Efficiency
- Python script processes in batches of 50 items
- Maximum 400 items in memory at once (8 processes × 50)
- Scales to datasets of any size

### Parallel Processing
- 8 concurrent processes
- True parallelism using Python multiprocessing
- No race conditions - sequential file writes

### AST Validation
- Converts markdown → AST → markdown
- Both versions in output for comparison
- Helps identify markdown that doesn't roundtrip correctly

## Use Cases

1. **API Data Extraction**: Bulk fetch pricing page features from Chargebee
2. **Markdown Validation**: Test if features survive AST conversion
3. **Migration Testing**: Validate markdown before migrating to AST-based storage
4. **Debugging**: Compare rawMD vs ASTtoMD to find conversion issues

## Notes

- Use `python3` and `pip3` (not `python` and `pip`)
- Requires Node.js packages: unified, remark-parse, remark-stringify, remark-gfm
- Output files are valid JSON with proper formatting
