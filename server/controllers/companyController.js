import { validationResult } from 'express-validator';
import companyService from '../services/companyService.js';

/**
 * Get all companies for the current user
 */
export const getCompanies = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const companies = await companyService.getUserCompanies(userId);
    
    res.json({
      success: true,
      data: companies,
      count: companies.length,
      message: companies.length === 0 ? 'No companies found. Create your first company to get started.' : undefined
    });
  } catch (error) {
    console.error('Error getting companies:', error);
    
    // Provide helpful error messages
    let errorMessage = 'Failed to get companies';
    if (error.message.includes('index')) {
      errorMessage = 'Database index configuration needed. Please contact support or check the logs for index creation instructions.';
    }
    
    res.status(500).json({
      error: errorMessage,
      message: error.message,
      success: false
    });
  }
};

/**
 * Get company by ID
 */
export const getCompanyById = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { id } = req.params;
    
    const company = await companyService.getCompanyById(id, userId);
    
    res.json({
      success: true,
      data: company
    });
  } catch (error) {
    console.error('Error getting company:', error);
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({
      error: 'Failed to get company',
      message: error.message
    });
  }
};

/**
 * Get default company for the current user
 */
export const getDefaultCompany = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const company = await companyService.getDefaultCompany(userId);
    
    if (!company) {
      return res.status(404).json({
        error: 'No default company found',
        message: 'Create a company first or set one as default'
      });
    }
    
    res.json({
      success: true,
      data: company
    });
  } catch (error) {
    console.error('Error getting default company:', error);
    res.status(500).json({
      error: 'Failed to get default company',
      message: error.message
    });
  }
};

/**
 * Create a new company
 */
export const createCompany = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const companyData = req.body;
    
    const companyId = await companyService.createCompany(userId, companyData);
    const company = await companyService.getCompanyById(companyId, userId);
    
    res.status(201).json({
      success: true,
      data: company,
      message: 'Company created successfully'
    });
  } catch (error) {
    console.error('Error creating company:', error);
    res.status(500).json({
      error: 'Failed to create company',
      message: error.message
    });
  }
};

/**
 * Update company
 */
export const updateCompany = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { uid: userId } = req.user;
    const { id } = req.params;
    const updateData = req.body;
    
    await companyService.updateCompany(id, userId, updateData);
    const company = await companyService.getCompanyById(id, userId);
    
    res.json({
      success: true,
      data: company,
      message: 'Company updated successfully'
    });
  } catch (error) {
    console.error('Error updating company:', error);
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({
      error: 'Failed to update company',
      message: error.message
    });
  }
};

/**
 * Delete company
 */
export const deleteCompany = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { id } = req.params;
    
    await companyService.deleteCompany(id, userId);
    
    res.json({
      success: true,
      message: 'Company deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting company:', error);
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({
      error: 'Failed to delete company',
      message: error.message
    });
  }
};

/**
 * Set default company
 */
export const setDefaultCompany = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { id } = req.params;
    
    await companyService.setDefaultCompany(id, userId);
    const company = await companyService.getCompanyById(id, userId);
    
    res.json({
      success: true,
      data: company,
      message: 'Default company set successfully'
    });
  } catch (error) {
    console.error('Error setting default company:', error);
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({
      error: 'Failed to set default company',
      message: error.message
    });
  }
};

/**
 * Extract company information from uploaded PDF
 */
export const extractCompanyFromPDF = async (req, res) => {
  try {
    const { pdfText } = req.body;
    
    if (!pdfText) {
      return res.status(400).json({
        error: 'PDF text is required',
        message: 'Provide pdfText in request body'
      });
    }
    
    const extractedInfo = companyService.extractCompanyFromChaseStatement(pdfText);
    
    res.json({
      success: true,
      data: extractedInfo,
      message: 'Company information extracted from PDF'
    });
  } catch (error) {
    console.error('Error extracting company from PDF:', error);
    res.status(500).json({
      error: 'Failed to extract company information',
      message: error.message
    });
  }
};

/**
 * Find company by name (for auto-matching)
 */
export const findCompanyByName = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { name } = req.query;
    
    if (!name) {
      return res.status(400).json({
        error: 'Company name is required',
        message: 'Provide name as query parameter'
      });
    }
    
    const company = await companyService.findCompanyByName(userId, name);
    
    if (!company) {
      return res.status(404).json({
        error: 'Company not found',
        message: 'No matching company found'
      });
    }
    
    res.json({
      success: true,
      data: company
    });
  } catch (error) {
    console.error('Error finding company by name:', error);
    res.status(500).json({
      error: 'Failed to find company',
      message: error.message
    });
  }
};
