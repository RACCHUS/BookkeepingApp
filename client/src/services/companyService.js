/**
 * Company API service - handles all company-related API calls
 */

import api from './api.js';

const companyService = {
  /**
   * Get all companies for the current user
   */
  async getAll() {
    return await api.companies.getAll();
  },

  /**
   * Get a specific company by ID
   */
  async getById(companyId) {
    return await api.companies.getById(companyId);
  },

  /**
   * Create a new company
   */
  async create(companyData) {
    return await api.companies.create(companyData);
  },

  /**
   * Update an existing company
   */
  async update(companyId, updateData) {
    return await api.companies.update(companyId, updateData);
  },

  /**
   * Delete a company
   */
  async delete(companyId) {
    return await api.companies.delete(companyId);
  },

  /**
   * Set a company as the default
   */
  async setDefault(companyId) {
    return await api.companies.setDefault(companyId);
  }
};

export default companyService;
