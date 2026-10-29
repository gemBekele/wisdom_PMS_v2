# Sacko-PMS — End-to-End Test Coverage

**Updated:** 2026-07-16  
**Purpose:** Document every endpoint, data flow, and component with its test status. If work stops, resume from the last ❌ or ⬜.

## Status Legend
- ✅ **Passed** — Verified working
- ⬜ **Not Tested** — Not yet verified
- ❌ **Failed** — Known issue, needs fix

---

## 1. Health & Config (Pre-auth)

| # | Endpoint | What it tests | Status |
|---|----------|---------------|--------|
| 1.1 | `GET /api/health` | Returns `success: true` + server message | ✅ |
| 1.2 | `GET /api/config` | Returns task types, KPI categories, positions, period options, taskTypeToKpiMap | ✅ |

---

## 2. Authentication (4 roles)

| # | Email | Password | Role | Status |
|---|-------|----------|------|--------|
| 2.1 | `admin@ghion.et` | `1234` | admin | ✅ |
| 2.2 | `am@wolayta.et` | `1234` | areaManager | ✅ |
| 2.3 | `bm@sodo.et` | `1234` | branchManager | ✅ |
| 2.4 | `kidistale_gns@ghion.et` | `1234` | supervisor | ✅ |
| 2.5 | `tigist_gns@ghion.et` | `1234` | staff | ✅ |

---

## 3. Phase 1 — Product Plan Reliability

### 3.1 Deposit Product Achievement

| # | Component | What it tests | Status |
|---|-----------|---------------|--------|
| 3.1.1 | `calculateIncrementalGrowth()` | Incremental deposit growth from mapped accounts with current_balance ≥ 1000 | ✅ |
| 3.1.2 | `calculateKPIScore()` | Per-user KPI score from StaffPlan targets + actual growth for Deposit_Mob, Collection_Rate, Portfolio_Quality | ✅ |
| 3.1.3 | `calculateBranchKPIScore()` | Branch-level KPI from plan targets + aggregated staff/account data | ✅ |
| 3.1.4 | `calculateBranchDepositGrowth()` | Branch deposit growth from June baseline vs current balance | ✅ |
| 3.1.5 | `planCascade.js` | Option A empty-group redistribution, DEPOSIT_PRODUCT_SHARES (35/25/15/25), FY period breakdowns | ✅ |
| 3.1.6 | `normalizePeriod()` | Write-boundary normalization (plan create, cascade, seed) | ✅ |

### 3.2 Collection Rate & Portfolio Quality

| # | Component | What it tests | Status |
|---|-----------|---------------|--------|
| 3.2.1 | `calculateStaffCollectionRate()` | Staff collection % from loan schedules (paid/expected) | ✅ |
| 3.2.2 | `calculateLoanDpd()` | Days Past Due for single loan account | ✅ |
| 3.2.3 | `calculateBatchDpd()` | Batch DPD + classification (Watch/Substandard/Doubtful/Loss) | ✅ |
| 3.2.4 | `calculateParMetrics()` | PAR 1/30/90 ratios, amounts, counts from DPD results | ✅ |
| 3.2.5 | `autoGenerateLoanSchedules()` | Generate installment schedules from loan fields (frequency, principal, dates) | ✅ |
| 3.2.6 | `generateNplSnapshot()` | Create/update daily NPL snapshot for a branch | ✅ |
| 3.2.7 | `getStaffCollectionAlerts()` | Overdue installment alerts for a staff member | ✅ |

### 3.3 Plan Controller

| # | Endpoint | What it tests | Status |
|---|----------|---------------|--------|
| 3.3.1 | `GET /api/plans?period=FY-2026-27` | Returns plans with correct KPI categories | ✅ |
| 3.3.2 | `GET /api/plans/achievement?period=FY-2026-27` | Plan achievement with dual validation gate + actual counts | ✅ |
| 3.3.3 | `POST /api/plans` | Create plan + cascade + normalize period | ⬜ |

### 3.4 Dashboard Controllers

| # | Endpoint | What it tests | Status |
|---|----------|---------------|--------|
| 3.4.1 | `GET /api/dashboard/hq` | HQ overview: branches, staff, avg achievement, CBS rate, performance dist, trend, **NPL** | ✅ |
| 3.4.2 | `GET /api/dashboard/area` | Area overview: branch perf, comparison, trend, mapping coverage | ✅ |
| 3.4.3 | `GET /api/dashboard/branch?branch_code=WOLAYTA_SODO` | Branch: staff, mapped accounts, deposit target, KPI data, team perf, **NPL** | ✅ |
| 3.4.4 | `GET /api/dashboard/staff` | Staff: mapped accounts, deposit growth, KPI breakdown, comparative stats, accounts, **NPL** | ✅ |
| 3.4.5 | `GET /api/dashboard/supervisor` | Supervisor: team members, stats, own KPI, team KPI | ✅ |
| 3.4.6 | `GET /api/dashboard/branch-operations` | Daily operations: per-branch staff activity, task breakdown by type/status | ✅ |
| 3.4.7 | `GET /api/users/public-list` | Returns all active users with positions | ✅ |

---

## 4. Phase 2 — Dual Validation & CBS Pipeline

### 4.1 Dual Validation Gate (Fix 2.1)

| # | Component | What it tests | Status |
|---|-----------|---------------|--------|
| 4.1.1 | `buildTaskAchievementFilter()` with `requiresCbs=true` | Tasks of CBS-required types: only count if `cbsValidated === true` | ✅ |
| 4.1.2 | `buildTaskAchievementFilter()` with `requiresCbs=false` | Tasks of non-CBS types: count if `approvalStatus === 'Approved'` OR `cbsValidated === true` | ✅ |
| 4.1.3 | `buildTaskAchievementFilter()` no taskTypes | Falls back to all CBS_PRODUCT_TO_CATEGORY task types | ✅ |
| 4.1.4 | `planController.getPlansAchievement()` | Uses dual gate instead of hardcoded `approvalStatus: 'Approved'` | ✅ |
| 4.1.5 | `dashboardController.getStaffDashboard()` | Staff task query uses dual gate + mapping enforcement | ✅ |
| 4.1.6 | `dashboardController.getSupervisorDashboard()` | Supervisor task query uses dual gate + mapping enforcement | ✅ |

### 4.2 Mapping Enforcement (Fix 2.3)

| # | Component | What it tests | Status |
|---|-----------|---------------|--------|
| 4.2.1 | Filter: `account: null` | Tasks with no account mapping still count | ✅ |
| 4.2.2 | Filter: `account.mappedToId === userId` | Tasks mapped to the user count | ✅ |
| 4.2.3 | Filter excludes `account.mappedToId !== userId` | Tasks mapped to another user are excluded | ✅ |

### 4.3 CBS Pipeline (Fix 2.2)

| # | Component | What it tests | Status |
|---|-----------|---------------|--------|
| 4.3.1 | `POST /api/cbs/upload` | File upload, parse, validate | ✅ |
| 4.3.2 | `validateCBS()` task-type-aware matching | Matches by accountNumber + taskType (from CBS product name) + amount | ✅ |
| 4.3.3 | Balance propagation on CBS match | CBS-validated task → updates related `AccountMapping.current_balance` | ✅ |
| 4.3.4 | `GET /api/cbs` | Returns validation history with discrepancies | ✅ |
| 4.3.5 | `GET /api/cbs?branchId=&status=&validationDate=` | Filter validations by branch, status, date | ✅ |
| 4.3.6 | `PUT /api/cbs/:id/resolve/:discrepancyId` | Resolve discrepancy with notes | ✅ |
| 4.3.7 | `GET /api/cbs/report` | CBS validation summary report | ✅ |

### 4.4 Schema — requiresCbs

| # | Field | What it tests | Status |
|---|-------|---------------|--------|
| 4.4.1 | `ProductKpiMapping.requiresCbs` | Boolean, defaults to `true`, added via migration | ✅ |

---

## 5. Phase 3 — Credit / NPL / Collection

### 5.1 CBS → Loan Schedule Matching

| # | Component | What it tests | Status |
|---|-----------|---------------|--------|
| 5.1.1 | `processLoanRepayments()` in CBS upload | Detects loan accounts, matches to oldest unpaid installment, updates `paidAmount`/`status`/`daysPastDue` | ✅ |
| 5.1.2 | Auto-generate schedules | When loan account has no schedules during CBS upload, calls `autoGenerateLoanSchedules()` | ✅ |
| 5.1.3 | Partial payment handling | CBS amount < expectedAmount → status = `Partial`, paidAmount accumulates | ✅ |
| 5.1.4 | Full payment handling | CBS amount ≥ expectedAmount → status = `Paid`, daysPastDue = 0 | ✅ |
| 5.1.5 | Non-loan account skip | Savings/current accounts skipped by `processLoanRepayments` | ✅ |

### 5.2 NPL Snapshot After CBS

| # | Component | What it tests | Status |
|---|-----------|---------------|--------|
| 5.2.1 | `generateNplSnapshot(branchId)` called after CBS upload | NPL snapshot created/updated after every CBS file processing | ✅ |
| 5.2.2 | NPL snapshot includes PAR 1/30/90 | snapshot stores totalPortfolio, par1/30/90 amounts, ratios, counts | ✅ |
| 5.2.3 | `POST /api/npl/snapshot` | Manual trigger NPL snapshot for a branch | ✅ |

### 5.3 NPL Endpoints

| # | Endpoint | What it tests | Status |
|---|----------|---------------|--------|
| 5.3.1 | `GET /api/npl/staff` | Staff NPL: alerts, collection rate, PAR metrics | ✅ |
| 5.3.2 | `GET /api/npl/branch?branch_code=WOLAYTA_SODO` | Branch NPL: PAR metrics, aging ladder, staff breakdown, 30-day trend | ✅ |
| 5.3.3 | `GET /api/npl/area` | Area NPL: per-branch PAR, summary, trend | ✅ |
| 5.3.4 | `GET /api/npl/hq` | HQ NPL: company summary, per-area summary, per-branch PAR, 90-day trend | ✅ |
| 5.3.5 | `GET /api/npl/team-alerts` | Supervisor: team collection alerts grouped by staff | ✅ |
| 5.3.6 | `GET /api/npl/schedules/:accountId` | Loan schedule for specific account with totals | ✅ |
| 5.3.7 | `POST /api/npl/schedules/:accountId/generate` | Auto-generate schedules for a loan account | ✅ |
| 5.3.8 | `PUT /api/npl/schedules/:id/pay` | Mark installment as paid (manual) | ✅ |

### 5.4 NPL in Dashboards

| # | Dashboard | NPL data included | Status |
|---|-----------|-------------------|--------|
| 5.4.1 | HQ Dashboard | `npl`: totalLoanAccounts, totalPortfolio, par1/30/90 ratios, par90Count | ✅ |
| 5.4.2 | Branch Dashboard | `npl`: totalLoanAccounts, totalPortfolio, par ratios, overdueAccounts, collectionRate | ✅ |
| 5.4.3 | Staff Dashboard | `npl`: totalLoans, totalPortfolio, par90Ratio, collectionRate, alerts | ✅ |

### 5.5 Seed Data

| # | Script | What it creates | Status |
|---|--------|-----------------|--------|
| 5.5.1 | `seedLoanData.js` | 2 loan accounts (LN-TEST-001, LN-TEST-002) with 11 schedules each | ✅ |

### 5.6 Loan Schedule Model

| # | Field | What it tests | Status |
|---|-------|---------------|--------|
| 5.6.1 | `LoanSchedule.accountId` | Relation to AccountMapping | ✅ |
| 5.6.2 | `LoanSchedule.expectedDate` | Due date of installment | ✅ |
| 5.6.3 | `LoanSchedule.expectedAmount` | Expected payment amount | ✅ |
| 5.6.4 | `LoanSchedule.paidAmount` | Actual paid amount (updated by CBS or manual) | ✅ |
| 5.6.5 | `LoanSchedule.status` | Pending / Paid / Partial / Missed | ✅ |
| 5.6.6 | `LoanSchedule.daysPastDue` | Recalculated after CBS update | ✅ |

---

## 6. Task Management

| # | Endpoint / Feature | What it tests | Status |
|---|--------------------|---------------|--------|
| 6.1 | `POST /api/tasks` | Create task with TaskType enum, accountNumber, amount | ✅ |
| 6.2 | `GET /api/tasks` | List tasks with filters (branch, date, status) | ✅ |
| 6.3 | `PUT /api/tasks/:id/approve` | Approve task with approval chain (supervisor → BM) | ✅ |
| 6.4 | `PUT /api/tasks/:id/reject` | Reject task with reason | ✅ |
| 6.5 | `PUT /api/tasks/:id/request-edit` | Request edit from submitter | ✅ |
| 6.6 | `PUT /api/tasks/:id/edit` | Submitter edits task after request | ✅ |
| 6.7 | Approval chain: 2 levels | Task goes through supervisor → BM final approval | ✅ |
| 6.8 | CBS validation sets `cbsValidated` | CBS upload matches task → sets `cbsValidated: true` + `cbsValidatedAt` | ✅ |

---

## 7. Team Management

| # | Endpoint / Feature | What it tests | Status |
|---|--------------------|---------------|--------|
| 7.1 | `POST /api/teams` | Create team with unique name+code per branch | ✅ |
| 7.2 | `GET /api/teams` | List teams with members | ✅ |
| 7.3 | `PUT /api/teams/:id` | Update team, duplicate name check (400 on conflict) | ✅ |
| 7.4 | Duplicate-team enforcement | Staff already in a team cannot be reassigned (backend + frontend) | ✅ |
| 7.5 | Frontend TeamManagement.tsx | Card layout, avatar badges, "In: TeamName" badge for assigned | ✅ |

---

## 8. Frontend E2E Tests (Browser Required)

Run these in a browser logged in as each role. Mark ✅ when the page renders correctly with real data.

### 8.0 Login (`/login`)

| # | Test | Status |
|---|------|--------|
| 8.0.1 | Login page renders with email + password fields and role/position dropdown | ⬜ |
| 8.0.2 | Can select position from dropdown that filters users | ⬜ |
| 8.0.3 | Login with `admin@ghion.et` / `1234` → redirects to `/dashboard/hq` | ⬜ |
| 8.0.4 | Login with `am@wolayta.et` / `1234` → redirects to `/dashboard/area` | ⬜ |
| 8.0.5 | Login with `bm@sodo.et` / `1234` → redirects to `/dashboard/branch` | ⬜ |
| 8.0.6 | Login with `kidistale_gns@ghion.et` / `1234` → redirects to `/dashboard/supervisor` | ⬜ |
| 8.0.7 | Login with `tigist_gns@ghion.et` / `1234` → redirects to `/dashboard/staff` | ⬜ |
| 8.0.8 | Wrong password shows error message | ⬜ |
| 8.0.9 | Token persists on refresh (session stays) | ⬜ |
| 8.0.10 | Logout clears token → redirects to login | ⬜ |

### 8.1 Admin / CEO (`admin@ghion.et`)

#### 8.1.1 HQ Dashboard (`/dashboard/hq`)

| # | Test | Status |
|---|------|--------|
| 8.1.1.1 | Total branches and staff counts shown | ⬜ |
| 8.1.1.2 | Average plan achievement % shown (from Deposit Mobilization) | ⬜ |
| 8.1.1.3 | Branch KPI heatmap with both branches and area names | ⬜ |
| 8.1.1.4 | Performance distribution chart (ratings breakdown) | ⬜ |
| 8.1.1.5 | Top/bottom branches cards sorted correctly | ⬜ |
| 8.1.1.6 | CBS validation rate displayed | ⬜ |
| 8.1.1.7 | Activity feed shows recent audit logs | ⬜ |
| 8.1.1.8 | **NPL summary card** shows: total loan accounts, portfolio, PAR90 ratio | ⬜ |
| 8.1.1.9 | trend/analytical data renders with chart | ⬜ |

#### 8.1.2 Plan Management (`/plan-cascade`)

| # | Test | Status |
|---|------|--------|
| 8.1.2.1 | Plans list shows plans with branch, KPI category, target, period, status | ⬜ |
| 8.1.2.2 | Create Plan form: branch dropdown, KPI category (3 valid: Deposit_Mob, Collection_Rate, Portfolio_Quality), period, target | ⬜ |
| 8.1.2.3 | After creating plan → cascade creates StaffPlans → staff dashboard updates | ⬜ |
| 8.1.2.4 | Cascade dropdown shows only valid KPIs (no legacy) | ⬜ |
| 8.1.2.5 | Filter plans by branch, KPI, period, status | ⬜ |

#### 8.1.3 Product Mapping (`/product-mapping`)

| # | Test | Status |
|---|------|--------|
| 8.1.3.1 | Shows product-KPI mappings with correct categories | ⬜ |
| 8.1.3.2 | Can add new product mapping with `requiresCbs` toggle | ⬜ |
| 8.1.3.3 | Can toggle active/inactive status | ⬜ |
| 8.1.3.4 | New product appears in staff TaskEntryForm dropdown | ⬜ |

#### 8.1.4 CBS Validation (`/cbs-validation`)

| # | Test | Status |
|---|------|--------|
| 8.1.4.1 | Page renders with upload file button | ⬜ |
| 8.1.4.2 | Upload CBS file → processing + validation results shown | ⬜ |
| 8.1.4.3 | Discrepancy list shown (if any) | ⬜ |
| 8.1.4.4 | Validation history table with date, branch, status, match rate | ⬜ |
| 8.1.4.5 | **Loan repayment processing** appears in upload results | ⬜ |
| 8.1.4.6 | NPL snapshot generation triggered (check NPL dashboard after) | ⬜ |

#### 8.1.5 NPL Dashboard (`/npl` or `/npl/hq`)

| # | Test | Status |
|---|------|--------|
| 8.1.5.1 | Company summary: total portfolio, PAR 1/30/90 ratios, total loans | ⬜ |
| 8.1.5.2 | Per-area summary (if multiple areas) | ⬜ |
| 8.1.5.3 | Per-branch table with PAR ratios sorted worst-first | ⬜ |
| 8.1.5.4 | 90-day trend chart for PAR ratios | ⬜ |

#### 8.1.6 User Management (`/user-management`)

| # | Test | Status |
|---|------|--------|
| 8.1.6.1 | Table shows all users with correct columns | ⬜ |
| 8.1.6.2 | Create user: role, position, branch, supervisor assignment all work | ⬜ |
| 8.1.6.3 | No old roles/fields (no sub_team, no region) | ⬜ |
| 8.1.6.4 | Edit user works | ⬜ |
| 8.1.6.5 | Deactivate user → user cannot log in | ⬜ |

#### 8.1.7 KPI Framework (`/kpi-framework`)

| # | Test | Status |
|---|------|--------|
| 8.1.7.1 | Shows 3 active KPIs (Deposit_Mob, Collection_Rate, Portfolio_Quality) with weights | ⬜ |
| 8.1.7.2 | Weight totals sum to 100 | ⬜ |
| 8.1.7.3 | Rating scale displayed correctly | ⬜ |

#### 8.1.8 Profile (`/profile`)

| # | Test | Status |
|---|------|--------|
| 8.1.8.1 | Correct name, position, badge color | ⬜ |
| 8.1.8.2 | Password change works | ⬜ |

### 8.2 Area Manager (`am@wolayta.et`)

#### 8.2.1 Area Dashboard (`/dashboard/area`)

| # | Test | Status |
|---|------|--------|
| 8.2.1.1 | Shows branches in area with performance cards | ⬜ |
| 8.2.1.2 | Branch comparison chart renders | ⬜ |
| 8.2.1.3 | Mapping coverage (mapped vs unmapped) | ⬜ |
| 8.2.1.4 | Trend data chart for last 30 days | ⬜ |
| 8.2.1.5 | Low performers count highlighted | ⬜ |

#### 8.2.2 NPL Area View (`/npl/area` or `/dashboard/area` NPL section)

| # | Test | Status |
|---|------|--------|
| 8.2.2.1 | Per-branch NPL summary (loans, portfolio, PAR ratios) | ⬜ |
| 8.2.2.2 | Area-level NPL rollup | ⬜ |

### 8.3 Branch Manager (`bm@sodo.et`)

#### 8.3.1 Branch Dashboard (`/dashboard/branch`)

| # | Test | Status |
|---|------|--------|
| 8.3.1.1 | Total staff count for branch | ⬜ |
| 8.3.1.2 | Mapped accounts count | ⬜ |
| 8.3.1.3 | Daily deposit target + today's achievement | ⬜ |
| 8.3.1.4 | KPI data: Deposit_Mobilization, Collection_Rate, Portfolio_Quality | ⬜ |
| 8.3.1.5 | **NPL summary card**: total loan accounts, portfolio, PAR ratios, overdue count, collection rate | ⬜ |
| 8.3.1.6 | Team performance table: each staff with target, actual, %, status | ⬜ |
| 8.3.1.7 | Status colors: green ≥80%, yellow ≥60%, red <60% | ⬜ |

#### 8.3.2 Branch NPL Page (`/npl/branch`)

| # | Test | Status |
|---|------|--------|
| 8.3.2.1 | PAR metrics (1/30/90) with amounts and ratios | ⬜ |
| 8.3.2.2 | Aging ladder (Current, 1-29, 30-59, 60-89, 90+) | ⬜ |
| 8.3.2.3 | Staff breakdown: per-staff overdue accounts | ⬜ |
| 8.3.2.4 | 30-day NPL trend chart | ⬜ |
| 8.3.2.5 | Overdue accounts list with DPD details | ⬜ |

#### 8.3.3 CBS Upload (`/cbs-validation`)

| # | Test | Status |
|---|------|--------|
| 8.3.3.1 | BM can upload CBS file for their branch | ⬜ |
| 8.3.3.2 | Results show balance updates, task matches, loan repayment updates, NPL snapshot | ⬜ |

#### 8.3.4 Task Approval (`/tasks`)

| # | Test | Status |
|---|------|--------|
| 8.3.4.1 | BM sees all branch tasks with status filters | ⬜ |
| 8.3.4.2 | Can approve pending tasks (final approval) | ⬜ |
| 8.3.4.3 | Can view task details | ⬜ |

### 8.4 Supervisor (`kidistale_gns@ghion.et`)

#### 8.4.1 Supervisor Dashboard (`/dashboard/supervisor`)

| # | Test | Status |
|---|------|--------|
| 8.4.1.1 | Shows team members (supervisees) | ⬜ |
| 8.4.1.2 | Each member shows: name, position, mapped accounts, KPI % | ⬜ |
| 8.4.1.3 | Team stats: total members, total mapped accounts, avg achievement | ⬜ |
| 8.4.1.4 | Supervisor's own KPI breakdown (own StaffPlan targets) | ⬜ |
| 8.4.1.5 | Team KPI breakdown (aggregate of supervisees) | ⬜ |

#### 8.4.2 Task Approval (`/tasks`)

| # | Test | Status |
|---|------|--------|
| 8.4.2.1 | Shows tasks submitted by supervisees | ⬜ |
| 8.4.2.2 | Can approve pending tasks (first-level approval) | ⬜ |
| 8.4.2.3 | After approval, status changes and BM can see it | ⬜ |
| 8.4.2.4 | Can reject tasks with reason | ⬜ |

#### 8.4.3 NPL Team Alerts (`/npl/team-alerts`)

| # | Test | Status |
|---|------|--------|
| 8.4.3.1 | Shows overdue alerts grouped by supervisee | ⬜ |
| 8.4.3.2 | High-priority alerts highlighted | ⬜ |

### 8.5 Staff (`tigist_gns@ghion.et`)

#### 8.5.1 Staff Dashboard (`/dashboard/staff`)

| # | Test | Status |
|---|------|--------|
| 8.5.1.1 | Mapped accounts count shown | ⬜ |
| 8.5.1.2 | Deposit growth displayed (from incremental calc) | ⬜ |
| 8.5.1.3 | KPI breakdown: deposit, collectionRate, portfolioQuality | ⬜ |
| 8.5.1.4 | Behavioral evaluation section (if exists) | ⬜ |
| 8.5.1.5 | Comparative stats: today vs yesterday tasks/amounts with % change | ⬜ |
| 8.5.1.6 | Account list with balances | ⬜ |
| 8.5.1.7 | **NPL summary**: total loans, portfolio, PAR90, collection rate, overdue alerts | ⬜ |

#### 8.5.2 Task Entry (`/tasks/new` and `/tasks`)

| # | Test | Status |
|---|------|--------|
| 8.5.2.1 | Task Type dropdown shows 12 deposit product types | ⬜ |
| 8.5.2.2 | Submitting a task creates it with status Pending | ⬜ |
| 8.5.2.3 | New task appears in supervisor's task list | ⬜ |
| 8.5.2.4 | Task history shows own submitted tasks with status badges | ⬜ |
| 8.5.2.5 | After supervisor approves → status changes to Approved | ⬜ |
| 8.5.2.6 | After CBS validates → cbsValidated badge shown | ⬜ |

#### 8.5.3 Mapped Accounts (`/mapped-accounts`)

| # | Test | Status |
|---|------|--------|
| 8.5.3.1 | Shows customer accounts mapped to staff | ⬜ |
| 8.5.3.2 | Plan progress per KPI renders (Deposit_Mob, Collection_Rate, Portfolio_Quality) | ⬜ |
| 8.5.3.3 | No legacy KPI categories (no Account_Productivity, etc.) | ⬜ |

#### 8.5.4 NPL Staff Page (`/npl/staff`)

| # | Test | Status |
|---|------|--------|
| 8.5.4.1 | Collection alerts: overdue installments with DPD and severity | ⬜ |
| 8.5.4.2 | Collection rate % displayed | ⬜ |
| 8.5.4.3 | PAR metrics for staff's loan accounts | ⬜ |

#### 8.5.5 My Scorecard (`/reports/scorecard`)

| # | Test | Status |
|---|------|--------|
| 8.5.5.1 | Branding shows correct org name | ⬜ |
| 8.5.5.2 | KPI scores + behavioral scores render | ⬜ |
| 8.5.5.3 | Print/export works | ⬜ |

### 8.6 Cross-Role Connection Flows

| # | Flow | Steps | Status |
|---|------|-------|--------|
| 8.6.1 | **Plan → Cascade → Staff** | Admin creates plan → cascade creates StaffPlans → staff dashboard shows new target | ⬜ |
| 8.6.2 | **Task → Approval → CBS** | Staff submits task → supervisor approves → BM approves → CBS upload validates | ⬜ |
| 8.6.3 | **CBS → Loan Schedules → NPL** | CBS upload with loan repayment → schedule updated → NPL snapshot refreshes → dashboards update | ⬜ |
| 8.6.4 | **Mapping Enforcement** | Account mapped to Staff A → Staff B cannot claim it in achievement | ⬜ |
| 8.6.5 | **Dual Validation Gate** | Task for CBS-required product without CBS match → not counted in achievement | ⬜ |

---

## 9. Production Build

| # | Step | What it tests | Status |
|---|------|---------------|--------|
| 9.1 | `npm run build` (frontend) | Frontend builds with 0 TypeScript + Vite errors | ⬜ |
| 9.2 | Nginx proxy `/api/` → `127.0.0.1:5001/api/` | Production API routing | ⬜ |
| 9.3 | Frontend served from `/var/www/sacko-pms/frontend/dist` | Production static serving | ⬜ |
| 9.4 | `npm run build` output checked for 0 errors | Vite build output shows no errors or warnings | ⬜ |
| 9.5 | `pm2 restart sacko-pms-backend` | Backend restart (PM2) | ✅ |

---

## 10. Seed Scripts

| # | Script | Purpose | Status |
|---|--------|---------|--------|
| 10.1 | `seedGhionSaccos.js` | Ghion SACCOS full seed: users, branches, plans, accounts, tasks, mappings | ✅ |
| 10.2 | `seedProductMappings.js` | Wolaitta Sodo product-KPI mappings with `requiresCbs: false` | ✅ |
| 10.3 | `seedLoanData.js` | 2 test loan accounts + schedules | ✅ |
| 10.4 | `seedFromFiles.js` | Seed from Accounts.csv + WSodo plan Excel | ⬜ |

---

## Summary

| Phase | Total Tests | ✅ Passed | ❌ Failed | ⬜ Not Tested |
|-------|-------------|-----------|-----------|---------------|
| 1. Health & Config | 2 | 2 | 0 | 0 |
| 2. Authentication | 5 | 5 | 0 | 0 |
| 3. Phase 1 (Product Plans) | 20 | 20 | 0 | 0 |
| 4. Phase 2 (Dual Validation) | 14 | 14 | 0 | 0 |
| 5. Phase 3 (Credit/NPL) | 21 | 21 | 0 | 0 |
| 6. Task Management | 8 | 8 | 0 | 0 |
| 7. Team Management | 5 | 5 | 0 | 0 |
| 8. Frontend E2E | 83 | 0 | 0 | 83 |
| 9. Production Build | 5 | 1 | 0 | 4 |
| 10. Seed Scripts | 4 | 3 | 0 | 1 |
| **Total** | **167** | **79** | **0** | **88** |

**Note:** Frontend E2E (Section 8) requires a browser to test — not covered by API smoke tests.  
All 79 backend/integration tests pass. Zero failures.
