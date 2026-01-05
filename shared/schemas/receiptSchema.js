/**
 * Receipt Schema
 * Defines the structure for receipt records
 * 
 * Key features:
 * - All fields except userId are optional
 * - Priority fields: vendor, amount, date
 * - Image upload is optional
 * - 2-year retention policy with automatic expiration
 */

/**
 * Storage providers for receipt images
 */
export const STORAGE_PROVIDERS = {
  FIREBASE: 'firebase',
  CLOUDINARY: 'cloudinary',
  NONE: 'none'
};

/**
 * Receipt retention period in milliseconds (2 years)
 */
export const RECEIPT_RETENTION_MS = 2 * 365 * 24 * 60 * 60 * 1000;

/**
 * Days before expiration to flag as "expiring soon"
 */
export const EXPIRING_SOON_DAYS = 30;

/**
 * Allowed file types for receipt images
 */
export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf'
];

/**
 * Maximum file size for receipt images (5MB)
 */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Base Receipt Schema
 * All fields except userId are optional to allow flexible data entry
 */
export const ReceiptSchema = {
  // System fields
  id: '',                      // Auto-generated UUID
  userId: '',                  // Owner (required)
  
  // Priority fields (optional but encouraged)
  vendor: '',                  // Vendor/store name
  amount: null,                // Receipt amount (null if not entered)
  date: '',                    // Receipt date (YYYY-MM-DD)
  
  // Additional metadata
  notes: '',                   // User notes about the receipt
  companyId: '',               // Company association
  transactionId: '',           // Primary linked transaction (nullable) - kept for backward compatibility
  transactionIds: [],          // Multiple linked transactions - supports linking to multiple transactions
  
  // Image/file information (optional - only if image uploaded)
  hasImage: false,             // Whether an image is attached
  fileUrl: '',                 // Storage URL (Firebase or Cloudinary)
  fileId: '',                  // Storage file ID for deletion
  fileName: '',                // Original filename
  fileSize: 0,                 // File size in bytes
  mimeType: '',                // MIME type (image/jpeg, application/pdf, etc.)
  storageProvider: STORAGE_PROVIDERS.NONE,  // 'firebase', 'cloudinary', or 'none'
  thumbnailUrl: '',            // Thumbnail URL (Cloudinary generates these)
  
  // Timestamps
  createdAt: null,             // Creation timestamp
  updatedAt: null,             // Last update timestamp
  expiresAt: null,             // Auto-set to createdAt + 2 years
  
  // Expiration tracking
  isExpiringSoon: false        // Flag for receipts expiring within 30 days
};

/**
 * Create a new receipt object with defaults
 * @param {string} userId - Required user ID
 * @param {Object} data - Optional receipt data
 * @returns {Object} Receipt object with defaults applied
 */
export function createReceiptObject(userId, data = {}) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + RECEIPT_RETENTION_MS);
  
  return {
    ...ReceiptSchema,
    ...data,
    userId,
    hasImage: Boolean(data.fileUrl),
    createdAt: now,
    updatedAt: now,
    expiresAt,
    isExpiringSoon: false
  };
}

/**
 * Validate receipt data
 * @param {Object} data - Receipt data to validate
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateReceiptData(data) {
  const errors = [];
  
  // Validate amount if provided
  if (data.amount !== null && data.amount !== undefined && data.amount !== '') {
    const amount = parseFloat(data.amount);
    if (isNaN(amount)) {
      errors.push('Amount must be a valid number');
    }
  }
  
  // Validate date format if provided
  if (data.date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.date)) {
      errors.push('Date must be in YYYY-MM-DD format');
    } else {
      const parsedDate = new Date(data.date);
      if (isNaN(parsedDate.getTime())) {
        errors.push('Date is not a valid date');
      }
    }
  }
  
  // Validate vendor length if provided
  if (data.vendor && data.vendor.length > 200) {
    errors.push('Vendor name must be less than 200 characters');
  }
  
  // Validate notes length if provided
  if (data.notes && data.notes.length > 1000) {
    errors.push('Notes must be less than 1000 characters');
  }
  
  // Validate file type if provided
  if (data.mimeType && !ALLOWED_FILE_TYPES.includes(data.mimeType)) {
    errors.push(`File type must be one of: ${ALLOWED_FILE_TYPES.join(', ')}`);
  }
  
  // Validate file size if provided
  if (data.fileSize && data.fileSize > MAX_FILE_SIZE) {
    errors.push(`File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check if a receipt is expiring soon (within 30 days)
 * @param {Date|string} expiresAt - Expiration date
 * @returns {boolean}
 */
export function isReceiptExpiringSoon(expiresAt) {
  if (!expiresAt) return false;
  
  const expDate = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  const now = new Date();
  const daysUntilExpiration = (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  
  return daysUntilExpiration <= EXPIRING_SOON_DAYS && daysUntilExpiration > 0;
}

/**
 * Check if a receipt has expired
 * @param {Date|string} expiresAt - Expiration date
 * @returns {boolean}
 */
export function isReceiptExpired(expiresAt) {
  if (!expiresAt) return false;
  
  const expDate = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  return new Date() > expDate;
}

/**
 * Format receipt for API response
 * @param {Object} receipt - Raw receipt from database
 * @returns {Object} Formatted receipt
 */
export function formatReceiptResponse(receipt) {
  return {
    ...receipt,
    // Ensure dates are ISO strings
    createdAt: receipt.createdAt?.toDate?.() || receipt.createdAt,
    updatedAt: receipt.updatedAt?.toDate?.() || receipt.updatedAt,
    expiresAt: receipt.expiresAt?.toDate?.() || receipt.expiresAt,
    // Calculate expiring soon flag
    isExpiringSoon: isReceiptExpiringSoon(receipt.expiresAt)
  };
}

export default ReceiptSchema;
