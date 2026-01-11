/**
 * @file supabaseClient.test.js
 * @description Comprehensive tests for the Supabase client service
 * Tests all CRUD operations for transactions, companies, payees, and reports
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock firebase auth before importing supabaseClient
vi.mock('../../services/firebase', () => ({
  auth: {
    currentUser: { uid: 'test-user-123' },
  },
}));

// Mock Supabase client with inline factory
const mockFrom = vi.fn();
const mockStorage = {
  from: vi.fn().mockReturnValue({
    upload: vi.fn().mockResolvedValue({ data: { path: 'test/path' }, error: null }),
    getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'http://test.com/file' } }),
  }),
};

vi.mock('../../services/supabase', () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test/path' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'http://test.com/file' } }),
      }),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-123' } }, error: null }),
    },
  },
}));

// Import after mocks are set up
import { supabase } from '../../services/supabase';

// Helper to create chainable mock - defined after imports
const createChainMock = (returnData = null, returnError = null) => {
  const chain = {
    data: returnData,
    error: returnError,
    count: Array.isArray(returnData) ? returnData.length : 0,
  };
  
  const chainable = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(chain),
    maybeSingle: vi.fn().mockResolvedValue(chain),
  };
  
  // Make the chain awaitable
  chainable[Symbol.toStringTag] = 'Promise';
  chainable.then = (resolve) => Promise.resolve(chain).then(resolve);
  chainable.catch = (reject) => Promise.resolve(chain).catch(reject);
  
  return chainable;
};

describe('supabaseClient', () => {
  let supabaseClient;
  
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    
    // Re-import with fresh mocks
    const module = await import('../../services/supabaseClient');
    supabaseClient = module.supabaseClient;
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('transactions', () => {
    describe('getAll', () => {
      it('should fetch all transactions for user', async () => {
        const mockTransactions = [
          { id: '1', description: 'Test 1', amount: 100, date: '2024-01-01', user_id: 'test-user-123', type: 'expense' },
          { id: '2', description: 'Test 2', amount: 200, date: '2024-01-02', user_id: 'test-user-123', type: 'income' },
        ];
        
        const chainMock = createChainMock(mockTransactions);
        supabase.from.mockReturnValue(chainMock);
        
        const result = await supabaseClient.transactions.getAll();
        
        expect(supabase.from).toHaveBeenCalledWith('transactions');
        expect(chainMock.select).toHaveBeenCalledWith('*', { count: 'exact' });
        expect(chainMock.eq).toHaveBeenCalledWith('user_id', 'test-user-123');
        expect(result.success).toBe(true);
        expect(result.data.transactions).toHaveLength(2);
      });

      it('should apply filters correctly', async () => {
        const chainMock = createChainMock([]);
        supabase.from.mockReturnValue(chainMock);
        
        await supabaseClient.transactions.getAll({
          companyId: 'company-1',
          type: 'expense',
          category: 'Travel',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          search: 'test',
          limit: 25,
          offset: 50,
        });
        
        expect(chainMock.eq).toHaveBeenCalledWith('company_id', 'company-1');
        expect(chainMock.eq).toHaveBeenCalledWith('type', 'expense');
        expect(chainMock.eq).toHaveBeenCalledWith('category', 'Travel');
        expect(chainMock.gte).toHaveBeenCalledWith('date', '2024-01-01');
        expect(chainMock.lte).toHaveBeenCalledWith('date', '2024-12-31');
        expect(chainMock.or).toHaveBeenCalled();
        expect(chainMock.range).toHaveBeenCalledWith(50, 74);
      });

      it('should handle errors gracefully', async () => {
        const chainMock = createChainMock(null, { message: 'Database error' });
        supabase.from.mockReturnValue(chainMock);
        
        await expect(supabaseClient.transactions.getAll()).rejects.toThrow();
      });
    });

    describe('getById', () => {
      it('should fetch a single transaction by id', async () => {
        const mockTransaction = { id: '1', description: 'Test', amount: 100, date: '2024-01-01', user_id: 'test-user-123' };
        
        const chainMock = createChainMock(mockTransaction);
        supabase.from.mockReturnValue(chainMock);
        
        const result = await supabaseClient.transactions.getById('1');
        
        expect(supabase.from).toHaveBeenCalledWith('transactions');
        expect(chainMock.eq).toHaveBeenCalledWith('id', '1');
        expect(result.success).toBe(true);
        expect(result.data.transaction).toBeDefined();
      });
    });

    describe('create', () => {
      it('should create a new transaction', async () => {
        const newTransaction = {
          description: 'New Transaction',
          amount: 150,
          date: '2024-01-15',
          type: 'expense',
          category: 'Office Supplies',
        };
        
        const createdTransaction = { 
          id: 'new-1', 
          ...newTransaction, 
          user_id: 'test-user-123',
          created_at: '2024-01-15T00:00:00Z' 
        };
        
        const chainMock = createChainMock(createdTransaction);
        supabase.from.mockReturnValue(chainMock);
        
        const result = await supabaseClient.transactions.create(newTransaction);
        
        expect(supabase.from).toHaveBeenCalledWith('transactions');
        expect(chainMock.insert).toHaveBeenCalled();
        expect(result.success).toBe(true);
      });
    });

    describe('update', () => {
      it('should update an existing transaction', async () => {
        const updateData = {
          description: 'Updated Description',
          amount: 200,
        };
        
        const updatedTransaction = { 
          id: '1', 
          description: 'Updated Description',
          amount: 200,
          user_id: 'test-user-123',
        };
        
        const chainMock = createChainMock(updatedTransaction);
        supabase.from.mockReturnValue(chainMock);
        
        const result = await supabaseClient.transactions.update('1', updateData);
        
        expect(supabase.from).toHaveBeenCalledWith('transactions');
        expect(chainMock.update).toHaveBeenCalled();
        expect(chainMock.eq).toHaveBeenCalledWith('id', '1');
        expect(result.success).toBe(true);
      });
    });

    describe('delete', () => {
      it('should delete a transaction', async () => {
        const chainMock = createChainMock(null);
        supabase.from.mockReturnValue(chainMock);
        
        const result = await supabaseClient.transactions.delete('1');
        
        expect(supabase.from).toHaveBeenCalledWith('transactions');
        expect(chainMock.delete).toHaveBeenCalled();
        expect(chainMock.eq).toHaveBeenCalledWith('id', '1');
        expect(result.success).toBe(true);
      });
    });

    describe('getSummary', () => {
      it('should get transaction summary by category', async () => {
        const mockTransactions = [
          { type: 'expense', amount: -100, category: 'Travel' },
          { type: 'expense', amount: -200, category: 'Travel' },
          { type: 'income', amount: 500, category: 'Sales' },
        ];
        
        const chainMock = createChainMock(mockTransactions);
        supabase.from.mockReturnValue(chainMock);
        
        const result = await supabaseClient.transactions.getSummary('2024-01-01', '2024-12-31');
        
        expect(supabase.from).toHaveBeenCalledWith('transactions');
        expect(result.success).toBe(true);
      });
    });
  });

  describe('companies', () => {
    describe('getAll', () => {
      it('should fetch all companies for user', async () => {
        const mockCompanies = [
          { id: '1', name: 'Company A', user_id: 'test-user-123' },
          { id: '2', name: 'Company B', user_id: 'test-user-123' },
        ];
        
        const chainMock = createChainMock(mockCompanies);
        supabase.from.mockReturnValue(chainMock);
        
        const result = await supabaseClient.companies.getAll();
        
        expect(supabase.from).toHaveBeenCalledWith('companies');
        expect(chainMock.eq).toHaveBeenCalledWith('user_id', 'test-user-123');
        expect(result.success).toBe(true);
        expect(result.data.companies).toHaveLength(2);
      });
    });

    describe('getById', () => {
      it('should fetch a company by id', async () => {
        const mockCompany = { id: '1', name: 'Test Company', user_id: 'test-user-123' };
        
        const chainMock = createChainMock(mockCompany);
        supabase.from.mockReturnValue(chainMock);
        
        const result = await supabaseClient.companies.getById('1');
        
        expect(supabase.from).toHaveBeenCalledWith('companies');
        expect(chainMock.eq).toHaveBeenCalledWith('id', '1');
        expect(result.success).toBe(true);
        expect(result.data.company).toBeDefined();
      });
    });

    describe('create', () => {
      it('should create a new company', async () => {
        const newCompany = {
          name: 'New Company',
          legalName: 'New Company LLC',
          businessType: 'LLC',
          taxId: '12-3456789',
        };
        
        const createdCompany = { 
          id: 'new-1', 
          name: 'New Company',
          legal_name: 'New Company LLC',
          business_type: 'LLC',
          user_id: 'test-user-123',
        };
        
        const chainMock = createChainMock(createdCompany);
        supabase.from.mockReturnValue(chainMock);
        
        const result = await supabaseClient.companies.create(newCompany);
        
        expect(supabase.from).toHaveBeenCalledWith('companies');
        expect(chainMock.insert).toHaveBeenCalled();
        expect(result.success).toBe(true);
        expect(result.data.company).toBeDefined();
      });
    });

    describe('update', () => {
      it('should update a company', async () => {
        const updateData = {
          name: 'Updated Company Name',
          status: 'inactive',
        };
        
        const updatedCompany = { 
          id: '1', 
          name: 'Updated Company Name',
          status: 'inactive',
          user_id: 'test-user-123',
        };
        
        const chainMock = createChainMock(updatedCompany);
        supabase.from.mockReturnValue(chainMock);
        
        const result = await supabaseClient.companies.update('1', updateData);
        
        expect(supabase.from).toHaveBeenCalledWith('companies');
        expect(chainMock.update).toHaveBeenCalled();
        expect(result.success).toBe(true);
      });
    });

    describe('delete', () => {
      it('should delete a company', async () => {
        const chainMock = createChainMock(null);
        supabase.from.mockReturnValue(chainMock);
        
        const result = await supabaseClient.companies.delete('1');
        
        expect(supabase.from).toHaveBeenCalledWith('companies');
        expect(chainMock.delete).toHaveBeenCalled();
        expect(result.success).toBe(true);
      });
    });

    describe('setDefault', () => {
      it('should set a company as default', async () => {
        const chainMock = createChainMock({ id: '1', is_default: true });
        supabase.from.mockReturnValue(chainMock);
        
        const result = await supabaseClient.companies.setDefault('1');
        
        expect(supabase.from).toHaveBeenCalledWith('companies');
        // First call unsets existing default, second sets new default
        expect(chainMock.update).toHaveBeenCalled();
        expect(result.success).toBe(true);
      });
    });
  });

  describe('payees', () => {
    describe('getAll', () => {
      it('should fetch all payees for user', async () => {
        const mockPayees = [
          { id: '1', name: 'Payee A', user_id: 'test-user-123' },
          { id: '2', name: 'Payee B', user_id: 'test-user-123' },
        ];
        
        const chainMock = createChainMock(mockPayees);
        supabase.from.mockReturnValue(chainMock);
        
        const result = await supabaseClient.payees.getAll();
        
        expect(supabase.from).toHaveBeenCalledWith('payees');
        expect(result.success).toBe(true);
        expect(result.data.payees).toHaveLength(2);
      });
    });

    describe('create', () => {
      it('should create a new payee', async () => {
        const newPayee = {
          name: 'New Payee',
          type: 'vendor',
          defaultExpenseCategory: 'Travel',
          email: 'vendor@example.com',
          phone: '555-1234',
        };
        
        const createdPayee = { 
          id: 'new-1', 
          name: 'New Payee',
          type: 'vendor',
          default_expense_category: 'Travel',
          email: 'vendor@example.com',
          phone: '555-1234',
          user_id: 'test-user-123',
          is_active: true,
        };
        
        const chainMock = createChainMock(createdPayee);
        supabase.from.mockReturnValue(chainMock);
        
        const result = await supabaseClient.payees.create(newPayee);
        
        expect(supabase.from).toHaveBeenCalledWith('payees');
        expect(chainMock.insert).toHaveBeenCalled();
        expect(result.success).toBe(true);
      });

      it('should create an employee payee with all fields', async () => {
        const newEmployee = {
          name: 'John Employee',
          type: 'employee',
          email: 'john@company.com',
          phone: '555-5678',
          position: 'Developer',
          department: 'Engineering',
          employeeId: 'EMP-001',
          hireDate: '2024-01-15',
          preferredPaymentMethod: 'direct_deposit',
        };
        
        const createdEmployee = { 
          id: 'emp-1', 
          name: 'John Employee',
          type: 'employee',
          email: 'john@company.com',
          phone: '555-5678',
          position: 'Developer',
          department: 'Engineering',
          employee_id: 'EMP-001',
          hire_date: '2024-01-15',
          preferred_payment_method: 'direct_deposit',
          user_id: 'test-user-123',
          is_active: true,
        };
        
        const chainMock = createChainMock(createdEmployee);
        supabase.from.mockReturnValue(chainMock);
        
        const result = await supabaseClient.payees.create(newEmployee);
        
        expect(supabase.from).toHaveBeenCalledWith('payees');
        expect(chainMock.insert).toHaveBeenCalled();
        expect(result.success).toBe(true);
        expect(result.data.payee).toBeDefined();
      });
    });

    describe('update', () => {
      it('should update a payee', async () => {
        const updateData = {
          name: 'Updated Payee',
          defaultExpenseCategory: 'Office Supplies',
          phone: '555-9999',
        };
        
        const updatedPayee = { 
          id: '1', 
          name: 'Updated Payee',
          default_expense_category: 'Office Supplies',
          phone: '555-9999',
          user_id: 'test-user-123',
        };
        
        const chainMock = createChainMock(updatedPayee);
        supabase.from.mockReturnValue(chainMock);
        
        const result = await supabaseClient.payees.update('1', updateData);
        
        expect(supabase.from).toHaveBeenCalledWith('payees');
        expect(chainMock.update).toHaveBeenCalled();
        expect(result.success).toBe(true);
      });

      it('should update employee-specific fields', async () => {
        const updateData = {
          position: 'Senior Developer',
          department: 'R&D',
          ytdPaid: 50000.00,
        };
        
        const updatedEmployee = { 
          id: '1', 
          position: 'Senior Developer',
          department: 'R&D',
          ytd_paid: 50000.00,
          user_id: 'test-user-123',
        };
        
        const chainMock = createChainMock(updatedEmployee);
        supabase.from.mockReturnValue(chainMock);
        
        const result = await supabaseClient.payees.update('1', updateData);
        
        expect(supabase.from).toHaveBeenCalledWith('payees');
        expect(chainMock.update).toHaveBeenCalled();
        expect(result.success).toBe(true);
      });
    });

    describe('delete', () => {
      it('should delete a payee', async () => {
        const chainMock = createChainMock(null);
        supabase.from.mockReturnValue(chainMock);
        
        const result = await supabaseClient.payees.delete('1');
        
        expect(supabase.from).toHaveBeenCalledWith('payees');
        expect(chainMock.delete).toHaveBeenCalled();
        expect(result.success).toBe(true);
      });
    });

    describe('getVendors', () => {
      it('should fetch vendors (payees with type vendor)', async () => {
        const mockVendors = [
          { id: '1', name: 'Vendor A', type: 'vendor', is_active: true },
        ];
        
        const chainMock = createChainMock(mockVendors);
        supabase.from.mockReturnValue(chainMock);
        
        const result = await supabaseClient.payees.getVendors();
        
        expect(supabase.from).toHaveBeenCalledWith('payees');
        expect(chainMock.eq).toHaveBeenCalledWith('type', 'vendor');
        expect(result.success).toBe(true);
      });
    });
  });

  describe('reports', () => {
    describe('profitLoss', () => {
      it('should correctly classify transactions by type field, not amount sign', async () => {
        // Realistic data: type field determines income vs expense, amount can be any sign
        const mockTransactions = [
          { id: '1', type: 'income', amount: 1000, category: 'Sales', date: '2024-01-15' },
          { id: '2', type: 'deposit', amount: 500, category: 'Refunds', date: '2024-01-16' },
          { id: '3', type: 'expense', amount: -300, category: 'Travel', date: '2024-01-20' },
          { id: '4', type: 'expense', amount: 200, category: 'Office Supplies', date: '2024-01-25' }, // expense with positive amount
        ];
        
        const chainMock = createChainMock(mockTransactions);
        supabase.from.mockReturnValue(chainMock);
        
        const result = await supabaseClient.reports.profitLoss({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        });
        
        expect(result.success).toBe(true);
        
        // Income should be: 1000 (income) + 500 (deposit) = 1500
        expect(result.data.summary.grossIncome).toBe(1500);
        expect(result.data.summary.totalIncome).toBe(1500);
        
        // Expenses should be: 300 + 200 = 500 (both are type: expense)
        expect(result.data.summary.totalExpenses).toBe(500);
        
        // Net should be 1500 - 500 = 1000
        expect(result.data.summary.netIncome).toBe(1000);
      });

      it('should match getSummary calculation logic for consistency', async () => {
        // Test that profitLoss uses same logic as getSummary (which dashboard uses)
        const mockTransactions = [
          { id: '1', type: 'income', amount: 5000, category: 'Consulting', date: '2024-01-15' },
          { id: '2', type: 'expense', amount: -2000, category: 'Rent', date: '2024-01-20' },
          { id: '3', type: 'expense', amount: -500, category: 'Utilities', date: '2024-01-25' },
        ];
        
        const chainMock = createChainMock(mockTransactions);
        supabase.from.mockReturnValue(chainMock);
        
        const result = await supabaseClient.reports.profitLoss({});
        
        // Same calculation as getSummary should produce
        expect(result.data.summary.grossIncome).toBe(5000);
        expect(result.data.summary.totalExpenses).toBe(2500);
        expect(result.data.summary.netIncome).toBe(2500);
      });

      it('should return correct structure for ReportPreview UI', async () => {
        const mockTransactions = [
          { id: '1', type: 'income', amount: 1000, category: 'Sales', date: '2024-01-15' },
          { id: '2', type: 'expense', amount: -300, category: 'Travel', date: '2024-01-20' },
        ];
        
        const chainMock = createChainMock(mockTransactions);
        supabase.from.mockReturnValue(chainMock);
        
        const result = await supabaseClient.reports.profitLoss({});
        
        // Verify summary structure for MetricCard components
        expect(result.data.summary).toBeDefined();
        expect(result.data.summary.grossIncome).toBeDefined();
        expect(result.data.summary.totalExpenses).toBeDefined();
        expect(result.data.summary.netIncome).toBeDefined();
        expect(result.data.summary.margin).toBeDefined();
        
        // Verify breakdown arrays for tables
        expect(result.data.income.breakdown).toBeInstanceOf(Array);
        expect(result.data.expenses.breakdown).toBeInstanceOf(Array);
        
        // Verify breakdown items have correct shape
        expect(result.data.income.breakdown[0]).toHaveProperty('category');
        expect(result.data.income.breakdown[0]).toHaveProperty('amount');
        expect(result.data.expenses.breakdown[0]).toHaveProperty('category');
        expect(result.data.expenses.breakdown[0]).toHaveProperty('amount');
      });

      it('should apply company filter', async () => {
        const chainMock = createChainMock([]);
        supabase.from.mockReturnValue(chainMock);
        
        await supabaseClient.reports.profitLoss({
          companyId: 'company-1',
        });
        
        expect(chainMock.eq).toHaveBeenCalledWith('company_id', 'company-1');
      });
    });

    describe('taxSummary', () => {
      it('should use type field for income/expense classification', async () => {
        const mockTransactions = [
          { id: '1', type: 'income', amount: 10000, category: 'Sales', date: '2024-01-10' },
          { id: '2', type: 'expense', amount: -500, category: 'Advertising', date: '2024-01-10' },
          { id: '3', type: 'expense', amount: -300, category: 'Car & Truck', date: '2024-02-15' },
        ];
        
        const chainMock = createChainMock(mockTransactions);
        supabase.from.mockReturnValue(chainMock);
        
        const result = await supabaseClient.reports.taxSummary({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        });
        
        expect(result.success).toBe(true);
        expect(result.data.summary.totalDeductibleExpenses).toBe(800);
        
        // Verify Schedule C structure
        expect(result.data.scheduleC).toBeInstanceOf(Array);
        expect(result.data.laborPayments).toBeDefined();
      });
    });

    describe('expenseSummary', () => {
      it('should generate expense summary with categories array', async () => {
        const mockTransactions = [
          { id: '1', type: 'expense', amount: -500, category: 'Travel', date: '2024-01-10' },
          { id: '2', type: 'expense', amount: -300, category: 'Travel', date: '2024-02-15' },
          { id: '3', type: 'expense', amount: -200, category: 'Office', date: '2024-02-20' },
        ];
        
        const chainMock = createChainMock(mockTransactions);
        supabase.from.mockReturnValue(chainMock);
        
        const result = await supabaseClient.reports.expenseSummary({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        });
        
        expect(result.success).toBe(true);
        expect(result.data.summary.totalExpenses).toBe(1000);
        
        // Verify categories array structure for CategoryReportPreview
        expect(result.data.categories).toBeInstanceOf(Array);
        expect(result.data.categories.length).toBe(2); // Travel and Office
        
        // Travel should be first (higher amount)
        expect(result.data.categories[0].category).toBe('Travel');
        expect(result.data.categories[0].amount).toBe(800);
        expect(result.data.categories[0].percentage).toBe(80);
        
        expect(result.data.categories[1].category).toBe('Office');
        expect(result.data.categories[1].amount).toBe(200);
        expect(result.data.categories[1].percentage).toBe(20);
      });
    });
  });

  describe('error handling', () => {
    it('should throw on database errors for transactions', async () => {
      const chainMock = createChainMock(null, { message: 'Connection failed' });
      supabase.from.mockReturnValue(chainMock);
      
      await expect(supabaseClient.transactions.getAll()).rejects.toThrow();
    });

    it('should throw on database errors for companies', async () => {
      const chainMock = createChainMock(null, { message: 'Permission denied' });
      supabase.from.mockReturnValue(chainMock);
      
      await expect(supabaseClient.companies.getAll()).rejects.toThrow();
    });

    it('should throw on database errors for payees', async () => {
      const chainMock = createChainMock(null, { message: 'Table not found' });
      supabase.from.mockReturnValue(chainMock);
      
      await expect(supabaseClient.payees.getAll()).rejects.toThrow();
    });
  });

  describe('data transformation', () => {
    it('should transform snake_case to camelCase for transactions', async () => {
      const dbTransaction = {
        id: '1',
        user_id: 'test-user-123',
        company_id: 'company-1',
        upload_id: 'upload-1',
        statement_id: 'stmt-1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        amount: 100,
        description: 'Test',
        payee_id: 'payee-1',
      };
      
      const chainMock = createChainMock([dbTransaction]);
      supabase.from.mockReturnValue(chainMock);
      
      const result = await supabaseClient.transactions.getAll();
      const tx = result.data.transactions[0];
      
      // Check that snake_case was transformed to camelCase
      expect(tx).toHaveProperty('id');
      expect(tx).toHaveProperty('companyId');
      expect(tx).toHaveProperty('uploadId');
      expect(tx).toHaveProperty('statementId');
      expect(tx).toHaveProperty('payeeId');
      expect(tx).toHaveProperty('createdAt');
      expect(tx).toHaveProperty('updatedAt');
    });

    it('should transform snake_case to camelCase for companies', async () => {
      const dbCompany = {
        id: '1',
        user_id: 'test-user-123',
        legal_name: 'Test Company LLC',
        business_type: 'LLC',
        tax_id: '12-3456789',
        is_active: true,
        is_default: false,
        created_at: '2024-01-01T00:00:00Z',
      };
      
      const chainMock = createChainMock([dbCompany]);
      supabase.from.mockReturnValue(chainMock);
      
      const result = await supabaseClient.companies.getAll();
      const company = result.data.companies[0];
      
      expect(company).toHaveProperty('legalName');
      expect(company).toHaveProperty('businessType');
      expect(company).toHaveProperty('taxId');
      expect(company).toHaveProperty('isActive');
    });

    it('should transform snake_case to camelCase for payees', async () => {
      const dbPayee = {
        id: '1',
        user_id: 'test-user-123',
        name: 'Test Payee',
        type: 'vendor',
        business_name: 'Test Business',
        email: 'test@example.com',
        phone: '555-1234',
        tax_id: '12-3456789',
        is_1099_required: true,
        employee_id: 'EMP-001',
        position: 'Manager',
        department: 'Sales',
        hire_date: '2024-01-15',
        is_active: true,
        preferred_payment_method: 'check',
        vendor_id: 'VND-001',
        category: 'Contractor',
        default_expense_category: 'Professional Services',
        ytd_paid: 25000.00,
        address: { street: '123 Main St', city: 'Anytown' },
        bank_account: { routing: '123456789', account: '987654321' },
        notes: 'Some notes',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };
      
      const chainMock = createChainMock([dbPayee]);
      supabase.from.mockReturnValue(chainMock);
      
      const result = await supabaseClient.payees.getAll();
      const payee = result.data.payees[0];
      
      // Verify all snake_case to camelCase transformations
      expect(payee).toHaveProperty('id', '1');
      expect(payee).toHaveProperty('name', 'Test Payee');
      expect(payee).toHaveProperty('type', 'vendor');
      expect(payee).toHaveProperty('businessName', 'Test Business');
      expect(payee).toHaveProperty('email', 'test@example.com');
      expect(payee).toHaveProperty('phone', '555-1234');
      expect(payee).toHaveProperty('taxId', '12-3456789');
      expect(payee).toHaveProperty('is1099Required', true);
      expect(payee).toHaveProperty('employeeId', 'EMP-001');
      expect(payee).toHaveProperty('position', 'Manager');
      expect(payee).toHaveProperty('department', 'Sales');
      expect(payee).toHaveProperty('hireDate', '2024-01-15');
      expect(payee).toHaveProperty('isActive', true);
      expect(payee).toHaveProperty('preferredPaymentMethod', 'check');
      expect(payee).toHaveProperty('vendorId', 'VND-001');
      expect(payee).toHaveProperty('category', 'Contractor');
      expect(payee).toHaveProperty('defaultExpenseCategory', 'Professional Services');
      expect(payee).toHaveProperty('ytdPaid', 25000.00);
      expect(payee).toHaveProperty('address');
      expect(payee.address).toEqual({ street: '123 Main St', city: 'Anytown' });
      expect(payee).toHaveProperty('bankAccount');
      expect(payee.bankAccount).toEqual({ routing: '123456789', account: '987654321' });
      expect(payee).toHaveProperty('notes', 'Some notes');
      expect(payee).toHaveProperty('createdAt');
      expect(payee).toHaveProperty('updatedAt');
    });
  });

  describe('pagination', () => {
    it('should use default pagination when not specified', async () => {
      const chainMock = createChainMock([]);
      supabase.from.mockReturnValue(chainMock);
      
      await supabaseClient.transactions.getAll();
      
      // Default: limit 50, offset 0, range(0, 49)
      expect(chainMock.range).toHaveBeenCalledWith(0, 49);
    });

    it('should apply custom pagination', async () => {
      const chainMock = createChainMock([]);
      supabase.from.mockReturnValue(chainMock);
      
      await supabaseClient.transactions.getAll({ limit: 100, offset: 200 });
      
      // Custom: limit 100, offset 200, range(200, 299)
      expect(chainMock.range).toHaveBeenCalledWith(200, 299);
    });
  });
});
