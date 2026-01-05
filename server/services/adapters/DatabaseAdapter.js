/**
 * @fileoverview Database Adapter Base Class
 * @description Abstract base class that defines the interface for all database adapters.
 *              Allows switching between Firebase, Supabase, or other database providers.
 * @version 1.0.0
 */

/**
 * Abstract Database Adapter
 * All database providers must implement these methods
 */
class DatabaseAdapter {
  constructor(providerName) {
    if (new.target === DatabaseAdapter) {
      throw new Error('DatabaseAdapter is abstract and cannot be instantiated directly');
    }
    this.providerName = providerName;
    this.isInitialized = false;
  }

  /**
   * Initialize the database connection
   * @returns {Promise<void>}
   */
  async initialize() {
    throw new Error('Method initialize() must be implemented');
  }

  /**
   * Check if the database is connected and healthy
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    throw new Error('Method healthCheck() must be implemented');
  }

  // ==================== TRANSACTIONS ====================

  /**
   * Create a new transaction
   * @param {string} userId - User ID
   * @param {object} transactionData - Transaction data
   * @returns {Promise<{id: string, ...transactionData}>}
   */
  async createTransaction(userId, transactionData) {
    throw new Error('Method createTransaction() must be implemented');
  }

  /**
   * Get transactions with filters
   * @param {string} userId - User ID
   * @param {object} filters - Filter options (companyId, statementId, dateRange, category, type, limit, offset)
   * @returns {Promise<{transactions: Array, total: number}>}
   */
  async getTransactions(userId, filters = {}) {
    throw new Error('Method getTransactions() must be implemented');
  }

  /**
   * Get a single transaction by ID
   * @param {string} userId - User ID
   * @param {string} transactionId - Transaction ID
   * @returns {Promise<object|null>}
   */
  async getTransactionById(userId, transactionId) {
    throw new Error('Method getTransactionById() must be implemented');
  }

  /**
   * Update a transaction
   * @param {string} userId - User ID
   * @param {string} transactionId - Transaction ID
   * @param {object} updateData - Fields to update
   * @returns {Promise<object>}
   */
  async updateTransaction(userId, transactionId, updateData) {
    throw new Error('Method updateTransaction() must be implemented');
  }

  /**
   * Delete a transaction
   * @param {string} userId - User ID
   * @param {string} transactionId - Transaction ID
   * @returns {Promise<boolean>}
   */
  async deleteTransaction(userId, transactionId) {
    throw new Error('Method deleteTransaction() must be implemented');
  }

  /**
   * Get transaction summary/stats
   * @param {string} userId - User ID
   * @param {object} filters - Filter options
   * @returns {Promise<{totalIncome: number, totalExpenses: number, netIncome: number, transactionCount: number}>}
   */
  async getTransactionSummary(userId, filters = {}) {
    throw new Error('Method getTransactionSummary() must be implemented');
  }

  /**
   * Bulk assign payee to multiple transactions
   * @param {string} userId - User ID
   * @param {string[]} transactionIds - Array of transaction IDs
   * @param {string} payeeId - Payee ID
   * @param {string} payeeName - Payee name
   * @returns {Promise<{updated: number}>}
   */
  async bulkAssignPayeeToTransactions(userId, transactionIds, payeeId, payeeName) {
    throw new Error('Method bulkAssignPayeeToTransactions() must be implemented');
  }

  /**
   * Bulk unassign payee from transactions
   * @param {string} userId - User ID
   * @param {string[]} transactionIds - Array of transaction IDs
   * @returns {Promise<{updated: number}>}
   */
  async bulkUnassignPayeeFromTransactions(userId, transactionIds) {
    throw new Error('Method bulkUnassignPayeeFromTransactions() must be implemented');
  }

  /**
   * Bulk unassign company from transactions
   * @param {string} userId - User ID
   * @param {string[]} transactionIds - Array of transaction IDs
   * @returns {Promise<{updated: number}>}
   */
  async bulkUnassignCompanyFromTransactions(userId, transactionIds) {
    throw new Error('Method bulkUnassignCompanyFromTransactions() must be implemented');
  }

  // ==================== COMPANIES ====================

  /**
   * Create a new company
   * @param {string} userId - User ID
   * @param {object} companyData - Company data
   * @returns {Promise<string>} Company ID
   */
  async createCompany(userId, companyData) {
    throw new Error('Method createCompany() must be implemented');
  }

  /**
   * Get all companies for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>}
   */
  async getUserCompanies(userId) {
    throw new Error('Method getUserCompanies() must be implemented');
  }

  /**
   * Get a company by ID
   * @param {string} userId - User ID
   * @param {string} companyId - Company ID
   * @returns {Promise<object|null>}
   */
  async getCompanyById(userId, companyId) {
    throw new Error('Method getCompanyById() must be implemented');
  }

  /**
   * Update a company
   * @param {string} userId - User ID
   * @param {string} companyId - Company ID
   * @param {object} updateData - Fields to update
   * @returns {Promise<object>}
   */
  async updateCompany(userId, companyId, updateData) {
    throw new Error('Method updateCompany() must be implemented');
  }

  /**
   * Delete a company (soft delete)
   * @param {string} userId - User ID
   * @param {string} companyId - Company ID
   * @returns {Promise<boolean>}
   */
  async deleteCompany(userId, companyId) {
    throw new Error('Method deleteCompany() must be implemented');
  }

  // ==================== PAYEES ====================

  /**
   * Create a new payee
   * @param {string} userId - User ID
   * @param {object} payeeData - Payee data
   * @returns {Promise<string>} Payee ID
   */
  async createPayee(userId, payeeData) {
    throw new Error('Method createPayee() must be implemented');
  }

  /**
   * Get all payees for a user
   * @param {string} userId - User ID
   * @param {object} filters - Filter options (type, isActive)
   * @returns {Promise<Array>}
   */
  async getPayees(userId, filters = {}) {
    throw new Error('Method getPayees() must be implemented');
  }

  /**
   * Get a payee by ID
   * @param {string} userId - User ID
   * @param {string} payeeId - Payee ID
   * @returns {Promise<object|null>}
   */
  async getPayeeById(userId, payeeId) {
    throw new Error('Method getPayeeById() must be implemented');
  }

  /**
   * Update a payee
   * @param {string} userId - User ID
   * @param {string} payeeId - Payee ID
   * @param {object} updateData - Fields to update
   * @returns {Promise<object>}
   */
  async updatePayee(userId, payeeId, updateData) {
    throw new Error('Method updatePayee() must be implemented');
  }

  /**
   * Delete a payee
   * @param {string} userId - User ID
   * @param {string} payeeId - Payee ID
   * @returns {Promise<boolean>}
   */
  async deletePayee(userId, payeeId) {
    throw new Error('Method deletePayee() must be implemented');
  }

  // ==================== UPLOADS ====================

  /**
   * Create an upload record
   * @param {string} userId - User ID
   * @param {object} uploadData - Upload data
   * @returns {Promise<string>} Upload ID
   */
  async createUploadRecord(userId, uploadData) {
    throw new Error('Method createUploadRecord() must be implemented');
  }

  /**
   * Get uploads for a user
   * @param {string} userId - User ID
   * @param {object} filters - Filter options
   * @returns {Promise<Array>}
   */
  async getUploads(userId, filters = {}) {
    throw new Error('Method getUploads() must be implemented');
  }

  /**
   * Get an upload by ID
   * @param {string} userId - User ID
   * @param {string} uploadId - Upload ID
   * @returns {Promise<object|null>}
   */
  async getUploadById(userId, uploadId) {
    throw new Error('Method getUploadById() must be implemented');
  }

  /**
   * Update an upload
   * @param {string} userId - User ID
   * @param {string} uploadId - Upload ID
   * @param {object} updates - Fields to update
   * @returns {Promise<object>}
   */
  async updateUpload(userId, uploadId, updates) {
    throw new Error('Method updateUpload() must be implemented');
  }

  /**
   * Delete an upload and its transactions
   * @param {string} userId - User ID
   * @param {string} uploadId - Upload ID
   * @returns {Promise<boolean>}
   */
  async deleteUpload(userId, uploadId) {
    throw new Error('Method deleteUpload() must be implemented');
  }

  // ==================== INCOME SOURCES ====================

  /**
   * Get all income sources for a user
   * @param {string} userId - User ID
   * @param {object} filters - Filter options
   * @returns {Promise<{success: boolean, sources: Array}>}
   */
  async getAllIncomeSources(userId, filters = {}) {
    throw new Error('Method getAllIncomeSources() must be implemented');
  }

  /**
   * Get an income source by ID
   * @param {string} userId - User ID
   * @param {string} sourceId - Income source ID
   * @returns {Promise<{success: boolean, source?: object, error?: string}>}
   */
  async getIncomeSourceById(userId, sourceId) {
    throw new Error('Method getIncomeSourceById() must be implemented');
  }

  /**
   * Create an income source
   * @param {string} userId - User ID
   * @param {object} sourceData - Income source data
   * @returns {Promise<{success: boolean, id: string}>}
   */
  async createIncomeSource(userId, sourceData) {
    throw new Error('Method createIncomeSource() must be implemented');
  }

  /**
   * Update an income source
   * @param {string} userId - User ID
   * @param {string} sourceId - Income source ID
   * @param {object} updateData - Fields to update
   * @returns {Promise<{success: boolean}>}
   */
  async updateIncomeSource(userId, sourceId, updateData) {
    throw new Error('Method updateIncomeSource() must be implemented');
  }

  /**
   * Delete an income source
   * @param {string} userId - User ID
   * @param {string} sourceId - Income source ID
   * @returns {Promise<{success: boolean}>}
   */
  async deleteIncomeSource(userId, sourceId) {
    throw new Error('Method deleteIncomeSource() must be implemented');
  }

  // ==================== CLASSIFICATION RULES ====================

  /**
   * Get classification rules for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>}
   */
  async getClassificationRules(userId) {
    throw new Error('Method getClassificationRules() must be implemented');
  }

  /**
   * Create a classification rule
   * @param {string} userId - User ID
   * @param {object} ruleData - Rule data
   * @returns {Promise<string>} Rule ID
   */
  async createClassificationRule(userId, ruleData) {
    throw new Error('Method createClassificationRule() must be implemented');
  }

  /**
   * Update a classification rule
   * @param {string} userId - User ID
   * @param {string} ruleId - Rule ID
   * @param {object} ruleData - Fields to update
   * @returns {Promise<void>}
   */
  async updateClassificationRule(userId, ruleId, ruleData) {
    throw new Error('Method updateClassificationRule() must be implemented');
  }

  /**
   * Delete a classification rule
   * @param {string} userId - User ID
   * @param {string} ruleId - Rule ID
   * @returns {Promise<void>}
   */
  async deleteClassificationRule(userId, ruleId) {
    throw new Error('Method deleteClassificationRule() must be implemented');
  }
}

export default DatabaseAdapter;
