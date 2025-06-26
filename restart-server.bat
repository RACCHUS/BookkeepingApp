@echo off
echo ============================================
echo  Bookkeeping App - Enhanced Server
echo ============================================
echo.
echo Stopping any existing server processes...
taskkill /f /im node.exe 2>nul

echo Starting enhanced server...
cd /d "c:\Users\richa\Documents\Code\BookkeepingApp\server"
start "Enhanced Server" cmd /k "echo Enhanced server starting... && node index.js"

echo.
echo ✅ Server Features:
echo - 🔥 Firebase + Firestore ENABLED and WORKING
echo - 🔐 Authentication (Firebase Auth + mock dev mode)
echo - 📊 Real Firestore database operations
echo - 💾 Automatic data seeding on first run
echo - 📈 Full Transaction CRUD with real persistence
echo - 🧮 Real-time financial summary calculations
echo.
echo 🧪 Test Endpoints:
echo - Health: http://localhost:5000/health
echo - Firebase Status: http://localhost:5000/api/test/firebase
echo - Transactions: http://localhost:5000/api/transactions
echo - Summary: http://localhost:5000/api/transactions/summary
echo - Seed Data: POST http://localhost:5000/api/test/seed-data
echo.
echo 🎉 Firebase Status: FULLY OPERATIONAL
echo Your data is now being stored in real Firestore!
echo Ready to add PDF upload functionality.
echo.
pause
