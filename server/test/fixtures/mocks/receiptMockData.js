/**
 * @fileoverview Receipt Mock Data - Test fixtures for receipt testing
 * @description Provides comprehensive mock data for receipt service and API testing
 * @version 1.0.0
 */

import { mockUser, mockCompany, mockTransactions } from './mockData.js';

// Calculate dates for retention testing
const now = new Date();
const twoYearsAgo = new Date(now);
twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
const almostTwoYearsAgo = new Date(now);
almostTwoYearsAgo.setFullYear(almostTwoYearsAgo.getFullYear() - 2);
almostTwoYearsAgo.setDate(almostTwoYearsAgo.getDate() + 30); // 30 days before expiry

export const mockReceipts = [
  {
    id: 'test-receipt-1',
    userId: mockUser.id,
    vendor: 'Office Depot',
    amount: 125.50,
    date: '2025-12-15',
    category: 'Office Expenses',
    notes: 'Office supplies for Q4',
    companyId: mockCompany.id,
    transactionId: mockTransactions[1].id,
    hasImage: true,
    fileUrl: 'https://storage.example.com/receipts/test-receipt-1.jpg',
    fileId: 'file-123',
    fileName: 'receipt-office-depot.jpg',
    fileSize: 1024000,
    mimeType: 'image/jpeg',
    storageProvider: 'firebase',
    thumbnailUrl: 'https://storage.example.com/receipts/thumbnails/test-receipt-1.jpg',
    expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString(),
    createdAt: new Date('2025-12-15').toISOString(),
    updatedAt: new Date('2025-12-15').toISOString()
  },
  {
    id: 'test-receipt-2',
    userId: mockUser.id,
    vendor: 'Staples',
    amount: 85.00,
    date: '2025-12-20',
    category: 'Office Expenses',
    notes: 'Printer ink and paper',
    companyId: mockCompany.id,
    transactionId: null,
    hasImage: false,
    fileUrl: '',
    fileId: '',
    fileName: '',
    fileSize: 0,
    mimeType: '',
    storageProvider: 'none',
    thumbnailUrl: '',
    expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString(),
    createdAt: new Date('2025-12-20').toISOString(),
    updatedAt: new Date('2025-12-20').toISOString()
  },
  {
    id: 'test-receipt-3',
    userId: mockUser.id,
    vendor: 'Gas Station',
    amount: 45.75,
    date: '2025-12-22',
    category: 'Travel',
    notes: 'Business travel fuel',
    companyId: mockCompany.id,
    transactionId: 'tx-cash-001',
    hasImage: true,
    fileUrl: 'https://res.cloudinary.com/test/receipts/test-receipt-3.jpg',
    fileId: 'cloud-file-456',
    fileName: 'gas-receipt.jpg',
    fileSize: 512000,
    mimeType: 'image/jpeg',
    storageProvider: 'cloudinary',
    thumbnailUrl: 'https://res.cloudinary.com/test/receipts/thumbnails/test-receipt-3.jpg',
    expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString(),
    createdAt: new Date('2025-12-22').toISOString(),
    updatedAt: new Date('2025-12-22').toISOString()
  }
];

// Receipt that's about to expire (for expiration testing)
export const mockExpiringReceipt = {
  id: 'test-receipt-expiring',
  userId: mockUser.id,
  vendor: 'Old Store',
  amount: 50.00,
  date: almostTwoYearsAgo.toISOString().split('T')[0],
  category: 'Miscellaneous',
  notes: 'Old receipt about to expire',
  companyId: mockCompany.id,
  transactionId: null,
  hasImage: true,
  fileUrl: 'https://storage.example.com/receipts/expiring.jpg',
  fileId: 'file-old',
  fileName: 'old-receipt.jpg',
  fileSize: 256000,
  mimeType: 'image/jpeg',
  storageProvider: 'firebase',
  thumbnailUrl: '',
  expiresAt: almostTwoYearsAgo.toISOString(),
  createdAt: almostTwoYearsAgo.toISOString(),
  updatedAt: almostTwoYearsAgo.toISOString()
};

// Receipt that has expired
export const mockExpiredReceipt = {
  id: 'test-receipt-expired',
  userId: mockUser.id,
  vendor: 'Ancient Store',
  amount: 25.00,
  date: twoYearsAgo.toISOString().split('T')[0],
  category: 'Miscellaneous',
  notes: 'Expired receipt',
  companyId: mockCompany.id,
  transactionId: null,
  hasImage: true,
  fileUrl: 'https://storage.example.com/receipts/expired.jpg',
  fileId: 'file-expired',
  fileName: 'expired-receipt.jpg',
  fileSize: 128000,
  mimeType: 'image/jpeg',
  storageProvider: 'firebase',
  thumbnailUrl: '',
  expiresAt: twoYearsAgo.toISOString(),
  createdAt: twoYearsAgo.toISOString(),
  updatedAt: twoYearsAgo.toISOString()
};

// Valid receipt creation data
export const validReceiptData = {
  vendor: 'Test Store',
  amount: 99.99,
  date: '2025-12-28',
  category: 'Office Expenses',
  notes: 'Test purchase',
  companyId: mockCompany.id,
  createTransaction: true
};

// Minimal receipt data (testing optional fields)
export const minimalReceiptData = {
  vendor: 'Quick Shop',
  amount: 10.00,
  date: '2025-12-30'
};

// Invalid receipt data for validation testing
export const invalidReceiptData = {
  missingVendor: {
    amount: 50.00,
    date: '2025-12-28'
  },
  invalidAmount: {
    vendor: 'Store',
    amount: -50.00,
    date: '2025-12-28'
  },
  missingDate: {
    vendor: 'Store',
    amount: 50.00
  },
  invalidDate: {
    vendor: 'Store',
    amount: 50.00,
    date: 'not-a-date'
  }
};

// Bulk receipt data for testing bulk operations
export const bulkReceiptData = [
  {
    vendor: 'Store A',
    amount: 25.00,
    date: '2025-12-25',
    category: 'Supplies',
    createTransaction: true
  },
  {
    vendor: 'Store B',
    amount: 50.00,
    date: '2025-12-26',
    category: 'Travel',
    createTransaction: true
  },
  {
    vendor: 'Store C',
    amount: 75.00,
    date: '2025-12-27',
    category: 'Meals',
    createTransaction: false // Documentation only
  }
];

// Mock file for upload testing
export const mockFile = {
  originalname: 'test-receipt.jpg',
  filename: 'test-receipt.jpg',
  mimetype: 'image/jpeg',
  size: 1024000,
  buffer: Buffer.from('fake-image-data')
};

// Export user and company for convenience
export { mockUser, mockCompany, mockTransactions };
