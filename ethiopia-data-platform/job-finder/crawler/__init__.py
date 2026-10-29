from pathlib import Path

BASE_DIR = Path(__file__).parent
OUTPUT_DIR = BASE_DIR / "output"
SEED_DIR = BASE_DIR / "seed_data"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
SEED_DIR.mkdir(parents=True, exist_ok=True)

ETHIOPIA_SIGNALS = [
    "ethiopia", "ethiopian", "addis ababa", "east africa",
    "africa", "global", "worldwide", "anywhere", "international",
]

REGION_EXCLUSIONS = [
    "latin america", "latam", "nearshore",
]

SEED_URLS = {
    "bespokelabs": "https://bespokelabs.ai",
    "micro1": "https://micro1.ai",
    "revelo": "https://revelo.com",
}
