import json
import os
import sys
import time
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from bs4 import BeautifulSoup

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "output")
SEED_DIR = os.path.join(os.path.dirname(__file__), "..", "seed_data")

ETHIOPIA_KEYWORDS = [
    "ethiopia", "ethiopian", "addis ababa", "east africa",
]
GLOBAL_SIGNALS = [
    "global", "worldwide", "anywhere", "remote",
]
LATAM_EXCLUSIONS = [
    "latin america", "latam", "nearshore",
]

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

SEARCH_QUERIES = [
    "remote ai engineer jobs ethiopia",
    "hire african software developers platform",
    "global remote developer marketplace africa",
    "ai training remote jobs worldwide",
    "freelance ai engineer platform remote",
    "tech talent marketplace africa",
    "remote machine learning jobs global",
    "hire ethiopian developers platform",
    "africa remote tech talent marketplace",
    "ai data training remote jobs anywhere",
    "remote software engineer jobs africa no restriction",
    "global freelance platform for developers africa",
    "international remote job platform for africans",
]


def search_web(query, max_results=10):
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    search_url = f"https://www.google.com/search?q={requests.utils.quote(query)}&num={max_results}"
    try:
        resp = requests.get(search_url, headers=headers, timeout=15, verify=False)
        if resp.status_code != 200:
            return []
        soup = BeautifulSoup(resp.text, "html.parser")
        links = []
        for a in soup.select("a[href]"):
            href = a["href"]
            if href.startswith("/url?q="):
                url = href.split("/url?q=")[1].split("&")[0]
                if url and not url.startswith("http"):
                    url = "https://" + url
                links.append(url)
        seen = set()
        unique = []
        for url in links:
            if url not in seen:
                seen.add(url)
                unique.append(url)
        return unique[:max_results]
    except Exception as e:
        print(f"  [SEARCH ERROR] {query}: {e}")
        return []


def classify_site(url):
    headers = {
        "User-Agent": USER_AGENT,
    }
    try:
        resp = requests.get(url, headers=headers, timeout=15, verify=False)
        if resp.status_code != 200:
            return url, {"status": resp.status_code, "error": "bad_status"}
        html = resp.text
        soup = BeautifulSoup(html, "html.parser")
        text = soup.get_text(separator=" ", strip=True).lower()
        title = soup.title.string.strip().lower() if soup.title else ""
        meta_desc = ""
        m = soup.find("meta", attrs={"name": "description"})
        if m and m.get("content"):
            meta_desc = m["content"].lower()
        full_text = text + " " + meta_desc + " " + title

        result = {
            "url": url,
            "title": title[:100] if title else "",
            "status": resp.status_code,
            "ethiopia_mentions": [],
            "allows_ethiopia": None,
            "is_latam_focused": False,
            "platform_type": None,
            "similarity_score": 0,
            "signals": [],
            "reasons": [],
        }

        for kw in ETHIOPIA_KEYWORDS:
            if kw in full_text:
                result["ethiopia_mentions"].append(kw)
                result["allows_ethiopia"] = True
                result["reasons"].append(f"mentions_{kw}")

        if result["allows_ethiopia"] is None:
            for kw in GLOBAL_SIGNALS:
                if kw in full_text:
                    result["allows_ethiopia"] = True
                    result["reasons"].append(f"global_signal_{kw}")
                    break

        for excl in LATAM_EXCLUSIONS:
            if excl in full_text:
                result["is_latam_focused"] = True
                result["allows_ethiopia"] = False
                result["reasons"].append(f"latam_exclusion_{excl}")

        if result["allows_ethiopia"] is None:
            result["allows_ethiopia"] = "unknown"

        signals = [
            ("remote", "remote_work"),
            ("freelance", "freelance"),
            ("talent marketplace", "talent_marketplace"),
            ("hire developer", "hire_developer"),
            ("software engineer", "software_engineer"),
            ("ai engineer", "ai_engineer"),
            ("machine learning", "machine_learning"),
            ("remote job", "remote_job"),
            ("tech talent", "tech_talent"),
            ("developer marketplace", "dev_marketplace"),
            ("ai training", "ai_training"),
            ("human data", "human_data"),
            ("llm training", "llm_training"),
            ("global talent", "global_talent"),
            ("work from home", "work_from_home"),
            ("contract developer", "contract_dev"),
            ("expert network", "expert_network"),
        ]
        for signal, key in signals:
            if signal in full_text:
                result["signals"].append(key)
                result["similarity_score"] += 1

        if "job" in full_text or "career" in full_text or "apply" in full_text:
            result["platform_type"] = "job platform"
        elif "hire" in full_text and ("developer" in full_text or "engineer" in full_text):
            result["platform_type"] = "talent marketplace"
        elif "ai" in full_text and ("train" in full_text or "data" in full_text):
            result["platform_type"] = "ai/data platform"
        elif "freelance" in full_text or "freelancer" in full_text:
            result["platform_type"] = "freelance platform"

        return url, result

    except Exception as e:
        return url, {"url": url, "status": "error", "error": str(e)}


def main():
    print("=" * 70)
    print("  JOB-FINDER: Discovery Crawler")
    print("  Searching for similar platforms across the web")
    print("=" * 70)

    seed_file = os.path.join(SEED_DIR, "seed_analysis.json")
    if os.path.exists(seed_file):
        with open(seed_file) as f:
            seed_data = json.load(f)
        print(f"\n  [INFO] Loaded seed analysis from {seed_file}")
        for name, data in seed_data.items():
            print(f"    - {name}: {data.get('platform_type')} | score={data.get('similarity_score')}")
    else:
        print(f"\n  [WARN] No seed analysis found. Run seed_analyzer.py first.")
        seed_data = {}

    all_urls = set()
    print(f"\n  [SEARCH] Running {len(SEARCH_QUERIES)} search queries...")
    for i, query in enumerate(SEARCH_QUERIES):
        print(f"    [{i+1}/{len(SEARCH_QUERIES)}] Searching: {query[:60]}...")
        urls = search_web(query)
        for url in urls:
            all_urls.add(url)
        time.sleep(1.5)

    print(f"\n  [DISCOVERED] {len(all_urls)} unique URLs from search")

    target_domains = set()
    for url in all_urls:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        if domain.startswith("www."):
            domain = domain[4:]
        skip_domains = {
            "google.com", "youtube.com", "linkedin.com", "facebook.com",
            "twitter.com", "x.com", "reddit.com", "github.com",
            "stackoverflow.com", "medium.com", "quora.com",
        }
        if domain and domain not in skip_domains:
            target_domains.add((domain, url))

    print(f"  [TARGETS] {len(target_domains)} candidate domains to analyze")

    results = {}
    print(f"\n  [CLASSIFY] Analyzing {len(target_domains)} sites...")
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(classify_site, url): (domain, url)
                   for domain, url in target_domains}
        done = 0
        for future in as_completed(futures):
            domain, url = futures[future]
            done += 1
            try:
                _, result = future.result()
                results[domain] = result
            except Exception as e:
                results[domain] = {"url": url, "status": "error", "error": str(e)}
            if done % 10 == 0 or done == len(futures):
                print(f"    ... {done}/{len(futures)} analyzed")

    compatible = {d: r for d, r in results.items()
                  if r.get("allows_ethiopia") is True
                  and not r.get("is_latam_focused")
                  and r.get("similarity_score", 0) >= 2}

    maybe = {d: r for d, r in results.items()
             if r.get("allows_ethiopia") == "unknown"
             and not r.get("is_latam_focused")
             and r.get("similarity_score", 0) >= 3}

    print(f"\n{'='*70}")
    print(f"  RESULTS")
    print(f"{'='*70}")
    print(f"  Total discovered: {len(results)}")
    print(f"  Ethiopia-compatible: {len(compatible)}")
    print(f"  Need deeper check: {len(maybe)}")
    print(f"  Excluded (LatAm focus): {sum(1 for r in results.values() if r.get('is_latam_focused'))}")
    print()

    if compatible:
        print(f"  {'='*40}")
        print(f"  COMPATIBLE PLATFORMS")
        print(f"  {'='*40}")
        sorted_compat = sorted(compatible.items(), key=lambda x: x[1].get("similarity_score", 0), reverse=True)
        for domain, r in sorted_compat[:20]:
            print(f"    [{r.get('similarity_score', 0)}] {domain}")
            print(f"         URL: {r.get('url', '')}")
            print(f"         Type: {r.get('platform_type', '?')}")
            print(f"         Ethiopia: {r.get('allows_ethiopia')}")
            if r.get("reasons"):
                print(f"         Why: {', '.join(r['reasons'][:3])}")
            print()

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    output = {
        "timestamp": timestamp,
        "seed_urls": list(SEARCH_QUERIES) if 'SEARCH_QUERIES' in dir() else [],
        "total_discovered": len(results),
        "compatible_count": len(compatible),
        "maybe_count": len(maybe),
        "compatible": {k: v for k, v in compatible.items()},
        "maybe": {k: v for k, v in maybe.items()},
        "all": results,
    }

    filepath = os.path.join(OUTPUT_DIR, f"discovery_{timestamp}.json")
    with open(filepath, "w") as f:
        json.dump(output, f, indent=2, default=str)
    print(f"\n  [SAVED] Full results to {filepath}")

    summary_file = os.path.join(OUTPUT_DIR, "latest_discovery.json")
    short = {
        "timestamp": timestamp,
        "compatible": {k: {
            "url": v.get("url"),
            "title": v.get("title", "")[:80],
            "type": v.get("platform_type"),
            "score": v.get("similarity_score"),
            "reasons": v.get("reasons", [])[:3],
        } for k, v in sorted(compatible.items(),
                              key=lambda x: x[1].get("similarity_score", 0), reverse=True)},
        "maybe": {k: {
            "url": v.get("url"),
            "type": v.get("platform_type"),
            "score": v.get("similarity_score"),
        } for k, v in sorted(maybe.items(),
                             key=lambda x: x[1].get("similarity_score", 0), reverse=True)},
    }
    with open(summary_file, "w") as f:
        json.dump(short, f, indent=2)
    print(f"  [SAVED] Summary to {summary_file}")

    return output


if __name__ == "__main__":
    main()
