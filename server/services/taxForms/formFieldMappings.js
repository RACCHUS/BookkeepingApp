/**
 * IRS Form Field Mappings
 * 
 * Maps logical field names to actual PDF form field names for IRS tax forms.
 * Field names are determined by inspecting the IRS fillable PDF forms.
 * 
 * Note: Actual field names may vary by year. These are based on 2024 forms.
 * Run the field inspection utility if forms are updated.
 * 
 * @author BookkeepingApp Team
 */

/**
 * 1099-NEC Form Field Mappings
 * Form 1099-NEC: Nonemployee Compensation
 * Used for contractors paid $600 or more
 */
export const FORM_1099_NEC_FIELDS = {
  // Payer section (left column, top)
  payerName: 'topmostSubform[0].CopyA[0].LeftCol[0].f1_1[0]',
  payerStreet: 'topmostSubform[0].CopyA[0].LeftCol[0].f1_2[0]',
  payerCity: 'topmostSubform[0].CopyA[0].LeftCol[0].f1_3[0]',
  payerPhone: 'topmostSubform[0].CopyA[0].LeftCol[0].f1_4[0]',
  payerTIN: 'topmostSubform[0].CopyA[0].LeftCol[0].f1_5[0]',
  
  // Recipient section (left column, bottom)
  recipientTIN: 'topmostSubform[0].CopyA[0].LeftCol[0].f1_6[0]',
  recipientName: 'topmostSubform[0].CopyA[0].LeftCol[0].f1_7[0]',
  recipientStreet: 'topmostSubform[0].CopyA[0].LeftCol[0].f1_8[0]',
  recipientCity: 'topmostSubform[0].CopyA[0].LeftCol[0].f1_9[0]',
  accountNumber: 'topmostSubform[0].CopyA[0].LeftCol[0].f1_10[0]',
  
  // Amount boxes (right column)
  box1_nonemployeeCompensation: 'topmostSubform[0].CopyA[0].RightCol[0].f1_11[0]',
  box2_payerMadeDirectSales: 'topmostSubform[0].CopyA[0].RightCol[0].c1_1[0]', // Checkbox
  box4_federalWithheld: 'topmostSubform[0].CopyA[0].RightCol[0].f1_14[0]',
  
  // State information (boxes 5-7)
  box5_statePayerNumber: 'topmostSubform[0].CopyA[0].RightCol[0].f1_15[0]',
  box6_stateIncome: 'topmostSubform[0].CopyA[0].RightCol[0].f1_16[0]',
  box7_stateTaxWithheld: 'topmostSubform[0].CopyA[0].RightCol[0].f1_17[0]',
  
  // Second state row (if applicable)
  box5_statePayerNumber2: 'topmostSubform[0].CopyA[0].RightCol[0].f1_18[0]',
  box6_stateIncome2: 'topmostSubform[0].CopyA[0].RightCol[0].f1_19[0]',
  box7_stateTaxWithheld2: 'topmostSubform[0].CopyA[0].RightCol[0].f1_20[0]'
};

/**
 * 1099-MISC Form Field Mappings
 * Form 1099-MISC: Miscellaneous Income
 * Used for rents, royalties, prizes, awards, etc.
 */
export const FORM_1099_MISC_FIELDS = {
  // Payer section
  payerName: 'topmostSubform[0].CopyA[0].LeftCol[0].f1_1[0]',
  payerStreet: 'topmostSubform[0].CopyA[0].LeftCol[0].f1_2[0]',
  payerCity: 'topmostSubform[0].CopyA[0].LeftCol[0].f1_3[0]',
  payerPhone: 'topmostSubform[0].CopyA[0].LeftCol[0].f1_4[0]',
  payerTIN: 'topmostSubform[0].CopyA[0].LeftCol[0].f1_5[0]',
  
  // Recipient section
  recipientTIN: 'topmostSubform[0].CopyA[0].LeftCol[0].f1_6[0]',
  recipientName: 'topmostSubform[0].CopyA[0].LeftCol[0].f1_7[0]',
  recipientStreet: 'topmostSubform[0].CopyA[0].LeftCol[0].f1_8[0]',
  recipientCity: 'topmostSubform[0].CopyA[0].LeftCol[0].f1_9[0]',
  accountNumber: 'topmostSubform[0].CopyA[0].LeftCol[0].f1_10[0]',
  
  // Amount boxes (1-17)
  box1_rents: 'topmostSubform[0].CopyA[0].RightCol[0].f1_11[0]',
  box2_royalties: 'topmostSubform[0].CopyA[0].RightCol[0].f1_12[0]',
  box3_otherIncome: 'topmostSubform[0].CopyA[0].RightCol[0].f1_13[0]',
  box4_federalWithheld: 'topmostSubform[0].CopyA[0].RightCol[0].f1_14[0]',
  box5_fishingBoat: 'topmostSubform[0].CopyA[0].RightCol[0].f1_15[0]',
  box6_medicalPayments: 'topmostSubform[0].CopyA[0].RightCol[0].f1_16[0]',
  box8_substitutePayments: 'topmostSubform[0].CopyA[0].RightCol[0].f1_17[0]',
  box9_cropInsurance: 'topmostSubform[0].CopyA[0].RightCol[0].f1_18[0]',
  box10_grossProceeds: 'topmostSubform[0].CopyA[0].RightCol[0].f1_19[0]',
  box11_fishPurchased: 'topmostSubform[0].CopyA[0].RightCol[0].f1_20[0]',
  box12_section409A: 'topmostSubform[0].CopyA[0].RightCol[0].f1_21[0]',
  box14_goldenParachute: 'topmostSubform[0].CopyA[0].RightCol[0].f1_22[0]',
  box15_nonqualifiedDeferred: 'topmostSubform[0].CopyA[0].RightCol[0].f1_23[0]',
  
  // State information
  box16_statePayerNumber: 'topmostSubform[0].CopyA[0].RightCol[0].f1_24[0]',
  box17_stateIncome: 'topmostSubform[0].CopyA[0].RightCol[0].f1_25[0]',
  box18_stateTaxWithheld: 'topmostSubform[0].CopyA[0].RightCol[0].f1_26[0]'
};

/**
 * W-2 Form Field Mappings
 * Form W-2: Wage and Tax Statement
 * Used for employees
 */
export const FORM_W2_FIELDS = {
  // Employer section
  employerEIN: 'f1_1',           // Box b - Employer ID number
  employerNameAddr: 'f1_2',     // Box c - Employer name, address
  controlNumber: 'f1_3',        // Box d - Control number
  
  // Employee section
  employeeSSN: 'f1_4',          // Box a - Employee SSN
  employeeFirstName: 'f1_5',    // Box e - Employee first name
  employeeLastName: 'f1_6',     // Box e - Employee last name
  employeeSuffix: 'f1_7',       // Box e - Suffix
  employeeAddr: 'f1_8',         // Box f - Employee address
  
  // Wage and tax boxes
  box1_wagesTips: 'f1_9',                   // Box 1 - Wages, tips, other comp
  box2_federalWithheld: 'f1_10',            // Box 2 - Federal income tax withheld
  box3_socialSecurityWages: 'f1_11',        // Box 3 - Social security wages
  box4_socialSecurityTax: 'f1_12',          // Box 4 - Social security tax withheld
  box5_medicareWages: 'f1_13',              // Box 5 - Medicare wages and tips
  box6_medicareTax: 'f1_14',                // Box 6 - Medicare tax withheld
  box7_socialSecurityTips: 'f1_15',         // Box 7 - Social security tips
  box8_allocatedTips: 'f1_16',              // Box 8 - Allocated tips
  box10_dependentCareBenefits: 'f1_17',     // Box 10 - Dependent care benefits
  box11_nonqualifiedPlans: 'f1_18',         // Box 11 - Nonqualified plans
  
  // Box 12 codes (a-d)
  box12a_code: 'f1_19',
  box12a_amount: 'f1_20',
  box12b_code: 'f1_21',
  box12b_amount: 'f1_22',
  box12c_code: 'f1_23',
  box12c_amount: 'f1_24',
  box12d_code: 'f1_25',
  box12d_amount: 'f1_26',
  
  // Box 13 checkboxes
  box13_statutory: 'c1_1',      // Statutory employee
  box13_retirement: 'c1_2',     // Retirement plan
  box13_thirdPartySick: 'c1_3', // Third-party sick pay
  
  // Box 14 - Other
  box14_other: 'f1_27',
  
  // State and local (boxes 15-20)
  box15_state: 'f1_28',
  box15_stateId: 'f1_29',
  box16_stateWages: 'f1_30',
  box17_stateTax: 'f1_31',
  box18_localWages: 'f1_32',
  box19_localTax: 'f1_33',
  box20_localityName: 'f1_34',
  
  // Second state/local row
  box15_state2: 'f1_35',
  box15_stateId2: 'f1_36',
  box16_stateWages2: 'f1_37',
  box17_stateTax2: 'f1_38',
  box18_localWages2: 'f1_39',
  box19_localTax2: 'f1_40',
  box20_localityName2: 'f1_41'
};

/**
 * W-3 Form Field Mappings
 * Form W-3: Transmittal of Wage and Tax Statements
 * Summary form accompanying W-2s sent to SSA
 */
export const FORM_W3_FIELDS = {
  // Control number
  controlNumber: 'f1_1',
  
  // Kind of payer checkboxes
  kindOfPayer_941: 'c1_1',
  kindOfPayer_Military: 'c1_2',
  kindOfPayer_943: 'c1_3',
  kindOfPayer_944: 'c1_4',
  kindOfPayer_CT1: 'c1_5',
  kindOfPayer_Household: 'c1_6',
  
  // Kind of employer checkboxes
  kindOfEmployer_None: 'c1_7',
  kindOfEmployer_StateLocal501c: 'c1_8',
  kindOfEmployer_StateLocalNon501c: 'c1_9',
  kindOfEmployer_Federal: 'c1_10',
  
  // Totals
  box1_wagesTips: 'f1_2',
  box2_federalWithheld: 'f1_3',
  box3_socialSecurityWages: 'f1_4',
  box4_socialSecurityTax: 'f1_5',
  box5_medicareWages: 'f1_6',
  box6_medicareTax: 'f1_7',
  box7_socialSecurityTips: 'f1_8',
  box8_allocatedTips: 'f1_9',
  box10_dependentCareBenefits: 'f1_10',
  box11_nonqualifiedPlans: 'f1_11',
  box12a_deferredComp: 'f1_12',
  
  // Employer info
  employerEIN: 'f1_13',
  employerName: 'f1_14',
  employerAddr: 'f1_15',
  employerCity: 'f1_16',
  employerState: 'f1_17',
  employerZip: 'f1_18',
  
  // Other info
  otherEIN: 'f1_19',
  contactName: 'f1_20',
  contactPhone: 'f1_21',
  contactFax: 'f1_22',
  contactEmail: 'f1_23',
  
  // State and local
  box15_stateId: 'f1_24',
  box16_stateWages: 'f1_25',
  box17_stateTax: 'f1_26',
  box18_localWages: 'f1_27',
  box19_localTax: 'f1_28'
};

/**
 * Box 12 Code Definitions for W-2
 */
export const W2_BOX_12_CODES = {
  A: 'Uncollected social security or RRTA tax on tips',
  B: 'Uncollected Medicare tax on tips',
  C: 'Taxable cost of group-term life insurance over $50,000',
  D: 'Elective deferrals to 401(k)',
  E: 'Elective deferrals to 403(b)',
  F: 'Elective deferrals to 408(k)(6) SEP',
  G: 'Elective deferrals to 457(b)',
  H: 'Elective deferrals to 501(c)(18)(D)',
  J: 'Nontaxable sick pay',
  K: '20% excise tax on excess golden parachute',
  L: 'Substantiated employee business expense reimbursements',
  M: 'Uncollected social security on group-term life insurance',
  N: 'Uncollected Medicare tax on group-term life insurance',
  P: 'Excludable moving expense reimbursements',
  Q: 'Nontaxable combat pay',
  R: 'Employer contributions to Archer MSA',
  S: 'Employee salary reduction contributions to 408(p) SIMPLE',
  T: 'Adoption benefits',
  V: 'Income from exercise of nonstatutory stock options',
  W: 'Employer contributions to HSA',
  Y: 'Deferrals under section 409A nonqualified deferred compensation',
  Z: 'Income under section 409A on nonqualified deferred compensation',
  AA: 'Designated Roth contributions to 401(k)',
  BB: 'Designated Roth contributions to 403(b)',
  DD: 'Cost of employer-sponsored health coverage',
  EE: 'Designated Roth contributions to governmental 457(b)',
  FF: 'Permitted benefits under QSEHRA',
  GG: 'Income from qualified equity grants under section 83(i)',
  HH: 'Aggregate deferrals under section 83(i) elections'
};

export default {
  FORM_1099_NEC_FIELDS,
  FORM_1099_MISC_FIELDS,
  FORM_W2_FIELDS,
  FORM_W3_FIELDS,
  W2_BOX_12_CODES
};
