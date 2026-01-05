# Bookkeeping App

A comprehensive bookkeeping application for managing business transactions, tracking expenses and income by IRS tax categories, and generating financial reports. Supports manual transaction entry, CSV import, and PDF document storage for reference.

## Features

### Core Functionality
- **Transaction Management**: Add, edit, and bulk-update transactions with comprehensive filtering
- **Income & Expense Tracking**: Separate management for income and expense transactions
- **Income Sources**: Track customers, clients, and revenue sources with transaction assignment
- **Multi-Company Support**: Manage multiple companies with separate financial tracking
- **Employee & Vendor Management**: Track payees and vendors, assign them to transactions
- **Document Storage**: Upload and store PDFs (bank statements, receipts, checks) for reference
- **Real-time Updates**: Live dashboard with financial summaries

### Tax & Reporting
- **IRS Category Mapping**: Automatic mapping to Schedule C categories
- **Tax Reports**: Generate tax-ready summaries by quarter and year
- **Profit & Loss**: Comprehensive P&L statements
- **Company-Specific Reports**: Generate reports filtered by company
- **Payee-Based Reports**: Track expenses and payments by employee/vendor
- **1099 Tracking**: Flag and track 1099-reportable payments
- **Export to PDF**: Professional report generation

### Transaction Entry
- **Manual Entry**: Add individual transactions with full detail
- **Bulk Import**: Import transactions from CSV files
- **Bulk Editing**: Select multiple transactions and update fields in bulk
- **Category Assignment**: Quick categorization with IRS-compliant categories

### Classification Rules
- **Rule-Based System**: User-defined rules map transaction names to IRS categories
- **Custom Rules**: Create and manage classification rules for specific payees/descriptions
- **Manual Assignment**: Unmatched transactions can be manually categorized

## Tech Stack

### Frontend
- **React 18** with functional components and hooks
- **Vite** for fast development and building
- **TailwindCSS** for styling
- **React Router** for navigation
- **React Query** for data fetching and caching
- **React Hook Form** for form management
- **React Hot Toast** for notifications

### Backend
- **Node.js** with Express.js framework
- **Firebase Admin SDK** for authentication and database
- **Firebase Firestore** for data storage
- **Firebase Storage** for file uploads
- **PDFKit** for report generation
- **Express Validator** for input validation

### Database & Auth
- **Firebase Authentication** for user management
- **Firestore** for document-based data storage
- **Firebase Storage** for file management
- **Security Rules** for data protection

### Testing
- **Vitest** for client-side testing (React components, hooks, services)
- **Jest** for server-side testing (controllers, services, utilities)
- **React Testing Library** for component testing
- **1100+ tests** with comprehensive coverage

## Project Structure

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
├── 📄 PROJECT_STRUCTURE.md    # Detailed project structure guide
├── 📄 LICENSE                 # MIT License
└── 📄 .env.example            # Environment variables template
```

For detailed project structure information, see [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md).

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase project setup

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd bookkeeping-app
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Environment Setup**
   
   Create `.env` file in the root directory:
   ```env
   # Firebase Configuration
   FIREBASE_API_KEY=your_firebase_api_key
   FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   FIREBASE_APP_ID=your_app_id

   # Firebase Admin SDK
   FIREBASE_ADMIN_PROJECT_ID=your_project_id
   FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nyour_private_key\\n-----END PRIVATE KEY-----\\n"
   FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com

   # Server Configuration
   PORT=5000
   CORS_ORIGIN=http://localhost:3000
   ```

   Create `client/.env.local`:
   ```env
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_API_URL=http://localhost:5000/api
   ```

4. **Firebase Setup**
   - Create a Firebase project at https://console.firebase.google.com
   - Enable Authentication (Email/Password and Google)
   - Create Firestore database
   - Enable Storage
   - Download service account key and add credentials to `.env`

5. **Start Development Servers**
   ```bash
   npm run dev
   ```

   This will start:
   - Client on http://localhost:3000
   - Server on http://localhost:5000

6. **Run Tests**
   ```bash
   # Run all server tests (Jest)
   cd server && npm test
   
   # Run all client tests (Vitest)
   cd client && npm test
   
   # Run client tests in watch mode
   cd client && npm run test:watch
   
   # Run client tests with UI
   cd client && npm run test:ui
   ```

## Usage

### 1. Authentication
- Sign up with email/password or Google
- Secure authentication with Firebase Auth

### 2. Transaction Entry
- **Manual Entry**: Add transactions one at a time with full details
- **CSV Import**: Bulk import transactions from bank CSV exports
- **Bulk Edit**: Select multiple transactions to update category, company, payee, etc.

### 3. Document Storage
- Upload PDF bank statements, receipts, and checks for reference
- Link transactions to uploaded documents
- Organize documents by company

### 4. Transaction Management
- View all transactions with powerful filtering
- Separate views for Income and Expenses
- Assign transactions to income sources, payees, vendors
- Bulk edit capabilities for efficient categorization

### 5. Classification System
- Automatic categorization using IRS tax categories
- Rule-based matching of transaction descriptions
- Custom rules for specific payees
- Manual category assignment for unmatched transactions

### 6. Reporting
- Generate Profit & Loss statements
- Tax-ready expense summaries
- Employee cost tracking
- Export to PDF

## API Endpoints

### Authentication
All API endpoints require Bearer token authentication.

### Transactions
- `GET /api/transactions` - Get user transactions
- `POST /api/transactions` - Create new transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `GET /api/transactions/summary` - Get financial summary
- `POST /api/transactions/:id/assign-payee` - Assign payee to transaction
- `POST /api/transactions/bulk-assign-payee` - Bulk assign payee to transactions

### Companies
- `GET /api/companies` - Get user companies
- `POST /api/companies` - Create new company
- `PUT /api/companies/:id` - Update company
- `DELETE /api/companies/:id` - Delete company
- `POST /api/companies/:id/set-default` - Set default company

### Payees
- `GET /api/payees` - Get all payees
- `GET /api/payees/employees` - Get employee payees
- `GET /api/payees/vendors` - Get vendor payees
- `POST /api/payees` - Create new payee
- `PUT /api/payees/:id` - Update payee
- `DELETE /api/payees/:id` - Delete payee
- `GET /api/payees/search` - Search payees
- `GET /api/payees/transactions-without-payees` - Get transactions without assigned payees

### Upload Management
- `GET /api/uploads` - Get user uploads
- `POST /api/pdf/upload` - Upload PDF file
- `PUT /api/uploads/:id/rename` - Rename upload
- `DELETE /api/uploads/:id` - Delete upload
- `GET /api/uploads/:id` - Get upload details
- `POST /api/uploads/:id/link` - Link transactions to upload
- `POST /api/uploads/:id/unlink` - Unlink transactions from upload

### Income Sources
- `GET /api/income-sources` - Get income sources
- `POST /api/income-sources` - Create income source
- `PUT /api/income-sources/:id` - Update income source
- `DELETE /api/income-sources/:id` - Delete income source

### Classification
- `POST /api/classification/classify` - Classify transaction
- `POST /api/classification/train` - Train classifier
- `GET /api/classification/rules` - Get classification rules

### Reports
- `GET /api/reports/profit-loss` - Generate P&L report
- `GET /api/reports/expense-summary` - Generate expense report
- `GET /api/reports/tax-summary` - Generate tax report

## Security

### Firebase Security Rules
- Users can only access their own data
- File uploads restricted to authenticated users
- Size limits on file uploads
- Content type validation

### API Security
- JWT token authentication
- Input validation and sanitization
- Rate limiting
- CORS protection
- Helmet security headers

## Documentation

- **📖 [Project Structure](PROJECT_STRUCTURE.md)** - Detailed project organization guide
- **📁 [Documentation Directory](docs/)** - Complete documentation including:
  - API Reference
  - User Guide  
  - Setup and Installation
  - Architecture and Database Design
  - Development Notes

## Contributing

We welcome contributions! Quick start:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow the coding standards in `.github/copilot-instructions.md`
4. Commit your changes (`git commit -m 'feat: add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email richardgurudeo@gmail.com or create an issue in the repository.

## Roadmap

- [ ] CSV import for transactions
- [ ] QuickBooks integration
- [ ] Bank API connections (Plaid)
- [ ] Mobile app
- [ ] Advanced reporting features
- [ ] Multi-currency support
- [ ] Receipt OCR scanning
- [ ] Tax form generation (1099, W-2)
- [ ] Inventory tracking
- [ ] Multi-user/team accounts
- [ ] Recurring transaction templates
