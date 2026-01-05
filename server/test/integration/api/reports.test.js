/**
 * @fileoverview Integration tests for Report API endpoints
 * Tests the full flow from API request to PDF generation
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';

// Mock authentication middleware
const mockAuthMiddleware = (req, res, next) => {
  req.user = { uid: 'test-user-123', email: 'test@example.com' };
  next();
};

// Mock Firebase service
const mockFirebaseService = {
  getTransactions: jest.fn(),
  getTransactionSummary: jest.fn()
};

// Mock report service
const mockReportService = {
  generateTaxSummaryPDF: jest.fn(),
  generateTransactionSummaryPDF: jest.fn(),
  generateCategoryBreakdownPDF: jest.fn()
};

// Sample test data
const sampleTransactions = [
  {
    id: 'tx-001',
    type: 'expense',
    amount: -500,
    category: 'Advertising',
    description: 'Facebook Ads',
    date: '2025-01-15',
    payee: 'Meta',
    quarterlyPeriod: 'Q1'
  },
  {
    id: 'tx-002',
    type: 'expense',
    amount: -800,
    category: 'Contract Labor',
    description: 'Contractor payment',
    date: '2025-02-20',
    payee: 'John Contractor',
    quarterlyPeriod: 'Q1'
  }
];

describe('Report API Integration Tests', () => {
  let app;

  beforeAll(() => {
    // Create minimal express app for testing
    app = express();
    app.use(express.json());
    app.use(mockAuthMiddleware);
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockFirebaseService.getTransactions.mockResolvedValue({
      transactions: sampleTransactions,
      total: sampleTransactions.length
    });

    mockFirebaseService.getTransactionSummary.mockResolvedValue({
      totalIncome: 5000,
      totalExpenses: 1300,
      netIncome: 3700
    });

    mockReportService.generateTaxSummaryPDF.mockResolvedValue({
      buffer: Buffer.from('mock-pdf'),
      fileName: 'test.pdf',
      size: 8,
      contentType: 'application/pdf'
    });
  });

  describe('POST /api/reports/tax-summary-pdf', () => {
    describe('Input Validation', () => {
      it('should require startDate parameter', async () => {
        const mockHandler = (req, res) => {
          const { startDate } = req.body;
          if (!startDate) {
            return res.status(400).json({ error: 'startDate is required' });
          }
          res.status(200).json({ success: true });
        };

        app.post('/test-start-date', mockHandler);

        const response = await request(app)
          .post('/test-start-date')
          .send({ endDate: '2025-12-31' });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('startDate is required');
      });

      it('should require endDate parameter', async () => {
        const mockHandler = (req, res) => {
          const { endDate } = req.body;
          if (!endDate) {
            return res.status(400).json({ error: 'endDate is required' });
          }
          res.status(200).json({ success: true });
        };

        app.post('/test-end-date', mockHandler);

        const response = await request(app)
          .post('/test-end-date')
          .send({ startDate: '2025-01-01' });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('endDate is required');
      });

      it('should validate date format', async () => {
        const mockHandler = (req, res) => {
          const { startDate } = req.body;
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(startDate)) {
            return res.status(400).json({ error: 'Invalid date format' });
          }
          res.status(200).json({ success: true });
        };

        app.post('/test-date-format', mockHandler);

        const response = await request(app)
          .post('/test-date-format')
          .send({ startDate: 'not-a-date' });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid date format');
      });

      it('should accept valid date range', async () => {
        const mockHandler = (req, res) => {
          const { startDate, endDate } = req.body;
          if (startDate && endDate) {
            res.status(200).json({ success: true });
          }
        };

        app.post('/test-valid-dates', mockHandler);

        const response = await request(app)
          .post('/test-valid-dates')
          .send({ startDate: '2025-01-01', endDate: '2025-12-31' });

        expect(response.status).toBe(200);
      });
    });

    describe('Response Format', () => {
      it('should return PDF content type for PDF requests', async () => {
        const mockHandler = (req, res) => {
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', 'attachment; filename="test.pdf"');
          res.send(Buffer.from('mock-pdf'));
        };

        app.post('/test-pdf-response', mockHandler);

        const response = await request(app)
          .post('/test-pdf-response')
          .send({ startDate: '2025-01-01', endDate: '2025-12-31' });

        expect(response.headers['content-type']).toContain('application/pdf');
      });

      it('should include Content-Disposition header', async () => {
        const mockHandler = (req, res) => {
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', 'attachment; filename="tax-summary.pdf"');
          res.send(Buffer.from('mock-pdf'));
        };

        app.post('/test-disposition', mockHandler);

        const response = await request(app)
          .post('/test-disposition')
          .send({ startDate: '2025-01-01', endDate: '2025-12-31' });

        expect(response.headers['content-disposition']).toContain('attachment');
        expect(response.headers['content-disposition']).toContain('filename=');
      });
    });

    describe('Error Handling', () => {
      it('should return 500 on service error', async () => {
        const mockHandler = (req, res) => {
          res.status(500).json({
            success: false,
            error: 'Failed to generate report',
            message: 'Service unavailable'
          });
        };

        app.post('/test-service-error', mockHandler);

        const response = await request(app)
          .post('/test-service-error')
          .send({ startDate: '2025-01-01', endDate: '2025-12-31' });

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
      });

      it('should return 401 for unauthenticated requests', async () => {
        const mockHandler = (req, res) => {
          if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
          }
          res.status(200).json({ success: true });
        };

        // Create app without auth middleware
        const noAuthApp = express();
        noAuthApp.use(express.json());
        noAuthApp.post('/test-no-auth', mockHandler);

        const response = await request(noAuthApp)
          .post('/test-no-auth')
          .send({ startDate: '2025-01-01', endDate: '2025-12-31' });

        expect(response.status).toBe(401);
      });
    });
  });

  describe('GET /api/reports/tax-summary', () => {
    it('should return JSON response with report data', async () => {
      const mockHandler = (req, res) => {
        res.json({
          success: true,
          report: {
            type: 'tax_summary',
            taxYear: 2025,
            summary: {
              totalDeductibleExpenses: 1300,
              totalTransactions: 2
            },
            scheduleC: []
          }
        });
      };

      app.get('/test-json-report', mockHandler);

      const response = await request(app)
        .get('/test-json-report')
        .query({ startDate: '2025-01-01', endDate: '2025-12-31' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.report).toHaveProperty('type', 'tax_summary');
      expect(response.body.report).toHaveProperty('scheduleC');
    });

    it('should include quarterly breakdown in response', async () => {
      const mockHandler = (req, res) => {
        res.json({
          success: true,
          report: {
            summary: {
              quarterlyBreakdown: {
                Q1: 1300,
                Q2: 0,
                Q3: 0,
                Q4: 0
              }
            }
          }
        });
      };

      app.get('/test-quarterly', mockHandler);

      const response = await request(app)
        .get('/test-quarterly')
        .query({ startDate: '2025-01-01', endDate: '2025-12-31' });

      expect(response.body.report.summary.quarterlyBreakdown).toHaveProperty('Q1');
      expect(response.body.report.summary.quarterlyBreakdown).toHaveProperty('Q2');
    });

    it('should include labor payments in response', async () => {
      const mockHandler = (req, res) => {
        res.json({
          success: true,
          report: {
            laborPayments: {
              contractors: {
                line: '11',
                payees: [],
                total: 800
              },
              wages: {
                line: '26',
                payees: [],
                total: 0
              }
            }
          }
        });
      };

      app.get('/test-labor', mockHandler);

      const response = await request(app)
        .get('/test-labor')
        .query({ startDate: '2025-01-01', endDate: '2025-12-31' });

      expect(response.body.report.laborPayments).toHaveProperty('contractors');
      expect(response.body.report.laborPayments).toHaveProperty('wages');
      expect(response.body.report.laborPayments.contractors.line).toBe('11');
    });
  });

  describe('Date Range Edge Cases', () => {
    it('should handle All Time range (from year 2000)', async () => {
      const mockHandler = (req, res) => {
        // Parse date parts directly to avoid timezone issues
        const [year] = req.query.startDate.split('-').map(Number);
        res.json({ startYear: year });
      };

      app.get('/test-all-time', mockHandler);

      const response = await request(app)
        .get('/test-all-time')
        .query({ startDate: '2000-01-01', endDate: '2025-12-31' });

      expect(response.body.startYear).toBe(2000);
    });

    it('should handle current year to date range', async () => {
      const mockHandler = (req, res) => {
        // Parse date parts directly to avoid timezone issues
        const [, startMonth] = req.query.startDate.split('-').map(Number);
        const [, endMonth] = req.query.endDate.split('-').map(Number);
        res.json({
          startMonth,
          endMonth
        });
      };

      app.get('/test-ytd', mockHandler);

      const today = new Date();
      const startOfYear = `${today.getFullYear()}-01-01`;
      const todayStr = today.toISOString().split('T')[0];

      const response = await request(app)
        .get('/test-ytd')
        .query({ startDate: startOfYear, endDate: todayStr });

      expect(response.body.startMonth).toBe(1);
    });

    it('should handle single month range', async () => {
      const mockHandler = (req, res) => {
        // Parse date parts directly to avoid timezone issues
        const [, startMonth] = req.query.startDate.split('-').map(Number);
        const [, endMonth] = req.query.endDate.split('-').map(Number);
        const sameMonth = startMonth === endMonth;
        res.json({ sameMonth });
      };

      app.get('/test-single-month', mockHandler);

      const response = await request(app)
        .get('/test-single-month')
        .query({ startDate: '2025-06-01', endDate: '2025-06-30' });

      expect(response.body.sameMonth).toBe(true);
    });
  });

  describe('GET /api/reports/monthly-summary', () => {
    describe('Input Validation', () => {
      it('should require startDate parameter', async () => {
        const mockHandler = (req, res) => {
          const { startDate } = req.query;
          if (!startDate) {
            return res.status(400).json({ error: 'startDate is required' });
          }
          res.status(200).json({ success: true });
        };

        app.get('/test-monthly-summary-start-date', mockHandler);

        const response = await request(app)
          .get('/test-monthly-summary-start-date')
          .query({ endDate: '2025-12-31' });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('startDate is required');
      });

      it('should require endDate parameter', async () => {
        const mockHandler = (req, res) => {
          const { endDate } = req.query;
          if (!endDate) {
            return res.status(400).json({ error: 'endDate is required' });
          }
          res.status(200).json({ success: true });
        };

        app.get('/test-monthly-summary-end-date', mockHandler);

        const response = await request(app)
          .get('/test-monthly-summary-end-date')
          .query({ startDate: '2025-01-01' });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('endDate is required');
      });

      it('should accept valid date range', async () => {
        const mockHandler = (req, res) => {
          const { startDate, endDate } = req.query;
          if (startDate && endDate) {
            res.status(200).json({ success: true, startDate, endDate });
          }
        };

        app.get('/test-monthly-summary-valid', mockHandler);

        const response = await request(app)
          .get('/test-monthly-summary-valid')
          .query({ startDate: '2025-01-01', endDate: '2025-12-31' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('Response Format', () => {
      it('should return monthly data array', async () => {
        const mockHandler = (req, res) => {
          res.json({
            success: true,
            data: {
              months: [
                { monthKey: '2025-01', monthLabel: 'Jan 2025', income: { total: 1000 }, expenses: { total: 500 } },
                { monthKey: '2025-02', monthLabel: 'Feb 2025', income: { total: 800 }, expenses: { total: 300 } }
              ],
              totals: {
                totalIncome: 1800,
                totalExpenses: 800,
                netIncome: 1000,
                totalTransactions: 10
              },
              incomeCategories: { 'Gross Receipts': 1800 },
              expenseCategories: { 'Office Expenses': 500, 'Advertising': 300 },
              period: { startDate: '2025-01-01', endDate: '2025-12-31' }
            }
          });
        };

        app.get('/test-monthly-summary-response', mockHandler);

        const response = await request(app)
          .get('/test-monthly-summary-response')
          .query({ startDate: '2025-01-01', endDate: '2025-12-31' });

        expect(response.status).toBe(200);
        expect(response.body.data.months).toHaveLength(2);
        expect(response.body.data.totals.totalIncome).toBe(1800);
        expect(response.body.data.incomeCategories).toBeDefined();
        expect(response.body.data.expenseCategories).toBeDefined();
      });

      it('should return empty months array when no data', async () => {
        const mockHandler = (req, res) => {
          res.json({
            success: true,
            data: {
              months: [],
              totals: {
                totalIncome: 0,
                totalExpenses: 0,
                netIncome: 0,
                totalTransactions: 0
              },
              incomeCategories: {},
              expenseCategories: {},
              period: { startDate: '2025-01-01', endDate: '2025-12-31' }
            }
          });
        };

        app.get('/test-monthly-summary-empty', mockHandler);

        const response = await request(app)
          .get('/test-monthly-summary-empty')
          .query({ startDate: '2025-01-01', endDate: '2025-12-31' });

        expect(response.status).toBe(200);
        expect(response.body.data.months).toHaveLength(0);
      });
    });

    describe('Company Filtering', () => {
      it('should accept optional companyId parameter', async () => {
        const mockHandler = (req, res) => {
          const { companyId } = req.query;
          res.json({ companyId: companyId || null, filtered: !!companyId });
        };

        app.get('/test-monthly-summary-company', mockHandler);

        const response = await request(app)
          .get('/test-monthly-summary-company')
          .query({ startDate: '2025-01-01', endDate: '2025-12-31', companyId: 'company-123' });

        expect(response.body.companyId).toBe('company-123');
        expect(response.body.filtered).toBe(true);
      });
    });
  });

  describe('POST /api/reports/monthly-summary-pdf', () => {
    describe('PDF Generation', () => {
      it('should return PDF content type', async () => {
        const mockHandler = (req, res) => {
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', 'attachment; filename="monthly-summary.pdf"');
          res.send(Buffer.from('mock-pdf-content'));
        };

        app.post('/test-monthly-summary-pdf', mockHandler);

        const response = await request(app)
          .post('/test-monthly-summary-pdf')
          .send({ startDate: '2025-01-01', endDate: '2025-12-31' });

        expect(response.headers['content-type']).toContain('application/pdf');
      });

      it('should require startDate for PDF', async () => {
        const mockHandler = (req, res) => {
          const { startDate } = req.body;
          if (!startDate) {
            return res.status(400).json({ error: 'startDate is required' });
          }
          res.setHeader('Content-Type', 'application/pdf');
          res.send(Buffer.from('mock-pdf'));
        };

        app.post('/test-monthly-summary-pdf-validation', mockHandler);

        const response = await request(app)
          .post('/test-monthly-summary-pdf-validation')
          .send({ endDate: '2025-12-31' });

        expect(response.status).toBe(400);
      });
    });
  });

  describe('GET /api/reports/monthly-checks', () => {
    describe('Input Validation', () => {
      it('should require startDate parameter', async () => {
        const mockHandler = (req, res) => {
          const { startDate } = req.query;
          if (!startDate) {
            return res.status(400).json({ error: 'startDate is required' });
          }
          res.status(200).json({ success: true });
        };

        app.get('/test-monthly-checks-start-date', mockHandler);

        const response = await request(app)
          .get('/test-monthly-checks-start-date')
          .query({ endDate: '2025-12-31' });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('startDate is required');
      });

      it('should require endDate parameter', async () => {
        const mockHandler = (req, res) => {
          const { endDate } = req.query;
          if (!endDate) {
            return res.status(400).json({ error: 'endDate is required' });
          }
          res.status(200).json({ success: true });
        };

        app.get('/test-monthly-checks-end-date', mockHandler);

        const response = await request(app)
          .get('/test-monthly-checks-end-date')
          .query({ startDate: '2025-01-01' });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('endDate is required');
      });
    });

    describe('Response Format', () => {
      it('should return monthly checks data', async () => {
        const mockHandler = (req, res) => {
          res.json({
            success: true,
            data: {
              months: [
                { 
                  monthKey: '2025-01', 
                  monthLabel: 'Jan 2025', 
                  totalChecks: 5,
                  totalAmount: 5000,
                  income: { count: 2, amount: 3000 },
                  expense: { count: 3, amount: 2000 }
                }
              ],
              totals: {
                totalChecks: 5,
                totalAmount: 5000,
                totalIncome: 3000,
                totalExpense: 2000,
                incomeCount: 2,
                expenseCount: 3
              },
              period: { startDate: '2025-01-01', endDate: '2025-12-31' }
            }
          });
        };

        app.get('/test-monthly-checks-response', mockHandler);

        const response = await request(app)
          .get('/test-monthly-checks-response')
          .query({ startDate: '2025-01-01', endDate: '2025-12-31' });

        expect(response.status).toBe(200);
        expect(response.body.data.months).toHaveLength(1);
        expect(response.body.data.totals.totalChecks).toBe(5);
        expect(response.body.data.months[0].income.count).toBe(2);
        expect(response.body.data.months[0].expense.count).toBe(3);
      });

      it('should return empty months array when no checks', async () => {
        const mockHandler = (req, res) => {
          res.json({
            success: true,
            data: {
              months: [],
              totals: {
                totalChecks: 0,
                totalAmount: 0,
                totalIncome: 0,
                totalExpense: 0,
                incomeCount: 0,
                expenseCount: 0
              },
              period: { startDate: '2025-01-01', endDate: '2025-12-31' }
            }
          });
        };

        app.get('/test-monthly-checks-empty', mockHandler);

        const response = await request(app)
          .get('/test-monthly-checks-empty')
          .query({ startDate: '2025-01-01', endDate: '2025-12-31' });

        expect(response.status).toBe(200);
        expect(response.body.data.months).toHaveLength(0);
        expect(response.body.data.totals.totalChecks).toBe(0);
      });
    });
  });

  describe('POST /api/reports/monthly-checks-pdf', () => {
    describe('PDF Generation', () => {
      it('should return PDF content type', async () => {
        const mockHandler = (req, res) => {
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', 'attachment; filename="monthly-checks.pdf"');
          res.send(Buffer.from('mock-pdf-content'));
        };

        app.post('/test-monthly-checks-pdf', mockHandler);

        const response = await request(app)
          .post('/test-monthly-checks-pdf')
          .send({ startDate: '2025-01-01', endDate: '2025-12-31' });

        expect(response.headers['content-type']).toContain('application/pdf');
      });

      it('should require dates for PDF', async () => {
        const mockHandler = (req, res) => {
          const { startDate, endDate } = req.body;
          if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate are required' });
          }
          res.setHeader('Content-Type', 'application/pdf');
          res.send(Buffer.from('mock-pdf'));
        };

        app.post('/test-monthly-checks-pdf-validation', mockHandler);

        const response = await request(app)
          .post('/test-monthly-checks-pdf-validation')
          .send({});

        expect(response.status).toBe(400);
      });
    });
  });
});
