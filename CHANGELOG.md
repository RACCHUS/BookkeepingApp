# Changelog

All notable changes to the BookkeepingApp project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive project structure documentation
- Contributing guidelines and development workflow
- Organized test data structure for PDF processing
- Development notes organization in `docs/development/`

### Changed
- Moved Firebase configuration documentation to `firebase/` directory
- Reorganized root directory for better project structure
- Enhanced Firebase folder with consolidated documentation

### Improved
- Project organization and documentation structure
- Development workflow and contributor onboarding
- Test data management for PDF processing validation

## [1.2.0] - 2024-01-20

### Added
- **Checks Paid Report**: New PDF report for check and ACH payments grouped by payee
- Enhanced report generation system with modular architecture
- Support for multiple report types with consistent styling
- Real-time report generation with progress tracking

### Improved
- Report architecture with base classes for maintainability
- PDF generation performance and formatting
- Frontend reports page with better UX

### Technical
- `ChecksPaidReport.js` - New report class
- `TransactionSummaryReport.js` - Enhanced transaction reporting
- `TaxSummaryReport.js` - Tax-focused reporting
- `CategoryBreakdownReport.js` - Category analysis reports

## [1.1.0] - 2024-01-15

### Added
- **Multi-company Support**: Assign transactions and uploads to different companies
- **Enhanced PDF Processing**: Improved Chase bank statement parsing
- **Rule-based Classification**: User-defined rules for transaction categorization
- **Employee Payment Tracking**: Dedicated tracking for employee payments

### Improved
- Transaction filtering by company and date ranges
- Upload management with company assignment
- Dashboard with company-specific summaries
- Report generation with company filtering

### Fixed
- PDF parsing issues with multi-page statements
- Transaction amount extraction accuracy
- Date parsing for various statement formats

## [1.0.0] - 2024-01-01

### Added
- **Initial Release**: Complete bookkeeping application
- **PDF Import**: Upload and parse PDF bank statements
- **Transaction Management**: Create, edit, delete, and categorize transactions
- **Financial Reports**: P&L, tax summary, and expense reports
- **User Authentication**: Firebase Auth integration
- **Company Management**: Create and manage business entities
- **Dashboard**: Real-time financial summaries and charts

### Features
- **Frontend**: React 18 with TailwindCSS and Vite
- **Backend**: Node.js/Express with Firebase integration
- **Database**: Firestore with optimized indexes
- **File Storage**: Firebase Storage for PDF uploads
- **Security**: Comprehensive Firestore security rules

### API Endpoints
- PDF upload and processing: `POST /api/pdf/upload`
- Transaction CRUD: `/api/transactions`
- Company management: `/api/companies`
- Report generation: `/api/reports/*`
- Upload management: `/api/uploads`

### Documentation
- Complete API reference
- User setup guide
- Firebase configuration documentation
- Development environment setup

## Development Notes

### Version History
- **v1.2.x**: Enhanced reporting and project organization
- **v1.1.x**: Multi-company support and improved PDF processing
- **v1.0.x**: Initial stable release with core functionality

### Migration Guide

#### From v1.1.x to v1.2.x
- No breaking changes
- New report endpoints available
- Enhanced frontend report UI

#### From v1.0.x to v1.1.x
- **Database Schema**: Added `companyId` field to transactions and uploads
- **API Changes**: Company filtering parameters added to most endpoints
- **Frontend**: Company selector added to main interface

### Deployment History
- **Production**: Deployed on Firebase Hosting
- **Database**: Firestore with automatic backups
- **Storage**: Firebase Storage with security rules
- **Authentication**: Firebase Auth with email/password

### Technical Debt
- [ ] Add OCR support for scanned PDF images
- [ ] Implement caching for frequently accessed data
- [ ] Add comprehensive integration tests
- [ ] Optimize bundle size with code splitting
- [ ] Add progressive web app (PWA) features

### Performance Metrics
- **PDF Processing**: 2-10 seconds for standard statements
- **Page Load**: < 2 seconds for dashboard
- **API Response**: < 500ms for most endpoints
- **Bundle Size**: < 1MB gzipped frontend

### Known Issues
- Large PDF files (>10MB) may timeout during processing
- Some generic bank statement formats not fully supported
- Date parsing may fail for non-standard date formats

### Future Roadmap
- **Q1 2024**: OCR support for scanned documents
- **Q2 2024**: Mobile app with React Native
- **Q3 2024**: Advanced analytics and forecasting
- **Q4 2024**: Multi-currency support and international banks
