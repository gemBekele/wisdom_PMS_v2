# Sacko-PMS: Complete System Workflow

## 1. Organizational Hierarchy

```
CEO / Admin
    │
    ▼
Area Manager ─── manages ─── Regions
    │                              │
    ▼                              ▼
Branch Manager ─── manages ─── Areas
    │                              │
    ▼                              ▼
Supervisor ─── manages ─── Branches
    │
    ▼
Staff (CR Officer, CS Officer, etc.)
```

### Roles & Access Levels

| Role | Scope | Can Approve Tasks Up To |
|---|---|---|
| `admin` / `CEO` | All branches | Task submission, all approvals |
| `areaManager` | Branches in their area | Branch level |
| `branchManager` | Their branch | Supervisor level |
| `supervisor` | Their supervisees | Staff tasks |
| `staff` | Own data only | Nothing |

### Positions (within Staff role)

- Customer Service Officer I / II
- Customer Relationship Officer I
- Customer Relationship Supervisor
- Sales & Marketing Officer I
- Operation Supervisor
- Internal Auditor
- Branch Manager
- Area Manager
- CEO

---

## 2. Data Hierarchy Flow

```
Region ──has_many──► Area ──has_many──► Branch ──has_many──► User (Staff)
  │                    │                     │
  │                    │                     └── has_many──► AccountMapping
  │                    │                     └── has_many──► Plan
  │                    │                     └── has_many──► NplSnapshot
  │                    │                     └── has_many──► CBSValidation
  │                    ▼
  └────────────► Area ──has_many──► Branch
```

Each branch has staff users. Staff users have accounts mapped to them.

---

## 3. CBS (Core Banking System) Integration

### 3.1 Product Mapping

```
CBS Product Names ──mapped_to──► KPI Category
                                      │
                                      ▼
                              e.g. "Deposit Mobilization"
```

**Pre-defined mappings (14 total):**

| CBS Product Name | Maps To KPI Category |
|---|---|
| LOAN SAVING RESERVE ACCOUNT | Deposit Mobilization |
| Michu Current Account | Deposit Mobilization |
| GIHON REGULAR SAVING | Deposit Mobilization |
| MOTHERS SAVING ACCOUNT | Deposit Mobilization |
| YOUNG WOMEN SAVING | Deposit Mobilization |
| ELDERS SAVING ACCOUNT | Deposit Mobilization |
| CHILDREN SAVING ACCOUNT | Deposit Mobilization |
| FIXED TIME DEPOSIT | Deposit Mobilization |
| Premium Saving | Deposit Mobilization |
| SPECIAL SAVING ACCOUNT | Deposit Mobilization |
| Segment Account | Deposit Mobilization |
| WADIAH SAVING ACCOUNT | Deposit Mobilization |
| REPAYMENT ACCOUNT | Internal Operations |
| School | Deposit Mobilization |

### 3.2 CBS File Upload & Validation

```
Admin uploads CBS file (.xlsx/.csv)
         │
         ▼
Reads file → normalizes column names
         │
         ▼
For each row:
  ├── Find matching AccountMapping by account number
  ├── Compare CBS balance vs PMS balance
  ├── If match → mark task as cbsValidated = true
  ├── If mismatch → create CBSDiscrepancy record
  └── If no task → log as note
         │
         ▼
Generate CBSValidation record with:
  - totalRecords, matchedRecords, unmatchedRecords
  - discrepancyCount
  - unmappedProducts (products not in ProductKpiMapping)
```

### 3.3 June Balance Import

```
Admin uploads June balance file (.xlsx)
         │
         ▼
For each row:
  ├── Match account by account_id or accountNumber
  ├── Store june_balance as baseline
  └── Used for incremental growth calculation
```

### 3.4 Account Mapping from CBS

```
CBS File Upload / Manual Entry
         │
         ▼
AccountMapping created with:
  - accountNumber, customerName, balance
  - mappedToId (assigned staff member)
  - branchId
  - product (CBS product name)
  - accountType (Savings, Current, Fixed_Deposit, Loan, etc.)
  - isProductive flag
         │
         ▼
For Loan accounts, additional fields:
  - loan_disbursement_date
  - loan_maturity_date
  - loan_principal
  - payment_frequency (Daily/Weekly/Monthly)
  - interest_rate
  - next_payment_date
         │
         ▼
Auto-generate LoanSchedule installments
  (Daily: 365 | Weekly: 52 | Monthly: 12 installments)
```

---

## 4. Plan Management Flow (HQ → Staff)

### 4.1 Plan Creation (Admin)

```
Admin creates Branch-Level Plan
         │
         ├── KPI-based plan: (kpi_category, target_value)
         │     e.g., "Deposit Mobilization" → 40,500,000 ETB
         │
         └── Product-based plan: (product_category, target_value, target_count, monthly_plan)
               e.g., "Michu Current Saving" → 60,750,000 ETB, 13,994 accounts
               monthly_plan = [{month:"July", amount:X, count:Y}, ...]
         │
         ▼
Plan stored in `plans` table with:
  - branch_code, branchId
  - kpi_category OR product_category
  - period (e.g. "FY-2026-27")
  - target_value (amount), target_count (accounts)
  - monthly_plan (JSON array of 12 months)
  - status: Active
```

### 4.2 Plan Cascade (Branch → Staff)

```
Plan created
    │
    ▼
cascadeBranchPlan(plan) is triggered
    │
    ▼
For each staff member in the branch:
    ├── Look up their position
    ├── Find plan_share_percent from KPI framework config
    │   (e.g., CR Officer = 25%, CS Officer = 35%, etc.)
    │
    ├── Calculate individual_target:
    │   individual_target = plan.target_value × plan_share_percent / 100
    │
    ├── Calculate daily_target:
    │   daily_target = individual_target / working_days_in_period
    │
    ├── For product plans, also calculate target_count
    │
    └── Create StaffPlan record:
        - userId, position, kpi_category/product_category
        - individual_target, yearly_target, monthly_target
        - weekly_target, daily_target
        - plan_share_percent, status: Active
```

### 4.3 Plan Cascade Share Percentages (by Position)

| Position | Cascade Share (KPI) |
|---|---|
| CR Officer | 25% |
| CS Officer | 35% |
| CR Supervisor | 20% |
| Branch Manager | 10% |
| Operation Supervisor | 10% |

For **product-level plans**, the cascade splits the target across all staff in the branch equally or by configured weights.

---

## 5. KPI Framework

### 5.1 KPI Categories

| Category | Type | Description |
|---|---|---|
| **Deposit Mobilization** | Amount | Total deposits collected |
| **New Member Registration** | Count | New members registered |
| **New Account Opening** | Count | New accounts opened |
| **Share Capital Growth** | Amount | Share capital increase |
| **Account Productivity** | Ratio | Active accounts / total accounts |
| **Mobile Banking Users** | Count | Mobile banking activations |
| **Merchant POS Growth** | Count | Merchant POS activations |
| **Billers Recruitment** | Count | Billers recruited |
| **Internal Operations** | Tasks | Internal tasks completed |
| **Collection Rate** | Percentage | Paid / Expected × 100 (NPL) |
| **Portfolio Quality** | Score | 100 - PAR 90 ratio (NPL) |

### 5.2 Product Categories (for Product-Level Plans)

```
Loan_Saving_Deposit       → "Loan Saving Deposit"
Michu_Current_Saving      → "Michu Current Saving"  
Gihon_Regular_Saving      → "Gihon Regular Saving"
Mothers_Saving            → "Mothers Saving"
Young_Womens_Saving       → "Young Womens Saving"
Elders_Saving             → "Elders Saving"
Children_Saving           → "Children Saving"
Fixed_Time_Deposit        → "Fixed Time Deposit"
Premium_Saving_Deposit    → "Premium Saving Deposit"
Special_Saving            → "Special Saving"
Segment_Deposit           → "Segment Deposit"
Wadiah_IFB_Deposit        → "Wadiah IFB Deposit"
```

### 5.3 KPI Calculation Engine

```
calculateKPIScore(userId, branch_code, period)
         │
         ▼
For each KPI category assigned to user:
    ├── Fetch user's actual achievements (from DailyTasks)
    ├── Fetch user's target (from StaffPlan)
    ├── Calculate achievement_percent:
    │   achievement_percent = actual / target × 100
    │
    ├── For incremental KPIs (deposit growth):
    │   incremental = (current_balance - june_baseline) / june_baseline × 100
    │
    ├── For Collection_Rate:
    │   rate = total_paid_today / total_expected_today × 100
    │
    ├── For Portfolio_Quality:
    │   score = 100 - PAR_90_ratio
    │
    └── Apply KPI weight → weighted_score
         │
         ▼
Sum all weighted scores → kpiTotalScore
         │
         ▼
Combine with behavioralScore → finalScore
         │
         ▼
Map to rating:
    >= 90% → Outstanding (A)
    >= 75% → Excellent (B)
    >= 60% → Good (C)
    >= 40% → Fair (D)
     < 40% → Poor (E)
```

---

## 6. Daily Task & Approval Workflow

### 6.1 Task Submission (Staff)

```
Staff submits DailyTask
    │
    ├── taskType (from TaskType enum):
    │     Deposit_Mobilization, New_Member_Registration,
    │     New_Account_Opening, Mobile_Banking_Activation,
    │     Merchant_POS_Activation, Biller_Recruitment,
    │     Transaction_Processing, SMS_Alert_Config,
    │     Complaint_Resolution, Share_Capital,
    │     Account_Productivity
    │
    ├── accountNumber (linked to AccountMapping)
    ├── amount (achievement value)
    ├── remarks, evidence (optional)
    ├── mappingStatus
    │
    └── initial approvalStatus: Pending
```

### 6.2 Approval Chain

```
Task Submitted (status: Pending)
    │
    ▼
Supervisor reviews ──► Approve ──► status: Approved
    │                              │
    └── Reject ──► status: Rejected
    │
    └── Request Edit ──► status: Requested_Edit (staff resubmits)
    │
    ▼
Branch Manager reviews (for escalated tasks)
    │
    ▼
Area Manager reviews (for escalated tasks)
    │
    ▼
Task finalized
```

### 6.3 CBS Validation of Tasks

```
Task submitted
    │
    ▼
CBS Upload runs later in the day
    │
    ▼
For each task, CBS file is checked:
    ├── If CBS confirms the transaction:
    │     task.cbsValidated = true
    │     task.cbsValidatedAt = now
    │
    ├── If CBS shows different amount:
    │     CBSDiscrepancy created
    │     task remains unvalidated
    │
    └── If task not in CBS:
          task marked as potential discrepancy
```

### 6.4 Performance Impact

```
Task Approved + CBS Validated
    │
    ▼
task.performanceImpacted = true
task.performanceImpactedAt = now
    │
    ▼
Actual achievements are counted toward KPI calculation
```

---

## 7. Performance Scoring Flow

### 7.1 Score Composition

```
PerformanceScore
    │
    ├── kpiTotalScore (0-100) = weighted sum of all KPI scores
    │     └── Each KPI = actual_achievement / target × 100
    │
    ├── behavioralScore (0-100) = from BehavioralEvaluation
    │     └── Average of all competency scores
    │
    └── finalScore = kpiTotalScore × KPI_WEIGHT + behavioralScore × BEHAVIORAL_WEIGHT
          │
          ▼
    rating = mapScoreToRating(finalScore)
```

### 7.2 Scoring Periods

- Daily performance tracking (via tasks)
- Weekly performance scores
- Monthly performance scores
- Quarterly reviews (with behavioral evaluation)
- Yearly final score

---

## 8. NPL & Collection Tracking

### 8.1 Data Model

```
AccountMapping (accountType = "Loan")
    │
    ├── loan_disbursement_date
    ├── loan_maturity_date
    ├── loan_principal
    ├── payment_frequency (Daily/Weekly/Monthly)
    ├── interest_rate
    ├── next_payment_date
    │
    └── has_many──► LoanSchedule
                        ├── expectedDate
                        ├── expectedAmount
                        ├── paidAmount
                        ├── status (Pending/Paid/Partial/Missed)
                        └── daysPastDue
```

### 8.2 Loan Schedule Generation

```
When loan is mapped with payment_frequency:
    │
    ▼
autoGenerateLoanSchedules(accountId)
    │
    ▼
For each period from next_payment_date to maturity_date:
    ├── Monthly: 12 installments (principal/12)
    ├── Weekly: 52 installments (principal/52)
    └── Daily: 365 installments (principal/365)
```

### 8.3 DPD (Days Past Due) Calculation

```
For each loan account:
    │
    ▼
Find oldest unpaid installment where expectedDate <= today
    │
    ▼
DPD = today - oldest_unpaid_expectedDate (in days)
    │
    ▼
Classification:
    0 DPD      = Performing
    1-29 DPD   = Watch
    30-89 DPD  = Substandard
    90-179 DPD = Doubtful
    180+ DPD   = Loss
```

### 8.4 PAR (Portfolio at Risk) Calculation

```
PAR Metrics per branch/area/company:
    │
    ├── PAR 1   = Σ(balance of loans with DPD >= 1)   / total_portfolio × 100
    ├── PAR 30  = Σ(balance of loans with DPD >= 30)  / total_portfolio × 100
    └── PAR 90  = Σ(balance of loans with DPD >= 90)  / total_portfolio × 100
```

### 8.5 Daily NPL Snapshot

```
Daily snapshot per branch:
    │
    ▼
calculateParMetrics(branch loan accounts)
    │
    ▼
Upsert into npl_snapshots:
    - snapshotDate (today)
    - totalPortfolio, par1Amount, par30Amount, par90Amount
    - par1Ratio, par30Ratio, par90Ratio
    - totalLoans, par1Count, par30Count, par90Count
```

### 8.6 Staff Collection Alerts

```
getStaffCollectionAlerts(userId)
    │
    ▼
Find all loan accounts mapped to staff
    │
    ▼
Find overdue installments (last 30 days, unpaid)
    │
    ▼
Return alerts sorted by DPD (highest first)
    └── severity: high (DPD > 7), medium (DPD 3-7), low (DPD 1-2)
```

---

## 9. Role-Based Dashboard Matrix

Each role in the system has a distinct scope of data they can see and actions they can take. Below is the complete breakdown of what each role should see across all system domains.

```
Access Scope by Role:
                    │ Own Data │ Team/Staff │ Branch │ Area/A Region │ Company
────────────────────┼──────────┼────────────┼────────┼───────────────┼─────────
Staff               │    ✅    │     —      │   —    │      —        │    —
Supervisor          │    ✅    │    ✅      │   —    │      —        │    —
Branch Manager      │    ✅    │    ✅      │   ✅   │      —        │    —
Area Manager        │    ✅    │    ✅      │   ✅   │      ✅       │    —
Admin / CEO         │    ✅    │    ✅      │   ✅   │      ✅       │    ✅
```

### 9.1 Admin / CEO Dashboard

**Scope:** Entire company — all branches, areas, regions, users.

| Domain | What They See | Purpose |
|---|---|---|
| **Company KPIs** | Total target vs actual across all branches, per-KPI aggregation | Overall health check |
| **Plans** | Create/edit/upload plans (KPI + product), cascade to staff, view all branch plans and staff plans across all periods | Plan management |
| **NPL** | Company PAR 1/30/90, per-area summary, per-branch ranking (sorted worst-first), 90-day trend table | Credit risk oversight |
| **Branch Performance** | Per-branch KPI comparison, target vs actual, branch ranking | Branch evaluation |
| **Branch Operations** | All branches' daily task activity, per-staff drill-down | Operational monitoring |
| **User Management** | Create/edit/deactivate any user, assign roles, positions, branches | User administration |
| **Branch Management** | Create/edit/deactivate branches, assign managers, link to areas/regions | Org structure |
| **CBS Upload** | Upload CBS files, validate tasks, view discrepancies across all branches | Data reconciliation |
| **Product Mapping** | Map CBS product names → KPI categories | CBS integration config |
| **June Balance Import** | Upload June baseline balances for incremental growth calc | Performance baselines |
| **KPI Framework** | Configure KPI weights, min balances, cascade shares | System configuration |
| **Behavioral Eval** | View all evaluations, lock/unlock scores | Final score oversight |
| **Audit Log** | View all system actions with user, timestamp, details | Compliance & audit |
| **Mapped Accounts** | View all accounts across all branches | Account oversight |

**Key principle:** Admin sees everything — no data is hidden. This is the system owner role.

---

### 9.2 Area Manager Dashboard

**Scope:** All branches within their assigned area.

| Domain | What They See | Purpose |
|---|---|---|
| **Area KPIs** | Per-branch KPI comparison within their area, aggregate area totals | Area performance |
| **Area NPL** | Per-branch NPL comparison (sorted by PAR 90), area PAR summary, 30-day PAR 90 trend | Area credit risk |
| **Branch Monitoring** | All branches in area: daily task activity, staff performance, date/status/staff filtering | Operational monitoring |
| **Branch Performance** | Branch ranking, target vs actual for each KPI | Branch evaluation |
| **Staff Plans** | View staff plans for all branches in area | Planning visibility |
| **Mapped Accounts** | All accounts in area branches | Account oversight |
| **Behavioral Eval** | Evaluate staff in area branches | Personnel management |

**Key principle:** Area manager sees everything within their area but nothing outside it. If an area has no region/area manager (system configured without regional layer), this role is unused — admin handles it directly.

---

### 9.3 Branch Manager Dashboard

**Scope:** Their single branch and all staff/supervisors within it.

| Domain | What They See | Purpose |
|---|---|---|
| **Branch KPIs** | Branch target vs actual for each KPI category | Branch performance |
| **Per-Staff KPIs** | Each staff member's individual performance vs their targets | Staff evaluation |
| **Branch NPL** | PAR 1/30/90 ratios, aging ladder (current → 90+), staff collection performance table, overdue loans detail | Credit risk management |
| **Branch Operations** | Daily task activity for the branch: per-staff task counts, amounts, approval statuses | Daily ops monitoring |
| **Pending Approvals** | Tasks pending approval from their supervisors/staff chain | Approval workflow |
| **CBS Discrepancies** | View discrepancies for their branch | Data quality |
| **Mapped Accounts** | All accounts in their branch | Account oversight |
| **Behavioral Eval** | Evaluate staff in branch | Personnel management |

**Key principle:** Branch manager sees their branch completely — all staff, all accounts, all tasks. But cannot see other branches' data.

---

### 9.4 Supervisor Dashboard

**Scope:** Their direct supervisees (team members).

| Domain | What They See | Purpose |
|---|---|---|
| **Team KPIs** | Each team member's KPI progress (aggregated from individual StaffPlans) | Team performance |
| **Team NPL Alerts** | Collection alerts per team member: overdue installments with severity, DPD, amounts | Collection follow-up |
| **Pending Approvals** | Tasks submitted by team members that need approval | Approval workflow |
| **Team Tasks** | Task submission history for team members | Activity monitoring |
| **Behavioral Eval Input** | Submit behavioral evaluations for team members | Performance input |

**Key principle:** Supervisor sees their team only — cannot see other teams' data or branch-level aggregates.

---

### 9.5 Staff Dashboard

**Scope:** Their own data only.

| Domain | What They See | Purpose |
|---|---|---|
| **Personal KPIs** | Individual target vs actual for each assigned KPI category, with progress bars and status (On Track / Needs Focus / At Risk) | Self-performance tracking |
| **Daily/Period Comparison** | Today vs yesterday task counts, this month vs last month | Self-monitoring |
| **Collection Alerts** | Overdue loan installments for accounts mapped to them, with DPD, severity, amounts | Collection follow-up |
| **Collection Rate** | Today's collection rate: paid amount / expected amount × 100 | Performance metric |
| **Mapped Accounts** | All accounts mapped to them: balance, productivity status, June baseline, last transaction | Account management |
| **Task Entry** | Submit daily tasks with account number, amount, task type, product type | Data entry |
| **Task History** | Their own submitted tasks and approval statuses | Self-audit |
| **Performance Score** | Their KPI score, behavioral score, final rating | Performance awareness |

**Key principle:** Staff sees ONLY data linked to them — their accounts, their tasks, their targets. No peer or branch data visible.

---

### 9.6 What Each Role Cannot See

| Role | Cannot See |
|---|---|
| **Staff** | Other staff data, branch aggregates, other branches, plans, NPL beyond own alerts, CBS data, user mgmt, evaluations of others |
| **Supervisor** | Other teams' data, branch-level aggregates, other branches, area data, company NPL, CBS upload, user mgmt |
| **Branch Manager** | Other branches, area comparison beyond their branch, company-wide NPL, CBS upload (only view discrepancies) |
| **Area Manager** | Other areas, company-wide data beyond their area scope, CBS upload |
| **Admin** | Nothing — full visibility |

---

### 9.7 Dashboard Page Mapping

| Page | Route | Roles | What It Shows |
|---|---|---|---|
| StaffDashboard | `/dashboard` | staff | Personal KPIs, collection alerts, mapped accounts, period comparison |
| SupervisorDashboard | `/dashboard` | supervisor | Team overview, pending approvals summary |
| BranchManagerDashboard | `/dashboard` | branchManager | Branch KPIs, staff performance, operations summary |
| AreaManagerDashboard | `/dashboard` | areaManager | Area-wide KPI summary, branch comparison |
| CEODashboard | `/dashboard` | admin | Company-wide KPI snapshot, quick links |
| BranchMonitoring | `/branch-monitoring` | areaManager, branchManager | Per-branch/per-staff daily task activity with filters |
| SupervisorApprovals | `/approvals` | supervisor, branchManager | Pending tasks with bulk approve, individual reject |
| TaskEntryForm | `/tasks/new` | staff, supervisor | Submit daily task |
| StaffDashboard page also links to | `/kpi` | staff | Detailed KPI breakdown |
| StaffDashboard page also links to | `/mapped-accounts` | branchManager, supervisor, staff | Account listing |
| HqNplDashboard | `/npl/hq` | admin | Company PAR 1/30/90, branch ranking, area summary, 90-day trend |
| AreaNplDashboard | `/npl/area` | areaManager | Per-branch NPL comparison, 30-day trend |
| BranchNplDashboard | `/npl/branch` | branchManager | PAR metrics, aging ladder, staff collection, overdue loans |
| TeamNplAlerts | `/npl/team-alerts` | supervisor | Team collection alerts grouped by staff |
| PlansOverview | `/plan-cascade/overview` | admin | All plans with charts, branch + staff plan tables |
| PlanCascade | `/plan-cascade` | admin | Create plans (manual + upload), view product/staff plans |

---

## 10. Behavioral Evaluation

```
Supervisor evaluates staff (periodic)
    │
    ▼
BehavioralEvaluation created:
    - evaluatedUserId, evaluatedById
    - period (Monthly/Quarterly/Yearly)
    - competencies (JSON: {competency_name: score})
    - totalScore (average of all competencies)
    - approvalStatus (Draft/Submitted/Approved)
    │
    ▼
Behavioral score flows into PerformanceScore
```

---

## 11. Complete End-to-End Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                     CBS (Core Banking System)            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ Product List │  │Account List  │  │ Transactions │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
└─────────┼─────────────────┼─────────────────┼───────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────┐
│                     PMS System                           │
│                                                         │
│  1. Product Mapping ◄── CBS Products                    │
│     (Admin maps CBS products to KPI categories)        │
│                                                         │
│  2. Account Mapping ◄── CBS Accounts                    │
│     (Accounts assigned to staff + branches)            │
│     ├── For Loans → Generate LoanSchedules             │
│     └── For Savings → Track balance for growth        │
│                                                         │
│  3. Plan Creation (Admin)                               │
│     ├── KPI-based plans                                 │
│     └── Product-based plans (with monthly targets)     │
│          │                                              │
│          ▼                                              │
│  4. Plan Cascade                                        │
│     (Branch plan → Individual StaffPlans)              │
│          │                                              │
│          ▼                                              │
│  5. Daily Task Submission (Staff)                       │
│     ├── Task submitted with amount + account           │
│     └── Goes through approval chain:                    │
│         Supervisor → BM → Area Manager                 │
│          │                                              │
│          ▼                                              │
│  6. CBS Validation                                      │
│     (Admin uploads CBS → tasks validated)              │
│          │                                              │
│          ▼                                              │
│  7. Performance Scoring                                  │
│     ├── KPI Score (actual vs target)                   │
│     ├── Behavioral Score (from evaluation)             │
│     └── Final Score = KPI + Behavioral                 │
│          │                                              │
│          ▼                                              │
│  8. NPL Tracking (for Loan accounts)                    │
│     ├── DPD Calculation                                 │
│     ├── PAR Metrics (1/30/90)                          │
│     ├── Daily Snapshots                                 │
│     └── Collection Alerts                               │
│                                                         │
│  9. Dashboards (role-based)                             │
│     ├── Staff: My tasks, my KPIs, collection alerts    │
│     ├── Supervisor: Team tasks, team alerts            │
│     ├── Branch Manager: Branch NPL, branch KPIs        │
│     ├── Area Manager: Area comparison                  │
│     └── Admin/HQ: Company-wide view                    │
└─────────────────────────────────────────────────────────┘
```

---

## 12. API Endpoint Map

### NPL Endpoints

| Method | Route | Purpose | Access |
|---|---|---|---|
| GET | `/api/npl/staff` | Staff collection alerts + rate | Staff |
| GET | `/api/npl/branch` | Branch PAR + aging ladder | Branch Manager |
| GET | `/api/npl/area` | Per-branch NPL comparison | Area Manager |
| GET | `/api/npl/hq` | Company-wide NPL overview | Admin |
| GET | `/api/npl/team-alerts` | Supervisor's team alerts | Supervisor |
| GET | `/api/npl/schedules/:accountId` | Loan repayment schedule | Staff+ |
| POST | `/api/npl/schedules/:accountId/generate` | Auto-generate schedule | Staff+ |
| PUT | `/api/npl/schedules/:id/pay` | Mark installment paid | Staff+ |
| POST | `/api/npl/snapshot` | Trigger daily snapshot | Admin/BM |

### Plan Endpoints

| Method | Route | Purpose | Access |
|---|---|---|---|
| POST | `/api/plans` | Create plan manually | Admin |
| POST | `/api/plans/upload` | Upload Excel plan file | Admin |
| GET | `/api/plans` | Get all plans (filtered) | All |
| GET | `/api/plans/:id` | Get single plan | All |
| PUT | `/api/plans/:id` | Update plan | Admin |

### Other Key Endpoints

| Method | Route | Purpose | Access |
|---|---|---|---|
| POST | `/api/cbs/upload` | Upload CBS file | Admin |
| POST | `/api/cbs/validate` | Validate tasks against CBS | Admin |
| GET | `/api/cbs/discrepancies` | View CBS discrepancies | Admin/BM |
| GET | `/api/dashboard/staff` | Staff dashboard | Staff |
| GET | `/api/dashboard/branch` | Branch dashboard | BM |
| GET | `/api/dashboard/area` | Area dashboard | Area Manager |
| GET | `/api/dashboard/hq` | HQ dashboard | Admin |
| POST | `/api/tasks` | Submit daily task | Staff |
| GET | `/api/tasks/pending-approval` | Pending tasks to approve | Supervisor+ |
| PUT | `/api/tasks/:id/approve` | Approve/reject task | Supervisor+ |
| GET | `/api/performance/score` | Get performance score | All |
| POST | `/api/behavioral/evaluate` | Submit behavioral eval | Supervisor |
| GET | `/api/product-mappings` | Get CBS→KPI mappings | Admin |
| POST | `/api/june-balance/import` | Import June balances | Admin |
| GET | `/api/regions` | List regions | All |
| GET | `/api/areas` | List areas (filter by region) | All |
| GET | `/api/branches` | List branches | All |

---

## 13. Color Coding Rules (Dashboards)

| Metric | Green | Amber | Red |
|---|---|---|---|
| PAR 90 | < 5% | 5-10% | > 10% |
| PAR 30 | < 10% | 10-20% | > 20% |
| Collection Rate | ≥ 90% | 60-89% | < 60% |
| Portfolio Quality | ≥ 80 | 60-79 | < 60 |
| KPI Achievement | ≥ 90% | 60-89% | < 60% |

---

## 14. Key Business Rules

1. **Plan Cascade**: A branch plan's target is distributed among staff based on position weights. The sum of all staff shares = 100%.

2. **Incremental Growth**: Deposit growth is measured from June baseline balance, not total balance.

3. **Productive Accounts**: An account is "productive" if it meets minimum balance thresholds based on its product type.

4. **CBS Reconciliation**: Tasks are only counted toward performance if CBS-validated. Discrepancies must be resolved by admin.

5. **NPL Snapshot**: Generated once daily per branch. Used for trend analysis.

6. **Approval Chain**: Tasks flow upward. Each approver can only see tasks from their direct reports.

7. **Edit Requests**: Approvers can "Request Edit" on a task instead of rejecting outright, allowing staff to fix and resubmit.
