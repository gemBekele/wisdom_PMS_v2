# SACCOS Performance Management System — Complete System Overview

> **Branch:** `pms-last-update`  
> **Production URL:** `http://51.91.125.62:3006`  
> **API Base:** `http://51.91.125.62:3006/api`  
> **Backend:** Node.js (Express) on port 5001, managed via PM2  
> **Frontend:** React + Vite + TypeScript, served by Nginx (port 3006)  
> **Database:** PostgreSQL on localhost:5432, database `sako_pms`  
> **Nginx:** reverse-proxies `/api/` → `127.0.0.1:5001/api/`

---

## 1. Organizational Hierarchy

```
SACCOS (Company)
│
└── Regions
    │
    └── Areas (managed by Area Manager)
        │
        └── Branches (managed by Branch Manager)
            │
            ├── Teams (managed by Supervisor)
            │   └── Staff / Officers
            │
            └── Unassigned Staff / Officers
```

### Positions in the System (from highest to lowest):

| Position | Role | Can Manage |
|----------|------|------------|
| **CEO** | `admin` | Everything — all branches, areas, users, config |
| **Area Manager** | `areaManager` | Multiple branches within an area |
| **Branch Manager** | `branchManager` | Single branch — staff, teams, approvals |
| **Operation Supervisor** | `supervisor` | Team of staff members, first-level approvals |
| **Customer Relationship Supervisor** | `supervisor` | Team of staff members, first-level approvals |
| **Customer Service Officer I/II** | `staff` | Their own mapped accounts and tasks |
| **Sales & Marketing Officer I** | `staff` | Their own mapped accounts and tasks |
| **Customer Relationship Officer I** | `staff` | Their own mapped accounts and tasks |
| **Internal Auditor** | `staff` | Their own tasks (excluded from plan cascade) |

---

## 2. Role-Based Access — What Each Role Can Do

### Admin / CEO
- **Login at:** `/login` → redirects to `/dashboard/hq`
- **Dashboard:** Company-wide HQ view — total branches, staff, avg achievement %, branch heatmap, performance distribution, CBS validation rate, activity feed, NPL summary (PAR ratios, total portfolio)
- **Can do:**
  - Create/manage users (all roles), reset passwords
  - Create/edit/delete Plans (branch-level targets)
  - Upload plans from Excel (bulk)
  - Cascade plans to staff
  - Upload CBS files for validation (any branch)
  - View all CBS validations, resolve discrepancies
  - Manage product-KPI mappings (which CBS product maps to which KPI)
  - Configure KPI framework (weights, scoring)
  - Manage regions, areas, branches (create/edit/delete)
  - Import June balance baselines from Excel
  - View audit trail (all system activity)
  - View HQ NPL dashboard (company-wide PAR 1/30/90)
  - View all teams (read-only)

### Area Manager
- **Login at:** `/login` → redirects to `/dashboard/area`
- **Dashboard:** Area overview — per-branch performance cards, branch comparison chart, mapping coverage stats, trend data, low-performer highlights
- **Can do:**
  - View all branches in their area
  - View area NPL dashboard (per-branch PAR)
  - Upload CBS files for branches in their area
  - Create/manage users for their area (BM and below)
  - Manage account mappings
  - View area performance reports

### Branch Manager
- **Login at:** `/login` → redirects to `/dashboard/branch`
- **Dashboard:** Branch overview — staff count, mapped accounts, daily deposit target vs achievement, KPI data (Deposit_Mob, Collection_Rate, Portfolio_Quality), NPL summary, team performance table (per-staff target/actual/percentage with color coding: green ≥80%, yellow ≥60%, red <60%)
- **Can do:**
  - Manage teams (create/update/delete teams, assign supervisor, add/remove members)
  - Upload CBS files for their branch
  - View Branch NPL dashboard (PAR metrics, aging ladder, staff breakdown, 30-day trend, overdue accounts)
  - Second-level (final) approval of tasks
  - Approve behavioral evaluations
  - View branch operations dashboard
  - View/edit account mappings for their branch
  - Auto-balance mappings (distribute unmapped accounts across staff)
  - Create/manage users for their branch (supervisor and below)
  - View team performance
  - Trigger NPL snapshot manually

### Supervisor
- **Login at:** `/login` → redirects to `/dashboard/supervisor`
- **Dashboard:** Team overview — team members with name/position/mapped accounts/KPI%, team stats (total members, mapped accounts, avg achievement), own KPI breakdown, team KPI breakdown
- **Can do:**
  - First-level approval of tasks (their supervisees' tasks)
  - View NPL team alerts (overdue collection alerts grouped by supervisee)
  - View/edit own mapped accounts
  - Create behavioral evaluations
  - View team hub
  - Submit their own tasks (Supervisors are also "staff" who log daily work)
  - View personal staff dashboard

### Staff / Officer
- **Login at:** `/login` → redirects to `/dashboard/staff`
- **Dashboard:** Personal dashboard — deposit target vs achieved, incremental growth from June baseline, today vs yesterday comparative stats (tasks/amounts with % change), mapped accounts table with balances/growth/status, collection alerts (overdue installments), collection rate %, NPL summary
- **Can do:**
  - Submit daily tasks (log deposit collections)
  - View/edit phone numbers on their mapped accounts
  - View their mapped accounts with plan progress
  - View their KPI dashboard
  - View monthly scorecard
  - Edit own tasks (when requested by approver)

---

## 3. KPI System — The 3 Active KPIs

The system tracks **3 Key Performance Indicators** that drive the performance score:

| KPI | Code | Default Weight | How It's Calculated |
|-----|------|---------------|---------------------|
| **Deposit Mobilization** | `Deposit_Mobilization` | **40%** | Sum of positive growth (current_balance - June_30_baseline) across all mapped accounts with balance ≥ 1,000 ETB |
| **Collection Rate** | `Collection_Rate` | **30%** | (Total paid today / total expected today) × 100 for loan schedules |
| **Portfolio Quality** | `Portfolio_Quality` | **30%** | 100 - PAR90_ratio (if totalPortfolio > 0, else 100). Measures how clean the loan portfolio is |

### KPI Score Formula
```
For each KPI:  score = actual / target × 100
               
KPI Total = (Deposit_Mob_score × 0.40 + Collection_Rate_score × 0.30 + Portfolio_Quality_score × 0.30) × 0.85

Final Score = KPI Total + Behavioral Score (max 15)

Rating:
  ≥ 120: Outstanding
  ≥ 100: Exceeds Expectations
  ≥ 90:  Meets Expectations
  ≥ 80:  Needs Improvement
  < 80:  Unsatisfactory
```

### Performance Score Dashboard (Staff View)

On the Staff Dashboard, you see:
- **Deposit Target** (Birr) — your total target from all plan products
- **Achieved** (Birr) — your actual deposit growth so far, with % achievement
- **Incremental Growth** — total growth from June 30 baseline
- **Active Accounts** — count of mapped accounts with balance ≥ 1,000 ETB
- **Today vs Yesterday** — task count and amount comparison with trend arrows
- **This Month vs Last Month** — monthly task comparison
- **Collection Alerts** — overdue loan installments with severity (high/medium/low)
- **Product Progress** — per-product actual/target bars
- **Mapped Accounts Table** — every account with account#/customer/phone/june balance/current balance/growth/status/productivity

---

## 4. Plan → Cascade → Staff Flow

### How Targets Are Set

```
Admin creates a Branch Plan
  │  Required: branch_code, kpi_category (Deposit_Mobilization), period, target_value
  │  Optional: product_category, target_count
  │
  ▼
System cascades the plan to all staff in that branch
  │  1. Groups staff by position
  │  2. Applies share percentages:
  │     - Operation Supervisor: 35%
  │     - CR Supervisor: 25%
  │     - CR Officer: 15%
  │     - CS Officer: 25%
  │     - Branch Manager: excluded
  │     - Internal Auditor: excluded
  │  3. If a position group has no members, their share is redistributed
  │     proportionally to the groups that DO have members
  │  4. Each staff member gets a StaffPlan with individual targets:
  │     - yearly, monthly, weekly, and daily breakdowns
  │
  ▼
Staff can see their targets on their Dashboard
```

### Where to Set Plans
- **Create a plan:** Admin → `/plan-cascade` → Create Plan form (select branch, KPI, period, target amount)
- **View plans:** Admin → `/plan-cascade/overview` (see all plans with filters by branch/KPI/period/status)
- **Upload plans from Excel:** Admin → `/plan-cascade` → Upload tab

### Important Notes
- Plans use **period normalization** — entering "2025-H2" becomes "FY-2026-27"
- When a plan is updated (target changed), the cascade automatically re-runs
- Deposit Mobilization plans can be at product level (e.g., "Loan_Saving_Deposit" target) or KPI level

---

## 5. Daily Task Lifecycle — How Staff Record Their Work

This is the CORE workflow of the system — how staff record their daily deposit collections.

### Step-by-Step:

#### A. Staff Submits a Task

1. **Navigate to:** `/tasks/new` (or click "Add Task" from an account on the dashboard)
2. **Fill in:**
   - **Task Type** — select from 12 deposit product types:
     - Loan Saving Deposit, Michu Current Saving, Gihon Regular Saving, Mothers Saving
     - Young Womens Saving, Elders Saving, Children Saving, Fixed Time Deposit
     - Premium Saving Deposit, Special Saving, Segment Deposit, Wadiah IFB Deposit
   - **Product Type** — CBS product name (e.g., "LOAN SAVING RESERVE ACCOUNT")
   - **Account** — search and select from your mapped accounts, or type account number
   - **Customer Name** — (only required if it's a new/unmapped account)
   - **Amount** — the deposit amount in Birr
   - **Task Date** — the date this work was done
   - **Remarks** — optional notes
3. **System checks account mapping:**
   - Account mapped to YOU → "Mapped to You" badge (counts toward KPI)
   - Account mapped to another staff → "Mapped to Another Staff" badge (won't count toward your KPI)
   - Account not found → "Unmapped" badge (requires BM approval, won't count until resolved)
4. **Submit** — task is created with status "Pending"

#### B. Task Approval Chain

```
Staff submits task (status: Pending)
  │
  ▼
[First] Supervisor approves or rejects
  │  Only supervisees' tasks appear
  │  Can also request edits
  │
  ▼
[Final] Branch Manager approves or rejects
  │  All branch tasks that passed supervisor approval
  │  Final approval = task status changes to "Approved"
  │
  ▼
Task is now "Approved" (but still needs CBS validation to count for KPI)
```

**Where to approve:**
- **Supervisor:** `/approvals` (shows tasks from their supervisees)
- **Branch Manager:** `/approvals` (shows all branch tasks needing final approval)

**Edit Request Flow:**
- Approver clicks "Request Edit" → staff sees prompt on their task
- Staff edits the task at `/tasks`
- Supervisor/BM reviews the edit → approves or rejects

#### C. CBS Validation (Final Gate)

After approval, the task must be **CBS-validated** to count toward KPI achievement:

1. **Manager uploads CBS file** at `/cbs-validation`
2. System parses the Excel file, matches each CBS record to tasks by:
   - Account number
   - Task type (derived from CBS product name)
   - Amount (within 0.01 tolerance)
3. **Matched tasks** → `cbsValidated = true` → task NOW COUNTS toward KPI
4. Unmatched CBS records → create discrepancies (Amount_Mismatch, Missing_in_PMS)
5. Unmatched PMS tasks → create discrepancies (Missing_in_CBS)

#### D. Dual Validation Gate (How Tasks Count for KPI)

```
For CBS-required products (requiresCbs=true):
  Task counts for KPI ONLY IF: cbsValidated === true

For non-CBS products (requiresCbs=false, e.g. Felagot, Digital Saving):
  Task counts for KPI IF: approvalStatus === 'Approved' OR cbsValidated === true
```

**Plus mapping enforcement:**
- Task only counts for KPI if the account is unmapped (no owner) OR mapped to the submitting user
- Tasks on accounts mapped to someone else DON'T count toward your KPI

---

## 6. Account Mapping

### What Is Account Mapping?
Each CBS customer account must be "mapped" to a staff member. This determines:
- Who gets credit for that account's deposit growth (KPI calculation)
- Who can submit tasks against that account
- The account's contribution to the staff's performance

### How Accounts Get Mapped

1. **Manual mapping** — Manager creates mapping at `/mapping` (assign account to staff)
2. **Bulk upload** — Manager uploads Excel at `/bulk-mapping-upload` (matches staff by employeeId)
3. **Auto-mapping via CBS** — When CBS file is uploaded, accounts with balance ≥ 1,000 ETB that aren't yet mapped get auto-assigned to the staff who submitted an approved task for that account
4. **Auto-balance** — Manager distributes unmapped accounts evenly across staff via one click

### What Staff Sees
- On Staff Dashboard: table of all accounts mapped to them
- Account details shown: account number, customer name, phone, June balance, current balance, growth vs June, active status, productivity
- Staff can add phone numbers to their mapped accounts

### Important Rules
- An account can only be mapped to ONE staff member at a time
- If an account is mapped to Staff A, Staff B's tasks on that account won't count toward Staff B's KPI
- Only accounts with balance ≥ 1,000 ETB are considered "active" for KPI calculation

---

## 7. Loan Management & NPL Pipeline

### Loan Accounts
Loan accounts are a special type of AccountMapping (accountType: "Loan"). They have additional fields:
- Loan disbursement and maturity dates
- Principal amount
- Payment frequency (Daily/Weekly/Monthly)
- Interest rate
- Next/last payment dates

### Loan Schedules
Each loan account has installment schedules (`LoanSchedule`) with:
- Expected date and amount
- Paid amount
- Status: Pending / Paid / Partial / Missed
- Days Past Due (DPD)
- Auto-generated by the system or created via POST `/api/npl/schedules/:accountId/generate`

### How Loan Repayments Work

When a CBS file is uploaded containing loan account transactions:

1. System identifies loan accounts in the CBS data
2. For each loan transaction, finds the **oldest unpaid installment**
3. Applies the payment:
   - If CBS amount ≥ expected amount → installment marked "Paid", DPD = 0
   - If CBS amount < expected amount → installment marked "Partial", paidAmount accumulates
4. If no schedules exist yet, generates them automatically from loan data

### NPL (Non-Performing Loan) Pipeline

1. **DPD Calculation** — for each loan account, days past due is calculated:
   - Current date - expected payment date
2. **PAR Classification:**
   - 0 DPD → Performing
   - 1-29 DPD → Watch (PAR1 bucket)
   - 30-59 DPD → Substandard (PAR30 bucket)
   - 60-89 DPD → Doubtful
   - 90-179 DPD → Loss (PAR90 bucket)
   - 180+ DPD → Loss
3. **NPL Snapshot** — automatically generated after every CBS upload (or manually via POST /api/npl/snapshot)
4. **Snapshot data stored:** totalPortfolio, par1Amount/par30Amount/par90Amount, ratios, counts
5. **Collection Alerts** — staff see overdue installments on their dashboard with severity (high ≥30d, medium ≥7d, low <7d)

### NPL Dashboards

| Role | Page | What They See |
|------|------|---------------|
| **Staff** | `/npl/staff` (embedded in dashboard) | Collection alerts, collection rate %, PAR metrics for their loan accounts |
| **Supervisor** | `/npl/team-alerts` | Team members' collection alerts grouped by staff |
| **Branch Manager** | `/npl/branch` | Branch PAR metrics, aging ladder (Current/1-29/30-59/60-89/90+), staff breakdown, 30-day trend, overdue accounts list |
| **Area Manager** | `/npl/area` | Per-branch PAR summary, area rollup, trend |
| **Admin** | `/npl/hq` | Company-wide PAR, per-area summary, per-branch ranking (worst PAR90 first), 90-day trend |

---

## 8. Teams

### Team Structure
- Teams belong to a **Branch**
- Teams have a **Manager** (must be a supervisor)
- Teams have **Members** (staff/officers)
- A staff member can only belong to ONE team

### Team Management
- **Branch Manager** manages teams at `/teams`
- Can create teams, assign supervisor, add/remove members
- The UI shows a card layout with avatar badges
- Already-assigned staff show "In: TeamName" badge (checkbox disabled)

### What Teams Enable
- Supervisors can see and approve tasks from their team members
- Team-based performance views on supervisor dashboard
- Team-level NPL alerts

---

## 9. Performance Scoring — Putting It All Together

### Full Score Calculation

```
Staff logs Daily Tasks → approved → CBS-validated
  │
  ▼
System calculates KPI scores:
  │  Deposit_Mobilization: growth from June baseline
  │  Collection_Rate: today's loan collection %
  │  Portfolio_Quality: 100 - PAR90_ratio
  │
  ▼
Behavioral Evaluation (optional, created by supervisor at /behavioral-input):
  │  Scored on competencies (0-5 each with weights)
  │  Scaled to max 15 points
  │
  ▼
Final Score = KPI_Total (max 85) + Behavioral (max 15) = max 100
  
  Rating:
    Outstanding          ≥ 120% of target
    Exceeds Expectations ≥ 100%
    Meets Expectations   ≥ 90%
    Needs Improvement    ≥ 80%
    Unsatisfactory       < 80%
```

### Where to See Scores
- **Staff:** Their dashboard shows current achievement %
- **Supervisor:** Team members' KPI percentages
- **Branch Manager:** Team performance table with status colors
- **Admin:** HQ dashboard with performance distribution

---

## 10. CBS Validation — Complete Pipeline

### What Is CBS?
CBS (Core Banking System) is the bank's transaction database. Staff record their work in PMS as "tasks." CBS validation confirms those tasks match real bank transactions.

### Upload Flow

1. **Who uploads:** Admin, Area Manager, or Branch Manager at `/cbs-validation`
2. **Input:** Excel file from CBS with columns: accountNumber, amount, balance, product, etc.
3. **Processing:**
   - Parse file → Convert to JSON
   - Detect unmapped CBS products (products not yet mapped to any KPI)
   - Update account balances (current_balance, active_status, product field)
   - Auto-map new accounts (≥1,000 ETB, matches approved task → assign to submitter)
   - Validate CBS vs PMS tasks (match by account + task type + amount)
   - **Process loan repayments** (update loan schedules)
   - **Generate NPL snapshot** (auto-trigger)
4. **Results:**
   - Matched tasks get `cbsValidated: true`
   - Discrepancies created for unmatched records
   - Validation report shows match rate, discrepancies, unmapped products

### Discrepancy Resolution
- Discrepancies are shown in the CBS validation page
- Users can resolve them with notes via PUT `/api/cbs/:id/resolve/:discrepancyId`

---

## 11. Behavioral Evaluation

### Purpose
Evaluates soft skills and behavioral competencies (15% of final score).

### Process
1. **Supervisor** creates behavioral evaluations at `/behavioral-input`
2. Evaluates staff on competencies (each scored 0-5, with weights)
3. **Branch Manager** approves at `/behavioral-evaluation`
4. Score is capped at max 15 points
5. Combined with KPI score for final performance score

---

## 12. Frontend Pages & Navigation Guide

### Quick Access by Role

#### Admin / CEO
| Page | URL | Purpose |
|------|-----|---------|
| HQ Dashboard | `/dashboard/hq` | Company-wide KPIs, branches, performance distribution, NPL, activity feed |
| Plans | `/plan-cascade/overview` | View all plans with filters |
| Create Plan | `/plan-cascade/create` | Create new branch plan |
| Plan Upload | `/plan-cascade/upload` | Upload plans from Excel |
| CBS Validation | `/cbs-validation` | Upload CBS files, view results |
| NPL HQ | `/npl/hq` | Company-wide NPL metrics |
| User Management | `/user-management` | Create/edit/deactivate users |
| Branch Management | `/branch-management` | Create/edit branches |
| Product Mapping | `/product-mapping` | Map CBS products to KPIs |
| KPI Framework | `/kpi-framework` | Configure KPI weights |
| June Balance Import | `/june-balance-import` | Import baseline balances |
| Audit Trail | `/audit-trail` | View all system activity |
| Competency Framework | `/competency-framework` | Configure behavioral competencies |
| Settings | `/settings` | Account preferences |

#### Area Manager
| Page | URL | Purpose |
|------|-----|---------|
| Area Dashboard | `/dashboard/area` | Branch performance, comparison, trends |
| Area NPL | `/npl/area` | Per-branch NPL summary |
| Area Performance | `/area-performance` | Detailed performance analytics |
| CBS Validation | `/cbs-validation` | Upload CBS for area branches |
| Tasks | `/tasks` | View tasks |
| Reports | `/reports` | Performance reports |

#### Branch Manager
| Page | URL | Purpose |
|------|-----|---------|
| Branch Dashboard | `/dashboard/branch` | Staff KPIs, targets, NPL, team table |
| Branch NPL | `/npl/branch` | PAR metrics, aging ladder, overdue accounts |
| Teams | `/teams` | Create/manage teams |
| Approvals | `/approvals` | Final-approve tasks |
| CBS Validation | `/cbs-validation` | Upload CBS for branch |
| Branch Monitoring | `/branch-monitoring` | Daily operations |
| Branch Performance | `/branch-performance` | Performance reports |
| Mapping | `/mapping` | Manage account mappings |
| Bulk Mapping Upload | `/bulk-mapping-upload` | Upload mappings from Excel |
| Mapped Accounts | `/mapped-accounts` | View branch mappings |
| Tasks | `/tasks` | View branch tasks |
| Behavioral Evaluation | `/behavioral-evaluation` | Approve evaluations |

#### Supervisor
| Page | URL | Purpose |
|------|-----|---------|
| Supervisor Dashboard | `/dashboard/supervisor` | Team members' KPIs, own performance |
| Approvals | `/approvals` | First-approve team tasks |
| NPL Team Alerts | `/npl/team-alerts` | Team collection alerts |
| Team Hub | `/team-hub` | Team overview |
| Tasks | `/tasks` | View tasks (own + team) |
| New Task | `/tasks/new` | Submit own tasks |
| Mapped Accounts | `/mapped-accounts` | View mappings |
| Behavioral Input | `/behavioral-input` | Create behavioral evaluations |
| KPI Dashboard | `/kpi` | Personal KPI breakdown |

#### Staff / Officer
| Page | URL | Purpose |
|------|-----|---------|
| Staff Dashboard | `/dashboard/staff` | Personal targets, growth, accounts, alerts |
| New Task | `/tasks/new` | Submit daily task |
| Tasks | `/tasks` | View own task history |
| Mapped Accounts | `/mapped-accounts` | All your mapped accounts |
| KPI Dashboard | `/kpi` | Personal KPI progress |
| Monthly Scorecard | `/reports/scorecard` | Monthly performance report |
| Settings | `/settings` | Account preferences |

---

## 13. End-to-End Workflow Examples

### Example 1: Daily Deposit Collection (Staff)

1. **Staff logs in** at `/login` → redirected to `/dashboard/staff`
2. Views their targets and mapped accounts
3. Clicks **"Add Task"** on an account (or navigates to `/tasks/new`)
4. Selects **Task Type:** "Loan Saving Deposit"
5. Account auto-populates, **Customer Name** shows from mapping
6. Enters **Amount:** 5,000 Birr
7. Sets **Task Date** to today
8. Clicks **Submit Task**
9. Task created with status "Pending" → approval chain built
10. **Supervisor** sees it at `/approvals` → clicks **Approve**
11. **Branch Manager** sees it at `/approvals` → clicks **Approve**
12. Task status → "Approved"
13. Later that day/week, **Branch Manager uploads CBS file** at `/cbs-validation`
14. CBS matches the task → `cbsValidated: true`
15. **Task now counts** toward staff's Deposit Mobilization KPI
16. Staff's **dashboard updates** — growth % increases, achievement bar progresses

### Example 2: New Staff Member Joins

1. **Admin** creates user at `/user-management`:
   - Name, email, employee ID
   - Position: "Customer Service Officer I"
   - Role: staff
   - Branch: WOLAYTA_SODO
   - Supervisor: kidistale_gns@ghion.et
2. Staff receives credentials, logs in
3. **Branch Manager** maps accounts to the new staff at `/mapping` (or uses auto-balance)
4. **Admin** creates (or updates) branch plans → cascade automatically creates StaffPlan for the new staff with individual targets
5. New staff sees their dashboard with targets and accounts

### Example 3: Loan Collection & NPL Tracking

1. **CBS upload** processes loan account transactions
2. For a customer with a loan of 10,000 ETB (monthly installment: 1,000 ETB):
   - CBS shows a payment of 1,000 ETB → system finds the oldest unpaid installment
   - Marks it: status="Paid", paidAmount=1000, DPD=0
3. If no payment for 45 days:
   - System calculates DPD=45
   - Classifies as "Substandard" (PAR30 bucket)
   - Staff sees a **high-priority collection alert** on their dashboard
   - Branch NPL dashboard shows this account in the aging ladder
4. **Staff** visits the customer to collect → submits a task
5. Next CBS upload processes the new payment → installment updated, alert cleared

### Example 4: Creating & Cascading a New Plan

1. **Admin** creates a plan at `/plan-cascade/create`:
   - Branch: WOLAYTA_SODO
   - KPI: Deposit Mobilization
   - Period: FY-2026-27
   - Target: 50,000,000 ETB
2. System **auto-cascades** to all staff:
   - Operation Supervisor (1 person): 35% = 17,500,000 ETB
   - CR Supervisor (1 person): 25% = 12,500,000 ETB
   - CR Officers (3 people): 15% = 7,500,000 ETB → 2,500,000 each
   - CS Officers (4 people): 25% = 12,500,000 ETB → 3,125,000 each
3. Each staff sees their individual target on their dashboard
4. Staff work toward targets by logging daily tasks

---

## 14. Key Business Rules Summary

| Rule | Description |
|------|-------------|
| **Dual Validation** | Task only counts for KPI after CBS validation (unless it's a non-CBS product, where approval is enough) |
| **Mapping Enforcement** | Task only counts for KPI if account is unmapped OR mapped to the submitting user |
| **One Team Only** | Staff can only belong to one team |
| **Position-Based Cascade** | Plan targets distributed by position groups (OpSup 35%, CRSup 25%, CRO 15%, CSO 25%) |
| **Option A Redistribution** | Empty position groups' shares redistributed proportionally |
| **Period Normalization** | All periods normalized to "FY-YYYY-YY" format |
| **Balance ≥ 1000** | Only accounts with balance ≥ 1,000 ETB count as active for KPI |
| **Positive Growth Only** | Only positive growth from June baseline counts toward deposit KPI |
| **Sequential Approval** | Supervisors must approve before Branch Manager can |
| **No Same-Day Superseding** | CBS uploads don't supersede same-date validations |
| **BM Excluded from Cascade** | Branch Managers don't get individual deposit targets from plans |
| **Auditor Excluded** | Internal Auditors are excluded from plan cascade |

---

## 15. Technical Architecture

### Backend Stack
- **Runtime:** Node.js (v24.14.1)
- **Framework:** Express.js
- **Database ORM:** Prisma (PostgreSQL)
- **Auth:** JWT (JSON Web Tokens), bcrypt password hashing
- **File Upload:** Multer (Excel/CSV files)
- **File Processing:** xlsx library for Excel parsing

### Frontend Stack
- **Framework:** React 19, TypeScript
- **Build Tool:** Vite 7
- **Routing:** React Router DOM v7
- **Styling:** Tailwind CSS
- **UI Components:** Radix UI primitives, Lucide React icons
- **Charts:** Recharts
- **State Management:** React Context (UserContext, ConfigContext)

### Key Files Reference

| File | Purpose |
|------|---------|
| `backend/src/server.js` | Express app entry point |
| `backend/prisma/schema.prisma` | Database schema (all models, enums, relations) |
| `backend/src/routes/` | All API route definitions |
| `backend/src/controllers/` | Business logic per domain |
| `backend/src/utils/performanceCalculator.js` | KPI calculation engine |
| `backend/src/utils/planCascade.js` | Plan distribution logic |
| `backend/src/utils/periodUtils.js` | Period normalization |
| `backend/src/middleware/auth.js` | JWT authentication |
| `backend/src/middleware/rbac.js` | Role-based access control |
| `frontend/src/App.tsx` | Frontend routing and layouts |
| `frontend/src/contexts/UserContext.tsx` | Login/authentication state |
| `frontend/src/contexts/ConfigContext.tsx` | System config state |
| `frontend/src/lib/api.ts` | All API client calls |

---

## 16. Database Entity Relationships

```
Region ──→ Area ──→ Branch ──→ User (staff)
                           │
                           ├──→ Team ──→ User (members)
                           │
                           ├──→ Plan ──→ StaffPlan ──→ User
                           │
                           ├──→ AccountMapping ──→ User (mappedTo)
                           │         │
                           │         └──→ LoanSchedule
                           │
                           ├──→ DailyTask ──→ User (submittedBy)
                           │       │
                           │       └──→ TaskApproval ──→ User (approver)
                           │
                           ├──→ CBSValidation ──→ CBSDiscrepancy
                           │
                           └──→ NplSnapshot
```

---

## 17. Test Credentials

| Email | Password | Role | Branch |
|-------|----------|------|--------|
| `admin@ghion.et` | `1234` | Admin/CEO | All |
| `am@wolayta.et` | `1234` | Area Manager | Wolayta Area |
| `bm@sodo.et` | `1234` | Branch Manager | WOLAYTA_SODO |
| `kidistale_gns@ghion.et` | `1234` | Supervisor | WOLAYTA_SODO |
| `tigist_gns@ghion.et` | `1234` | Staff | WOLAYTA_SODO |
