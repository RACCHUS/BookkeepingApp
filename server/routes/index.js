/**
 * Centralized Route Exports
 * 
 * This file provides a central point for importing all route modules.
 * It enables clean imports and better organization of the API structure.
 * 
 * Usage:
 * import { transactionRoutes, companyRoutes } from './routes/index.js';
 * 
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

// Default export with route configuration mapping
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
 * /api/transactions - Transaction management and operations
 * /api/companies - Company profile and settings
 * /api/payees - Payee management (vendors, employees)
 * /api/reports - Financial reporting and analytics
 * /api/classification - Transaction classification and rules
 * /api/pdf - PDF upload and processing
 */
