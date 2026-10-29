# Backend Setup Instructions

## Step 1: Create `.env`

Create a file named `.env` in the `backend` folder (never commit it):

```env
PORT=5100
NODE_ENV=development

DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/wisdom_saccos_pms?schema=public

JWT_SECRET=replace-with-a-random-64-character-secret
JWT_EXPIRE=7d

CORS_ORIGIN=http://localhost:5273
```

Generate a strong secret with `openssl rand -hex 32`. The server refuses to start in
production if `JWT_SECRET` is missing or shorter than 32 characters.

## Step 2: Install dependencies

```bash
cd backend
npm install
```

## Step 3: Apply the database schema

```bash
npx prisma generate
npx prisma migrate deploy
```

## Step 4: Create the first admin

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in the environment, then run:

```bash
npm run seed
```

Do not use shared or published default passwords. Change the password immediately
after the first login.

## Step 5: Start the server

```bash
npm run dev
```

The API runs on http://localhost:5100, with a health check at `/api/health`.

## Demo data

`npm run seed:demo` creates local demo users for each role. These accounts are for
development only and must never be enabled in production.
