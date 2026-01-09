/**
 * Tax Form Validation Utilities
 * 
 * Provides validation functions for tax form data including:
 * - SSN/EIN format validation
 * - Required field checks
 * - Amount validation
 * - Address completeness checks
 * 
 * @author BookkeepingApp Team
 */

/**
 * Validate SSN format (XXX-XX-XXXX)
 * @param {string} ssn - Social Security Number
 * @returns {Object} { isValid, formatted, error }
 */
export function validateSSN(ssn) {
  if (!ssn) {
    return { isValid: false, formatted: null, error: 'SSN is required' };
  }
  
  // Remove any existing dashes or spaces
  const cleaned = ssn.replace(/[-\s]/g, '');
  
  // Check if 9 digits
  if (!/^\d{9}$/.test(cleaned)) {
    return { isValid: false, formatted: null, error: 'SSN must be 9 digits' };
  }
  
  // Check for obviously invalid SSNs
  const firstThree = parseInt(cleaned.substring(0, 3));
  if (firstThree === 0 || firstThree === 666 || firstThree >= 900) {
    return { isValid: false, formatted: null, error: 'Invalid SSN area number' };
  }
  
  // Format as XXX-XX-XXXX
  const formatted = `${cleaned.substring(0, 3)}-${cleaned.substring(3, 5)}-${cleaned.substring(5, 9)}`;
  
  return { isValid: true, formatted, error: null };
}

/**
 * Validate EIN format (XX-XXXXXXX)
 * @param {string} ein - Employer Identification Number
 * @returns {Object} { isValid, formatted, error }
 */
export function validateEIN(ein) {
  if (!ein) {
    return { isValid: false, formatted: null, error: 'EIN is required' };
  }
  
  // Remove any existing dashes or spaces
  const cleaned = ein.replace(/[-\s]/g, '');
  
  // Check if 9 digits
  if (!/^\d{9}$/.test(cleaned)) {
    return { isValid: false, formatted: null, error: 'EIN must be 9 digits' };
  }
  
  // Valid EIN prefixes (by IRS assignment)
  const validPrefixes = [
    '10', '12', '60', '67', '50', '53', '01', '02', '03', '04', '05', '06', '11',
    '13', '14', '15', '16', '20', '21', '22', '23', '24', '25', '26', '27', '30',
    '31', '32', '33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '43',
    '44', '45', '46', '47', '48', '51', '52', '54', '55', '56', '57', '58', '59',
    '61', '62', '63', '64', '65', '66', '68', '71', '72', '73', '74', '75', '76',
    '77', '80', '81', '82', '83', '84', '85', '86', '87', '88', '90', '91', '92',
    '93', '94', '95', '98', '99'
  ];
  
  const prefix = cleaned.substring(0, 2);
  if (!validPrefixes.includes(prefix)) {
    return { isValid: false, formatted: null, error: `Invalid EIN prefix: ${prefix}` };
  }
  
  // Format as XX-XXXXXXX
  const formatted = `${cleaned.substring(0, 2)}-${cleaned.substring(2, 9)}`;
  
  return { isValid: true, formatted, error: null };
}

/**
 * Validate Tax ID (SSN or EIN)
 * @param {string} taxId - Tax ID number
 * @param {string} taxIdType - 'SSN' or 'EIN'
 * @returns {Object} { isValid, formatted, error }
 */
export function validateTaxId(taxId, taxIdType) {
  if (!taxIdType || !['SSN', 'EIN'].includes(taxIdType.toUpperCase())) {
    return { isValid: false, formatted: null, error: 'Invalid tax ID type' };
  }
  
  return taxIdType.toUpperCase() === 'SSN' 
    ? validateSSN(taxId) 
    : validateEIN(taxId);
}

/**
 * Check if address is complete for tax form filing
 * @param {Object} address - Address object
 * @returns {Object} { isComplete, missingFields }
 */
export function validateAddress(address) {
  const required = ['street', 'city', 'state', 'zipCode'];
  const missingFields = [];
  
  if (!address || typeof address !== 'object') {
    return { isComplete: false, missingFields: required };
  }
  
  for (const field of required) {
    if (!address[field] || !address[field].toString().trim()) {
      missingFields.push(field);
    }
  }
  
  // Validate state code (2 letter)
  if (address.state && !/^[A-Z]{2}$/i.test(address.state.trim())) {
    missingFields.push('state (must be 2-letter code)');
  }
  
  // Validate zip code (5 or 9 digits)
  if (address.zipCode && !/^\d{5}(-\d{4})?$/.test(address.zipCode.replace(/\s/g, ''))) {
    missingFields.push('zipCode (invalid format)');
  }
  
  return { 
    isComplete: missingFields.length === 0, 
    missingFields 
  };
}

/**
 * Validate 1099-NEC data for form generation
 * @param {Object} payerInfo - Company/payer information
 * @param {Object} recipientInfo - Payee/recipient information
 * @param {Object} paymentData - Payment amounts
 * @returns {Object} { isValid, errors, warnings }
 */
export function validate1099NECData(payerInfo, recipientInfo, paymentData) {
  const errors = [];
  const warnings = [];
  
  // Validate payer info
  if (!payerInfo) {
    errors.push('Payer information is required');
  } else {
    const einResult = validateEIN(payerInfo.taxId || payerInfo.ein);
    if (!einResult.isValid) {
      errors.push(`Payer EIN: ${einResult.error}`);
    }
    
    if (!payerInfo.name && !payerInfo.legalName) {
      errors.push('Payer name is required');
    }
    
    const payerAddress = validateAddress(payerInfo.address);
    if (!payerAddress.isComplete) {
      errors.push(`Payer address incomplete: missing ${payerAddress.missingFields.join(', ')}`);
    }
  }
  
  // Validate recipient info
  if (!recipientInfo) {
    errors.push('Recipient information is required');
  } else {
    const taxIdResult = validateTaxId(recipientInfo.taxId, recipientInfo.taxIdType || 'SSN');
    if (!taxIdResult.isValid) {
      errors.push(`Recipient Tax ID: ${taxIdResult.error}`);
    }
    
    if (!recipientInfo.name) {
      errors.push('Recipient name is required');
    }
    
    const recipientAddress = validateAddress(recipientInfo.address);
    if (!recipientAddress.isComplete) {
      errors.push(`Recipient address incomplete: missing ${recipientAddress.missingFields.join(', ')}`);
    }
  }
  
  // Validate payment data
  if (!paymentData) {
    errors.push('Payment data is required');
  } else {
    if (typeof paymentData.amount !== 'number' || paymentData.amount < 0) {
      errors.push('Payment amount must be a positive number');
    }
    
    if (paymentData.amount < 600) {
      warnings.push('Amount is below $600 threshold - 1099-NEC may not be required');
    }
    
    if (paymentData.amount > 10000000) {
      warnings.push('Amount exceeds $10 million - please verify');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate W-2 data for form generation
 * @param {Object} employerInfo - Company/employer information
 * @param {Object} employeeInfo - Employee information
 * @param {Object} wageData - Wage and withholding data
 * @returns {Object} { isValid, errors, warnings }
 */
export function validateW2Data(employerInfo, employeeInfo, wageData) {
  const errors = [];
  const warnings = [];
  
  // Validate employer info
  if (!employerInfo) {
    errors.push('Employer information is required');
  } else {
    const einResult = validateEIN(employerInfo.taxId || employerInfo.ein);
    if (!einResult.isValid) {
      errors.push(`Employer EIN: ${einResult.error}`);
    }
    
    if (!employerInfo.name && !employerInfo.legalName) {
      errors.push('Employer name is required');
    }
    
    const employerAddress = validateAddress(employerInfo.address);
    if (!employerAddress.isComplete) {
      errors.push(`Employer address incomplete: missing ${employerAddress.missingFields.join(', ')}`);
    }
  }
  
  // Validate employee info
  if (!employeeInfo) {
    errors.push('Employee information is required');
  } else {
    const ssnResult = validateSSN(employeeInfo.taxId);
    if (!ssnResult.isValid) {
      errors.push(`Employee SSN: ${ssnResult.error}`);
    }
    
    if (!employeeInfo.name && !employeeInfo.taxFormInfo?.firstName && !employeeInfo.taxFormInfo?.lastName) {
      errors.push('Employee name is required');
    }
    
    const employeeAddress = validateAddress(employeeInfo.address);
    if (!employeeAddress.isComplete) {
      errors.push(`Employee address incomplete: missing ${employeeAddress.missingFields.join(', ')}`);
    }
  }
  
  // Validate wage data
  if (!wageData) {
    errors.push('Wage data is required');
  } else {
    // Box 1 - Wages
    if (typeof wageData.wages !== 'number' || wageData.wages < 0) {
      errors.push('Wages must be a non-negative number');
    }
    
    // Box 3 - Social Security Wages (capped at $168,600 for 2024)
    const ssWageCap = 168600;
    if (wageData.socialSecurityWages > ssWageCap) {
      warnings.push(`Social Security wages exceed ${ssWageCap} cap`);
    }
    
    // Box 4 - Social Security Tax (should be 6.2% of Box 3)
    if (wageData.socialSecurityWages && wageData.socialSecurityTax) {
      const expectedSSTax = Math.min(wageData.socialSecurityWages, ssWageCap) * 0.062;
      const tolerance = 1; // $1 tolerance for rounding
      if (Math.abs(wageData.socialSecurityTax - expectedSSTax) > tolerance) {
        warnings.push('Social Security tax does not match 6.2% of SS wages');
      }
    }
    
    // Box 6 - Medicare Tax (should be 1.45% of Box 5)
    if (wageData.medicareWages && wageData.medicareTax) {
      const expectedMedicare = wageData.medicareWages * 0.0145;
      const tolerance = 1;
      if (Math.abs(wageData.medicareTax - expectedMedicare) > tolerance) {
        warnings.push('Medicare tax does not match 1.45% of Medicare wages');
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get payees missing required tax form information
 * @param {Array} payees - Array of payee records
 * @param {string} formType - '1099-NEC', '1099-MISC', or 'W-2'
 * @returns {Array} Payees with missing information
 */
export function getPayeesMissingInfo(payees, formType) {
  if (!Array.isArray(payees)) return [];
  
  return payees.map(payee => {
    const missing = [];
    
    // Check tax ID
    if (!payee.taxId) {
      missing.push('Tax ID');
    }
    
    // Check address
    const addressCheck = validateAddress(payee.address);
    if (!addressCheck.isComplete) {
      missing.push(`Address (${addressCheck.missingFields.join(', ')})`);
    }
    
    // Form-specific checks
    if (formType === 'W-2') {
      if (!payee.taxFormInfo?.firstName || !payee.taxFormInfo?.lastName) {
        if (!payee.name) {
          missing.push('Name');
        } else {
          missing.push('First/Last name separation');
        }
      }
    }
    
    return {
      payee,
      payeeId: payee.id,
      payeeName: payee.name,
      type: payee.type,
      missing,
      isComplete: missing.length === 0
    };
  }).filter(p => p.missing.length > 0);
}

/**
 * Format amount for tax form display (2 decimal places)
 * @param {number} amount - Amount to format
 * @returns {string} Formatted amount
 */
export function formatTaxAmount(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '0.00';
  }
  return Math.abs(amount).toFixed(2);
}

/**
 * Format city/state/zip line for tax forms
 * @param {Object} address - Address object
 * @returns {string} Formatted city, state, zip line
 */
export function formatCityStateZip(address) {
  if (!address) return '';
  
  const parts = [];
  if (address.city) parts.push(address.city);
  if (address.state) parts.push(address.state.toUpperCase());
  if (address.zipCode) parts.push(address.zipCode);
  
  if (parts.length >= 2) {
    return `${parts[0]}, ${parts.slice(1).join(' ')}`;
  }
  return parts.join(' ');
}

export default {
  validateSSN,
  validateEIN,
  validateTaxId,
  validateAddress,
  validate1099NECData,
  validateW2Data,
  getPayeesMissingInfo,
  formatTaxAmount,
  formatCityStateZip
};
