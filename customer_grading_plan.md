# Customer Grading System — Design Plan

## Data We Already Have (free, no new input)

| Data | Source | Ready? |
|------|--------|--------|
| Loan payment history | `LoanSchedule` (Paid/Partial/Missed per installment) | ✅ |
| Loan completion count | Loans where all installments are Paid | ✅ Can derive |
| DPD / PAR status | `NplController` + `PerformanceCalculator` | ✅ |
| Self share purchases | `DailyTask` with Share Capital Growth task types | ✅ |
| Customer account info | `AccountMapping` (name, balance, branch, product) | ✅ |

## Data We Need to Add

| Data | Input Method |
|------|-------------|
| Share purchase referral | New dropdown on task entry: "Referred By" → pick existing customer |
| Account registration referral | New field on CBS upload or mapping: "Referred By" |
| Grading weights configuration | Admin settings page with sliders |

## Scoring Model (0-100, admin-configurable weights)

### Loan Performance (default 40%)
- On-time payment rate (40 pts): `paid_on_time / total_installments`
- Loan completion score (25 pts): `completed_loans / total_loans × 25`
- Average DPD score (20 pts): inverted — lower DPD = higher score
- Current health (15 pts): is customer in PAR? if yes, 0

### Referral Value (default 30%)
- Share referral count × configurable points per referral (e.g. 10 pts each)
- Account registration referral count × configurable points
- Total referred portfolio value bonus (optional)

### Self Share Purchase (default 30%)
- Total share purchase amount score
- Purchase frequency bonus

## Grade Bands (admin-configurable)
- **A** (80-100): Top tier
- **B** (60-79): Good
- **C** (40-59): Average
- **D** (20-39): Below average
- **E** (0-19): Poor

## New Database Models

```prisma
model CustomerReferral {
  id            String   @id @default(uuid())
  referredById  String   // FK → AccountMapping (the referrer)
  referralType  ReferralType  // SHARE_PURCHASE | NEW_ACCOUNT
  referenceId   String?  // taskId or accountMappingId of the referral
  points        Float    @default(0)
  createdAt     DateTime @default(now())

  referrer      AccountMapping @relation(fields: [referredById], references: [accountNumber])
}

enum ReferralType { SHARE_PURCHASE NEW_ACCOUNT }

model CustomerScore {
  id           String   @id @default(uuid())
  accountId    String   @unique // FK → AccountMapping
  loanScore    Float    @default(0)
  referralScore Float   @default(0)
  shareScore   Float    @default(0)
  totalScore   Float    @default(0)
  grade        String?  // A/B/C/D/E
  calculatedAt DateTime @default(now())

  account AccountMapping @relation(fields: [accountId], references: [id])
}

model GradingConfig {
  id        String @id @default(uuid())
  category  String // LOAN | REFERRAL | SHARE
  metric    String // weight | maxScore | threshold
  value     Float
  isActive  Boolean @default(true)
}
```

## Integration Points

### Where Referral Input Goes
1. **Task entry page** — when staff enters a Share Capital Growth task, add "Referred By" field with customer search/dropdown
2. **CBS upload / mapping** — when new accounts are created, option to select who referred them

### New Frontend Pages
| Route | Page | Access |
|-------|------|--------|
| `/customer-grading/config` | Admin config — weights + grade thresholds (sliders) | admin |
| `/customer-grading` | Ranked customer list with filters | admin, areaManager, branchManager |
| `/customer-grading/:id` | Single customer drill-down | admin, areaManager, branchManager, supervisor, staff |

### Reusable Components
- `CustomerSearchInput` — search existing customers by name/account for referral dropdown (used on task entry, mapping, grading drill-down)
- `GradeBadge` — colored badge showing A/B/C/D/E grade
- `ScoreBreakdown` — horizontal bar chart showing loan/referral/share score components

## Recalculation Triggers
1. **After each CBS upload** (loans updated → scores change)
2. **After each task entry with referral**
3. **Daily via existing cron** (02:00, same as NPL snapshot)
4. **Manual "Recalculate All" button** on grading config page

## Ranking & Filters (Grading Page)
- Top 1% / 10% / 20% / 30% quick filter buttons
- Filter by: branch, grade band, date range
- Bottom performers section (grade E)
- Columns: rank, customer name, account #, total score, grade, branch, last calculated
- Sortable by any column

## Implementation Order
1. Create `GradingConfig` model + admin config UI (sliders)
2. Create `CustomerReferral` model + add "Referred By" field to task entry form
3. Build scoring engine in `performanceCalculator.js`
4. Create `CustomerScore` model + recalculation logic
5. Build customer grading page with ranking + filters
6. Build single customer drill-down page
7. Wire recalculation triggers (CBS upload, cron, manual)
