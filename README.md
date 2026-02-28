# Expense Tracker App

Full-stack expense tracker built with Expo + React Native + Node.js + MongoDB.

## Quick Navigation

- [Highlights](#highlights)
- [Feature Status](#feature-status)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Environment](#environment)
- [Run Commands](#run-commands)
- [User Flow](#user-flow)
- [API Notes](#api-notes)
- [Roadmap](#roadmap)

## Highlights

- Secure JWT-based authentication
- User-isolated expense data
- Expense CRUD with monthly filtering
- Budget setup with near-limit and over-limit alerts
- Recurring expenses with monthly auto-apply
- Persistent login session using expo-secure-store

## Feature Status

| Module              | Status  | Notes                   |
| ------------------- | ------- | ----------------------- |
| Auth (Signup/Login) | ✅ Done | JWT + bcrypt            |
| Expense CRUD        | ✅ Done | Add, edit, delete, list |
| Monthly Filter      | ✅ Done | Month-based view        |
| Category Analytics  | ✅ Done | Pie chart               |
| Budgets             | ✅ Done | Per month + category    |
| Budget Alerts       | ✅ Done | Near and over limit     |
| Recurring Expenses  | ✅ Done | Auto-applies monthly    |
| Session Persistence | ✅ Done | Secure local storage    |

## Architecture

| Layer      | Technology                        | Location                   |
| ---------- | --------------------------------- | -------------------------- |
| Mobile App | Expo + React Native + Expo Router | app/                       |
| API Server | Node.js + Express                 | backend/src                |
| Database   | MongoDB + Mongoose                | backend/src/models         |
| Auth       | JWT + bcrypt                      | backend/src/routes/auth.js |

<details>
<summary><strong>Collections in MongoDB</strong></summary>

- users
- expenses
- budgets
- recurringexpenses

</details>

## Quick Start

### 1) Setup backend

```bash
cd backend
npm install
copy .env.example .env
```

### 2) Setup mobile app

```bash
cd ..
npm install
```

## Environment

Set values in backend/.env:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_secret
```

## Run Commands

Open two terminals.

### Terminal A (Backend)

```bash
cd backend
npm run dev
```

### Terminal B (App)

```bash
npm start
```

## User Flow

1. Register or login
2. Add/edit/delete expenses
3. Filter expenses by month
4. Set category budgets and track alerts
5. Configure recurring expenses and auto-apply monthly entries

## API Notes

### Base URL by platform

- Android emulator: http://10.0.2.2:5000
- iOS simulator/web: http://localhost:5000
- Real device: http://<your-lan-ip>:5000

### API reference

See backend API endpoints in [backend/README.md](backend/README.md).

## Roadmap

- Receipt OCR scanning for auto-fill
- Smart insights and anomaly detection
- Savings goals dashboard
- Export to CSV/PDF
- Shared wallets and collaborative tracking
