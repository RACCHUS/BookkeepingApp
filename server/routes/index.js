/**
 * Centralized Route Exports
 * 
 * This file provides a central point for importing all route modules.
 * It enables clean imports and better organization of the API structure.
 * 
 * All routes use validation constants from routeConstants.js to ensure
 * consistency across the API and eliminate magic numbers/strings.
 * 
 * Usage:
 * import { transactionRoutes, companyRoutes } from './routes/index.js';
 * 
 * @see {@link ./routeConstants.js} for validation constants and constraints
 * @author BookkeepingApp Team
 * @version 1.0.0
 */

// Import all route modules
import transactionRoutes from './transactionRoutes.js';
import companyRoutes from './companyRoutes.js';
import payeeRoutes from './payeeRoutes.js';
import reportRoutes from './reportRoutes.js';
import classificationRoutes from './classificationRoutes.js';
import pdfRoutes from './pdfRoutes.js';

// Export all routes for easy importing
export {
  transactionRoutes,
  companyRoutes,
  payeeRoutes,
  reportRoutes,
  classificationRoutes,
  pdfRoutes
};

/**
 * Default route configuration mapping
 * Maps base paths to their corresponding route handlers
 */
export default {
  '/api/transactions': transactionRoutes,
  '/api/companies': companyRoutes,
  '/api/payees': payeeRoutes,
  '/api/reports': reportRoutes,
  '/api/classification': classificationRoutes,
  '/api/pdf': pdfRoutes
};

/**
 * Route Structure Overview:
 * 
 * @route /api/transactions - Transaction management and operations
 *   - CRUD operations for transactions
 *   - Bulk updates and categorization
 *   - Classification suggestions
 *   - Category statistics and summaries
 * 
 * @route /api/companies - Company profile and settings
 *   - Company CRUD operations
 *   - Default company management
 *   - PDF company extraction
 * 
 * @route /api/payees - Payee management (vendors, employees)
 *   - Payee CRUD operations
 *   - Employee and vendor filtering
 *   - Transaction-payee associations
 * 
 * @route /api/reports - Financial reporting and analytics
 *   - Profit & Loss reports
 *   - Tax summaries
 *   - Expense breakdowns
 *   - PDF export functionality
 * 
 * @route /api/classification - Transaction classification and rules
 *   - Rule-based transaction classification
 *   - Classification rule management
 *   - Uncategorized transaction queries
 * 
 * @route /api/pdf - PDF upload and processing
 *   - Bank statement uploads
 *   - PDF processing and extraction
 *   - Upload management (rename, delete)
 */
