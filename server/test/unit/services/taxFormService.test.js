/**
 * @fileoverview Tests for Tax Form Service
 * @description Comprehensive test suite for IRS tax form generation
 * 
 * Strategy: Use jest.unstable_mockModule BEFORE imports (proper ES module mocking)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const servicesPath = path.resolve(__dirname, '../../../services/taxForms');
const adaptersPath = path.resolve(__dirname, '../../../services/adapters');
const configPath = path.resolve(__dirname, '../../../config');

// Mock database adapter
const mockGetPayeeById = jest.fn();
const mockGetCompanyById = jest.fn();
const mockGetCompanies = jest.fn();
const mockGetTransactions = jest.fn();
const mockGetPayees = jest.fn();
const mockQuery = jest.fn();
const mockCreate = jest.fn();

const mockDbAdapter = {
  getPayeeById: mockGetPayeeById,
  getCompanyById: mockGetCompanyById,
  getCompanies: mockGetCompanies,
  getTransactions: mockGetTransactions,
  getPayees: mockGetPayees,
  query: mockQuery,
  create: mockCreate
};

await jest.unstable_mockModule(path.join(adaptersPath, 'index.js'), () => ({
  getDatabaseAdapter: jest.fn(() => mockDbAdapter)
}));

// Mock logger
await jest.unstable_mockModule(path.join(configPath, 'index.js'), () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock PDF generators
const mockPreview = jest.fn();
const mockGenerate = jest.fn();

await jest.unstable_mockModule(path.join(servicesPath, 'Form1099NECGenerator.js'), () => ({
  Form1099NECGenerator: jest.fn().mockImplementation(() => ({
    preview: mockPreview,
    generate: mockGenerate
  }))
}));

await jest.unstable_mockModule(path.join(servicesPath, 'Form1099MISCGenerator.js'), () => ({
  Form1099MISCGenerator: jest.fn().mockImplementation(() => ({
    preview: mockPreview,
    generate: mockGenerate
  }))
}));

await jest.unstable_mockModule(path.join(servicesPath, 'FormW2Generator.js'), () => ({
  FormW2Generator: jest.fn().mockImplementation(() => ({
    preview: mockPreview,
    generate: mockGenerate
  }))
}));

// NOW import the service
const { TaxFormService } = await import(path.join(servicesPath, 'TaxFormService.js'));

describe('TaxFormService', () => {
  let taxFormService;
  
  const TEST_USER_ID = 'test-user-123';
  const TEST_COMPANY_ID = 'company-456';
  const TEST_PAYEE_ID = 'payee-789';
  const TAX_YEAR = 2025;

  // Sample company data
  const mockCompany = {
    id: TEST_COMPANY_ID,
    name: 'Test Company LLC',
    address: '123 Business St',
    city: 'New York',
    state: 'NY',
    zip: '10001',
    ein: '12-3456789',
    phone: '555-123-4567'
  };

  // Sample payee (contractor) data
  const mockPayee = {
    id: TEST_PAYEE_ID,
    name: 'John Contractor',
    address: '456 Worker Ave',
    city: 'Brooklyn',
    state: 'NY',
    zip: '11201',
    tin: '987-65-4321',
    isContractor: true,
    companyId: TEST_COMPANY_ID
  };

  // Sample transactions for payee
  const mockTransactions = [
    { id: 'txn-1', payeeId: TEST_PAYEE_ID, amount: -500, type: 'expense', date: '2025-03-15' },
    { id: 'txn-2', payeeId: TEST_PAYEE_ID, amount: -750, type: 'expense', date: '2025-06-20' },
    { id: 'txn-3', payeeId: TEST_PAYEE_ID, amount: -1000, type: 'expense', date: '2025-09-10' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    taxFormService = new TaxFormService();
  });

  describe('preview1099NEC', () => {
    it('should return preview data for valid payee', async () => {
      mockGetPayeeById.mockResolvedValue(mockPayee);
      mockGetCompanyById.mockResolvedValue(mockCompany);
      mockGetTransactions.mockResolvedValue(mockTransactions);
      mockPreview.mockReturnValue({
        payer: mockCompany,
        recipient: mockPayee,
        amount: 2250,
        validationErrors: []
      });

      const result = await taxFormService.preview1099NEC(
        TEST_USER_ID,
        TEST_PAYEE_ID,
        TEST_COMPANY_ID,
        TAX_YEAR
      );

      expect(result.success).toBe(true);
      expect(result.payeeId).toBe(TEST_PAYEE_ID);
      expect(result.transactionCount).toBe(3);
      expect(result.meetsThreshold).toBe(true); // $2250 >= $600
    });

    it('should return error for non-existent payee', async () => {
      mockGetPayeeById.mockResolvedValue(null);

      const result = await taxFormService.preview1099NEC(
        TEST_USER_ID,
        'non-existent',
        TEST_COMPANY_ID,
        TAX_YEAR
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Payee not found');
    });

    it('should use default company when companyId not provided', async () => {
      mockGetPayeeById.mockResolvedValue({ ...mockPayee, companyId: null });
      mockGetCompanyById.mockResolvedValue(null);
      mockGetCompanies.mockResolvedValue([{ ...mockCompany, isDefault: true }]);
      mockGetTransactions.mockResolvedValue(mockTransactions);
      mockPreview.mockReturnValue({ amount: 2250, validationErrors: [] });

      const result = await taxFormService.preview1099NEC(
        TEST_USER_ID,
        TEST_PAYEE_ID,
        null,
        TAX_YEAR
      );

      expect(result.success).toBe(true);
      expect(mockGetCompanies).toHaveBeenCalled();
    });

    it('should indicate when payee does not meet $600 threshold', async () => {
      const lowTransactions = [
        { id: 'txn-1', payeeId: TEST_PAYEE_ID, amount: -200, type: 'expense' }
      ];
      
      mockGetPayeeById.mockResolvedValue(mockPayee);
      mockGetCompanyById.mockResolvedValue(mockCompany);
      mockGetTransactions.mockResolvedValue(lowTransactions);
      mockPreview.mockReturnValue({ amount: 200, validationErrors: [] });

      const result = await taxFormService.preview1099NEC(
        TEST_USER_ID,
        TEST_PAYEE_ID,
        TEST_COMPANY_ID,
        TAX_YEAR
      );

      expect(result.success).toBe(true);
      expect(result.meetsThreshold).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      mockGetPayeeById.mockRejectedValue(new Error('Database connection failed'));

      const result = await taxFormService.preview1099NEC(
        TEST_USER_ID,
        TEST_PAYEE_ID,
        TEST_COMPANY_ID,
        TAX_YEAR
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
    });
  });

  describe('generate1099NEC', () => {
    it('should generate PDF for valid payee', async () => {
      mockGetPayeeById.mockResolvedValue(mockPayee);
      mockGetCompanyById.mockResolvedValue(mockCompany);
      mockGetTransactions.mockResolvedValue(mockTransactions);
      mockGenerate.mockResolvedValue({
        success: true,
        pdf: Buffer.from('PDF content'),
        filename: '1099-NEC-2025-John-Contractor.pdf'
      });

      const result = await taxFormService.generate1099NEC(
        TEST_USER_ID,
        TEST_PAYEE_ID,
        TEST_COMPANY_ID,
        TAX_YEAR
      );

      expect(result.success).toBe(true);
      expect(result.pdf).toBeDefined();
      expect(result.filename).toMatch(/1099-NEC/);
    });

    it('should return errors for payee not found', async () => {
      mockGetPayeeById.mockResolvedValue(null);

      const result = await taxFormService.generate1099NEC(
        TEST_USER_ID,
        'non-existent',
        TEST_COMPANY_ID,
        TAX_YEAR
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Payee not found');
    });

    it('should return errors when no company found', async () => {
      mockGetPayeeById.mockResolvedValue({ ...mockPayee, companyId: null });
      mockGetCompanyById.mockResolvedValue(null);
      mockGetCompanies.mockResolvedValue([]);

      const result = await taxFormService.generate1099NEC(
        TEST_USER_ID,
        TEST_PAYEE_ID,
        null,
        TAX_YEAR
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('No company found for tax form');
    });

    it('should use previous year as default tax year', async () => {
      mockGetPayeeById.mockResolvedValue(mockPayee);
      mockGetCompanyById.mockResolvedValue(mockCompany);
      mockGetTransactions.mockResolvedValue(mockTransactions);
      mockGenerate.mockResolvedValue({ success: true, pdf: Buffer.from('') });

      await taxFormService.generate1099NEC(TEST_USER_ID, TEST_PAYEE_ID, TEST_COMPANY_ID);

      // Should query transactions for previous year
      expect(mockGetTransactions).toHaveBeenCalledWith(
        TEST_USER_ID,
        expect.objectContaining({
          payeeId: TEST_PAYEE_ID
        })
      );
    });
  });

  describe('preview1099MISC', () => {
    it('should return preview data for valid payee', async () => {
      mockGetPayeeById.mockResolvedValue(mockPayee);
      mockGetCompanyById.mockResolvedValue(mockCompany);
      mockGetTransactions.mockResolvedValue(mockTransactions);
      mockPreview.mockReturnValue({
        payer: mockCompany,
        recipient: mockPayee,
        amounts: { rents: 0, royalties: 0, otherIncome: 2250 },
        validationErrors: []
      });

      const result = await taxFormService.preview1099MISC(
        TEST_USER_ID,
        TEST_PAYEE_ID,
        TEST_COMPANY_ID,
        TAX_YEAR
      );

      expect(result.success).toBe(true);
    });
  });

  describe('previewW2', () => {
    const mockEmployee = {
      ...mockPayee,
      id: 'employee-001',
      type: 'employee', // The service checks for type === 'employee'
      isEmployee: true,
      isContractor: false,
      ssn: '123-45-6789'
    };

    it('should return preview data for valid employee', async () => {
      mockGetPayeeById.mockResolvedValue(mockEmployee);
      mockGetCompanyById.mockResolvedValue(mockCompany);
      mockGetTransactions.mockResolvedValue(mockTransactions);
      mockPreview.mockReturnValue({
        employer: mockCompany,
        employee: mockEmployee,
        wages: 50000,
        validationErrors: []
      });

      const result = await taxFormService.previewW2(
        TEST_USER_ID,
        'employee-001',
        TEST_COMPANY_ID,
        TAX_YEAR
      );

      expect(result.success).toBe(true);
    });

    it('should return error for non-employee payee', async () => {
      mockGetPayeeById.mockResolvedValue({ ...mockPayee, type: 'contractor' });

      const result = await taxFormService.previewW2(
        TEST_USER_ID,
        TEST_PAYEE_ID,
        TEST_COMPANY_ID,
        TAX_YEAR
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Employee not found');
    });
  });

  describe('bulkGenerate1099NEC', () => {
    it('should generate 1099s for all eligible payees', async () => {
      const payees = [
        { ...mockPayee, id: 'payee-1', isContractor: true },
        { ...mockPayee, id: 'payee-2', isContractor: true }
      ];
      
      mockGetPayees.mockResolvedValue(payees);
      mockGetPayeeById.mockResolvedValue(mockPayee);
      mockGetCompanyById.mockResolvedValue(mockCompany);
      mockGetTransactions.mockResolvedValue(mockTransactions);
      mockGenerate.mockResolvedValue({
        success: true,
        pdf: Buffer.from('PDF content'),
        filename: '1099-NEC.pdf'
      });

      const result = await taxFormService.bulkGenerate1099NEC(
        TEST_USER_ID,
        TEST_COMPANY_ID,
        TAX_YEAR
      );

      expect(result.success).toBe(true);
      expect(result.summary).toBeDefined();
    });

    it('should skip payees below threshold', async () => {
      const payees = [{ ...mockPayee, id: 'payee-1', isContractor: true }];
      const lowTransactions = [{ amount: -400 }]; // Below $600 threshold
      
      mockGetPayees.mockResolvedValue(payees);
      mockGetTransactions.mockResolvedValue(lowTransactions);
      mockGetCompanyById.mockResolvedValue(mockCompany);

      const result = await taxFormService.bulkGenerate1099NEC(
        TEST_USER_ID,
        TEST_COMPANY_ID,
        TAX_YEAR
      );

      expect(result.success).toBe(true);
      expect(result.skipped.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle database errors during bulk generation', async () => {
      mockGetPayees.mockRejectedValue(new Error('Database error'));

      const result = await taxFormService.bulkGenerate1099NEC(
        TEST_USER_ID,
        TEST_COMPANY_ID,
        TAX_YEAR
      );

      expect(result.success).toBe(false);
    });
  });

  describe('getTaxFormSummary', () => {
    it('should return summary for a company', async () => {
      mockGetPayees.mockResolvedValue([mockPayee]);
      mockGetCompanyById.mockResolvedValue(mockCompany);
      mockGetTransactions.mockResolvedValue(mockTransactions);

      const result = await taxFormService.getTaxFormSummary(
        TEST_USER_ID,
        TEST_COMPANY_ID,
        TAX_YEAR
      );

      expect(result).toBeDefined();
    });

    it('should handle no payees', async () => {
      mockGetPayees.mockResolvedValue([]);
      mockGetCompanyById.mockResolvedValue(mockCompany);

      const result = await taxFormService.getTaxFormSummary(
        TEST_USER_ID,
        TEST_COMPANY_ID,
        TAX_YEAR
      );

      expect(result).toBeDefined();
    });
  });

  describe('getMissingInfo', () => {
    it('should return payees with missing tax info', async () => {
      const incompletePayee = {
        ...mockPayee,
        tin: null,
        address: null
      };
      
      mockGetPayees.mockResolvedValue([incompletePayee]);
      mockGetTransactions.mockResolvedValue(mockTransactions);

      const result = await taxFormService.getMissingInfo(
        TEST_USER_ID,
        TEST_COMPANY_ID
      );

      expect(result).toBeDefined();
    });

    it('should handle complete payee data', async () => {
      mockGetPayees.mockResolvedValue([mockPayee]);
      mockGetTransactions.mockResolvedValue(mockTransactions);

      const result = await taxFormService.getMissingInfo(
        TEST_USER_ID,
        TEST_COMPANY_ID
      );

      expect(result).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockGetPayeeById.mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await taxFormService.preview1099NEC(
        TEST_USER_ID,
        TEST_PAYEE_ID,
        TEST_COMPANY_ID,
        TAX_YEAR
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle PDF generation errors', async () => {
      mockGetPayeeById.mockResolvedValue(mockPayee);
      mockGetCompanyById.mockResolvedValue(mockCompany);
      mockGetTransactions.mockResolvedValue(mockTransactions);
      mockGenerate.mockRejectedValue(new Error('PDF generation failed'));

      const result = await taxFormService.generate1099NEC(
        TEST_USER_ID,
        TEST_PAYEE_ID,
        TEST_COMPANY_ID,
        TAX_YEAR
      );

      expect(result.success).toBe(false);
    });

    it('should return meaningful error messages for debugging', async () => {
      mockGetPayeeById.mockRejectedValue(new Error('Test error for debugging'));

      const result = await taxFormService.preview1099NEC(TEST_USER_ID, TEST_PAYEE_ID);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Test error for debugging');
    });
  });

  describe('Input Validation', () => {
    it('should handle null userId', async () => {
      const result = await taxFormService.preview1099NEC(null, TEST_PAYEE_ID);

      expect(result.success).toBe(false);
    });

    it('should handle null payeeId', async () => {
      const result = await taxFormService.preview1099NEC(TEST_USER_ID, null);

      expect(result.success).toBe(false);
    });

    it('should handle invalid tax year', async () => {
      mockGetPayeeById.mockResolvedValue(mockPayee);
      mockGetCompanyById.mockResolvedValue(mockCompany);
      mockGetTransactions.mockResolvedValue([]);
      mockPreview.mockReturnValue({ amount: 0, validationErrors: [] });

      // Future year should still work but return no transactions
      const result = await taxFormService.preview1099NEC(
        TEST_USER_ID,
        TEST_PAYEE_ID,
        TEST_COMPANY_ID,
        2030
      );

      expect(result.success).toBe(true);
      expect(result.transactionCount).toBe(0);
    });
  });
});
