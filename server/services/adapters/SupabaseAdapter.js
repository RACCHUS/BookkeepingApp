/**
 * @fileoverview Supabase Database Adapter
 * @description PostgreSQL-based implementation using Supabase
 * @version 1.0.0
 */

import DatabaseAdapter from './DatabaseAdapter.js';
import { getSupabaseAdmin, isSupabaseConfigured } from '../../config/supabase.js';
import cache from '../../utils/serverCache.js';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Supabase Adapter - PostgreSQL implementation
 */
class SupabaseAdapter extends DatabaseAdapter {
  constructor() {
    super('supabase');
    this.supabase = null;
  }

  /**
   * Initialize the Supabase connection
   */
  async initialize() {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    }
    
    this.supabase = getSupabaseAdmin();
    this.isInitialized = true;
    
    console.log('🔌 SupabaseAdapter: Initialized');
    return true;
  }

  /**
   * Health check for Supabase connection
   */
  async healthCheck() {
    try {
      const { error } = await this.supabase.from('profiles').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  }

  // ==================== TRANSACTIONS ====================

  async createTransaction(userId, transactionData) {
    const { data, error } = await this.supabase
      .from('transactions')
      .insert({
        user_id: userId,
        date: transactionData.date,
        description: transactionData.description,
        amount: transactionData.amount,
        type: transactionData.type || 'expense',
        category: transactionData.category || null,
        subcategory: transactionData.subcategory || null,
        payee: transactionData.payee || null,
        payee_id: transactionData.payeeId || null,
        company_id: transactionData.companyId || null,
        upload_id: transactionData.uploadId || transactionData.statementId || null,
        statement_id: transactionData.statementId || transactionData.uploadId || null,
        income_source_id: transactionData.incomeSourceId || null,
        bank_name: transactionData.bankName || null,
        account_last_four: transactionData.accountLastFour || null,
        check_number: transactionData.checkNumber || null,
        reference_number: transactionData.referenceNumber || null,
        section_code: transactionData.sectionCode || null,
        vendor_id: transactionData.vendorId || null,
        vendor_name: transactionData.vendorName || null,
        is_1099_payment: transactionData.is1099Payment || false,
        is_reconciled: transactionData.isReconciled || false,
        is_reviewed: transactionData.isReviewed || false,
        tags: transactionData.tags || [],
        notes: transactionData.notes || null,
        original_description: transactionData.originalDescription || transactionData.description,
        raw_data: transactionData.rawData || {},
        metadata: transactionData.metadata || {},
        created_by: userId,
        last_modified_by: userId
      })
      .select()
      .single();

    if (error) throw error;

    // Invalidate cache
    cache.delByPrefix(`user:${userId}:transactions`);

    // Transform to match expected format
    return this._transformTransaction(data);
  }

  async getTransactions(userId, filters = {}) {
    // Check cache first
    const cacheKey = cache.makeKey(userId, 'transactions', filters);
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log('[Cache HIT] transactions for user:', userId);
      return cached;
    }
    console.log('[Cache MISS] transactions for user:', userId);

    let query = this.supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('date', { ascending: false });

    // Apply filters
    if (filters.companyId) {
      query = query.eq('company_id', filters.companyId);
    }
    if (filters.statementId || filters.uploadId) {
      query = query.eq('upload_id', filters.statementId || filters.uploadId);
    }
    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.type) {
      query = query.eq('type', filters.type);
    }
    if (filters.payeeId) {
      query = query.eq('payee_id', filters.payeeId);
    }
    if (filters.sectionCode) {
      query = query.eq('section_code', filters.sectionCode);
    }
    if (filters.vendorId) {
      query = query.eq('vendor_id', filters.vendorId);
    }
    if (filters.is1099Payment !== undefined) {
      query = query.eq('is_1099_payment', filters.is1099Payment);
    }
    if (filters.startDate) {
      const startDateStr = filters.startDate instanceof Date 
        ? filters.startDate.toISOString().split('T')[0]
        : filters.startDate;
      query = query.gte('date', startDateStr);
    }
    if (filters.endDate) {
      const endDateStr = filters.endDate instanceof Date 
        ? filters.endDate.toISOString().split('T')[0]
        : filters.endDate;
      query = query.lte('date', endDateStr);
    }
    if (filters.isReconciled !== undefined) {
      query = query.eq('is_reconciled', filters.isReconciled);
    }

    // Pagination
    const limit = filters.limit || 200;
    const offset = filters.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    const result = {
      transactions: (data || []).map(t => this._transformTransaction(t)),
      total: count || 0
    };

    // Cache the result
    cache.set(cacheKey, result, CACHE_TTL);

    return result;
  }

  async getTransactionById(userId, transactionId) {
    const { data, error } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return this._transformTransaction(data);
  }

  async updateTransaction(userId, transactionId, updateData) {
    const updates = {
      updated_at: new Date().toISOString(),
      last_modified_by: userId
    };

    // Map camelCase to snake_case
    const fieldMap = {
      date: 'date',
      description: 'description',
      amount: 'amount',
      type: 'type',
      category: 'category',
      subcategory: 'subcategory',
      payee: 'payee',
      payeeId: 'payee_id',
      payeeName: 'payee',
      companyId: 'company_id',
      uploadId: 'upload_id',
      statementId: 'upload_id',
      incomeSourceId: 'income_source_id',
      sectionCode: 'section_code',
      vendorId: 'vendor_id',
      vendorName: 'vendor_name',
      is1099Payment: 'is_1099_payment',
      checkNumber: 'check_number',
      isReconciled: 'is_reconciled',
      isReviewed: 'is_reviewed',
      tags: 'tags',
      notes: 'notes'
    };

    for (const [camelKey, snakeKey] of Object.entries(fieldMap)) {
      if (updateData[camelKey] !== undefined) {
        updates[snakeKey] = updateData[camelKey];
      }
    }

    const { data, error } = await this.supabase
      .from('transactions')
      .update(updates)
      .eq('id', transactionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    // Invalidate cache
    cache.delByPrefix(`user:${userId}:transactions`);

    return this._transformTransaction(data);
  }

  async deleteTransaction(userId, transactionId) {
    const { error } = await this.supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId)
      .eq('user_id', userId);

    if (error) throw error;

    // Invalidate cache
    cache.delByPrefix(`user:${userId}:transactions`);

    return true;
  }

  async getTransactionSummary(userId, filters = {}) {
    let query = this.supabase
      .from('transactions')
      .select('amount, type')
      .eq('user_id', userId);

    if (filters.companyId) {
      query = query.eq('company_id', filters.companyId);
    }
    if (filters.startDate) {
      query = query.gte('date', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('date', filters.endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    let totalIncome = 0;
    let totalExpenses = 0;

    for (const t of data || []) {
      if (t.type === 'income') {
        totalIncome += parseFloat(t.amount) || 0;
      } else if (t.type === 'expense') {
        totalExpenses += Math.abs(parseFloat(t.amount) || 0);
      }
    }

    return {
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses,
      transactionCount: (data || []).length
    };
  }

  async getUncategorizedTransactions(userId, limit = 100) {
    const { data, error } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .or('category.is.null,category.eq.')
      .order('date', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(t => this._transformTransaction(t));
  }

  async migrateDevTransactions(userId) {
    // For Supabase, this is a no-op since we don't have dev-user transactions
    return { migratedCount: 0 };
  }

  async assignPayeeToTransaction(userId, transactionId, payeeId, payeeName) {
    const { data, error } = await this.supabase
      .from('transactions')
      .update({
        payee_id: payeeId,
        payee: payeeName,
        updated_at: new Date().toISOString(),
        last_modified_by: userId
      })
      .eq('user_id', userId)
      .eq('id', transactionId)
      .select()
      .single();

    if (error) throw error;

    cache.delByPrefix(`user:${userId}:transactions`);

    return { success: true, transaction: this._transformTransaction(data) };
  }

  async bulkAssignPayeeToTransactions(userId, transactionIds, payeeId, payeeName) {
    const { data, error } = await this.supabase
      .from('transactions')
      .update({
        payee_id: payeeId,
        payee: payeeName,
        updated_at: new Date().toISOString(),
        last_modified_by: userId
      })
      .eq('user_id', userId)
      .in('id', transactionIds)
      .select();

    if (error) throw error;

    cache.delByPrefix(`user:${userId}:transactions`);

    return { updated: data?.length || 0 };
  }

  async bulkUnassignPayeeFromTransactions(userId, transactionIds) {
    const { data, error } = await this.supabase
      .from('transactions')
      .update({
        payee_id: null,
        payee: null,
        updated_at: new Date().toISOString(),
        last_modified_by: userId
      })
      .eq('user_id', userId)
      .in('id', transactionIds)
      .select();

    if (error) throw error;

    cache.delByPrefix(`user:${userId}:transactions`);

    return { updated: data?.length || 0 };
  }

  async bulkUnassignCompanyFromTransactions(userId, transactionIds) {
    const { data, error } = await this.supabase
      .from('transactions')
      .update({
        company_id: null,
        updated_at: new Date().toISOString(),
        last_modified_by: userId
      })
      .eq('user_id', userId)
      .in('id', transactionIds)
      .select();

    if (error) throw error;

    cache.delByPrefix(`user:${userId}:transactions`);

    return { updated: data?.length || 0 };
  }

  // ==================== COMPANIES ====================

  async createCompany(userId, companyData) {
    // Check if user has any companies to determine if this should be default
    const { data: existing } = await this.supabase
      .from('companies')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1);

    const isFirst = !existing || existing.length === 0;

    const { data, error } = await this.supabase
      .from('companies')
      .insert({
        user_id: userId,
        name: companyData.name,
        legal_name: companyData.legalName || null,
        tax_id: companyData.taxId || null,
        business_type: companyData.businessType || 'sole_proprietorship',
        industry: companyData.industry || null,
        address: companyData.address || {},
        contact_info: companyData.contactInfo || {},
        is_default: isFirst || companyData.isDefault || false,
        is_active: true,
        fiscal_year_start: companyData.fiscalYearStart || 'january',
        settings: companyData.settings || {},
        notes: companyData.notes || null,
        created_by: userId,
        last_modified_by: userId
      })
      .select()
      .single();

    if (error) throw error;

    cache.delByPrefix(`user:${userId}:companies`);

    return data.id;
  }

  async getUserCompanies(userId) {
    const cacheKey = cache.makeKey(userId, 'companies');
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log('[Cache HIT] companies for user:', userId);
      return cached;
    }
    console.log('[Cache MISS] companies for user:', userId);

    const { data, error } = await this.supabase
      .from('companies')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true });

    if (error) throw error;

    const result = (data || []).map(c => this._transformCompany(c));
    cache.set(cacheKey, result, CACHE_TTL);

    return result;
  }

  async getCompanyById(userId, companyId) {
    const { data, error } = await this.supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return this._transformCompany(data);
  }

  async updateCompany(userId, companyId, updateData) {
    const updates = {
      updated_at: new Date().toISOString(),
      last_modified_by: userId
    };

    const fieldMap = {
      name: 'name',
      legalName: 'legal_name',
      taxId: 'tax_id',
      businessType: 'business_type',
      industry: 'industry',
      address: 'address',
      contactInfo: 'contact_info',
      isDefault: 'is_default',
      fiscalYearStart: 'fiscal_year_start',
      settings: 'settings',
      notes: 'notes'
    };

    for (const [camelKey, snakeKey] of Object.entries(fieldMap)) {
      if (updateData[camelKey] !== undefined) {
        updates[snakeKey] = updateData[camelKey];
      }
    }

    const { data, error } = await this.supabase
      .from('companies')
      .update(updates)
      .eq('id', companyId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    cache.delByPrefix(`user:${userId}:companies`);

    return this._transformCompany(data);
  }

  async deleteCompany(userId, companyId) {
    // Soft delete
    const { error } = await this.supabase
      .from('companies')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', companyId)
      .eq('user_id', userId);

    if (error) throw error;

    cache.delByPrefix(`user:${userId}:companies`);

    return true;
  }

  async getDefaultCompany(userId) {
    const { data, error } = await this.supabase
      .from('companies')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return data ? this._transformCompany(data) : null;
  }

  async setDefaultCompany(companyId, userId) {
    // First, unset any existing default
    await this.supabase
      .from('companies')
      .update({ is_default: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_default', true);

    // Now set the new default
    const { data, error } = await this.supabase
      .from('companies')
      .update({ is_default: true, updated_at: new Date().toISOString() })
      .eq('id', companyId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    cache.delByPrefix(`user:${userId}:companies`);

    return this._transformCompany(data);
  }

  async findCompanyByName(userId, name) {
    const { data, error } = await this.supabase
      .from('companies')
      .select('*')
      .eq('user_id', userId)
      .ilike('name', name)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? this._transformCompany(data) : null;
  }

  async getTransactionsWithoutCompany(userId) {
    const { data, error } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .is('company_id', null)
      .order('date', { ascending: false });

    if (error) throw error;
    return (data || []).map(t => this._transformTransaction(t));
  }

  async bulkAssignCompanyToTransactions(companyId, transactionIds, userId) {
    if (!transactionIds || transactionIds.length === 0) {
      return { updated: 0 };
    }

    const { data, error } = await this.supabase
      .from('transactions')
      .update({ 
        company_id: companyId, 
        updated_at: new Date().toISOString() 
      })
      .eq('user_id', userId)
      .in('id', transactionIds)
      .select();

    if (error) throw error;

    // Invalidate transaction caches
    cache.delByPrefix(`user:${userId}:transactions`);

    return { updated: data?.length || 0 };
  }

  extractCompanyFromChaseStatement(pdfText) {
    // Extract company name from Chase statement PDF text
    // This is a utility method that doesn't interact with the database
    if (!pdfText) return null;

    // Look for common patterns in Chase statements
    const patterns = [
      /Account\s+(?:Name|Holder)[:\s]+([^\n]+)/i,
      /Business\s+(?:Name|Account)[:\s]+([^\n]+)/i,
      /(?:^|\n)([A-Z][A-Za-z\s&.,]+(?:LLC|Inc|Corp|Co|Ltd|LLP)?)[\s\n]+Account/i
    ];

    for (const pattern of patterns) {
      const match = pdfText.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  // ==================== PAYEES ====================

  async createPayee(userId, payeeData) {
    const { data, error } = await this.supabase
      .from('payees')
      .insert({
        user_id: userId,
        name: payeeData.name,
        type: payeeData.type || 'vendor',
        business_name: payeeData.businessName || null,
        email: payeeData.email || null,
        phone: payeeData.phone || null,
        company_id: payeeData.companyId || null,
        tax_id: payeeData.taxId || null,
        is_1099_required: payeeData.is1099Required || false,
        employee_id: payeeData.employeeId || null,
        position: payeeData.position || null,
        department: payeeData.department || null,
        hire_date: payeeData.hireDate || null,
        is_active: payeeData.isActive !== false,
        preferred_payment_method: payeeData.preferredPaymentMethod || 'check',
        vendor_id: payeeData.vendorId || null,
        category: payeeData.category || null,
        default_expense_category: payeeData.defaultExpenseCategory || null,
        ytd_paid: payeeData.ytdPaid || 0,
        address: payeeData.address || {},
        bank_account: payeeData.bankAccount || {},
        notes: payeeData.notes || null,
        created_by: userId,
        last_modified_by: userId
      })
      .select()
      .single();

    if (error) throw error;

    cache.delByPrefix(`user:${userId}:payees`);

    return data.id;
  }

  async getPayees(userId, filters = {}) {
    const cacheKey = cache.makeKey(userId, 'payees', filters);
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log('[Cache HIT] payees for user:', userId);
      return cached;
    }
    console.log('[Cache MISS] payees for user:', userId);

    let query = this.supabase
      .from('payees')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (filters.type) {
      query = query.eq('type', filters.type);
    }
    if (filters.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }
    if (filters.companyId) {
      query = query.eq('company_id', filters.companyId);
    }

    const { data, error } = await query;

    if (error) throw error;

    const result = (data || []).map(p => this._transformPayee(p));
    cache.set(cacheKey, result, CACHE_TTL);

    return result;
  }

  async getPayeeById(userId, payeeId) {
    const { data, error } = await this.supabase
      .from('payees')
      .select('*')
      .eq('id', payeeId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return this._transformPayee(data);
  }

  async updatePayee(userId, payeeId, updateData) {
    const updates = {
      updated_at: new Date().toISOString(),
      last_modified_by: userId
    };

    const fieldMap = {
      name: 'name',
      type: 'type',
      businessName: 'business_name',
      email: 'email',
      phone: 'phone',
      companyId: 'company_id',
      taxId: 'tax_id',
      is1099Required: 'is_1099_required',
      employeeId: 'employee_id',
      position: 'position',
      department: 'department',
      hireDate: 'hire_date',
      isActive: 'is_active',
      preferredPaymentMethod: 'preferred_payment_method',
      vendorId: 'vendor_id',
      category: 'category',
      defaultExpenseCategory: 'default_expense_category',
      ytdPaid: 'ytd_paid',
      address: 'address',
      bankAccount: 'bank_account',
      notes: 'notes'
    };

    for (const [camelKey, snakeKey] of Object.entries(fieldMap)) {
      if (updateData[camelKey] !== undefined) {
        updates[snakeKey] = updateData[camelKey];
      }
    }

    const { data, error } = await this.supabase
      .from('payees')
      .update(updates)
      .eq('id', payeeId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    cache.delByPrefix(`user:${userId}:payees`);

    return this._transformPayee(data);
  }

  async deletePayee(userId, payeeId) {
    const { error } = await this.supabase
      .from('payees')
      .delete()
      .eq('id', payeeId)
      .eq('user_id', userId);

    if (error) throw error;

    cache.delByPrefix(`user:${userId}:payees`);

    return true;
  }

  async getPayeesByType(userId, type, companyId = null) {
    let query = this.supabase
      .from('payees')
      .select('*')
      .eq('user_id', userId)
      .eq('type', type)
      .order('name', { ascending: true });

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(p => this._transformPayee(p));
  }

  async getEmployees(userId) {
    return this.getPayeesByType(userId, 'employee');
  }

  async getVendors(userId) {
    return this.getPayeesByType(userId, 'vendor');
  }

  async searchPayees(userId, search, filters = {}) {
    let query = this.supabase
      .from('payees')
      .select('*')
      .eq('user_id', userId)
      .ilike('name', `%${search}%`)
      .order('name', { ascending: true });

    if (filters.type) {
      query = query.eq('type', filters.type);
    }
    if (filters.companyId) {
      query = query.eq('company_id', filters.companyId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(p => this._transformPayee(p));
  }

  async getTransactionsWithoutPayees(userId, sectionCode = null) {
    let query = this.supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .is('payee_id', null)
      .order('date', { ascending: false });

    if (sectionCode) {
      query = query.eq('section_code', sectionCode);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(t => this._transformTransaction(t));
  }

  // ==================== UPLOADS ====================

  async createUploadRecord(userId, uploadData) {
    const { data, error } = await this.supabase
      .from('uploads')
      .insert({
        user_id: userId,
        file_name: uploadData.fileName || uploadData.filename,
        original_name: uploadData.originalName || uploadData.fileName,
        file_size: uploadData.fileSize || uploadData.size,
        mime_type: uploadData.mimeType || 'application/pdf',
        storage_path: uploadData.storagePath || uploadData.path,
        storage_provider: uploadData.storageProvider || 'supabase',
        cloudinary_public_id: uploadData.cloudinaryPublicId || null,
        company_id: uploadData.companyId || null,
        bank_name: uploadData.bankName || null,
        account_last_four: uploadData.accountLastFour || null,
        statement_period_start: uploadData.statementPeriodStart || null,
        statement_period_end: uploadData.statementPeriodEnd || null,
        transaction_count: uploadData.transactionCount || 0,
        status: uploadData.status || 'processing',
        processing_errors: uploadData.processingErrors || [],
        metadata: uploadData.metadata || {}
      })
      .select()
      .single();

    if (error) throw error;

    cache.delByPrefix(`user:${userId}:uploads`);

    return data.id;
  }

  async getUploads(userId, filters = {}) {
    const cacheKey = cache.makeKey(userId, 'uploads', filters);
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log('[Cache HIT] uploads for user:', userId);
      return cached;
    }
    console.log('[Cache MISS] uploads for user:', userId);

    let query = this.supabase
      .from('uploads')
      .select('*')
      .eq('user_id', userId)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false });

    if (filters.companyId) {
      query = query.eq('company_id', filters.companyId);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const limit = filters.limit || 100;
    query = query.limit(limit);

    const { data, error } = await query;

    if (error) throw error;

    const result = (data || []).map(u => this._transformUpload(u));
    cache.set(cacheKey, result, CACHE_TTL);

    return result;
  }

  async getUploadById(userId, uploadId) {
    const { data, error } = await this.supabase
      .from('uploads')
      .select('*')
      .eq('id', uploadId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return this._transformUpload(data);
  }

  async updateUpload(userId, uploadId, updates) {
    const updateData = {
      updated_at: new Date().toISOString()
    };

    const fieldMap = {
      fileName: 'file_name',
      originalName: 'original_name',
      companyId: 'company_id',
      bankName: 'bank_name',
      accountLastFour: 'account_last_four',
      statementPeriodStart: 'statement_period_start',
      statementPeriodEnd: 'statement_period_end',
      transactionCount: 'transaction_count',
      status: 'status',
      processingErrors: 'processing_errors',
      metadata: 'metadata'
    };

    for (const [camelKey, snakeKey] of Object.entries(fieldMap)) {
      if (updates[camelKey] !== undefined) {
        updateData[snakeKey] = updates[camelKey];
      }
    }

    const { data, error } = await this.supabase
      .from('uploads')
      .update(updateData)
      .eq('id', uploadId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    cache.delByPrefix(`user:${userId}:uploads`);

    return this._transformUpload(data);
  }

  async deleteUpload(userId, uploadId) {
    // Get upload details first
    const upload = await this.getUploadById(userId, uploadId);

    // Delete associated transactions
    await this.supabase
      .from('transactions')
      .delete()
      .eq('upload_id', uploadId)
      .eq('user_id', userId);

    // Record the deletion
    await this.supabase
      .from('deleted_uploads')
      .insert({
        user_id: userId,
        original_upload_id: uploadId,
        file_name: upload?.fileName,
        deleted_by: userId
      });

    // Soft delete the upload
    const { error } = await this.supabase
      .from('uploads')
      .update({ status: 'deleted', updated_at: new Date().toISOString() })
      .eq('id', uploadId)
      .eq('user_id', userId);

    if (error) throw error;

    cache.delByPrefix(`user:${userId}:uploads`);
    cache.delByPrefix(`user:${userId}:transactions`);

    return true;
  }

  async getTransactionsByUploadId(userId, uploadId) {
    const { data, error } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('upload_id', uploadId)
      .order('date', { ascending: false });

    if (error) throw error;

    return (data || []).map(t => this._transformTransaction(t));
  }

  async deleteTransactionsByUploadId(userId, uploadId) {
    const { data, error } = await this.supabase
      .from('transactions')
      .delete()
      .eq('user_id', userId)
      .eq('upload_id', uploadId)
      .select();

    if (error) throw error;

    cache.delByPrefix(`user:${userId}:transactions`);

    return data?.length || 0;
  }

  async unlinkTransactionsByUploadId(userId, uploadId) {
    const { data, error } = await this.supabase
      .from('transactions')
      .update({
        upload_id: null,
        statement_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('upload_id', uploadId)
      .select();

    if (error) throw error;

    cache.delByPrefix(`user:${userId}:transactions`);

    return data?.length || 0;
  }

  async recordDeletedUploadId(userId, data) {
    const { error } = await this.supabase
      .from('deleted_uploads')
      .insert({
        user_id: userId,
        original_upload_id: data.uploadId,
        file_name: data.fileName,
        deleted_by: userId,
        deleted_at: new Date().toISOString()
      });

    if (error) {
      // Log but don't fail - this is just for tracking
      console.error('Error recording deleted upload:', error);
    }

    return true;
  }

  async linkTransactionsToUpload(userId, uploadId, transactionIds) {
    const { data, error } = await this.supabase
      .from('transactions')
      .update({
        upload_id: uploadId,
        statement_id: uploadId,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .in('id', transactionIds)
      .select();

    if (error) throw error;

    cache.delByPrefix(`user:${userId}:transactions`);

    return data?.length || 0;
  }

  // ==================== INCOME SOURCES ====================

  async getAllIncomeSources(userId, filters = {}) {
    const cacheKey = cache.makeKey(userId, 'incomeSources', filters);
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log('[Cache HIT] incomeSources for user:', userId);
      return cached;
    }
    console.log('[Cache MISS] incomeSources for user:', userId);

    let query = this.supabase
      .from('income_sources')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (filters.sourceType) {
      query = query.eq('source_type', filters.sourceType);
    }
    if (filters.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    const { data, error } = await query;

    if (error) throw error;

    const result = {
      success: true,
      sources: (data || []).map(s => this._transformIncomeSource(s))
    };

    cache.set(cacheKey, result, CACHE_TTL);

    return result;
  }

  async getIncomeSourceById(userId, sourceId) {
    const { data, error } = await this.supabase
      .from('income_sources')
      .select('*')
      .eq('id', sourceId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'Income source not found' };
      }
      throw error;
    }

    return {
      success: true,
      source: this._transformIncomeSource(data)
    };
  }

  async createIncomeSource(userId, sourceData) {
    const { data, error } = await this.supabase
      .from('income_sources')
      .insert({
        user_id: userId,
        name: sourceData.name,
        source_type: sourceData.sourceType || 'client',
        description: sourceData.description || null,
        company_id: sourceData.companyId || null,
        contact_info: sourceData.contactInfo || {},
        default_category: sourceData.defaultCategory || 'Business Income',
        is_active: sourceData.isActive !== false,
        is_recurring: sourceData.isRecurring || false,
        recurring_amount: sourceData.recurringAmount || null,
        recurring_frequency: sourceData.recurringFrequency || null,
        notes: sourceData.notes || null
      })
      .select()
      .single();

    if (error) throw error;

    cache.delByPrefix(`user:${userId}:incomeSources`);

    return { success: true, id: data.id };
  }

  async updateIncomeSource(userId, sourceId, updateData) {
    const updates = { updated_at: new Date().toISOString() };

    const fieldMap = {
      name: 'name',
      sourceType: 'source_type',
      description: 'description',
      companyId: 'company_id',
      contactInfo: 'contact_info',
      defaultCategory: 'default_category',
      isActive: 'is_active',
      isRecurring: 'is_recurring',
      recurringAmount: 'recurring_amount',
      recurringFrequency: 'recurring_frequency',
      notes: 'notes'
    };

    for (const [camelKey, snakeKey] of Object.entries(fieldMap)) {
      if (updateData[camelKey] !== undefined) {
        updates[snakeKey] = updateData[camelKey];
      }
    }

    const { error } = await this.supabase
      .from('income_sources')
      .update(updates)
      .eq('id', sourceId)
      .eq('user_id', userId);

    if (error) throw error;

    cache.delByPrefix(`user:${userId}:incomeSources`);

    return { success: true };
  }

  async deleteIncomeSource(userId, sourceId) {
    const { error } = await this.supabase
      .from('income_sources')
      .delete()
      .eq('id', sourceId)
      .eq('user_id', userId);

    if (error) throw error;

    cache.delByPrefix(`user:${userId}:incomeSources`);

    return { success: true };
  }

  async getTransactionsByIncomeSource(userId, sourceId, filters = {}) {
    let query = this.supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('income_source_id', sourceId)
      .order('date', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    return {
      success: true,
      transactions: (data || []).map(t => this._transformTransaction(t))
    };
  }

  async getIncomeSourceSummary(userId, sourceId, filters = {}) {
    const transactionsResult = await this.getTransactionsByIncomeSource(userId, sourceId, filters);

    if (!transactionsResult.success) {
      return transactionsResult;
    }

    const transactions = transactionsResult.transactions;
    const totalAmount = transactions.reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);

    return {
      success: true,
      summary: {
        transactionCount: transactions.length,
        totalAmount,
        averageAmount: transactions.length > 0 ? totalAmount / transactions.length : 0
      }
    };
  }

  // ==================== CLASSIFICATION RULES ====================

  async getClassificationRules(userId) {
    const { data, error } = await this.supabase
      .from('classification_rules')
      .select('*')
      .eq('user_id', userId)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(r => this._transformRule(r));
  }

  async createClassificationRule(userId, ruleData) {
    const { data, error } = await this.supabase
      .from('classification_rules')
      .insert({
        user_id: userId,
        name: ruleData.name,
        pattern: ruleData.pattern,
        pattern_type: ruleData.patternType || 'contains',
        category: ruleData.category,
        subcategory: ruleData.subcategory || null,
        transaction_type: ruleData.transactionType || null,
        payee_id: ruleData.payeeId || null,
        priority: ruleData.priority || 0,
        is_active: ruleData.isActive !== false
      })
      .select()
      .single();

    if (error) throw error;

    return data.id;
  }

  async updateClassificationRule(userId, ruleId, ruleData) {
    const updates = { updated_at: new Date().toISOString() };

    const fieldMap = {
      name: 'name',
      pattern: 'pattern',
      patternType: 'pattern_type',
      category: 'category',
      subcategory: 'subcategory',
      transactionType: 'transaction_type',
      payeeId: 'payee_id',
      priority: 'priority',
      isActive: 'is_active'
    };

    for (const [camelKey, snakeKey] of Object.entries(fieldMap)) {
      if (ruleData[camelKey] !== undefined) {
        updates[snakeKey] = ruleData[camelKey];
      }
    }

    const { error } = await this.supabase
      .from('classification_rules')
      .update(updates)
      .eq('id', ruleId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  async deleteClassificationRule(userId, ruleId) {
    const { error } = await this.supabase
      .from('classification_rules')
      .delete()
      .eq('id', ruleId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  // ==================== TRANSFORM HELPERS ====================
  // Convert snake_case DB columns to camelCase

  _transformTransaction(row) {
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      date: row.date,
      description: row.description,
      amount: parseFloat(row.amount),
      type: row.type,
      category: row.category,
      subcategory: row.subcategory,
      payee: row.payee,
      payeeId: row.payee_id,
      companyId: row.company_id,
      uploadId: row.upload_id,
      statementId: row.upload_id || row.statement_id, // Alias for compatibility
      incomeSourceId: row.income_source_id,
      bankName: row.bank_name,
      accountLastFour: row.account_last_four,
      checkNumber: row.check_number,
      referenceNumber: row.reference_number,
      sectionCode: row.section_code,
      vendorId: row.vendor_id,
      vendorName: row.vendor_name,
      is1099Payment: row.is_1099_payment,
      isReconciled: row.is_reconciled,
      isReviewed: row.is_reviewed,
      isRecurring: row.is_recurring,
      recurringPattern: row.recurring_pattern,
      tags: row.tags || [],
      notes: row.notes,
      originalDescription: row.original_description,
      rawData: row.raw_data,
      metadata: row.metadata,
      classificationConfidence: row.classification_confidence,
      classificationSource: row.classification_source,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      lastModifiedBy: row.last_modified_by
    };
  }

  _transformCompany(row) {
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      legalName: row.legal_name,
      taxId: row.tax_id,
      businessType: row.business_type,
      industry: row.industry,
      address: row.address,
      contactInfo: row.contact_info,
      isDefault: row.is_default,
      isActive: row.is_active,
      fiscalYearStart: row.fiscal_year_start,
      settings: row.settings,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      lastModifiedBy: row.last_modified_by
    };
  }

  _transformPayee(row) {
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      type: row.type,
      businessName: row.business_name,
      email: row.email,
      phone: row.phone,
      companyId: row.company_id,
      taxId: row.tax_id,
      is1099Required: row.is_1099_required,
      employeeId: row.employee_id,
      position: row.position,
      department: row.department,
      hireDate: row.hire_date,
      isActive: row.is_active,
      preferredPaymentMethod: row.preferred_payment_method,
      vendorId: row.vendor_id,
      category: row.category,
      defaultExpenseCategory: row.default_expense_category,
      ytdPaid: parseFloat(row.ytd_paid) || 0,
      address: row.address,
      bankAccount: row.bank_account,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      lastModifiedBy: row.last_modified_by
    };
  }

  _transformUpload(row) {
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      fileName: row.file_name,
      originalName: row.original_name,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      storagePath: row.storage_path,
      storageProvider: row.storage_provider,
      cloudinaryPublicId: row.cloudinary_public_id,
      companyId: row.company_id,
      bankName: row.bank_name,
      accountLastFour: row.account_last_four,
      statementPeriodStart: row.statement_period_start,
      statementPeriodEnd: row.statement_period_end,
      transactionCount: row.transaction_count,
      status: row.status,
      processingErrors: row.processing_errors,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  _transformIncomeSource(row) {
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      sourceType: row.source_type,
      description: row.description,
      companyId: row.company_id,
      contactInfo: row.contact_info,
      defaultCategory: row.default_category,
      isActive: row.is_active,
      isRecurring: row.is_recurring,
      recurringAmount: row.recurring_amount,
      recurringFrequency: row.recurring_frequency,
      ytdIncome: parseFloat(row.ytd_income) || 0,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  _transformRule(row) {
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      pattern: row.pattern,
      patternType: row.pattern_type,
      category: row.category,
      subcategory: row.subcategory,
      transactionType: row.transaction_type,
      payeeId: row.payee_id,
      priority: row.priority,
      isActive: row.is_active,
      matchCount: row.match_count,
      lastMatchedAt: row.last_matched_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export default SupabaseAdapter;
