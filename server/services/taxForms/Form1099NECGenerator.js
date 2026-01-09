/**
 * Form 1099-NEC Generator
 * 
 * Generates IRS Form 1099-NEC (Nonemployee Compensation) PDFs
 * Uses pdf-lib to fill official IRS form templates
 * 
 * @author BookkeepingApp Team
 */

import { PDFDocument } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { FORM_1099_NEC_FIELDS } from './formFieldMappings.js';
import { 
  validateEIN, 
  validateTaxId, 
  formatTaxAmount, 
  formatCityStateZip,
  validate1099NECData 
} from './taxFormValidation.js';
import { logger } from '../../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Form 1099-NEC PDF Generator
 */
export class Form1099NECGenerator {
  constructor() {
    this.templatePath = path.join(__dirname, 'templates', 'f1099nec.pdf');
    this.formYear = new Date().getFullYear() - 1; // Tax year is previous year
  }

  /**
   * Generate a 1099-NEC PDF
   * @param {Object} payerInfo - Company/payer information
   * @param {Object} recipientInfo - Contractor/recipient information
   * @param {Object} paymentData - Payment amount and details
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generated PDF data
   */
  async generate(payerInfo, recipientInfo, paymentData, options = {}) {
    try {
      // Validate input data
      const validation = validate1099NECData(payerInfo, recipientInfo, paymentData);
      if (!validation.isValid && !options.ignoreErrors) {
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings
        };
      }

      // Load the PDF template
      let pdfBytes;
      try {
        pdfBytes = await fs.readFile(this.templatePath);
      } catch (error) {
        logger.error('Failed to load 1099-NEC template:', error);
        return {
          success: false,
          errors: ['1099-NEC template not found. Run download-irs-forms.js first.']
        };
      }

      // Load PDF document
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const form = pdfDoc.getForm();

      // Fill payer information
      this._fillPayerFields(form, payerInfo);

      // Fill recipient information
      this._fillRecipientFields(form, recipientInfo);

      // Fill payment boxes
      this._fillPaymentFields(form, paymentData);

      // Add state tax information if provided
      if (paymentData.stateTaxInfo && paymentData.stateTaxInfo.length > 0) {
        this._fillStateFields(form, paymentData.stateTaxInfo, payerInfo);
      }

      // Flatten form if requested (makes it non-editable)
      if (options.flatten !== false) {
        form.flatten();
      }

      // Generate PDF bytes
      const generatedBytes = await pdfDoc.save();

      // Create filename
      const recipientName = recipientInfo.name || 'Unknown';
      const safeName = recipientName.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `1099-NEC_${this.formYear}_${safeName}.pdf`;

      logger.info(`Generated 1099-NEC for ${recipientName}`, {
        amount: paymentData.amount,
        taxYear: this.formYear
      });

      return {
        success: true,
        buffer: Buffer.from(generatedBytes),
        fileName,
        contentType: 'application/pdf',
        size: generatedBytes.length,
        formType: '1099-NEC',
        taxYear: this.formYear,
        recipientName,
        amount: paymentData.amount,
        warnings: validation.warnings
      };

    } catch (error) {
      logger.error('Error generating 1099-NEC:', error);
      return {
        success: false,
        errors: [`Failed to generate 1099-NEC: ${error.message}`]
      };
    }
  }

  /**
   * Preview 1099-NEC data without generating PDF
   * @param {Object} payerInfo - Company/payer information
   * @param {Object} recipientInfo - Contractor/recipient information
   * @param {Object} paymentData - Payment amount and details
   * @returns {Object} Preview data and validation results
   */
  preview(payerInfo, recipientInfo, paymentData) {
    const validation = validate1099NECData(payerInfo, recipientInfo, paymentData);
    
    // Format EIN/TIN for display (masked)
    const maskedPayerEIN = this._maskTaxId(payerInfo?.taxId, 'EIN');
    const maskedRecipientTIN = this._maskTaxId(recipientInfo?.taxId, recipientInfo?.taxIdType);

    return {
      formType: '1099-NEC',
      taxYear: this.formYear,
      isValid: validation.isValid,
      errors: validation.errors,
      warnings: validation.warnings,
      data: {
        payer: {
          name: payerInfo?.legalName || payerInfo?.name || '',
          address: payerInfo?.address?.street || '',
          cityStateZip: formatCityStateZip(payerInfo?.address),
          phone: payerInfo?.phone || '',
          tin: maskedPayerEIN
        },
        recipient: {
          name: recipientInfo?.name || '',
          address: recipientInfo?.address?.street || '',
          cityStateZip: formatCityStateZip(recipientInfo?.address),
          tin: maskedRecipientTIN,
          accountNumber: recipientInfo?.taxFormInfo?.accountNumber || ''
        },
        boxes: {
          box1: formatTaxAmount(paymentData?.amount || 0),
          box4: formatTaxAmount(paymentData?.federalWithholding || 0)
        }
      }
    };
  }

  /**
   * Fill payer fields on the form
   * @private
   */
  _fillPayerFields(form, payerInfo) {
    const fields = FORM_1099_NEC_FIELDS;
    
    // Try to get field, ignore if not found (form versions vary)
    const setFieldSafe = (fieldName, value) => {
      try {
        const field = form.getTextField(fieldName);
        if (field && value) {
          field.setText(String(value));
        }
      } catch (e) {
        // Field not found in this form version
        logger.debug(`Field ${fieldName} not found in form`);
      }
    };

    // Payer name (company legal name)
    setFieldSafe(fields.payerName, payerInfo.legalName || payerInfo.name);

    // Payer street address
    setFieldSafe(fields.payerStreet, payerInfo.address?.street);

    // Payer city, state, zip
    setFieldSafe(fields.payerCity, formatCityStateZip(payerInfo.address));

    // Payer phone
    setFieldSafe(fields.payerPhone, payerInfo.phone);

    // Payer TIN (EIN)
    const einResult = validateEIN(payerInfo.taxId);
    if (einResult.isValid) {
      setFieldSafe(fields.payerTIN, einResult.formatted);
    }
  }

  /**
   * Fill recipient fields on the form
   * @private
   */
  _fillRecipientFields(form, recipientInfo) {
    const fields = FORM_1099_NEC_FIELDS;
    
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

    // Recipient TIN (SSN or EIN)
    const tinResult = validateTaxId(recipientInfo.taxId, recipientInfo.taxIdType || 'SSN');
    if (tinResult.isValid) {
      setFieldSafe(fields.recipientTIN, tinResult.formatted);
    }

    // Recipient name
    setFieldSafe(fields.recipientName, recipientInfo.businessName || recipientInfo.name);

    // Recipient street address
    setFieldSafe(fields.recipientStreet, recipientInfo.address?.street);

    // Recipient city, state, zip
    setFieldSafe(fields.recipientCity, formatCityStateZip(recipientInfo.address));

    // Account number (if provided)
    if (recipientInfo.taxFormInfo?.accountNumber) {
      setFieldSafe(fields.accountNumber, recipientInfo.taxFormInfo.accountNumber);
    }
  }

  /**
   * Fill payment amount fields
   * @private
   */
  _fillPaymentFields(form, paymentData) {
    const fields = FORM_1099_NEC_FIELDS;
    
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

    // Box 1 - Nonemployee compensation
    setFieldSafe(fields.box1_nonemployeeCompensation, formatTaxAmount(paymentData.amount));

    // Box 4 - Federal income tax withheld (if any)
    if (paymentData.federalWithholding && paymentData.federalWithholding > 0) {
      setFieldSafe(fields.box4_federalWithheld, formatTaxAmount(paymentData.federalWithholding));
    }
  }

  /**
   * Fill state tax information fields
   * @private
   */
  _fillStateFields(form, stateTaxInfo, payerInfo) {
    const fields = FORM_1099_NEC_FIELDS;
    
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

    // First state entry
    if (stateTaxInfo[0]) {
      const state1 = stateTaxInfo[0];
      const stateId = payerInfo.payerInfo?.stateId || payerInfo.payerInfo?.stateRegistrations?.[0]?.stateEmployerId || '';
      
      setFieldSafe(fields.box5_statePayerNumber, `${state1.stateCode || ''} ${stateId}`.trim());
      setFieldSafe(fields.box6_stateIncome, formatTaxAmount(state1.stateIncome || 0));
      setFieldSafe(fields.box7_stateTaxWithheld, formatTaxAmount(state1.stateTaxWithheld || 0));
    }

    // Second state entry (if applicable)
    if (stateTaxInfo[1]) {
      const state2 = stateTaxInfo[1];
      const stateId2 = payerInfo.payerInfo?.stateRegistrations?.[1]?.stateEmployerId || '';
      
      setFieldSafe(fields.box5_statePayerNumber2, `${state2.stateCode || ''} ${stateId2}`.trim());
      setFieldSafe(fields.box6_stateIncome2, formatTaxAmount(state2.stateIncome || 0));
      setFieldSafe(fields.box7_stateTaxWithheld2, formatTaxAmount(state2.stateTaxWithheld || 0));
    }
  }

  /**
   * Mask tax ID for display (show last 4 only)
   * @private
   */
  _maskTaxId(taxId, type) {
    if (!taxId) return 'Not provided';
    
    const cleaned = taxId.replace(/[-\s]/g, '');
    if (cleaned.length < 4) return '***';
    
    const last4 = cleaned.slice(-4);
    
    if (type === 'EIN') {
      return `**-***${last4}`;
    }
    return `***-**-${last4}`;
  }
}

export default Form1099NECGenerator;
