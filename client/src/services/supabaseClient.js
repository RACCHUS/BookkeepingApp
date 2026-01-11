/**
 * Supabase API Client
 * 
 * Direct Supabase database operations for the frontend.
 * Replaces Express API calls for most CRUD operations.
 */

import { supabase } from './supabase';
import { auth } from './firebase';
import { parseCSVFile, getSupportedBanks } from './csvParser';

/**
 * Apply classification rules to transactions
 * @param {string} userId - User ID
 * @param {string[]} transactionIds - Array of transaction IDs to classify (optional, if not provided classifies all uncategorized)
 * @returns {Promise<{classified: number, rules: number}>}
 */
const applyClassificationRules = async (userId, transactionIds = null) => {
  try {
    // Fetch all active classification rules for the user
    const { data: rules, error: rulesError } = await supabase
      .from('classification_rules')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (rulesError || !rules || rules.length === 0) {
      return { classified: 0, rules: 0 };
    }

    // Fetch transactions to classify
    let query = supabase
      .from('transactions')
      .select('id, description, payee')
      .eq('user_id', userId)
      .or('category.is.null,category.eq.');

    if (transactionIds && transactionIds.length > 0) {
      query = query.in('id', transactionIds);
    }

    const { data: transactions, error: txError } = await query;

    if (txError || !transactions || transactions.length === 0) {
      return { classified: 0, rules: rules.length };
    }

    // Group transactions by matching rule
    const updates = [];
    
    for (const tx of transactions) {
      const searchText = `${tx.description || ''} ${tx.payee || ''}`.toLowerCase();
      
      // Find first matching rule (rules are sorted by priority)
      for (const rule of rules) {
        const keywords = rule.pattern ? rule.pattern.split(',').map(k => k.trim().toLowerCase()) : [];
        const matches = keywords.some(keyword => searchText.includes(keyword));
        
        if (matches) {
          updates.push({ id: tx.id, category: rule.category });
          break; // Stop at first match (highest priority)
        }
      }
    }

    if (updates.length === 0) {
      return { classified: 0, rules: rules.length };
    }

    // Batch update transactions by category to minimize queries
    const updatesByCategory = {};
    for (const update of updates) {
      if (!updatesByCategory[update.category]) {
        updatesByCategory[update.category] = [];
      }
      updatesByCategory[update.category].push(update.id);
    }

    for (const [category, ids] of Object.entries(updatesByCategory)) {
      await supabase
        .from('transactions')
        .update({ 
          category,
          updated_at: new Date().toISOString(),
          last_modified_by: userId
        })
        .in('id', ids)
        .eq('user_id', userId);
    }

    return { classified: updates.length, rules: rules.length };
  } catch (error) {
    console.error('Error applying classification rules:', error);
    return { classified: 0, rules: 0, error: error.message };
  }
};

/**
 * Get the current user's Firebase UID
 * Waits for auth to be ready if needed
 */
const getUserId = async () => {
  // If user is available, return immediately
  if (auth.currentUser) {
    return auth.currentUser.uid;
  }
  
  // Wait for auth state to be determined (up to 5 seconds)
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error('Authentication timeout - please refresh the page'));
    }, 5000);
    
    const unsubscribe = auth.onAuthStateChanged((user) => {
      clearTimeout(timeout);
      unsubscribe();
      if (user) {
        resolve(user.uid);
      } else {
        reject(new Error('User not authenticated'));
      }
    });
  });
};

/**
 * Transform database transaction to frontend format
 */
const transformTransaction = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    date: row.date,
    description: row.description,
    amount: parseFloat(row.amount) || 0,
    type: row.type || 'expense',
    category: row.category,
    subcategory: row.subcategory,
    payee: row.payee,
    payeeId: row.payee_id,
    companyId: row.company_id,
    uploadId: row.upload_id,
    statementId: row.statement_id,
    csvImportId: row.csv_import_id,
    incomeSourceId: row.income_source_id,
    bankName: row.bank_name,
    accountLastFour: row.account_last_four,
    checkNumber: row.check_number,
    referenceNumber: row.reference_number,
    sectionCode: row.section_code,
    paymentMethod: row.payment_method,
    source: row.source,
    sourceFile: row.source_file,
    vendorId: row.vendor_id,
    vendorName: row.vendor_name,
    is1099Payment: row.is_1099_payment,
    isReconciled: row.is_reconciled,
    isReviewed: row.is_reviewed,
    tags: row.tags || [],
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

/**
 * Transform frontend transaction to database format
 * Converts empty strings to null for UUID fields (PostgreSQL requirement)
 */
const toDbTransaction = (data, userId) => {
  const dbData = {
    user_id: userId,
  };
  
  // Helper to convert empty strings to null for UUID fields
  const toUuidOrNull = (value) => (value && value.trim() !== '') ? value : null;
  
  if (data.date !== undefined) dbData.date = data.date;
  if (data.description !== undefined) dbData.description = data.description;
  if (data.amount !== undefined) dbData.amount = data.amount;
  if (data.type !== undefined) dbData.type = data.type;
  if (data.category !== undefined) dbData.category = data.category || null;
  if (data.subcategory !== undefined) dbData.subcategory = data.subcategory || null;
  if (data.payee !== undefined) dbData.payee = data.payee || null;
  if (data.payeeId !== undefined) dbData.payee_id = toUuidOrNull(data.payeeId);
  if (data.companyId !== undefined) dbData.company_id = toUuidOrNull(data.companyId);
  if (data.vendorId !== undefined) dbData.vendor_id = toUuidOrNull(data.vendorId);
  if (data.vendorName !== undefined) dbData.vendor_name = data.vendorName || null;
  if (data.notes !== undefined) dbData.notes = data.notes || null;
  if (data.tags !== undefined) dbData.tags = data.tags;
  if (data.is1099Payment !== undefined) dbData.is_1099_payment = data.is1099Payment;
  if (data.isReconciled !== undefined) dbData.is_reconciled = data.isReconciled;
  if (data.isReviewed !== undefined) dbData.is_reviewed = data.isReviewed;
  if (data.incomeSourceId !== undefined) dbData.income_source_id = toUuidOrNull(data.incomeSourceId);
  if (data.source !== undefined) dbData.source = data.source || null;
  if (data.statementId !== undefined) dbData.statement_id = toUuidOrNull(data.statementId);
  if (data.csvImportId !== undefined) dbData.csv_import_id = toUuidOrNull(data.csvImportId);
  if (data.uploadId !== undefined) dbData.upload_id = toUuidOrNull(data.uploadId);
  
  return dbData;
};

/**
 * Transform company from database to frontend format
 */
const transformCompany = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    legalName: row.legal_name || '',
    description: row.description || '',
    type: row.type,
    businessType: row.business_type || row.type || 'LLC',
    status: row.status || 'active',
    taxId: row.tax_id || '',
    phone: row.phone || '',
    email: row.email || '',
    website: row.website || '',
    address: row.address || { street: '', city: '', state: '', zipCode: '', country: 'USA' },
    isActive: row.is_active !== false,
    isDefault: row.is_default || false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

/**
 * Transform payee from database to frontend format
 * Matches schema: user_id, name, type, business_name, email, phone, company_id, tax_id,
 * is_1099_required, employee_id, position, department, hire_date, is_active,
 * preferred_payment_method, vendor_id, category, default_expense_category,
 * ytd_paid, address, bank_account, notes, created_at, updated_at
 */
const transformPayee = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    type: row.type || 'vendor',
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
    ytdPaid: row.ytd_paid,
    address: row.address,
    bankAccount: row.bank_account,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

/**
 * Supabase-based API client
 */
export const supabaseClient = {
  // Transaction methods
  transactions: {
    getAll: async (params = {}) => {
      const userId = await getUserId();
      
      let query = supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('date', { ascending: false });

      // Apply filters
      if (params.companyId) {
        query = query.eq('company_id', params.companyId);
      }
      if (params.type) {
        query = query.eq('type', params.type);
      }
      if (params.category) {
        query = query.eq('category', params.category);
      }
      if (params.startDate) {
        query = query.gte('date', params.startDate);
      }
      if (params.endDate) {
        query = query.lte('date', params.endDate);
      }
      if (params.search) {
        query = query.or(`description.ilike.%${params.search}%,payee.ilike.%${params.search}%`);
      }
      if (params.paymentMethod) {
        query = query.eq('payment_method', params.paymentMethod);
      }

      // Pagination
      const limit = params.limit || 50;
      const offset = params.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        success: true,
        data: {
          transactions: (data || []).map(transformTransaction),
          total: count || 0,
          limit,
          offset,
        }
      };
    },

    getById: async (id) => {
      const userId = await getUserId();
      
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      return {
        success: true,
        data: { transaction: transformTransaction(data) }
      };
    },

    create: async (transactionData) => {
      const userId = await getUserId();
      
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          ...toDbTransaction(transactionData, userId),
          created_by: userId,
          last_modified_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: { transaction: transformTransaction(data) }
      };
    },

    update: async (id, transactionData) => {
      const userId = await getUserId();
      
      const { data, error } = await supabase
        .from('transactions')
        .update({
          ...toDbTransaction(transactionData, userId),
          last_modified_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: { transaction: transformTransaction(data) }
      };
    },

    delete: async (id) => {
      const userId = await getUserId();
      
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;

      return { success: true };
    },

    getSummary: async (startDate, endDate, filters = {}) => {
      const userId = await getUserId();
      
      let query = supabase
        .from('transactions')
        .select('type, amount, category')
        .eq('user_id', userId);

      if (startDate) {
        query = query.gte('date', startDate);
      }
      if (endDate) {
        query = query.lte('date', endDate);
      }
      if (filters.companyId && filters.companyId !== 'all') {
        query = query.eq('company_id', filters.companyId);
      }
      if (filters.uploadId) {
        query = query.eq('upload_id', filters.uploadId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Calculate totals
      let totalIncome = 0;
      let totalExpenses = 0;
      let totalTransfers = 0;
      const byCategory = {};

      (data || []).forEach(t => {
        const amount = parseFloat(t.amount) || 0;
        const category = t.category || 'Uncategorized';
        
        // Transfers don't affect income/expense totals - they're neutral
        if (t.type === 'transfer') {
          totalTransfers += Math.abs(amount);
        } else if (t.type === 'income' || t.type === 'deposit') {
          totalIncome += amount;
        } else {
          totalExpenses += Math.abs(amount);
        }
        
        if (!byCategory[category]) {
          byCategory[category] = { income: 0, expenses: 0, transfers: 0, count: 0 };
        }
        if (t.type === 'transfer') {
          byCategory[category].transfers += Math.abs(amount);
        } else if (t.type === 'income' || t.type === 'deposit') {
          byCategory[category].income += amount;
        } else {
          byCategory[category].expenses += Math.abs(amount);
        }
        byCategory[category].count++;
      });

      return {
        success: true,
        data: {
          summary: {
            totalIncome,
            totalExpenses,
            totalTransfers,
            netIncome: totalIncome - totalExpenses, // Transfers excluded
            transactionCount: data?.length || 0,
          },
          byCategory,
        }
      };
    },

    getCategoryStats: async (startDate, endDate, filters = {}) => {
      const userId = await getUserId();
      
      let query = supabase
        .from('transactions')
        .select('type, amount, category')
        .eq('user_id', userId);

      if (startDate) query = query.gte('date', startDate);
      if (endDate) query = query.lte('date', endDate);
      if (filters.companyId && filters.companyId !== 'all') {
        query = query.eq('company_id', filters.companyId);
      }
      if (filters.uploadId) {
        query = query.eq('upload_id', filters.uploadId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group by category
      const categories = {};
      (data || []).forEach(t => {
        const category = t.category || 'Uncategorized';
        const amount = parseFloat(t.amount) || 0;
        
        if (!categories[category]) {
          categories[category] = { income: 0, expenses: 0, transfers: 0, count: 0 };
        }
        
        // Transfers tracked separately
        if (t.type === 'transfer') {
          categories[category].transfers += Math.abs(amount);
        } else if (t.type === 'income' || t.type === 'deposit') {
          categories[category].income += amount;
        } else {
          categories[category].expenses += Math.abs(amount);
        }
        categories[category].count++;
      });

      // Convert to array format
      const categoryList = Object.entries(categories).map(([name, stats]) => ({
        category: name,
        ...stats,
        total: stats.income - stats.expenses,
      }));

      return {
        success: true,
        data: {
          categories: categoryList,
          totalCategories: categoryList.length,
        }
      };
    },

    /**
     * Bulk update transactions
     * Accepts either:
     * - Array of {id, ...updates} objects (for individual updates per transaction)
     * - Or (ids, updates) for same updates to all
     */
    bulkUpdate: async (transactionsOrIds, updates = null) => {
      const userId = await getUserId();
      
      // Handle array of transactions with individual updates
      if (Array.isArray(transactionsOrIds) && transactionsOrIds[0]?.id && !updates) {
        const results = [];
        const errors = [];
        
        for (const tx of transactionsOrIds) {
          const { id, ...updateFields } = tx;
          if (!id) {
            errors.push({ id: null, error: 'Missing transaction ID' });
            continue;
          }
          
          try {
            const { data, error } = await supabase
              .from('transactions')
              .update({
                ...toDbTransaction(updateFields, userId),
                last_modified_by: userId,
                updated_at: new Date().toISOString(),
              })
              .eq('id', id)
              .eq('user_id', userId)
              .select()
              .single();

            if (error) {
              errors.push({ id, error: error.message });
            } else if (data) {
              results.push(transformTransaction(data));
            }
          } catch (err) {
            errors.push({ id, error: err.message });
          }
        }

        return {
          success: errors.length === 0,
          data: { 
            transactions: results,
            count: results.length,
            errors: errors.length > 0 ? errors : undefined,
          }
        };
      }
      
      // Handle (ids[], updates) format - same updates to all
      const ids = transactionsOrIds;
      const { data, error } = await supabase
        .from('transactions')
        .update({
          ...toDbTransaction(updates, userId),
          last_modified_by: userId,
          updated_at: new Date().toISOString(),
        })
        .in('id', ids)
        .eq('user_id', userId)
        .select();

      if (error) throw error;

      return {
        success: true,
        data: { 
          transactions: (data || []).map(transformTransaction),
          count: data?.length || 0 
        }
      };
    },

    bulkDelete: async (ids) => {
      const userId = await getUserId();
      
      const { error } = await supabase
        .from('transactions')
        .delete()
        .in('id', ids)
        .eq('user_id', userId);

      if (error) throw error;

      return { success: true, count: ids.length };
    },

    bulkCreate: async (transactions) => {
      const userId = await getUserId();
      
      const transactionsToInsert = transactions.map(t => ({
        ...toDbTransaction(t, userId),
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from('transactions')
        .insert(transactionsToInsert)
        .select();

      if (error) throw error;

      // Apply classification rules to newly created transactions without categories
      const uncategorizedIds = (data || [])
        .filter(t => !t.category)
        .map(t => t.id);
      
      let classificationResult = { classified: 0, rules: 0 };
      if (uncategorizedIds.length > 0) {
        classificationResult = await applyClassificationRules(userId, uncategorizedIds);
      }

      return {
        success: true,
        data: {
          transactions: (data || []).map(transformTransaction),
          results: (data || []).map(transformTransaction),
          count: data?.length || 0,
          successCount: data?.length || 0,
          failedCount: 0,
          classified: classificationResult.classified,
        }
      };
    },
  },

  // Company methods
  companies: {
    getAll: async () => {
      const userId = await getUserId();
      
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', userId)
        .order('name');

      if (error) throw error;

      return {
        success: true,
        data: { companies: (data || []).map(transformCompany) }
      };
    },

    getById: async (id) => {
      const userId = await getUserId();
      
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      return {
        success: true,
        data: { company: transformCompany(data) }
      };
    },

    create: async (companyData) => {
      const userId = await getUserId();
      
      const { data, error } = await supabase
        .from('companies')
        .insert({
          user_id: userId,
          name: companyData.name,
          legal_name: companyData.legalName,
          description: companyData.description,
          type: companyData.type || companyData.businessType,
          business_type: companyData.businessType,
          status: companyData.status || 'active',
          tax_id: companyData.taxId,
          phone: companyData.phone,
          email: companyData.email,
          website: companyData.website,
          address: companyData.address,
          is_active: companyData.isActive !== false,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: { company: transformCompany(data) }
      };
    },

    update: async (id, companyData) => {
      const userId = await getUserId();
      
      const updateData = {};
      if (companyData.name !== undefined) updateData.name = companyData.name;
      if (companyData.legalName !== undefined) updateData.legal_name = companyData.legalName;
      if (companyData.description !== undefined) updateData.description = companyData.description;
      if (companyData.type !== undefined) updateData.type = companyData.type;
      if (companyData.businessType !== undefined) updateData.business_type = companyData.businessType;
      if (companyData.status !== undefined) updateData.status = companyData.status;
      if (companyData.taxId !== undefined) updateData.tax_id = companyData.taxId;
      if (companyData.phone !== undefined) updateData.phone = companyData.phone;
      if (companyData.email !== undefined) updateData.email = companyData.email;
      if (companyData.website !== undefined) updateData.website = companyData.website;
      if (companyData.address !== undefined) updateData.address = companyData.address;
      if (companyData.isActive !== undefined) updateData.is_active = companyData.isActive;
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: { company: transformCompany(data) }
      };
    },

    delete: async (id) => {
      const userId = await getUserId();
      
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;

      return { success: true };
    },

    setDefault: async (id) => {
      const userId = await getUserId();
      
      // First, unset any existing default
      await supabase
        .from('companies')
        .update({ is_default: false })
        .eq('user_id', userId);

      // Then set the new default
      const { data, error } = await supabase
        .from('companies')
        .update({ is_default: true, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: { company: transformCompany(data) }
      };
    },

    getTransactionsWithoutCompany: async () => {
      const userId = await getUserId();
      
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .is('company_id', null)
        .order('date', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        transactions: (data || []).map(transformTransaction)
      };
    },

    bulkAssignTransactions: async (companyId, transactionIds) => {
      const userId = await getUserId();
      
      const { data, error } = await supabase
        .from('transactions')
        .update({ company_id: companyId, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .in('id', transactionIds)
        .select();

      if (error) throw error;

      return {
        success: true,
        data: { updated: data?.length || 0 }
      };
    },

    bulkUnassignTransactions: async (transactionIds) => {
      const userId = await getUserId();
      
      const { data, error } = await supabase
        .from('transactions')
        .update({ company_id: null, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .in('id', transactionIds)
        .select();

      if (error) throw error;

      return {
        success: true,
        data: { updated: data?.length || 0 }
      };
    },
  },

  // Payee methods
  payees: {
    getAll: async () => {
      const userId = await getUserId();
      
      const { data, error } = await supabase
        .from('payees')
        .select('*')
        .eq('user_id', userId)
        .order('name');

      if (error) throw error;

      return {
        success: true,
        data: { payees: (data || []).map(transformPayee) }
      };
    },

    create: async (payeeData) => {
      const userId = await getUserId();
      
      // Build insert object with only valid database columns
      const insertData = {
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
      };

      const { data, error } = await supabase
        .from('payees')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: { payee: transformPayee(data) }
      };
    },

    update: async (id, payeeData) => {
      const userId = await getUserId();
      
      const updateData = {
        updated_at: new Date().toISOString()
      };
      
      // Map all valid database columns
      if (payeeData.name !== undefined) updateData.name = payeeData.name;
      if (payeeData.type !== undefined) updateData.type = payeeData.type;
      if (payeeData.businessName !== undefined) updateData.business_name = payeeData.businessName;
      if (payeeData.email !== undefined) updateData.email = payeeData.email;
      if (payeeData.phone !== undefined) updateData.phone = payeeData.phone;
      if (payeeData.companyId !== undefined) updateData.company_id = payeeData.companyId;
      if (payeeData.taxId !== undefined) updateData.tax_id = payeeData.taxId;
      if (payeeData.is1099Required !== undefined) updateData.is_1099_required = payeeData.is1099Required;
      if (payeeData.employeeId !== undefined) updateData.employee_id = payeeData.employeeId;
      if (payeeData.position !== undefined) updateData.position = payeeData.position;
      if (payeeData.department !== undefined) updateData.department = payeeData.department;
      if (payeeData.hireDate !== undefined) updateData.hire_date = payeeData.hireDate;
      if (payeeData.isActive !== undefined) updateData.is_active = payeeData.isActive;
      if (payeeData.preferredPaymentMethod !== undefined) updateData.preferred_payment_method = payeeData.preferredPaymentMethod;
      if (payeeData.vendorId !== undefined) updateData.vendor_id = payeeData.vendorId;
      if (payeeData.category !== undefined) updateData.category = payeeData.category;
      if (payeeData.defaultExpenseCategory !== undefined) updateData.default_expense_category = payeeData.defaultExpenseCategory;
      if (payeeData.ytdPaid !== undefined) updateData.ytd_paid = payeeData.ytdPaid;
      if (payeeData.address !== undefined) updateData.address = payeeData.address;
      if (payeeData.bankAccount !== undefined) updateData.bank_account = payeeData.bankAccount;
      if (payeeData.notes !== undefined) updateData.notes = payeeData.notes;

      const { data, error } = await supabase
        .from('payees')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: { payee: transformPayee(data) }
      };
    },

    delete: async (id) => {
      const userId = await getUserId();
      
      const { error } = await supabase
        .from('payees')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;

      return { success: true };
    },

    getVendors: async () => {
      const userId = await getUserId();
      
      const { data, error } = await supabase
        .from('payees')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'vendor')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      return {
        success: true,
        vendors: (data || []).map(transformPayee),
        data: { vendors: (data || []).map(transformPayee) }
      };
    },

    getEmployees: async () => {
      const userId = await getUserId();
      
      const { data, error } = await supabase
        .from('payees')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'employee')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      return {
        success: true,
        employees: (data || []).map(transformPayee),
        data: { employees: (data || []).map(transformPayee) }
      };
    },

    getTransactionsWithoutPayees: async (params = {}) => {
      const userId = await getUserId();
      
      let query = supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .is('payee_id', null)
        .order('date', { ascending: false });

      if (params.companyId) query = query.eq('company_id', params.companyId);
      if (params.type) query = query.eq('type', params.type);
      
      const limit = params.limit || 100;
      const offset = params.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        success: true,
        data: { 
          transactions: (data || []).map(transformTransaction),
          total: count || 0
        }
      };
    },

    bulkAssign: async (transactionIds, payeeId, payeeName) => {
      const userId = await getUserId();
      
      const { data, error } = await supabase
        .from('transactions')
        .update({
          payee_id: payeeId,
          payee: payeeName,
          updated_at: new Date().toISOString(),
        })
        .in('id', transactionIds)
        .eq('user_id', userId)
        .select();

      if (error) throw error;

      return {
        success: true,
        data: { 
          transactions: (data || []).map(transformTransaction),
          count: data?.length || 0 
        }
      };
    },

    bulkUnassign: async (transactionIds) => {
      const userId = await getUserId();
      
      const { data, error } = await supabase
        .from('transactions')
        .update({
          payee_id: null,
          payee: null,
          updated_at: new Date().toISOString(),
        })
        .in('id', transactionIds)
        .eq('user_id', userId)
        .select();

      if (error) throw error;

      return {
        success: true,
        data: { 
          transactions: (data || []).map(transformTransaction),
          count: data?.length || 0 
        }
      };
    },
  },

  // Income Sources
  incomeSources: {
    getAll: async () => {
      const userId = await getUserId();
      
      const { data, error } = await supabase
        .from('income_sources')
        .select('*')
        .eq('user_id', userId)
        .order('name');

      if (error) throw error;

      const transformIncomeSource = (row) => ({
        id: row.id,
        name: row.name,
        sourceType: row.source_type,
        type: row.source_type, // Alias for compatibility
        description: row.description,
        companyId: row.company_id,
        contactInfo: row.contact_info || {},
        contactEmail: row.contact_info?.email,
        contactPhone: row.contact_info?.phone,
        defaultCategory: row.default_category,
        category: row.default_category, // Alias
        isActive: row.is_active,
        isRecurring: row.is_recurring,
        recurringAmount: row.recurring_amount,
        recurringFrequency: row.recurring_frequency,
        ytdIncome: row.ytd_income,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });

      return {
        success: true,
        data: { 
          incomeSources: (data || []).map(transformIncomeSource)
        }
      };
    },

    getById: async (id) => {
      const userId = await getUserId();
      
      const { data, error } = await supabase
        .from('income_sources')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      return {
        success: true,
        data: { 
          incomeSource: {
            id: data.id,
            name: data.name,
            sourceType: data.source_type,
            description: data.description,
            companyId: data.company_id,
            contactInfo: data.contact_info || {},
            contactEmail: data.contact_info?.email,
            contactPhone: data.contact_info?.phone,
            defaultCategory: data.default_category,
            isActive: data.is_active,
            isRecurring: data.is_recurring,
            recurringAmount: data.recurring_amount,
            recurringFrequency: data.recurring_frequency,
            notes: data.notes,
          }
        }
      };
    },

    create: async (sourceData) => {
      const userId = await getUserId();
      
      const insertData = {
        user_id: userId,
        name: sourceData.name,
        source_type: sourceData.sourceType || sourceData.type || 'client',
        description: sourceData.description || null,
        company_id: sourceData.companyId || null,
        contact_info: {
          email: sourceData.contactEmail || null,
          phone: sourceData.contactPhone || null,
          ...sourceData.contactInfo
        },
        default_category: sourceData.defaultCategory || sourceData.category || 'Business Income',
        is_active: sourceData.isActive !== false,
        is_recurring: sourceData.isRecurring || false,
        recurring_amount: sourceData.recurringAmount || null,
        recurring_frequency: sourceData.recurringFrequency || null,
        notes: sourceData.notes || null,
      };
      
      console.log('Creating income source with data:', insertData);
      
      const { data, error } = await supabase
        .from('income_sources')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Income source create error:', error);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        console.error('Error code:', error.code);
        throw error;
      }

      return {
        success: true,
        data: { incomeSource: data }
      };
    },

    update: async (id, sourceData) => {
      const userId = await getUserId();
      
      const updateData = {
        updated_at: new Date().toISOString()
      };
      
      if (sourceData.name !== undefined) updateData.name = sourceData.name;
      if (sourceData.sourceType !== undefined) updateData.source_type = sourceData.sourceType;
      if (sourceData.type !== undefined) updateData.source_type = sourceData.type;
      if (sourceData.description !== undefined) updateData.description = sourceData.description;
      if (sourceData.companyId !== undefined) updateData.company_id = sourceData.companyId;
      if (sourceData.contactEmail !== undefined || sourceData.contactPhone !== undefined) {
        updateData.contact_info = {
          email: sourceData.contactEmail || null,
          phone: sourceData.contactPhone || null,
        };
      }
      if (sourceData.contactInfo !== undefined) updateData.contact_info = sourceData.contactInfo;
      if (sourceData.defaultCategory !== undefined) updateData.default_category = sourceData.defaultCategory;
      if (sourceData.category !== undefined) updateData.default_category = sourceData.category;
      if (sourceData.isActive !== undefined) updateData.is_active = sourceData.isActive;
      if (sourceData.isRecurring !== undefined) updateData.is_recurring = sourceData.isRecurring;
      if (sourceData.recurringAmount !== undefined) updateData.recurring_amount = sourceData.recurringAmount;
      if (sourceData.recurringFrequency !== undefined) updateData.recurring_frequency = sourceData.recurringFrequency;
      if (sourceData.notes !== undefined) updateData.notes = sourceData.notes;

      const { data, error } = await supabase
        .from('income_sources')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: { incomeSource: data }
      };
    },

    delete: async (id) => {
      const userId = await getUserId();
      
      const { error } = await supabase
        .from('income_sources')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;

      return { success: true };
    },
  },

  // Receipts
  receipts: {
    getAll: async (params = {}) => {
      const userId = await getUserId();
      
      let query = supabase
        .from('receipts')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (params.vendorId) {
        query = query.eq('vendor_id', params.vendorId);
      }
      if (params.transactionId) {
        query = query.eq('transaction_id', params.transactionId);
      }

      const limit = params.limit || 50;
      const offset = params.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        success: true,
        data: {
          receipts: (data || []).map(row => ({
            id: row.id,
            transactionId: row.transaction_id,
            vendorId: row.vendor_id,
            vendorName: row.vendor_name,
            date: row.date,
            amount: parseFloat(row.amount) || 0,
            description: row.description,
            imageUrl: row.image_url,
            fileName: row.file_name,
            createdAt: row.created_at,
          })),
          total: count || 0,
        }
      };
    },

    delete: async (id) => {
      const userId = await getUserId();
      
      const { error } = await supabase
        .from('receipts')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;

      return { success: true };
    },
  },

  // Checks
  checks: {
    getAll: async (params = {}) => {
      const userId = await getUserId();
      
      let query = supabase
        .from('checks')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (params.vendorId) {
        query = query.eq('vendor_id', params.vendorId);
      }

      const limit = params.limit || 50;
      const offset = params.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        success: true,
        data: {
          checks: (data || []).map(row => ({
            id: row.id,
            checkNumber: row.check_number,
            vendorId: row.vendor_id,
            vendorName: row.vendor_name,
            date: row.date,
            amount: parseFloat(row.amount) || 0,
            memo: row.memo,
            transactionId: row.transaction_id,
            createdAt: row.created_at,
          })),
          total: count || 0,
        }
      };
    },

    delete: async (id) => {
      const userId = await getUserId();
      
      const { error } = await supabase
        .from('checks')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;

      return { success: true };
    },
  },

  // Vendors
  vendors: {
    getAll: async () => {
      const userId = await getUserId();
      
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', userId)
        .order('name');

      if (error) throw error;

      return {
        success: true,
        data: {
          vendors: (data || []).map(row => ({
            id: row.id,
            name: row.name,
            is1099Vendor: row.is_1099_vendor,
            taxId: row.tax_id,
            address: row.address,
            email: row.email,
            phone: row.phone,
            notes: row.notes,
            createdAt: row.created_at,
          }))
        }
      };
    },

    create: async (vendorData) => {
      const userId = await getUserId();
      
      const { data, error } = await supabase
        .from('vendors')
        .insert({
          user_id: userId,
          name: vendorData.name,
          is_1099_vendor: vendorData.is1099Vendor || false,
          tax_id: vendorData.taxId,
          address: vendorData.address,
          email: vendorData.email,
          phone: vendorData.phone,
          notes: vendorData.notes,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: { vendor: data }
      };
    },

    update: async (id, vendorData) => {
      const userId = await getUserId();
      
      const updateData = {};
      if (vendorData.name !== undefined) updateData.name = vendorData.name;
      if (vendorData.is1099Vendor !== undefined) updateData.is_1099_vendor = vendorData.is1099Vendor;
      if (vendorData.taxId !== undefined) updateData.tax_id = vendorData.taxId;
      if (vendorData.address !== undefined) updateData.address = vendorData.address;
      if (vendorData.email !== undefined) updateData.email = vendorData.email;
      if (vendorData.phone !== undefined) updateData.phone = vendorData.phone;
      if (vendorData.notes !== undefined) updateData.notes = vendorData.notes;
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('vendors')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: { vendor: data }
      };
    },

    delete: async (id) => {
      const userId = await getUserId();
      
      const { error } = await supabase
        .from('vendors')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;

      return { success: true };
    },
  },

  // CSV methods (client-side parsing)
  csv: {
    getBanks: async () => {
      return {
        success: true,
        data: getSupportedBanks(),
      };
    },

    upload: async (file, options = {}) => {
      // Parse CSV entirely client-side
      const result = await parseCSVFile(file, options);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      return {
        success: true,
        data: {
          transactions: result.transactions,
          detectedBank: result.detectedBank,
          detectedBankName: result.detectedBankName,
          headers: result.headers,
          sampleRows: result.sampleRows,
          totalRows: result.totalRows,
          parsedCount: result.parsedCount,
          errors: result.errors,
          requiresMapping: !result.detectedBank || result.detectedBank === 'generic',
          fileName: file.name, // Include the original filename
        },
      };
    },

    confirmImport: async (transactions, options = {}) => {
      const userId = await getUserId();
      const { skipDuplicates = true, companyId = null, fileName = 'import.csv', bankFormat = 'auto' } = options;

      // Check for duplicates if needed
      let toInsert = transactions;
      let duplicateCount = 0;

      if (skipDuplicates) {
        // Get existing transactions to check for duplicates
        const { data: existing } = await supabase
          .from('transactions')
          .select('date, description, amount')
          .eq('user_id', userId);

        const existingSet = new Set(
          (existing || []).map(t => `${t.date}|${t.description}|${t.amount}`)
        );

        toInsert = transactions.filter(t => {
          const key = `${t.date}|${t.description}|${t.amount}`;
          if (existingSet.has(key)) {
            duplicateCount++;
            return false;
          }
          return true;
        });
      }

      // Create a csv_imports record first
      let csvImportId = null;
      try {
        const { data: importRecord, error: importError } = await supabase
          .from('csv_imports')
          .insert({
            user_id: userId,
            file_name: fileName,
            bank_format: bankFormat,
            company_id: companyId || null,
            status: 'completed',
            // Use column names from original migration (20260107000000)
            transaction_count: toInsert.length,
            duplicate_count: duplicateCount,
          })
          .select('id')
          .single();

        if (importError) {
          // Log the full error for debugging - likely RLS issue
          console.error('Could not create csv_imports record:', {
            error: importError,
            code: importError.code,
            message: importError.message,
            details: importError.details,
            hint: importError.hint,
          });
        } else {
          csvImportId = importRecord?.id;
          console.log('Created csv_imports record:', csvImportId);
        }
      } catch (err) {
        console.error('csv_imports table error:', err);
      }

      // Insert transactions with csv_import_id if available
      const transactionsToInsert = toInsert.map(t => ({
        user_id: userId,
        date: t.date,
        description: t.description,
        amount: t.amount,
        type: t.type,
        category: t.category || null,
        company_id: companyId || t.companyId || null,
        source: 'csv',
        source_file: fileName,
        csv_import_id: csvImportId,
        bank_name: t.bankName || null,
        check_number: t.checkNumber || null,
        reference_number: t.referenceNumber || null,
        original_description: t.originalDescription || t.description,
      }));

      let insertedIds = [];
      if (transactionsToInsert.length > 0) {
        const { data: insertedData, error: insertError } = await supabase
          .from('transactions')
          .insert(transactionsToInsert)
          .select('id');

        if (insertError) throw insertError;
        insertedIds = (insertedData || []).map(t => t.id);
      }

      // Apply classification rules to newly imported transactions
      let classificationResult = { classified: 0, rules: 0 };
      if (insertedIds.length > 0) {
        classificationResult = await applyClassificationRules(userId, insertedIds);
        console.log('Classification result:', classificationResult);
      }

      return {
        success: true,
        data: {
          imported: transactionsToInsert.length,
          duplicates: duplicateCount,
          total: transactions.length,
          importId: csvImportId,
          classified: classificationResult.classified,
          rulesApplied: classificationResult.rules,
        },
      };
    },

    getImports: async (params = {}) => {
      const userId = await getUserId();
      console.log('getImports called with params:', params, 'userId:', userId);
      
      try {
        let query = supabase
          .from('csv_imports')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        // Only filter by status if it's a specific status (not 'all')
        if (params.status && params.status !== 'all') {
          query = query.eq('status', params.status);
        }

        if (params.limit) {
          query = query.limit(params.limit);
        }

        const { data, error } = await query;
        console.log('csv_imports query result:', { data, error, count: data?.length });

        if (error) {
          console.error('Error fetching csv_imports:', error);
          return { success: true, data: [] };
        }

        // Transform to camelCase - handle both old and new column names
        const imports = (data || []).map(row => ({
          id: row.id,
          userId: row.user_id,
          fileName: row.file_name,
          file_name: row.file_name, // Keep snake_case for component compatibility
          bankFormat: row.bank_format,
          bankName: row.bank_name,
          companyId: row.company_id,
          companyName: row.company_name,
          status: row.status,
          // Handle both old (transaction_count) and new (total_rows/imported_count) column names
          totalRows: row.total_rows || row.transaction_count || 0,
          importedCount: row.imported_count || row.transaction_count || 0,
          transactionCount: row.transaction_count || row.imported_count || 0,
          transaction_count: row.transaction_count || row.imported_count || 0, // For component compatibility
          duplicateCount: row.duplicate_count || 0,
          duplicate_count: row.duplicate_count || 0, // For component compatibility
          createdAt: row.created_at,
          created_at: row.created_at, // Keep snake_case for component compatibility
          updatedAt: row.updated_at,
        }));

        return {
          success: true,
          data: imports, // Return array directly for compatibility
        };
      } catch (err) {
        console.warn('csv_imports table may not exist:', err);
        return { success: true, data: [] };
      }
    },

    deleteImport: async (importId) => {
      const userId = await getUserId();
      
      // Delete associated transactions first
      await supabase
        .from('transactions')
        .delete()
        .eq('csv_import_id', importId)
        .eq('user_id', userId);

      // Delete the import record
      const { error } = await supabase
        .from('csv_imports')
        .delete()
        .eq('id', importId)
        .eq('user_id', userId);

      if (error) throw error;

      return { success: true, message: 'CSV import and associated transactions deleted' };
    },

    getImportTransactions: async (importId, params = {}) => {
      const userId = await getUserId();
      const limit = params.limit || 100;

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('csv_import_id', importId)
        .order('date', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return {
        success: true,
        data: (data || []).map(transformTransaction),
      };
    },

    deleteImportTransactions: async (importId, options = {}) => {
      const userId = await getUserId();
      
      // Delete transactions linked to this import
      const { error, count } = await supabase
        .from('transactions')
        .delete()
        .eq('csv_import_id', importId)
        .eq('user_id', userId);

      if (error) throw error;

      // Optionally clear the import ID reference
      if (options.deleteImportId) {
        await supabase
          .from('csv_imports')
          .delete()
          .eq('id', importId)
          .eq('user_id', userId);
      }

      return { success: true, message: `Deleted transactions from CSV import` };
    },
  },

  // ===== PDF Operations (via Supabase Edge Functions) =====
  pdf: {
    /**
     * Upload and parse a PDF bank statement
     * Uses Supabase Edge Function
     */
    upload: async (file, companyId = null) => {
      const userId = await getUserId();
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);
      if (companyId) formData.append('companyId', companyId);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/parse-pdf`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to parse PDF');
      }

      const result = await response.json();
      
      // Transform transactions to frontend format
      return {
        success: true,
        data: {
          transactions: result.transactions?.map(t => ({
            date: t.date,
            description: t.description,
            amount: t.amount,
            type: t.type,
            checkNumber: t.checkNumber,
          })) || [],
          bank: result.bank,
          uploadId: result.uploadId,
          parsedCount: result.transactions?.length || 0,
        },
      };
    },

    /**
     * Confirm and import parsed PDF transactions
     */
    confirmImport: async (transactions, companyId = null) => {
      const userId = await getUserId();

      // Insert transactions directly to Supabase
      const transactionsToInsert = transactions.map(t => ({
        user_id: userId,
        company_id: companyId || null,
        date: t.date,
        description: t.description,
        amount: t.amount,
        type: t.type || 'expense',
        category: t.category || null,
        payee: t.payee || t.description?.substring(0, 50) || null,
        source: 'pdf_import',
        check_number: t.checkNumber || null,
      }));

      const { error } = await supabase
        .from('transactions')
        .insert(transactionsToInsert);

      if (error) throw error;

      return {
        success: true,
        data: {
          imported: transactionsToInsert.length,
        },
      };
    },

    /**
     * Get PDF upload history
     */
    getUploads: async (params = {}) => {
      const userId = await getUserId();

      let query = supabase
        .from('pdf_uploads')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (params.companyId) {
        query = query.eq('company_id', params.companyId);
      }

      const limit = params.limit || 20;
      const offset = params.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        success: true,
        data: {
          uploads: (data || []).map(row => ({
            id: row.id,
            fileName: row.file_name,
            fileSize: row.file_size,
            bankDetected: row.bank_detected,
            transactionCount: row.transaction_count,
            status: row.status,
            createdAt: row.created_at,
          })),
          total: count || 0,
        },
      };
    },

    /**
     * Process a PDF upload (trigger parsing)
     */
    process: async (uploadId, options = {}) => {
      const userId = await getUserId();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/process-pdf`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uploadId,
            userId,
            ...options,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to process PDF');
      }

      return await response.json();
    },

    /**
     * Get processing status
     */
    getStatus: async (processId) => {
      const userId = await getUserId();
      
      const { data, error } = await supabase
        .from('pdf_uploads')
        .select('*')
        .eq('id', processId)
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          status: data?.status || 'unknown',
          progress: data?.progress || 0,
          transactionCount: data?.transaction_count || 0,
          error: data?.error_message,
        },
      };
    },

    /**
     * Link transactions to a PDF upload
     */
    linkTransactions: async (uploadId, transactionIds) => {
      const userId = await getUserId();
      
      const { data, error } = await supabase
        .from('transactions')
        .update({
          pdf_upload_id: uploadId,
          updated_at: new Date().toISOString(),
        })
        .in('id', transactionIds)
        .eq('user_id', userId)
        .select();

      if (error) throw error;

      return {
        success: true,
        data: { 
          count: data?.length || 0,
          transactions: (data || []).map(transformTransaction),
        }
      };
    },

    /**
     * Unlink transactions from PDF uploads
     */
    unlinkTransactions: async (transactionIds) => {
      const userId = await getUserId();
      
      const { data, error } = await supabase
        .from('transactions')
        .update({
          pdf_upload_id: null,
          updated_at: new Date().toISOString(),
        })
        .in('id', transactionIds)
        .eq('user_id', userId)
        .select();

      if (error) throw error;

      return {
        success: true,
        data: { 
          count: data?.length || 0,
        }
      };
    },

    /**
     * Update company for a PDF upload
     */
    updateUploadCompany: async (uploadId, { companyId, companyName }) => {
      const userId = await getUserId();
      
      const { data, error } = await supabase
        .from('pdf_uploads')
        .update({
          company_id: companyId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', uploadId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          id: data.id,
          companyId: data.company_id,
        },
      };
    },

    /**
     * Rename a PDF upload
     */
    renameUpload: async (uploadId, name) => {
      const userId = await getUserId();
      
      const { data, error } = await supabase
        .from('pdf_uploads')
        .update({
          file_name: name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', uploadId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          id: data.id,
          fileName: data.file_name,
        },
      };
    },

    /**
     * Delete a PDF upload
     * @param {string} uploadId - Upload ID
     * @param {object} options - { deleteTransactions: boolean }
     */
    deleteUpload: async (uploadId, options = {}) => {
      const userId = await getUserId();
      
      // Optionally delete associated transactions
      if (options.deleteTransactions) {
        const { error: txError } = await supabase
          .from('transactions')
          .delete()
          .eq('upload_id', uploadId)
          .eq('user_id', userId);
        
        if (txError) throw txError;
      }
      
      // Delete the upload record
      const { error } = await supabase
        .from('pdf_uploads')
        .delete()
        .eq('id', uploadId)
        .eq('user_id', userId);

      if (error) throw error;

      return {
        success: true,
        data: { id: uploadId },
      };
    },

    /**
     * Batch delete multiple PDF uploads
     * @param {string[]} uploadIds - Array of upload IDs to delete
     * @param {object} options - { deleteTransactions: boolean }
     */
    batchDeleteUploads: async (uploadIds, options = {}) => {
      const userId = await getUserId();
      const successful = [];
      const failed = [];

      for (const uploadId of uploadIds) {
        try {
          // Optionally delete associated transactions
          if (options.deleteTransactions) {
            await supabase
              .from('transactions')
              .delete()
              .eq('upload_id', uploadId)
              .eq('user_id', userId);
          }
          
          // Delete the upload record
          const { error } = await supabase
            .from('pdf_uploads')
            .delete()
            .eq('id', uploadId)
            .eq('user_id', userId);

          if (error) throw error;
          successful.push(uploadId);
        } catch (err) {
          failed.push({ id: uploadId, error: err.message });
        }
      }

      return {
        success: true,
        data: { successful, failed },
      };
    },
  },

  // ===== Reports (via Supabase Edge Functions) =====
  reports: {
    /**
     * Generate a report via Edge Function
     */
    generate: async (type, params = {}) => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/generate-report`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type,
            ...params,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate report');
      }

      return response.json();
    },

    /**
     * Get Profit & Loss report
     */
    profitLoss: async (params = {}) => {
      const result = await supabaseClient.reports.generate('profit-loss', params);
      return { success: true, data: result.report };
    },

    /**
     * Get Tax Summary report
     */
    taxSummary: async (params = {}) => {
      const result = await supabaseClient.reports.generate('tax-summary', params);
      return { success: true, data: result.report };
    },

    /**
     * Get Expense Summary report
     */
    expenseSummary: async (params = {}) => {
      const result = await supabaseClient.reports.generate('expense', params);
      return { success: true, data: result.report };
    },

    /**
     * Get Income report
     */
    incomeSummary: async (params = {}) => {
      const result = await supabaseClient.reports.generate('income', params);
      return { success: true, data: result.report };
    },

    /**
     * Download report as CSV
     */
    downloadCSV: async (type, params = {}) => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/generate-report`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type,
            format: 'csv',
            ...params,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to download report');
      }

      // Return as blob for download
      return response.blob();
    },

    /**
     * Client-side Profit & Loss report
     * Returns data structured for ReportPreview component
     */
    profitLoss: async (params = {}) => {
      const userId = await getUserId();
      
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId);

      if (params.startDate) query = query.gte('date', params.startDate);
      if (params.endDate) query = query.lte('date', params.endDate);
      if (params.companyId) query = query.eq('company_id', params.companyId);

      const { data: transactions, error } = await query;
      if (error) throw error;

      const incomeByCategory = {};
      const expenseByCategory = {};
      let totalIncome = 0;
      let totalExpenses = 0;

      for (const tx of transactions || []) {
        const category = tx.category || 'Uncategorized';
        const amount = parseFloat(tx.amount) || 0;
        
        // Use same logic as getSummary for consistency
        if (tx.type === 'income' || tx.type === 'deposit') {
          const absAmount = Math.abs(amount);
          incomeByCategory[category] = (incomeByCategory[category] || 0) + absAmount;
          totalIncome += absAmount;
        } else {
          // Expenses - use absolute value
          const absAmount = Math.abs(amount);
          expenseByCategory[category] = (expenseByCategory[category] || 0) + absAmount;
          totalExpenses += absAmount;
        }
      }

      // Convert category objects to breakdown arrays for UI
      const incomeBreakdown = Object.entries(incomeByCategory).map(([category, amount]) => ({
        category,
        amount
      })).sort((a, b) => b.amount - a.amount);

      const expenseBreakdown = Object.entries(expenseByCategory).map(([category, amount]) => ({
        category,
        amount
      })).sort((a, b) => b.amount - a.amount);

      const netIncome = totalIncome - totalExpenses;
      const margin = totalIncome > 0 ? (netIncome / totalIncome) * 100 : 0;

      return {
        success: true,
        data: {
          reportType: 'Profit & Loss',
          period: { startDate: params.startDate, endDate: params.endDate },
          // Summary object for the metric cards
          summary: {
            grossIncome: totalIncome,
            totalIncome: totalIncome,
            totalExpenses: totalExpenses,
            netIncome: netIncome,
            margin: margin,
            transactionCount: transactions?.length || 0,
          },
          // Income breakdown for the table
          income: { 
            breakdown: incomeBreakdown,
            byCategory: incomeByCategory, 
            total: totalIncome 
          },
          // Expense breakdown for the table
          expenses: { 
            breakdown: expenseBreakdown,
            byCategory: expenseByCategory, 
            total: totalExpenses 
          },
          netIncome: netIncome,
          transactionCount: transactions?.length || 0,
          transactions: transactions?.map(transformTransaction) || [],
          generatedAt: new Date().toISOString(),
        },
      };
    },

    /**
     * Client-side Tax Summary report (IRS Schedule C format)
     * Returns data structured for TaxReportPreview component
     */
    taxSummary: async (params = {}) => {
      const userId = await getUserId();
      
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId);

      if (params.startDate) query = query.gte('date', params.startDate);
      if (params.endDate) query = query.lte('date', params.endDate);
      if (params.companyId) query = query.eq('company_id', params.companyId);

      const { data: transactions, error } = await query;
      if (error) throw error;

      // IRS Schedule C line mappings
      const scheduleCLines = {
        'Advertising': { line: '8', description: 'Advertising' },
        'Car & Truck': { line: '9', description: 'Car and truck expenses' },
        'Car & Truck Expenses': { line: '9', description: 'Car and truck expenses' },
        'Commissions': { line: '10', description: 'Commissions and fees' },
        'Contract Labor': { line: '11', description: 'Contract labor' },
        'Depreciation': { line: '13', description: 'Depreciation' },
        'Employee Benefits': { line: '14', description: 'Employee benefit programs' },
        'Insurance': { line: '15', description: 'Insurance (other than health)' },
        'Interest': { line: '16', description: 'Interest' },
        'Legal & Professional': { line: '17', description: 'Legal and professional services' },
        'Office Expenses': { line: '18', description: 'Office expense' },
        'Rent': { line: '20b', description: 'Rent or lease (machinery/equipment)' },
        'Repairs': { line: '21', description: 'Repairs and maintenance' },
        'Supplies': { line: '22', description: 'Supplies' },
        'Taxes & Licenses': { line: '23', description: 'Taxes and licenses' },
        'Travel': { line: '24a', description: 'Travel' },
        'Meals': { line: '24b', description: 'Deductible meals' },
        'Utilities': { line: '25', description: 'Utilities' },
        'Wages': { line: '26', description: 'Wages' },
        'Other Expenses': { line: '27', description: 'Other expenses' },
      };

      // Group by IRS category
      const categoryTotals = {};
      const contractorPayments = {};
      let totalIncome = 0;
      let totalExpenses = 0;

      for (const tx of transactions || []) {
        const category = tx.category || 'Other Expenses';
        const amount = parseFloat(tx.amount) || 0;
        const absAmount = Math.abs(amount);
        
        if (!categoryTotals[category]) {
          categoryTotals[category] = { total: 0, count: 0, transactions: [] };
        }
        categoryTotals[category].total += absAmount;
        categoryTotals[category].count += 1;
        categoryTotals[category].transactions.push(transformTransaction(tx));

        // Use same logic as getSummary for consistency
        if (tx.type === 'income' || tx.type === 'deposit') {
          totalIncome += absAmount;
        } else {
          totalExpenses += absAmount;
          
          // Track contractor payments for 1099 identification
          if (category === 'Contract Labor' && tx.payee) {
            if (!contractorPayments[tx.payee]) {
              contractorPayments[tx.payee] = 0;
            }
            contractorPayments[tx.payee] += absAmount;
          }
        }
      }

      // Build Schedule C structure for UI
      const scheduleC = [];
      const lineGroups = {};
      
      Object.entries(categoryTotals).forEach(([category, data]) => {
        const lineInfo = scheduleCLines[category] || { line: '27', description: 'Other expenses' };
        if (!lineGroups[lineInfo.line]) {
          lineGroups[lineInfo.line] = {
            line: lineInfo.line,
            description: lineInfo.description,
            categories: []
          };
        }
        lineGroups[lineInfo.line].categories.push({
          category,
          amount: data.total,
          transactionCount: data.count
        });
      });

      // Sort by line number
      Object.values(lineGroups)
        .sort((a, b) => {
          const aNum = parseInt(a.line) || 99;
          const bNum = parseInt(b.line) || 99;
          return aNum - bNum;
        })
        .forEach(group => scheduleC.push(group));

      // Build contractor list for labor payments section
      const contractorList = Object.entries(contractorPayments)
        .map(([payee, amount]) => ({
          payee,
          amount,
          requires1099: amount >= 600
        }))
        .sort((a, b) => b.amount - a.amount);

      const totalContractorPayments = contractorList.reduce((sum, c) => sum + c.amount, 0);
      const contractorsRequiring1099 = contractorList.filter(c => c.requires1099).length;

      return {
        success: true,
        data: {
          reportType: 'IRS Schedule C Tax Summary',
          taxYear: params.taxYear || new Date().getFullYear(),
          period: { startDate: params.startDate, endDate: params.endDate },
          summary: {
            totalDeductibleExpenses: totalExpenses,
            totalContractorPayments: totalContractorPayments,
            totalWagePayments: categoryTotals['Wages']?.total || 0,
            contractorsRequiring1099: contractorsRequiring1099,
            totalIncome,
            totalExpenses,
            netProfit: totalIncome - totalExpenses,
          },
          scheduleC,
          laborPayments: {
            contractors: {
              total: totalContractorPayments,
              payees: contractorList
            },
            wages: {
              total: categoryTotals['Wages']?.total || 0,
              payees: [] // Would need employee tracking
            }
          },
          categoryBreakdown: categoryTotals,
          transactionCount: transactions?.length || 0,
          generatedAt: new Date().toISOString(),
        },
      };
    },

    /**
     * Client-side Expense Summary report
     * Returns data structured for CategoryReportPreview component
     */
    expenseSummary: async (params = {}) => {
      const userId = await getUserId();
      
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .lt('amount', 0); // Only expenses (negative amounts)

      if (params.startDate) query = query.gte('date', params.startDate);
      if (params.endDate) query = query.lte('date', params.endDate);
      if (params.companyId) query = query.eq('company_id', params.companyId);

      const { data: transactions, error } = await query;
      if (error) throw error;

      const categoryTotals = {};
      let totalExpenses = 0;

      for (const tx of transactions || []) {
        const category = tx.category || 'Uncategorized';
        const amount = Math.abs(parseFloat(tx.amount) || 0);
        
        if (!categoryTotals[category]) {
          categoryTotals[category] = { total: 0, count: 0, transactions: [] };
        }
        categoryTotals[category].total += amount;
        categoryTotals[category].count += 1;
        categoryTotals[category].transactions.push(transformTransaction(tx));
        totalExpenses += amount;
      }

      // Convert to categories array for UI
      const categories = Object.entries(categoryTotals).map(([category, data]) => ({
        category,
        amount: data.total,
        transactionCount: data.count,
        percentage: totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0
      })).sort((a, b) => b.amount - a.amount);

      const avgTransaction = transactions?.length > 0 
        ? totalExpenses / transactions.length 
        : 0;

      return {
        success: true,
        data: {
          reportType: 'Expense Summary',
          period: { startDate: params.startDate, endDate: params.endDate },
          summary: {
            totalExpenses,
            totalTransactions: transactions?.length || 0,
            averageTransaction: avgTransaction,
          },
          categories,
          categoryBreakdown: categoryTotals,
          totalExpenses,
          transactionCount: transactions?.length || 0,
          generatedAt: new Date().toISOString(),
        },
      };
    },

    /**
     * Get 1099 Summary (contractors paid >= $600)
     */
    get1099Summary: async (params = {}) => {
      const userId = await getUserId();
      
      // Get all payees marked as requiring 1099
      const { data: payees } = await supabase
        .from('payees')
        .select('*')
        .eq('user_id', userId)
        .eq('is_1099_required', true);

      // Get transactions for the period
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .lt('amount', 0);

      if (params.startDate) query = query.gte('date', params.startDate);
      if (params.endDate) query = query.lte('date', params.endDate);

      const { data: transactions, error } = await query;
      if (error) throw error;

      // Group payments by payee
      const payeeTotals = {};
      for (const tx of transactions || []) {
        const payeeName = tx.payee_name || tx.description || 'Unknown';
        if (!payeeTotals[payeeName]) {
          payeeTotals[payeeName] = { total: 0, transactions: [] };
        }
        payeeTotals[payeeName].total += Math.abs(parseFloat(tx.amount) || 0);
        payeeTotals[payeeName].transactions.push(transformTransaction(tx));
      }

      // Filter for those >= $600
      const contractors = Object.entries(payeeTotals)
        .filter(([_, data]) => data.total >= 600)
        .map(([name, data]) => ({
          name,
          total: data.total,
          transactionCount: data.transactions.length,
          transactions: data.transactions,
        }));

      return {
        success: true,
        data: {
          reportType: '1099-NEC Summary',
          period: { startDate: params.startDate, endDate: params.endDate },
          contractors,
          totalContractors: contractors.length,
          totalPaid: contractors.reduce((sum, c) => sum + c.total, 0),
          generatedAt: new Date().toISOString(),
        },
      };
    },

    /**
     * Get Vendor Summary
     */
    getVendorSummary: async (params = {}) => {
      const userId = await getUserId();
      
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .lt('amount', 0);

      if (params.startDate) query = query.gte('date', params.startDate);
      if (params.endDate) query = query.lte('date', params.endDate);

      const { data: transactions, error } = await query;
      if (error) throw error;

      const vendorTotals = {};
      for (const tx of transactions || []) {
        const vendorName = tx.payee_name || tx.description || 'Unknown Vendor';
        if (!vendorTotals[vendorName]) {
          vendorTotals[vendorName] = { total: 0, count: 0, transactions: [] };
        }
        vendorTotals[vendorName].total += Math.abs(parseFloat(tx.amount) || 0);
        vendorTotals[vendorName].count += 1;
        vendorTotals[vendorName].transactions.push(transformTransaction(tx));
      }

      const vendors = Object.entries(vendorTotals)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.total - a.total);

      return {
        success: true,
        data: {
          reportType: 'Vendor Payment Summary',
          period: { startDate: params.startDate, endDate: params.endDate },
          vendors,
          totalVendors: vendors.length,
          totalPaid: vendors.reduce((sum, v) => sum + v.total, 0),
          generatedAt: new Date().toISOString(),
        },
      };
    },

    /**
     * Get Payee Summary (all payees)
     */
    getPayeeSummary: async (params = {}) => {
      const userId = await getUserId();
      
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId);

      if (params.startDate) query = query.gte('date', params.startDate);
      if (params.endDate) query = query.lte('date', params.endDate);

      const { data: transactions, error } = await query;
      if (error) throw error;

      const payeeTotals = {};
      for (const tx of transactions || []) {
        const payeeName = tx.payee_name || tx.description || 'Unknown';
        if (!payeeTotals[payeeName]) {
          payeeTotals[payeeName] = { income: 0, expenses: 0, count: 0 };
        }
        const amount = parseFloat(tx.amount) || 0;
        if (amount > 0) {
          payeeTotals[payeeName].income += amount;
        } else {
          payeeTotals[payeeName].expenses += Math.abs(amount);
        }
        payeeTotals[payeeName].count += 1;
      }

      const payees = Object.entries(payeeTotals)
        .map(([name, data]) => ({ name, ...data, net: data.income - data.expenses }))
        .sort((a, b) => (b.income + b.expenses) - (a.income + a.expenses));

      return {
        success: true,
        data: {
          reportType: 'Payee Summary',
          period: { startDate: params.startDate, endDate: params.endDate },
          payees,
          totalPayees: payees.length,
          generatedAt: new Date().toISOString(),
        },
      };
    },

    /**
     * Generate PDF report (client-side using jsPDF)
     * Returns a Blob that can be downloaded
     */
    generateSummaryPDF: async (params = {}) => {
      const reportData = await supabaseClient.reports.profitLoss(params);
      return generatePDFFromData('Financial Summary', reportData.data, params);
    },

    generateTaxSummaryPDF: async (params = {}) => {
      const reportData = await supabaseClient.reports.taxSummary(params);
      return generatePDFFromData('IRS Schedule C Tax Report', reportData.data, params);
    },

    generateCategoryBreakdownPDF: async (params = {}) => {
      const reportData = await supabaseClient.reports.expenseSummary(params);
      return generatePDFFromData('Category Breakdown', reportData.data, params);
    },

    generateChecksPaidPDF: async (params = {}) => {
      const userId = await getUserId();
      
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('payment_method', 'check');

      if (params.startDate) query = query.gte('date', params.startDate);
      if (params.endDate) query = query.lte('date', params.endDate);

      const { data: transactions, error } = await query;
      if (error) throw error;

      const reportData = {
        reportType: 'Checks Paid Report',
        period: { startDate: params.startDate, endDate: params.endDate },
        checks: transactions?.map(transformTransaction) || [],
        totalChecks: transactions?.length || 0,
        totalAmount: transactions?.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount) || 0), 0) || 0,
      };

      return generatePDFFromData('Checks Paid Report', reportData, params);
    },

    generate1099SummaryPDF: async (params = {}) => {
      const reportData = await supabaseClient.reports.get1099Summary(params);
      return generatePDFFromData('1099-NEC Summary', reportData.data, params);
    },

    generateVendorSummaryPDF: async (params = {}) => {
      const reportData = await supabaseClient.reports.getVendorSummary(params);
      return generatePDFFromData('Vendor Payment Summary', reportData.data, params);
    },

    generatePayeeSummaryPDF: async (params = {}) => {
      const reportData = await supabaseClient.reports.getPayeeSummary(params);
      return generatePDFFromData('Payee Summary', reportData.data, params);
    },

    getMonthlySummary: async (params = {}) => {
      const userId = await getUserId();
      const { year, month, startDate: paramStartDate, endDate: paramEndDate, companyId } = params;
      
      // Support both year/month and startDate/endDate formats
      let startDate, endDate;
      if (paramStartDate && paramEndDate) {
        startDate = paramStartDate;
        endDate = paramEndDate;
      } else if (year !== undefined && month !== undefined) {
        startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
      } else {
        // Default to current month
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
        const lastDay = new Date(currentYear, currentMonth, 0).getDate();
        endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${lastDay}`;
      }
      
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (companyId) query = query.eq('company_id', companyId);

      const { data, error } = await query;
      if (error) throw error;

      const transactions = (data || []).map(transformTransaction);
      
      // Calculate summary stats (exclude transfers from income/expense)
      const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
      const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(parseFloat(t.amount) || 0), 0);
      const transfers = transactions.filter(t => t.type === 'transfer').reduce((sum, t) => sum + Math.abs(parseFloat(t.amount) || 0), 0);
      
      // Group by month for chart data
      const monthlyData = {};
      transactions.forEach(t => {
        const date = new Date(t.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            monthLabel: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            income: { total: 0 },
            expenses: { total: 0 },
            transfers: { total: 0 },
            netIncome: 0
          };
        }
        const amount = parseFloat(t.amount) || 0;
        if (t.type === 'transfer') {
          monthlyData[monthKey].transfers.total += Math.abs(amount);
        } else if (t.type === 'income' || t.type === 'deposit') {
          monthlyData[monthKey].income.total += amount;
        } else {
          monthlyData[monthKey].expenses.total += Math.abs(amount);
        }
        monthlyData[monthKey].netIncome = monthlyData[monthKey].income.total - monthlyData[monthKey].expenses.total;
      });
      
      return {
        success: true,
        data: {
          transactions,
          months: Object.values(monthlyData).sort((a, b) => a.monthLabel.localeCompare(b.monthLabel)),
          summary: {
            totalIncome: income,
            totalExpenses: expenses,
            totalTransfers: transfers,
            netIncome: income - expenses, // Transfers excluded
            transactionCount: transactions.length,
          },
          period: { year, month, startDate, endDate },
        },
      };
    },

    getMonthlyChecks: async (params = {}) => {
      const userId = await getUserId();
      const { year, month, startDate: paramStartDate, endDate: paramEndDate, companyId } = params;
      
      // Support both year/month and startDate/endDate formats
      let startDate, endDate;
      if (paramStartDate && paramEndDate) {
        startDate = paramStartDate;
        endDate = paramEndDate;
      } else if (year !== undefined && month !== undefined) {
        startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
      } else {
        // Default to current month
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
        const lastDay = new Date(currentYear, currentMonth, 0).getDate();
        endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${lastDay}`;
      }
      
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate)
        .not('check_number', 'is', null)
        .order('check_number', { ascending: true });

      if (companyId) query = query.eq('company_id', companyId);

      const { data, error } = await query;
      if (error) throw error;

      const checks = (data || []).map(transformTransaction);
      
      // Group by month for chart data
      const monthlyData = {};
      checks.forEach(t => {
        const date = new Date(t.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            monthLabel: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            income: { amount: 0 },
            expense: { amount: 0 },
            totalChecks: 0
          };
        }
        const amount = parseFloat(t.amount) || 0;
        if (t.type === 'income' || t.type === 'deposit') {
          monthlyData[monthKey].income.amount += amount;
        } else {
          monthlyData[monthKey].expense.amount += Math.abs(amount);
        }
        monthlyData[monthKey].totalChecks++;
      });

      return {
        success: true,
        data: {
          checks,
          months: Object.values(monthlyData).sort((a, b) => a.monthLabel.localeCompare(b.monthLabel)),
          period: { year, month, startDate, endDate },
        },
      };
    },

    generateMonthlySummaryPDF: async (params = {}) => {
      const reportData = await supabaseClient.reports.getMonthlySummary(params);
      return generatePDFFromData('Monthly Summary', reportData.data, params);
    },

    generateMonthlyChecksPDF: async (params = {}) => {
      const reportData = await supabaseClient.reports.getMonthlyChecks(params);
      return generatePDFFromData('Monthly Checks', reportData.data, params);
    },

    /**
     * Client-side report generation (for simple reports without Edge Function)
     * Generate P&L directly from Supabase data
     */
    generateProfitLossLocal: async (params = {}) => {
      return supabaseClient.reports.profitLoss(params);
    },
  },
};

/**
 * Generate PDF from report data (client-side)
 * Uses simple HTML-to-PDF approach
 */
async function generatePDFFromData(title, data, params) {
  // Create HTML content for the report
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
        h1 { color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
        h2 { color: #374151; margin-top: 30px; }
        .period { color: #6b7280; font-size: 14px; margin-bottom: 20px; }
        .summary-box { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .summary-row:last-child { border-bottom: none; font-weight: bold; }
        .amount { font-family: monospace; }
        .positive { color: #059669; }
        .negative { color: #dc2626; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f9fafb; font-weight: 600; }
        .total-row { font-weight: bold; background: #f3f4f6; }
        .footer { margin-top: 40px; color: #9ca3af; font-size: 12px; text-align: center; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <div class="period">Period: ${params.startDate || 'Start'} to ${params.endDate || 'End'}</div>
      ${formatReportContent(data)}
      <div class="footer">Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>
    </body>
    </html>
  `;

  // Create blob from HTML (for now, return HTML as blob - proper PDF would need jsPDF)
  // Open in new window for printing/saving as PDF
  const blob = new Blob([html], { type: 'text/html' });
  
  // Open print dialog
  const printWindow = window.open('', '_blank');
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.print();
  
  return blob;
}

/**
 * Format report content based on data structure
 */
function formatReportContent(data) {
  if (!data) return '<p>No data available</p>';

  let html = '';

  // Summary box for totals
  if (data.totalIncome !== undefined || data.totalExpenses !== undefined) {
    html += '<div class="summary-box">';
    if (data.totalIncome !== undefined) {
      html += `<div class="summary-row"><span>Total Income</span><span class="amount positive">$${data.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>`;
    }
    if (data.totalExpenses !== undefined) {
      html += `<div class="summary-row"><span>Total Expenses</span><span class="amount negative">$${data.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>`;
    }
    if (data.netIncome !== undefined) {
      html += `<div class="summary-row"><span>Net Income</span><span class="amount ${data.netIncome >= 0 ? 'positive' : 'negative'}">$${data.netIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>`;
    }
    if (data.netProfit !== undefined) {
      html += `<div class="summary-row"><span>Net Profit</span><span class="amount ${data.netProfit >= 0 ? 'positive' : 'negative'}">$${data.netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>`;
    }
    html += '</div>';
  }

  // Category breakdown table
  if (data.categoryBreakdown) {
    html += '<h2>Category Breakdown</h2><table><thead><tr><th>Category</th><th>Count</th><th>Total</th></tr></thead><tbody>';
    for (const [category, info] of Object.entries(data.categoryBreakdown)) {
      html += `<tr><td>${category}</td><td>${info.count}</td><td class="amount">$${info.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td></tr>`;
    }
    html += '</tbody></table>';
  }

  // Income by category
  if (data.income?.byCategory) {
    html += '<h2>Income by Category</h2><table><thead><tr><th>Category</th><th>Amount</th></tr></thead><tbody>';
    for (const [category, amount] of Object.entries(data.income.byCategory)) {
      html += `<tr><td>${category}</td><td class="amount positive">$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td></tr>`;
    }
    html += '</tbody></table>';
  }

  // Expenses by category
  if (data.expenses?.byCategory) {
    html += '<h2>Expenses by Category</h2><table><thead><tr><th>Category</th><th>Amount</th></tr></thead><tbody>';
    for (const [category, amount] of Object.entries(data.expenses.byCategory)) {
      html += `<tr><td>${category}</td><td class="amount negative">$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td></tr>`;
    }
    html += '</tbody></table>';
  }

  // Contractors (1099)
  if (data.contractors) {
    html += '<h2>Contractors (1099-NEC)</h2><table><thead><tr><th>Name</th><th>Transactions</th><th>Total Paid</th></tr></thead><tbody>';
    for (const contractor of data.contractors) {
      html += `<tr><td>${contractor.name}</td><td>${contractor.transactionCount}</td><td class="amount">$${contractor.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td></tr>`;
    }
    html += '</tbody></table>';
  }

  // Vendors
  if (data.vendors) {
    html += '<h2>Vendors</h2><table><thead><tr><th>Name</th><th>Transactions</th><th>Total Paid</th></tr></thead><tbody>';
    for (const vendor of data.vendors.slice(0, 50)) { // Limit to top 50
      html += `<tr><td>${vendor.name}</td><td>${vendor.count}</td><td class="amount">$${vendor.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td></tr>`;
    }
    html += '</tbody></table>';
  }

  // Payees
  if (data.payees) {
    html += '<h2>Payees</h2><table><thead><tr><th>Name</th><th>Income</th><th>Expenses</th><th>Net</th></tr></thead><tbody>';
    for (const payee of data.payees.slice(0, 50)) {
      html += `<tr><td>${payee.name}</td><td class="amount positive">$${payee.income.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td><td class="amount negative">$${payee.expenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td><td class="amount ${payee.net >= 0 ? 'positive' : 'negative'}">$${payee.net.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td></tr>`;
    }
    html += '</tbody></table>';
  }

  // Checks
  if (data.checks) {
    html += `<div class="summary-box"><div class="summary-row"><span>Total Checks</span><span>${data.totalChecks}</span></div><div class="summary-row"><span>Total Amount</span><span class="amount">$${data.totalAmount?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}</span></div></div>`;
  }

  return html;
}

export default supabaseClient;
