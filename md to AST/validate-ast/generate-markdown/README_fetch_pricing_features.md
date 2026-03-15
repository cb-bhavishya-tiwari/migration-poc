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
