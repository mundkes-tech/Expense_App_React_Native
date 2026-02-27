# Expense Tracker App (React Native + Expo + MongoDB)

A full-stack expense tracking app with authentication, monthly filtering, category analytics, budgets, alerts, and recurring expense automation.

## What we built

### Core implementation status

- ✅ User authentication (signup/login) with JWT
- ✅ Secure user data isolation (token-based protected APIs)
- ✅ Expense CRUD (create, read, update, delete)
- ✅ Category pie-chart analytics
- ✅ Month-based expense filtering
- ✅ Budget management per month/category
- ✅ Budget threshold alerts (near-limit and over-limit)
- ✅ Budget delete support
- ✅ Recurring expense setup and monthly auto-apply
- ✅ Persistent login session in app (`expo-secure-store`)

### Current scope summary

- Frontend tabs/screens: Home, Expenses, Explore
- Backend modules: Auth, Expenses, Budgets, Recurring
- Database collections currently used:
  - `users`
  - `expenses`
  - `budgets`
  - `recurringexpenses`

## Tech stack

- Frontend: Expo, React Native, Expo Router
- Backend: Node.js, Express
- Database: MongoDB (Mongoose)
- Auth: JWT + bcrypt

## Project structure

- `app/` → mobile app screens/components
- `backend/` → Express API + MongoDB models/routes

## Setup guide

### 1) Backend setup

```bash
cd backend
npm install
copy .env.example .env
```

Set values in `backend/.env`:

- `PORT=5000`
- `MONGODB_URI=<your_mongodb_connection_string>`
- `JWT_SECRET=<long_random_secret>`

Start backend:

```bash
npm run dev
```

### 2) Mobile app setup

From project root:

```bash
npm install
npm start
```

## API base URL notes (mobile)

- Android emulator: `http://10.0.2.2:5000`
- iOS simulator/web: `http://localhost:5000`
- Real device: use your PC LAN IP, e.g. `http://192.168.1.20:5000`

## Main user flow

1. Sign up / Login
2. Add and manage expenses
3. Filter by month and analyze category chart
4. Set monthly category budgets and monitor alert states
5. Add recurring expenses and auto-apply monthly entries

## Notes

- Backend endpoint details are documented in `backend/README.md`.
- This project is actively extended feature-by-feature from an Expo starter.
