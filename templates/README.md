# Upload File Templates — Sacko PMS

These sample files demonstrate the expected format for each upload endpoint.

## Files

| File | Endpoint | Form Field | Accepts |
|---|---|---|---|
| `sample_cbs_upload.csv` | `POST /api/cbs/upload` | `cbsFile` | CSV, XLSX |
| `sample_plan_upload.csv` | `POST /api/plans/upload` | `planFile` | CSV, XLSX, XLS |
| `sample_mapping_upload.csv` | `POST /api/mappings/bulk-upload` | `mappingFile` | CSV, XLSX, XLS |
| `sample_june_balance.csv` | `POST /api/june-balance/import` | `file` | CSV, XLSX, XLS |
| `generate_excel.py` | — | — | Generates .xlsx from CSVs |

## Upload Commands

```bash
# CBS Upload
curl -X POST http://localhost:5001/api/cbs/upload \
  -H "Authorization: Bearer <token>" \
  -F "cbsFile=@sample_cbs_upload.csv;type=text/csv" \
  -F "branch_code=WOLAYTA_SODO" \
  -F "validationDate=2026-07-21"

# Plan Upload
curl -X POST http://localhost:5001/api/plans/upload \
  -H "Authorization: Bearer <token>" \
  -F "planFile=@sample_plan_upload.csv;type=text/csv"

# Mapping Bulk Upload
curl -X POST http://localhost:5001/api/mappings/bulk-upload \
  -H "Authorization: Bearer <token>" \
  -F "mappingFile=@sample_mapping_upload.csv;type=text/csv"

# June Balance Import
curl -X POST http://localhost:5001/api/june-balance/import \
  -H "Authorization: Bearer <token>" \
  -F "file=@sample_june_balance.csv;type=text/csv"
```

## Required Columns

### CBS Upload
- `accountNumber` (or `Account Number` / `account_id`) — **required**
- `balance` (or `Balance` / `current_balance`)
- `product` (or `Product` / `productName`) — CBS product name
- `customerName` (or `Customer Name`)
- `amount` (or `Amount`)
- `transactionDate` (or `Transaction Date`)

CBS product names must match exactly: `LOAN SAVING RESERVE ACCOUNT`, `Michu Current Account`, `GIHON REGULAR SAVING`, `MOTHERS SAVING ACCOUNT`, etc. (see `prismaHelpers.js` `CBS_PRODUCT_TO_CATEGORY`)

### Plan Upload
- `branch_code` (or `branchcode`) — **required**, must exist in DB
- `kpi_category` (or `kpicategory`) — **required**, one of 12 valid KPI names
- `period` — **required**, e.g. `FY-2026-27`
- `target_value` (or `targetvalue`) — **required**, number > 0
- `target_count` (or `targetcount`) — optional integer
- `product_category` (or `productcategory`) — optional

### Mapping Bulk Upload
- `accountNumber` (or `Account Number`) — **required**
- `customerName` (or `Customer Name`) — **required**
- `staffID` (or `Staff ID` / `staffId` / `employeeId`) — **required**, must match `User.employeeId`
- `balance` (or `Balance`) — optional
- `june_balance` (or `June Balance`) — optional
- `phoneNumber` (or `Phone Number`) — optional

### June Balance Import
- `account_id` (or `accountId` / `Account ID`) — **required**
- `june_balance` (or `juneBalance` / `June Balance`) — optional
- `accountNumber` (or `account_number` / `Account Number`) — optional
- `branch_code` (or `branchCode` / `Branch Code`) — optional

## Known Issues

**Plan Upload missing middleware:** The route `/api/plans/upload` in `planRoutes.js` is missing `upload.single('planFile')`. Until fixed, the endpoint always returns "Please upload a plan file". Add:
```js
router.post('/upload', protect, isAdmin, upload.single('planFile'), uploadPlan);
```
