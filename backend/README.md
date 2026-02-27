# Backend API

Express + MongoDB API for authentication, expenses, budgets, and recurring automation.

## Endpoints

- `GET /health`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/expenses` (requires Bearer token)
- `POST /api/expenses` (requires Bearer token)
- `PUT /api/expenses/:id` (requires Bearer token)
- `DELETE /api/expenses/:id` (requires Bearer token)
- `GET /api/budgets?month=YYYY-MM` (requires Bearer token)
- `POST /api/budgets` (requires Bearer token)
- `DELETE /api/budgets/:id` (requires Bearer token)
- `GET /api/recurring` (requires Bearer token)
- `POST /api/recurring` (requires Bearer token)
- `DELETE /api/recurring/:id` (requires Bearer token)
- `POST /api/recurring/apply` (requires Bearer token)

## Run

```bash
npm install
copy .env.example .env
npm run dev
```

Set `MONGODB_URI` in `.env` before starting.
Set `JWT_SECRET` in `.env` before starting.
