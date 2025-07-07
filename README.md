# Bookkeeping App

A comprehensive bookkeeping application that allows users to import Chase bank PDFs, extract and classify transactions into IRS tax-relevant categories, and track business expenses, revenue, and employee payments.

## Features

### Core Functionality
- **PDF Import**: Upload and parse Chase bank statements and other PDF files
- **Automatic Classification**: Smart categorization of transactions into IRS tax categories
- **Manual Transaction Entry**: Add cash transactions and missing entries
- **Multi-Company Support**: Manage multiple companies with separate financial tracking
- **Employee & Vendor Management**: Track payees and assign them to transactions
- **Upload Management**: Organize and manage PDF uploads with company assignment
- **Real-time Updates**: Live dashboard with financial summaries

### Tax & Reporting
- **IRS Category Mapping**: Automatic mapping to Schedule C categories
- **Tax Reports**: Generate tax-ready summaries by quarter and year
- **Profit & Loss**: Comprehensive P&L statements
- **Company-Specific Reports**: Generate reports filtered by company
- **Payee-Based Reports**: Track expenses and payments by employee/vendor
- **Export to PDF**: Professional report generation

### Payee Management
- **Employee Tracking**: Manage employee information and payments
- **Vendor Management**: Track vendor details and expenses
- **Check Assignment**: Assign payees to check transactions (PDFs don't contain payee info)
- **Quick Check Review**: Easily find and assign payees to checks without assigned recipients
- **Payee-Based Filtering**: Filter transactions and reports by specific payees

### Learning System
- **Smart Classification**: Machine learning-based transaction categorization
- **User Training**: Learn from manual corrections to improve accuracy
- **Custom Rules**: Create custom classification rules for specific payees

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
- **PDF-Parse** for PDF text extraction
- **PDFKit** for report generation
- **Express Validator** for input validation

### Database & Auth
- **Firebase Authentication** for user management
- **Firestore** for document-based data storage
- **Firebase Storage** for file management
- **Security Rules** for data protection

## Project Structure

```
bookkeeping-app/
├── client/                      # React frontend
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── features/           # Feature-based components
│   │   ├── context/            # React contexts
│   │   ├── services/           # API and Firebase services
│   │   └── utils/              # Helper functions
│   └── package.json
├── server/                      # Node.js backend
│   ├── controllers/            # Route handlers
│   ├── routes/                 # Express routes
│   ├── services/               # Business logic
│   ├── middlewares/            # Express middleware
│   ├── config/                 # Configuration files
│   └── package.json
├── shared/                      # Shared utilities
│   ├── constants/              # IRS categories and keywords
│   ├── schemas/                # Data schemas
│   └── utils/                  # Shared functions
├── firebase/                    # Firebase configuration
│   ├── firestore.rules         # Security rules
│   ├── storage.rules           # Storage rules
│   └── firebase.json           # Firebase config
└── package.json                # Root package file
```

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

## Usage

### 1. Authentication
- Sign up with email/password or Google
- Secure authentication with Firebase Auth

### 2. PDF Upload & Processing
- Upload Chase bank statements (PDF format)
- Automatic text extraction and parsing
- Transaction detection and classification
- **Note**: Check transactions from PDFs don't contain payee information (bank statements only show check numbers). Use the Payee Management feature to manually assign payees to checks after import.

### 3. Transaction Management
- View all imported transactions
- Manually edit categories and details
- Add missing cash transactions
- Bulk edit capabilities

### 4. Classification System
- Automatic categorization using IRS tax categories
- Machine learning from user corrections
- Custom rules for specific payees
- Confidence scoring

### 5. Reporting
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
- `PUT /api/uploads/:id/rename` - Rename upload
- `DELETE /api/uploads/:id` - Delete upload
- `GET /api/uploads/:id` - Get upload details
- `GET /api/uploads/:id/transactions` - Get transactions from upload

### PDF Processing
- `POST /api/pdf/upload` - Upload PDF file
- `POST /api/pdf/process/:fileId` - Process uploaded PDF
- `GET /api/pdf/status/:processId` - Check processing status

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

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@bookkeepingapp.com or create an issue in the repository.

## Roadmap

- [ ] QuickBooks integration
- [ ] Bank API connections
- [ ] Mobile app
- [ ] Advanced reporting features
- [ ] Multi-currency support
- [ ] Automatic receipt scanning
- [ ] Tax form generation (1099, W-2)
- [ ] Inventory tracking
- [ ] Multi-user/business accounts
