@echo off
REM Deployment script for BookkeepingApp (Windows)

echo 🚀 Starting deployment process...

REM Install dependencies
echo 📦 Installing dependencies...
call npm run install:all

REM Build client
echo 🏗️  Building client application...
call npm run build

REM Test build
echo 🧪 Testing build...
if exist "client\dist" (
    echo ✅ Client build successful
) else (
    echo ❌ Client build failed
    exit /b 1
)

REM Production checks
echo 🔍 Running production checks...
node production-check.js

echo ✅ Deployment preparation complete!
echo.
echo Next steps:
echo 1. Configure your .env file with production values
echo 2. Deploy to your hosting platform:
echo    - Firebase: firebase deploy
echo    - Vercel: vercel --prod
echo    - Netlify: netlify deploy --prod
echo 3. Set up monitoring and analytics
