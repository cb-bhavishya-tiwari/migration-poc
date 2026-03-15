#!/usr/bin/env python3
"""
Fetch pricing page features from Chargebee API using multiprocessing.
Processes data in batches to avoid memory overflow.
"""

import csv
import json
import requests
from multiprocessing import Pool, Lock
from typing import List, Dict, Any
import sys
from pathlib import Path
import os


def fetch_pricing_page(args: tuple) -> Dict[str, Any]:
    """
    Fetch a single pricing page and extract features.
    
    Args:
        args: Tuple of (pricing_page_id, site_id, row_index)
    
    Returns:
        Dictionary with pricing_page_id and features dict
    """
    pricing_page_id, site_id, row_index = args
    
    url = f"https://api.pricify.chargebee.com/api/v1/public/sites/{site_id}/pricing_pages/{pricing_page_id}"
    
    try:
        print(f"[Row {row_index}] Fetching: {pricing_page_id}")
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        
        # Extract features from pricingTable.items
        features_dict = {}
        if 'pricingTable' in data and 'items' in data['pricingTable']:
            items = data['pricingTable']['items']
            
            for idx, item in enumerate(items):
                if 'features' in item and item['features']:
                    # Use item index as key (or you can use item name/id if available)
                    key = f"feat{idx + 1}"
                    features_dict[key] = item['features']
        
        result = {
            "pricing_page_id": pricing_page_id,
            "features": features_dict
        }
        
        print(f"[Row {row_index}] ✓ Success: {pricing_page_id} ({len(features_dict)} features)")
        return result
        
    except requests.exceptions.RequestException as e:
        print(f"[Row {row_index}] ✗ Error fetching {pricing_page_id}: {str(e)}", file=sys.stderr)
        return {
            "pricing_page_id": pricing_page_id,
            "features": {},
            "error": str(e)
        }
    except (KeyError, json.JSONDecodeError) as e:
        print(f"[Row {row_index}] ✗ Error parsing {pricing_page_id}: {str(e)}", file=sys.stderr)
        return {
            "pricing_page_id": pricing_page_id,
            "features": {},
            "error": str(e)
        }


def process_batch(batch_args: tuple) -> Dict[str, Any]:
    """
    Process a batch of pricing pages and return results with metadata.
    This runs in a separate process.
    
    Args:
        batch_args: Tuple of (batch_tasks, batch_num)
    
    Returns:
        Dict with batch_num and results
    """
    batch_tasks, batch_num = batch_args
    
    print(f"[Batch {batch_num}] Starting {len(batch_tasks)} tasks")
    results = []
    
    for args in batch_tasks:
        result = fetch_pricing_page(args)
        results.append(result)
    
    print(f"[Batch {batch_num}] ✓ Completed {len(results)} tasks")
    
    return {
        "batch_num": batch_num,
        "results": results
    }


def chunk_list(lst: List, chunk_size: int) -> List[List]:
    """
    Split a list into chunks of specified size.
    
    Args:
        lst: List to split
        chunk_size: Maximum size of each chunk
    
    Returns:
        List of chunks
    """
    return [lst[i:i + chunk_size] for i in range(0, len(lst), chunk_size)]


def main():
    # Configuration
    CSV_INPUT = "mostVisitedPricingPages.csv"
    JSON_OUTPUT = "pricing_features_output.json"
    NUM_PROCESSES = 8
    BATCH_SIZE = 50  # Max items per batch per process
    
    # Read CSV file
    print(f"Reading CSV file: {CSV_INPUT}")
    csv_path = Path(CSV_INPUT)
    
    if not csv_path.exists():
        print(f"Error: CSV file not found at {CSV_INPUT}", file=sys.stderr)
        sys.exit(1)
    
    tasks = []
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader, start=1):
            pricing_page_id = row['pricing_page_id']
            site_id = row['site_id']
            tasks.append((pricing_page_id, site_id, idx))
    
    total_tasks = len(tasks)
    print(f"Found {total_tasks} pricing pages to fetch")
    print(f"Using {NUM_PROCESSES} parallel processes")
    print(f"Batch size: {BATCH_SIZE} items per batch")
    print("-" * 60)
    
    # Split tasks into batches of BATCH_SIZE
    batches = chunk_list(tasks, BATCH_SIZE)
    total_batches = len(batches)
    print(f"Split into {total_batches} batches")
    print("-" * 60)
    
    # Initialize output file with empty array
    print(f"Initializing output file: {JSON_OUTPUT}")
    with open(JSON_OUTPUT, 'w', encoding='utf-8') as f:
        f.write("[\n")
    
    # Process batches in rounds
    all_results = []
    successful_count = 0
    failed_count = 0
    
    # Process batches in rounds of NUM_PROCESSES at a time
    for round_start in range(0, total_batches, NUM_PROCESSES):
        round_end = min(round_start + NUM_PROCESSES, total_batches)
        current_round = (round_start // NUM_PROCESSES) + 1
        total_rounds = (total_batches + NUM_PROCESSES - 1) // NUM_PROCESSES
        
        print(f"\n{'='*60}")
        print(f"Round {current_round}/{total_rounds}: Processing batches {round_start+1} to {round_end}")
        print(f"{'='*60}")
        
        # Get batches for this round
        round_batches = batches[round_start:round_end]
        
        # Prepare arguments for each batch
        batch_args = [(batch, round_start + i + 1) for i, batch in enumerate(round_batches)]
        
        # Process this round in parallel
        with Pool(processes=NUM_PROCESSES) as pool:
            batch_results = pool.map(process_batch, batch_args)
        
        # Collect results from this round
        print(f"\n[Round {current_round}] All batches completed. Aggregating...")
        
        round_results = []
        for batch_result in batch_results:
            round_results.extend(batch_result['results'])
        
        # Count stats for this round
        round_successful = sum(1 for r in round_results if 'error' not in r)
        round_failed = len(round_results) - round_successful
        successful_count += round_successful
        failed_count += round_failed
        
        print(f"[Round {current_round}] Collected {len(round_results)} results")
        print(f"[Round {current_round}] Success: {round_successful}, Failed: {round_failed}")
        
        # Append results to file
        print(f"[Round {current_round}] Writing to file...")
        with open(JSON_OUTPUT, 'a', encoding='utf-8') as f:
            for i, result in enumerate(round_results):
                # Check if this is the very first entry
                is_first = (round_start == 0 and i == 0)
                # Check if this is the very last entry
                is_last = (round_end == total_batches and i == len(round_results) - 1)
                
                if not is_first:
                    f.write(",\n")
                
                json_str = json.dumps(result, ensure_ascii=False, indent=2)
                # Indent the JSON for readability
                indented = '\n'.join('  ' + line for line in json_str.split('\n'))
                f.write(indented)
        
        print(f"[Round {current_round}] ✓ Written to file")
        
        # Clear round results from memory
        del round_results
        del batch_results
    
    # Close the JSON array
    with open(JSON_OUTPUT, 'a', encoding='utf-8') as f:
        f.write("\n]\n")
    
    print("\n" + "=" * 60)
    print(f"✓ All processing complete!")
    print(f"Total processed: {total_tasks}")
    print(f"Successful: {successful_count}, Failed: {failed_count}")
    print(f"Results saved to: {JSON_OUTPUT}")
    print("=" * 60)


if __name__ == "__main__":
    main()
