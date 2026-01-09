/**
 * Form W-2 Generator
 * 
 * Generates IRS Form W-2 (Wage and Tax Statement) PDFs
 * Uses pdf-lib to fill official IRS form templates
 * 
 * @author BookkeepingApp Team
 */

import { PDFDocument } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { FORM_W2_FIELDS } from './formFieldMappings.js';
import { 
  validateEIN, 
  validateSSN, 
  formatTaxAmount, 
  formatCityStateZip,
  validateW2Data 
} from './taxFormValidation.js';
import { logger } from '../../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Social Security wage base for 2024 (update annually)
const SS_WAGE_CAP = 168600;
const SS_TAX_RATE = 0.062;
const MEDICARE_TAX_RATE = 0.0145;

/**
 * Form W-2 PDF Generator
 */
export class FormW2Generator {
  constructor() {
    this.templatePath = path.join(__dirname, 'templates', 'fw2.pdf');
    this.formYear = new Date().getFullYear() - 1;
    this.ssWageCap = SS_WAGE_CAP;
  }

  /**
   * Generate a W-2 PDF
   * @param {Object} employerInfo - Company/employer information
   * @param {Object} employeeInfo - Employee information
   * @param {Object} wageData - Wage and withholding data
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generated PDF data
   */
  async generate(employerInfo, employeeInfo, wageData, options = {}) {
    try {
      // Validate input data
      const validation = validateW2Data(employerInfo, employeeInfo, wageData);
      if (!validation.isValid && !options.ignoreErrors) {
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings
        };
      }

      // Load PDF template
      let pdfBytes;
      try {
        pdfBytes = await fs.readFile(this.templatePath);
      } catch (error) {
        logger.error('Failed to load W-2 template:', error);
        return {
          success: false,
          errors: ['W-2 template not found. Run download-irs-forms.js first.']
        };
      }

      const pdfDoc = await PDFDocument.load(pdfBytes);
      const form = pdfDoc.getForm();

      // Fill form fields
      this._fillEmployerFields(form, employerInfo);
      this._fillEmployeeFields(form, employeeInfo);
      this._fillWageFields(form, wageData);
      this._fillStateLocalFields(form, wageData, employerInfo);

      if (options.flatten !== false) {
        form.flatten();
      }

      const generatedBytes = await pdfDoc.save();

      const employeeName = this._getEmployeeName(employeeInfo);
      const safeName = employeeName.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `W-2_${this.formYear}_${safeName}.pdf`;

      logger.info(`Generated W-2 for ${employeeName}`, {
        wages: wageData.wages,
        taxYear: this.formYear
      });

      return {
        success: true,
        buffer: Buffer.from(generatedBytes),
        fileName,
        contentType: 'application/pdf',
        size: generatedBytes.length,
        formType: 'W-2',
        taxYear: this.formYear,
        employeeName,
        wages: wageData.wages,
        warnings: validation.warnings
      };

    } catch (error) {
      logger.error('Error generating W-2:', error);
      return {
        success: false,
        errors: [`Failed to generate W-2: ${error.message}`]
      };
    }
  }

  /**
   * Preview W-2 data without generating PDF
   * @param {Object} employerInfo - Company/employer information
   * @param {Object} employeeInfo - Employee information
   * @param {Object} wageData - Wage and withholding data
   * @returns {Object} Preview data and validation results
   */
  preview(employerInfo, employeeInfo, wageData) {
    const validation = validateW2Data(employerInfo, employeeInfo, wageData);

    return {
      formType: 'W-2',
      taxYear: this.formYear,
      isValid: validation.isValid,
      errors: validation.errors,
      warnings: validation.warnings,
      data: {
        employer: {
          name: employerInfo?.legalName || employerInfo?.name || '',
          address: employerInfo?.address?.street || '',
          cityStateZip: formatCityStateZip(employerInfo?.address),
          ein: this._maskTaxId(employerInfo?.taxId, 'EIN')
        },
        employee: {
          name: this._getEmployeeName(employeeInfo),
          address: employeeInfo?.address?.street || '',
          cityStateZip: formatCityStateZip(employeeInfo?.address),
          ssn: this._maskTaxId(employeeInfo?.taxId, 'SSN')
        },
        boxes: {
          box1_wages: formatTaxAmount(wageData?.wages || 0),
          box2_fedWithheld: formatTaxAmount(wageData?.federalWithholding || 0),
          box3_ssWages: formatTaxAmount(Math.min(wageData?.socialSecurityWages || wageData?.wages || 0, this.ssWageCap)),
          box4_ssTax: formatTaxAmount(wageData?.socialSecurityTax || 0),
          box5_medicareWages: formatTaxAmount(wageData?.medicareWages || wageData?.wages || 0),
          box6_medicareTax: formatTaxAmount(wageData?.medicareTax || 0)
        }
      }
    };
  }

  /**
   * Calculate withholding taxes from wages (helper method)
   * @param {number} wages - Total wages
   * @returns {Object} Calculated tax amounts
   */
  calculateTaxes(wages) {
    const ssWages = Math.min(wages, this.ssWageCap);
    const ssTax = ssWages * SS_TAX_RATE;
    const medicareTax = wages * MEDICARE_TAX_RATE;

    return {
      socialSecurityWages: ssWages,
      socialSecurityTax: Math.round(ssTax * 100) / 100,
      medicareWages: wages,
      medicareTax: Math.round(medicareTax * 100) / 100
    };
  }

  /**
   * Fill employer fields
   * @private
   */
  _fillEmployerFields(form, employerInfo) {
    const fields = FORM_W2_FIELDS;
    
    const setFieldSafe = (fieldName, value) => {
      try {
        const field = form.getTextField(fieldName);
        if (field && value) {
          field.setText(String(value));
        }
      } catch (e) {
        logger.debug(`Field ${fieldName} not found in form`);
      }
    };

    // Box b - Employer EIN
    const einResult = validateEIN(employerInfo.taxId);
    if (einResult.isValid) {
      setFieldSafe(fields.employerEIN, einResult.formatted);
    }

    // Box c - Employer name and address (combined)
    const employerNameAddr = [
      employerInfo.legalName || employerInfo.name,
      employerInfo.address?.street,
      formatCityStateZip(employerInfo.address)
    ].filter(Boolean).join('\n');
    setFieldSafe(fields.employerNameAddr, employerNameAddr);

    // Box d - Control number (optional)
    if (employerInfo.payerInfo?.controlNumber) {
      setFieldSafe(fields.controlNumber, employerInfo.payerInfo.controlNumber);
    }
  }

  /**
   * Fill employee fields
   * @private
   */
  _fillEmployeeFields(form, employeeInfo) {
    const fields = FORM_W2_FIELDS;
    
    const setFieldSafe = (fieldName, value) => {
      try {
        const field = form.getTextField(fieldName);
        if (field && value) {
          field.setText(String(value));
        }
      } catch (e) {
        logger.debug(`Field ${fieldName} not found in form`);
      }
    };

    // Box a - Employee SSN
    const ssnResult = validateSSN(employeeInfo.taxId);
    if (ssnResult.isValid) {
      setFieldSafe(fields.employeeSSN, ssnResult.formatted);
    }

    // Box e - Employee name (separate first/last if available)
    if (employeeInfo.taxFormInfo?.firstName || employeeInfo.taxFormInfo?.lastName) {
      setFieldSafe(fields.employeeFirstName, employeeInfo.taxFormInfo.firstName);
      setFieldSafe(fields.employeeLastName, employeeInfo.taxFormInfo.lastName);
      if (employeeInfo.taxFormInfo?.suffix) {
        setFieldSafe(fields.employeeSuffix, employeeInfo.taxFormInfo.suffix);
      }
    } else {
      // Use full name in first name field
      setFieldSafe(fields.employeeFirstName, employeeInfo.name);
    }

    // Box f - Employee address
    const employeeAddr = [
      employeeInfo.address?.street,
      formatCityStateZip(employeeInfo.address)
    ].filter(Boolean).join('\n');
    setFieldSafe(fields.employeeAddr, employeeAddr);
  }

  /**
   * Fill wage and tax fields
   * @private
   */
  _fillWageFields(form, wageData) {
    const fields = FORM_W2_FIELDS;
    
    const setFieldSafe = (fieldName, value) => {
      try {
        const field = form.getTextField(fieldName);
        if (field) {
          field.setText(String(value));
        }
      } catch (e) {
        logger.debug(`Field ${fieldName} not found in form`);
      }
    };

    // Box 1 - Wages, tips, other compensation
    setFieldSafe(fields.box1_wagesTips, formatTaxAmount(wageData.wages));

    // Box 2 - Federal income tax withheld
    if (wageData.federalWithholding > 0) {
      setFieldSafe(fields.box2_federalWithheld, formatTaxAmount(wageData.federalWithholding));
    }

    // Box 3 - Social security wages (capped)
    const ssWages = wageData.socialSecurityWages || Math.min(wageData.wages, this.ssWageCap);
    setFieldSafe(fields.box3_socialSecurityWages, formatTaxAmount(ssWages));

    // Box 4 - Social security tax withheld
    const ssTax = wageData.socialSecurityTax || (ssWages * SS_TAX_RATE);
    setFieldSafe(fields.box4_socialSecurityTax, formatTaxAmount(ssTax));

    // Box 5 - Medicare wages and tips
    const medicareWages = wageData.medicareWages || wageData.wages;
    setFieldSafe(fields.box5_medicareWages, formatTaxAmount(medicareWages));

    // Box 6 - Medicare tax withheld
    const medicareTax = wageData.medicareTax || (medicareWages * MEDICARE_TAX_RATE);
    setFieldSafe(fields.box6_medicareTax, formatTaxAmount(medicareTax));

    // Box 7 - Social security tips (if any)
    if (wageData.socialSecurityTips > 0) {
      setFieldSafe(fields.box7_socialSecurityTips, formatTaxAmount(wageData.socialSecurityTips));
    }

    // Box 8 - Allocated tips (if any)
    if (wageData.allocatedTips > 0) {
      setFieldSafe(fields.box8_allocatedTips, formatTaxAmount(wageData.allocatedTips));
    }

    // Box 10 - Dependent care benefits (if any)
    if (wageData.dependentCareBenefits > 0) {
      setFieldSafe(fields.box10_dependentCareBenefits, formatTaxAmount(wageData.dependentCareBenefits));
    }

    // Box 11 - Nonqualified plans (if any)
    if (wageData.nonqualifiedPlans > 0) {
      setFieldSafe(fields.box11_nonqualifiedPlans, formatTaxAmount(wageData.nonqualifiedPlans));
    }
  }

  /**
   * Fill state and local tax fields
   * @private
   */
  _fillStateLocalFields(form, wageData, employerInfo) {
    const fields = FORM_W2_FIELDS;
    
    const setFieldSafe = (fieldName, value) => {
      try {
        const field = form.getTextField(fieldName);
        if (field && value) {
          field.setText(String(value));
        }
      } catch (e) {
        logger.debug(`Field ${fieldName} not found in form`);
      }
    };

    // State tax info from wage data or employer
    const stateTaxInfo = wageData.stateTaxInfo || [];
    
    if (stateTaxInfo[0]) {
      const state1 = stateTaxInfo[0];
      setFieldSafe(fields.box15_state, state1.stateCode);
      setFieldSafe(fields.box15_stateId, employerInfo.payerInfo?.stateId || '');
      setFieldSafe(fields.box16_stateWages, formatTaxAmount(state1.stateIncome || wageData.wages));
      setFieldSafe(fields.box17_stateTax, formatTaxAmount(state1.stateTaxWithheld || 0));
    }

    // Local tax info
    if (wageData.localTaxInfo?.[0]) {
      const local1 = wageData.localTaxInfo[0];
      setFieldSafe(fields.box18_localWages, formatTaxAmount(local1.localWages || 0));
      setFieldSafe(fields.box19_localTax, formatTaxAmount(local1.localTax || 0));
      setFieldSafe(fields.box20_localityName, local1.localityName || '');
    }
  }

  /**
   * Get employee name (prefer separate first/last)
   * @private
   */
  _getEmployeeName(employeeInfo) {
    if (employeeInfo?.taxFormInfo?.firstName && employeeInfo?.taxFormInfo?.lastName) {
      const mi = employeeInfo.taxFormInfo.middleInitial ? ` ${employeeInfo.taxFormInfo.middleInitial}` : '';
      const suffix = employeeInfo.taxFormInfo.suffix ? ` ${employeeInfo.taxFormInfo.suffix}` : '';
      return `${employeeInfo.taxFormInfo.firstName}${mi} ${employeeInfo.taxFormInfo.lastName}${suffix}`;
    }
    return employeeInfo?.name || 'Unknown Employee';
  }

  /**
   * Mask tax ID for display
   * @private
   */
  _maskTaxId(taxId, type) {
    if (!taxId) return 'Not provided';
    const cleaned = taxId.replace(/[-\s]/g, '');
    if (cleaned.length < 4) return '***';
    const last4 = cleaned.slice(-4);
    return type === 'EIN' ? `**-***${last4}` : `***-**-${last4}`;
  }
}

export default FormW2Generator;
