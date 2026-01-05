/**
 * Check Schema
 * Defines the structure for check records
 * 
 * Key features:
 * - All fields except userId are optional
 * - Priority fields: checkNumber, amount, date, payee
 * - Image upload is optional (check image/document)
 * - Can be income (received check) or expense (written check)
 * - 7-year retention policy for tax purposes
 */

/**
 * Storage providers for check images
 */
export const STORAGE_PROVIDERS = {
  FIREBASE: 'firebase',
  CLOUDINARY: 'cloudinary',
  NONE: 'none'
};

/**
 * Check types
 */
export const CHECK_TYPES = {
  EXPENSE: 'expense',  // Check you wrote (money out)
  INCOME: 'income'     // Check you received (money in)
};

/**
 * Check retention period in milliseconds (7 years for tax purposes)
 */
export const CHECK_RETENTION_MS = 7 * 365 * 24 * 60 * 60 * 1000;

/**
 * Days before expiration to flag as "expiring soon"
 */
export const EXPIRING_SOON_DAYS = 90;

/**
 * Allowed file types for check images
 */
export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf'
];

/**
 * Maximum file size for check images (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Base Check Schema
 * All fields except userId are optional to allow flexible data entry
 */
export const CheckSchema = {
  // System fields
  id: '',                      // Auto-generated UUID
  userId: '',                  // Owner (required)
  
  // Priority fields (optional but encouraged)
  checkNumber: '',             // Check number
  amount: null,                // Check amount (null if not entered)
  date: '',                    // Check date (YYYY-MM-DD)
  payee: '',                   // Who the check is to/from
  
  // Type - income (received) or expense (written)
  type: CHECK_TYPES.EXPENSE,   // Default to expense (written check)
  
  // Bank information
  bankName: '',                // Bank name
  accountNumber: '',           // Last 4 digits of account (for reference)
  routingNumber: '',           // Routing number (partial, for reference)
  
  // Additional metadata
  memo: '',                    // Memo line on check
  notes: '',                   // User notes about the check
  category: '',                // IRS category
  companyId: '',               // Company association
  transactionId: '',           // Primary linked transaction (nullable) - kept for backward compatibility
  transactionIds: [],          // Multiple linked transactions - supports linking to multiple transactions
  
  // For expense checks - contractor/vendor tracking
  vendorId: '',                // Vendor ID if applicable
  vendorName: '',              // Vendor name
  isContractorPayment: false,  // Flag for 1099 tracking
  
  // Image/file information (optional - only if image uploaded)
  hasImage: false,             // Whether an image is attached
  fileUrl: '',                 // Storage URL (Firebase or Cloudinary)
  fileId: '',                  // Storage file ID for deletion
  fileName: '',                // Original filename
  fileSize: 0,                 // File size in bytes
  mimeType: '',                // MIME type (image/jpeg, application/pdf, etc.)
  storageProvider: STORAGE_PROVIDERS.NONE,  // 'firebase', 'cloudinary', or 'none'
  thumbnailUrl: '',            // Thumbnail URL
  
  // Check status
  status: 'pending',           // pending, cleared, bounced, voided, cancelled
  clearedDate: '',             // Date check cleared
  
  // Timestamps
  createdAt: null,             // Creation timestamp
  updatedAt: null,             // Last update timestamp
  expiresAt: null,             // Auto-set to createdAt + 7 years
  
  // Expiration tracking
  isExpiringSoon: false        // Flag for checks expiring within 90 days
};

/**
 * Check status options
 */
export const CHECK_STATUSES = {
  PENDING: 'pending',
  CLEARED: 'cleared',
  BOUNCED: 'bounced',
  VOIDED: 'voided',
  CANCELLED: 'cancelled'
};

/**
 * Create a new check object with defaults
 * @param {string} userId - Required user ID
 * @param {Object} data - Optional check data
 * @returns {Object} Check object with defaults applied
 */
export function createCheckObject(userId, data = {}) {
  if (!userId) {
    throw new Error('userId is required');
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + CHECK_RETENTION_MS);

  return {
    ...CheckSchema,
    ...data,
    userId,
    type: data.type || CHECK_TYPES.EXPENSE,
    status: data.status || 'pending',
    createdAt: now,
    updatedAt: now,
    expiresAt
  };
}

/**
 * Validate check data
 * @param {Object} data - Check data to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateCheck(data) {
  const errors = [];

  // Validate amount if provided
  if (data.amount !== null && data.amount !== undefined) {
    const amount = parseFloat(data.amount);
    if (isNaN(amount)) {
      errors.push('Amount must be a valid number');
    } else if (amount < 0) {
      errors.push('Amount must be positive (type determines income/expense)');
    } else if (amount > 999999999.99) {
      errors.push('Amount exceeds maximum allowed value');
    }
  }

  // Validate date format if provided
  if (data.date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.date)) {
      errors.push('Date must be in YYYY-MM-DD format');
    }
  }

  // Validate check number length
  if (data.checkNumber && data.checkNumber.length > 20) {
    errors.push('Check number must be less than 20 characters');
  }

  // Validate payee length
  if (data.payee && data.payee.length > 200) {
    errors.push('Payee name must be less than 200 characters');
  }

  // Validate memo length
  if (data.memo && data.memo.length > 500) {
    errors.push('Memo must be less than 500 characters');
  }

  // Validate notes length
  if (data.notes && data.notes.length > 1000) {
    errors.push('Notes must be less than 1000 characters');
  }

  // Validate type
  if (data.type && !Object.values(CHECK_TYPES).includes(data.type)) {
    errors.push('Type must be "income" or "expense"');
  }

  // Validate status
  if (data.status && !Object.values(CHECK_STATUSES).includes(data.status)) {
    errors.push('Invalid check status');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Format check for API response
 * @param {Object} check - Raw check object
 * @returns {Object} Formatted check
 */
export function formatCheckResponse(check) {
  if (!check) return null;

  return {
    id: check.id,
    userId: check.userId,
    checkNumber: check.checkNumber || '',
    amount: check.amount,
    date: check.date || '',
    payee: check.payee || '',
    type: check.type || CHECK_TYPES.EXPENSE,
    bankName: check.bankName || '',
    memo: check.memo || '',
    notes: check.notes || '',
    category: check.category || '',
    companyId: check.companyId || '',
    transactionId: check.transactionId || '',
    vendorId: check.vendorId || '',
    vendorName: check.vendorName || '',
    isContractorPayment: !!check.isContractorPayment,
    hasImage: !!check.hasImage,
    fileUrl: check.fileUrl || '',
    thumbnailUrl: check.thumbnailUrl || '',
    status: check.status || 'pending',
    clearedDate: check.clearedDate || '',
    createdAt: check.createdAt?.toDate?.() || check.createdAt,
    updatedAt: check.updatedAt?.toDate?.() || check.updatedAt,
    expiresAt: check.expiresAt?.toDate?.() || check.expiresAt,
    isExpiringSoon: !!check.isExpiringSoon
  };
}

export default {
  CheckSchema,
  CHECK_TYPES,
  CHECK_STATUSES,
  STORAGE_PROVIDERS,
  CHECK_RETENTION_MS,
  EXPIRING_SOON_DAYS,
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
  createCheckObject,
  validateCheck,
  formatCheckResponse
};
