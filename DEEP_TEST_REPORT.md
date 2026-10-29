# Deep Test & Analysis Report — Wisdom SACCOS PMS

Date: 2026-10-29
Repository: `gemBekele/wisdom_PMS_v2` (`/home/barch/projects/wisdom/Wisdom-SACCOS-PMS`)
Environment: local PostgreSQL, Node.js 23, backend port `5101` for isolated tests, frontend port `5273`.

---

## 1. Method

- Isolated test database: `wisdom_pms_test`, migrated from scratch with all 21 Prisma migrations.
- Seeded deterministic demo data: 8 users (5 roles + 3 extra staff), 4 branch plans, 20 staff plans, 48 accounts (40 savings + 8 loans), 40 baselines, 18 tasks/36 approvals, 4 behavioral evaluations, 4 performance scores, 48 loan schedules, 1 NPL snapshot, 1 CBS validation, 3 notifications.
- Backend test instance started with `PRISMA_LOG_QUERIES=true` so every SQL statement could be counted.
- 235 API calls executed across all five roles, covering every route family.
- 73 frontend routes loaded in headless Chrome (1440×1100), per role, with console/exception/network monitoring.
- Load tests: 8 sequential and 8 concurrent requests per hot endpoint.
- `npm audit`, TypeScript build, production build, and schema/migration checks.

---

## 2. Summary results

| Area | Result |
|---|---|
| API calls executed | **235** |
| API 5xx responses | **0** (after fixes; 5 before) |
| API status mix | 200: 175, 201: 7, 400: 13, 401: 2, 403: 37, 429: 1 |
| Frontend routes tested | **73** |
| Frontend exceptions | **0** |
| Frontend HTTP failures | **0** |
| Frontend console warnings | 1 remaining (React list key in `BranchMonitoring`) |
| Auth escalation / IDOR tests | All blocked after fixes |
| Rate limiting | Login limiter returns 429 after 20 attempts/IP |
| Build | `tsc -b` PASS, Vite build PASS |
| Initial JS bundle | 424.55 kB (129.15 kB gzip); charts in separate 338 kB chunk |
| Workflow tests | 19/20 functional passes; 1 status-code-only mismatch (product-mapping create returns 200 instead of 201) |

---

## 3. Feature-by-feature test results

### 3.1 Authentication

| Test | Result |
|---|---|
| Login all five roles | Pass |
| Wrong password | 401 |
| Missing credentials | 400 |
| No token on `/api/auth/me` | 401 |
| Rate limit after 20 attempts | 429 (4 of 24 blocked) |
| Password hash in API responses | Absent (0 occurrences) |
| Security headers | CSP, HSTS, X-Frame-Options, X-Content-Type-Options present |
| Public user directory | Returns 9 active users with emails/roles (still exposed by design) |

### 3.2 Users, roles, hierarchy

| Test | Result |
|---|---|
| `/api/users` per role | Pass; staff scoped to self, branch/area scoped |
| `/api/users/:id` cross-user | 403 for staff, pass |
| `/api/users/hierarchy` admin/area/branch/staff | Pass after fix (previously 500) |
| Create user (admin) | 201, branch/supervisor resolved |
| Update user (admin) | 200, allowlisted fields only |
| Reset password (admin) | 200 |
| Deactivate user (admin) | 200 |
| Self role escalation | 403 |
| Branch-manager escalates staff to admin | 403 |
| Registration endpoint (admin) | 201 |

### 3.3 Plans and staff plans

| Test | Result |
|---|---|
| Create plan | 201; staff cascade created |
| Update plan | 200; staff plans rebuilt |
| Negative target value | 400 |
| Bulk CSV plan upload | 201, created count > 0; product category normalized |
| Product-name KPI in upload | Accepted and mapped to parent KPI |
| `/api/plans` | 200 |
| `/api/plans/achievement` with period | 200 |
| `/api/plans/achievement` without period | 400 (explicit requirement) |
| Staff plan list scope | Staff sees own only; branch/area filters cannot be widened |
| Cross-staff staff-plan detail | 403 |
| Percentage KPI targets | Demo seed overrides share-split with 95/90 per person |

### 3.4 Daily tasks and approvals

| Test | Result |
|---|---|
| Create task (valid) | 201 |
| Invalid task type | 400 (previously 500) |
| Negative amount | 400 (previously accepted) |
| Invalid date | 400 |
| Request edit while pending | 200 |
| Review edit approve | 200 |
| Supervisor approve | 200 |
| Branch-manager approve | 200 |
| Final task status | Approved |
| Request edit on approved task | 400 (blocked correctly) |
| Task list pagination | Honours `limit`/`page`, max 500 |
| Cross-branch task read | 403 |

### 3.5 Account mappings and mapped accounts

| Test | Result |
|---|---|
| Create mapping (valid) | 201 |
| Negative balance | 400 (fixed) |
| Cross-branch `branchId` in body | Ignored; mapping stays in caller branch |
| Assign to user outside branch | 400 |
| Update with `balance`/`branchId`/`accountNumber` tampering | Ignored; balance and account number unchanged |
| Staff reads another account detail | 403 (fixed) |
| Staff reads another user's dashboard | 403 |
| Staff reads unmapped accounts | 403 (route restricted) |
| Branch manager reads unmapped accounts | 200, own branch only |
| Area manager mapping list | 200, own area only |
| Branch manager `branchId` override on mapping list | Ignored |
| Staff `mappedTo` override on mapping list | Ignored; own mappings only |

### 3.6 CBS validation

| Test | Result |
|---|---|
| Upload own branch CSV | 201 |
| Upload with another branch code | 403 (fixed) |
| Invalid file type | 400 after fix (previously 500) |
| Staff list/resolve | 403 |
| Branch manager list/report | 200, own branch only |
| Discrepancy resolution | Manager-only, validation/branch-scoped, notes required, audited |
| Cross-branch discrepancy resolution | 403 |

### 3.7 June balance import

| Test | Result |
|---|---|
| Empty/invalid CSV | 400 |
| Active baseline after failed import | Unchanged (40 before/after) |
| Valid import path | Works; deactivates other periods only after rows imported |
| Staff reads another account baseline | 403 (fixed) |
| Admin baseline list/periods | 200 |
| Non-admin baseline list/periods | 403 |

### 3.8 Performance

| Test | Result |
|---|---|
| Calculate as admin for staff | 200, score persisted |
| Calculate as staff for another user | 403 |
| KPI weights | Loaded once, normalized across present KPIs |
| Rating thresholds | 90/80/70/60, reachable |
| Behavioral score | Included even when plan period is `FY-2026-27` |
| Demo staff score | 89.28–92.28 after collection-rate and score-cap fixes (KPI 78.28 + behavioral 11–14) |
| Team standings | 200, but still uses hardcoded composite (gap) |
| Score generation by normal workflow | None (gap) |

### 3.9 Behavioral evaluation

| Test | Result |
|---|---|
| Create as supervisor | 201 after fix (previously 500) |
| Self-evaluation | 400 |
| Create as branch manager | 403 (supervisor-only) |
| Approve as branch manager | 200 |
| Approve as supervisor | 403 |
| Self-approval | 403 |
| Cross-branch evaluation | 403 |

### 3.10 NPL and collections

| Test | Result |
|---|---|
| Staff NPL dashboard | 200 |
| Branch/area/HQ NPL dashboards | 200 |
| Generate schedule (manager) | 200, branch-scoped |
| Pay installment (manager) | 200, branch-scoped, amount/date validated |
| Staff pays installment | 403 |
| Trigger snapshot (branch manager) | 200; unique per branch/date |
| Collection rate | Now includes all installments due to date (fixed) |
| Schedule read cross-branch | 403 (fixed) |

### 3.11 Teams, notifications, settings, audit

| Test | Result |
|---|---|
| Create/update/delete team | 201/200/200 |
| Team create conflict with assigned member | 400 and no orphan team left |
| Team delete | Clears member `teamId` |
| Admin list teams | 200 (fixed; previously 403) |
| Staff list teams | 403 |
| Notifications list/unread/mark read/mark all | 200 |
| Balance source: admin update | 200 |
| Balance source: branch manager update | 403 |
| Audit list admin | 200 |
| Audit list non-admin | 403 |
| Audit entries from workflows | Present |

### 3.12 Exports

| Test | Result |
|---|---|
| Own scorecard export | 200 |
| Another user's scorecard export | 403 (fixed) |
| Branch report as staff | 403 (fixed) |
| Admin exports | 200 |

### 3.13 Frontend pages

73 routes loaded across admin, area, branch, supervisor, staff.

- 0 page exceptions and 0 HTTP failures.
- `admin /kpi` redirects to `/dashboard` because admin is not allowed on the KPI page (expected guard behaviour).
- Password fields on `/profile` and `/settings` are expected, not errors.
- One remaining minor console warning: missing React list key in `BranchMonitoring`.
- `MonthlyScorecard` key warning fixed by adding a competency-name fallback.
- Slowest page load: ~318 ms (staff `/reports`); most pages 250–310 ms on local dev.

---

## 4. Security test results

### 4.1 Blocked after fixes

| Attempt | Result |
|---|---|
| Staff → `PUT /api/users/:id` with `role: admin` | 403 |
| Branch manager → escalate staff to admin | 403 |
| Staff → read admin user | 403 |
| Staff → another user's mapped-account dashboard | 403 |
| Staff → another user's account detail | 403 |
| Staff → another user's scorecard export | 403 |
| Staff → branch report export | 403 |
| Staff → another account's baseline | 403 |
| Staff → CBS list/resolve | 403 |
| Staff → NPL installment payment | 403 |
| Staff → create transaction | 403 |
| Branch manager → global balance-source setting | 403 |
| Supervisor → approve behavioral evaluation | 403 |
| Supervisor → self-evaluation | 400 |
| Branch manager → CBS upload for another branch | 403 |
| Staff → product mappings | 403 |
| Staff → unmapped account list | 403 |
| Staff → other staff's staff-plan detail | 403 |
| Staff → mapping list with `mappedTo` override | Scoped to self |
| Branch manager → mapping list with `branchId` override | Scoped to own branch |

### 4.2 Verified controls

- JWT required on all protected routes; missing token → 401.
- Password hashes/reset tokens absent from user/profile responses.
- Login limiter: 20 attempts per 15 minutes per IP, then 429.
- General API limiter: 1,000 requests per 15 minutes per IP.
- Helmet: CSP, HSTS, X-Frame-Options, X-Content-Type-Options.
- Body size limit: 2 MB.
- Upload extension/MIME allowlist; invalid upload returns 400 (after fix).
- Prisma parameterization: injection string (`' OR 1=1--`) returned 0 rows, no error.
- No `dangerouslySetInnerHTML`, `eval`, or `new Function` in frontend.
- Notification links are constrained to same-origin router navigation.

### 4.3 Still open

- **Public user directory** exposes 9 employee emails/roles to unauthenticated visitors.
- No MFA, no account lockout beyond IP rate limiting.
- JWT is long-lived (7 days), stored in `sessionStorage`, no revocation/token version.
- Development mode returns stack traces for unexpected errors.
- Development CORS reflects any origin.
- `xlsx` and `react-router` have known advisories; see `SECURITY_PERFORMANCE_AUDIT.md`.

---

## 5. Performance results

### 5.1 Query counts and latency (test DB, query logging enabled)

| Endpoint | Role | Queries | Latency |
|---|---|---|---|
| `GET /api/dashboard/branch` | branch | 82 | 315 ms |
| `GET /api/dashboard/hq` | admin | 39 | 197 ms |
| `GET /api/dashboard/supervisor` | supervisor | 44 | 166 ms |
| `GET /api/performance/team-standings` | supervisor | 43 | 185 ms |
| `GET /api/performance/team-standings` | staff | 37 | 146 ms |
| `GET /api/dashboard/staff` | staff | 28 | 115 ms |
| `GET /api/dashboard/area` | area | 29 | 130 ms |
| `POST /api/npl/snapshot` | branch | 40 | 145 ms |
| `GET /api/npl/branch` | branch | 14 | 68 ms |
| `GET /api/mapped-accounts/unmapped` | admin | 3 | 98 ms |

With query logging disabled (main instance), sequential averages were:

| Endpoint | Avg | p95 | 8 concurrent |
|---|---|---|---|
| `GET /api/dashboard/hq` | 94 ms | 116 ms | 316 ms |
| `GET /api/dashboard/branch` | 188 ms | 216 ms | 457 ms |
| `GET /api/performance/team-standings` | 103 ms | 117 ms | 273 ms |
| `GET /api/tasks?limit=50` | 22 ms | 26 ms | 90 ms |

### 5.2 Analysis

- Branch dashboard is the heaviest page (82 queries, ~315 ms with logging, ~188 ms without).
- The dominant cost remains per-user growth/collection calculation inside dashboard loops. `calculateIncrementalGrowth` was reduced from per-account queries to two queries per user, but dashboards still call it once per staff member and sometimes twice.
- `team-standings` has a similar per-member query chain.
- `POST /api/npl/snapshot` does ~40 queries for 8 loans and writes on demand.
- `POST /api/cbs/upload` is synchronous and row-by-row; with 5k–10k rows it will become the slowest operation.
- Frontend is now route-split: initial JS 424.55 kB / 129.15 kB gzip; recharts is a separate 338 kB chunk.
- List endpoints still return full datasets for several pages (tasks, mappings, CBS, audit, mapped accounts, users), and tables render client-side.

### 5.3 Recommendations (highest impact)

1. Batch growth calculation for all users in a dashboard into one grouped SQL query; remove per-user loops.
2. Read NPL dashboards from `NplSnapshot` instead of recomputing from schedules; stop writing snapshots on GET.
3. Move CBS/June/bulk mapping processing to background jobs with chunked bulk writes/transactions.
4. Add server-side pagination/search to `Tasks`, `MappingManagement`, `CBSValidation`, `AuditTrail`, `UserManagement`, `MappedAccounts`.
5. Add a shared frontend query cache (TanStack Query/SWR) to stop refetching the same dashboard data across pages.
6. Add TTL caching for `/api/config`, KPI weights, product mappings, and reference lists.

---

## 6. Bugs found and fixed during this deep test

| # | Bug | Fix |
|---|---|---|
| 1 | `GET /api/users/hierarchy` returned 500 for admin/area (`select` + `include` together) | Nested `supervisees` moved into `select` |
| 2 | Behavioral evaluation create returned 500 (`position: 'Branch Manager'` vs enum `Branch_Manager`) | Enum value used in approval chain |
| 3 | Performance calculation returned 500 when admin calculated for a staff member (null caller `branch_code`) | Uses target user's branch; validates self/manager access |
| 4 | Invalid task type/negative amount/invalid date returned 500 | Explicit 400 validation |
| 5 | Staff could read any account detail by account number | Branch/self scope added |
| 6 | Staff could export any scorecard/branch report | Self/area/branch scope added |
| 7 | Staff could read any June baseline | Account/branch/area scope added |
| 8 | Staff could widen mapping list with `mappedTo`; branch manager with `branchId`; area manager saw all branches | Role-derived scope enforced |
| 9 | Staff could list all unmapped accounts | Manager-only route + branch/area scope |
| 10 | Staff could widen staff-plan list with `branch_code`; branch managers could read any staff plan by ID | Scope enforcement + branch check |
| 11 | Product mappings were readable by all authenticated users | Admin-only route |
| 12 | Branch manager could upload CBS data for another branch | Own-branch enforcement (403) |
| 13 | CBS list/report accepted another branch ID | Role-derived branch/area scope |
| 14 | Negative mapping balances accepted; cross-branch assignee accepted | Validation + branch/assignee checks |
| 15 | Team create left an orphan team when member validation failed | Team rolled back |
| 16 | Team delete left members assigned to the deleted team | Member `teamId` cleared |
| 17 | June import deactivated the active baseline even when all rows failed | Deactivation guarded by imported/updated count |
| 18 | Collection rate only counted installments due exactly today | Now counts all installments due to date |
| 19 | Invalid upload type returned 500 with stack | File-filter errors return 400; Multer errors mapped to 400 |
| 20 | `MonthlyScorecard` duplicate/missing React keys | Competency-name fallback added |
| 21 | KPI percentages and final score were not capped (`kpiTotalScore` could exceed 85, final could exceed 100) | Percent capped at 100%; KPI total capped at 85; final score capped at 100 |
| 22 | Demo scores were calculated before loans/schedules existed, producing 0 collection/portfolio scores | Performance calculation moved after loan creation; loans distributed to all staff |

---

## 7. Remaining business-logic and security gaps

### Critical

1. **Non-transactional imports/mutations.** CBS upload, June import, bulk mapping, and plan cascade can leave partial data. CBS repayments can double-apply without idempotency keys.
2. **Public user directory + password-only login.** Employee emails/roles are enumerable; no MFA.
3. **No request schema validation.** `express-validator` is installed but unused; many writes still accept arbitrary fields/types.
4. **Performance scores are not generated by a workflow or scheduler.** Only the manual calculate endpoint creates them; no cron/UI trigger.

### High

5. **Plan vs behavioral period mismatch.** Plans use strings like `FY-2026-27`; behavioral evaluations use `Monthly/Quarterly/Annual`. The score calculator still has to guess.
6. **Product KPI mappings are not authoritative.** Scoring uses hardcoded `CBS_PRODUCT_TO_CATEGORY`; new mappings do not change KPI classification.
7. **Percentage KPI allocation.** Runtime cascade still applies deposit product shares (35/25/15/25) to `Collection_Rate` and `Portfolio_Quality`; only the demo seed overrides targets.
8. **Task edit workflow.** Edits do not reset approvals, revalidate mapping/CBS fields, or recalculate performance.
9. **Approval-mode balance updates** apply to non-deposit tasks with numeric amounts.
10. **CBS validation** can mark rejected/pending tasks as validated; prior validations are never superseded.
11. **NPL rules.** Zero schedules can close a loan; `Missed`/`daysPastDue` are not maintained; long-overdue accounts are excluded from some alerts.
12. **Money stored as floats.** Financial calculations should use Decimal or minor units.
13. **Missing uniqueness constraints** on staff plans, task approvals, and performance scores.

### Medium

14. Frontend lists remain client-side paginated; only some endpoints enforce caps.
15. Dashboard KPI tab changes refetch and blank the page.
16. 30-second notification polling runs on every page; duplicate unread-count calls.
17. Some pages use raw `fetch('/api')` instead of the shared API client.
18. BranchMonitoring has one remaining React key warning.
19. Product-mapping create returns 200 instead of 201 (status-code inconsistency).
20. Export endpoints return JSON rather than a downloadable file, and there is no branch-report UI.

---

## 8. How to reproduce

```bash
# isolated database
createdb wisdom_pms_test
cd backend
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wisdom_pms_test?schema=public" npx prisma migrate deploy
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wisdom_pms_test?schema=public" npm run seed:demo-data

# test backend with query logging
PORT=5101 \
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wisdom_pms_test?schema=public" \
PRISMA_LOG_QUERIES=true \
JWT_SECRET=test-only-secret-0123456789abcdef0123456789abcdef \
node src/server.js

# demo data on the main database
npm run seed:demo-data
```

Demo logins:

- `admin@wisdomsaccos.com` / `admin123`
- `areamanager@wisdomsaccos.com` / `area123`
- `branchmanager@wisdomsaccos.com` / `branch123`
- `supervisor@wisdomsaccos.com` / `supervisor123`
- `staff@wisdomsaccos.com` / `staff123`

---

## 9. Verdict

The system is functionally complete for the tested workflows and now fails closed on the main authorization/IDOR paths. The deepest remaining risks are transactional integrity of imports/financial mutations, the public login directory, the unfinished score/period model, and dashboard query amplification. Under a small demo dataset the UI is responsive; with realistic volumes the dashboards and CBS upload will need the optimizations listed in §5.3.
