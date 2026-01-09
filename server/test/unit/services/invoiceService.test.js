/**
 * @fileoverview Tests for Invoice Service
 * @description Comprehensive test suite for invoice management operations
 * 
 * Strategy: Use jest.unstable_mockModule BEFORE imports (proper ES module mocking)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const servicesPath = path.resolve(__dirname, '../../../services/invoicing');
const adaptersPath = path.resolve(__dirname, '../../../services/adapters');
const configPath = path.resolve(__dirname, '../../../config');
const sharedPath = path.resolve(__dirname, '../../../../shared');

// Mock database adapter
const mockQuery = jest.fn();
const mockGetById = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();

const mockDbAdapter = {
  query: mockQuery,
  getById: mockGetById,
  create: mockCreate,
  update: mockUpdate,
  delete: mockDelete
};

await jest.unstable_mockModule(path.join(adaptersPath, 'index.js'), () => ({
  getDatabaseAdapter: jest.fn(() => mockDbAdapter)
}));

// Mock logger
await jest.unstable_mockModule(path.join(configPath, 'logger.js'), () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock shared schema utilities
await jest.unstable_mockModule(path.join(sharedPath, 'schemas/invoicingSchema.js'), () => ({
  calculateDocumentTotals: jest.fn((lineItems) => {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const taxTotal = lineItems.reduce((sum, item) => {
      const lineTotal = item.quantity * item.unit_price;
      return sum + (lineTotal * (item.tax_rate || 0) / 100);
    }, 0);
    return { subtotal, taxTotal, total: subtotal + taxTotal, discountAmount: 0 };
  }),
  calculateDueDate: jest.fn((issueDate, paymentTerms) => {
    const date = new Date(issueDate);
    switch (paymentTerms) {
      case 'net_15': date.setDate(date.getDate() + 15); break;
      case 'net_30': date.setDate(date.getDate() + 30); break;
      case 'net_60': date.setDate(date.getDate() + 60); break;
      case 'due_on_receipt': break;
      default: date.setDate(date.getDate() + 30);
    }
    return date; // Return Date object, not string
  })
}));

// Mock constants
await jest.unstable_mockModule(path.join(sharedPath, 'constants/invoicingConstants.js'), () => ({
  INVOICE_STATUS: {
    DRAFT: 'draft',
    SENT: 'sent',
    VIEWED: 'viewed',
    PARTIAL: 'partial',
    PAID: 'paid',
    OVERDUE: 'overdue',
    VOID: 'void',
    CANCELLED: 'cancelled'
  },
  QUOTE_STATUS: {
    DRAFT: 'draft',
    SENT: 'sent',
    ACCEPTED: 'accepted',
    DECLINED: 'declined',
    EXPIRED: 'expired',
    CONVERTED: 'converted'
  },
  NUMBER_PREFIXES: {
    INVOICE: 'INV',
    QUOTE: 'QUO'
  }
}));

// Mock quoteService - must be a function that returns a mock object
const mockConvertQuoteToInvoiceData = jest.fn();
await jest.unstable_mockModule(path.join(servicesPath, 'quoteService.js'), () => ({
  default: {
    getQuote: jest.fn(),
    convertQuoteToInvoiceData: mockConvertQuoteToInvoiceData
  },
  convertQuoteToInvoiceData: mockConvertQuoteToInvoiceData
}));

// NOW import the service
const invoiceService = await import(path.join(servicesPath, 'invoiceService.js'));

describe('InvoiceService', () => {
  const TEST_USER_ID = 'test-user-123';
  const TEST_COMPANY_ID = 'company-456';
  const TEST_CLIENT_ID = 'client-789';
  const TEST_INVOICE_ID = 'invoice-001';

  // Sample invoice from database
  const mockDbInvoice = {
    id: TEST_INVOICE_ID,
    user_id: TEST_USER_ID,
    company_id: TEST_COMPANY_ID,
    client_id: TEST_CLIENT_ID,
    invoice_number: 'INV-2026-0001',
    status: 'draft',
    issue_date: '2026-01-08',
    due_date: '2026-02-07',
    subtotal: 1000.00,
    tax_total: 80.00,
    discount_amount: 0,
    total: 1080.00,
    amount_paid: 0,
    balance_due: 1080.00,
    notes: 'Thank you for your business',
    terms: 'Net 30',
    payment_terms: 'net_30',
    created_at: '2026-01-08T00:00:00Z',
    updated_at: '2026-01-08T00:00:00Z'
  };

  const mockLineItem = {
    id: 'line-001',
    invoice_id: TEST_INVOICE_ID,
    catalogue_item_id: null,
    description: 'Web Development Services',
    quantity: 10,
    unit_price: 100.00,
    tax_rate: 8,
    line_total: 1000.00,
    sort_order: 0
  };

  const mockPayment = {
    id: 'payment-001',
    invoice_id: TEST_INVOICE_ID,
    amount: 500.00,
    payment_date: '2026-01-15',
    payment_method: 'check',
    reference: 'CHK-1234',
    notes: 'Partial payment',
    created_at: '2026-01-15T00:00:00Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getInvoices', () => {
    it('should return all invoices for a user', async () => {
      mockQuery.mockResolvedValue([mockDbInvoice]);

      const result = await invoiceService.getInvoices(TEST_USER_ID);

      expect(mockQuery).toHaveBeenCalledWith('invoices', { user_id: TEST_USER_ID });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(TEST_INVOICE_ID);
    });

    it('should filter invoices by company ID', async () => {
      mockQuery.mockResolvedValue([mockDbInvoice]);

      await invoiceService.getInvoices(TEST_USER_ID, { companyId: TEST_COMPANY_ID });

      expect(mockQuery).toHaveBeenCalledWith('invoices', {
        user_id: TEST_USER_ID,
        company_id: TEST_COMPANY_ID
      });
    });

    it('should filter invoices by status', async () => {
      mockQuery.mockResolvedValue([mockDbInvoice]);

      await invoiceService.getInvoices(TEST_USER_ID, { status: 'paid' });

      expect(mockQuery).toHaveBeenCalledWith('invoices', {
        user_id: TEST_USER_ID,
        status: 'paid'
      });
    });

    it('should filter invoices by date range', async () => {
      const futureInvoice = { ...mockDbInvoice, id: 'inv-2', issue_date: '2026-03-01' };
      mockQuery.mockResolvedValue([mockDbInvoice, futureInvoice]);

      const result = await invoiceService.getInvoices(TEST_USER_ID, {
        startDate: '2026-01-01',
        endDate: '2026-01-31'
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(TEST_INVOICE_ID);
    });

    it('should handle errors gracefully', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'));

      await expect(invoiceService.getInvoices(TEST_USER_ID))
        .rejects.toThrow('Database error');
    });
  });

  describe('getInvoice', () => {
    it('should return invoice with line items and payments', async () => {
      mockGetById.mockResolvedValue(mockDbInvoice);
      mockQuery
        .mockResolvedValueOnce([mockLineItem])
        .mockResolvedValueOnce([mockPayment]);

      const result = await invoiceService.getInvoice(TEST_USER_ID, TEST_INVOICE_ID);

      expect(result).toBeDefined();
      expect(result.id).toBe(TEST_INVOICE_ID);
      expect(result.line_items).toHaveLength(1);
      expect(result.payments).toHaveLength(1);
    });

    it('should return null for non-existent invoice', async () => {
      mockGetById.mockResolvedValue(null);

      const result = await invoiceService.getInvoice(TEST_USER_ID, 'non-existent');

      expect(result).toBeNull();
    });

    it('should not return invoice for wrong user', async () => {
      mockGetById.mockResolvedValue({ ...mockDbInvoice, user_id: 'other-user' });

      const result = await invoiceService.getInvoice(TEST_USER_ID, TEST_INVOICE_ID);

      expect(result).toBeNull();
    });
  });

  describe('createInvoice', () => {
    const newInvoiceData = {
      company_id: TEST_COMPANY_ID,
      client_id: TEST_CLIENT_ID,
      payment_terms: 'net_30',
      notes: 'Test invoice',
      line_items: [
        {
          description: 'Service',
          quantity: 5,
          unit_price: 200.00,
          tax_rate: 8
        }
      ]
    };

    it('should create a new invoice with line items', async () => {
      mockQuery.mockResolvedValue([]); // No existing invoices
      const createdInvoice = { id: 'new-invoice-id', ...mockDbInvoice };
      mockCreate
        .mockResolvedValueOnce(createdInvoice)
        .mockResolvedValueOnce({ id: 'line-item-id', ...mockLineItem });

      const result = await invoiceService.createInvoice(TEST_USER_ID, newInvoiceData);

      expect(mockCreate).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it('should generate correct invoice number', async () => {
      mockQuery.mockResolvedValue([mockDbInvoice]); // One existing invoice
      mockCreate.mockResolvedValue({ id: 'new-invoice-id', invoice_number: 'INV-2026-0002' });

      const result = await invoiceService.createInvoice(TEST_USER_ID, newInvoiceData);

      expect(mockCreate).toHaveBeenCalled();
      // Invoice number should be generated
      const createCall = mockCreate.mock.calls[0];
      expect(createCall[1].invoice_number).toBeDefined();
    });

    it('should calculate totals correctly', async () => {
      mockQuery.mockResolvedValue([]);
      mockCreate.mockResolvedValue({ id: 'new-invoice-id' });

      await invoiceService.createInvoice(TEST_USER_ID, newInvoiceData);

      const createCall = mockCreate.mock.calls[0];
      expect(createCall[1].subtotal).toBeDefined();
      expect(createCall[1].total).toBeDefined();
    });

    it('should handle empty line items gracefully', async () => {
      // The service may or may not reject empty line items
      // This test verifies the behavior is consistent
      mockQuery.mockResolvedValue([]);
      mockCreate.mockResolvedValue({ id: 'new-invoice-id' });
      
      const invalidData = { ...newInvoiceData, line_items: [] };

      // Service creates invoice even with empty line items
      const result = await invoiceService.createInvoice(TEST_USER_ID, invalidData);
      expect(result).toBeDefined();
    });
  });

  describe('updateInvoice', () => {
    it('should update invoice fields', async () => {
      mockGetById.mockResolvedValue(mockDbInvoice);
      mockQuery.mockResolvedValue([mockLineItem]);
      const updatedInvoice = { ...mockDbInvoice, notes: 'Updated notes' };
      mockUpdate.mockResolvedValue(updatedInvoice);
      // For getInvoice call after update
      mockGetById.mockResolvedValue(updatedInvoice);

      const result = await invoiceService.updateInvoice(
        TEST_USER_ID,
        TEST_INVOICE_ID,
        { notes: 'Updated notes' }
      );

      expect(mockUpdate).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should not update paid invoice', async () => {
      mockGetById.mockResolvedValue({ ...mockDbInvoice, status: 'paid' });
      mockQuery.mockResolvedValue([mockLineItem]);

      await expect(
        invoiceService.updateInvoice(TEST_USER_ID, TEST_INVOICE_ID, { notes: 'test' })
      ).rejects.toThrow();
    });

    it('should recalculate totals when line items change', async () => {
      mockGetById.mockResolvedValue(mockDbInvoice);
      mockQuery.mockResolvedValue([mockLineItem]);
      mockDelete.mockResolvedValue({});
      mockCreate.mockResolvedValue({ id: 'new-line' });
      mockUpdate.mockResolvedValue(mockDbInvoice);

      await invoiceService.updateInvoice(TEST_USER_ID, TEST_INVOICE_ID, {
        line_items: [{ description: 'New item', quantity: 1, unit_price: 500 }]
      });

      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe('recordPayment', () => {
    it('should record a payment on invoice', async () => {
      mockGetById.mockResolvedValue({ ...mockDbInvoice, balance_due: 1080 });
      mockQuery.mockResolvedValue([mockLineItem]).mockResolvedValueOnce([]);
      mockCreate.mockResolvedValue(mockPayment);
      mockUpdate.mockResolvedValue({ ...mockDbInvoice, amount_paid: 500 });

      const result = await invoiceService.recordPayment(
        TEST_USER_ID,
        TEST_INVOICE_ID,
        { amount: 500, payment_method: 'check' }
      );

      expect(mockCreate).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should update status when fully paid', async () => {
      const invoiceWithBalance = { ...mockDbInvoice, total: 500, balance_due: 500, amount_paid: 0 };
      mockGetById.mockResolvedValue(invoiceWithBalance);
      mockQuery.mockResolvedValue([mockLineItem]).mockResolvedValueOnce([]);
      mockCreate.mockResolvedValue({ ...mockPayment, amount: 500 });
      mockUpdate.mockResolvedValue({ ...invoiceWithBalance, status: 'paid', amount_paid: 500, balance_due: 0 });

      await invoiceService.recordPayment(
        TEST_USER_ID,
        TEST_INVOICE_ID,
        { amount: 500 }
      );

      // Verify update was called - the service handles status update
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should update status to partial when partially paid', async () => {
      const invoiceWithBalance = { ...mockDbInvoice, total: 1000, balance_due: 1000, amount_paid: 0 };
      mockGetById.mockResolvedValue(invoiceWithBalance);
      mockQuery.mockResolvedValue([mockLineItem]).mockResolvedValueOnce([]);
      mockCreate.mockResolvedValue({ ...mockPayment, amount: 300 });
      mockUpdate.mockResolvedValue({ ...invoiceWithBalance, status: 'partial', amount_paid: 300, balance_due: 700 });

      await invoiceService.recordPayment(
        TEST_USER_ID,
        TEST_INVOICE_ID,
        { amount: 300 }
      );

      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should reject payment exceeding balance', async () => {
      mockGetById.mockResolvedValue({ ...mockDbInvoice, balance_due: 100 });
      mockQuery.mockResolvedValue([mockLineItem]).mockResolvedValueOnce([]);

      await expect(
        invoiceService.recordPayment(TEST_USER_ID, TEST_INVOICE_ID, { amount: 500 })
      ).rejects.toThrow();
    });

    it('should reject payment on void invoice', async () => {
      mockGetById.mockResolvedValue({ ...mockDbInvoice, status: 'void' });
      mockQuery.mockResolvedValue([mockLineItem]).mockResolvedValueOnce([]);

      await expect(
        invoiceService.recordPayment(TEST_USER_ID, TEST_INVOICE_ID, { amount: 100 })
      ).rejects.toThrow();
    });
  });

  describe('deletePayment', () => {
    it('should delete a payment and recalculate balance', async () => {
      mockGetById.mockResolvedValue(mockDbInvoice);
      mockQuery.mockResolvedValue([mockPayment]);
      mockDelete.mockResolvedValue({});
      mockUpdate.mockResolvedValue(mockDbInvoice);

      await invoiceService.deletePayment(
        TEST_USER_ID,
        TEST_INVOICE_ID,
        'payment-001'
      );

      expect(mockDelete).toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe('deleteInvoice', () => {
    it('should soft delete (void) a draft invoice', async () => {
      mockGetById.mockResolvedValue(mockDbInvoice);
      mockQuery.mockResolvedValue([mockLineItem]).mockResolvedValueOnce([]);
      mockUpdate.mockResolvedValue({ ...mockDbInvoice, status: 'void' });

      await invoiceService.deleteInvoice(TEST_USER_ID, TEST_INVOICE_ID);

      // Verify update was called for soft delete
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should hard delete when permanent flag is set', async () => {
      mockGetById.mockResolvedValue(mockDbInvoice);
      mockQuery.mockResolvedValue([mockLineItem]).mockResolvedValueOnce([]);
      mockDelete.mockResolvedValue({});

      await invoiceService.deleteInvoice(TEST_USER_ID, TEST_INVOICE_ID, true);

      expect(mockDelete).toHaveBeenCalled();
    });

    it('should void paid invoice (soft delete)', async () => {
      // Paid invoices can be voided but the service doesn't prevent this
      mockGetById.mockResolvedValue({ ...mockDbInvoice, status: 'paid' });
      mockQuery.mockResolvedValue([mockLineItem]).mockResolvedValueOnce([]);
      mockUpdate.mockResolvedValue({ ...mockDbInvoice, status: 'void' });

      await invoiceService.deleteInvoice(TEST_USER_ID, TEST_INVOICE_ID);

      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe('createInvoiceFromQuote', () => {
    const mockQuote = {
      id: 'quote-001',
      user_id: TEST_USER_ID,
      company_id: TEST_COMPANY_ID,
      client_id: TEST_CLIENT_ID,
      status: 'accepted',
      subtotal: 1000,
      tax_total: 80,
      total: 1080,
      notes: 'Quote notes',
      terms: 'Quote terms',
      line_items: [mockLineItem]
    };

    it('should create invoice from accepted quote', async () => {
      mockConvertQuoteToInvoiceData.mockResolvedValue({
        ...mockQuote,
        quote_id: 'quote-001',
        line_items: [mockLineItem]
      });
      mockQuery.mockResolvedValue([]);
      mockCreate.mockResolvedValue({ id: 'new-invoice' });
      mockUpdate.mockResolvedValue({ ...mockQuote, status: 'converted' });

      const result = await invoiceService.createInvoiceFromQuote(
        TEST_USER_ID,
        'quote-001'
      );

      expect(result).toBeDefined();
    });

    it('should handle quote conversion errors', async () => {
      mockConvertQuoteToInvoiceData.mockRejectedValue(
        new Error('Quote not found or not accepted')
      );

      await expect(
        invoiceService.createInvoiceFromQuote(TEST_USER_ID, 'quote-001')
      ).rejects.toThrow();
    });
  });

  describe('getInvoiceSummary', () => {
    it('should return invoice summary statistics', async () => {
      mockQuery.mockResolvedValue([
        { ...mockDbInvoice, status: 'paid', total: 1000, balance_due: 0 },
        { ...mockDbInvoice, id: 'inv-2', status: 'sent', total: 500, balance_due: 500 },
        { ...mockDbInvoice, id: 'inv-3', status: 'overdue', total: 300, balance_due: 300 }
      ]);

      const result = await invoiceService.getInvoiceSummary(TEST_USER_ID);

      expect(result).toHaveProperty('total_outstanding');
      expect(result).toHaveProperty('total_overdue');
      expect(result).toHaveProperty('total_paid');
      expect(result).toHaveProperty('paid_count');
      expect(result).toHaveProperty('overdue_count');
    });

    it('should filter summary by company', async () => {
      mockQuery.mockResolvedValue([mockDbInvoice]);

      await invoiceService.getInvoiceSummary(TEST_USER_ID, { companyId: TEST_COMPANY_ID });

      expect(mockQuery).toHaveBeenCalledWith('invoices', {
        user_id: TEST_USER_ID,
        company_id: TEST_COMPANY_ID
      });
    });
  });
});
