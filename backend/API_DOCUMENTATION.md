# SAKO PMS Backend API Documentation

## Overview

Complete REST API for SAKO Performance Management System with role-based access control.

## Base URL
```
http://localhost:5000/api
```

## Authentication

Most endpoints require JWT authentication. Include token in request header:
```
Authorization: Bearer <your-jwt-token>
```

---

## Endpoints

### Authentication (`/api/auth`)

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt-token-here",
  "data": {
    "_id": "...",
    "employeeId": "EMP001",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "Staff / MSO",
    "branchId": "..."
  }
}
```

#### Register (HQ Admin only)
```http
POST /api/auth/register
Authorization: Bearer <token>
Content-Type: application/json

{
  "employeeId": "EMP002",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "password123",
  "role": "Staff / MSO",
  "branchId": "...",
  "position": "MSO I"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

#### Update Details
```http
PUT /api/auth/updatedetails
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "email": "newemail@example.com"
}
```

#### Update Password
```http
PUT /api/auth/updatepassword
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "oldpass",
  "newPassword": "newpass123"
}
```

---

### Users (`/api/users`)

#### Get All Users (HQ Admin)
```http
GET /api/users?role=Staff / MSO&branchId=...&isActive=true
Authorization: Bearer <token>
```

#### Get User
```http
GET /api/users/:id
Authorization: Bearer <token>
```

#### Create User (HQ Admin)
```http
POST /api/users
Authorization: Bearer <token>
Content-Type: application/json

{
  "employeeId": "EMP003",
  "name": "New User",
  "email": "new@example.com",
  "password": "password123",
  "role": "Branch Manager",
  "branchId": "..."
}
```

#### Update User (HQ Admin)
```http
PUT /api/users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "role": "Area Manager"
}
```

#### Delete User (HQ Admin - Soft Delete)
```http
DELETE /api/users/:id
Authorization: Bearer <token>
```

#### Reset Password (HQ Admin)
```http
PUT /api/users/:id/reset-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "newPassword": "newpassword123"
}
```

---

### Plans (`/api/plans`)

#### Upload Plan (HQ Admin)
```http
POST /api/plans/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

planFile: <file>
planPeriod: "Annual"
year: 2024
quarter: 1 (optional)
month: 1 (optional)
```

#### Get Plans
```http
GET /api/plans?level=Branch&year=2024&branchId=...
Authorization: Bearer <token>
```

#### Get Plan
```http
GET /api/plans/:id
Authorization: Bearer <token>
```

#### Update Plan (HQ Admin)
```http
PUT /api/plans/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "kpiTargets": {
    "deposit": { "target": 1000000, "unit": "Birr" }
  }
}
```

---

### Tasks (`/api/tasks`)

#### Create Task (Staff)
```http
POST /api/tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "taskType": "Deposit Mobilization",
  "productType": "Savings",
  "accountNumber": "ACC123456",
  "amount": 50000,
  "remarks": "New customer deposit",
  "taskDate": "2024-12-05"
}
```

#### Get Tasks
```http
GET /api/tasks?status=Mapped to You&approvalStatus=Pending&taskDate=2024-12-05
Authorization: Bearer <token>
```

#### Get Task
```http
GET /api/tasks/:id
Authorization: Bearer <token>
```

#### Approve/Reject Task
```http
PUT /api/tasks/:id/approve
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "Approved",
  "comments": "Task approved"
}
```

---

### Mappings (`/api/mappings`)

#### Get Mappings
```http
GET /api/mappings?branchId=...&mappedTo=...&status=Active
Authorization: Bearer <token>
```

#### Create Mapping (Manager+)
```http
POST /api/mappings
Authorization: Bearer <token>
Content-Type: application/json

{
  "accountNumber": "ACC789012",
  "customerName": "Customer Name",
  "accountType": "Savings",
  "balance": 125000,
  "mappedTo": "<user-id>",
  "branchId": "<branch-id>"
}
```

#### Update Mapping (Manager+)
```http
PUT /api/mappings/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "mappedTo": "<new-user-id>"
}
```

#### Auto-Balance Mapping (Manager+)
```http
POST /api/mappings/auto-balance
Authorization: Bearer <token>
Content-Type: application/json

{
  "branchId": "<branch-id>"
}
```

---

### Performance (`/api/performance`)

#### Calculate Performance
```http
POST /api/performance/calculate
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "<user-id>",
  "period": "Monthly",
  "year": 2024,
  "month": 12
}
```

#### Get Performance Scores
```http
GET /api/performance?userId=...&branchId=...&period=Monthly&year=2024&month=12
Authorization: Bearer <token>
```

#### Get Performance Score
```http
GET /api/performance/:id
Authorization: Bearer <token>
```

---

### Behavioral Evaluation (`/api/behavioral`)

#### Create Evaluation
```http
POST /api/behavioral
Authorization: Bearer <token>
Content-Type: application/json

{
  "evaluatedUserId": "<user-id>",
  "period": "Monthly",
  "year": 2024,
  "month": 12,
  "competencies": {
    "communication": { "score": 4, "weight": 15, "comments": "Good" },
    "teamwork": { "score": 5, "weight": 12 }
  },
  "overallComments": "Excellent performance"
}
```

#### Get Evaluations
```http
GET /api/behavioral?evaluatedUserId=...&branchId=...&period=Monthly
Authorization: Bearer <token>
```

#### Approve Evaluation
```http
PUT /api/behavioral/:id/approve
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "Approved",
  "comments": "Approved"
}
```

---

### CBS Validation (`/api/cbs`)

#### Upload CBS File (Manager+)
```http
POST /api/cbs/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

cbsFile: <file>
branchId: "<branch-id>"
validationDate: "2024-12-05"
```

#### Get Validations
```http
GET /api/cbs?branchId=...&status=Completed&validationDate=2024-12-05
Authorization: Bearer <token>
```

#### Resolve Discrepancy
```http
PUT /api/cbs/:id/resolve/:discrepancyId
Authorization: Bearer <token>
Content-Type: application/json

{
  "resolutionNotes": "Resolved discrepancy"
}
```

---

### Dashboards (`/api/dashboard`)

#### HQ Dashboard (HQ Admin)
```http
GET /api/dashboard/hq
Authorization: Bearer <token>
```

#### Area Dashboard (Area Manager)
```http
GET /api/dashboard/area
Authorization: Bearer <token>
```

#### Branch Dashboard (Branch Manager)
```http
GET /api/dashboard/branch
Authorization: Bearer <token>
```

#### Staff Dashboard (Staff)
```http
GET /api/dashboard/staff
Authorization: Bearer <token>
```

---

## Error Responses

All errors follow this format:
```json
{
  "success": false,
  "message": "Error message here"
}
```

Common status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Server Error

---

## Role-Based Access

| Role | Can Access |
|------|-----------|
| SAKO HQ / Admin | All endpoints |
| Regional Director | View dashboards, reports |
| Area Manager | Area dashboard, approve BM tasks/evaluations |
| Branch Manager | Branch dashboard, manage mappings, approve tasks |
| Line Manager | Sub-team dashboard, approve sub-team tasks |
| Sub-Team Leader | Approve MSO tasks |
| Staff / MSO | Personal dashboard, create tasks, view own data |

