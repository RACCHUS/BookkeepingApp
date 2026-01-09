/**
 * Form 1099-MISC Generator
 * 
 * Generates IRS Form 1099-MISC (Miscellaneous Income) PDFs
 * Uses pdf-lib to fill official IRS form templates
 * 
 * @author BookkeepingApp Team
 */

import { PDFDocument } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { FORM_1099_MISC_FIELDS } from './formFieldMappings.js';
import { 
  validateEIN, 
  validateTaxId, 
  formatTaxAmount, 
  formatCityStateZip 
} from './taxFormValidation.js';
import { logger } from '../../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Form 1099-MISC PDF Generator
 */
export class Form1099MISCGenerator {
  constructor() {
    this.templatePath = path.join(__dirname, 'templates', 'f1099msc.pdf');
    this.formYear = new Date().getFullYear() - 1;
  }

  /**
   * Generate a 1099-MISC PDF
   * @param {Object} payerInfo - Company/payer information
   * @param {Object} recipientInfo - Recipient information
   * @param {Object} paymentData - Payment amounts by category
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generated PDF data
   */
  async generate(payerInfo, recipientInfo, paymentData, options = {}) {
    try {
      // Validate required data
      const errors = [];
      const warnings = [];

      if (!payerInfo?.taxId) {
        errors.push('Payer EIN is required');
      }
      if (!recipientInfo?.taxId) {
        errors.push('Recipient Tax ID is required');
      }

      // Check for at least one amount box with value
      const hasAmount = [
        paymentData?.rents,
        paymentData?.royalties,
        paymentData?.otherIncome,
        paymentData?.medicalPayments,
        paymentData?.grossProceeds
      ].some(val => val && val > 0);

      if (!hasAmount) {
        errors.push('At least one payment amount is required');
      }

      if (errors.length > 0 && !options.ignoreErrors) {
        return { success: false, errors, warnings };
      }

      // Load PDF template
      let pdfBytes;
      try {
        pdfBytes = await fs.readFile(this.templatePath);
      } catch (error) {
        logger.error('Failed to load 1099-MISC template:', error);
        return {
          success: false,
          errors: ['1099-MISC template not found. Run download-irs-forms.js first.']
        };
      }

      const pdfDoc = await PDFDocument.load(pdfBytes);
      const form = pdfDoc.getForm();

      // Fill form fields
      this._fillPayerFields(form, payerInfo);
      this._fillRecipientFields(form, recipientInfo);
      this._fillPaymentFields(form, paymentData);

      if (options.flatten !== false) {
        form.flatten();
      }

      const generatedBytes = await pdfDoc.save();

      const recipientName = recipientInfo.name || 'Unknown';
      const safeName = recipientName.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `1099-MISC_${this.formYear}_${safeName}.pdf`;

      // Calculate total amount for logging
      const totalAmount = (paymentData?.rents || 0) + 
                         (paymentData?.royalties || 0) + 
                         (paymentData?.otherIncome || 0) +
                         (paymentData?.medicalPayments || 0);

      logger.info(`Generated 1099-MISC for ${recipientName}`, {
        totalAmount,
        taxYear: this.formYear
      });

      return {
        success: true,
        buffer: Buffer.from(generatedBytes),
        fileName,
        contentType: 'application/pdf',
        size: generatedBytes.length,
        formType: '1099-MISC',
        taxYear: this.formYear,
        recipientName,
        totalAmount,
        warnings
      };

    } catch (error) {
      logger.error('Error generating 1099-MISC:', error);
      return {
        success: false,
        errors: [`Failed to generate 1099-MISC: ${error.message}`]
      };
    }
  }

  /**
   * Preview 1099-MISC data without generating PDF
   * @param {Object} payerInfo - Company/payer information
   * @param {Object} recipientInfo - Recipient information
   * @param {Object} paymentData - Payment amounts by category
   * @returns {Object} Preview data
   */
  preview(payerInfo, recipientInfo, paymentData) {
    const errors = [];
    const warnings = [];

    if (!payerInfo?.taxId) errors.push('Payer EIN is required');
    if (!recipientInfo?.taxId) errors.push('Recipient Tax ID is required');

    return {
      formType: '1099-MISC',
      taxYear: this.formYear,
      isValid: errors.length === 0,
      errors,
      warnings,
      data: {
        payer: {
          name: payerInfo?.legalName || payerInfo?.name || '',
          address: payerInfo?.address?.street || '',
          cityStateZip: formatCityStateZip(payerInfo?.address),
          tin: this._maskTaxId(payerInfo?.taxId, 'EIN')
        },
        recipient: {
          name: recipientInfo?.name || '',
          address: recipientInfo?.address?.street || '',
          cityStateZip: formatCityStateZip(recipientInfo?.address),
          tin: this._maskTaxId(recipientInfo?.taxId, recipientInfo?.taxIdType)
        },
        boxes: {
          box1_rents: formatTaxAmount(paymentData?.rents || 0),
          box2_royalties: formatTaxAmount(paymentData?.royalties || 0),
          box3_otherIncome: formatTaxAmount(paymentData?.otherIncome || 0),
          box4_federalWithheld: formatTaxAmount(paymentData?.federalWithholding || 0),
          box6_medicalPayments: formatTaxAmount(paymentData?.medicalPayments || 0),
          box10_grossProceeds: formatTaxAmount(paymentData?.grossProceeds || 0)
        }
      }
    };
  }

  /**
   * Fill payer fields
   * @private
   */
  _fillPayerFields(form, payerInfo) {
    const fields = FORM_1099_MISC_FIELDS;
    
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

    setFieldSafe(fields.payerName, payerInfo.legalName || payerInfo.name);
    setFieldSafe(fields.payerStreet, payerInfo.address?.street);
    setFieldSafe(fields.payerCity, formatCityStateZip(payerInfo.address));
    setFieldSafe(fields.payerPhone, payerInfo.phone);

    const einResult = validateEIN(payerInfo.taxId);
    if (einResult.isValid) {
      setFieldSafe(fields.payerTIN, einResult.formatted);
    }
  }

  /**
   * Fill recipient fields
   * @private
   */
  _fillRecipientFields(form, recipientInfo) {
    const fields = FORM_1099_MISC_FIELDS;
    
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

    const tinResult = validateTaxId(recipientInfo.taxId, recipientInfo.taxIdType || 'SSN');
    if (tinResult.isValid) {
      setFieldSafe(fields.recipientTIN, tinResult.formatted);
    }

    setFieldSafe(fields.recipientName, recipientInfo.businessName || recipientInfo.name);
    setFieldSafe(fields.recipientStreet, recipientInfo.address?.street);
    setFieldSafe(fields.recipientCity, formatCityStateZip(recipientInfo.address));

    if (recipientInfo.taxFormInfo?.accountNumber) {
      setFieldSafe(fields.accountNumber, recipientInfo.taxFormInfo.accountNumber);
    }
  }

  /**
   * Fill payment amount fields
   * @private
   */
  _fillPaymentFields(form, paymentData) {
    const fields = FORM_1099_MISC_FIELDS;
    
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

    // Amount boxes
    if (paymentData.rents > 0) {
      setFieldSafe(fields.box1_rents, formatTaxAmount(paymentData.rents));
    }
    if (paymentData.royalties > 0) {
      setFieldSafe(fields.box2_royalties, formatTaxAmount(paymentData.royalties));
    }
    if (paymentData.otherIncome > 0) {
      setFieldSafe(fields.box3_otherIncome, formatTaxAmount(paymentData.otherIncome));
    }
    if (paymentData.federalWithholding > 0) {
      setFieldSafe(fields.box4_federalWithheld, formatTaxAmount(paymentData.federalWithholding));
    }
    if (paymentData.medicalPayments > 0) {
      setFieldSafe(fields.box6_medicalPayments, formatTaxAmount(paymentData.medicalPayments));
    }
    if (paymentData.grossProceeds > 0) {
      setFieldSafe(fields.box10_grossProceeds, formatTaxAmount(paymentData.grossProceeds));
    }
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

export default Form1099MISCGenerator;
