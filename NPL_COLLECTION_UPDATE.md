# NPL & Daily Collection Tracking — Architecture Document

## Overview

Add professional-grade NPL (Non-Performing Loan) tracking and daily collection performance monitoring to the Sacko-PMS system. Follows PAR (Portfolio at Risk) methodology used by real SACCO systems (SaccoSys, Redian, Crego) across Kenya and East Africa.

Two-pronged output:
- **Staff view** → daily alerts for missed payments ("go collect from these customers")
- **Admin/HQ view** → regulatory NPL dashboard (PAR 1/30/90, aging ladder, trends)

---

## Data Model Changes

### 1. New Fields on `account_mappings` (Loan Tracking)

```sql
ALTER TABLE account_mappings ADD COLUMN
  loan_disbursement_date  DATE,
  loan_maturity_date      DATE,
  loan_principal          DECIMAL(15,2) DEFAULT 0,
  payment_frequency       TEXT,              -- 'Daily' | 'Weekly' | 'Monthly'
  interest_rate           DECIMAL(5,2) DEFAULT 0,
  next_payment_date       DATE,
  last_payment_date       DATE;
```

Only populated for `accountType = 'Loan'`. Populated via:
- CBS upload (if CBS includes schedule data)
- Manual entry at account mapping time

### 2. New Table: `loan_schedules` (Repayment Installments)

One row per expected payment per loan.

```sql
CREATE TABLE loan_schedules (
  _id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      UUID NOT NULL REFERENCES account_mappings(_id),
  expected_date   DATE NOT NULL,
  expected_amount DECIMAL(15,2) NOT NULL,
  paid_amount     DECIMAL(15,2) DEFAULT 0,
  status          TEXT DEFAULT 'Pending',   -- 'Pending' | 'Paid' | 'Partial' | 'Missed'
  paid_date       DATE,
  days_past_due   INT DEFAULT 0,
  remarks         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_loan_schedules_account ON loan_schedules(account_id, expected_date);
CREATE INDEX idx_loan_schedules_status ON loan_schedules(status);
CREATE INDEX idx_loan_schedules_date ON loan_schedules(expected_date);
```

### 3. New Table: `npl_snapshots` (Daily NPL History)

One row per branch per day — historical record for trend analysis.

```sql
CREATE TABLE npl_snapshots (
  _id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id      UUID NOT NULL REFERENCES branches(_id),
  snapshot_date  DATE NOT NULL,
  total_portfolio DECIMAL(15,2) DEFAULT 0,    -- Sum of all loan balances
  par_1_amount   DECIMAL(15,2) DEFAULT 0,     -- Balance of loans 1+ day overdue
  par_30_amount  DECIMAL(15,2) DEFAULT 0,
  par_90_amount  DECIMAL(15,2) DEFAULT 0,
  par_1_ratio    DECIMAL(5,2) DEFAULT 0,      -- Percentage
  par_30_ratio   DECIMAL(5,2) DEFAULT 0,
  par_90_ratio   DECIMAL(5,2) DEFAULT 0,
  total_loans    INT DEFAULT 0,
  par_1_count    INT DEFAULT 0,
  par_30_count   INT DEFAULT 0,
  par_90_count   INT DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_npl_branch_date ON npl_snapshots(branch_id, snapshot_date);
CREATE INDEX idx_npl_date ON npl_snapshots(snapshot_date);
```

### 4. New KPI Categories

Added to existing `KpiCategory` enum:

| Enum Value | Display Name | Purpose |
|---|---|---|
| `Collection_Rate` | Collection Rate | Staff-level — % of expected payments collected on time |
| `Portfolio_Quality` | Portfolio Quality | Branch-level — NPL ratio target (e.g., <5%) |

---

## DPD Calculation Engine

Located in `backend/src/utils/performanceCalculator.js` — new function `calculateDpdMetrics`.

### Logic

For each loan account:
1. Query all `loan_schedules` rows where `expected_date <= today` and `status != 'Paid'`
2. If any unpaid installments exist:
   - Find the **oldest** unpaid installment's expected_date
   - `DPD = today - oldest_unpaid_expected_date` (in days)
3. If all installments are paid: `DPD = 0`

### PAR Calculations

```
PAR 1   = SUM(balance of loans with DPD >= 1)   / total_loan_portfolio * 100
PAR 30  = SUM(balance of loans with DPD >= 30)  / total_loan_portfolio * 100
PAR 90  = SUM(balance of loans with DPD >= 90)  / total_loan_portfolio * 100
```

### Loan Classification (for reporting)

| Classification | DPD Range | Provision Rate |
|---|---|---|
| Performing | 0 days | 0% |
| Watch | 1-29 days | 0% |
| Substandard | 30-89 days | 20% |
| Doubtful | 90-179 days | 50% |
| Loss | 180+ days | 100% |

---

## Staff Collection Rate

```
Collection Rate % = (Total paid_amount today) / (Total expected_amount today) * 100
```

- `expected_amount today` = sum of all `loan_schedules` where `expected_date = today` for loans mapped to staff
- `paid_amount today` = sum of `paid_amount` for those same installments (where `status = 'Paid' or 'Partial'`)

This is the **staff-level KPI** that goes into their `Collection_Rate` plan target.

---

## Schedule Auto-Generation

When a loan is added/mapped with `payment_frequency`, `loan_disburment_date`, `loan_principal`, and `interest_rate`:

- **Monthly**: Generate 12 installments starting from `next_payment_date`, each = (principal + interest) / term_months
- **Weekly**: Same but 52 installments per year
- **Daily**: Same but 365 installments per year

Auto-generation happens:
1. On account mapping creation (if loan data provided)
2. On CBS upload (if CBS includes payment schedule)

---

## NPL Snapshot Cron

A daily function (runs on-demand or via API call) that:

1. For each branch with loan accounts:
   - Calculate total portfolio (sum of current_balance for Loan accounts)
   - Calculate DPD per loan
   - Group by PAR buckets
   - Insert row into `npl_snapshots`
2. Used by dashboards for trend display

---

## API Endpoints

| Method | Route | Returns | Access |
|---|---|---|---|
| GET | `/api/npl/staff` | Staff's collection alerts + collection rate | Staff |
| GET | `/api/npl/branch` | Branch PAR 1/30/90 + aging ladder | Branch Manager |
| GET | `/api/npl/area` | Per-branch NPL comparison | Area Manager |
| GET | `/api/npl/hq` | Company-wide NPL + trends | Admin |
| POST | `/api/npl/snapshot` | Trigger manual NPL snapshot | Admin/Branch Manager |
| GET | `/api/npl/schedules/:accountId` | Repayment schedule for a loan | Staff |
| POST | `/api/npl/schedules/:accountId/generate` | Auto-generate schedules from loan data | Staff |
| PUT | `/api/npl/schedules/:id/pay` | Mark installment as paid (manual) | Staff |
| POST | `/api/npl/cbs-sync` | Process CBS upload → update schedules | Admin |

---

## Dashboard Hierarchical Views

### Staff Dashboard (new section)
```
┌─────────────────────────────────────────┐
│  Collection Alerts (Today)              │
│  ┌──────────────────────────────────┐   │
│  │ 🔴 Account #101 — Birr 500       │   │
│  │    Due: yesterday (1 DPD)        │   │
│  ├──────────────────────────────────┤   │
│  │ 🟡 Account #205 — Birr 750       │   │
│  │    Due: 3 days ago (3 DPD)       │   │
│  └──────────────────────────────────┘   │
│                                         │
│  Collection Rate: 67% (2/3 paid)        │
│  Target: 90% — 🟠                       │
└─────────────────────────────────────────┘
```

### Branch Manager Dashboard (new section)
```
┌─────────────────────────────────────────┐
│  Portfolio at Risk (PAR)                │
│  ┌──────────┬──────────┬──────────┐      │
│  │ PAR 1    │ PAR 30   │ PAR 90   │      │
│  │ 12.4%    │ 5.2%     │ 2.1%     │      │
│  │ 🟠       │ 🟡       │ 🟢       │      │
│  └──────────┴──────────┴──────────┘      │
│                                         │
│  Aging Ladder:                          │
│  Current      ━━━━━━━━━━━━━━ 85%        │
│  1-29 days    ━━━━━          10%        │
│  30-59 days   ━━               3%       │
│  60-89 days   ━                1%       │
│  90+ days     ━                1%       │
│                                         │
│  Worst Staff: Henok (8 overdue)         │
└─────────────────────────────────────────┘
```

### Area Manager Dashboard (new section)
```
┌─────────────────────────────────────────┐
│  Branch NPL Comparison                  │
│  ┌────────────┬──────┬──────┬──────┐     │
│  │ Branch     │ PAR1 │ PAR30│ PAR90│     │
│  ├────────────┼──────┼──────┼──────┤     │
│  │ Wolayta    │ 12%  │ 5%   │ 2%   │     │
│  │ Sodo Main  │ 8%   │ 3%   │ 1%   │     │
│  └────────────┴──────┴──────┴──────┘     │
│                                         │
│  Trend (30 days): 📈 PAR90 up 0.5%      │
└─────────────────────────────────────────┘
```

### HQ Dashboard (new section)
```
┌─────────────────────────────────────────┐
│  Company NPL Overview                   │
│  Total Portfolio: 60M Birr             │
│  NPL Ratio (PAR 90): 3.8%              │
│  Target: <5%                           │
│                                         │
│  [Chart: NPL trend over 12 months]      │
│                                         │
│  Branch Ranking:                        │
│  1. Wolayta Sodo    2.1% 🟢             │
│  2. Sodo Main       3.5% 🟢             │
│  ...                                    │
└─────────────────────────────────────────┘
```

---

## Plan & KPI Integration

### New KPI: `Collection_Rate` (Staff-level)

| Position | Cascade Share | Data Source |
|---|---|---|
| CR Officer | 25% | Staff's collection rate |
| CS Officer | 35% | Staff's collection rate |
| CR Supervisor | 20% | Team's collection rate |
| BM | 10% | Branch collection rate |
| Op Sup | 10% | Branch collection rate |

**Measurement**: `paid_amount_today / expected_amount_today * 100`

### New KPI: `Portfolio_Quality` (Branch-level)

**Measurement**: `100 - PAR_90_ratio` (inverted — higher is better)

Example: If PAR 90 = 4%, Portfolio Quality score = 96%

---

## CBS Integration

### Daily CBS Upload Enhancement

When CBS upload processes loan accounts:

1. For each loan account in upload:
   - Compare `current_balance` with `previous_balance`
   - If balance decreased → find matching unpaid installment → mark as `Paid`
   - If balance increased (interest) → no change to schedule
   - If balance unchanged and installment was due → mark as `Missed`

2. Update `last_payment_date` and `next_payment_date` on `account_mappings`

### Manual Override

Staff can mark an installment as paid manually (for cash collections not yet in CBS). These get reconciled when CBS upload confirms the balance change.

---

## Color Coding Rules

| Metric | Green (🟢) | Amber (🟠) | Red (🔴) |
|---|---|---|---|
| PAR 90 | <5% | 5-10% | >10% |
| PAR 30 | <10% | 10-20% | >20% |
| Collection Rate | ≥90% | 60-89% | <60% |
| Portfolio Quality (score) | ≥80 | 60-79 | <60 |

---

## Implementation Order

1. Database schema changes (migration)
2. DPD calculation engine
3. NPL controller + routes
4. NPL snapshot cron
5. Frontend dashboard components
   - Staff collection alerts
   - BM PAR overview
   - Area branch comparison
   - HQ company overview
6. CBS sync integration
7. Plan cascade for new KPI categories
