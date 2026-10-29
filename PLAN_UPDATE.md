# Plan & Product Update — Wolayita Sodo Alignment

**Status**: ✅ Implementation Complete — pending seed data deployment

## Source Files
- `Accounts.csv` — CBS export of 557+ real customer accounts for Wolayita Sodo
- `WSodo Plan FY 26 - 27.xlsx` — Branch operational target plan for FY 2026-2027

## What the Client's Plan Actually Tracks

The plan has 12 product-level categories, each with **dual targets** (deposit amount + account count), broken into **monthly increments** (July through June):

| # | Product Category | Annual Deposit Target | Annual Account Target |
|---|---|---|---|
| 1 | Loan Saving Deposit | 40,500,000 ETB | — |
| 2 | Michu Current Saving | 60,750,000 ETB | 13,994 |
| 3 | Gihon Regular Saving | 28,350,000 ETB | 9,125 |
| 4 | Mothers Saving | 16,200,000 ETB | 1,788 |
| 5 | Young Womens Saving | 16,200,000 ETB | 4,020 |
| 6 | Elders Saving | 12,150,000 ETB | 2,939 |
| 7 | Children Saving | 8,100,000 ETB | 4,355 |
| 8 | Fixed Time Deposit | 64,800,000 ETB | 20 |
| 9 | Premium Saving Deposit | 101,250,000 ETB | 9,025 |
| 10 | Special Saving | 16,200,000 ETB | — |
| 11 | Segment Deposit | 12,150,000 ETB | 120 |
| 12 | Wadiah IFB Deposit | 28,350,000 ETB | 967 |

**Total Deposit Target: 405,000,000 ETB**
**Total Account Target: 45,398**

Additional categories tracked:
- Conventional Loans: 324,000,000 ETB
- IFB Financing: 15,000,000 ETB
- NPL Ratio: 0% (target)

## Changes Required

### 1. Add New Product Category Enum

New `ProductCategory` enum with 12 values matching client's plan:

```
Loan_Saving_Deposit
Michu_Current_Saving
Gihon_Regular_Saving
Mothers_Saving
Young_Womens_Saving
Elders_Saving
Children_Saving
Fixed_Time_Deposit
Premium_Saving_Deposit
Special_Saving
Segment_Deposit
Wadiah_IFB_Deposit
```

### 2. Expand KpiCategory Enum

Add product-based KPI categories to match the client's real categories:

```
Loan_Saving_Deposit       -> "Loan Saving Deposit"
Michu_Current_Saving      -> "Michu Current Saving"
Gihon_Regular_Saving      -> "Gihon Regular Saving"
Mothers_Saving            -> "Mothers Saving"
Young_Womens_Saving       -> "Young Womens Saving"
Elders_Saving             -> "Elders Saving"
Children_Saving           -> "Children Saving"
Fixed_Time_Deposit        -> "Fixed Time Deposit"
Premium_Saving_Deposit    -> "Premium Saving Deposit"
Special_Saving            -> "Special Saving"
Segment_Deposit           -> "Segment Deposit"
Wadiah_IFB_Deposit        -> "Wadiah IFB Deposit"
```

### 3. Update Plan Model

Add fields to `Plan` model:
- `product_category ProductCategory?` (new field, alongside existing `kpi_category`)
- `target_count Float @default(0)` (account/number target)
- `monthly_plan Json?` (monthly breakdown — array of 12 months with amount + count targets)

Add fields to `StaffPlan` model:
- `target_count Float @default(0)`
- `monthly_plan Json?`

### 4. Add Missing CBS Product Types

These product types exist in Accounts.csv but are missing from our system:

| Product | Maps To |
|---|---|
| Premium Saving Deposit | Premium_Saving_Deposit |
| Fixed Time Deposit | Fixed_Time_Deposit |
| Wadiah Saving Account | Wadiah_IFB_Deposit |
| Segment Account | Segment_Deposit |
| School | Children_Saving (or new) |

### 5. Update Frontend Product Lists

Update `FALLBACK_PRODUCTS` in `TaskEntryForm.tsx` and static lists in `PlanCascade.tsx`, `ProductMapping.tsx`, `KPIFramework.tsx` to include all product categories.

### 6. Update PlanCascade UI

Redesign PlanCascade to show:
- Product-type targets (per product row with amount + count inputs)
- Monthly breakdown (July→June inline or collapsible)
- Annual totals auto-calculated

### 7. Update PlansOverview

Show per-product breakdown with actual vs target for both amount and count.

### 8. Seed Real Data

- Seed Wolayita Sodo branch with plan targets from XLSX
- Import account mappings from Accounts.csv (557+ accounts)
- Create staff users from Accounts.csv staff references

### 9. Product KPI Mappings

Map all CBS product names to KPI categories:

| CBS Product Name | KPI Category | Product Category |
|---|---|---|
| LOAN SAVING RESERVE ACCOUNT | Deposit Mobilization | Loan_Saving_Deposit |
| Michu Current Account | Deposit Mobilization | Michu_Current_Saving |
| GIHON REGULAR SAVING | Deposit Mobilization | Gihon_Regular_Saving |
| MOTHERS SAVING ACCOUNT | Deposit Mobilization | Mothers_Saving |
| YOUNG WOMEN SAVING | Deposit Mobilization | Young_Womens_Saving |
| ELDERS SAVING ACCOUNT | Deposit Mobilization | Elders_Saving |
| CHILDREN SAVING ACCOUNT | Deposit Mobilization | Children_Saving |
| FIXED TIME DEPOSIT | Deposit Mobilization | Fixed_Time_Deposit |
| Premium Saving | Deposit Mobilization | Premium_Saving_Deposit |
| SPECIAL SAVING ACCOUNT | Deposit Mobilization | Special_Saving |
| Segment Account | Deposit Mobilization | Segment_Deposit |
| WADIAH SAVING ACCOUNT | Deposit Mobilization | Wadiah_IFB_Deposit |
| REPAYMENT ACCOUNT | Internal Operations | (loan repayment) |
| School | Deposit Mobilization | (education savings) |

## Migration Plan

### Phase 1: Schema
- [x] Add `ProductCategory` and expand `KpiCategory` enums
- [x] Add `product_category`, `target_count`, `monthly_plan` to Plan model
- [x] Run Prisma migration

### Phase 2: Backend
- [x] Update plan controller for product targets
- [x] Add CBS product → product category mapping (prismaHelpers.js)
- [x] Update plan cascade to handle product_category plans (planCascade.js)
- [x] Update performance calculator for per-product achievement (performanceCalculator.js)
- [x] Update dashboard controller for product-level KPI breakdown (dashboardController.js)
- [x] Update achievement endpoint for product-level plans (planController.js)
- [x] Add seed script for Wolayita Sodo plan data
- [x] Add seed script for account imports from CSV

### Phase 3: Frontend
- [x] Update PlanCascade for per-product targets (product categories dropdown, target count)
- [x] Update PlansOverview for dual metrics (product achievement data)
- [x] Update StaffDashboard for product-level breakdown display
- [x] Update all product lists (ProductMapping, PlanCascade, PlansOverview)
- [x] Add NPL dashboards (HQ/Area/Branch/Team) with side navigation

### Phase 4: Integration Completed
- [x] NPL & Collection Tracking: DPD/PAR calculation, daily snapshots, loan schedules
- [x] Regions model with CRUD controller/routes
- [x] All 118 tests passing
- [x] Frontend builds clean (tsc + vite build)
- [x] Database migrations applied (12 migrations)
- [x] Committed and pushed to Ghion-Saccos branch

### Phase 5: Align Task Types with Plan
- [x] Add 12 product categories to TaskType enum (Loan_Saving_Deposit, Michu_Current_Saving, etc.)
- [x] Create Prisma migration
- [x] Update all backend KPI-to-task-type mappings to include product categories under Deposit_Mobilization
- [x] Update frontend TaskEntryForm task type dropdown and fallback lists
- [x] All 118 tests passing (post-migration)

### Phase 6: Deploy
- [ ] Run `seedFromFiles.js` to populate real customer data from Accounts.csv
- [ ] Run `seedWolayitaSodoPlan.js` for product-level plan targets
- [ ] Rebuild and deploy frontend

### Phase 7: Team Management for Branch Managers (Team-Only)

**Goal**: Keep it simple — teams are led by supervisors, no sub-team layer. Branch manager creates named teams and assigns a supervisor to lead each team.

**Why Team-only**: The SubTeam model adds complexity without real use. Supervisors already see their team members via `supervisorId`. Teams give the branch manager a clean way to organize and name groups.

**Adaptations from `main`**:
- Old role `lineManager` → now `supervisor` (team manager)
- SubTeam model removed — unnecessary organizational layer
- isBranchManager middleware allows admin/areaManager/branchManager/supervisor

**Backend Tasks**:
- [x] Add Team model to Prisma schema with User ↔ Team relation
- [x] Create and apply Prisma migration
- [ ] Create migration to drop sub_teams table (if coming from Ghion-Saccos)
- [x] Create `teamController.js` — CRUD for Team only
- [x] Create `teamRoutes.js` — routes protected by isBranchManager
- [x] Register routes in `server.js`

**Frontend Tasks**:
- [x] Add `teamsAPI` to `api.ts`
- [x] Create `TeamManagement.tsx` — simple form: team name, code, assign supervisor
- [x] Add route `/teams` in App.tsx for branchManager
- [x] Add sidebar "TEAM MANAGEMENT" link for branchManager

**Testing & Verification**:
- [x] Backend tests pass (all 118 passing)
- [x] Frontend builds clean (tsc + vite build)

### Phase 8: Supervisor Team Hub — Dedicated Team Performance Page

**Goal**: Slim down the Supervisor Dashboard to only key stats, and move all detailed team member data to a new dedicated "Team Hub" page (`/team-hub`). Supervisors get one place to see everything their team is doing.

**Changes**:

**SupervisorDashboard.tsx** (simplified):
- Keep only 4 stat cards: Team Members, Mapped Accounts, Avg KPI Achievement, Pending Approvals
- Add prominent "View Team Hub →" button
- Remove: Own KPI progress, Team KPI breakdown, Team Members table, Edit Requests section

**TeamHub.tsx** (new page at `/team-hub`):
- **Team Members table** — name, position, mapped accounts, KPI %, status (On Track/Needs Focus/At Risk)
- **Team KPI Breakdown** — per-category progress bars (moved from dashboard)
- **Recent Team Tasks** — last 10 tasks from all team members with status
- **Pending Edit Requests** — approve/reject inline (moved from dashboard)

**Files to modify/create**:
- `frontend/src/pages/SupervisorDashboard.tsx` — strip down to stats only
- `frontend/src/pages/TeamHub.tsx` — new full detail page
- `frontend/src/App.tsx` — add route `/team-hub` for supervisor
- `frontend/src/components/layout/Sidebar.tsx` — add "TEAM HUB" link for supervisor

**Testing**:
- [ ] Backend tests pass
- [ ] Frontend builds clean
- [ ] Supervisor dashboard shows only stats + link to team hub
- [ ] Team hub shows members table, KPI breakdown, recent tasks, edit requests
- [ ] All existing functionality still works
