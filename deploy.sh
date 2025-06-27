#!/bin/bash
# Deployment script for BookkeepingApp

echo "🚀 Starting deployment process..."

# Install dependencies
echo "📦 Installing dependencies..."
npm run install:all

# Build client
echo "🏗️  Building client application..."
npm run build

# Test build
echo "🧪 Testing build..."
if [ -d "client/dist" ]; then
    echo "✅ Client build successful"
else
    echo "❌ Client build failed"
    exit 1
fi

# Production checks
echo "🔍 Running production checks..."
node production-check.js

echo "✅ Deployment preparation complete!"
echo ""
echo "Next steps:"
echo "1. Configure your .env file with production values"
echo "2. Deploy to your hosting platform:"
echo "   - Firebase: firebase deploy"
echo "   - Vercel: vercel --prod"
echo "   - Netlify: netlify deploy --prod"
echo "3. Set up monitoring and analytics"
