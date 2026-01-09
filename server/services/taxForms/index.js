/**
 * Tax Forms Service Module Index
 * 
 * Exports all tax form related services and utilities
 * 
 * @author BookkeepingApp Team
 */

export { TaxFormService, default as taxFormService } from './TaxFormService.js';
export { Form1099NECGenerator } from './Form1099NECGenerator.js';
export { Form1099MISCGenerator } from './Form1099MISCGenerator.js';
export { FormW2Generator } from './FormW2Generator.js';
export * from './formFieldMappings.js';
export * from './taxFormValidation.js';
