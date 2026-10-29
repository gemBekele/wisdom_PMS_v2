# SAKO PMS - Technical Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Database Models](#database-models)
5. [API Structure](#api-structure)
6. [Frontend Structure](#frontend-structure)
7. [Authentication & Authorization](#authentication--authorization)
8. [Core Workflows](#core-workflows)
9. [Key Features](#key-features)
10. [File Structure](#file-structure)
11. [Configuration](#configuration)
12. [Development Workflow](#development-workflow)

---

## System Overview

**SAKO Performance Management System (PMS)** is a comprehensive microfinance performance tracking and management platform. It enables hierarchical performance tracking from HQ level down to individual staff members, with automated plan cascading, task management, performance scoring, and CBS (Core Banking System) validation.

### Key Capabilities
- **Hierarchical Plan Management**: Cascade plans from HQ → Region → Area → Branch → Staff
- **Daily Task Entry**: Staff enter daily tasks (deposits, loans, digital activations, etc.)
- **Account Mapping**: Map customer accounts to staff members for performance tracking
- **Performance Calculation**: Automated KPI scoring (85%) + Behavioral evaluation (15%)
- **CBS Validation**: Validate entered tasks against Core Banking System data
- **Role-Based Access Control**: 7 different user roles with specific permissions
- **Approval Workflows**: Multi-level approval chains for tasks and evaluations

---

## Architecture

### System Architecture Pattern
**3-Tier Architecture:**
1. **Presentation Layer**: React + TypeScript frontend (Vite)
2. **Application Layer**: Node.js + Express REST API
3. **Data Layer**: MongoDB database

### Communication Flow
```
Frontend (React) → API Requests → Backend (Express) → MongoDB
                ← JSON Responses ←
```

### Server Architecture
- **Backend Server**: Express.js on port 5000
- **Frontend Server**: Vite dev server on port 5173
- **Database**: MongoDB (MongoDB Atlas cloud or local)

---

## Technology Stack

### Backend
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js 4.18.2
- **Database**: MongoDB with Mongoose 8.0.3
- **Authentication**: JWT (jsonwebtoken 9.0.2)
- **Password Hashing**: bcryptjs 2.4.3
- **File Upload**: Multer 1.4.5
- **File Processing**: xlsx 0.18.5, csv-parser 3.0.0
- **Validation**: express-validator 7.0.1
- **CORS**: cors 2.8.5
- **Environment**: dotenv 16.3.1

### Frontend
- **Framework**: React 19.2.0
- **Language**: TypeScript 5.9.3
- **Build Tool**: Vite 7.2.4
- **Routing**: React Router DOM 7.10.1
- **Styling**: Tailwind CSS 3.4.18
- **UI Components**: Radix UI primitives
- **Charts**: Recharts 3.5.1
- **Icons**: Lucide React 0.555.0

### Development Tools
- **Backend Dev**: Nodemon 3.0.2
- **Testing**: Jest 30.2.0 (backend), Vitest 3.2.4 (frontend)
- **Linting**: ESLint 9.39.1

---

## Database Models

### 1. User Model (`backend/src/models/User.js`)
**Purpose**: Stores all system users with role-based access

**Schema Fields**:
- `employeeId` (String, unique, required): Employee identifier
- `name` (String, required): Full name
- `email` (String, unique, required): Email address
- `password` (String, required, min 6): Hashed password
- `role` (Enum, required): One of 7 roles:
  - `SAKO HQ / Admin`
  - `Regional Director`
  - `Area Manager`
  - `Branch Manager`
  - `Line Manager`
  - `Sub-Team Leader`
  - `Staff / MSO`
- `branchId` (ObjectId, ref: Branch): Required for non-HQ users
- `regionId` (ObjectId, ref: Region): Optional
- `areaId` (ObjectId, ref: Area): Optional
- `position` (String): Job position
- `isActive` (Boolean, default: true): Account status
- `resetPasswordToken` (String): For password reset
- `resetPasswordExpire` (Date): Token expiration

**Methods**:
- `matchPassword(enteredPassword)`: Compare password with hash
- Pre-save hook: Auto-hashes password before saving

---

### 2. Plan Model (`backend/src/models/Plan.js`)
**Purpose**: Stores KPI targets at all hierarchy levels

**Schema Fields**:
- `planPeriod` (Enum): `Annual`, `Quarterly`, `Monthly`
- `year` (Number, required): Plan year
- `quarter` (Number, 1-4): For quarterly plans
- `month` (Number, 1-12): For monthly plans
- `level` (Enum, required): `HQ`, `Region`, `Area`, `Branch`, `Staff`
- `regionId`, `areaId`, `branchId`, `userId` (ObjectId): Target entity
- `kpiTargets` (Object): Contains 5 KPIs:
  - `deposit`: { target, unit }
  - `digital`: { target, unit }
  - `loan`: { target, unit }
  - `customerBase`: { target, unit }
  - `memberRegistration`: { target, unit }
- `planSharePercent` (Number, 0-100, default: 100): Percentage allocated
- `status` (Enum): `Draft`, `Active`, `Completed`, `Cancelled`
- `uploadedBy` (ObjectId, ref: User): Creator
- `uploadedAt` (Date): Creation timestamp

**Indexes**: `{ year, level, branchId, userId }`

---

### 3. DailyTask Model (`backend/src/models/DailyTask.js`)
**Purpose**: Stores daily task entries from staff

**Schema Fields**:
- `taskType` (Enum, required): 
  - `Deposit Mobilization`
  - `Loan Recovery`
  - `New Customer`
  - `Digital Activation`
  - `Member Registration`
  - `Other`
- `productType` (String): Product category
- `accountNumber` (String, required): Customer account number
- `accountId` (ObjectId, ref: AccountMapping): Linked mapping
- `amount` (Number, default: 0): Transaction amount
- `remarks` (String): Notes
- `evidence` (String): File path/URL for evidence
- `submittedBy` (ObjectId, ref: User, required): Task creator
- `branchId` (ObjectId, ref: Branch, required): Branch location
- `mappingStatus` (Enum, required): 
  - `Mapped to You`
  - `Mapped to Another Staff`
  - `Unmapped`
- `approvalStatus` (Enum, default: `Pending`): 
  - `Pending`, `Approved`, `Rejected`, `Requested Edit`
- `approvalChain` (Array): Multi-level approval tracking
  - `approverId`, `role`, `status`, `approvedAt`, `comments`
- `cbsValidated` (Boolean, default: false): CBS validation status
- `cbsValidatedAt` (Date): Validation timestamp
- `cbsValidationId` (ObjectId, ref: CBSValidation): Linked validation
- `taskDate` (Date, required): Task date
- `performanceImpacted` (Boolean, default: false): If used in scoring
- `performanceImpactedAt` (Date): When scored

**Indexes**: 
- `{ submittedBy, taskDate }`
- `{ branchId, taskDate }`
- `{ approvalStatus, branchId }`
- `{ cbsValidated, taskDate }`

---

### 4. AccountMapping Model (`backend/src/models/AccountMapping.js`)
**Purpose**: Maps customer accounts to staff members

**Schema Fields**:
- `accountNumber` (String, unique, required): Account identifier
- `customerName` (String, required): Customer name
- `accountType` (Enum, required): 
  - `Savings`, `Current`, `Fixed Deposit`, `Recurring Deposit`, `Loan`
- `balance` (Number, default: 0): Account balance
- `mappedTo` (ObjectId, ref: User, required): Assigned staff
- `branchId` (ObjectId, ref: Branch, required): Branch
- `mappedAt` (Date, default: now): Mapping date
- `mappedBy` (ObjectId, ref: User): Who created mapping
- `isAutoBalanced` (Boolean, default: false): Auto-assignment flag
- `status` (Enum, default: `Active`): `Active`, `Inactive`, `Transferred`
- `notes` (String): Additional notes

**Indexes**: 
- `{ mappedTo, branchId, status }`
- `{ accountNumber }`

---

### 5. PerformanceScore Model (`backend/src/models/PerformanceScore.js`)
**Purpose**: Stores calculated performance scores

**Schema Fields**:
- `userId` (ObjectId, ref: User, required): Evaluated user
- `branchId` (ObjectId, ref: Branch, required): Branch
- `period` (Enum, required): `Daily`, `Weekly`, `Monthly`, `Quarterly`, `Annual`
- `year` (Number, required): Period year
- `quarter`, `month`, `week`, `day` (Number): Period details
- `kpiScores` (Object): Individual KPI scores (85% weight)
  - Each KPI: `{ target, actual, percent, weight, score }`
  - KPIs: `deposit` (25%), `digital` (20%), `loan` (20%), `customerBase` (15%), `memberRegistration` (10%)
- `kpiTotalScore` (Number): Total KPI score (85% weight)
- `behavioralScore` (Number): Behavioral score (15% weight)
- `behavioralEvaluationId` (ObjectId, ref: BehavioralEvaluation): Linked evaluation
- `finalScore` (Number): Total score (KPI + Behavioral)
- `rating` (Enum): 
  - `Outstanding` (≥90), `Very Good` (≥80), `Good` (≥70), `Needs Support` (≥60), `Unsatisfactory` (<60)
- `status` (Enum, default: `Draft`): `Draft`, `Calculated`, `Locked`, `Finalized`
- `isLocked` (Boolean, default: false): Locked after CBS validation
- `lockedAt` (Date): Lock timestamp

**Indexes**: 
- `{ userId, period, year, month }`
- `{ branchId, period, year }`

---

### 6. BehavioralEvaluation Model (`backend/src/models/BehavioralEvaluation.js`)
**Purpose**: Stores behavioral competency evaluations

**Schema Fields**:
- `evaluatedUserId` (ObjectId, ref: User, required): Evaluated staff
- `evaluatedBy` (ObjectId, ref: User, required): Evaluator
- `branchId` (ObjectId, ref: Branch, required): Branch
- `period` (Enum, required): `Monthly`, `Quarterly`, `Annual`
- `year`, `quarter`, `month` (Number): Period details
- `competencies` (Object): 8 competency scores (1-5 scale)
  - `communication` (weight: 15%)
  - `teamwork` (weight: 12%)
  - `problemSolving` (weight: 15%)
  - `adaptability` (weight: 10%)
  - `leadership` (weight: 15%)
  - `customerFocus` (weight: 18%)
  - `initiative` (weight: 10%)
  - `reliability` (weight: 5%)
  - Each: `{ score, weight, comments }`
- `totalScore` (Number): Total behavioral score (out of 15%)
- `overallComments` (String): General feedback
- `approvalStatus` (Enum, default: `Draft`): `Draft`, `Pending`, `Approved`, `Rejected`
- `approvalChain` (Array): Approval workflow tracking
- `isLocked` (Boolean, default: false): Lock status
- `lockedAt` (Date): Lock timestamp

**Indexes**: 
- `{ evaluatedUserId, period, year, month }`
- `{ branchId, approvalStatus }`

---

### 7. CBSValidation Model (`backend/src/models/CBSValidation.js`)
**Purpose**: Stores CBS file validation results

**Schema Fields**:
- `branchId` (ObjectId, ref: Branch, required): Branch
- `validationDate` (Date, required): Validation date
- `fileName` (String, required): Uploaded file name
- `filePath` (String, required): Server file path
- `uploadedBy` (ObjectId, ref: User, required): Uploader
- `totalRecords` (Number, default: 0): Total records in file
- `matchedRecords` (Number, default: 0): Matched with PMS tasks
- `unmatchedRecords` (Number, default: 0): Not found in PMS
- `discrepancyCount` (Number, default: 0): Amount mismatches
- `status` (Enum, default: `Processing`): `Processing`, `Completed`, `Failed`, `Partial`
- `discrepancies` (Array): List of discrepancies
  - `accountNumber`, `taskId`, `cbsAmount`, `pmsAmount`, `difference`, `type`, `resolved`, `resolvedBy`, `resolvedAt`, `resolutionNotes`
- `validatedAt` (Date): Completion timestamp
- `validationRate` (Number, default: 0): Match percentage

**Indexes**: 
- `{ branchId, validationDate }`
- `{ status }`

---

### 8. Hierarchy Models
- **Region Model**: Regional divisions
- **Area Model**: Areas within regions
- **Branch Model**: Branches within areas
- **AuditLog Model**: System audit trail

---

## API Structure

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints (`/api/auth`)
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Register new user (HQ Admin only)
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/updatedetails` - Update user details
- `PUT /api/auth/updatepassword` - Change password

**Authentication**: JWT Bearer token in `Authorization` header

---

### User Management (`/api/users`)
- `GET /api/users` - Get all users (HQ Admin)
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create user (HQ Admin)
- `PUT /api/users/:id` - Update user (HQ Admin)
- `DELETE /api/users/:id` - Delete user (HQ Admin)
- `PUT /api/users/:id/reset-password` - Reset password (HQ Admin)

**Access**: HQ Admin only

---

### Plans (`/api/plans`)
- `POST /api/plans/upload` - Upload and cascade plan (HQ Admin)
- `GET /api/plans` - Get all plans (filtered by role)
- `GET /api/plans/:id` - Get plan by ID
- `PUT /api/plans/:id` - Update plan (HQ Admin)

**Plan Cascade Flow**:
1. HQ uploads plan Excel file
2. System parses file and creates HQ plan
3. Auto-cascades to Regions (100% each)
4. Auto-cascades to Areas (100% each)
5. Auto-cascades to Branches (100% each)
6. Auto-cascades to Staff (50% default per staff)

---

### Tasks (`/api/tasks`)
- `GET /api/tasks` - Get all tasks (role-filtered)
- `POST /api/tasks` - Create task (Staff)
- `GET /api/tasks/:id` - Get task by ID
- `PUT /api/tasks/:id/approve` - Approve/Reject task (Managers)

**Task Workflow**:
1. Staff creates task entry
2. System checks account mapping status
3. Task enters approval chain based on user role
4. Managers approve/reject with comments
5. Approved tasks can be CBS validated
6. Validated tasks impact performance scores

---

### Account Mappings (`/api/mappings`)
- `GET /api/mappings` - Get all mappings (role-filtered)
- `POST /api/mappings` - Create mapping (Manager+)
- `PUT /api/mappings/:id` - Update mapping (Manager+)
- `POST /api/mappings/auto-balance` - Auto-balance mappings (Manager+)

**Auto-Balance**: Distributes unmapped accounts evenly among staff

---

### Performance (`/api/performance`)
- `POST /api/performance/calculate` - Calculate performance score
- `GET /api/performance` - Get performance scores (role-filtered)
- `GET /api/performance/:id` - Get score by ID

**Calculation Logic**:
1. Get user's plan for period
2. Get all approved + CBS-validated tasks
3. Calculate actuals by KPI type
4. Calculate KPI scores (85% weight)
5. Get behavioral evaluation (15% weight)
6. Calculate final score and rating

---

### Behavioral Evaluation (`/api/behavioral`)
- `GET /api/behavioral` - Get evaluations (role-filtered)
- `POST /api/behavioral` - Create evaluation (Manager+)
- `PUT /api/behavioral/:id/approve` - Approve evaluation (Manager+)

**Evaluation Process**:
1. Manager evaluates staff on 8 competencies (1-5 scale)
2. System calculates weighted behavioral score
3. Enters approval chain
4. Approved evaluations contribute 15% to final performance score

---

### CBS Validation (`/api/cbs`)
- `POST /api/cbs/upload` - Upload CBS file (Manager+)
- `GET /api/cbs` - Get validations (role-filtered)
- `PUT /api/cbs/:id/resolve/:discrepancyId` - Resolve discrepancy (Manager+)

**Validation Process**:
1. Manager uploads CBS Excel file
2. System parses file and matches with PMS tasks
3. Identifies discrepancies (amount mismatches, missing records)
4. Manager resolves discrepancies with notes
5. Validated tasks are locked for performance calculation

---

### Dashboards (`/api/dashboard`)
- `GET /api/dashboard/hq` - HQ dashboard data
- `GET /api/dashboard/area` - Area manager dashboard
- `GET /api/dashboard/branch` - Branch manager dashboard
- `GET /api/dashboard/staff` - Staff dashboard

**Dashboard Data**: Aggregated KPIs, performance trends, task statistics

---

## Frontend Structure

### Entry Point
- `frontend/src/main.tsx` - React app entry
- `frontend/src/App.tsx` - Main router and layout wrapper

### Routing (`frontend/src/App.tsx`)
**Protected Routes**: All routes except `/login` require authentication

**Route Structure**:
- `/login` - Login page
- `/dashboard` - Role-based dashboard redirect
- `/dashboard/hq` - HQ Dashboard
- `/dashboard/area` - Area Manager Dashboard
- `/dashboard/branch` - Branch Manager Dashboard
- `/dashboard/staff` - Staff Dashboard
- `/tasks` - Task list
- `/tasks/new` - Create new task
- `/mapping` - Account mapping management
- `/kpi` - KPI dashboard
- `/reports` - Reports
- `/reports/scorecard` - Monthly scorecard
- `/settings` - User settings
- `/user-management` - User management (HQ)
- `/plan-cascade` - Plan cascade management (HQ)
- `/cbs-validation` - CBS validation (Manager+)
- `/audit-trail` - Audit logs (HQ)
- `/kpi-framework` - KPI framework config (HQ)
- `/competency-framework` - Competency framework (HQ)
- `/hierarchy` - Hierarchy management (HQ)
- `/area-performance` - Area performance view
- `/branch-monitoring` - Branch monitoring
- `/team-performance` - Team performance
- `/behavioral-evaluation` - Behavioral evaluations
- `/team-tasks` - Team task view
- `/behavioral-input` - Behavioral input form

### Context Management
**UserContext** (`frontend/src/contexts/UserContext.tsx`):
- Manages user authentication state
- Stores: `role`, `user`, `isAuthenticated`, `currentBranch`
- Methods: `loadUser()`, `logout()`
- Auto-loads user on app start

### API Layer (`frontend/src/lib/api.ts`)
**Centralized API Client**:
- Base URL: `http://localhost:5000/api` (configurable via `VITE_API_URL`)
- Token management: `getToken()`, `setToken()`, `removeToken()`
- Generic `apiRequest()` function with auth headers
- API modules:
  - `authAPI`: Authentication
  - `usersAPI`: User management
  - `plansAPI`: Plan management
  - `tasksAPI`: Task management
  - `mappingsAPI`: Account mapping
  - `performanceAPI`: Performance scores
  - `behavioralAPI`: Behavioral evaluations
  - `cbsAPI`: CBS validation
  - `dashboardAPI`: Dashboard data

### Components Structure
**Layout Components** (`frontend/src/components/layout/`):
- `MainLayout.tsx`: Main app layout with sidebar and top nav
- `Sidebar.tsx`: Navigation sidebar (role-based menu)
- `TopNav.tsx`: Top navigation bar with user info

**UI Components** (`frontend/src/components/ui/`):
- Reusable Radix UI components: `button`, `card`, `table`, `input`, `select`, `badge`, `progress`, `avatar`, `dropdown-menu`, `tabs`, `textarea`, `label`, `switch`

**Pages** (`frontend/src/pages/`):
- Dashboard pages (role-specific)
- Task management pages
- Mapping pages
- Performance pages
- HQ admin pages (`hq/` subfolder)
- Reports and analytics pages

### Styling
- **Tailwind CSS**: Utility-first CSS framework
- **Custom CSS**: `frontend/src/index.css` for global styles
- **Component Styles**: Inline Tailwind classes

---

## Authentication & Authorization

### Authentication Flow
1. User submits login form (`/login`)
2. Frontend calls `POST /api/auth/login` with email/password
3. Backend validates credentials, returns JWT token
4. Frontend stores token in `localStorage`
5. All subsequent requests include token in `Authorization: Bearer <token>` header
6. Backend middleware (`protect`) validates token on each request

### JWT Token
- **Secret**: Stored in `backend/.env` as `JWT_SECRET`
- **Expiration**: 7 days (configurable via `JWT_EXPIRE`)
- **Payload**: `{ userId: user._id }`

### Authorization (RBAC)
**Role Hierarchy** (highest to lowest):
1. `SAKO HQ / Admin` - Full system access
2. `Regional Director` - Regional oversight
3. `Area Manager` - Area management
4. `Branch Manager` - Branch management
5. `Line Manager` - Team management
6. `Sub-Team Leader` - Sub-team oversight
7. `Staff / MSO` - Task entry only

**Middleware Functions** (`backend/src/middleware/rbac.js`):
- `authorize(...roles)`: Generic role checker
- `isHQAdmin`: HQ only
- `isManagerOrAbove`: Manager roles and above
- `canApprove`: Roles that can approve tasks/evaluations

**Route Protection**:
- All routes use `protect` middleware (authentication)
- Specific routes use role middleware (authorization)
- Example: `router.put('/:id/approve', protect, canApprove, approveTask)`

---

## Core Workflows

### 1. Plan Cascade Workflow
**Purpose**: Distribute HQ plans down the hierarchy

**Steps**:
1. HQ Admin uploads plan Excel file via `/plan-cascade/upload`
2. Backend parses Excel and creates HQ plan
3. System auto-cascades to all Regions (100% each)
4. System auto-cascades Regions to Areas (100% each)
5. System auto-cascades Areas to Branches (100% each)
6. System auto-cascades Branches to Staff (50% default per staff)
7. Managers can adjust plan share percentages
8. Plans become `Active` and used for performance calculation

**Files**:
- `backend/src/utils/planCascade.js`: Cascade logic
- `backend/src/controllers/planController.js`: Upload handler

---

### 2. Task Entry & Approval Workflow
**Purpose**: Staff enter daily tasks, managers approve

**Steps**:
1. Staff creates task entry (`POST /api/tasks`)
   - Selects task type, enters account number, amount, remarks
   - System checks account mapping status
2. Task enters approval chain based on staff role
   - Staff → Line Manager → Branch Manager
   - Or: Staff → Sub-Team Leader → Line Manager → Branch Manager
3. Manager reviews task (`GET /api/tasks/:id`)
4. Manager approves/rejects (`PUT /api/tasks/:id/approve`)
   - Can add comments
   - Can request edit
5. Approved tasks are available for CBS validation
6. CBS-validated tasks impact performance scores

**Files**:
- `backend/src/controllers/taskController.js`: Task CRUD
- `backend/src/models/DailyTask.js`: Task model with approval chain

---

### 3. Performance Calculation Workflow
**Purpose**: Calculate staff performance scores

**Steps**:
1. Manager triggers calculation (`POST /api/performance/calculate`)
2. System gets user's plan for period
3. System gets all approved + CBS-validated tasks for period
4. System calculates actuals by KPI type:
   - Deposit: Sum of deposit task amounts
   - Digital: Count of digital activation tasks
   - Loan: Sum of loan recovery amounts
   - Customer Base: Count of new customer tasks
   - Member Registration: Count of registration tasks
5. System calculates KPI scores (85% weight):
   - Each KPI: `(actual / target) * 100 * weight`
   - Total KPI: Sum of all KPI scores * 0.85
6. System gets behavioral evaluation (15% weight)
7. System calculates final score: `KPI Total + Behavioral`
8. System assigns rating based on final score
9. System saves/updates PerformanceScore record

**Files**:
- `backend/src/utils/performanceCalculator.js`: Calculation logic
- `backend/src/controllers/performanceController.js`: API handler

---

### 4. CBS Validation Workflow
**Purpose**: Validate PMS tasks against Core Banking System

**Steps**:
1. Manager uploads CBS Excel file (`POST /api/cbs/upload`)
2. Backend parses Excel file
3. System matches CBS records with PMS tasks by account number
4. System identifies discrepancies:
   - Amount mismatches
   - Missing in CBS (task exists in PMS but not CBS)
   - Missing in PMS (record exists in CBS but no task)
   - Account mismatches
5. System creates CBSValidation record with discrepancies
6. Manager reviews discrepancies (`GET /api/cbs/:id`)
7. Manager resolves discrepancies (`PUT /api/cbs/:id/resolve/:discrepancyId`)
   - Adds resolution notes
8. Once all resolved, system marks tasks as `cbsValidated: true`
9. Validated tasks are locked and used in performance calculation

**Files**:
- `backend/src/controllers/cbsController.js`: Validation logic
- `backend/src/models/CBSValidation.js`: Validation model

---

### 5. Behavioral Evaluation Workflow
**Purpose**: Evaluate staff behavioral competencies

**Steps**:
1. Manager creates evaluation (`POST /api/behavioral`)
   - Selects staff member
   - Rates 8 competencies (1-5 scale)
   - Adds comments
2. System calculates weighted behavioral score
3. Evaluation enters approval chain
4. Higher manager approves/rejects
5. Approved evaluation contributes 15% to performance score
6. Evaluation is locked after approval

**Files**:
- `backend/src/controllers/behavioralController.js`: Evaluation CRUD
- `backend/src/models/BehavioralEvaluation.js`: Evaluation model

---

### 6. Account Mapping Workflow
**Purpose**: Map customer accounts to staff for performance tracking

**Steps**:
1. Manager creates mapping (`POST /api/mappings`)
   - Enters account number, customer name, account type
   - Assigns to staff member
2. System creates AccountMapping record
3. When staff enters task with account number:
   - System checks mapping
   - Sets `mappingStatus`: `Mapped to You`, `Mapped to Another Staff`, or `Unmapped`
4. Manager can auto-balance unmapped accounts (`POST /api/mappings/auto-balance`)
   - System distributes accounts evenly among staff

**Files**:
- `backend/src/controllers/mappingController.js`: Mapping CRUD
- `backend/src/models/AccountMapping.js`: Mapping model

---

## Key Features

### 1. Hierarchical Performance Tracking
- Plans cascade from HQ to individual staff
- Performance aggregated upward (Staff → Branch → Area → Region → HQ)
- Role-based dashboards show relevant hierarchy level

### 2. Automated Performance Scoring
- KPI Score (85%): Calculated from approved + CBS-validated tasks
- Behavioral Score (15%): From manager evaluations
- Final Score: Combined with automatic rating assignment

### 3. CBS Integration
- Upload CBS Excel files
- Automatic matching with PMS tasks
- Discrepancy detection and resolution
- Validation locking for data integrity

### 4. Multi-Level Approval Chains
- Tasks: Staff → Line Manager → Branch Manager
- Evaluations: Manager → Area Manager → Regional Director
- Approval chain tracked in database

### 5. Account Mapping System
- Map customer accounts to staff
- Auto-balance unmapped accounts
- Track mapping status in tasks

### 6. Audit Trail
- All system actions logged
- Track: user, action, entity, timestamp
- Viewable by HQ Admin

### 7. Role-Based Access Control
- 7 user roles with specific permissions
- Route-level and data-level filtering
- Dashboard customization by role

---

## File Structure

### Backend Structure
```
backend/
├── src/
│   ├── config/
│   │   └── database.js          # MongoDB connection
│   ├── controllers/            # Request handlers
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── planController.js
│   │   ├── taskController.js
│   │   ├── mappingController.js
│   │   ├── performanceController.js
│   │   ├── behavioralController.js
│   │   ├── cbsController.js
│   │   └── dashboardController.js
│   ├── middleware/
│   │   ├── auth.js              # JWT authentication
│   │   ├── rbac.js              # Role-based access control
│   │   ├── asyncHandler.js      # Async error handler
│   │   └── errorHandler.js      # Global error handler
│   ├── models/                  # Mongoose models
│   │   ├── User.js
│   │   ├── Plan.js
│   │   ├── DailyTask.js
│   │   ├── AccountMapping.js
│   │   ├── PerformanceScore.js
│   │   ├── BehavioralEvaluation.js
│   │   ├── CBSValidation.js
│   │   ├── Region.js
│   │   ├── Area.js
│   │   ├── Branch.js
│   │   └── AuditLog.js
│   ├── routes/                  # Express routes
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── planRoutes.js
│   │   ├── taskRoutes.js
│   │   ├── mappingRoutes.js
│   │   ├── performanceRoutes.js
│   │   ├── behavioralRoutes.js
│   │   ├── cbsRoutes.js
│   │   └── dashboardRoutes.js
│   ├── utils/                   # Utility functions
│   │   ├── auditLogger.js       # Audit logging
│   │   ├── fileUpload.js        # File upload handler
│   │   ├── generateToken.js    # JWT generation
│   │   ├── performanceCalculator.js  # Performance calculation
│   │   └── planCascade.js       # Plan cascade logic
│   ├── scripts/                 # Seed scripts
│   │   ├── seedAdmin.js
│   │   └── seedAllUsers.js
│   └── server.js                # Express app entry point
├── uploads/                     # Uploaded files
│   ├── plans/
│   ├── cbs/
│   └── evidence/
├── tests/                       # Test files
├── .env                         # Environment variables
├── package.json
└── README.md
```

### Frontend Structure
```
frontend/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── MainLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── TopNav.tsx
│   │   └── ui/                  # Reusable UI components
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── table.tsx
│   │       └── ...
│   ├── contexts/
│   │   └── UserContext.tsx      # User state management
│   ├── lib/
│   │   ├── api.ts               # API client
│   │   ├── utils.ts             # Utility functions
│   │   └── mockData.ts          # Mock data (dev)
│   ├── pages/                   # Page components
│   │   ├── Login.tsx
│   │   ├── HQDashboard.tsx
│   │   ├── AreaManagerDashboard.tsx
│   │   ├── BranchManagerDashboard.tsx
│   │   ├── StaffDashboard.tsx
│   │   ├── Tasks.tsx
│   │   ├── TaskEntryForm.tsx
│   │   ├── MappingManagement.tsx
│   │   ├── KPIDashboard.tsx
│   │   ├── MonthlyScorecard.tsx
│   │   ├── Reports.tsx
│   │   ├── Settings.tsx
│   │   ├── hq/                  # HQ admin pages
│   │   │   ├── UserManagement.tsx
│   │   │   ├── PlanCascade.tsx
│   │   │   ├── CBSValidation.tsx
│   │   │   ├── AuditTrail.tsx
│   │   │   ├── KPIFramework.tsx
│   │   │   └── CompetencyFramework.tsx
│   │   └── ...
│   ├── App.tsx                  # Main router
│   ├── main.tsx                 # Entry point
│   └── index.css                # Global styles
├── public/
├── tests/
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

---

## Configuration

### Backend Environment Variables (`backend/.env`)
```env
PORT=5000
NODE_ENV=development

MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/sako-pms?retryWrites=true&w=majority

JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRE=7d

CORS_ORIGIN=http://localhost:5173
```

### Frontend Environment Variables (`frontend/.env`)
```env
VITE_API_URL=http://localhost:5000/api
```

### Database Connection
- **MongoDB Atlas**: Cloud MongoDB (recommended for production)
- **Local MongoDB**: For development
- Connection string in `MONGODB_URI`

---

## Development Workflow

### Starting the System
1. **Install Dependencies**:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Setup Environment**:
   - Create `backend/.env` with MongoDB connection
   - Create `frontend/.env` (optional, defaults work)

3. **Start Servers**:
   ```bash
   # Backend (port 5000)
   cd backend && npm run dev
   
   # Frontend (port 5173)
   cd frontend && npm run dev
   ```

   Or use the start script:
   ```bash
   ./start.sh  # Linux/Mac
   start.bat   # Windows
   ```

### Database Seeding
```bash
# Create admin user
cd backend && npm run seed

# Create all test users
cd backend && npm run seed:all
```

### Testing
```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test
```

### Building for Production
```bash
# Frontend build
cd frontend && npm run build

# Backend (no build needed, just run)
cd backend && npm start
```

---

## Key Implementation Details

### Performance Calculation Formula
```
KPI Score = Sum of (Actual / Target * 100 * Weight) for each KPI * 0.85
Behavioral Score = Sum of (Competency Score * Weight) * 0.15
Final Score = KPI Score + Behavioral Score
Rating = Based on Final Score thresholds
```

### Plan Cascade Logic
- Plans cascade down hierarchy: HQ → Region → Area → Branch → Staff
- Each level receives 100% of parent (except Staff gets 50% default)
- Plan share percentages can be adjusted by managers
- Cascade happens automatically on plan upload

### Approval Chain Logic
- Based on user role hierarchy
- Each approval updates `approvalChain` array
- Final approval sets `approvalStatus` to `Approved`
- Rejected tasks can be edited and resubmitted

### CBS Validation Matching
- Matches by account number
- Compares amounts between CBS and PMS
- Flags discrepancies for manual resolution
- Once resolved, tasks are locked for performance calculation

---

## Common Update Scenarios

### Adding a New KPI
1. Update `Plan` model: Add new KPI to `kpiTargets`
2. Update `PerformanceScore` model: Add new KPI to `kpiScores`
3. Update `performanceCalculator.js`: Add calculation logic
4. Update frontend: Add KPI display in dashboards

### Adding a New User Role
1. Update `User` model: Add role to enum
2. Update `rbac.js`: Add role checker function
3. Update routes: Add role to authorization middleware
4. Update frontend: Add role to `UserRole` type and routing

### Modifying Performance Calculation
1. Edit `backend/src/utils/performanceCalculator.js`
2. Update KPI weights in calculation logic
3. Update rating thresholds if needed
4. Test with sample data

### Adding a New API Endpoint
1. Create controller function in `controllers/`
2. Add route in `routes/`
3. Add middleware (auth, RBAC) as needed
4. Update frontend `api.ts` with new API call
5. Create frontend page/component if needed

---

## Troubleshooting

### Backend Won't Start
- Check MongoDB connection string in `.env`
- Ensure MongoDB is running/accessible
- Check port 5000 is not in use
- Review error logs

### Frontend Can't Connect to Backend
- Check `VITE_API_URL` in frontend `.env`
- Ensure backend is running on port 5000
- Check CORS settings in backend
- Verify JWT token is being sent

### Database Connection Issues
- Verify `MONGODB_URI` is correct
- Check network connectivity
- Ensure MongoDB Atlas IP whitelist includes your IP
- Check MongoDB user permissions

### Performance Calculation Errors
- Ensure tasks are approved and CBS-validated
- Verify plan exists for user and period
- Check task dates match period
- Review calculation logs

---

## Security Considerations

1. **Password Hashing**: All passwords hashed with bcryptjs
2. **JWT Tokens**: Secure token-based authentication
3. **Role-Based Access**: Route and data-level authorization
4. **Input Validation**: express-validator for request validation
5. **File Upload Security**: Multer with file type/size limits
6. **CORS**: Configured for specific origin
7. **Environment Variables**: Sensitive data in `.env` (not committed)

---

## Future Enhancement Ideas

1. **Real-time Notifications**: WebSocket for task approvals
2. **Email Notifications**: Send alerts for approvals, deadlines
3. **Mobile App**: React Native mobile application
4. **Advanced Analytics**: More detailed reporting and charts
5. **Export Functionality**: PDF/Excel export for reports
6. **Bulk Operations**: Bulk task entry, bulk approvals
7. **Dashboard Customization**: User-customizable dashboards
8. **Integration APIs**: Connect with external systems
9. **Multi-language Support**: Internationalization
10. **Performance Benchmarking**: Compare against industry standards

---

**Last Updated**: December 2024
**Version**: 1.0.0

