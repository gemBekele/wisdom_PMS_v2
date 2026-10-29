# SAKO Performance Management System (PMS)

A comprehensive Performance Management System frontend for SAKO Microfinance built with React, TypeScript, Tailwind CSS, and shadcn/ui.

## Features

- **Role-based Dashboards**: Different views for HQ Admin, Area Manager, Branch Manager, and Staff
- **KPI Tracking**: Visual dashboards with charts and progress indicators
- **Task Management**: Daily task entry and approval workflows
- **Account Mapping**: Manage account assignments and mappings
- **Performance Reports**: Monthly scorecards and analytics
- **Responsive Design**: Mobile-friendly with collapsible sidebar

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS
- shadcn/ui components
- Recharts for data visualization
- React Router for navigation

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── layout/       # Sidebar, TopNav, MainLayout
│   └── ui/           # shadcn/ui components
├── contexts/         # User context for role management
├── lib/              # Utilities and mock data
├── pages/            # All page components
└── App.tsx           # Main app with routing
```

## User Roles

The system supports multiple user roles:
- SAKO HQ / Admin
- Regional Director
- Area Manager
- Branch Manager
- Line Manager
- Sub-Team Leader
- Staff / MSO

Switch roles in Settings to test different dashboard views.

## Mock Data

All data is currently mocked. No API integration is implemented yet.

## Color Theme

- Background: White (#ffffff)
- Sidebar: Light slate-50 (#f8fafc)
- Primary: Blue-500 (#3b82f6)
- Success: Emerald-500 (#10b981)
- Warning: Amber-500 (#f59e0b)
- Error: Red-500 (#ef4444)
