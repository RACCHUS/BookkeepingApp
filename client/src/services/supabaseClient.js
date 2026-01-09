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
        },
      };
    },

    confirmImport: async (transactions, options = {}) => {
      const userId = await getUserId();
      const { skipDuplicates = true, companyId = null } = options;

      // Create a CSV import record
      const { data: importRecord, error: importError } = await supabase
        .from('csv_imports')
        .insert({
          user_id: userId,
          company_id: companyId,
          file_name: options.fileName || 'import.csv',
          bank_format: options.bankFormat || 'auto',
          total_rows: transactions.length,
          status: 'processing',
        })
        .select()
        .single();

      if (importError) throw importError;

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

      // Insert transactions
      const transactionsToInsert = toInsert.map(t => ({
        user_id: userId,
        date: t.date,
        description: t.description,
        amount: t.amount,
        type: t.type,
        category: t.category || null,
        company_id: companyId || t.companyId || null,
        source: 'csv',
        source_file: options.fileName || 'import.csv',
        csv_import_id: importRecord.id,
        bank_name: t.bankName || null,
        check_number: t.checkNumber || null,
        reference_number: t.referenceNumber || null,
        original_description: t.originalDescription || t.description,
        created_by: userId,
        last_modified_by: userId,
      }));

      if (transactionsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('transactions')
          .insert(transactionsToInsert);

        if (insertError) throw insertError;
      }

      // Update import record
      await supabase
        .from('csv_imports')
        .update({
          status: 'completed',
          imported_count: transactionsToInsert.length,
          duplicate_count: duplicateCount,
        })
        .eq('id', importRecord.id);

      return {
        success: true,
        data: {
          importId: importRecord.id,
          imported: transactionsToInsert.length,
          duplicates: duplicateCount,
          total: transactions.length,
        },
      };
    },

    getImports: async (params = {}) => {
      const userId = await getUserId();
      
      let query = supabase
        .from('csv_imports')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      const limit = params.limit || 20;
      const offset = params.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        success: true,
        data: {
          imports: (data || []).map(row => ({
            id: row.id,
            fileName: row.file_name,
            bankFormat: row.bank_format,
            totalRows: row.total_rows,
            importedCount: row.imported_count,
            duplicateCount: row.duplicate_count,
            status: row.status,
            createdAt: row.created_at,
          })),
          total: count || 0,
        },
      };
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

      return { success: true };
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
     * Client-side report generation (for simple reports without Edge Function)
     * Generate P&L directly from Supabase data
     */
    generateProfitLossLocal: async (params = {}) => {
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

      // Calculate totals
      const incomeByCategory = {};
      const expenseByCategory = {};
      let totalIncome = 0;
      let totalExpenses = 0;

      for (const tx of transactions || []) {
        const category = tx.category || 'Uncategorized';
        
        if (tx.type === 'income') {
          incomeByCategory[category] = (incomeByCategory[category] || 0) + parseFloat(tx.amount);
          totalIncome += parseFloat(tx.amount);
        } else {
          expenseByCategory[category] = (expenseByCategory[category] || 0) + parseFloat(tx.amount);
          totalExpenses += parseFloat(tx.amount);
        }
      }

      return {
        success: true,
        data: {
          reportType: 'Profit & Loss',
          period: { 
            startDate: params.startDate || 'All time', 
            endDate: params.endDate || 'Present' 
          },
          income: { byCategory: incomeByCategory, total: totalIncome },
          expenses: { byCategory: expenseByCategory, total: totalExpenses },
          netIncome: totalIncome - totalExpenses,
          transactionCount: transactions?.length || 0,
          generatedAt: new Date().toISOString(),
        },
      };
    },
  },
};

export default supabaseClient;
