#!/usr/bin/env python3
import sys, json

data = json.load(sys.stdin)
regions = data.get("data", {}).get("regions", [])

sep = "=" * 70
dash = "-" * 60

for region in regions:
    print(f"\n{sep}")
    print(f"  {region['name'].upper()}")
    rd = region.get("director")
    if rd:
        print(f"  Regional Director: {rd['name']} ({rd['email']} / password123)")
    print(sep)

    for area in region.get("areas", []):
        am = area.get("manager")
        am_name = am["name"] + f" ({am['email']} / password123)" if am else "N/A"
        print(f"\n  >>> {area['name'].upper()} <<<  (Area Mgr: {am_name})")
        print(f"  {dash}")

        for branch in area.get("branches", []):
            bm = branch.get("manager")
            bm_name = bm["name"] + f" ({bm['email']} / password123)" if bm else "N/A"
            print(f"\n  ** {branch['name']} -- BM: {bm_name} **")

            staff = branch.get("users", [])
            msms = [u for u in staff if u["role"] == "lineManager"]
            accountants = [u for u in staff if u["role"] == "subTeamLeader"]
            msos = [u for u in staff if u["role"] == "staff"]

            for u in msms:
                print(f"     MSM:  {u['name']:25s} {u['email']:35s} / password123")
            for u in accountants:
                print(f"     ACCT: {u['name']:25s} {u['email']:35s} / password123")
            for u in msos:
                print(f"     MSO:  {u['name']:25s} {u['email']:35s} / password123")
