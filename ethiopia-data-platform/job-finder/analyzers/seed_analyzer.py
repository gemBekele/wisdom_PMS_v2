import json
import os
import re
import sys
from datetime import datetime
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

SEEDS = {
    "bespokelabs": "https://bespokelabs.ai",
    "micro1": "https://micro1.ai",
    "revelo": "https://revelo.com",
}

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "output")
SEED_DIR = os.path.join(os.path.dirname(__file__), "..", "seed_data")

ETHIOPIA_KEYWORDS = [
    "ethiopia", "ethiopian", "africa", "east africa", "addis ababa",
    "global", "worldwide", "remote", "anywhere",
]

EXCLUDE_COUNTRIES = [
    "latin america", "latam", "brazil", "argentina", "mexico", "colombia",
    "peru", "chile", "costa rica", "panama", "uruguay",
    "nearshore",
]

SIMILARITY_SIGNALS = [
    "remote job", "work from home", "remote developer", "hire developer",
    "tech talent", "software engineer", "ai engineer", "machine learning",
    "freelance developer", "contract developer", "global talent",
    "developer marketplace", "talent marketplace", "tech staffing",
    "ai training", "human data", "llm training", "rlhf",
    "expert network", "freelance platform",
]


def fetch_page(url, timeout=15):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    }
    try:
        resp = requests.get(url, headers=headers, timeout=timeout, verify=False)
        resp.raise_for_status()
        return resp.text, resp.status_code
    except Exception as e:
        return None, str(e)


def extract_text_features(html):
    if not html:
        return "", [], []
    soup = BeautifulSoup(html, "html.parser")
    text = soup.get_text(separator=" ", strip=True).lower()
    meta_desc = ""
    meta_tag = soup.find("meta", attrs={"name": "description"})
    if meta_tag and meta_tag.get("content"):
        meta_desc = meta_tag["content"].lower()
    title = soup.title.string.strip().lower() if soup.title else ""
    return text + " " + meta_desc + " " + title


def analyze_seed_site(name, url):
    print(f"\n{'='*60}")
    print(f"  Analyzing: {name} ({url})")
    print(f"{'='*60}")

    html, status = fetch_page(url)
    result = {
        "name": name,
        "url": url,
        "status": status,
        "analyzed_at": datetime.utcnow().isoformat(),
        "allows_ethiopia": None,
        "platform_type": None,
        "target_region": None,
        "similarity_score": 0,
        "signals_found": [],
        "notes": [],
    }

    if not html:
        result["status"] = f"FETCH_ERROR: {status}"
        print(f"  [ERROR] Failed to fetch: {status}")
        return result

    text = extract_text_features(html)
    result["status"] = status

    content_lower = text.lower()

    for signal in SIMILARITY_SIGNALS:
        if signal in content_lower:
            result["signals_found"].append(signal)
            result["similarity_score"] += 1

    for kw in ETHIOPIA_KEYWORDS:
        if kw in content_lower:
            result["notes"].append(f"mentions '{kw}'")

    for ex in EXCLUDE_COUNTRIES:
        if ex in content_lower:
            if result["target_region"] is None:
                result["target_region"] = []
            result["target_region"].append(ex)

    if "latin america" in content_lower or "latam" in content_lower or "brazil" in content_lower:
        result["allows_ethiopia"] = False
        result["notes"].append("FOCUSED_ON_LATAM")
    elif "global" in content_lower or "worldwide" in content_lower or "anywhere" in content_lower:
        result["allows_ethiopia"] = True
        result["notes"].append("GLOBAL_PLATFORM")
    elif "africa" in content_lower or "ethiopia" in content_lower:
        result["allows_ethiopia"] = True
        result["notes"].append("INCLUDES_AFRICA")

    if "hire developer" in content_lower or "talent marketplace" in content_lower:
        result["platform_type"] = "talent marketplace"
    elif "ai training" in content_lower or "human data" in content_lower:
        result["platform_type"] = "ai data platform"
    elif "remote job" in content_lower or "freelance" in content_lower:
        result["platform_type"] = "freelance platform"
    elif "research lab" in content_lower or "ai research" in content_lower:
        result["platform_type"] = "ai research lab"

    print(f"  Status: {status}")
    print(f"  Type: {result['platform_type']}")
    print(f"  Allows Ethiopia: {result['allows_ethiopia']}")
    print(f"  Target Region: {result['target_region']}")
    print(f"  Similarity Score: {result['similarity_score']}/13")
    print(f"  Signals: {', '.join(result['signals_found'][:6]) or 'none'}")
    print(f"  Notes: {'; '.join(result['notes']) or 'none'}")

    return result


def save_results(results):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(SEED_DIR, exist_ok=True)

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")

    filepath = os.path.join(OUTPUT_DIR, f"seed_analysis_{timestamp}.json")
    with open(filepath, "w") as f:
        json.dump(results, f, indent=2, default=str)
    print(f"\n  [SAVED] {filepath}")

    seed_analysis_path = os.path.join(SEED_DIR, "seed_analysis.json")
    with open(seed_analysis_path, "w") as f:
        json.dump(results, f, indent=2, default=str)
    print(f"  [SAVED] {seed_analysis_path}")

    summary = {}
    for name, r in results.items():
        summary[name] = {
            "url": r["url"],
            "type": r.get("platform_type"),
            "allows_ethiopia": r.get("allows_ethiopia"),
            "region": r.get("target_region"),
            "score": r.get("similarity_score"),
        }
    summary_path = os.path.join(OUTPUT_DIR, f"seed_summary_{timestamp}.json")
    with open(summary_path, "w") as f:
        json.dump(summary, f, indent=2)

    return seed_analysis_path


def main():
    print("=" * 60)
    print("  JOB-FINDER: Seed Site Analyzer")
    print("  Analyzing reference websites for pattern matching")
    print("=" * 60)

    results = {}
    for name, url in SEEDS.items():
        results[name] = analyze_seed_site(name, url)

    seed_file = save_results(results)

    print(f"\n{'='*60}")
    print(f"  Analysis complete! Seed data saved.")
    print(f"  Ready for discovery phase.")
    print(f"{'='*60}")

    return seed_file


if __name__ == "__main__":
    main()
