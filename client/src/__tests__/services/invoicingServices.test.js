/**
 * @fileoverview Tests for Client-Side Invoicing Services
 * @description Tests for quote, invoice, recurring, and catalogue services
 * 
 * These tests verify the API client calls are properly structured,
 * which would catch issues like using the wrong import (apiClient vs api).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Firebase auth
vi.mock('../firebase', () => ({
  auth: {
    currentUser: {
      getIdToken: vi.fn().mockResolvedValue('mock-token-123')
    }
  }
}));

// Mock the api client - this is the RAW axios instance, not the apiClient object
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();

vi.mock('../apiClient', () => ({
  api: {
    get: mockGet,
    post: mockPost,
    put: mockPut,
    delete: mockDelete
  },
  // The default export (apiClient) is a structured object, NOT an axios instance
  // Tests should fail if services try to call apiClient.get() directly
  default: {
    transactions: { getAll: vi.fn() },
    companies: { getAll: vi.fn() }
    // Note: NO .get(), .post(), .put(), .delete() methods here!
  }
}));

describe('QuoteService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ data: { quotes: [] } });
    mockPost.mockResolvedValue({ data: {} });
    mockPut.mockResolvedValue({ data: {} });
    mockDelete.mockResolvedValue({ data: {} });
  });

  it('should use api.get with auth headers for getQuotes', async () => {
    const { getQuotes } = await import('../quoteService');
    
    await getQuotes();

    expect(mockGet).toHaveBeenCalledWith(
      '/quotes',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-token-123'
        })
      })
    );
  });

  it('should use api.get with auth headers for getQuote', async () => {
    const { getQuote } = await import('../quoteService');
    
    await getQuote('quote-123');

    expect(mockGet).toHaveBeenCalledWith(
      '/quotes/quote-123',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-token-123'
        })
      })
    );
  });

  it('should use api.post with auth headers for createQuote', async () => {
    const { createQuote } = await import('../quoteService');
    const quoteData = { client_name: 'Test Client' };
    
    await createQuote(quoteData);

    expect(mockPost).toHaveBeenCalledWith(
      '/quotes',
      quoteData,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-token-123'
        })
      })
    );
  });

  it('should use api.put with auth headers for updateQuote', async () => {
    const { updateQuote } = await import('../quoteService');
    const updates = { notes: 'Updated' };
    
    await updateQuote('quote-123', updates);

    expect(mockPut).toHaveBeenCalledWith(
      '/quotes/quote-123',
      updates,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-token-123'
        })
      })
    );
  });

  it('should use api.delete with auth headers for deleteQuote', async () => {
    const { deleteQuote } = await import('../quoteService');
    
    await deleteQuote('quote-123');

    expect(mockDelete).toHaveBeenCalledWith(
      '/quotes/quote-123',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-token-123'
        })
      })
    );
  });
});

describe('InvoiceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ data: { invoices: [] } });
    mockPost.mockResolvedValue({ data: {} });
    mockPut.mockResolvedValue({ data: {} });
    mockDelete.mockResolvedValue({ data: {} });
  });

  it('should use api.get with auth headers for getInvoices', async () => {
    const { getInvoices } = await import('../invoiceService');
    
    await getInvoices();

    expect(mockGet).toHaveBeenCalledWith(
      '/invoices',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-token-123'
        })
      })
    );
  });

  it('should use api.post with auth headers for createInvoice', async () => {
    const { createInvoice } = await import('../invoiceService');
    const invoiceData = { client_name: 'Test Client' };
    
    await createInvoice(invoiceData);

    expect(mockPost).toHaveBeenCalledWith(
      '/invoices',
      invoiceData,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-token-123'
        })
      })
    );
  });

  it('should use api.post with auth headers for recordPayment', async () => {
    const { recordPayment } = await import('../invoiceService');
    const paymentData = { amount: 500 };
    
    await recordPayment('invoice-123', paymentData);

    expect(mockPost).toHaveBeenCalledWith(
      '/invoices/invoice-123/payments',
      paymentData,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-token-123'
        })
      })
    );
  });
});

describe('RecurringService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ data: { schedules: [] } });
    mockPost.mockResolvedValue({ data: {} });
    mockPut.mockResolvedValue({ data: {} });
    mockDelete.mockResolvedValue({ data: {} });
  });

  it('should use api.get with auth headers for getRecurringSchedules', async () => {
    const { getRecurringSchedules } = await import('../recurringService');
    
    await getRecurringSchedules({ activeOnly: true });

    expect(mockGet).toHaveBeenCalledWith(
      '/recurring?activeOnly=true',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-token-123'
        })
      })
    );
  });

  it('should return data with schedules array', async () => {
    const { getRecurringSchedules } = await import('../recurringService');
    mockGet.mockResolvedValue({ data: { schedules: [{ id: '1' }] } });
    
    const result = await getRecurringSchedules();

    expect(result).toHaveProperty('schedules');
    expect(result.schedules).toHaveLength(1);
  });

  it('should return fallback when data is undefined', async () => {
    const { getRecurringSchedules } = await import('../recurringService');
    mockGet.mockResolvedValue({ data: undefined });
    
    const result = await getRecurringSchedules();

    expect(result).toEqual({ schedules: [] });
  });

  it('should use api.post for pauseRecurringSchedule', async () => {
    const { pauseRecurringSchedule } = await import('../recurringService');
    
    await pauseRecurringSchedule('schedule-123');

    expect(mockPost).toHaveBeenCalledWith(
      '/recurring/schedule-123/pause',
      {},
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-token-123'
        })
      })
    );
  });
});

describe('CatalogueService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ data: { items: [] } });
    mockPost.mockResolvedValue({ data: {} });
    mockPut.mockResolvedValue({ data: {} });
    mockDelete.mockResolvedValue({ data: {} });
  });

  it('should use api.get with auth headers for getCatalogueItems', async () => {
    const { getCatalogueItems } = await import('../catalogueService');
    
    await getCatalogueItems();

    expect(mockGet).toHaveBeenCalledWith(
      '/catalogue',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-token-123'
        })
      })
    );
  });

  it('should use api.post with auth headers for createCatalogueItem', async () => {
    const { createCatalogueItem } = await import('../catalogueService');
    const itemData = { name: 'Test Item', unit_price: 100 };
    
    await createCatalogueItem(itemData);

    expect(mockPost).toHaveBeenCalledWith(
      '/catalogue',
      itemData,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-token-123'
        })
      })
    );
  });

  it('should use api.delete with auth headers for deleteCatalogueItem', async () => {
    const { deleteCatalogueItem } = await import('../catalogueService');
    
    await deleteCatalogueItem('item-123');

    expect(mockDelete).toHaveBeenCalledWith(
      '/catalogue/item-123',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-token-123'
        })
      })
    );
  });
});

describe('Service Import Patterns', () => {
  it('quoteService should import api from apiClient, not apiClient default', async () => {
    // This test verifies that the service doesn't try to use apiClient.get()
    // which would fail because apiClient is a structured object, not axios
    const quoteService = await import('../quoteService');
    
    // If the import is correct, getQuotes will work
    // If wrong (using apiClient.get), it would throw "apiClient.get is not a function"
    await expect(quoteService.getQuotes()).resolves.toBeDefined();
  });

  it('invoiceService should import api from apiClient, not apiClient default', async () => {
    const invoiceService = await import('../invoiceService');
    await expect(invoiceService.getInvoices()).resolves.toBeDefined();
  });

  it('recurringService should import api from apiClient, not apiClient default', async () => {
    const recurringService = await import('../recurringService');
    await expect(recurringService.getRecurringSchedules()).resolves.toBeDefined();
  });

  it('catalogueService should import api from apiClient, not apiClient default', async () => {
    const catalogueService = await import('../catalogueService');
    await expect(catalogueService.getCatalogueItems()).resolves.toBeDefined();
  });
});
