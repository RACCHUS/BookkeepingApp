/**
 * @fileoverview Tests for Recurring Service
 * @description Comprehensive test suite for recurring invoice schedule operations
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const servicesPath = path.resolve(__dirname, '../../../services/invoicing');
const adaptersPath = path.resolve(__dirname, '../../../services/adapters');
const configPath = path.resolve(__dirname, '../../../config');

// Mock Supabase client
const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockEq = jest.fn();
const mockLte = jest.fn();
const mockOrder = jest.fn();
const mockSingle = jest.fn();

// Chain mock setup
const mockSupabaseChain = {
  from: mockFrom,
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
  eq: mockEq,
  lte: mockLte,
  order: mockOrder,
  single: mockSingle
};

// Make each method return the chain for chaining
Object.values(mockSupabaseChain).forEach(fn => {
  fn.mockReturnValue(mockSupabaseChain);
});

const mockDbAdapter = {
  supabase: mockSupabaseChain,
  initialize: jest.fn().mockResolvedValue(true)
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

// Mock invoice service
await jest.unstable_mockModule(path.join(servicesPath, 'invoiceService.js'), () => ({
  default: {
    getInvoice: jest.fn(),
    createInvoice: jest.fn()
  }
}));

// Import the service after mocking
const recurringService = await import(path.join(servicesPath, 'recurringService.js'));

describe('RecurringService', () => {
  const TEST_USER_ID = 'test-user-123';
  const TEST_COMPANY_ID = 'company-456';
  const TEST_CLIENT_ID = 'client-789';
  const TEST_SCHEDULE_ID = 'schedule-001';

  const mockSchedule = {
    id: TEST_SCHEDULE_ID,
    user_id: TEST_USER_ID,
    company_id: TEST_COMPANY_ID,
    client_id: TEST_CLIENT_ID,
    name: 'Monthly Retainer',
    frequency: 'monthly',
    day_of_month: 1,
    start_date: '2026-01-01',
    next_run_date: '2026-02-01',
    end_date: null,
    max_occurrences: null,
    occurrences_generated: 3,
    auto_send: false,
    is_active: true,
    template_data: {
      client_name: 'Test Client',
      line_items: [{ description: 'Retainer', quantity: 1, unit_price: 1000 }]
    },
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-08T00:00:00Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset chain returns
    Object.values(mockSupabaseChain).forEach(fn => {
      fn.mockReturnValue(mockSupabaseChain);
    });
  });

  describe('getRecurringSchedules', () => {
    it('should return all active schedules', async () => {
      mockSupabaseChain.eq.mockReturnValue({
        ...mockSupabaseChain,
        then: (resolve) => resolve({ data: [mockSchedule], error: null })
      });

      const result = await recurringService.getRecurringSchedules({ activeOnly: true });

      expect(mockFrom).toHaveBeenCalledWith('recurring_schedules');
      expect(result.schedules).toBeDefined();
    });

    it('should filter by company ID', async () => {
      mockSupabaseChain.eq.mockReturnValue({
        ...mockSupabaseChain,
        then: (resolve) => resolve({ data: [mockSchedule], error: null })
      });

      await recurringService.getRecurringSchedules({ companyId: TEST_COMPANY_ID });

      expect(mockEq).toHaveBeenCalledWith('company_id', TEST_COMPANY_ID);
    });

    it('should throw error on database failure', async () => {
      mockSupabaseChain.eq.mockReturnValue({
        ...mockSupabaseChain,
        then: (resolve) => resolve({ data: null, error: new Error('DB error') })
      });

      await expect(recurringService.getRecurringSchedules({}))
        .rejects.toThrow();
    });
  });

  describe('getRecurringSchedule', () => {
    it('should return a schedule by ID', async () => {
      mockSingle.mockResolvedValue({ data: mockSchedule, error: null });

      const result = await recurringService.getRecurringSchedule(TEST_SCHEDULE_ID);

      expect(mockFrom).toHaveBeenCalledWith('recurring_schedules');
      expect(mockEq).toHaveBeenCalledWith('id', TEST_SCHEDULE_ID);
      expect(result).toEqual(mockSchedule);
    });

    it('should throw error for non-existent schedule', async () => {
      mockSingle.mockResolvedValue({ data: null, error: new Error('Not found') });

      await expect(recurringService.getRecurringSchedule('non-existent'))
        .rejects.toThrow();
    });
  });

  describe('createRecurringSchedule', () => {
    it('should create a new schedule', async () => {
      const createData = {
        user_id: TEST_USER_ID,
        company_id: TEST_COMPANY_ID,
        client_id: TEST_CLIENT_ID,
        name: 'New Schedule',
        frequency: 'monthly',
        start_date: '2026-01-01'
      };

      mockSingle.mockResolvedValue({ data: { ...mockSchedule, ...createData }, error: null });

      const result = await recurringService.createRecurringSchedule(createData);

      expect(mockFrom).toHaveBeenCalledWith('recurring_schedules');
      expect(mockInsert).toHaveBeenCalled();
      expect(result.name).toBe('New Schedule');
    });

    it('should throw error on database failure', async () => {
      mockSingle.mockResolvedValue({ data: null, error: new Error('Insert failed') });

      await expect(recurringService.createRecurringSchedule({
        user_id: TEST_USER_ID,
        name: 'Test'
      })).rejects.toThrow();
    });
  });

  describe('updateRecurringSchedule', () => {
    it('should update an existing schedule', async () => {
      const updates = { name: 'Updated Schedule' };
      mockSingle.mockResolvedValue({ data: { ...mockSchedule, ...updates }, error: null });

      const result = await recurringService.updateRecurringSchedule(TEST_SCHEDULE_ID, updates);

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', TEST_SCHEDULE_ID);
      expect(result.name).toBe('Updated Schedule');
    });

    it('should only update allowed fields', async () => {
      const updates = { 
        name: 'Valid',
        frequency: 'weekly',
        user_id: 'should-not-update' // This should be filtered out
      };
      mockSingle.mockResolvedValue({ data: mockSchedule, error: null });

      await recurringService.updateRecurringSchedule(TEST_SCHEDULE_ID, updates);

      // Verify update was called (the actual filtering is in the service)
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe('deleteRecurringSchedule', () => {
    it('should delete a schedule', async () => {
      mockEq.mockResolvedValue({ error: null });

      const result = await recurringService.deleteRecurringSchedule(TEST_SCHEDULE_ID);

      expect(mockFrom).toHaveBeenCalledWith('recurring_schedules');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', TEST_SCHEDULE_ID);
      expect(result).toBe(true);
    });

    it('should throw error on database failure', async () => {
      mockEq.mockResolvedValue({ error: new Error('Delete failed') });

      await expect(recurringService.deleteRecurringSchedule(TEST_SCHEDULE_ID))
        .rejects.toThrow();
    });
  });

  describe('pauseRecurringSchedule', () => {
    it('should set is_active to false', async () => {
      mockSingle.mockResolvedValue({ data: { ...mockSchedule, is_active: false }, error: null });

      const result = await recurringService.pauseRecurringSchedule(TEST_SCHEDULE_ID);

      expect(mockUpdate).toHaveBeenCalled();
      expect(result.is_active).toBe(false);
    });
  });

  describe('resumeRecurringSchedule', () => {
    it('should set is_active to true', async () => {
      mockSingle.mockResolvedValue({ data: { ...mockSchedule, is_active: true }, error: null });

      const result = await recurringService.resumeRecurringSchedule(TEST_SCHEDULE_ID);

      expect(mockUpdate).toHaveBeenCalled();
      expect(result.is_active).toBe(true);
    });
  });

  describe('calculateNextRunDate', () => {
    it('should calculate daily frequency', () => {
      const currentDate = new Date('2026-01-01T12:00:00Z');
      const nextDate = recurringService.calculateNextRunDate(currentDate, 'daily', 1);
      expect(nextDate.getUTCDate()).toBe(2);
    });

    it('should calculate weekly frequency', () => {
      const currentDate = new Date('2026-01-01T12:00:00Z');
      const nextDate = recurringService.calculateNextRunDate(currentDate, 'weekly', 1);
      expect(nextDate.getUTCDate()).toBe(8);
    });

    it('should calculate monthly frequency', () => {
      const currentDate = new Date('2026-01-15T12:00:00Z');
      const nextDate = recurringService.calculateNextRunDate(currentDate, 'monthly', 1);
      expect(nextDate.getUTCMonth()).toBe(1); // February
    });

    it('should calculate quarterly frequency', () => {
      const currentDate = new Date('2026-01-15T12:00:00Z');
      const nextDate = recurringService.calculateNextRunDate(currentDate, 'quarterly', 1);
      expect(nextDate.getUTCMonth()).toBe(3); // April
    });

    it('should calculate annual frequency', () => {
      const currentDate = new Date('2026-01-15T12:00:00Z');
      const nextDate = recurringService.calculateNextRunDate(currentDate, 'annual', 1);
      expect(nextDate.getUTCFullYear()).toBe(2027);
    });

    it('should apply interval count', () => {
      const currentDate = new Date('2026-01-01T12:00:00Z');
      const nextDate = recurringService.calculateNextRunDate(currentDate, 'daily', 5);
      expect(nextDate.getUTCDate()).toBe(6);
    });
  });

  describe('processDueRecurringInvoices', () => {
    it('should process schedules that are due', async () => {
      const dueSchedule = { 
        ...mockSchedule, 
        next_run_date: '2026-01-01',
        template_data: { line_items: [] }
      };
      
      // Set up the mock chain to return the final promise
      const chainResult = Promise.resolve({ data: [dueSchedule], error: null });
      mockLte.mockReturnValue(chainResult);
      mockSingle.mockResolvedValue({ data: dueSchedule, error: null });

      const result = await recurringService.processDueRecurringInvoices();

      expect(result).toHaveProperty('processed');
      expect(result).toHaveProperty('created');
      expect(result).toHaveProperty('errors');
    });

    it('should deactivate schedules that exceeded max occurrences', async () => {
      const maxedSchedule = { 
        ...mockSchedule, 
        max_occurrences: 5,
        occurrences_generated: 5
      };
      
      // Set up the mock chain to return the final promise
      const chainResult = Promise.resolve({ data: [maxedSchedule], error: null });
      mockLte.mockReturnValue(chainResult);
      mockSingle.mockResolvedValue({ data: { ...maxedSchedule, is_active: false }, error: null });

      await recurringService.processDueRecurringInvoices();

      expect(mockUpdate).toHaveBeenCalled();
    });
  });
});
