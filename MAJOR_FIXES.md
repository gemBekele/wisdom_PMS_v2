# Major Fixes — Sacko-PMS (Ghion SACCOS)

**Status:** Planning only — no code changes in this document  
**Authority:** Client reality + current code > old internal docs  
**Primary client source:** `WSodo Plan FY 26 - 27.xlsx` (+ related CBS daily transaction exports)  
**Related code (do not invent a second model):**  
- `backend/src/utils/planCascade.js`  
- `backend/src/utils/performanceCalculator.js`  
- `backend/src/controllers/dashboardController.js`  
- `backend/src/controllers/cbsController.js`  
- `backend/src/controllers/taskController.js`  
- `backend/prisma/schema.prisma`  
- `frontend/src/pages/TaskEntryForm.tsx`  
- `SYSTEM_OVERVIEW.md` / `SYSTEM_WORKFLOW.md` (outdated in places — align later)

---

## 0. Correct product model (locked decisions)

These decisions come from the client plan and how the branch works today. Treat them as law for all fixes.

### 0.1 Purpose of the system

This is **not** a full CBS. It is a **performance monitoring system**:

1. HQ / CEO gives a **branch plan** (product targets from the client plan document).
2. System **cascades** shares to staff and supervisors who do the work.
3. Workers log **daily work** (the 12 product tasks).
4. Work is **validated** by:
   - **CBS daily transaction log** (from the bank / CBS export), and/or  
   - **Senior / group leader approval** when the work does not appear on CBS (e.g. some digital activations).
5. Achievement = **did they meet the product plan targets?** at every level of the hierarchy.
6. Dashboards and scorecards exist so managers can see if people are actually executing the plan they were given.

### 0.2 What counts as “KPI”

| Layer | What their KPI is |
|-------|-------------------|
| **Staff** | Individual product targets from cascade (amount and/or account count per product). Achievement from validated work + CBS-backed balances where applicable. |
| **Supervisor** | **Also has individual product KPIs** to meet (same cascade model). Approving / monitoring the team is **daily operational duty**, not a separate “team KPI score”. Team view is for management visibility only. |
| **Branch Manager** | **No cascade share.** BM KPI **is the branch KPI** — branch plan achievement (all products). |
| **Area Manager / CEO** | Org / area rollup of branch plan achievement. Not individual task quotas. |

### 0.3 The 12 tasks = client plan products (source of truth)

From `WSodo Plan FY 26 - 27.xlsx`. These are the real daily work types:

| # | Product / Task | Typical dual target |
|---|----------------|---------------------|
| 1 | Loan Saving Deposit | Amount (and count if present) |
| 2 | Michu Current Saving | Amount + account count |
| 3 | Gihon Regular Saving | Amount + account count |
| 4 | Mothers Saving | Amount + account count |
| 5 | Young Womens Saving | Amount + account count |
| 6 | Elders Saving | Amount + account count |
| 7 | Children Saving | Amount + account count |
| 8 | Fixed Time Deposit | Amount + account count |
| 9 | Premium Saving Deposit | Amount + account count |
| 10 | Special Saving | Amount (count if present) |
| 11 | Segment Deposit | Amount + account count |
| 12 | Wadiah IFB Deposit | Amount + account count |

**Also on the client plan (credit / quality — Phase 3):**

- Conventional Loans (portfolio / disbursement targets as defined by client)
- IFB Financing
- NPL ratio target (e.g. 0% / regulatory threshold)

**Do not invent extra “old HR-style KPI task types”** (New Member Registration, Merchant POS, Billers, Internal Ops as task types, Account Productivity as a free-form task, etc.) unless the client plan document explicitly adds them later.

### 0.4 How achievement is measured

Across **all hierarchy levels**, achievement answers:

> For each **plan product**, how much of the **target** was actually met (validated)?

Rules of thumb:

| Metric type | How actual is computed | Validation |
|-------------|------------------------|------------|
| **Deposit amount growth** | Prefer **CBS-backed balances** (incremental vs June / FY baseline) on mapped accounts for that product | Daily CBS transaction/balance log |
| **Account / count targets** | Count of accounts opened / activated / meeting product rules for the period | CBS if product appears in log; else senior/group leader approval |
| **Credit / NPL** | Loan portfolio metrics, collection rate, PAR / NPL | Loan schedules + CBS repayments + NPL engine (Phase 3) |

Staff **task log** = claim of daily work.  
**CBS and/or senior approval** = evidence.  
**Plan product target** = what “done” means.

### 0.5 CBS role (daily bank transaction log)

CBS files are **daily transaction logs** the institution brings from the bank/CBS system. They are used to:

1. Update account balances / activity for mapped accounts.
2. **Validate** that staff/supervisor claimed daily work actually happened in the bank.
3. Support discrepancy lists (claimed in PMS but missing/mismatched in CBS, and vice versa).

CBS is **not** optional decoration for money products — it is the primary truth for deposit products that appear in the bank.

### 0.6 Dual validation model (Phase 2)

A unit of work counts toward KPI if **either**:

1. **CBS-validated** (appears correctly in the daily CBS log), **or**
2. **Approved by senior / group leader** (and final BM where chain requires it) when the work **does not appear on CBS** (example: mobile banking activation if not in export).

No double-counting: once counted, do not count again via the other path for the same task/event.

### 0.7 Out of scope for this fix plan

- Deep security hardening (rate limits, 2FA, etc.) — later  
- Full Phase 4/5 (SMS, open banking API, board report packs) — later, **except Ethiopian working calendar** which is required for daily targets  
- Replacing CBS with live bank open APIs — not required; file upload remains primary  

---

## 1. Analysis of current gaps (why things break)

### 1.1 Code is closer to truth than docs — but code is still split

| Area | What code does today | What it should do |
|------|----------------------|-------------------|
| Task types | 12 product enums (good) | Keep; remove UI/docs that show old KPI tasks |
| Cascade | No BM share (good) | Keep; document BM = branch achievement only |
| Supervisor | Can log tasks + has StaffPlan | Keep individual KPI; do **not** score them as “team average only” |
| Achievement | Multiple formulas in calculator vs dashboards | One shared achievement service |
| Old KPIs | Still in `KpiCategory` enum + weights + `actualGrowth = 0` stubs | Remove/hide from product scorecard; product plans drive scoring |
| Period | Hardcoded strings like `2025-H2` in places | Single period model for FY 26–27 and beyond |
| Daily targets | Target ÷ 183 / 365 calendar days | Working days only (Ethiopia + holidays) |
| Empty positions | Cascade skips empty groups; their % is **not redistributed** | Explicit redistribution rule (see §4) |
| CBS | Upload + match + mark `cbsValidated` | Daily validation path must be first-class for deposit products |
| NPL / loans | Engine exists; data path incomplete | Phase 3 complete |

### 1.2 Related-code risk (what breaks if you “just edit one place”)

Achievement and plans touch many files. Fixing only one layer causes **dashboard vs scorecard vs plan overview** mismatches.

**Shared dependencies (must stay in sync):**

```
schema TaskType / ProductCategory / Plan / StaffPlan
        │
        ├── planCascade.js          → creates StaffPlan targets
        ├── performanceCalculator.js → scores / growth / NPL
        ├── planController.js       → plan CRUD + achievement endpoints
        ├── dashboardController.js  → staff / BM / supervisor / CEO views
        ├── cbsController.js        → daily log validate + balance update
        ├── taskController.js       → daily work + approval chain
        ├── prismaHelpers.js        → maps (product ↔ task ↔ KPI labels)
        ├── configController / KPI framework UI → weights & task lists
        └── frontend TaskEntryForm, dashboards, PlansOverview, KPIFramework
```

**Rule for every fix:** change the **single source of truth first**, then rewire consumers — never re-implement the formula in a dashboard.

---

## 2. Phased work (what we will do)

| Phase | Goal | In this plan? |
|-------|------|----------------|
| **Phase 1** | Product-plan reliability: single achievement, remove old KPI noise, BM/supervisor model, empty positions, periods, working-day targets | **Yes — all** |
| **Phase 2** | Dual validation: CBS **or** senior approval; reliable counting | **Yes** |
| **Phase 3** | NPL / collection / loan plan reliability | **Yes** |
| **Phase 4–5** | Security, SMS, open banking, etc. | **No** (later) |
| **Ethiopian calendar** | Working days for daily/weekly targets | **Yes** (pulled into Phase 1) |

---

# PHASE 1 — Make the product plan scorecard trustworthy

## Fix 1.1 — Single achievement engine (highest priority)

### Problem

`performanceCalculator.js`, `dashboardController.js`, and plan achievement endpoints compute “actual” differently (or hardcode zeros). Hierarchy views disagree.

### Target behavior

One module (extend `performanceCalculator.js` or new `achievementService.js`) exposes pure functions:

```
getProductAchievement({ scope, product_category, period, asOfDate })
  → { target_amount, actual_amount, target_count, actual_count, percent_amount, percent_count, percent }

getBranchPlanAchievement({ branch_code, period })
  → per product + rollup

getUserPlanAchievement({ userId, period })
  → from StaffPlan rows only (staff + supervisor)

getBranchManagerAchievement({ branch_code, period })
  → same as getBranchPlanAchievement (BM has no personal StaffPlan share)
```

**Scope rules:**

| Scope | Includes |
|-------|----------|
| `user` | Mapped accounts + validated tasks for that user |
| `branch` | All accounts/tasks in branch |
| `area` | All branches in area |
| `org` | All branches |

### How to implement without breaking related code

1. **Add** the new functions; do **not** delete old ones on day one.
2. Point **one** consumer at a time to the new API:
   - staff dashboard → then supervisor → BM → plans achievement → CEO.
3. Add **golden tests** with fixed June balances + CBS + tasks so numbers cannot drift.
4. Only after all consumers use the new API, remove dead local formulas.
5. **Never** change `StaffPlan` / `Plan` field meanings mid-migration without a migration note.

### Acceptance

- Same user, same period: Staff dashboard % = Monthly scorecard % = API `getUserPlanAchievement`.
- BM screen % = branch plan % for every product.

---

## Fix 1.2 — Score only client plan products (remove old KPI task model)

### Problem

Legacy `KpiCategory` values and UI/docs still imply:

- Account Productivity, New Member Registration, New Account Opening, Share Capital Growth, Mobile Banking Users, Merchant POS, Billers, Internal Operations as primary scorecard lines  
- Task types that are **not** the 12 products  
- Calculator branches that return `actualGrowth = 0`

Client reality: **product plan rows** are the KPI.

### Target behavior

**Primary scorecard = product categories from WSodo plan.**

| Keep for scoring | Role |
|------------------|------|
| 12 deposit products | Core Phase 1 |
| Collection Rate / Portfolio Quality / NPL | Phase 3 (credit) |
| Behavioral score (if still used) | Separate non-product weight — optional later |

| Remove from active product scorecard UI | Notes |
|-----------------------------------------|--------|
| Old generic KPI task types not in client plan | Remove from TaskEntryForm config, ConfigContext fallbacks, KPI framework defaults used for *task logging* |
| Hardcoded `actualGrowth = 0` KPI branches | Delete or never called once products-only |

### How to implement without breaking related code

1. **Do not drop Prisma enum values in the first PR** if DB already has rows using them — soft-remove:
   - Mark legacy KPI IDs inactive in `kpiFrameworkConfig` / config API.
   - Frontend only lists active product categories + Phase 3 credit KPIs when enabled.
2. Map every product plan row to `product_category` + parent label only if needed for grouping (e.g. all 12 under “Deposit products”). Prefer **product-level StaffPlan** as the unit of truth.
3. Update `PRODUCT_CATEGORY_TO_KPI` / cascade so product plans do not depend on obsolete matrix keys that no longer exist in the UI.
4. After data is clean, optional later migration to slim enums.

### Acceptance

- Task entry only shows the 12 products (plus credit types when Phase 3 is on).
- No dashboard card for “Merchant POS” etc. unless client plan adds it.
- Product plan achievement drives the score, not legacy stubs.

---

## Fix 1.3 — BM model: no share; BM KPI = branch KPI

### Problem

Docs sometimes assign BM cascade %. Code correctly omits BM from `CASCADE_MATRIX`. BM dashboards may still mix personal-style cards with branch cards.

### Target behavior

- Cascade matrix applies only to: Operation Supervisor, CR Supervisor, CR Officer group, CS Officer group (as in current code intent).
- BM does **not** receive `StaffPlan` rows from cascade.
- BM performance views always call `getBranchPlanAchievement`.
- “Team table” under BM is **diagnostic** (who contributes), not BM’s personal quota.

### How to implement without breaking related code

1. Confirm `planCascade.js` never adds BM (already true) — add a unit test that BM never appears in cascade output.
2. BM dashboard endpoints: replace any `calculateKPIScore(bmUserId)` with branch achievement.
3. Update docs only after code; do not reintroduce BM % into matrix “to match old docs”.

### Acceptance

- Creating a plan does not create StaffPlans for branchManager role.
- BM % equals branch product achievement rollup.

---

## Fix 1.4 — Supervisor model (your clarification)

### Problem

Earlier analysis assumed “supervisor KPI = team average only”. That is **wrong** for this client.

### Target behavior

| Supervisor activity | Has KPI? |
|---------------------|----------|
| Own product targets from cascade | **Yes** — individual achievement like staff |
| Logging own daily product tasks | **Yes** — allowed (code already allows supervisor task log) |
| Approving team tasks / monitoring | **No separate KPI** — operational duty |
| Team dashboard averages | **Visibility only** — not their score |

### How to implement without breaking related code

1. Keep cascade creating StaffPlans for supervisors.
2. Score supervisors with `getUserPlanAchievement(supervisorId)` (same engine as staff).
3. Keep team list / pending approvals on supervisor UI without feeding into final score formula.
4. Remove any “team average = supervisor score” comments or code paths if they appear.

### Acceptance

- Supervisor with no personal validated product work scores low even if team is strong (unless their own mapped accounts grew via their work).
- Approving tasks does not invent personal deposit points.

---

## Fix 1.5 — Period strings (FY 26–27 and beyond)

### Problem

Mixed period formats (`2025-H2`, `FY-2026-27`, hardcodes in dashboards) cause empty StaffPlans or wrong baselines.

### Target behavior

**Canonical period string** for Ghion FY plans:

```
FY-2026-27
```

Rules:

1. All new plans and StaffPlans use one canonical form.
2. Plan upload / seed from WSodo uses that form.
3. Dashboards **never** hardcode a period — use:
   - query param, or  
   - “active plan period for this branch”, or  
   - config default for the org.
4. Optional alias map for old data (read-only migration):

```
'2025-H2' → migrate or map once
'2026-27' → 'FY-2026-27'
```

### How to implement without breaking related code

1. Introduce `normalizePeriod(input) → canonical` in one util; use it at **write** boundaries (create plan, cascade, seed).
2. At **read** boundaries, normalize query params before DB filter.
3. Data migration script: rewrite existing `period` values to canonical (run once, with backup).
4. Only then remove hardcodes like `'2025-H2'` in `dashboardController.js`.

### Acceptance

- WSodo seed period matches dashboard default.
- Changing period in UI reloads correct targets for all roles.

---

## Fix 1.6 — Empty positions in cascade (point 6)

### Problem

Cascade matrix assigns % to position groups. If a branch has **no** Operation Supervisor (or no CS officers), that group’s share is currently **skipped** (`sharePercent > 0` but no members → nothing assigned). Result:

- Sum of individual targets **&lt; branch target**, or  
- Branch can never attribute 100% of plan to people who exist.

### Decision options (choose one policy and implement only that)

| Option | Behavior | Pros | Cons |
|--------|----------|------|------|
| **A. Redistribute to present groups (recommended)** | Missing group’s % is split **proportionally among groups that exist** so assigned shares still total 100% of branch target | Fair; branch target fully owned by real people | Slightly different % than HQ matrix when org chart incomplete |
| **B. Park missing share on BM branch view only** | Missing % stays unassigned to people; branch still has full target; individuals only own their matrix share | Simple math | Staff can hit 100% while branch lags (or reverse) — confusing |
| **C. Force HQ to reconfigure matrix per branch** | Admin sets custom shares when headcount incomplete | Explicit | Operational burden; error-prone |
| **D. Assign missing share to a designated role** (e.g. CR Supervisor or BM operationally) | Missing Op Sup share → CR Sup | Clear owner | Not true BM “no share” if parked on BM |

**Recommended for Ghion: Option A**, with audit log of effective shares.

### Target algorithm (Option A)

```
1. Load CASCADE_MATRIX for product (or parent grouping).
2. List active groups with at least one active user in branch.
3. Let S = sum of matrix % for present groups.
4. If S == 0 → error (no staff to cascade).
5. For each present group:
     effective_group_percent = matrix_percent / S * 100
     group_target = branch_target * effective_group_percent / 100
     per_person = group_target / members_in_group
6. Write StaffPlan with plan_share_percent = effective share per person
7. Log: { matrix, presentGroups, effectiveShares }
```

Same redistribution for `target_count` and monthly breakdowns.

### How to implement without breaking related code

1. Change **only** `cascadePlanToStaff` in `planCascade.js`.
2. After code change, **re-cascade** existing Active plans (delete StaffPlans for plan id + recreate) via admin action or migration script — otherwise old wrong targets remain.
3. Snapshot test: branch with only CS + CR officers gets 100% of target split across them.
4. Frontend PlanCascade preview should show **effective** shares when headcount incomplete (so HQ sees the truth).

### Acceptance

- Empty Op Sup: no target left unowned; sum of StaffPlan `individual_target` ≈ `plan.target_value` (within rounding).
- Full headcount: effective shares match matrix exactly.

---

## Fix 1.7 — Ethiopian working calendar for daily / weekly targets

### Problem

`calculateBreakdowns` uses calendar days (183 / 365 / 30). Staff are not expected to deliver plan on weekends/holidays the same way; daily target is inflated/deflated incorrectly.

### Target behavior

```
daily_target  = period_target / working_days_in_period
weekly_target = period_target / working_weeks_in_period  (or 5 * daily)
monthly_target= from monthly_plan if present, else period_target / months
```

**Working day definition (v1):**

- Mon–Fri as working days **unless** listed as public holiday.
- Saturday/Sunday excluded by default (confirm with Ghion if Saturday is half-day — config flag).
- Holiday list: configurable table or JSON config (`workingCalendar`) per year, Ethiopian public holidays for that FY.
- Optional later: full Ethiopian calendar library; v1 can use Gregorian dates of Ethiopian holidays.

### How to implement without breaking related code

1. Add `countWorkingDays(startDate, endDate, calendarConfig)` util.
2. Plan period → resolve start/end dates for `FY-2026-27` (July 1 → June 30 Gregorian for this client FY, confirm exact dates with client).
3. Use util **only** inside cascade breakdown + any “today’s target” widgets.
4. Do **not** change annual `target_value` — only daily/weekly slices.
5. If `monthly_plan` exists from client Excel, **prefer monthly rows** for monthly targets; derive daily from that month’s working days.

### Acceptance

- Daily target on a month with holidays &gt; daily target on a full working month for same monthly amount.
- Weekends never required for “hit daily target” UI logic.

---

## Fix 1.8 — Align cascade matrix & product cascade with client plan

### Problem

Cascade still keys off old KPI names (`Deposit Mobilization`, etc.). Product plans map via `PRODUCT_CATEGORY_TO_KPI`. If legacy KPIs are retired, matrix keys must still resolve.

### Target behavior

- Either:
  - **One matrix for all 12 deposit products** (same shares for every product row), or  
  - Client-provided per-product shares (if they ever give them — not in WSodo sheet today).

Default: **one deposit-product matrix** applied to every product_category plan.

Credit products (loans / NPL) use their own matrix later (Phase 3).

### How to implement without breaking related code

1. In `planCascade.js`, for any `product_category` in the 12, use a single `DEPOSIT_PRODUCT_SHARES` constant (copy current Deposit Mobilization row, **without BM**).
2. Remove dependency on string formatting bugs (`replace` capitalisation) by using enum keys only.
3. Test cascade for each of the 12 products once.

---

## Fix 1.9 — Documentation debt (non-code, do after Phase 1 code)

Update or mark obsolete:

- `SYSTEM_OVERVIEW.md` — old task types, BM share, supervisor = team average  
- `SYSTEM_WORKFLOW.md` — same  
- Keep `PLAN_UPDATE.md` + this file as authority for products  

Do this **after** code matches, so docs don’t re-mislead.

---

# PHASE 2 — Reliable counting (CBS **or** senior approval)

## Fix 2.1 — Dual validation gate

### Problem

Some work appears in CBS daily logs (deposits, many account movements). Some does not (e.g. mobile banking if not exported). Today, rules for when approval alone is enough vs CBS are inconsistent.

### Target behavior

```
counts_for_achievement(task or event) =
  (cbsValidated === true)
  OR
  (approvalStatus === Approved AND product.requiresCbs === false)
  OR
  (approvalStatus === Approved AND product.requiresCbs === true AND policy allows "provisional" — default NO for money)
```

**Product policy flags (config, not hardcode forever):**

| Product class | requiresCbs | counts with approval only? |
|---------------|-------------|----------------------------|
| 12 deposit products (money) | **true** | No for **amount** achievement; optional provisional UI until CBS day-close |
| Count of new accounts for product | true preferred | Yes provisional if CBS lag same day; finalize when account appears |
| Mobile / digital (if added later) | **false** | Yes — senior/group leader approval |
| Credit collection | schedule + CBS repayment | Phase 3 |

### Recommended operating model for deposits

1. Staff/supervisor logs daily task (claim).  
2. Senior/group leader (supervisor) and BM approve process.  
3. **Same day or next morning:** CBS daily log uploaded.  
4. System matches transactions/balances → `cbsValidated`.  
5. **Amount achievement** uses CBS balances / matched transactions, not free-typed amounts alone.  
6. Typed amount is for workflow and discrepancy detection.

### How to implement without breaking related code

1. Add product config: `requiresCbs`, `validationMode: 'cbs' | 'approval' | 'either'`.
2. Achievement engine reads config; dashboards do not invent rules.
3. CBS upload path already sets `cbsValidated` — keep it; improve matching (account + amount + date).
4. For `either` mode: if CBS validates, mark and lock; if only approval, count only if `requiresCbs === false`.
5. Show status badges: Pending approval / Approved pending CBS / Counted.

### Acceptance

- Deposit amount without CBS match does **not** inflate final amount KPI after day close.
- Non-CBS product with full approval **does** count.
- No double count when both approval and CBS exist.

---

## Fix 2.2 — CBS daily log pipeline hardening

### Problem

Upload exists; matching and balance update must be reliable for daily operations.

### Target work

1. Document exact expected columns of client CBS export (and tolerate aliases already in `cbsController`).
2. On upload:
   - update balances / last transaction date  
   - validate tasks for that branch + date  
   - produce discrepancy report  
3. Idempotent re-upload for same branch+date (re-run validation without double-counting).
4. Store validation summary for BM/CEO “today’s verification”.

### How to implement without breaking related code

- Keep route `POST /api/cbs/upload`.
- Extract pure functions: `parseCbs`, `updateBalances`, `validateTasks` — unit test each.
- Do not change task approval chain while improving CBS.

---

## Fix 2.3 — Mapping enforcement in achievement

### Problem

`canCountForKPI` is informational; scoring must only use accounts mapped to the user (for personal KPI).

### Target behavior

- User amount actual = growth on **their** mapped accounts for that product only.
- Tasks on accounts mapped to another staff: never personal credit.
- Unmapped: optional branch-level only until BM maps.

### How to implement without breaking related code

- Enforce inside achievement engine only; leave task creation flexible (staff can still log, mapping status stored).

---

# PHASE 3 — Credit / NPL / collection (must do)

## Fix 3.1 — Complete loan data path from CBS / mapping

### Problem

NPL engine and collection rate exist; without loan fields and schedules, KPIs stay empty.

### Target behavior

1. Import / map loan accounts with: principal, disbursement, maturity, frequency, rates, next payment.
2. Auto-generate `loan_schedules` when missing (`autoGenerateLoanSchedules`).
3. CBS repayment log updates paid amounts / status / DPD.
4. Staff collection alerts = overdue installments on **mapped** loans.
5. Branch NPL dashboard: PAR 1/30/90, aging, trends (`npl_snapshots`).

### Client plan alignment

- Conventional Loans / IFB Financing targets from WSodo (if amount targets exist) → product or credit plan rows.
- NPL ratio target monitored at branch (BM = branch KPI includes NPL quality).

### How to implement without breaking related code

1. Do not change deposit achievement paths when adding loan parsers.
2. Feature-flag credit widgets until seed data exists for a pilot branch.
3. Reuse existing `nplController` + performance helpers; fix data, not rewrite engine unless tests force it.
4. Extend tests in `nplEngine.test.js` with realistic schedules.

### Acceptance

- Pilot branch with loan data: collection rate and PAR non-zero and stable day-to-day.
- Staff see “who to collect from today”.
- BM NPL view matches HQ snapshot after nightly/job run.

---

## Fix 3.2 — Credit in cascade / scorecard

### Target

- If client assigns loan growth targets to branches, cascade with a **credit matrix** (may differ from deposit shares — confirm with client; default can reuse a conservative split without BM share).
- Portfolio Quality / Collection Rate: branch-level for BM; personal for officers who own loan maps.

### How to avoid breaking deposit code

- Separate functions: `getDepositProductAchievement` vs `getCreditAchievement`.
- Scorecard composition adds credit section; does not alter deposit formulas.

---

# Implementation order (safe sequence)

Do in this order so each step has a rollback point:

| Step | Fix | Risk if skipped |
|------|-----|-----------------|
| 1 | Period normalize + kill hardcodes | Wrong targets forever |
| 2 | Achievement engine (products only) + tests | All UI work re-done |
| 3 | Empty position redistribution (Option A) + re-cascade | Unowned targets |
| 4 | Working-day calendar in breakdowns | Wrong daily pressure |
| 5 | BM = branch; Supervisor = individual | Wrong people scored |
| 6 | Remove legacy KPI from UI/config | Noise / zeros |
| 7 | Wire all dashboards to engine | Inconsistent numbers |
| 8 | Dual validation (Phase 2) | Fraud / fake deposits |
| 9 | CBS daily pipeline polish | Day ops fail |
| 10 | Phase 3 NPL full path | Credit blind spot |
| 11 | Doc cleanup | Ops confusion |

---

# Testing checklist (before calling a phase “done”)

### Phase 1

- [ ] Seed WSodo plan `FY-2026-27` for one branch  
- [ ] Cascade with full headcount → sum StaffPlans ≈ branch target  
- [ ] Cascade with missing Op Sup → sum still ≈ branch target (Option A)  
- [ ] Staff A mapped accounts grow via CBS → personal % matches engine  
- [ ] Staff B cannot get credit for Staff A’s account  
- [ ] BM % = branch %  
- [ ] Supervisor % = own StaffPlan only  
- [ ] Daily target ignores Sunday  
- [ ] No UI path to log old non-product KPI tasks  
- [ ] All existing Jest tests pass; add golden achievement tests  

### Phase 2

- [ ] Deposit task approved but not in CBS → amount not final-counted  
- [ ] Same task after CBS match → counted once  
- [ ] Non-CBS product (if any) with approval only → counted  
- [ ] Re-upload same day CBS → idempotent  

### Phase 3

- [ ] Loan schedule generated  
- [ ] Missed installment → alert + DPD  
- [ ] PAR snapshot for branch  
- [ ] Collection rate moves when payments posted  

---

# Explicit non-goals (this document)

- Security deep dive (later)  
- Live bank open API as primary integration  
- SMS / mobile money rails  
- Rewriting the whole frontend  
- Changing org hierarchy (Region → Area → Branch)  
- Making BM take cascade share  
- Scoring supervisors only by team average  

---

# Summary for implementers

| Topic | Decision |
|-------|----------|
| Truth source | Client plan + code; old docs secondary |
| KPI unit | Plan **products** (12 + credit later) |
| BM | Branch achievement only |
| Supervisor | Individual product KPI + approve as duty |
| Staff | Individual product KPI |
| Achievement | Meet product plan targets, hierarchy-wide |
| Validation | CBS daily log and/or senior approval by product policy |
| Empty roles | Redistribute matrix % to present groups (Option A) |
| Daily targets | Ethiopian working days + holiday config |
| Period | Canonical `FY-YYYY-YY` strings |
| Phases | 1 + calendar, 2 dual validation, 3 NPL — then stop |

---

**Next action after this doc is approved:** implement Phase 1 steps 1→7 in order, with tests after each step, without mixing Phase 2 CBS policy changes into the first achievement PR if possible (or do 2.1 only after engine exists so rules live in one place).
