#!/usr/bin/env python3
"""
Job-Finder: Run the full pipeline
  1. Analyze seed sites
  2. Discover similar platforms
  3. Generate report
"""
import json
import os
import sys
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

OUTPUT_DIR = os.path.join(BASE_DIR, "output")
os.makedirs(OUTPUT_DIR, exist_ok=True)


def main():
    print("=" * 70)
    print("  JOB-FINDER PIPELINE")
    print("  Finding remote AI/talent platforms compatible with Ethiopia")
    print("=" * 70)

    step = 1
    print(f"\n{'='*40}")
    print(f"  STEP {step}: Analyzing Seed Sites")
    print(f"{'='*40}")
    from analyzers.seed_analyzer import main as analyze_seeds
    seed_file = analyze_seeds()
    print(f"\n  [DONE] Seed analysis saved to: {seed_file}")

    step += 1
    print(f"\n{'='*40}")
    print(f"  STEP {step}: Discovering Similar Platforms")
    print(f"{'='*40}")
    from crawler.discoverer import main as discover
    results = discover()

    print(f"\n{'='*40}")
    print(f"  PIPELINE COMPLETE")
    print(f"{'='*40}")
    print(f"  Compatible platforms found: {results.get('compatible_count', 0)}")
    print(f"  Platforms to investigate: {results.get('maybe_count', 0)}")
    print(f"\n  Check output/ for detailed results.")

    return results


if __name__ == "__main__":
    main()
