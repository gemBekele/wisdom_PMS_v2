# SAKO PMS Backend

Node.js + Express + MongoDB backend for SAKO Performance Management System.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

3. Update `.env` with your MongoDB connection string and JWT secret.

4. Start MongoDB (if running locally):
```bash
mongod
```

5. Run the server:
```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register (HQ Admin only)
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/updatedetails` - Update user details
- `PUT /api/auth/updatepassword` - Update password

### Users
- `GET /api/users` - Get all users (HQ Admin)
- `GET /api/users/:id` - Get user
- `POST /api/users` - Create user (HQ Admin)
- `PUT /api/users/:id` - Update user (HQ Admin)
- `DELETE /api/users/:id` - Delete user (HQ Admin)

### Plans
- `POST /api/plans/upload` - Upload and cascade plan (HQ Admin)
- `GET /api/plans` - Get all plans
- `GET /api/plans/:id` - Get plan
- `PUT /api/plans/:id` - Update plan (HQ Admin)

### Tasks
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create task (Staff)
- `GET /api/tasks/:id` - Get task
- `PUT /api/tasks/:id/approve` - Approve/Reject task

### Mappings
- `GET /api/mappings` - Get all mappings
- `POST /api/mappings` - Create mapping (Manager+)
- `PUT /api/mappings/:id` - Update mapping (Manager+)
- `POST /api/mappings/auto-balance` - Auto-balance mappings (Manager+)

### Performance
- `POST /api/performance/calculate` - Calculate performance score
- `GET /api/performance` - Get performance scores
- `GET /api/performance/:id` - Get performance score

### Behavioral Evaluation
- `GET /api/behavioral` - Get evaluations
- `POST /api/behavioral` - Create evaluation
- `PUT /api/behavioral/:id/approve` - Approve evaluation

### CBS Validation
- `POST /api/cbs/upload` - Upload CBS file (Manager+)
- `GET /api/cbs` - Get validations
- `PUT /api/cbs/:id/resolve/:discrepancyId` - Resolve discrepancy

### Dashboards
- `GET /api/dashboard/hq` - HQ Dashboard (HQ Admin)
- `GET /api/dashboard/area` - Area Dashboard (Area Manager)
- `GET /api/dashboard/branch` - Branch Dashboard (Branch Manager)
- `GET /api/dashboard/staff` - Staff Dashboard (Staff)

## Models

- User
- Region
- Area
- Branch
- Plan
- AccountMapping
- DailyTask
- PerformanceScore
- BehavioralEvaluation
- CBSValidation
- AuditLog

## Authentication

All routes except `/api/auth/login` require JWT authentication. Include token in header:
```
Authorization: Bearer <token>
```

## Role-Based Access Control

Routes are protected by role-based middleware. See `src/middleware/rbac.js` for role definitions.

