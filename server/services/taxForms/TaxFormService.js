/**
 * Tax Form Service
 * 
 * Main service for generating IRS tax forms (1099-NEC, 1099-MISC, W-2)
 * Coordinates between form generators and database access
 * 
 * @author BookkeepingApp Team
 */

import { Form1099NECGenerator } from './Form1099NECGenerator.js';
import { Form1099MISCGenerator } from './Form1099MISCGenerator.js';
import { FormW2Generator } from './FormW2Generator.js';
import { getPayeesMissingInfo, formatTaxAmount } from './taxFormValidation.js';
import { getDatabaseAdapter } from '../adapters/index.js';
import { logger } from '../../config/index.js';

// 1099 filing threshold
const FORM_1099_THRESHOLD = 600;

/**
 * Tax Form Service
 * Handles generation of all IRS tax forms
 */
export class TaxFormService {
  constructor() {
    this.form1099NECGenerator = new Form1099NECGenerator();
    this.form1099MISCGenerator = new Form1099MISCGenerator();
    this.formW2Generator = new FormW2Generator();
  }

  /**
   * Get database adapter
   * @private
   */
  _getDb() {
    return getDatabaseAdapter();
  }

  // ==================== 1099-NEC Methods ====================

  /**
   * Preview 1099-NEC for a payee
   * @param {string} userId - User ID
   * @param {string} payeeId - Payee ID
   * @param {string} companyId - Company ID (optional)
   * @param {number} taxYear - Tax year (optional, defaults to last year)
   * @returns {Promise<Object>} Preview data
   */
  async preview1099NEC(userId, payeeId, companyId = null, taxYear = null) {
    try {
      const db = this._getDb();
      const year = taxYear || (new Date().getFullYear() - 1);

      // Get payee data
      const payee = await db.getPayeeById(userId, payeeId);
      if (!payee) {
        return { success: false, error: 'Payee not found' };
      }

      // Get company data
      let company = null;
      if (companyId) {
        company = await db.getCompanyById(userId, companyId);
      } else if (payee.companyId) {
        company = await db.getCompanyById(userId, payee.companyId);
      }

      if (!company) {
        const companies = await db.getCompanies(userId);
        company = companies.find(c => c.isDefault) || companies[0];
      }

      // Get transactions for this payee in the tax year
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);
      
      const transactions = await db.getTransactions(userId, {
        payeeId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        type: 'expense'
      });

      // Calculate total paid
      const totalPaid = transactions.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

      const preview = this.form1099NECGenerator.preview(
        company,
        payee,
        { amount: totalPaid }
      );

      return {
        success: true,
        ...preview,
        payeeId,
        companyId: company?.id,
        transactionCount: transactions.length,
        meetsThreshold: totalPaid >= FORM_1099_THRESHOLD
      };

    } catch (error) {
      logger.error('Error previewing 1099-NEC:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate 1099-NEC PDF for a payee
   * @param {string} userId - User ID
   * @param {string} payeeId - Payee ID
   * @param {string} companyId - Company ID (optional)
   * @param {number} taxYear - Tax year (optional)
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generated PDF data
   */
  async generate1099NEC(userId, payeeId, companyId = null, taxYear = null, options = {}) {
    try {
      const db = this._getDb();
      const year = taxYear || (new Date().getFullYear() - 1);

      // Get payee and company data
      const payee = await db.getPayeeById(userId, payeeId);
      if (!payee) {
        return { success: false, errors: ['Payee not found'] };
      }

      let company = null;
      if (companyId) {
        company = await db.getCompanyById(userId, companyId);
      } else if (payee.companyId) {
        company = await db.getCompanyById(userId, payee.companyId);
      }

      if (!company) {
        const companies = await db.getCompanies(userId);
        company = companies.find(c => c.isDefault) || companies[0];
      }

      if (!company) {
        return { success: false, errors: ['No company found for tax form'] };
      }

      // Get transactions
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);
      
      const transactions = await db.getTransactions(userId, {
        payeeId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        type: 'expense'
      });

      const totalPaid = transactions.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

      // Generate the form
      const result = await this.form1099NECGenerator.generate(
        company,
        payee,
        { 
          amount: totalPaid,
          federalWithholding: payee.taxFormInfo?.federalWithholding || 0,
          stateTaxInfo: payee.taxFormInfo?.stateTaxInfo || []
        },
        options
      );

      return result;

    } catch (error) {
      logger.error('Error generating 1099-NEC:', error);
      return { success: false, errors: [error.message] };
    }
  }

  /**
   * Bulk generate 1099-NEC forms for all eligible contractors
   * @param {string} userId - User ID
   * @param {string} companyId - Company ID
   * @param {number} taxYear - Tax year
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Bulk generation results
   */
  async bulkGenerate1099NEC(userId, companyId, taxYear = null, options = {}) {
    try {
      const db = this._getDb();
      const year = taxYear || (new Date().getFullYear() - 1);

      // Get all contractors/vendors with payments >= $600
      const payees = await db.getPayees(userId, { 
        type: 'contractor',
        companyId 
      });

      const results = {
        success: true,
        taxYear: year,
        generated: [],
        skipped: [],
        errors: []
      };

      for (const payee of payees) {
        // Get YTD payments for this payee
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31);
        
        const transactions = await db.getTransactions(userId, {
          payeeId: payee.id,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          type: 'expense'
        });

        const totalPaid = transactions.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

        if (totalPaid < FORM_1099_THRESHOLD) {
          results.skipped.push({
            payeeId: payee.id,
            payeeName: payee.name,
            amount: totalPaid,
            reason: `Below $${FORM_1099_THRESHOLD} threshold`
          });
          continue;
        }

        // Generate form
        const formResult = await this.generate1099NEC(userId, payee.id, companyId, year, options);

        if (formResult.success) {
          results.generated.push({
            payeeId: payee.id,
            payeeName: payee.name,
            amount: totalPaid,
            fileName: formResult.fileName,
            buffer: formResult.buffer
          });
        } else {
          results.errors.push({
            payeeId: payee.id,
            payeeName: payee.name,
            errors: formResult.errors
          });
        }
      }

      results.summary = {
        total: payees.length,
        generated: results.generated.length,
        skipped: results.skipped.length,
        errors: results.errors.length
      };

      logger.info('Bulk 1099-NEC generation complete', results.summary);

      return results;

    } catch (error) {
      logger.error('Error in bulk 1099-NEC generation:', error);
      return { success: false, errors: [error.message] };
    }
  }

  // ==================== 1099-MISC Methods ====================

  /**
   * Preview 1099-MISC for a payee
   */
  async preview1099MISC(userId, payeeId, companyId = null, paymentData = {}) {
    try {
      const db = this._getDb();

      const payee = await db.getPayeeById(userId, payeeId);
      if (!payee) {
        return { success: false, error: 'Payee not found' };
      }

      let company = null;
      if (companyId) {
        company = await db.getCompanyById(userId, companyId);
      } else if (payee.companyId) {
        company = await db.getCompanyById(userId, payee.companyId);
      }

      const preview = this.form1099MISCGenerator.preview(company, payee, paymentData);

      return {
        success: true,
        ...preview,
        payeeId,
        companyId: company?.id
      };

    } catch (error) {
      logger.error('Error previewing 1099-MISC:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate 1099-MISC PDF
   */
  async generate1099MISC(userId, payeeId, companyId, paymentData, options = {}) {
    try {
      const db = this._getDb();

      const payee = await db.getPayeeById(userId, payeeId);
      if (!payee) {
        return { success: false, errors: ['Payee not found'] };
      }

      const company = await db.getCompanyById(userId, companyId);
      if (!company) {
        return { success: false, errors: ['Company not found'] };
      }

      return await this.form1099MISCGenerator.generate(company, payee, paymentData, options);

    } catch (error) {
      logger.error('Error generating 1099-MISC:', error);
      return { success: false, errors: [error.message] };
    }
  }

  // ==================== W-2 Methods ====================

  /**
   * Preview W-2 for an employee
   */
  async previewW2(userId, employeeId, companyId = null, wageData = null) {
    try {
      const db = this._getDb();
      const year = new Date().getFullYear() - 1;

      const employee = await db.getPayeeById(userId, employeeId);
      if (!employee || employee.type !== 'employee') {
        return { success: false, error: 'Employee not found' };
      }

      let company = null;
      if (companyId) {
        company = await db.getCompanyById(userId, companyId);
      } else if (employee.companyId) {
        company = await db.getCompanyById(userId, employee.companyId);
      }

      // If no wage data provided, calculate from transactions
      if (!wageData) {
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31);
        
        const transactions = await db.getTransactions(userId, {
          payeeId: employeeId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          type: 'expense'
        });

        const totalWages = transactions.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
        
        // Get tax info from payee record
        const taxInfo = employee.taxFormInfo || {};
        
        wageData = {
          wages: totalWages,
          federalWithholding: taxInfo.federalWithholding || 0,
          socialSecurityWages: taxInfo.socialSecurityWages || totalWages,
          socialSecurityTax: taxInfo.socialSecurityTax || 0,
          medicareWages: taxInfo.medicareWages || totalWages,
          medicareTax: taxInfo.medicareTax || 0,
          stateWithholding: taxInfo.stateWithholding || 0
        };
      }

      const preview = this.formW2Generator.preview(company, employee, wageData);

      return {
        success: true,
        ...preview,
        employeeId,
        companyId: company?.id
      };

    } catch (error) {
      logger.error('Error previewing W-2:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate W-2 PDF
   */
  async generateW2(userId, employeeId, companyId, wageData, options = {}) {
    try {
      const db = this._getDb();

      const employee = await db.getPayeeById(userId, employeeId);
      if (!employee) {
        return { success: false, errors: ['Employee not found'] };
      }

      const company = await db.getCompanyById(userId, companyId);
      if (!company) {
        return { success: false, errors: ['Company not found'] };
      }

      return await this.formW2Generator.generate(company, employee, wageData, options);

    } catch (error) {
      logger.error('Error generating W-2:', error);
      return { success: false, errors: [error.message] };
    }
  }

  /**
   * Bulk generate W-2 forms for all employees
   */
  async bulkGenerateW2(userId, companyId, taxYear = null, wageDataMap = {}, options = {}) {
    try {
      const db = this._getDb();
      const year = taxYear || (new Date().getFullYear() - 1);

      const employees = await db.getPayees(userId, { 
        type: 'employee',
        companyId 
      });

      const results = {
        success: true,
        taxYear: year,
        generated: [],
        skipped: [],
        errors: []
      };

      for (const employee of employees) {
        // Get wage data from map or calculate
        let wageData = wageDataMap[employee.id];

        if (!wageData) {
          // Calculate from transactions
          const startDate = new Date(year, 0, 1);
          const endDate = new Date(year, 11, 31);
          
          const transactions = await db.getTransactions(userId, {
            payeeId: employee.id,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            type: 'expense'
          });

          const totalWages = transactions.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

          if (totalWages === 0) {
            results.skipped.push({
              employeeId: employee.id,
              employeeName: employee.name,
              reason: 'No wages for tax year'
            });
            continue;
          }

          const taxInfo = employee.taxFormInfo || {};
          wageData = {
            wages: totalWages,
            federalWithholding: taxInfo.federalWithholding || 0,
            socialSecurityWages: taxInfo.socialSecurityWages || totalWages,
            socialSecurityTax: taxInfo.socialSecurityTax || 0,
            medicareWages: taxInfo.medicareWages || totalWages,
            medicareTax: taxInfo.medicareTax || 0
          };
        }

        const formResult = await this.generateW2(userId, employee.id, companyId, wageData, options);

        if (formResult.success) {
          results.generated.push({
            employeeId: employee.id,
            employeeName: employee.name,
            wages: wageData.wages,
            fileName: formResult.fileName,
            buffer: formResult.buffer
          });
        } else {
          results.errors.push({
            employeeId: employee.id,
            employeeName: employee.name,
            errors: formResult.errors
          });
        }
      }

      results.summary = {
        total: employees.length,
        generated: results.generated.length,
        skipped: results.skipped.length,
        errors: results.errors.length
      };

      logger.info('Bulk W-2 generation complete', results.summary);

      return results;

    } catch (error) {
      logger.error('Error in bulk W-2 generation:', error);
      return { success: false, errors: [error.message] };
    }
  }

  // ==================== Summary & Utility Methods ====================

  /**
   * Get tax form summary for a tax year
   */
  async getTaxFormSummary(userId, companyId, taxYear = null) {
    try {
      const db = this._getDb();
      const year = taxYear || (new Date().getFullYear() - 1);

      // Get all payees
      const payees = await db.getPayees(userId, { companyId });
      
      const contractors = payees.filter(p => p.type === 'contractor');
      const employees = payees.filter(p => p.type === 'employee');

      // Calculate 1099-NEC eligible
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);

      const eligible1099 = [];
      let total1099Amount = 0;

      for (const contractor of contractors) {
        const transactions = await db.getTransactions(userId, {
          payeeId: contractor.id,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          type: 'expense'
        });

        const totalPaid = transactions.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

        if (totalPaid >= FORM_1099_THRESHOLD) {
          eligible1099.push({
            payeeId: contractor.id,
            payeeName: contractor.name,
            amount: totalPaid,
            hasTaxId: !!contractor.taxId,
            hasAddress: !!(contractor.address?.street && contractor.address?.city)
          });
          total1099Amount += totalPaid;
        }
      }

      // Get employees with wages
      const employeesWithWages = [];
      let totalW2Wages = 0;

      for (const employee of employees) {
        const transactions = await db.getTransactions(userId, {
          payeeId: employee.id,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          type: 'expense'
        });

        const totalWages = transactions.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

        if (totalWages > 0) {
          employeesWithWages.push({
            employeeId: employee.id,
            employeeName: employee.name,
            wages: totalWages,
            hasTaxId: !!employee.taxId,
            hasAddress: !!(employee.address?.street && employee.address?.city)
          });
          totalW2Wages += totalWages;
        }
      }

      return {
        success: true,
        taxYear: year,
        form1099NEC: {
          eligible: eligible1099.length,
          totalAmount: total1099Amount,
          payees: eligible1099,
          threshold: FORM_1099_THRESHOLD
        },
        formW2: {
          employees: employeesWithWages.length,
          totalWages: totalW2Wages,
          payees: employeesWithWages
        },
        missingInfo: {
          form1099NEC: eligible1099.filter(p => !p.hasTaxId || !p.hasAddress),
          formW2: employeesWithWages.filter(p => !p.hasTaxId || !p.hasAddress)
        },
        deadlines: {
          form1099NEC: `January 31, ${year + 1}`,
          formW2: `January 31, ${year + 1}`
        }
      };

    } catch (error) {
      logger.error('Error getting tax form summary:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get payees with missing tax form information
   */
  async getMissingInfo(userId, companyId = null, formType = null) {
    try {
      const db = this._getDb();
      
      const filters = { companyId };
      if (formType === '1099-NEC') {
        filters.type = 'contractor';
      } else if (formType === 'W-2') {
        filters.type = 'employee';
      }

      const payees = await db.getPayees(userId, filters);
      const missing = getPayeesMissingInfo(payees, formType);

      return {
        success: true,
        formType,
        totalPayees: payees.length,
        missingCount: missing.length,
        payees: missing
      };

    } catch (error) {
      logger.error('Error getting missing info:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
const taxFormService = new TaxFormService();
export default taxFormService;
