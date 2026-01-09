/**
 * Supabase API Client
 * 
 * Direct Supabase database operations for the frontend.
 * Replaces Express API calls for most CRUD operations.
 */

import { supabase } from './supabase';
import { auth } from './firebase';

/**
 * Get the current user's Firebase UID
 */
const getUserId = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  return user.uid;
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
 */
const toDbTransaction = (data, userId) => {
  const dbData = {
    user_id: userId,
  };
  
  if (data.date !== undefined) dbData.date = data.date;
  if (data.description !== undefined) dbData.description = data.description;
  if (data.amount !== undefined) dbData.amount = data.amount;
  if (data.type !== undefined) dbData.type = data.type;
  if (data.category !== undefined) dbData.category = data.category;
  if (data.subcategory !== undefined) dbData.subcategory = data.subcategory;
  if (data.payee !== undefined) dbData.payee = data.payee;
  if (data.payeeId !== undefined) dbData.payee_id = data.payeeId;
  if (data.companyId !== undefined) dbData.company_id = data.companyId;
  if (data.vendorId !== undefined) dbData.vendor_id = data.vendorId;
  if (data.vendorName !== undefined) dbData.vendor_name = data.vendorName;
  if (data.notes !== undefined) dbData.notes = data.notes;
  if (data.tags !== undefined) dbData.tags = data.tags;
  if (data.is1099Payment !== undefined) dbData.is_1099_payment = data.is1099Payment;
  if (data.isReconciled !== undefined) dbData.is_reconciled = data.isReconciled;
  if (data.isReviewed !== undefined) dbData.is_reviewed = data.isReviewed;
  if (data.incomeSourceId !== undefined) dbData.income_source_id = data.incomeSourceId;
  if (data.source !== undefined) dbData.source = data.source;
  
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
    type: row.type,
    taxId: row.tax_id,
    address: row.address,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

/**
 * Transform payee from database to frontend format
 */
const transformPayee = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    defaultCategory: row.default_category,
    defaultSubcategory: row.default_subcategory,
    aliases: row.aliases || [],
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

    getSummary: async (startDate, endDate) => {
      const userId = await getUserId();
      
      let query = supabase
        .from('transactions')
        .select('type, amount')
        .eq('user_id', userId);

      if (startDate) {
        query = query.gte('date', startDate);
      }
      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Calculate totals
      let totalIncome = 0;
      let totalExpenses = 0;

      (data || []).forEach(t => {
        const amount = parseFloat(t.amount) || 0;
        if (t.type === 'income' || t.type === 'deposit') {
          totalIncome += amount;
        } else {
          totalExpenses += Math.abs(amount);
        }
      });

      return {
        success: true,
        data: {
          summary: {
            totalIncome,
            totalExpenses,
            netIncome: totalIncome - totalExpenses,
            transactionCount: data?.length || 0,
          }
        }
      };
    },

    bulkUpdate: async (ids, updates) => {
      const userId = await getUserId();
      
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
          type: companyData.type,
          tax_id: companyData.taxId,
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
      if (companyData.type !== undefined) updateData.type = companyData.type;
      if (companyData.taxId !== undefined) updateData.tax_id = companyData.taxId;
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
      
      const { data, error } = await supabase
        .from('payees')
        .insert({
          user_id: userId,
          name: payeeData.name,
          default_category: payeeData.defaultCategory,
          default_subcategory: payeeData.defaultSubcategory,
          aliases: payeeData.aliases || [],
          notes: payeeData.notes,
        })
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
      
      const updateData = {};
      if (payeeData.name !== undefined) updateData.name = payeeData.name;
      if (payeeData.defaultCategory !== undefined) updateData.default_category = payeeData.defaultCategory;
      if (payeeData.defaultSubcategory !== undefined) updateData.default_subcategory = payeeData.defaultSubcategory;
      if (payeeData.aliases !== undefined) updateData.aliases = payeeData.aliases;
      if (payeeData.notes !== undefined) updateData.notes = payeeData.notes;
      updateData.updated_at = new Date().toISOString();

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

      return {
        success: true,
        data: { 
          incomeSources: (data || []).map(row => ({
            id: row.id,
            name: row.name,
            type: row.type,
            isActive: row.is_active,
            notes: row.notes,
            createdAt: row.created_at,
          }))
        }
      };
    },

    create: async (sourceData) => {
      const userId = await getUserId();
      
      const { data, error } = await supabase
        .from('income_sources')
        .insert({
          user_id: userId,
          name: sourceData.name,
          type: sourceData.type,
          is_active: sourceData.isActive !== false,
          notes: sourceData.notes,
        })
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
};

export default supabaseClient;
