# Quick Start Guide

## Development Setup

1. **Install Dependencies**
   ```bash
   npm run install:all
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Firebase configuration
   ```

3. **Start Development**
   ```bash
   npm run dev
   # Or use the batch file: start-all.bat (Windows)
   ```

4. **Access Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000

## Production Deployment

1. **Prepare for Deployment**
   ```bash
   node final-polish.js
   ./deploy.sh  # or deploy.bat on Windows
   ```

2. **Configure Production Environment**
   - Copy `.env.production` to `.env`
   - Fill in production Firebase credentials
   - Set production API URLs

3. **Deploy to Platform**
   - **Firebase Hosting**: `firebase deploy`
   - **Vercel**: `vercel --prod`
   - **Netlify**: `netlify deploy --prod`

## Features Overview

- 📄 **PDF Import**: Upload Chase bank statements
- 🏷️ **Smart Classification**: Auto-categorize transactions
- 📊 **Reports**: Generate tax-ready summaries
- 🌙 **Dark Mode**: Professional dark theme
- 📱 **Responsive**: Works on all devices
- 🔐 **Secure**: Firebase authentication & security rules

## Support

- Run `node health-check.js` to verify setup
- Run `node production-check.js` before deployment
- Check logs in browser console for debugging
- Refer to FIRESTORE_SETUP.md for Firebase configuration
