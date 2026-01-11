/**
 * Tax Form Service
 * 
 * API client for tax form generation endpoints
 * Uses Supabase for data, with placeholders for PDF generation
 * 
 * Note: Full PDF generation requires server-side processing.
 * This version provides data preview and basic functionality.
 */

import { supabase } from './supabase';
import { auth } from './firebase';

/**
 * Get current user ID - waits for auth state if needed
 */
const getUserId = async () => {
  // If user is already available, return immediately
  if (auth.currentUser) {
    return auth.currentUser.uid;
  }
  
  // Wait for auth state to be determined (handles token refresh)
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
 * Tax Form API client
 */
const taxFormService = {
  // ==================== 1099-NEC ====================

  /**
   * Preview 1099-NEC data for a payee
   * Gets payment data from Supabase
   */
  preview1099NEC: async (payeeId, options = {}) => {
    const userId = await getUserId();
    const taxYear = options.taxYear || new Date().getFullYear();
    
    // Get payee info
    const { data: payee, error: payeeError } = await supabase
      .from('payees')
      .select('*')
      .eq('id', payeeId)
      .eq('user_id', userId)
      .single();
    
    if (payeeError) throw payeeError;
    
    // Get transactions for this payee in the tax year
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('payee_id', payeeId)
      .eq('type', 'expense')
      .gte('date', `${taxYear}-01-01`)
      .lte('date', `${taxYear}-12-31`);
    
    if (options.companyId) {
      query = query.eq('company_id', options.companyId);
    }
    
    const { data: transactions, error: txError } = await query;
    if (txError) throw txError;
    
    const totalPayments = (transactions || []).reduce(
      (sum, tx) => sum + (parseFloat(tx.amount) || 0), 
      0
    );
    
    return {
      success: true,
      data: {
        payee: {
          id: payee.id,
          name: payee.name,
          taxId: payee.tax_id,
          address: payee.address,
          city: payee.city,
          state: payee.state,
          zip: payee.zip,
        },
        taxYear,
        totalPayments,
        transactionCount: transactions?.length || 0,
        meetsThreshold: totalPayments >= 600,
        threshold: 600,
      },
    };
  },

  /**
   * Generate 1099-NEC PDF for a payee
   * Note: Full PDF generation not available without server
   */
  generate1099NEC: async (payeeId, options = {}) => {
    throw new Error('PDF generation requires server-side processing. Use the preview function for data.');
  },

  /**
   * Batch preview 1099-NEC for all qualifying payees
   */
  batchPreview1099NEC: async (options = {}) => {
    const userId = await getUserId();
    const taxYear = options.taxYear || new Date().getFullYear();
    
    // Get all payees marked as 1099 eligible
    let payeeQuery = supabase
      .from('payees')
      .select('*')
      .eq('user_id', userId)
      .eq('is_1099_eligible', true);
    
    const { data: payees, error: payeeError } = await payeeQuery;
    if (payeeError) throw payeeError;
    
    const results = [];
    
    for (const payee of payees || []) {
      // Get transactions for this payee
      let txQuery = supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('payee_id', payee.id)
        .eq('type', 'expense')
        .gte('date', `${taxYear}-01-01`)
        .lte('date', `${taxYear}-12-31`);
      
      if (options.companyId) {
        txQuery = txQuery.eq('company_id', options.companyId);
      }
      
      const { data: transactions } = await txQuery;
      
      const totalPayments = (transactions || []).reduce(
        (sum, tx) => sum + (parseFloat(tx.amount) || 0),
        0
      );
      
      if (totalPayments >= 600) {
        results.push({
          payee: {
            id: payee.id,
            name: payee.name,
            taxId: payee.tax_id,
          },
          totalPayments,
          meetsThreshold: true,
        });
      }
    }
    
    return {
      success: true,
      data: {
        taxYear,
        threshold: 600,
        qualifyingPayees: results.length,
        payees: results,
      },
    };
  },

  /**
   * Generate batch 1099-NEC PDFs
   * Note: Not available without server
   */
  batchGenerate1099NEC: async (options = {}) => {
    throw new Error('Batch PDF generation requires server-side processing.');
  },

  // ==================== W-9 ====================

  /**
   * Get W-9 data for a payee
   */
  getW9Data: async (payeeId) => {
    const userId = await getUserId();
    
    const { data: payee, error } = await supabase
      .from('payees')
      .select('*')
      .eq('id', payeeId)
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    
    return {
      success: true,
      data: {
        name: payee.name,
        businessName: payee.business_name,
        taxClassification: payee.tax_classification,
        taxId: payee.tax_id,
        address: payee.address,
        city: payee.city,
        state: payee.state,
        zip: payee.zip,
      },
    };
  },

  /**
   * Update W-9 data for a payee
   */
  updateW9Data: async (payeeId, w9Data) => {
    const userId = await getUserId();
    
    const { data, error } = await supabase
      .from('payees')
      .update({
        business_name: w9Data.businessName,
        tax_classification: w9Data.taxClassification,
        tax_id: w9Data.taxId,
        address: w9Data.address,
        city: w9Data.city,
        state: w9Data.state,
        zip: w9Data.zip,
      })
      .eq('id', payeeId)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    
    return { success: true, data };
  },

  // ==================== Tax Summary ====================

  /**
   * Get tax summary for a year
   */
  getTaxSummary: async (options = {}) => {
    const userId = await getUserId();
    const taxYear = options.taxYear || new Date().getFullYear();
    
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('date', `${taxYear}-01-01`)
      .lte('date', `${taxYear}-12-31`);
    
    if (options.companyId) {
      query = query.eq('company_id', options.companyId);
    }
    
    const { data: transactions, error } = await query;
    if (error) throw error;
    
    // Calculate totals by category
    const incomeByCategory = {};
    const expenseByCategory = {};
    let totalIncome = 0;
    let totalExpenses = 0;
    
    for (const tx of transactions || []) {
      const category = tx.category || 'Uncategorized';
      const amount = parseFloat(tx.amount) || 0;
      
      if (tx.type === 'income') {
        incomeByCategory[category] = (incomeByCategory[category] || 0) + amount;
        totalIncome += amount;
      } else {
        expenseByCategory[category] = (expenseByCategory[category] || 0) + amount;
        totalExpenses += amount;
      }
    }
    
    return {
      success: true,
      data: {
        taxYear,
        income: {
          total: totalIncome,
          byCategory: incomeByCategory,
        },
        expenses: {
          total: totalExpenses,
          byCategory: expenseByCategory,
        },
        netIncome: totalIncome - totalExpenses,
        transactionCount: transactions?.length || 0,
      },
    };
  },

  /**
   * Get tax form summary for dashboard
   * Returns counts of 1099-NEC and W-2 eligible payees
   */
  getTaxFormSummary: async (taxYear, companyId = null) => {
    const userId = await getUserId();
    const year = taxYear || new Date().getFullYear() - 1;
    
    // Get all payees
    let payeeQuery = supabase
      .from('payees')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);
    
    if (companyId) {
      payeeQuery = payeeQuery.eq('company_id', companyId);
    }
    
    const { data: payees, error: payeeError } = await payeeQuery;
    if (payeeError) throw payeeError;
    
    // Separate by type
    const contractors = (payees || []).filter(p => 
      p.type === 'contractor' || p.type === 'vendor' || p.is_1099_eligible
    );
    const employees = (payees || []).filter(p => p.type === 'employee');
    
    // Check each contractor for 1099 eligibility (>= $600)
    let eligible1099Count = 0;
    let generated1099Count = 0;
    let missingInfo1099 = [];
    
    for (const contractor of contractors) {
      // Get payments for this contractor in the tax year
      let txQuery = supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('payee_id', contractor.id)
        .eq('type', 'expense')
        .gte('date', `${year}-01-01`)
        .lte('date', `${year}-12-31`);
      
      if (companyId) {
        txQuery = txQuery.eq('company_id', companyId);
      }
      
      const { data: payments } = await txQuery;
      const totalPaid = (payments || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      
      if (totalPaid >= 600) {
        eligible1099Count++;
        
        // Check for missing info
        if (!contractor.tax_id) {
          missingInfo1099.push({ id: contractor.id, name: contractor.name, missing: 'Tax ID' });
        }
        if (!contractor.address) {
          missingInfo1099.push({ id: contractor.id, name: contractor.name, missing: 'Address' });
        }
      }
    }
    
    // For W-2, just count active employees
    const employeeCount = employees.length;
    const missingInfoW2 = employees.filter(e => !e.tax_id || !e.address).map(e => ({
      id: e.id,
      name: e.name,
      missing: !e.tax_id ? 'SSN' : 'Address',
    }));
    
    return {
      taxYear: year,
      form1099NEC: {
        eligible: eligible1099Count,
        generated: generated1099Count,
        pending: eligible1099Count - generated1099Count,
        threshold: 600,
      },
      formW2: {
        employees: employeeCount,
        generated: 0,
        pending: employeeCount,
      },
      missingInfo: {
        form1099NEC: missingInfo1099,
        formW2: missingInfoW2,
      },
    };
  },
};

export default taxFormService;
