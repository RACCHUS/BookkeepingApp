# Bookkeeping App

A full-featured bookkeeping application for managing transactions, tracking expenses/income by IRS tax categories, generating reports, and creating invoices. Supports CSV import, PDF document storage, and check tracking.

## Features

### Core
- **Transactions**: Manual entry, CSV import, bulk editing, IRS category classification
- **Multi-Company**: Separate financial tracking per company
- **Payees & Vendors**: Employee/vendor management with 1099 tracking
- **Documents**: Upload PDFs (bank statements, receipts, checks) with transaction linking

### Invoicing & Quotes
- **Catalogue**: Product/service items with pricing
- **Quotes**: Create, send, convert to invoices
- **Invoices**: Full lifecycle (draft → sent → paid), partial payments, PDF generation
- **Recurring Invoices**: Scheduled auto-generation

### Reports
- Profit & Loss, Tax Summary, Expense Summary
- 1099 Summary, Vendor/Payee Summary
- Monthly summaries, Checks Paid reports
- Export to PDF

### Additional
- **Checks**: Track check payments with images
- **Receipts**: Upload and link receipt images
- **Inventory**: Basic inventory tracking
- **Tax Forms**: 1099 preparation support

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 18, Vite, TailwindCSS, React Query, React Hook Form |
| **Backend** | Node.js, Express.js, PDFKit |
| **Database** | Supabase (PostgreSQL), Row Level Security |
| **Auth** | Supabase Auth (Email/Password, Google) |
| **Storage** | Supabase Storage (Cloudinary fallback) |
| **Testing** | Vitest (client), Jest (server), React Testing Library |

## Project Structure

```
BookkeepingApp/
├── client/          # React frontend (Vite)
├── server/          # Express.js backend
├── shared/          # Shared constants and utilities
├── supabase/        # Database migrations
├── docs/            # Documentation
├── scripts/         # Automation scripts
└── reports/         # Report templates and output
```

See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for details.

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase project (free tier available)

### Quick Setup

1. **Clone & Install**
   ```bash
   git clone <repository-url>
   cd bookkeeping-app
   npm run install:all
   ```

2. **Configure Environment**
   
   Root `.env`:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   PORT=5000
   CORS_ORIGIN=http://localhost:3000
   ```

   `client/.env.local`:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key
   VITE_API_URL=http://localhost:5000/api
   ```

3. **Supabase Setup**
   - Create project at [supabase.com](https://supabase.com)
   - Enable Email/Password and Google auth
   - Run migrations from `supabase/migrations/`
   - Enable Storage bucket

4. **Run**
   ```bash
   npm run dev  # Starts client (:3000) and server (:5000)
   ```

5. **Test**
   ```bash
   cd server && npm test   # Jest
   cd client && npm test   # Vitest
   ```

## API Overview

| Resource | Endpoints |
|----------|-----------|
| **Transactions** | CRUD, bulk operations, classification, summaries |
| **Companies** | CRUD, default company management |
| **Payees** | CRUD, employee/vendor filtering |
| **Reports** | P&L, tax, expense, 1099, vendor, monthly summaries |
| **Invoices** | CRUD, payments, PDF generation, email |
| **Quotes** | CRUD, convert to invoice, PDF, email |
| **Catalogue** | Product/service items management |
| **Checks** | CRUD, image upload, bulk operations |
| **Receipts** | CRUD, image upload |
| **CSV Import** | Upload, preview, confirm import |
| **PDF Upload** | Upload, process, link to transactions |

Full API documentation: [docs/API.md](docs/API.md)

## Security

- Supabase Row Level Security (RLS) on all tables
- JWT token authentication
- Input validation (express-validator)
- Rate limiting, CORS, Helmet headers

## Documentation

See [docs/](docs/) for detailed documentation including setup guides, API reference, and architecture.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow coding standards in `.github/copilot-instructions.md`
4. Commit changes (`git commit -m 'feat: add amazing feature'`)
5. Push and open a Pull Request

## Roadmap

- [ ] QuickBooks integration
- [ ] Bank API connections (Plaid)
- [ ] Mobile app
- [ ] Multi-currency support
- [ ] Receipt OCR scanning
- [ ] Multi-user/team accounts

## License

MIT License - see [LICENSE](LICENSE)

## Support

Email: richardgurudeo@gmail.com | [Create an issue](../../issues)
