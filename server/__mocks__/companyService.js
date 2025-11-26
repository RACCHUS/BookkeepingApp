/**
 * Manual mock for companyService
 * Jest will automatically use this when companyService is imported in tests
 */

import { jest } from '@jest/globals';

export default {
  getUserCompanies: jest.fn(),
  getCompanyById: jest.fn(),
  getDefaultCompany: jest.fn(),
  createCompany: jest.fn(),
  updateCompany: jest.fn(),
  deleteCompany: jest.fn(),
  setDefaultCompany: jest.fn(),
  extractCompanyFromChaseStatement: jest.fn(),
  findCompanyByName: jest.fn()
};
