/**
 * @fileoverview Mock data for Check tests
 * @description Test fixtures for check service and controller tests
 */

// Mock user
export const mockUser = {
  id: 'user-123',
  uid: 'user-123',
  email: 'test@example.com',
  displayName: 'Test User'
};

// Valid check data for creation
export const validCheckData = {
  payee: 'Test Payee',
  amount: 150.00,
  date: '2024-02-15',
  type: 'expense',
  checkNumber: '1234',
  status: 'pending',
  category: 'Supplies',
  memo: 'Office supplies purchase'
};

// Valid income check data
export const validIncomeCheckData = {
  payee: 'Client ABC',
  amount: 500.00,
  date: '2024-02-20',
  type: 'income',
  checkNumber: '9876',
  status: 'pending',
  category: 'Sales',
  memo: 'Payment for services'
};

// Bulk check data
export const bulkCheckData = [
  {
    payee: 'Vendor 1',
    amount: 100.00,
    date: '2024-01-15',
    type: 'expense',
    checkNumber: '1001'
  },
  {
    payee: 'Client 1',
    amount: 250.00,
    date: '2024-01-16',
    type: 'income',
    checkNumber: '5001'
  },
  {
    payee: 'Vendor 2',
    amount: 75.50,
    date: '2024-01-17',
    type: 'expense',
    checkNumber: '1002'
  }
];

// Mock checks array
export const mockChecks = [
  {
    id: 'check-1',
    userId: 'user-123',
    payee: 'Office Depot',
    amount: 150.00,
    date: '2024-01-15',
    type: 'expense',
    status: 'cleared',
    checkNumber: '1234',
    category: 'Supplies',
    companyId: 'company-1',
    hasImage: true,
    fileUrl: 'https://storage.example.com/check-1.jpg',
    memo: 'Office supplies',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z')
  },
  {
    id: 'check-2',
    userId: 'user-123',
    payee: 'ABC Consulting',
    amount: 500.00,
    date: '2024-01-20',
    type: 'income',
    status: 'cleared',
    checkNumber: '9001',
    category: 'Sales',
    companyId: 'company-1',
    hasImage: false,
    fileUrl: '',
    memo: 'Consulting payment received',
    createdAt: new Date('2024-01-20T10:00:00Z'),
    updatedAt: new Date('2024-01-20T10:00:00Z')
  },
  {
    id: 'check-3',
    userId: 'user-123',
    payee: 'Electric Company',
    amount: 200.00,
    date: '2024-02-01',
    type: 'expense',
    status: 'pending',
    checkNumber: '1235',
    category: 'Utilities',
    companyId: 'company-1',
    hasImage: false,
    fileUrl: '',
    memo: 'Monthly electricity',
    createdAt: new Date('2024-02-01T10:00:00Z'),
    updatedAt: new Date('2024-02-01T10:00:00Z')
  },
  {
    id: 'check-4',
    userId: 'user-123',
    payee: 'Bad Check Guy',
    amount: 1000.00,
    date: '2024-02-05',
    type: 'income',
    status: 'bounced',
    checkNumber: '9002',
    category: 'Sales',
    companyId: 'company-1',
    hasImage: true,
    fileUrl: 'https://storage.example.com/check-4.jpg',
    memo: 'Bounced payment - follow up required',
    createdAt: new Date('2024-02-05T10:00:00Z'),
    updatedAt: new Date('2024-02-10T10:00:00Z')
  },
  {
    id: 'check-5',
    userId: 'user-123',
    payee: 'Cancelled Vendor',
    amount: 350.00,
    date: '2024-02-10',
    type: 'expense',
    status: 'voided',
    checkNumber: '1236',
    category: 'Services',
    companyId: 'company-2',
    hasImage: false,
    fileUrl: '',
    memo: 'Voided - wrong amount',
    createdAt: new Date('2024-02-10T10:00:00Z'),
    updatedAt: new Date('2024-02-11T10:00:00Z')
  }
];

// Check with linked transaction
export const checkWithTransaction = {
  id: 'check-linked',
  userId: 'user-123',
  payee: 'Linked Payee',
  amount: 275.00,
  date: '2024-03-01',
  type: 'expense',
  status: 'cleared',
  checkNumber: '2001',
  transactionId: 'tx-linked-123',
  hasImage: true,
  fileUrl: 'https://storage.example.com/check-linked.jpg',
  createdAt: new Date('2024-03-01T10:00:00Z'),
  updatedAt: new Date('2024-03-01T10:00:00Z')
};

// Invalid check data scenarios
export const invalidCheckData = {
  missingPayee: {
    amount: 100,
    date: '2024-01-15',
    type: 'expense'
  },
  missingAmount: {
    payee: 'Test',
    date: '2024-01-15',
    type: 'expense'
  },
  invalidType: {
    payee: 'Test',
    amount: 100,
    date: '2024-01-15',
    type: 'invalid'
  },
  invalidStatus: {
    payee: 'Test',
    amount: 100,
    date: '2024-01-15',
    type: 'expense',
    status: 'invalid-status'
  },
  negativeAmount: {
    payee: 'Test',
    amount: -100,
    date: '2024-01-15',
    type: 'expense'
  },
  zeroAmount: {
    payee: 'Test',
    amount: 0,
    date: '2024-01-15',
    type: 'expense'
  }
};

// Mock transactions for bulkCreateFromTransactions
export const mockTransactionsForChecks = [
  {
    id: 'tx-1',
    payee: 'Expense Transaction',
    amount: -150.00, // Negative = expense
    date: '2024-01-15',
    description: 'Check #1001'
  },
  {
    id: 'tx-2',
    payee: 'Income Transaction',
    amount: 300.00, // Positive = income
    date: '2024-01-20',
    description: 'Check #9001'
  },
  {
    id: 'tx-3',
    payee: 'Another Expense',
    amount: -75.50,
    date: '2024-01-25',
    description: 'Check #1002'
  }
];

// Mock file for upload tests
export const mockFile = {
  originalname: 'check-image.jpg',
  mimetype: 'image/jpeg',
  size: 1024000, // 1MB
  buffer: Buffer.from('fake-image-data'),
  path: '/tmp/uploads/check-image.jpg'
};

// Mock PDF file
export const mockPdfFile = {
  originalname: 'check-scan.pdf',
  mimetype: 'application/pdf',
  size: 2048000, // 2MB
  buffer: Buffer.from('fake-pdf-data'),
  path: '/tmp/uploads/check-scan.pdf'
};

// Check statistics mock
export const mockCheckStats = {
  totalChecks: 10,
  incomeCount: 4,
  incomeTotal: 2500.00,
  expenseCount: 6,
  expenseTotal: 1850.00,
  netAmount: 650.00,
  byStatus: {
    pending: 3,
    cleared: 5,
    bounced: 1,
    voided: 1,
    cancelled: 0
  },
  byType: {
    income: 4,
    expense: 6
  },
  withImage: 4,
  withoutImage: 6
};

// Filter scenarios
export const filterScenarios = {
  byType: { type: 'expense' },
  byStatus: { status: 'cleared' },
  byCompany: { companyId: 'company-1' },
  byDateRange: { startDate: '2024-01-01', endDate: '2024-03-31' },
  byHasImage: { hasImage: true },
  combined: {
    type: 'expense',
    status: 'pending',
    companyId: 'company-1',
    startDate: '2024-01-01',
    endDate: '2024-12-31'
  }
};

export default {
  mockUser,
  mockChecks,
  validCheckData,
  validIncomeCheckData,
  bulkCheckData,
  checkWithTransaction,
  invalidCheckData,
  mockTransactionsForChecks,
  mockFile,
  mockPdfFile,
  mockCheckStats,
  filterScenarios
};
