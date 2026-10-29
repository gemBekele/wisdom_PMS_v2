# Ghion SACCOS PMS — System Overview

> Complete workflow documentation covering plan creation, cascade, task logging, approval chain, KPI calculation, role responsibilities, and data validation strategy.

---

## Table of Contents

1. [Organizational Structure](#1-organizational-structure)
2. [End-to-End Workflow](#2-end-to-end-workflow)
3. [Plan Creation & Cascade](#3-plan-creation--cascade)
4. [Cascade Matrix & Position Groups](#4-cascade-matrix--position-groups)
5. [Staff Daily Task Logging](#5-staff-daily-task-logging)
6. [Approval Chain](#6-approval-chain)
7. [KPI Calculation & Scoring](#7-kpi-calculation--scoring)
8. [Role Responsibilities](#8-role-responsibilities)
   - [Staff (CS Officer, CR Officer, Sales & Marketing, Internal Auditor)](#81-staff)
   - [Supervisor (Operation Supervisor, CR Supervisor)](#82-supervisor)
   - [Branch Manager](#83-branch-manager)
   - [Area Manager](#84-area-manager)
   - [CEO / Admin](#85-ceo--admin)
9. [Who Sees What — Data Isolation](#9-who-sees-what--data-isolation)
10. [Validation Strategy: CBS vs Approval](#10-validation-strategy-cbs-vs-approval)
11. [Products & KPI Mapping](#11-products--kpi-mapping)
12. [Mapped Accounts System](#12-mapped-accounts-system)
13. [Behavioral Evaluation](#13-behavioral-evaluation)
14. [KPI Framework & Weights](#14-kpi-framework--weights)
15. [Performance Rating Scale](#15-performance-rating-scale)
16. [Plans Per Branch — Fixed vs Flexible](#16-plans-per-branch--fixed-vs-flexible)
17. [Key Design Decisions](#17-key-design-decisions)

---

## 1. Organizational Structure

```
HEAD OFFICE
├── CEO (Biruk Assefa)
└── Area Manager (Abebech G/Hiwot)

BRANCH LEVEL (per branch)
├── Branch Manager (Dawit — Main, Meron — Bole)
│   ├── Operation Supervisor (Tekle — Main, Henok — Bole)
│   │   ├── Customer Service Officer I
│   │   └── Customer Service Officer II
│   ├── Customer Relationship Supervisor (Sosina — Main, Tsion — Bole)
│   │   ├── Customer Relationship Officer I
│   │   └── Sales & Marketing Officer I
│   └── Internal Auditor
```

### Positions by Role

| Role | Positions |
|------|-----------|
| **admin** | CEO |
| **areaManager** | Area Manager |
| **branchManager** | Branch Manager |
| **supervisor** | Operation Supervisor, Customer Relationship Supervisor |
| **staff** | Customer Service Officer I/II, Customer Relationship Officer I, Sales & Marketing Officer I, Internal Auditor |

Each staff member has a `supervisorId` linking them to their direct supervisor. The supervisor is determined by position type:
- CS Officers → report to Operation Supervisor
- CR Officer / Sales & Marketing → report to Customer Relationship Supervisor

---

## 2. End-to-End Workflow

```
CEO creates Branch Plan(s)
        │
        ▼
System cascades plan to staff
(Creates individual StaffPlan records per person per KPI)
        │
        ▼
Staff logs daily tasks via TaskEntryForm
(Selects task type → product → account → amount)
        │
        ▼
Supervisor approves/rejects pending tasks
        │
        ▼
Branch Manager approves/rejects (final approval)
        │
        ▼
Approved tasks count toward KPI achievement
        │
        ▼
Performance calculated:
  KPI Score (85%) = sum of (achievement% × weight)
  + Behavioral Score (15%) = competency rating
  = Final Score
        │
        ▼
Dashboards update for all roles:
  Staff → Supervisor → BM → Area Manager → CEO
```

---

## 3. Plan Creation & Cascade

### Who Creates Plans
Only the **CEO/Admin** can create plans via the Plan Management page.

### What a Plan Looks Like
```
Branch:      Hawassa Bole
KPI:         Deposit Mobilization
Target:      10,000,000 ETB
Period:      2025-H2 (July–December 2025)
Status:      Active
```

### How Cascade Works (Automatic)

When a plan is created or updated, `cascadeBranchPlan()` runs automatically:

1. **Find all staff** in the target branch with role `staff` or `supervisor`
2. **Group by position** using the POSITION_GROUP map:
   - CS Officer I + CS Officer II → `csOfficer`
   - CR Officer I + Sales & Marketing Officer I → `crOfficer`
   - Operation Supervisor → `operationSupervisor`
   - CR Supervisor → `crSupervisor`
   - Internal Auditor → `null` (excluded from cascade)
3. **Apply the Cascade Matrix** percentages to calculate each group's share
4. **Divide equally** among members within each position group
5. **Create StaffPlan records** with individual targets + time breakdowns

### Example Cascade

Plan: Deposit Mobilization — Hawassa Bole — 10,000,000 ETB

| Position | Staff | Matrix % | Group Share | Per Person |
|----------|-------|----------|-------------|------------|
| Branch Manager | Meron | 25% | 2,500,000 | Not assigned (BM has no StaffPlan) |
| Op Supervisor | Henok | 10% | 1,000,000 | 1,000,000 |
| CR Supervisor | Sosina | 25% | 2,500,000 | 2,500,000 |
| CS Officer I | Abdurahman | 12.5% | 1,250,000 | 1,250,000 |
| CS Officer II | Fikirte | 12.5% | 1,250,000 | 1,250,000 |
| CR Officer I | Getachew | 15% | 1,500,000 | 1,500,000 |

### Time Breakdown Example

For a 10M H2 plan, each staff gets daily/weekly/monthly targets:

```
Monthly:  target ÷ 6 months
Weekly:   target ÷ 26 weeks
Daily:    target ÷ 183 days
```

Period types supported:
- **H2** (half-year): ÷ 6 months, 26 weeks, 183 days
- **Q4 / Q** (quarter): ÷ 3 months, 13 weeks, 92 days
- **Monthly**: ÷ 1 month, 4 weeks, 30 days
- **Yearly / 2025**: ÷ 12 months, 52 weeks, 365 days

---

## 4. Cascade Matrix & Position Groups

### The Matrix

| KPI | BM | Op Sup | CR Sup | CR Officer | CS Officer | Total |
|-----|----|--------|--------|-----------|-----------|-------|
| Account Productivity | 15% | 15% | 15% | 20% | 35% | 100% |
| Deposit Mobilization | 25% | 10% | 25% | 15% | 25% | 100% |
| New Member Registration | 10% | 0% | 35% | 25% | 30% | 100% |
| New Account Opening | 10% | 10% | 20% | 20% | 40% | 100% |
| Share Capital Growth | 10% | 0% | 40% | 25% | 25% | 100% |
| Mobile Banking Users | 5% | 5% | 20% | 20% | 50% | 100% |
| Merchant POS Growth | 10% | 0% | 35% | 30% | 25% | 100% |
| Billers Recruitment | 10% | 0% | 35% | 30% | 25% | 100% |
| Internal Operations | 20% | 30% | 0% | 0% | 50% | 100% |

### Position Group Mapping

| Position | Group |
|----------|-------|
| Branch Manager | branchManager |
| Operation Supervisor | operationSupervisor |
| Customer Relationship Supervisor | crSupervisor |
| Customer Relationship Officer I | crOfficer |
| Customer Service Officer I | csOfficer |
| Customer Service Officer II | csOfficer |
| Sales & Marketing Officer I | crOfficer |
| Internal Auditor | null (excluded) |

### Important: Supervisors & BMs Get StaffPlan Records But Don't Log Tasks

Currently, supervisors and BMs receive individual StaffPlan targets from the cascade. However:

- **Supervisors** cannot log daily tasks (only `staff` role can)
- **BMs** cannot log daily tasks

Their KPI achievement should be derived from **their team's performance**, not individual task logging. See [Section 8.2](#82-supervisor) and [Section 8.3](#83-branch-manager).

---

## 5. Staff Daily Task Logging

### Who Logs Tasks
Only **staff** role (CS Officer I/II, CR Officer I, Sales & Marketing Officer I, Internal Auditor).

### Task Entry Form Fields
1. **Task Type** (dropdown — 11 options):
   - Account Productivity Improvement
   - Deposit Mobilization
   - New Member Registration
   - New Account Opening
   - Share Capital
   - Mobile Banking Activation
   - Merchant POS Activation
   - Biller Recruitment
   - Transaction Processing
   - SMS Alert Configuration
   - Complaint Resolution

2. **Product Type** (dropdown — filtered by selected KPI category, loaded from Product-KPI mappings)

3. **Account Number** (searchable from mapped accounts or type new one)

4. **Amount** (Birr — optional for count-based KPIs)

5. **Task Date** (defaults to today)

6. **Remarks** (free text)

### What Happens on Submit
1. System checks the account number against existing mappings
2. Determines mapping status:
   - **Mapped to You** → task counts toward KPI once approved
   - **Unmapped** → auto-creates mapping as Unmapped, needs BM approval to count
   - **Mapped to Another Staff** → task won't count toward KPI
3. Creates `DailyTask` record with `approvalStatus: 'Pending'`
4. Creates approval chain entries (Supervisor → BM)
5. Logs audit trail

### Task Type to KPI Mapping

| Task Type in Form | Stored Enum Value | Counts Toward KPI |
|-------------------|-------------------|-------------------|
| Account Productivity Improvement | `Account_Productivity` | Account Productivity |
| Deposit Mobilization | `Deposit_Mobilization` | Deposit Mobilization |
| New Member Registration | `New_Member_Registration` | New Member Registration |
| New Account Opening | `New_Account_Opening` | New Account Opening |
| Share Capital | `Share_Capital` | Share Capital Growth |
| Mobile Banking Activation | `Mobile_Banking_Activation` | Mobile Banking Users |
| Merchant POS Activation | `Merchant_POS_Activation` | Merchant POS Growth |
| Biller Recruitment | `Biller_Recruitment` | Billers Recruitment |
| Transaction Processing | `Transaction_Processing` | Internal Operations |
| SMS Alert Configuration | `SMS_Alert_Config` | Internal Operations |
| Complaint Resolution | `Complaint_Resolution` | Internal Operations |

---

## 6. Approval Chain

### Flow

```
Staff submits task (approvalStatus = Pending)
        │
        ▼
[IF supervisor exists] → Supervisor approves/rejects
(approvalStatus stays Pending if only supervisor approved)
        │
        ▼
Branch Manager approves/rejects (final)
        │
        ▼
If ALL approvers approved → approvalStatus = 'Approved' ✅
If ANY approver rejected → approvalStatus = 'Rejected' ❌
```

### Chain Construction

In `taskController.js`, `buildApprovalChain()`:

1. If the staff member has a `supervisorId`, add their supervisor as first approver
2. Add the Branch Manager of the staff's branch as final approver

### What Counts Toward KPI

Only tasks with `approvalStatus: 'Approved'` count toward KPI achievement.

Tasks with `cbsValidated: true` are additionally verified (see [Section 10](#10-validation-strategy-cbs-vs-approval)).

---

## 7. KPI Calculation & Scoring

### Formula

```
KPI Score (85% weight):
  For each KPI category the staff has a StaffPlan:
    achievement% = total_approved / individual_target × 100
    capped at achievement% (e.g., 120% max)
    weighted_score = achievement% × kpi_weight / 100
  
  Total KPI Score = sum(weighted_scores) × 0.85

Behavioral Score (15% weight):
  behavioral_score = (total_competency_score / max_possible) × 15

Final Score = KPI Score + Behavioral Score
```

### Per-KPI Calculation Methods

| KPI | Calculation | CBS Required? |
|-----|------------|---------------|
| Deposit Mobilization | Sum of `amount` from approved Deposit_Mobilization tasks (eventually: balance-based via CBS) | ✅ Yes (future) |
| Account Productivity | Count of approved Account_Productivity tasks (eventually: balance ≥ 1,000 check via CBS) | ✅ Yes (future) |
| Share Capital Growth | Count of approved Share_Capital tasks (eventually: share balance check via CBS) | ✅ Yes (future) |
| New Member Registration | Count of approved New_Member_Registration tasks | ❌ No |
| New Account Opening | Count of approved New_Account_Opening tasks | ❌ No |
| Mobile Banking Users | Count of approved Mobile_Banking_Activation tasks | ❌ No |
| Merchant POS Growth | Count of approved Merchant_POS_Activation tasks | ❌ No |
| Billers Recruitment | Count of approved Biller_Recruitment tasks | ❌ No |
| Internal Operations | Count of approved Transaction_Processing / SMS_Alert_Config / Complaint_Resolution tasks | ❌ No |

### Current Bug Fixed

The performance calculator was using `Loan_Follow_up` task type for Account Productivity — this task type doesn't exist in the enum. Fixed to use `Account_Productivity` and changed from amount-sum to count-based (matching the KPI definition of "number of accounts improved").

---

## 8. Role Responsibilities

### 8.1 Staff

**Who:** CS Officer I/II, CR Officer I, Sales & Marketing Officer I, Internal Auditor

**Can Do:**
- Log daily tasks via Task Entry Form ✅
- View their own KPI progress on Staff Dashboard ✅
- View their mapped accounts ✅
- View their behavioral evaluation ✅
- View their monthly scorecard ✅

**Cannot Do:**
- Approve tasks ❌
- Create plans ❌
- Manage users ❌
- View other staff's data ❌

**Their KPI:**
100% based on their own approved tasks. Each staff member has individual targets for each KPI derived from the cascade matrix.

**Dashboard Shows:**
- Personal KPI targets across all 9 categories with progress bars
- Mapped accounts count and details
- Deposit growth (actual vs target)
- Behavioral evaluation score
- Performance score (KPI 85% + Behavioral 15%)

### 8.2 Supervisor

**Who:** Operation Supervisor, Customer Relationship Supervisor

**Can Do:**
- **Approve/reject pending tasks** from their direct reports ✅
- **Evaluate behavior** quarterly (6 competencies, 0-5 scale) ✅
- View team performance on Supervisor Dashboard ✅
- View mapped accounts of their team ✅

**Cannot Do:**
- Log daily tasks ❌ (blocked by `req.user.role !== 'staff'`)
- Create plans ❌
- Manage users ❌

**Their KPI:**
100% based on **their team's average performance**. Supervisors do NOT log individual tasks.

An operation supervisor's achievement = average of their CS Officers' achievement for each KPI.

A CR supervisor's achievement = average of their CR Officers' & Sales & Marketing's achievement.

**Justification:** A supervisor's job is leadership and validation, not individual contribution. Their performance IS their team's performance.

**Dashboard Shows:**
- Team members list with positions, mapped accounts, and KPI achievement %
- Team stats (total members, total mapped accounts, avg KPI achievement)
- Pending approval count

### 8.3 Branch Manager

**Who:** Branch Managers (Dawit — Main, Meron — Bole)

**Can Do:**
- **Final-approve** tasks (after supervisor) ✅
- **Manage account mappings** (assign/unassign accounts to staff) ✅
- **Upload CBS validation** (future) ✅
- View branch performance on BM Dashboard ✅
- Assign bulk mappings ✅

**Cannot Do:**
- Log daily tasks ❌
- Create plans ❌

**Their KPI:**
100% based on **the whole branch's performance**. The BM doesn't have individual tasks. Their achievement for each KPI = total achievement of all staff in their branch for that KPI.

The BM's 25% share in the cascade matrix represents their responsibility for the branch target, not an individual task quota.

**Dashboard Shows:**
- Total staff count at branch
- Total mapped accounts
- Daily deposit target (branch target ÷ 30)
- Today's achievement (ETB and %)
- KPI cards per category (target vs actual)
- Team performance table (every staff member with name, role, target, actual, status)
- Pending approvals

**Data Isolation:**
- Dawit (Main) sees only Main branch staff
- Meron (Bole) sees only Bole branch staff
- No cross-branch visibility

### 8.4 Area Manager

**Who:** Area Manager (Abebech G/Hiwot)

**Can Do:**
- View all branches in their area ✅
- View branch comparison and trends ✅
- Approve behavioral evaluations ✅
- View area performance analytics ✅

**Cannot Do:**
- Log tasks ❌
- Approve individual tasks ❌
- Create plans ❌
- Manage users ❌

**Their KPI:**
Not individually scored in the system. The Area Manager monitors branch performance.

**Dashboard Shows:**
- Branch count and staff count in area
- Average branch achievement %
- Mapping coverage pie chart (mapped vs unmapped)
- Branch comparison (deposit, digital, member, account, shareCapital per branch)
- 30-day trend data
- Branch status table with progress bars

### 8.5 CEO / Admin

**Who:** CEO (Biruk Assefa)

**Can Do:**
- **Create plans** (manually or bulk Excel upload) ✅
- **Manage users** (create/edit/deactivate) ✅
- **Manage branches** ✅
- **Import June baseline balances** ✅
- **Map products to KPIs** ✅
- **Upload CBS validation** ✅
- **View org-wide dashboard** ✅
- **Manage KPI Framework** (weights, thresholds) ✅

**Cannot Do:**
- Log tasks ❌
- Approve individual tasks ❌

**Their KPI:**
Not individually scored. The CEO sets up and monitors the entire system.

**Dashboard Shows:**
- Total branches and total staff
- Average plan achievement % across org
- CBS validation rate
- Branch KPI heatmap (scores per branch)
- Performance distribution chart
- Top/bottom branches
- Activity feed (recent audit trail)

---

## 9. Who Sees What — Data Isolation

| Data | CEO | Area Manager | Branch Manager | Supervisor | Staff |
|------|-----|-------------|---------------|------------|-------|
| All branches | ✅ | Own area only | Own branch only | ❌ | ❌ |
| All staff | ✅ | Own area only | Own branch only | Own team only | ❌ |
| Individual KPI targets | ❌ | ❌ | ✅ (per staff) | ✅ (per team member) | ✅ (own only) |
| Individual tasks | ❌ | ❌ | ✅ (branch) | ✅ (team's) | ✅ (own only) |
| Task approval | ❌ | ❌ | Final approver | First approver | ❌ |
| Mapped accounts | All | Area summary | Branch summary | Team summary | Own accounts |
| Behavioral evaluation | Can view | Can approve | Can approve | Creates them | Can view own |
| Plan creation | ✅ | ❌ | ❌ | ❌ | ❌ |
| User management | ✅ | ❌ | ❌ | ❌ | ❌ |
| Branch management | ✅ | ❌ | ❌ | ❌ | ❌ |
| Product mapping | ✅ | ❌ | ❌ | ❌ | ❌ |
| CBS validation | ✅ | ❌ | ✅ | ❌ | ❌ |

---

## 10. Validation Strategy: CBS vs Approval

### The Two Types of KPIs

#### Type A: Balance-Based KPIs (need CBS verification)

These KPIs track **actual money/value in customer accounts**. Approval alone isn't enough because the staff could claim work that wasn't actually reflected in the account.

| KPI | What Needs Verifying | CBS Check |
|-----|---------------------|-----------|
| Deposit Mobilization | Did the account balance actually grow? | Current balance vs June baseline |
| Account Productivity | Is the account balance ≥ 1,000 ETB? | Current balance check |
| Share Capital Growth | Did the member purchase additional shares? | Share account balance check |

**Without CBS (now):** Tasks are counted based on approval only. The `cbsValidated` field exists on DailyTask but is not enforced.

**With CBS (future):** Admin/BM uploads a CBS report (Excel) containing actual account balances and transactions. The system:
1. Compares each task against CBS data
2. If task amount matches CBS → `cbsValidated = true`
3. If mismatch → flagged as discrepancy → needs investigation
4. Only `cbsValidated: true` tasks count toward these KPIs

#### Type B: Action-Based KPIs (approval is sufficient)

These KPIs track **actions that can be verified by a supervisor** without needing bank data.

| KPI | What Verifies It |
|-----|-----------------|
| New Member Registration | Form filled, supervisor confirms |
| New Account Opening | Account opened, supervisor confirms |
| Mobile Banking Users | Mobile activated, supervisor confirms |
| Merchant POS Growth | Terminal installed, supervisor confirms |
| Billers Recruitment | Biller onboarded, supervisor confirms |
| Internal Operations | Transaction processed, supervisor confirms |

Approval from Supervisor → BM is sufficient. No CBS needed.

### Current State (No CBS Yet)

All KPIs work purely through approval. The `cbsValidated: true` filter has been removed from performance calculations. When CBS is built in the future, it will be added back only for the 3 balance-based KPIs.

---

## 11. Products & KPI Mapping

### What Products Are

Products are the actual financial products Ghion SACCOS offers (saving accounts, loan accounts, services). They are mapped to KPI categories so that when a staff member logs a task, they can specify which product they worked on.

### Current Product-KPI Mappings (12)

| Product | Mapped to KPI |
|---------|--------------|
| Medbegna Saving | Deposit Mobilization |
| Felagot Saving | Deposit Mobilization |
| Super Saving | Deposit Mobilization |
| Digital Saving | Mobile Banking Users |
| Share Account | Share Capital Growth |
| Member Registration | New Member Registration |
| New Account | New Account Opening |
| Merchant POS | Merchant POS Growth |
| Biller Service | Billers Recruitment |
| Transaction Processing | Internal Operations |
| SMS Alert | Internal Operations |
| Complaint Resolution | Internal Operations |

### How Products Work in Task Entry

1. Staff selects a **task type** (e.g., "Deposit Mobilization")
2. System filters products by the mapped KPI (shows Medbegna, Felagot, Super, etc.)
3. Staff selects which product they worked on
4. This is **metadata only** — it doesn't affect the KPI count
5. The count is determined by: task type + approval status

### Product-to-KPI Relationship

```
One KPI → Many Products (all products under that KPI count toward the same target)

Example:
  Deposit Mobilization (plan target: 10M)
    ├── Medbegna Saving (staff logged 2K)
    ├── Felagot Saving (staff logged 3K)
    └── Super Saving (staff logged 1K)
    = 6K total toward the 10M target
```

Products are not plans. Each KPI category has ONE plan per branch. Products are just a categorization tool for task entry.

---

## 12. Mapped Accounts System

### What Is Account Mapping?

Customer bank accounts are "mapped" to specific staff members. This determines who is responsible for each account.

### Mapping Statuses

| Status | Meaning | Task Counts Toward KPI? |
|--------|---------|------------------------|
| Mapped to You | Account assigned to this staff member | ✅ Yes (if balance ≥ 1,000 for productive KPIs) |
| Unmapped | Account not assigned to anyone | ⚠️ Only after BM approval |
| Mapped to Another Staff | Account belongs to someone else | ❌ No |

### How Mapping Happens

1. **Manually**: BM/Supervisor/Admin assigns accounts via Mapping Management page
2. **Bulk upload**: BM uploads Excel file with account-staff assignments
3. **Auto-create**: When staff enters a new account number during task entry, it creates the mapping as "Unmapped"

### How Mapping Connects to Plans

For **Deposit Mobilization** (with CBS future):
- Staff has mapped accounts
- System checks: did these accounts grow from June baseline?
- Growth = current_balance - june_balance
- If growth ≥ target → KPI achieved

For other KPIs (approval-based):
- Mapping tells staff which accounts they're responsible for
- Account number in task entry provides traceability
- But counting is purely by approved task count/amount

### Minimum Balance Threshold

Per the new specification, accounts with balance ≥ **1,000 ETB** count as productive (was 500 ETB).

---

## 13. Behavioral Evaluation

### Who Does It
Supervisors evaluate their direct reports **quarterly**.

### Who Gets Evaluated
Staff members by their supervisor.

### Competencies (6 total, scored 0-5)

1. **Communication Skills**
2. **Teamwork**
3. **Problem Solving**
4. **Initiative & Proactivity**
5. **Adaptability**
6. **Customer Service**

### Scoring
```
Total Score = sum of all competency scores (max 30)
Behavioral Contribution = (total / 30) × 15% of final score
```

### Workflow
```
Supervisor fills BehavioralInput form
  → Selects employee (direct report)
  → Selects period (quarter)
  → Rates 6 competencies (0-5) + comments
  → Submits
  → Status: Draft → Pending → Approved (by BM/AM)
  → Once Approved: contributes to final performance score
```

### Weight in Final Score
Behavioral = **15%** of total performance score.

---

## 14. KPI Framework & Weights

### Current Weights (to be updated per new spec)

| KPI Category | Current Weight | New Spec Weight |
|-------------|---------------|-----------------|
| Account Productivity | 15% | **25%** |
| Deposit Mobilization | 20% | **20%** |
| New Member Registration | 10% | **5%** |
| New Account Opening | 10% | **5%** |
| Share Capital Growth | 10% | **8%** |
| Mobile Banking Users | 15% | **4%** |
| Merchant POS Growth | 10% | **3%** |
| Billers Recruitment | 5% | **3%** |
| Internal Operations | 5% | **10%** |
| **Total** | **100%** | **83%** |

### New Spec Grouping

The new spec groups KPIs into result areas totaling 85%:

```
Branch Result Areas (85%):
  I.   Account Productivity Improvement     25%
  II.  Deposit Mobilization                 20%
  III. Customer Base Expansion              10%
       ├── New Member Registration           5%
       └── New Account Opening               5%
  IV.  Share Capital Growth                  8%
  V.   Digital Channel Growth               12%
       ├── Mobile Banking Users              4%
       ├── Merchant POS Growth               3%
       └── Billers Recruitment               5%
  VI.  Internal Operations & Customer Service 10%
       ├── Transactions Processed             4%
       ├── SMS Alert Config                   3%
       └── Complaint Resolution               3%
       └── Total                            85%
```

The remaining 15% is Behavioral Evaluation.

### Thresholds for Productivity

Per the new specification:
- **Account Productivity**: Minimum balance of **1,000 ETB** to be considered productive (was 500)
- **Deposit Mobilization**: Growth measured from June baseline

---

## 15. Performance Rating Scale

| Achievement Level | Rating |
|-------------------|--------|
| 120% and Above | Outstanding |
| 100% – 119% | Exceeds Expectations |
| 90% – 99% | Meets Expectations |
| 80% – 89% | Needs Improvement |
| Below 80% | Unsatisfactory |

### Final Score Calculation

```
KPI Score (max 85 points):
  For each active StaffPlan:
    achievement% = min(approved_amount_or_count / individual_target, 1.2) × 100
    capped at 120%
    weighted_score = achievement% × kpi_weight / 100

  total_kpi = sum(weighted_scores) × 0.85

Behavioral Score (max 15 points):
  behavioral = (total_competency_score / max_possible) × 15

Final Score = total_kpi + behavioral

Rating determined by Final Score thresholds above.
```

---

## 16. Plans Per Branch — Fixed vs Flexible

The CEO can create **any combination of plans per branch**. It's not required to create all 9 KPIs.

### Examples

| Scenario | Plans Created |
|----------|--------------|
| Full setup | All 9 KPIs for both branches (18 plans) |
| Minimum test | 1 KPI for 1 branch (1 plan) |
| Custom setup | Deposit + Mobile for Main, All 9 for Bole |

### How Scoring Works with Partial Plans

If only 3 KPIs have plans:
```
Available weight: 20% (Deposit) + 15% (Mobile) + 10% (Productivity) = 45%
Staff achieves:   80% of Deposit + 50% of Mobile + 100% of Productivity
Weighted:         16 + 7.5 + 10 = 33.5
KPI Score:        33.5 / 45 × 85 = 63.3%
```

### Multiple Periods

A branch can have plans for different periods simultaneously:
- Deposit Mobilization for 2025-H2
- New Account Opening for 2025-Q4

Performance calculations filter by period.

---

## 17. Key Design Decisions

### 1. Supervisors Log Individual Tasks (Updated)
Supervisors DO have individual StaffPlan targets from the cascade matrix and DO log daily tasks like staff. Their KPI is based on their own plan achievement. They also approve team tasks and monitor team performance as part of their job function — but the team's performance does NOT directly affect the supervisor's individual KPI score.

### 2. Branch Manager KPI = Branch Performance
BMs do NOT log tasks. Their KPI is based on the entire branch's performance — total achievement of all staff in the branch for each KPI. The BM's 25% share in the cascade matrix represents their responsibility for the branch target, not an individual task quota.

### 3. Approval is the Primary Validation
For all action-based KPIs (registration, activation, opening, operations, POS, billers), supervisor + BM approval is sufficient verification. No CBS needed.

### 4. CBS is an Automatic Background Audit
CBS validation runs separately after tasks are approved. It does NOT block KPI counting. The flow:
```
Staff logs task → Supervisor approves → BM approves → task counts toward KPI
                                                      ↓
                                              CBS upload runs (daily)
                                              validates against bank data
                                              marks cbsValidated = true/false
                                              creates discrepancies if mismatched
```
- **Share Capital Growth**: keeps `cbsValidated: true` filter — money goes through bank, must be confirmed
- **Deposit Mobilization**: balance-based (current_balance - june_balance), no task filter needed
- **Account Productivity**: balance ≥ 1,000 ETB check via CBS
- **All other KPIs**: approval-only, no CBS filter

### 5. Products ≠ Plans
Products are a categorization tool for task entry. Each KPI category has one plan per branch. Multiple products can map to the same KPI.

### 6. Product on AccountMapping = Optional
The CBS upload detects product names but does not require storing them on AccountMapping. If CBS provides a product name, it can optionally be saved on the account for audit purposes. Otherwise, `DailyTask.productType` on each logged task is sufficient.

### 7. Cascade is Automatic
Creating or updating a plan triggers an automatic cascade that recalculates all staff targets. No manual intervention needed.

### 8. Data is Strictly Isolated
Each role sees only what's relevant to them:
- Staff → own data only
- Supervisor → own data + team data (for monitoring)
- BM → branch only
- AM → area only
- CEO → everything

### 9. Positions Use Underscore Enum Values
Database stores positions as `Operation_Supervisor` (Prisma enum). Display converts to `Operation Supervisor` via `POSITION_MAP`. The cascade logic normalizes with `.replace(/_/g, ' ')`.

---

## 18. Known Issues / Missing Features

### 🔴 Critical Bugs

| # | Issue | File | Impact |
|---|-------|------|--------|
| C1 | **Supervisors blocked from logging tasks** | `taskController.js:92` — `role !== 'staff'` check | Supervisors have StaffPlan targets but can't log work |
| C2 | **Missing KPI handlers** — Merchant POS, Billers, Internal Ops not calculated | `performanceCalculator.js` | Those 3 KPIs always show 0% |
| C3 | **cbsValidated on wrong KPIs** — Mobile Banking, Member Registration, Account Opening filtered by cbsValidated | `performanceCalculator.js` lines 88,97,106 | Approved tasks don't count for these KPIs |
| C4 | **Balance threshold uses 500 ETB (should be 1,000)** | `performanceCalculator.js`, `dashboardController.js`, `cbsController.js` | Wrong threshold from old spec |
| C5 | **KPI weights use old values** | `performanceCalculator.js` lines 132-142 | Wrong scoring |
| C6 | **BM KPI uses individual StaffPlan** | `performanceCalculator.js` | Should aggregate branch performance |

### 🟡 Missing Features

| # | Feature | Description |
|---|---------|-------------|
| M1 | **Task Edit/Update Request** | Staff submits wrong data → requests edit → supervisor approves → task updated with audit trail. No way to fix mistakes currently. |
| M2 | **Staff fills phone number on accounts** | `AccountMapping.phoneNumber` exists in schema but no UI for staff to update it |
| M3 | **Account detail view** | Staff should see account product type, last 10 tasks, balance history, phone number |
| M4 | **Sample CBS template** | No sample Excel file exists for testing CBS upload |

### 🟠 Dashboard Gaps

| # | Dashboard | What's Missing |
|---|-----------|---------------|
| D1 | **Staff** | Today vs yesterday comparison, this month vs last month, per-account June baseline comparison, trend indicator (↑ getting better / ↓ worse), quick phone number edit |
| D2 | **Supervisor** | Own individual KPI (they have StaffPlan too), per-KPI team breakdown (not just deposit), week-over-week team comparison |
| D3 | **BM** | All 9 KPI branch-level cards (currently only Deposit), supervisor team summaries, month-over-month comparison |
| D4 | **Area Manager** | Branch comparison across ALL 9 KPIs (currently only Deposit) |
| D5 | **CEO** | Org-wide performance for all 9 KPIs |

---

## 19. Planned Tasks & Roadmap

### ✅ Phase 1: Critical Fixes (Completed)

| Order | Task | Status | Details |
|-------|------|--------|---------|
| 1 | Allow supervisors to log tasks | ✅ Done | `taskController.js:92` role check widened to include `supervisor`; frontend route also updated |
| 2 | Add missing KPI handlers | ✅ Done | Merchant POS, Billers, Internal Ops handlers added to `performanceCalculator.js` |
| 3 | Remove cbsValidated from wrong KPIs | ✅ Done | Removed from Mobile, Member, Account Opening; kept on Share Capital only |
| 4 | Balance threshold 500→1,000 | ✅ Done | Updated in `performanceCalculator.js`, `dashboardController.js`, `cbsController.js`, `taskController.js`, `KPIFramework.tsx`, seed files |
| 5 | Update KPI weights to new spec | ✅ Done | Weights normalized to sum to 100 (Account Prod 30, Deposit 24, Internal Ops 12, Share Capital 9, Member 6, Account Opening 6, Mobile 5, Billers 5, Merchant POS 3) |
| 6 | BM KPI = branch performance | ✅ Done | New `calculateBranchKPIScore()` in `performanceCalculator.js`; `performanceController.js` routes BMs to branch-level calculation |

### ✅ Phase 2: Dashboard Improvements (Completed)

| Order | Task | Status | Details |
|-------|------|--------|---------|
| 7 | Staff dashboard — comparative data, trends, phone edit | ✅ Done | Today vs yesterday, this month vs last month, per-account June baseline comparison, trend arrows, inline phone number editing |
| 8 | Supervisor dashboard — own KPI, per-KPI breakdown | ✅ Done | Supervisor's individual StaffPlan targets shown; per-KPI team breakdown across all 9 categories |
| 9 | BM dashboard — all 9 KPI cards | ✅ Done | All branch-level plans shown with progress; aggregated staff tasks counted per KPI |
| 10 | Area/CEO dashboards | 🔲 Pending | Uses existing logic - already aggregates at area/org level |

### Phase 3: Features & Tooling

| Order | Task | Status | Details |
|-------|------|--------|---------|
| 11 | Task Edit Request feature | ✅ Done | Staff submits changes → `requestedEditData` stored → supervisor sees pending edits → approves/rejects → task updated with audit trail. Fields: `requestedEditData Json?`, `requestedEditAt DateTime?` added to DailyTask |
| 12 | Account phone number edit by staff | ✅ Done | Inline editing on Staff Dashboard accounts table |
| 13 | Create sample CBS template | ✅ Done | `sample_cbs_template.csv` and `sample_cbs_template.xlsx` created with 10 sample rows |
| 14 | Product on AccountMapping from CBS (optional) | ✅ Done | `product String?` field added to AccountMapping; `updateAccountBalances()` now persists product name from CBS upload |

---

## 20. CBS Upload File Format

### Required Columns

| Column Name | Accepted Aliases | Purpose |
|-------------|-----------------|---------|
| **accountNumber** | `Account Number`, `account_id` | Identify the customer account |
| **balance** | `Balance`, `current_balance` | Update current balance on account |
| **product** | `Product`, `productName`, `Product Name` | Detect product type for KPI mapping |

### Optional Columns

| Column Name | Accepted Aliases | Purpose |
|-------------|-----------------|---------|
| **customerName** | `Customer Name` | Display name on AccountMapping (defaults to "CBS Account {number}") |
| **amount** | `Amount` | Match CBS records against approved DailyTask for validation |
| **transactionDate** | `Transaction Date` | Set last_transaction_date, determine active_status (active if ≤15 days ago) |

### Sample Row

```
accountNumber,balance,product,customerName,amount,transactionDate
GH0012345,15000.00,Medbegna Saving,Abebe Kebede,5000,2025-07-03
GH0016789,2500.00,Digital Saving,Almaz Hailu,1000,2025-07-03
```

### What Happens on Upload

1. **Detect unmapped products** — product names not in `ProductKpiMapping` are flagged
2. **Update/upsert account balances** — each row becomes/updates an `AccountMapping`
3. **Auto-map accounts ≥ 1,000 ETB** — if account balance ≥ 1,000 ETB and an approved task exists for that account today, auto-assign to the staff who submitted the task
4. **Validate tasks** — match by accountNumber + amount:
   - ✅ **Match**: marks `cbsValidated = true` on the DailyTask
   - ❌ **Amount_Mismatch**: same account in both, different amounts
   - ❌ **Missing_in_PMS**: account in CBS but no PMS task
   - ❌ **Missing_in_CBS**: PMS task but account not found in CBS

### Which KPIs Use CBS Validation

| KPI | CBS Required? | Why |
|-----|---------------|-----|
| Share Capital Growth | ✅ Yes | Money goes through bank, CBS must confirm |
| Deposit Mobilization | ✅ Via balance growth | Balance-based (current - june), not task-based |
| Account Productivity | ✅ Via balance check | Balance ≥ 1,000 ETB confirmed by CBS |
| Mobile Banking Users | ❌ No | Approval only |
| New Member Registration | ❌ No | Approval only |
| New Account Opening | ❌ No | Approval only |
| Merchant POS Growth | ❌ No | Approval only |
| Billers Recruitment | ❌ No | Approval only |
| Internal Operations | ❌ No | Approval only |

---

## 21. Dashboard Specifications

### Staff Dashboard

**Summary Cards:**
- My Deposit Target (from StaffPlan)
- Achieved (actual growth)
- Incremental Growth (from June baseline)
- Active Accounts (≥ 1,000 ETB)
- Rank in Team

**KPI Progress:**
- All 9 KPI categories with progress bars showing actual vs target

**Today vs Yesterday:**
- Tasks submitted today vs yesterday
- Amount achieved today vs yesterday
- Percentage change (↑ better / ↓ worse)

**This Month vs Last Month:**
- Total tasks submitted
- Total amount achieved
- Comparative performance trend

**Per-Account Breakdown:**
- Account number, customer name, phone number (editable), product type
- June balance, current balance, difference
- Active/Inactive status
- Productive (≥ 1,000 ETB) / Non-Productive
- "Add Task" action per account

**Trend Indicator:**
- Whether performance is improving or declining
- Based on daily/weekly/monthly comparison

### Supervisor Dashboard

**Summary Cards:**
- Team Members count
- Total Mapped Accounts
- Average KPI Achievement (team)
- Pending Approvals

**Supervisor's Own KPI:**
- Their individual StaffPlan progress (same format as Staff)
- Shows they have their own targets too

**Team Members Table:**
- Name, position, mapped accounts, per-KPI achievement
- Click to drill into individual member details

**Per-KPI Team Breakdown:**
- Each KPI category with team total target vs actual
- Individual contribution per team member

**Pending Approvals:**
- List of tasks awaiting supervisor approval
- Quick approve/reject actions

### Branch Manager Dashboard

**Summary Cards:**
- Total Staff
- Mapped Accounts
- Daily Deposit Target
- Today's Achievement (ETB and %)

**All 9 KPI Cards:**
- Each KPI with branch-level target vs actual
- Progress bar + percentage
- Supervisor team contributions to each KPI

**Supervisor Overview:**
- Each supervisor's name, team size, mapped accounts, avg achievement

**Team Performance Table:**
- Every staff member with name, role, target, actual, mapped accounts, digital tasks, status

**Pending Approvals:**
- Tasks awaiting BM's final approval

**Month-over-Month:**
- Branch performance this month vs last month
- Trend indicators

### Area Manager Dashboard

- Branch count, staff count in area
- Average branch achievement %
- Branch comparison across all 9 KPIs
- Mapping coverage (mapped vs unmapped)
- 30-day trend chart
- Branch status table with progress bars

### CEO Dashboard

- Total branches, total staff
- Average plan achievement across org
- CBS validation rate
- Branch KPI heatmap (all 9 KPIs per branch)
- Performance distribution chart
- Top/bottom branches
- Activity feed (recent audit trail)

---

## 22. Comparative Analytics Specification

### Time Period Comparisons

Every numeric metric on dashboards should support:

| Comparison | Calculation | Display |
|------------|-------------|---------|
| **Today vs Yesterday** | `today_value - yesterday_value` | Up/down arrow with percentage |
| **This Week vs Last Week** | `this_week_total - last_week_total` | Up/down arrow with percentage |
| **This Month vs Last Month** | `this_month_total - last_month_total` | Up/down arrow with percentage |
| **Since June Baseline** | `current_balance - june_balance` | Green/red with Birr amount |
| **Target Progress** | `actual / target` | Progress bar + percentage |

### Trend Direction

```
↑ Positive trend (improving)
→ Stable (no significant change)
↓ Negative trend (declining)
```

Calculated by comparing the current period's rate against the previous period.

---

## File Reference

| File | Purpose |
|------|---------|
| `backend/prisma/schema.prisma` | All data models, enums, relations |
| `backend/src/utils/planCascade.js` | Cascade matrix, position grouping, target calculation |
| `backend/src/utils/performanceCalculator.js` | KPI scoring formulas, per-KPI calculation logic |
| `backend/src/utils/prismaHelpers.js` | POSITION_MAP, KPI_CATEGORY_MAP, TASK_TYPE_TO_ENUM mappings |
| `backend/src/controllers/taskController.js` | Task CRUD, approval chain, account mapping check |
| `backend/src/controllers/dashboardController.js` | All 5 role dashboards (CEO, AM, BM, Supervisor, Staff) |
| `backend/src/controllers/planController.js` | Plan CRUD, cascade trigger |
| `backend/src/controllers/behavioralController.js` | Behavioral evaluation CRUD |
| `backend/src/controllers/cbsController.js` | CBS upload, validation, discrepancy tracking |
| `backend/src/middleware/auth.js` | JWT auth, user selection (supervisorId included) |
| `frontend/src/pages/TaskEntryForm.tsx` | Staff/supervisor daily task entry UI |
| `frontend/src/pages/hq/KPIFramework.tsx` | KPI weights and thresholds (hardcoded, to be updated) |
| `frontend/src/pages/hq/CBSValidation.tsx` | CBS file upload & validation results UI |
| `frontend/src/pages/hq/ProductMapping.tsx` | Map CBS product names to KPI categories |
| `frontend/src/pages/hq/JuneBalanceImport.tsx` | Import June baseline balances |
| `frontend/src/pages/hq/PlansOverview.tsx` | Plan creation and management |
| `frontend/src/pages/hq/PlanCascade.tsx` | View cascade results per plan |
| `frontend/src/pages/hq/UserManagement.tsx` | Create/edit/deactivate users |
| `frontend/src/pages/hq/BranchManagement.tsx` | Branch CRUD |
| `frontend/src/pages/MappedAccounts.tsx` | Account mappings view (staff sees own, sup sees team, BM sees branch) |
| `frontend/src/pages/MappingManagement.tsx` | BM bulk account mapping assignment |
| `frontend/src/pages/Tasks.tsx` | Task list with approval actions |
| `frontend/src/pages/StaffDashboard.tsx` | Staff personal KPI dashboard |
| `frontend/src/pages/SupervisorDashboard.tsx` | Supervisor team monitoring dashboard |
| `frontend/src/pages/BranchManagerDashboard.tsx` | BM branch performance dashboard |
| `frontend/src/pages/AreaManagerDashboard.tsx` | AM area overview dashboard |
| `frontend/src/pages/CEODashboard.tsx` | CEO org-wide dashboard |
| `frontend/src/pages/KPIDashboard.tsx` | Detailed KPI breakdown view |
| `frontend/src/pages/MonthlyScorecard.tsx` | Monthly performance scorecard |
| `frontend/src/pages/BehavioralEvaluation.tsx` | View behavioral evaluations |
| `frontend/src/pages/BehavioralInput.tsx` | Create behavioral evaluations (supervisor) |
| `frontend/src/pages/BulkMappingUpload.tsx` | Excel bulk account mapping upload |
| `frontend/src/pages/AreaPerformance.tsx` | Area performance analytics |
| `frontend/src/pages/BranchMonitoring.tsx` | Branch monitoring view |
| `frontend/src/pages/Reports.tsx` | Reports hub |
| `frontend/src/pages/Profile.tsx` | User profile |
| `frontend/src/pages/Settings.tsx` | User settings |
| `frontend/src/pages/Login.tsx` | User selection dropdown grouped by position |
| `frontend/src/App.tsx` | Route definitions, role-based routing |
| `frontend/src/components/layout/Sidebar.tsx` | Navigation menus per role |
| `frontend/src/components/layout/TopNav.tsx` | Top navigation with notifications |
| `frontend/src/lib/api.ts` | API client functions |
| `TEST_PLAN.md` | Test plan with phases and change log |

---

## 24. Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-07-04 | Fix 8: Task Edit Request feature implemented — `requestedEditData`/`requestedEditAt` added to DailyTask, `PUT /api/tasks/:id/request-edit` and `PUT /api/tasks/:id/review-edit` endpoints, frontend edit dialog on Tasks.tsx and review UI on SupervisorDashboard.tsx | System |
| 2026-07-04 | Fix 10: Product field added to AccountMapping — CBS upload now persists product name on account; migration `add_product_to_account_mapping` | System |
| 2026-07-04 | Added `Edit_Requested`, `Edit_Approved`, `Edit_Rejected` AuditAction enum values; migration `add_edit_audit_actions` | System |
