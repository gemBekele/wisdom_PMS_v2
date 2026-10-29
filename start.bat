@echo off
echo 🚀 Starting Wisdom SACCOS PMS System...
echo ================================
echo.

echo 📡 Starting Backend Server (Port 5000)...
start "Backend Server" cmd /k "cd backend && npm run dev"

timeout /t 3 /nobreak >nul

echo 🎨 Starting Frontend Server (Port 5173)...
start "Frontend Server" cmd /k "cd frontend && npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo ✅ Both servers are starting!
echo.
echo 🌐 Frontend: http://localhost:5173
echo 🔌 Backend:  http://localhost:5000
echo.
echo Close the server windows to stop them.
echo.
pause

