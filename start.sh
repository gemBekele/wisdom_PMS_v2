#!/bin/bash

echo "🚀 SAKO PMS - Starting Application"
echo "==================================="

# Check if PostgreSQL is running
if ! pgrep -x "postgres" > /dev/null; then
    echo "⚠️  Starting PostgreSQL..."
    sudo service postgresql start
    sleep 2
fi

# Check database connection
echo "🔄 Checking database connection..."
cd backend
if ! npx prisma db pull > /dev/null 2>&1; then
    echo "❌ Database connection failed"
    exit 1
fi

echo "✅ Database connected"

# Start backend in background
echo "🚀 Starting backend server..."
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend
echo "🌐 Starting frontend..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "==================================="
echo "✅ Application started!"
echo "📝 Backend: http://localhost:5000"
echo "🌐 Frontend: http://localhost:5173"
echo "🔑 Admin Login: admin@sako.com / admin123"
echo ""
echo "Press Ctrl+C to stop both servers"
echo "==================================="

# Wait for interrupt
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
