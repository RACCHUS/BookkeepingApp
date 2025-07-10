/**
 * @fileoverview Mock Data - Comprehensive test fixtures
 * @description Provides realistic mock data for testing all services
 * @version 1.0.0
 */

export const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  name: 'Test User',
  createdAt: new Date('2025-01-01').toISOString(),
  updatedAt: new Date('2025-01-01').toISOString()
};

export const mockCompany = {
  id: 'test-company-456',
  name: 'Test Company LLC',
  taxId: '12-3456789',
  address: {
    street: '123 Test St',
    city: 'Test City',
    state: 'TS',
    zipCode: '12345'
  },
  userId: mockUser.id,
  isDefault: true,
  createdAt: new Date('2025-01-01').toISOString(),
  updatedAt: new Date('2025-01-01').toISOString()
};

export const mockTransactions = [
  {
    id: 'test-transaction-1',
    date: '2025-07-01',
    amount: 1500.00,
    description: 'Software Development Consulting',
    category: 'Business Income',
    type: 'income',
    payee: 'Tech Corp Ltd',
    userId: mockUser.id,
    companyId: mockCompany.id,
    statementId: 'test-statement-1',
    createdAt: new Date('2025-07-01').toISOString(),
    updatedAt: new Date('2025-07-01').toISOString()
  },
  {
    id: 'test-transaction-2',
    date: '2025-07-02',
    amount: 85.50,
    description: 'Office Supplies - Staples',
    category: 'Office Expenses',
    type: 'expense',
    payee: 'Staples',
    userId: mockUser.id,
    companyId: mockCompany.id,
    statementId: 'test-statement-1',
    createdAt: new Date('2025-07-02').toISOString(),
    updatedAt: new Date('2025-07-02').toISOString()
  },
  {
    id: 'test-transaction-3',
    date: '2025-07-03',
    amount: 250.00,
    description: 'Monthly Internet Service',
    category: 'Utilities',
    type: 'expense',
    payee: 'ISP Provider',
    userId: mockUser.id,
    companyId: mockCompany.id,
    statementId: 'test-statement-1',
    createdAt: new Date('2025-07-03').toISOString(),
    updatedAt: new Date('2025-07-03').toISOString()
  }
];

export const mockPayees = [
  {
    id: 'test-payee-1',
    name: 'John Doe',
    type: 'employee',
    email: 'john.doe@company.com',
    userId: mockUser.id,
    companyId: mockCompany.id,
    is1099Required: false,
    isActive: true,
    position: 'Developer',
    createdAt: new Date('2025-01-01').toISOString(),
    updatedAt: new Date('2025-01-01').toISOString()
  },
  {
    id: 'test-payee-2',
    name: 'ABC Services LLC',
    type: 'vendor',
    email: 'billing@abcservices.com',
    userId: mockUser.id,
    companyId: mockCompany.id,
    is1099Required: true,
    isActive: true,
    category: 'Professional Services',
    createdAt: new Date('2025-01-01').toISOString(),
    updatedAt: new Date('2025-01-01').toISOString()
  }
];

export const mockClassificationRules = [
  {
    id: 'test-rule-1',
    name: 'Office Supplies Rule',
    keywords: ['staples', 'office depot', 'supplies'],
    category: 'Office Expenses',
    priority: 1,
    userId: mockUser.id,
    isActive: true,
    createdAt: new Date('2025-01-01').toISOString(),
    updatedAt: new Date('2025-01-01').toISOString()
  },
  {
    id: 'test-rule-2',
    name: 'Software Services Rule',
    keywords: ['software', 'saas', 'subscription'],
    category: 'Software & Technology',
    priority: 2,
    userId: mockUser.id,
    isActive: true,
    createdAt: new Date('2025-01-01').toISOString(),
    updatedAt: new Date('2025-01-01').toISOString()
  }
];

export const mockUpload = {
  id: 'test-upload-1',
  filename: 'test-statement.pdf',
  originalFilename: 'chase-statement-july-2025.pdf',
  size: 150000,
  mimetype: 'application/pdf',
  userId: mockUser.id,
  companyId: mockCompany.id,
  status: 'completed',
  transactionCount: 3,
  createdAt: new Date('2025-07-01').toISOString(),
  updatedAt: new Date('2025-07-01').toISOString()
};

// Helper function to generate mock data with overrides
export const createMockData = (type, overrides = {}) => {
  const mockDataMap = {
    user: mockUser,
    company: mockCompany,
    transaction: mockTransactions[0],
    payee: mockPayees[0],
    rule: mockClassificationRules[0],
    upload: mockUpload
  };

  return {
    ...mockDataMap[type],
    ...overrides
  };
};
