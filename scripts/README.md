# Scripts Directory

This directory contains automation scripts and utilities for the BookkeepingApp project.

## Directory Structure

```
scripts/
├── README.md                     # This file
├── deployment/                   # Deployment and build scripts
│   ├── deploy.sh                # Unix deployment script
│   ├── deploy.bat               # Windows deployment script
│   └── production-check.js      # Production readiness checks
├── development/                  # Development and debugging tools
│   ├── debug-pdf-analysis.js    # PDF processing debugging
│   ├── debug-statement-ids.mjs  # Statement ID debugging
│   └── test-company-workflow.mjs # Company workflow testing
├── maintenance/                  # Database and system maintenance
│   ├── cleanup-temp-files.js    # Clean temporary files
│   ├── backup-database.js       # Database backup utility
│   └── migrate-data.js          # Data migration scripts
├── utilities/                    # General utility scripts
│   ├── final-polish.js          # Pre-deployment cleanup
│   ├── setup-dev-env.js         # Development environment setup
│   └── generate-test-data.js    # Test data generation
└── .gitignore                   # Git ignore rules for scripts
```

## Script Categories

### Deployment Scripts
- **deploy.sh/deploy.bat**: Cross-platform deployment automation
- **production-check.js**: Validates production readiness
- **setup-production.js**: Production environment configuration

### Development Tools
- **debug-pdf-analysis.js**: Debugging PDF processing issues
- **debug-statement-ids.mjs**: Debugging statement ID matching
- **test-company-workflow.mjs**: Testing company assignment workflows
- **setup-dev-env.js**: Development environment setup

### Maintenance Scripts
- **cleanup-temp-files.js**: Removes temporary files and old reports
- **backup-database.js**: Creates Firestore backups
- **migrate-data.js**: Handles data structure migrations

### Utilities
- **final-polish.js**: Pre-deployment cleanup and optimization
- **generate-test-data.js**: Creates sample data for testing
- **validate-config.js**: Validates configuration files

## Usage

### Running Scripts
```bash
# From project root
node scripts/deployment/deploy.sh     # Unix
scripts\deployment\deploy.bat         # Windows

# Development scripts
node scripts/development/debug-pdf-analysis.js
node scripts/utilities/generate-test-data.js
```

### Prerequisites
- Node.js 18+
- npm packages installed (`npm run install:all`)
- Appropriate environment variables configured

## Adding New Scripts

When adding new scripts:

1. **Choose appropriate category**: deployment, development, maintenance, or utilities
2. **Follow naming convention**: kebab-case with descriptive names
3. **Include proper documentation**: Add JSDoc comments and usage instructions
4. **Handle errors gracefully**: Implement proper error handling and logging
5. **Update this README**: Add your script to the appropriate section

### Script Template
```javascript
#!/usr/bin/env node

/**
 * Script Name - Brief Description
 * 
 * Detailed description of what the script does,
 * when to use it, and any prerequisites.
 * 
 * Usage: node scripts/category/script-name.js [options]
 */

import { promises as fs } from 'fs';
import path from 'path';

const SCRIPT_NAME = 'script-name';

async function main() {
  console.log(`🚀 Starting ${SCRIPT_NAME}...`);
  
  try {
    // Script logic here
    
    console.log(`✅ ${SCRIPT_NAME} completed successfully!`);
  } catch (error) {
    console.error(`❌ ${SCRIPT_NAME} failed:`, error.message);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
```

## Security Notes

- **Environment Variables**: Never commit sensitive data
- **File Permissions**: Ensure proper permissions for deployment scripts
- **Input Validation**: Validate all script inputs and parameters
- **Logging**: Log operations but avoid sensitive information

## Troubleshooting

### Common Issues

**Permission Denied (Unix)**
```bash
chmod +x scripts/deployment/deploy.sh
```

**Module Not Found**
```bash
# Ensure dependencies are installed
npm run install:all
```

**Environment Variables Missing**
```bash
# Copy and configure environment file
cp .env.example .env
```

### Debug Mode
Most scripts support debug mode via environment variable:
```bash
DEBUG=true node scripts/utilities/script-name.js
```
