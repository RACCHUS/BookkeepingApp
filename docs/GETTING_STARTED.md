# Getting Started

This guide will help you set up and run the Bookkeeping App for the first time.

## Prerequisites

- Node.js 18+ and npm
- Firebase account
- Git

## Quick Setup

### 1. Clone and Install
```bash
git clone <repository-url>
cd BookkeepingApp
npm run install:all
```

### 2. Firebase Configuration
Follow the [Firebase Setup Guide](./FIREBASE_SETUP.md) to:
- Create Firebase project
- Configure authentication and database
- Set up environment variables

### 3. Start Development Servers
```bash
# Option 1: Use VS Code tasks (recommended)
# Ctrl+Shift+P → "Tasks: Run Task" → "Restart Server and Client"

# Option 2: Manual start
npm run dev:server    # Terminal 1
npm run dev:client    # Terminal 2
```

### 4. First Login
1. Open http://localhost:5173
2. Click "Sign Up" to create your first account
3. Use the test company or create a new one

## Basic Usage

### Upload Your First PDF
1. Go to **Uploads** page
2. Select a Chase bank statement PDF
3. Choose or create a company
4. Upload and wait for processing

### Review Transactions
1. Go to **Transactions** page
2. Review extracted transactions
3. Set up classification rules for automatic categorization
4. Edit any incorrect transactions

### Generate Reports
1. Go to **Reports** page
2. Select date range and company
3. Generate P&L, Tax Summary, or other reports
4. Export to PDF if needed

## Project Structure

```
BookkeepingApp/
├── client/           # React frontend
├── server/           # Node.js backend
├── shared/           # Shared constants and utilities
├── docs/             # Documentation
├── firebase/         # Firebase configuration
└── scripts/          # Utility scripts
```

## Available Scripts

### Root Level
- `npm run install:all` - Install all dependencies
- `npm run dev:server` - Start backend server
- `npm run dev:client` - Start frontend client

### VS Code Tasks
- **Install All Dependencies** - Install client and server deps
- **Start Server** - Start backend only
- **Clean and Start Client** - Clear cache and start frontend
- **Stop All Processes** - Kill all Node.js processes
- **Restart Server and Client** - Full restart of both services

## Default Ports

- **Frontend**: http://localhost:5173 (Vite dev server)
- **Backend**: http://localhost:3000 (Express server)

## Next Steps

1. [Set up Firebase](./FIREBASE_SETUP.md) if you haven't already
2. Read about [PDF Processing](./PDF_PROCESSING.md) to understand import features
3. Learn about [Transaction Classification](./TRANSACTION_CLASSIFICATION.md) for better automation
4. Check out the [API Documentation](./API.md) if you want to integrate or extend

## Need Help?

- Check [Common Issues](./TROUBLESHOOTING.md)
- Read the [FAQ](./FAQ.md)
- Review the [Development Guide](./DEVELOPMENT.md)
