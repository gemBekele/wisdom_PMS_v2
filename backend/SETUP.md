# Backend Setup Instructions

## Step 1: Create .env File

Create a file named `.env` in the `backend` folder with this content:

```env
PORT=5000
NODE_ENV=development

MONGODB_URI=mongodb+srv://hayderaman75_db_user:G073ApydNeA8VERX@cluster0.djzad5z.mongodb.net/sako-pms?retryWrites=true&w=majority

JWT_SECRET=sako-pms-super-secret-key-change-in-production-2024
JWT_EXPIRE=7d

CORS_ORIGIN=http://localhost:5173
```

## Step 2: Install Dependencies

```bash
cd backend
npm install
```

## Step 3: Create Admin User

```bash
npm run seed
```

This will create:
- Email: admin@sako.com
- Password: admin123

## Step 4: Start Server

```bash
npm run dev
```

Server will run on http://localhost:5000

