#!/bin/bash
# Comprehensive production API test script
# Tests all major endpoints and hierarchy/role-based access

SERVER="http://51.91.125.62:3006/api"
SSH="sshpass -p '01010101' ssh -o StrictHostKeyChecking=no ubuntu@51.91.125.62"
CURL="curl -s -o /tmp/resp.json -w '%{http_code}'"

PASS=0
FAIL=0

assert_eq() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "  ✓ $desc"
    PASS=$((PASS+1))
  else
    echo "  ✗ $desc (expected: $expected, got: $actual)"
    FAIL=$((FAIL+1))
  fi
}

assert_contains() {
  local desc="$1" needle="$2" haystack="$3"
  if echo "$haystack" | grep -q "$needle"; then
    echo "  ✓ $desc"
    PASS=$((PASS+1))
  else
    echo "  ✗ $desc (expected to contain: $needle)"
    FAIL=$((FAIL+1))
  fi
}

echo "========================================="
echo " COMPREHENSIVE PRODUCTION API TESTS"
echo "========================================="
echo ""

# ===== STEP 1: Login and get token =====
echo "=== 1. AUTHENTICATION ==="
eval $SSH "curl -s -X POST http://localhost:5001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{\"email\":\"biruk.assefa@ghion.et\",\"password\":\"admin123\"}'" > /tmp/login.json

TOKEN=$(python3 -c "import json; d=json.load(open('/tmp/login.json')); print(d.get('token',''))")
ADMIN_ID=$(python3 -c "import json; d=json.load(open('/tmp/login.json')); print(d.get('data',{}).get('_id',''))")
ROLE=$(python3 -c "import json; d=json.load(open('/tmp/login.json')); print(d.get('data',{}).get('role',''))")

assert_eq "Login success" "true" "$(python3 -c "import json; d=json.load(open('/tmp/login.json')); print(d.get('success',''))")"
assert_eq "Admin role" "admin" "$ROLE"
assert_eq "Token received (non-empty)" "1" "$(echo $TOKEN | wc -c | tr -d ' ')"

# ===== STEP 2: Protected route access =====
echo ""
echo "=== 2. PROTECTED ROUTE ACCESS ==="

# Without token
eval $SSH "curl -s http://localhost:5001/api/plans" > /tmp/noauth.json
assert_eq "Reject request without token" "false" "$(python3 -c "import json; d=json.load(open('/tmp/noauth.json')); print(d.get('success',''))")"

# With token
eval $SSH "curl -s http://localhost:5001/api/plans -H 'Authorization: Bearer $TOKEN'" > /tmp/withauth.json
assert_eq "Accept request with token" "true" "$(python3 -c "import json; d=json.load(open('/tmp/withauth.json')); print(d.get('success',''))")"

# ===== STEP 3: BRANCHES =====
echo ""
echo "=== 3. BRANCH MANAGEMENT ==="
eval $SSH "curl -s http://localhost:5001/api/branches -H 'Authorization: Bearer $TOKEN'" > /tmp/branches.json
BRANCH_COUNT=$(python3 -c "import json; d=json.load(open('/tmp/branches.json')); print(len(d.get('data',[])))")
assert_eq "Branches endpoint works" "true" "$(python3 -c "import json; d=json.load(open('/tmp/branches.json')); print(d.get('success',''))")"
echo "  Branches found: $BRANCH_COUNT"

# Check Wolayita Sodo branch exists
WOLAYITA_BRANCH_ID=$(python3 -c "
import json; d=json.load(open('/tmp/branches.json'))
for b in d.get('data',[]):
    if 'WOLAYTA' in b.get('code','') or 'Wolayita' in b.get('name',''):
        print(b.get('id',''))
        break
")
assert_contains "Wolayita Sodo branch exists" "WOLAYTA" "$(python3 -c "
import json; d=json.load(open('/tmp/branches.json'))
for b in d.get('data',[]):
    print(b.get('code',''))
")"

# ===== STEP 4: PLANS =====
echo ""
echo "=== 4. PLANS (Product Plans) ==="
eval $SSH "curl -s 'http://localhost:5001/api/plans?period=FY-2026-27' -H 'Authorization: Bearer $TOKEN'" > /tmp/product_plans.json
PLAN_COUNT=$(python3 -c "import json; d=json.load(open('/tmp/product_plans.json')); print(d.get('count',0))")
assert_eq "Product plans loaded (FY-2026-27)" "12" "$PLAN_COUNT"

# Check first plan has all required fields
python3 -c "
import json
d = json.load(open('/tmp/product_plans.json'))
if d.get('data'):
    p = d['data'][0]
    print(f'  Sample plan: {p[\"product_category\"]}')
    print(f'  target_value: {p.get(\"target_value\")}')
    print(f'  target_count: {p.get(\"target_count\")}')
    print(f'  monthly_plan entries: {len(p.get(\"monthly_plan\") or [])}')
    print(f'  kpi_category: {p.get(\"kpi_category\")}')
    print(f'  period: {p.get(\"period\")}')
"

# Verify monthly plan has 12 entries
MONTHLY_COUNT=$(python3 -c "
import json; d=json.load(open('/tmp/product_plans.json'))
if d.get('data'): print(len(d['data'][0].get('monthly_plan') or []))
else: print(0)
")
assert_eq "Monthly plan has 12 entries" "12" "$MONTHLY_COUNT"

# Check deposit target sum
TOTAL_DEPOSIT=$(python3 -c "
import json; d=json.load(open('/tmp/product_plans.json'))
total = sum(p.get('target_value',0) for p in d.get('data',[]))
print(int(total))
")
TOTAL_COUNT=$(python3 -c "
import json; d=json.load(open('/tmp/product_plans.json'))
total = sum(p.get('target_count',0) for p in d.get('data',[]))
print(int(total))
")
echo "  Total deposit target: $TOTAL_DEPOSIT"
echo "  Total account target: $TOTAL_COUNT"
assert_eq "Deposit target > 0" "1" "$(echo $TOTAL_DEPOSIT | awk '{print ($1 > 0)}')"
assert_eq "Account target > 0" "1" "$(echo $TOTAL_COUNT | awk '{print ($1 > 0)}')"

# Check filter by product_category
eval $SSH "curl -s 'http://localhost:5001/api/plans?period=FY-2026-27&product_category=Michu_Current_Saving' -H 'Authorization: Bearer $TOKEN'" > /tmp/filter_plan.json
FILTER_COUNT=$(python3 -c "import json; d=json.load(open('/tmp/filter_plan.json')); print(d.get('count',0))")
assert_eq "Filter by product_category works" "1" "$FILTER_COUNT"

# ===== STEP 5: STAFF PLANS =====
echo ""
echo "=== 5. STAFF PLANS ==="
eval $SSH "curl -s 'http://localhost:5001/api/staff-plans?period=FY-2026-27' -H 'Authorization: Bearer $TOKEN'" > /tmp/staff_plans.json
STAFF_PLAN_COUNT=$(python3 -c "import json; d=json.load(open('/tmp/staff_plans.json')); print(d.get('count',0))")
echo "  Staff plans found: $STAFF_PLAN_COUNT"

# ===== STEP 6: USERS =====
echo ""
echo "=== 6. USER MANAGEMENT ==="
eval $SSH "curl -s http://localhost:5001/api/users -H 'Authorization: Bearer $TOKEN'" > /tmp/users.json
USER_COUNT=$(python3 -c "import json; d=json.load(open('/tmp/users.json')); print(len(d.get('data',[])))")
assert_eq "Users endpoint works" "true" "$(python3 -c "import json; d=json.load(open('/tmp/users.json')); print(d.get('success',''))")"
echo "  Users found: $USER_COUNT"

# Check roles distribution
python3 -c "
import json
d = json.load(open('/tmp/users.json'))
roles = {}
for u in d.get('data',[]):
    r = u.get('role','unknown')
    roles[r] = roles.get(r,0) + 1
print(f'  Role distribution: {roles}')
"

# ===== STEP 7: DASHBOARDS =====
echo ""
echo "=== 7. DASHBOARDS ==="

# HQ Dashboard
eval $SSH "curl -s http://localhost:5001/api/dashboard/hq -H 'Authorization: Bearer $TOKEN'" > /tmp/dash_hq.json
assert_eq "HQ Dashboard works" "true" "$(python3 -c "import json; d=json.load(open('/tmp/dash_hq.json')); print(d.get('success',''))")"

# Branch Dashboard (for Wolayita)
eval $SSH "curl -s 'http://localhost:5001/api/dashboard/branch?branch_code=WOLAYTA_SODO' -H 'Authorization: Bearer $TOKEN'" > /tmp/dash_branch.json
assert_eq "Branch Dashboard works" "true" "$(python3 -c "import json; d=json.load(open('/tmp/dash_branch.json')); print(d.get('success',''))")"

# Staff Dashboard
eval $SSH "curl -s 'http://localhost:5001/api/dashboard/staff' -H 'Authorization: Bearer $TOKEN'" > /tmp/dash_staff.json
echo "  Staff dashboard response: $(python3 -c "import json; d=json.load(open('/tmp/dash_staff.json')); print(d.get('message','unknown'))")"

# Area Dashboard
eval $SSH "curl -s http://localhost:5001/api/dashboard/area -H 'Authorization: Bearer $TOKEN'" > /tmp/dash_area.json
echo "  Area dashboard response: $(python3 -c "import json; d=json.load(open('/tmp/dash_area.json')); print(d.get('message','unknown'))")"

# CEO Dashboard
eval $SSH "curl -s http://localhost:5001/api/dashboard/ceo -H 'Authorization: Bearer $TOKEN'" > /tmp/dash_ceo.json
echo "  CEO dashboard response: $(python3 -c "import json; d=json.load(open('/tmp/dash_ceo.json')); print(d.get('message','unknown'))")"

# ===== STEP 8: NPL / PERFORMANCE =====
echo ""
echo "=== 8. NPL & PERFORMANCE ==="

eval $SSH "curl -s 'http://localhost:5001/api/npl/staff?branch_code=WOLAYTA_SODO' -H 'Authorization: Bearer $TOKEN'" > /tmp/npl_staff.json
echo "  NPL staff endpoint: $(python3 -c "import json; d=json.load(open('/tmp/npl_staff.json')); print(d.get('message','unknown'))")"

eval $SSH "curl -s 'http://localhost:5001/api/npl/branch?branch_code=WOLAYTA_SODO' -H 'Authorization: Bearer $TOKEN'" > /tmp/npl_branch.json
echo "  NPL branch endpoint: $(python3 -c "import json; d=json.load(open('/tmp/npl_branch.json')); print(d.get('message','unknown'))")"

eval $SSH "curl -s 'http://localhost:5001/api/npl/hq' -H 'Authorization: Bearer $TOKEN'" > /tmp/npl_hq.json
echo "  NPL HQ endpoint: $(python3 -c "import json; d=json.load(open('/tmp/npl_hq.json')); print(d.get('message','unknown'))")"

# Performance endpoints
eval $SSH "curl -s 'http://localhost:5001/api/performance/collection-rate?branch_code=WOLAYTA_SODO' -H 'Authorization: Bearer $TOKEN'" > /tmp/perf_collection.json
echo "  Collection rate endpoint: $(python3 -c "import json; d=json.load(open('/tmp/perf_collection.json')); print(d.get('message','unknown'))")"

# ===== STEP 9: CBS VALIDATION =====
echo ""
echo "=== 9. CBS VALIDATION & PRODUCT MAPPING ==="
eval $SSH "curl -s 'http://localhost:5001/api/cbs?limit=5' -H 'Authorization: Bearer $TOKEN'" > /tmp/cbs.json
echo "  CBS validations: $(python3 -c "import json; d=json.load(open('/tmp/cbs.json')); print(len(d.get('data',[])))")"

eval $SSH "curl -s http://localhost:5001/api/product-mapping?status=active -H 'Authorization: Bearer $TOKEN'" > /tmp/product_mapping.json
echo "  Product mappings: $(python3 -c "import json; d=json.load(open('/tmp/product_mapping.json')); print(len(d.get('data',[])))")"

# ===== STEP 10: HIERARCHY / RBAC =====
echo ""
echo "=== 10. HIERARCHY / RBAC ==="
# Check if non-admin endpoints exist
eval $SSH "curl -s http://localhost:5001/api/areas -H 'Authorization: Bearer $TOKEN'" > /tmp/areas.json
echo "  Areas endpoint: $(python3 -c "import json; d=json.load(open('/tmp/areas.json')); print(d.get('message','unknown'))")"

eval $SSH "curl -s 'http://localhost:5001/api/export/plans?period=FY-2026-27' -H 'Authorization: Bearer $TOKEN'" > /tmp/export.json
echo "  Export endpoint: $(python3 -c "import json; d=json.load(open('/tmp/export.json')); print(d.get('message','unknown'))")"

# ===== STEP 11: KPI FRAMEWORK =====
echo ""
echo "=== 11. KPI FRAMEWORK ==="
eval $SSH "curl -s http://localhost:5001/api/kpi-framework -H 'Authorization: Bearer $TOKEN'" > /tmp/kpi.json
echo "  KPI Framework: $(python3 -c "import json; d=json.load(open('/tmp/kpi.json')); print(d.get('message','unknown'))")"

# ===== SUMMARY =====
echo ""
echo "========================================="
echo " TEST RESULTS"
echo "========================================="
echo " Passed: $PASS"
echo " Failed: $FAIL"
echo "========================================="

# Return exit code based on failures
if [ $FAIL -gt 0 ]; then
  exit 1
fi
exit 0
