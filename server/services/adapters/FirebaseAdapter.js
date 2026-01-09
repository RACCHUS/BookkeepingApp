/**
 * @fileoverview Firebase Database Adapter
 * @description Wraps legacy Firebase services for the adapter pattern
 * @version 1.0.0
 */

import DatabaseAdapter from './DatabaseAdapter.js';
import { firebaseService, companyService, payeeService, incomeSourceService } from '../legacy/firebase/index.js';

/**
 * Firebase Adapter - Wraps existing Firebase services
 */
class FirebaseAdapter extends DatabaseAdapter {
  constructor() {
    super('firebase');
    this.firebase = firebaseService;
    this.company = companyService;
    this.payee = payeeService;
    this.incomeSource = incomeSourceService;
  }

  /**
   * Initialize Firebase connection
   */
  async initialize() {
    // Firebase service initializes in constructor
    this.isInitialized = this.firebase.isInitialized;
    console.log('🔥 FirebaseAdapter: Initialized');
    return true;
  }

  /**
   * Health check for Firebase
   */
  async healthCheck() {
    try {
      // Try to access Firestore
      return this.firebase.isInitialized;
    } catch {
      return false;
    }
  }

  // ==================== TRANSACTIONS ====================

  async createTransaction(userId, transactionData) {
    return this.firebase.createTransaction(userId, transactionData);
  }

  async getTransactions(userId, filters = {}) {
    return this.firebase.getTransactions(userId, filters);
  }

  async getTransactionById(userId, transactionId) {
    return this.firebase.getTransactionById(userId, transactionId);
  }

  async updateTransaction(userId, transactionId, updateData) {
    return this.firebase.updateTransaction(userId, transactionId, updateData);
  }

  async deleteTransaction(userId, transactionId) {
    return this.firebase.deleteTransaction(userId, transactionId);
  }

  async getTransactionSummary(userId, filters = {}) {
    return this.firebase.getTransactionSummary(userId, filters);
  }

  async getUncategorizedTransactions(userId, limit = 100) {
    return this.firebase.getUncategorizedTransactions(userId, limit);
  }

  async migrateDevTransactions(userId) {
    return this.firebase.migrateDevTransactions(userId);
  }

  async assignPayeeToTransaction(userId, transactionId, payeeId, payeeName) {
    return this.firebase.assignPayeeToTransaction(userId, transactionId, payeeId, payeeName);
  }

  async bulkAssignPayeeToTransactions(userId, transactionIds, payeeId, payeeName) {
    return this.firebase.bulkAssignPayeeToTransactions(userId, transactionIds, payeeId, payeeName);
  }

  async bulkUnassignPayeeFromTransactions(userId, transactionIds) {
    return this.firebase.bulkUnassignPayeeFromTransactions(userId, transactionIds);
  }

  async bulkUnassignCompanyFromTransactions(userId, transactionIds) {
    return this.firebase.bulkUnassignCompanyFromTransactions(userId, transactionIds);
  }

  // ==================== COMPANIES ====================

  async createCompany(userId, companyData) {
    return this.company.createCompany(userId, companyData);
  }

  async getUserCompanies(userId) {
    return this.company.getUserCompanies(userId);
  }

  async getCompanyById(userId, companyId) {
    return this.company.getCompanyById(companyId);
  }

  async updateCompany(userId, companyId, updateData) {
    return this.company.updateCompany(companyId, updateData);
  }

  async deleteCompany(userId, companyId) {
    return this.company.deleteCompany(companyId);
  }

  // ==================== PAYEES ====================

  async createPayee(userId, payeeData) {
    return this.payee.createPayee(userId, payeeData);
  }

  async getPayees(userId, filters = {}) {
    return this.payee.getPayees(userId, filters);
  }

  async getPayeeById(userId, payeeId) {
    return this.payee.getPayeeById(payeeId);
  }

  async updatePayee(userId, payeeId, updateData) {
    return this.payee.updatePayee(payeeId, updateData);
  }

  async deletePayee(userId, payeeId) {
    return this.payee.deletePayee(payeeId);
  }

  async getPayeesByType(userId, type, companyId = null) {
    return this.payee.getPayeesByType(userId, type, companyId);
  }

  async getEmployees(userId) {
    return this.firebase.getEmployees(userId);
  }

  async getVendors(userId) {
    return this.payee.getPayeesByType(userId, 'vendor');
  }

  async searchPayees(userId, search, filters = {}) {
    return this.payee.searchPayees(userId, search, filters);
  }

  async getTransactionsWithoutPayees(userId, paymentMethod = null) {
    return this.payee.getTransactionsWithoutPayees(userId, paymentMethod);
  }

  // ==================== UPLOADS ====================

  async createUploadRecord(userId, uploadData) {
    return this.firebase.createUploadRecord(userId, uploadData);
  }

  async getUploads(userId, filters = {}) {
    return this.firebase.getUploads(userId, filters);
  }

  async getUploadById(userId, uploadId) {
    return this.firebase.getUploadById(userId, uploadId);
  }

  async updateUpload(userId, uploadId, updates) {
    return this.firebase.updateUpload(userId, uploadId, updates);
  }

  async deleteUpload(userId, uploadId) {
    return this.firebase.deleteUpload(userId, uploadId);
  }

  async getTransactionsByUploadId(userId, uploadId) {
    return this.firebase.getTransactionsByUploadId(userId, uploadId);
  }

  async deleteTransactionsByUploadId(userId, uploadId) {
    return this.firebase.deleteTransactionsByUploadId(userId, uploadId);
  }

  async unlinkTransactionsByUploadId(userId, uploadId) {
    return this.firebase.unlinkTransactionsByUploadId(userId, uploadId);
  }

  async recordDeletedUploadId(userId, data) {
    return this.firebase.recordDeletedUploadId(userId, data);
  }

  async linkTransactionsToUpload(userId, uploadId, transactionIds) {
    return this.firebase.linkTransactionsToUpload(userId, uploadId, transactionIds);
  }

  // ==================== INCOME SOURCES ====================

  async getAllIncomeSources(userId, filters = {}) {
    return this.incomeSource.getAllIncomeSources(userId, filters);
  }

  async getIncomeSourceById(userId, sourceId) {
    return this.incomeSource.getIncomeSourceById(userId, sourceId);
  }

  async createIncomeSource(userId, sourceData) {
    return this.incomeSource.createIncomeSource(userId, sourceData);
  }

  async updateIncomeSource(userId, sourceId, updateData) {
    return this.incomeSource.updateIncomeSource(userId, sourceId, updateData);
  }

  async deleteIncomeSource(userId, sourceId) {
    return this.incomeSource.deleteIncomeSource(userId, sourceId);
  }

  async getTransactionsByIncomeSource(userId, sourceId, filters = {}) {
    return this.incomeSource.getTransactionsBySource(userId, sourceId, filters);
  }

  async getIncomeSourceSummary(userId, sourceId, filters = {}) {
    return this.incomeSource.getSourceSummary(userId, sourceId, filters);
  }

  // ==================== CLASSIFICATION RULES ====================

  async getClassificationRules(userId) {
    return this.firebase.getClassificationRules(userId);
  }

  async createClassificationRule(userId, ruleData) {
    return this.firebase.createClassificationRule(userId, ruleData);
  }

  async updateClassificationRule(userId, ruleId, ruleData) {
    return this.firebase.updateClassificationRule(userId, ruleId, ruleData);
  }

  async deleteClassificationRule(userId, ruleId) {
    return this.firebase.deleteClassificationRule(userId, ruleId);
  }

  // ==================== FIREBASE-SPECIFIC METHODS ====================
  // These are additional methods that exist in the legacy Firebase service
  // They're exposed here for compatibility but may not be in the base adapter

  async getTransactionsByUploadId(userId, uploadId) {
    return this.firebase.getTransactionsByUploadId(userId, uploadId);
  }

  async deleteTransactionsByUploadId(userId, uploadId) {
    return this.firebase.deleteTransactionsByUploadId(userId, uploadId);
  }

  async linkTransactionsToUpload(userId, uploadId, transactionIds) {
    return this.firebase.linkTransactionsToUpload(userId, uploadId, transactionIds);
  }

  async unlinkTransactionsFromUpload(userId, transactionIds) {
    return this.firebase.unlinkTransactionsFromUpload(userId, transactionIds);
  }

  async unlinkTransactionsByUploadId(userId, uploadId) {
    return this.firebase.unlinkTransactionsByUploadId(userId, uploadId);
  }

  async recordDeletedUploadId(userId, deleteInfo) {
    return this.firebase.recordDeletedUploadId(userId, deleteInfo);
  }

  async assignPayeeToTransaction(userId, transactionId, payeeId, payeeName) {
    return this.firebase.assignPayeeToTransaction(userId, transactionId, payeeId, payeeName);
  }

  async getTransactionsByPayee(userId, payeeId, filters = {}) {
    return this.firebase.getTransactionsByPayee(userId, payeeId, filters);
  }

  async getPayeeSummary(userId, payeeId, year = null) {
    return this.firebase.getPayeeSummary(userId, payeeId, year);
  }

  async getUncategorizedTransactions(userId, limit = 50) {
    return this.firebase.getUncategorizedTransactions(userId, limit);
  }

  async migrateDevTransactions(newUserId) {
    return this.firebase.migrateDevTransactions(newUserId);
  }
}

export default FirebaseAdapter;
