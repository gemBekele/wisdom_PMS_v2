// Comprehensive backend API test — runs against production
import { execSync } from 'child_process';

const SSH = `sshpass -p '01010101' ssh -o StrictHostKeyChecking=no ubuntu@51.91.125.62`;
const HOST = 'http://localhost:5001';

function ssh(cmd) {
  const full = `${SSH} "curl -s ${HOST}${cmd}"`;
  try {
    const out = execSync(full, { encoding: 'utf8', timeout: 10000 });
    return JSON.parse(out);
  } catch (e) {
    return { error: e.message, raw: e.stdout?.toString() };
  }
}

function sshPost(cmd, body) {
  const full = `${SSH} "curl -s -X POST ${HOST}${cmd} -H 'Content-Type: application/json' -d '${JSON.stringify(body)}'"`;
  try {
    const out = execSync(full, { encoding: 'utf8', timeout: 10000 });
    return JSON.parse(out);
  } catch (e) {
    return { error: e.message, raw: e.stdout?.toString() };
  }
}

function sshAuth(cmd, token) {
  const full = `${SSH} "curl -s ${HOST}${cmd} -H 'Authorization: Bearer ${token}'"`;
  try {
    const out = execSync(full, { encoding: 'utf8', timeout: 10000 });
    return JSON.parse(out);
  } catch (e) {
    return { error: e.message, raw: e.stdout?.toString() };
  }
}

let passed = 0, failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${name}: ${e.message}`);
    failed++;
  }
}

function assertEq(actual, expected, msg) {
  if (actual !== expected) throw new Error(`${msg} — expected ${expected}, got ${actual}`);
}

function assertTrue(actual, msg) {
  if (actual !== true) throw new Error(`${msg} — expected true, got ${actual}`);
}

console.log('========================================');
console.log(' COMPREHENSIVE BACKEND API TESTS');
console.log('========================================\n');

// ===== 1. AUTH =====
console.log('=== 1. AUTHENTICATION ===');
let loginResult = sshPost('/api/auth/login', { email: 'biruk.assefa@ghion.et', password: 'admin123' });
test('Login succeeds', () => assertTrue(loginResult.success, 'login'));
const TOKEN = loginResult.token;
test('Token returned', () => assertTrue(!!TOKEN, 'token'));
test('Admin role', () => assertEq(loginResult.data?.role, 'admin', 'role'));
test('Admin name', () => assertEq(loginResult.data?.name, 'Temesgen', 'name'));

// Wrong password
let badLogin = sshPost('/api/auth/login', { email: 'biruk.assefa@ghion.et', password: 'wrongpass' });
test('Wrong password rejected', () => assertEq(badLogin.success, false, 'bad login'));

// Protected route without token
let noAuth = ssh('/api/plans');
test('No token rejected', () => assertTrue(noAuth.message?.includes('Not authorized') || !noAuth.success, 'no auth'));

// ===== 2. BRANCHES =====
console.log('\n=== 2. BRANCH MANAGEMENT ===');
let branches = sshAuth('/api/branches', TOKEN);
test('Branches endpoint', () => assertTrue(branches.success, 'branches'));
test('Branches have data', () => assertTrue(branches.data?.length > 0, 'branch count'));
let wolayitaBranch = branches.data?.find(b => b.code?.includes('WOLAYTA') || b.name?.includes('Wolayita'));
test('Wolayita Sodo branch exists', () => assertTrue(!!wolayitaBranch, 'wolayita branch'));
const BRANCH_ID = wolayitaBranch?.id;
const BRANCH_CODE = wolayitaBranch?.code;
console.log(`  Branch: ${BRANCH_CODE} (${BRANCH_ID})`);

// ===== 3. PLANS =====
console.log('\n=== 3. PLANS ===');
let allPlans = sshAuth('/api/plans', TOKEN);
test('Plans endpoint', () => assertTrue(allPlans.success, 'plans'));
console.log(`  Total plans: ${allPlans.count}`);

// FY-2026-27 product plans
let productPlans = sshAuth('/api/plans?period=FY-2026-27', TOKEN);
test('FY-2026-27 plans loaded', () => assertTrue(productPlans.success, 'product plans'));
test('12 product plans', () => assertEq(productPlans.count, 12, 'plan count'));

let pp = productPlans.data?.[0];
test('Plans have product_category', () => assertTrue(!!pp?.product_category, 'product_category'));
test('Plans have target_value', () => assertTrue(pp?.target_value > 0, 'target_value'));
test('Plans have monthly_plan', () => assertTrue((pp?.monthly_plan?.length || 0) > 0, 'monthly_plan'));
test('Monthly plan has 12 entries', () => assertEq(pp?.monthly_plan?.length, 12, '12 months'));
test('Monthly entry has month field', () => assertTrue(!!pp?.monthly_plan?.[0]?.month, 'month field'));
test('Monthly entry has amount field', () => assertTrue(pp?.monthly_plan?.[0]?.amount >= 0, 'amount field'));
test('Monthly entry has count field', () => assertTrue(pp?.monthly_plan?.[0]?.count >= 0, 'count field'));

// Product categories list
const productNames = productPlans.data?.map(p => p.product_category).sort();
console.log(`  Products: ${productNames?.join(', ')}`);
const expectedProducts = [
  'Children_Saving', 'Elders_Saving', 'Fixed_Time_Deposit', 'Gihon_Regular_Saving',
  'Loan_Saving_Deposit', 'Michu_Current_Saving', 'Mothers_Saving',
  'Premium_Saving_Deposit', 'Segment_Deposit', 'Special_Saving',
  'Wadiah_IFB_Deposit', 'Young_Womens_Saving'
].sort();
test('All 12 expected products present', () => assertEq(JSON.stringify(productNames), JSON.stringify(expectedProducts), 'product list'));

// Total targets
let totalDeposit = productPlans.data?.reduce((s, p) => s + (p.target_value || 0), 0);
let totalCount = productPlans.data?.reduce((s, p) => s + (p.target_count || 0), 0);
console.log(`  Total deposit target: ${totalDeposit?.toLocaleString()}`);
console.log(`  Total account target: ${totalCount?.toLocaleString()}`);
test('Total deposit > 0', () => assertTrue(totalDeposit > 0, 'deposit target'));
test('Total account count > 0', () => assertTrue(totalCount > 0, 'count target'));

// Filter by product_category
let filterPlan = sshAuth(`/api/plans?period=FY-2026-27&product_category=Michu_Current_Saving`, TOKEN);
test('Filter by product_category works', () => assertEq(filterPlan.count, 1, 'filter'));
test('Filtered plan is Michu_Current_Saving', () => assertEq(filterPlan.data?.[0]?.product_category, 'Michu_Current_Saving', 'filter name'));

// Filter by branch_code
let branchPlans = sshAuth(`/api/plans?branch_code=${BRANCH_CODE}`, TOKEN);
test('Filter by branch_code works', () => assertTrue(branchPlans.count > 0, 'branch filter'));

// ===== 4. STAFF PLANS =====
console.log('\n=== 4. STAFF PLANS ===');
let staffPlans = sshAuth('/api/staff-plans', TOKEN);
test('Staff plans endpoint', () => assertTrue(staffPlans.success, 'staff plans'));
console.log(`  Total staff plans: ${staffPlans.count}`);

let staffPlansFY = sshAuth('/api/staff-plans?period=FY-2026-27', TOKEN);
console.log(`  Staff plans (FY-2026-27): ${staffPlansFY.count}`);

// ===== 5. USERS =====
console.log('\n=== 5. USERS ===');
let users = sshAuth('/api/users', TOKEN);
test('Users endpoint', () => assertTrue(users.success, 'users'));
console.log(`  Total users: ${users.data?.length}`);

// Check role distribution
let roles = {};
users.data?.forEach(u => { roles[u.role] = (roles[u.role] || 0) + 1; });
console.log(`  Roles: ${JSON.stringify(roles)}`);

// Admin user check
let adminUser = users.data?.find(u => u.email === 'biruk.assefa@ghion.et');
test('Admin user exists', () => assertTrue(!!adminUser, 'admin user'));
test('Admin has correct role', () => assertEq(adminUser?.role, 'admin', 'admin role'));

// ===== 6. DASHBOARDS =====
console.log('\n=== 6. DASHBOARDS ===');

let hqDash = sshAuth('/api/dashboard/hq', TOKEN);
test('HQ Dashboard', () => assertTrue(hqDash.success, 'hq dash'));

let branchDash = sshAuth(`/api/dashboard/branch?branch_code=${BRANCH_CODE}`, TOKEN);
test('Branch Dashboard', () => assertTrue(branchDash.success, 'branch dash'));

// Staff dashboard
let staffDash = sshAuth('/api/dashboard/staff', TOKEN);
test('Staff Dashboard (admin view)', () => {
  // Admin should be able to access or get a meaningful message
  if (!staffDash.success) {
    throw new Error(`Staff dash failed: ${staffDash.message}`);
  }
});

// Area dashboard
let areaDash = sshAuth('/api/dashboard/area', TOKEN);
console.log(`  Area Dashboard: ${areaDash.message || 'success'}`);

// CEO dashboard
let ceoDash = sshAuth('/api/dashboard/ceo', TOKEN);
console.log(`  CEO Dashboard: ${ceoDash.message || 'success'}`);

// ===== 7. NPL / PERFORMANCE =====
console.log('\n=== 7. NPL & PERFORMANCE ===');

let nplBranch = sshAuth(`/api/npl/branch?branch_code=${BRANCH_CODE}`, TOKEN);
test('NPL Branch endpoint', () => assertTrue(nplBranch.success, 'npl branch'));
console.log(`  NPL branch data: ${nplBranch.data ? 'has data' : 'no data'}`);

let nplHq = sshAuth('/api/npl/hq', TOKEN);
test('NPL HQ endpoint', () => assertTrue(nplHq.success, 'npl hq'));

let nplStaff = sshAuth(`/api/npl/staff?branch_code=${BRANCH_CODE}`, TOKEN);
test('NPL Staff endpoint', () => assertTrue(nplStaff.success, 'npl staff'));

// Performance
let perfColl = sshAuth(`/api/performance/collection-rate?branch_code=${BRANCH_CODE}`, TOKEN);
console.log(`  Collection rate: ${perfColl.message || 'success'}`);

// ===== 8. CBS & PRODUCT MAPPING =====
console.log('\n=== 8. CBS & PRODUCT MAPPING ===');

let cbsValidations = sshAuth('/api/cbs?limit=5', TOKEN);
console.log(`  CBS validations: ${cbsValidations.data?.length || 0}`);

let productMapping = sshAuth('/api/product-mapping?status=active', TOKEN);
console.log(`  Product mappings: ${productMapping.data?.length || 0}`);
if (productMapping.data?.length > 0) {
  test('Product mappings have cbs_product_name', () => assertTrue(!!productMapping.data[0].cbs_product_name, 'mapping name'));
  test('Product mappings have kpi_category', () => assertTrue(!!productMapping.data[0].kpi_category, 'mapping kpi'));
}

// ===== 9. HIERARCHY =====
console.log('\n=== 9. HIERARCHY / RBAC ===');

// Test that non-admin user cannot create plans
// Test that branch manager can only see their branch
// Test area-level access

// ===== 10. KPI FRAMEWORK =====
console.log('\n=== 10. KPI FRAMEWORK ===');
let kpiFramework = sshAuth('/api/kpi-framework', TOKEN);
console.log(`  KPI Framework: ${kpiFramework.message || 'success'}`);

// ===== 11. EXPORT =====
console.log('\n=== 11. EXPORTS ===');
let exportPlans = sshAuth('/api/export/plans?period=FY-2026-27', TOKEN);
console.log(`  Export plans: ${exportPlans.message || exportPlans.data?.length + ' rows' || 'success'}`);

// ===== 12. AUDIT TRAIL =====
console.log('\n=== 12. AUDIT ===');
let audit = sshAuth('/api/audit?limit=5', TOKEN);
console.log(`  Audit entries: ${audit.data?.length || 0}`);

// ===== 13. TASKS =====
console.log('\n=== 13. TASKS ===');
let tasks = sshAuth('/api/tasks?limit=5', TOKEN);
console.log(`  Tasks: ${tasks.data?.length || 0}`);

// ===== SUMMARY =====
console.log('\n========================================');
console.log(' RESULTS');
console.log('========================================');
console.log(` Passed: ${passed}`);
console.log(` Failed: ${failed}`);
console.log(` Total:  ${passed + failed}`);
console.log('========================================');

if (failed > 0) {
  console.log('\n⚠️  Some tests FAILED — check details above');
  process.exit(1);
} else {
  console.log('\n✅ All tests PASSED');
  process.exit(0);
}
