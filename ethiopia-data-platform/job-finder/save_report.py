import json

data = {
    "report_title": "US/EU AI Task Platforms Compatible with Ethiopia",
    "updated": "2026-06-17",
    "note": "Platforms where you do AI tasks (annotation, testing, eval) and get paid. Not Toptal/Turing/Upwork.",
    "tier1_elite": [
        {
            "name": "DataAnnotation.tech",
            "url": "https://dataannotation.tech",
            "headquarters": "New York, USA",
            "pay": "$25-$60+/hr (Generalist $25-30, Coding $40-60, Expert $50-100+)",
            "why": "THE gold standard. US company. Do AI training tasks hourly. Coding + non-coding. Flexible.",
            "ethiopia": "Likely open globally"
        },
        {
            "name": "Outlier (Scale AI)",
            "url": "https://outlier.ai",
            "headquarters": "San Francisco, USA",
            "pay": "$15-$50/hr",
            "why": "Scale AI owns it ($13.8B). 52 countries. AI eval tasks. High volume but project-volatile.",
            "ethiopia": "52 countries listed - check"
        },
        {
            "name": "Mercor",
            "url": "https://mercor.com",
            "headquarters": "San Francisco, USA",
            "pay": "$25-$60+/hr",
            "why": "AI-native gig platform. $250M valuation. Connects to top AI labs.",
            "ethiopia": "Likely global - newer platform"
        },
        {
            "name": "Alignerr (Labelbox)",
            "url": "https://alignerr.com",
            "headquarters": "USA",
            "pay": "$15-$60/hr (expert up to $90/hr)",
            "why": "Newer platform = less competition. AI training + evaluation.",
            "ethiopia": "Unknown - needs verification"
        },
        {
            "name": "Surge AI",
            "url": "https://surgehq.ai",
            "headquarters": "San Francisco, USA",
            "pay": "$25-$50+/hr",
            "why": "Top RLHF platform. Works with frontier AI labs. Quality work.",
            "ethiopia": "Likely global"
        },
        {
            "name": "Prolific",
            "url": "https://prolific.com",
            "headquarters": "Oxford, UK (Europe!)",
            "pay": "Up to $150/hr for AI specialists",
            "why": "UK-based. Academic research + AI training. High trust. Global.",
            "ethiopia": "CONFIRMED open globally"
        }
    ],
    "tier2_reliable": [
        {
            "name": "Appen",
            "url": "https://appen.com",
            "headquarters": "Australia/US",
            "pay": "$10-$25/hr task-based",
            "why": "Veteran in AI data. Gen-AI focused now. Long-term projects.",
            "ethiopia": "Open globally"
        },
        {
            "name": "Telus International",
            "url": "https://telusinternational.com",
            "headquarters": "Canada (North America)",
            "pay": "$25-$34/hr transcription/data",
            "why": "Large company. Data annotation, transcription, search eval.",
            "ethiopia": "Open in many countries"
        },
        {
            "name": "Clickworker",
            "url": "https://clickworker.com",
            "headquarters": "Germany (Europe!)",
            "pay": "Task-based, variable",
            "why": "EU-based micro-task + AI data. Works with LXT.",
            "ethiopia": "Open globally"
        },
        {
            "name": "LXT",
            "url": "https://lxt.ai",
            "headquarters": "USA",
            "pay": "$15-$30/hr",
            "why": "AI training data + transcription. Partners with clickworker.",
            "ethiopia": "Global via clickworker"
        }
    ],
    "tier3_newer_less_congested": [
        {
            "name": "HireCade",
            "url": "https://hirecade.com",
            "headquarters": "USA (emerging)",
            "pay": "$20-$50/hr",
            "why": "NEW platform - fewer workers. AI data annotation marketplace.",
            "ethiopia": "Unknown - check"
        },
        {
            "name": "Abaka AI",
            "url": "https://abaka.ai",
            "headquarters": "USA (newer)",
            "pay": "Unknown",
            "why": "Emerging AI training platform. Tracked by AIWorkfinder.",
            "ethiopia": "Unknown"
        },
        {
            "name": "Meridial (Invisible Tech)",
            "url": "https://meridial.ai",
            "headquarters": "USA",
            "pay": "$30-$70/hr (expert)",
            "why": "Expert network for AI training. Projects from frontier labs.",
            "ethiopia": "Global - 70 countries"
        },
        {
            "name": "Perle AI (Winnow)",
            "url": "https://perle.ai",
            "headquarters": "San Francisco, USA",
            "pay": "$40-$80/hr (experts)",
            "why": "Hiring platform for AI domain experts. Used by frontier labs.",
            "ethiopia": "70 countries likely"
        },
        {
            "name": "SuperAnnotate",
            "url": "https://superannotate.com",
            "headquarters": "San Mateo, CA, USA",
            "pay": "Varies",
            "why": "Backed by NVIDIA. Enterprise AI data platform with annotation services.",
            "ethiopia": "Check"
        }
    ],
    "aggregators": [
        {"name": "AIWorkfinder", "url": "https://aiworkfinder.com", "why": "Aggregates Mercor, Outlier, Alignerr, Abaka, Micro1 in one feed"},
        {"name": "DataAnnotationJobs.org", "url": "https://dataannotationjobs.org", "why": "Job board for Scale AI, Surge AI, Mercor, etc."},
        {"name": "Remotech.ai", "url": "https://remotech.ai", "why": "Global aggregator for AI jobs, $25-$200/hr"}
    ],
    "summary": {
        "total": 22,
        "best_first": ["DataAnnotation.tech", "Prolific", "Outlier"],
        "then_check": ["Mercor", "Alignerr", "Surge AI", "Meridial"],
        "europe_based": ["Prolific (UK)", "Clickworker (Germany)"],
        "us_based": ["DataAnnotation.tech (NY)", "Outlier/SF", "Mercor/SF", "Surge AI/SF", "Alignerr/US", "Perle AI/SF", "SuperAnnotate/CA", "Meridial/US"],
        "avoid": ["Toptal", "Turing", "Upwork"]
    }
}

with open("/home/ubuntu/ethiopia-data-platform/job-finder/output/us_eu_ai_task_platforms.json", "w") as f:
    json.dump(data, f, indent=2)

print("Saved successfully")
print(f"Platforms: {sum(len(data[t]) for t in ['tier1_elite','tier2_reliable','tier3_newer_less_congested'])}")
for tierlist, label in [("tier1_elite", "ELITE"), ("tier2_reliable", "RELIABLE"), ("tier3_newer_less_congested", "NEWER")]:
    for p in data[tierlist]:
        print(f"  [{label}] {p['name']:30s} | {p['headquarters']:25s} | {p.get('pay','')[:25]}")
