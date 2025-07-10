# Project Structure

This document describes the organization of the BookkeepingApp project.

## Overview

Full-stack bookkeeping application with React frontend, Node.js backend, and Firebase services.

## Root Directory Structure

```
BookkeepingApp/
├── 📁 client/                 # React frontend application
├── 📁 server/                 # Node.js/Express backend
├── 📁 shared/                 # Shared utilities and constants
├── 📁 docs/                   # Project documentation
├── 📁 firebase/               # Firebase configuration files
├── 📁 scripts/                # Automation and deployment scripts
├── 📁 reports/                # Generated reports and templates
├── 📁 uploads/                # Runtime file uploads (gitignored)
├── 📁 .github/                # GitHub workflows and templates
├── 📁 .vscode/                # VS Code workspace configuration
├── 📄 package.json            # Root package.json for workspace commands
├── 📄 README.md               # Project overview and setup
├── 📄 .gitignore              # Git ignore rules
├── 📄 .firebaserc             # Firebase project configuration
├── 📄 firebase.json           # Firebase services configuration
└── 📄 .env.example            # Environment variables template
```

## Directory Details

### `/client/` - Frontend Application
- **Framework**: React 18 with Vite
- **Styling**: TailwindCSS
- **State Management**: React Query + Context
- **Key Features**: Dashboard, transaction management, PDF upload, reports

### `/server/` - Backend API
- **Framework**: Express.js with professional middleware stack
- **Database**: Firebase Firestore with Admin SDK
- **Architecture**: Enhanced controller-service-repository pattern
- **Key Features**: PDF processing, transaction APIs, report generation, comprehensive testing

#### Server Structure (Enhanced)
```
server/
├── index.js                     # Main server entry point
├── package.json                 # Server dependencies and scripts
├── config/                      # 🔧 Configuration Management
│   ├── firebaseAdmin.js         # Firebase Admin SDK setup
│   ├── database.js              # Database configuration
│   ├── security.js              # Security configuration
│   └── index.js                 # Centralized config exports
├── controllers/                 # 🎯 Route Handlers (Professional Patterns)
│   ├── classificationController.js  # Transaction classification
│   ├── companyController.js     # Company management
│   ├── payeeController.js       # Employee/vendor management
│   ├── pdfController.js         # PDF upload and processing
│   ├── reportController.js      # Report generation
│   ├── transactionController.js # Transaction CRUD operations
│   └── index.js                 # Centralized controller exports
├── middlewares/                 # 🛡️ Express Middleware (Enterprise Security)
│   ├── authMiddleware.js        # Firebase authentication
│   ├── validationMiddleware.js  # Input validation and sanitization
│   ├── securityMiddleware.js    # Security headers and CORS
│   ├── loggingMiddleware.js     # Request/response logging
│   ├── errorMiddleware.js       # Centralized error handling
│   ├── rateLimitMiddleware.js   # Rate limiting protection
│   └── index.js                 # Centralized middleware exports
├── routes/                      # 🛣️ Express Routes (Enhanced Validation)
│   ├── classificationRoutes.js # Classification API routes
│   ├── companyRoutes.js         # Company management routes
│   ├── payeeRoutes.js           # Payee management routes
│   ├── pdfRoutes.js             # PDF processing routes
│   ├── reportRoutes.js          # Report generation routes
│   ├── transactionRoutes.js     # Transaction API routes
│   └── index.js                 # Centralized route exports
├── services/                    # ⚡ Business Logic (Utils Integration)
│   ├── cleanFirebaseService.js  # Primary Firebase operations
│   ├── companyService.js        # Company business logic
│   ├── payeeService.js          # Employee/vendor management
│   ├── chasePDFParser.js        # PDF processing service
│   ├── transactionClassifier.js # Transaction classification
│   ├── transactionClassifierService.js
│   ├── reportGenerator.js       # Report generation
│   ├── reportService.js         # Report management
│   ├── parsers/                 # PDF Processing Utilities
│   │   ├── ChaseClassifier.js   # Transaction classification
│   │   ├── ChaseDateUtils.js    # Date parsing utilities
│   │   ├── ChaseTransactionParser.js # Transaction extraction
│   │   └── index.js             # Parser exports
│   ├── reports/                 # Report Generation
│   │   ├── BaseReportGenerator.js # Base report class
│   │   ├── CategoryBreakdownReport.js # Category analysis
│   │   ├── TaxSummaryReport.js  # Tax reporting
│   │   └── index.js             # Report exports
│   └── index.js                 # Centralized service exports
├── utils/                       # 🧰 Professional Utility Toolkit (70+ Functions)
│   ├── pathUtils.js             # File and path utilities
│   ├── validation.js            # Business validation functions
│   ├── responseHelpers.js       # Standardized API responses
│   ├── dateUtils.js             # Financial date utilities
│   ├── financialUtils.js        # Financial calculations
│   ├── errorHandler.js          # Enhanced error handling
│   ├── sectionFiltering.js      # PDF section filtering
│   └── index.js                 # Centralized utils exports
├── test/                        # 🧪 Comprehensive Testing Infrastructure
│   ├── unit/                    # Unit Testing
│   │   ├── services/            # Service unit tests
│   │   ├── utils/               # Utility function tests
│   │   └── controllers/         # Controller tests
│   ├── integration/             # Integration Testing
│   │   ├── api/                 # API endpoint tests
│   │   └── database/            # Database integration tests
│   ├── fixtures/                # Test Fixtures and Utilities
│   │   ├── mocks/               # Mock data and objects
│   │   └── helpers/             # Test helper functions
│   ├── setup/                   # Test Configuration
│   │   ├── jest.config.js       # Jest configuration
│   │   └── testSetup.js         # Global test setup
│   ├── data/                    # Test Data Files
│   │   ├── pdfs/                # PDF test files
│   │   ├── csv/                 # CSV test data
│   │   └── json/                # JSON test fixtures
│   └── index.js                 # Test exports
├── scripts/                     # Automation and Maintenance
└── uploads/                     # File Upload Storage
```

#### Key Server Features
- **Professional Architecture**: Enhanced controller-service-repository pattern
- **Comprehensive Security**: Enterprise-grade middleware stack
- **Utils Integration**: 70+ utility functions across 7 specialized modules
- **Testing Infrastructure**: Complete unit and integration testing setup
- **Centralized Exports**: Barrel files for easy imports and organization

### `/shared/` - Shared Code
- **Purpose**: Common utilities used by both client and server
- **Contents**: Constants, schemas, utility functions
- **Benefits**: DRY principle, consistent validation

### `/docs/` - Documentation
- **API Documentation**: Complete API reference
- **Setup Guides**: Installation and configuration
- **Development**: Implementation notes and guides
- **Architecture**: System design and database schemas

### `/firebase/` - Firebase Configuration
- **Security Rules**: Firestore and Storage access control
- **Indexes**: Database optimization configuration
- **Documentation**: Setup and deployment guides

### `/scripts/` - Automation Tools
- **Deployment**: Production deployment automation
- **Development**: Development environment setup
- **Maintenance**: Cleanup and optimization tools
- **Utilities**: Helper scripts for common tasks

### `/reports/` - Report Management
- **Templates**: PDF report templates
- **Generated**: Runtime report generation (gitignored)
- **Samples**: Example reports for testing

## Key Configuration Files

### Package Management
- `package.json` - Root workspace configuration
- `client/package.json` - Frontend dependencies
- `server/package.json` - Backend dependencies

### Environment Configuration
- `.env.example` - Template for environment variables
- `.env` - Local development environment (gitignored)
- `.env.production` - Production environment (gitignored)

### Firebase Configuration
- `firebase.json` - Firebase services configuration
- `.firebaserc` - Firebase project aliases
- `firebase/` - Detailed Firebase configuration files

### Development Tools
- `.vscode/` - VS Code workspace settings and tasks
- `.github/` - GitHub Actions workflows and issue templates

## Getting Started

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd BookkeepingApp
   ```

2. **Install Dependencies**
   ```bash
   npm run install:all
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Firebase Setup**
   - Follow `/firebase/CONFIGURATION.md`
   - Create Firestore indexes: `/firebase/INDEX_SETUP.md`

5. **Start Development**
   ```bash
   # Terminal 1: Start backend
   npm run dev:server
   
   # Terminal 2: Start frontend  
   npm run dev:client
   ```

## Workspace Commands

Available from the root directory:

```bash
npm run install:all      # Install all dependencies
npm run dev:server       # Start backend development server
npm run dev:client       # Start frontend development server
npm run build:client     # Build frontend for production
npm run deploy           # Deploy to Firebase hosting
npm run test             # Run all tests
npm run lint             # Lint all code
```

## Development Workflow

1. **Feature Development**: Create feature branch from `main`
2. **Documentation**: Update relevant docs in `/docs/`
3. **Testing**: Add tests in appropriate `/test/` directories
4. **Code Review**: Create pull request with proper documentation
5. **Deployment**: Merge to `main` triggers deployment pipeline

## Best Practices

### File Organization
- Keep related files grouped in logical directories
- Use descriptive file names with consistent naming conventions
- Place shared code in `/shared/` to avoid duplication

### Documentation
- Update `/docs/` when adding new features or APIs
- Include setup instructions for new developers
- Document configuration changes in appropriate files

### Security
- Never commit sensitive data (use `.env` files)
- Follow Firebase security rules best practices
- Validate all inputs on both client and server

### Performance
- Use React Query for efficient data fetching
- Implement proper Firestore indexes for queries
- Optimize bundle size with code splitting

## Architecture Decisions

### Monorepo Structure
- **Benefits**: Shared code, consistent tooling, simplified deployment
- **Trade-offs**: Larger repository, potential build complexity

### Firebase as Backend
- **Benefits**: Real-time updates, built-in authentication, serverless scaling
- **Trade-offs**: Vendor lock-in, query limitations

### React with Hooks
- **Benefits**: Modern patterns, better performance, simpler state management
- **Trade-offs**: Learning curve for team members unfamiliar with hooks
