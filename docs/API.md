# API Documentation

Base URL: `http://localhost:3000/api`

## Authentication

All endpoints except health checks require Firebase Authentication token in header:
```
Authorization: Bearer <firebase-id-token>
```

## PDF Upload & Processing

### Upload PDF
```http
POST /api/pdf/upload
Content-Type: multipart/form-data

Parameters:
- pdf: File (PDF)
- bankType: string (default: "chase")
- autoProcess: boolean (default: false)
- name: string (optional custom name)
- companyId: string (optional)
- companyName: string (optional)
```

### Get Upload Status
```http
GET /api/pdf/status/:processId
```

### List User Uploads
```http
GET /api/pdf/uploads
Query Parameters:
- companyId: string (optional)
- limit: number (default: 50)
```

### Get Upload Details
```http
GET /api/pdf/uploads/:uploadId
```

### Update Upload Company
```http
PUT /api/pdf/uploads/:uploadId/company
Body: {
  companyId?: string,
  companyName?: string
}
```

### Delete Upload
```http
DELETE /api/pdf/uploads/:uploadId
```

## Transactions

### List Transactions
```http
GET /api/transactions
Query Parameters:
- companyId: string (optional)
- statementId: string (optional)
- startDate: string (YYYY-MM-DD, optional)
- endDate: string (YYYY-MM-DD, optional)
- category: string (optional)
- type: string ("income" | "expense", optional)
- limit: number (default: 100)
- sortBy: string ("date" | "amount", default: "date")
- sortOrder: string ("asc" | "desc", default: "desc")
```

### Create Transaction
```http
POST /api/transactions
Body: {
  date: string (YYYY-MM-DD),
  description: string,
  amount: number,
  type: "income" | "expense",
  category: string,
  companyId?: string,
  payeeId?: string,
  notes?: string
}
```

### Update Transaction
```http
PUT /api/transactions/:id
Body: {
  date?: string,
  description?: string,
  amount?: number,
  category?: string,
  payeeId?: string,
  notes?: string
}
```

### Delete Transaction
```http
DELETE /api/transactions/:id
```

## Companies

### List Companies
```http
GET /api/companies
```

### Create Company
```http
POST /api/companies
Body: {
  name: string,
  description?: string,
  settings?: object
}
```

### Delete Company
```http
DELETE /api/companies/:id
```

## Payees

### List Payees
```http
GET /api/payees
Query Parameters:
- companyId: string (optional)
- type: string ("employee" | "vendor", optional)
```

### Create Payee
```http
POST /api/payees
Body: {
  name: string,
  type: "employee" | "vendor",
  email?: string,
  phone?: string,
  address?: string,
  taxId?: string,
  companyId?: string
}
```

### Update Payee
```http
PUT /api/payees/:id
Body: {
  name?: string,
  email?: string,
  phone?: string,
  address?: string,
  taxId?: string
}
```

### Delete Payee
```http
DELETE /api/payees/:id
```

## Classification Rules

### List Rules
```http
GET /api/classification/rules
```

### Create Rule
```http
POST /api/classification/rules
Body: {
  pattern: string,
  category: string,
  priority?: number,
  isActive?: boolean
}
```

### Update Rule
```http
PUT /api/classification/rules/:id
Body: {
  pattern?: string,
  category?: string,
  priority?: number,
  isActive?: boolean
}
```

### Delete Rule
```http
DELETE /api/classification/rules/:id
```

## Reports

### Profit & Loss Report
```http
GET /api/reports/profit-loss
Query Parameters:
- startDate: string (YYYY-MM-DD)
- endDate: string (YYYY-MM-DD)
- companyId: string (optional)
```

### Tax Summary Report
```http
GET /api/reports/tax-summary
Query Parameters:
- year: number
- companyId: string (optional)
```

### Expense Summary Report
```http
GET /api/reports/expense-summary
Query Parameters:
- startDate: string (YYYY-MM-DD)
- endDate: string (YYYY-MM-DD)
- companyId: string (optional)
- groupBy: string ("category" | "payee", default: "category")
```

### Checks Paid Report
```http
GET /api/reports/checks-paid
Query Parameters:
- startDate: string (YYYY-MM-DD)
- endDate: string (YYYY-MM-DD)
- companyId: string (optional)
```

### Export Report to PDF
Add `-pdf` suffix to any report endpoint:
```http
GET /api/reports/profit-loss-pdf
GET /api/reports/tax-summary-pdf
GET /api/reports/expense-summary-pdf
GET /api/reports/checks-paid-pdf
```

## Error Responses

### Standard Error Format
```json
{
  "error": "Error Type",
  "message": "Human readable error message",
  "details": "Additional details (optional)"
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `500` - Internal Server Error

## Rate Limiting

- **PDF Upload**: 10 requests per minute per user
- **General API**: 100 requests per minute per user
- **Reports**: 20 requests per minute per user

## File Size Limits

- **PDF Upload**: 10MB maximum
- **Report Export**: Files are temporarily stored for 1 hour
