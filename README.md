# Expense Manager App

Expense Manager is a full-stack personal finance app built with Expo Router (React Native) and a Node.js + Express + MongoDB backend.

## Overview

- JWT authentication with secure password hashing
- Expense CRUD with month-based filtering
- Budget tracking with warning and over-limit states
- Recurring expense templates with monthly auto-apply
- Session persistence using Expo Secure Store
- Category-wise expense analytics chart

## Tech Stack

| Layer | Stack | Location |
| --- | --- | --- |
| Mobile app | Expo, React Native, Expo Router | app |
| API server | Node.js, Express | backend/src |
| Database | MongoDB, Mongoose | backend/src/models |
| Auth | JWT, bcryptjs | backend/src/routes/auth.js |

## Project Structure

```text
app/
	_layout.tsx
	auth.jsx
	(tabs)/
		home.jsx
		expenses.jsx
		budgets.jsx
		recurring.jsx
		settings.jsx
backend/
	src/
		server.js
		db.js
		middleware/
		models/
		routes/
lib/
	finance.js
context/
	auth-context.jsx
```

## Prerequisites

- Node.js 18+
- npm 9+
- MongoDB Atlas or local MongoDB instance
- Expo Go app (for physical device testing) or Android/iOS simulator

## Setup

### 1. Install backend dependencies

```bash
cd backend
npm install
copy .env.example .env
```

Update backend environment variables in backend/.env:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_secret
```

### 2. Install mobile app dependencies

```bash
cd ..
npm install
```

Optional root .env for API override:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:5000
```

If EXPO_PUBLIC_API_BASE_URL is set, the app automatically uses it and appends /api when needed.

## Run Locally

Use two terminals.

### Terminal A: backend

```bash
cd backend
npm run dev
```

### Terminal B: mobile app

```bash
npm start
```

You can also run:

```bash
npm run android
npm run ios
npm run web
```

## API Base URL Resolution (Mobile App)

The app resolves API URL in this order:

1. EXPO_PUBLIC_API_BASE_URL from root environment
2. Expo host URI while running in development
3. Android emulator fallback: http://10.0.2.2:5000/api
4. Other fallback: http://localhost:5000/api

## Available API Endpoints

- GET /health
- POST /api/auth/signup
- POST /api/auth/login
- GET /api/expenses
- POST /api/expenses
- PUT /api/expenses/:id
- DELETE /api/expenses/:id
- GET /api/budgets?month=YYYY-MM
- POST /api/budgets
- DELETE /api/budgets/:id
- GET /api/recurring
- POST /api/recurring
- DELETE /api/recurring/:id
- POST /api/recurring/apply

Detailed backend notes are in [backend/README.md](backend/README.md).

## Main User Flow

1. Sign up or log in
2. Create and manage expenses
3. Filter by month and view analytics
4. Set budgets by category/month and monitor status
5. Add recurring templates and apply monthly entries

## Scripts

Root:

- npm start
- npm run android
- npm run ios
- npm run web
- npm run lint

Backend:

- npm run dev
- npm start

## Future Improvements

- Receipt OCR assisted entry
- Smart spending insights
- Savings goals dashboard
- CSV/PDF export
- Shared wallets and collaboration
