/**
 * Chase Bank Statement Section Constants
 * Used for categorizing transactions by PDF section
 */

export const STATEMENT_SECTIONS = {
  DEPOSITS: {
    code: 'deposits',
    name: 'DEPOSITS AND ADDITIONS',
    label: 'Deposits & Additions'
  },
  CHECKS: {
    code: 'checks', 
    name: 'CHECKS PAID',
    label: 'Checks Paid'
  },
  CARD: {
    code: 'card',
    name: 'ATM & DEBIT CARD WITHDRAWALS', 
    label: 'ATM & Debit Card'
  },
  ELECTRONIC: {
    code: 'electronic',
    name: 'ELECTRONIC WITHDRAWALS',
    label: 'Electronic Withdrawals'
  },
  MANUAL: {
    code: 'manual',
    name: 'MANUAL ENTRY',
    label: 'Manual Entry'
  },
  UNCATEGORIZED: {
    code: 'uncategorized',
    name: 'UNCATEGORIZED SECTION',
    label: 'Uncategorized'
  }
};

// Array of all sections for dropdown/selection purposes
export const SECTION_OPTIONS = Object.values(STATEMENT_SECTIONS);

// Map section codes to display names
export const SECTION_CODE_TO_NAME = Object.fromEntries(
  Object.values(STATEMENT_SECTIONS).map(section => [section.code, section.label])
);

// Get section by code
export const getSectionByCode = (code) => {
  return Object.values(STATEMENT_SECTIONS).find(section => section.code === code) || STATEMENT_SECTIONS.UNCATEGORIZED;
};

// Get section display name by code
export const getSectionDisplayName = (code) => {
  const section = getSectionByCode(code);
  return section ? section.label : 'Unknown Section';
};
