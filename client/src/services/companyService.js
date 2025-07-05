/**
 * Company API service - handles all company-related API calls
 */

import { apiClient } from './api.js';

const companyService = {
  /**
   * Get all companies for the current user
   */
  async getAll() {
    return await apiClient.companies.getAll();
  },

  /**
   * Get a specific company by ID
   */
  async getById(companyId) {
    return await apiClient.companies.getById(companyId);
  },

  /**
   * Create a new company
   */
  async create(companyData) {
    return await apiClient.companies.create(companyData);
  },

  /**
   * Update an existing company
   */
  async update(companyId, updateData) {
    return await apiClient.companies.update(companyId, updateData);
  },

  /**
   * Delete a company
   */
  async delete(companyId) {
    return await apiClient.companies.delete(companyId);
  },

  /**
   * Set a company as the default
   */
  async setDefault(companyId) {
    return await apiClient.companies.setDefault(companyId);
  }
};

export default companyService;
