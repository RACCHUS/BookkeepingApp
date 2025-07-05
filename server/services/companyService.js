import { getFirestore } from 'firebase-admin/firestore';
import { CompanySchema, CompanyBankAccountSchema } from '../../shared/schemas/companySchema.js';
import { withIndexFallback, logIndexError } from '../utils/errorHandler.js';

class CompanyService {
  constructor() {
    this.db = getFirestore();
    this.companiesCollection = 'companies';
    this.bankAccountsCollection = 'companyBankAccounts';
  }

  /**
   * Create a new company
   * @param {string} userId - User ID
   * @param {object} companyData - Company data
   * @returns {Promise<string>} Company ID
   */
  async createCompany(userId, companyData) {
    try {
      const company = {
        ...CompanySchema,
        ...companyData,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
        lastModifiedBy: userId
      };

      // If this is the first company for the user, make it default
      const existingCompanies = await this.getUserCompanies(userId);
      if (existingCompanies.length === 0) {
        company.isDefault = true;
      }

      const docRef = await this.db.collection(this.companiesCollection).add(company);
      console.log(`✅ Created company: ${company.name} (${docRef.id})`);
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating company:', error);
      throw error;
    }
  }

  /**
   * Get all companies for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of companies
   */
  async getUserCompanies(userId) {
    const primaryQuery = async () => {
      const snapshot = await this.db
        .collection(this.companiesCollection)
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .orderBy('isDefault', 'desc')
        .orderBy('name', 'asc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    };

    const fallbackQuery = async () => {
      const snapshot = await this.db
        .collection(this.companiesCollection)
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .get();

      const companies = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort in memory: default companies first, then alphabetically
      companies.sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return (a.name || '').localeCompare(b.name || '');
      });

      return companies;
    };

    try {
      return await withIndexFallback(
        primaryQuery,
        fallbackQuery,
        'getUserCompanies query'
      );
    } catch (error) {
      logIndexError(error, 'getUserCompanies');
      
      // Last resort: return empty array to prevent app crash
      console.warn('⚠️ All queries failed, returning empty companies array');
      return [];
    }
  }

  /**
   * Get company by ID
   * @param {string} companyId - Company ID
   * @param {string} userId - User ID (for security)
   * @returns {Promise<object>} Company data
   */
  async getCompanyById(companyId, userId) {
    try {
      const doc = await this.db
        .collection(this.companiesCollection)
        .doc(companyId)
        .get();

      if (!doc.exists) {
        throw new Error('Company not found');
      }

      const company = { id: doc.id, ...doc.data() };

      // Verify user owns this company
      if (company.userId !== userId) {
        throw new Error('Access denied: Company does not belong to user');
      }

      return company;
    } catch (error) {
      console.error('Error getting company:', error);
      throw error;
    }
  }

  /**
   * Update company
   * @param {string} companyId - Company ID
   * @param {string} userId - User ID
   * @param {object} updateData - Data to update
   * @returns {Promise<void>}
   */
  async updateCompany(companyId, userId, updateData) {
    try {
      // Verify ownership first
      await this.getCompanyById(companyId, userId);

      const updatedData = {
        ...updateData,
        updatedAt: new Date(),
        lastModifiedBy: userId
      };

      // If setting as default, unset others
      if (updateData.isDefault === true) {
        await this.unsetDefaultCompanies(userId);
      }

      await this.db
        .collection(this.companiesCollection)
        .doc(companyId)
        .update(updatedData);

      console.log(`✅ Updated company: ${companyId}`);
    } catch (error) {
      console.error('Error updating company:', error);
      throw error;
    }
  }

  /**
   * Delete company (soft delete by setting isActive to false)
   * @param {string} companyId - Company ID
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async deleteCompany(companyId, userId) {
    try {
      // Check if company has transactions
      const transactionCount = await this.getCompanyTransactionCount(companyId);
      if (transactionCount > 0) {
        throw new Error('Cannot delete company with existing transactions. Archive it instead.');
      }

      await this.updateCompany(companyId, userId, { 
        isActive: false,
        deletedAt: new Date()
      });

      console.log(`✅ Deleted company: ${companyId}`);
    } catch (error) {
      console.error('Error deleting company:', error);
      throw error;
    }
  }

  /**
   * Get default company for user
   * @param {string} userId - User ID
   * @returns {Promise<object|null>} Default company or null
   */
  async getDefaultCompany(userId) {
    try {
      const snapshot = await this.db
        .collection(this.companiesCollection)
        .where('userId', '==', userId)
        .where('isDefault', '==', true)
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (snapshot.empty) {
        // No default company, get first active company
        const companies = await this.getUserCompanies(userId);
        return companies.length > 0 ? companies[0] : null;
      }

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error getting default company:', error);
      throw error;
    }
  }

  /**
   * Set default company
   * @param {string} companyId - Company ID to set as default
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async setDefaultCompany(companyId, userId) {
    try {
      // Verify ownership
      await this.getCompanyById(companyId, userId);

      // Unset all other defaults
      await this.unsetDefaultCompanies(userId);

      // Set this as default
      await this.updateCompany(companyId, userId, { isDefault: true });
    } catch (error) {
      console.error('Error setting default company:', error);
      throw error;
    }
  }

  /**
   * Unset all default companies for a user
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async unsetDefaultCompanies(userId) {
    try {
      const snapshot = await this.db
        .collection(this.companiesCollection)
        .where('userId', '==', userId)
        .where('isDefault', '==', true)
        .get();

      const batch = this.db.batch();
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { isDefault: false });
      });

      if (!snapshot.empty) {
        await batch.commit();
      }
    } catch (error) {
      console.error('Error unsetting default companies:', error);
      throw error;
    }
  }

  /**
   * Extract company information from Chase PDF text
   * @param {string} pdfText - Raw PDF text
   * @returns {object} Extracted company information
   */
  extractCompanyFromChaseStatement(pdfText) {
    try {
      // Look for company name pattern in Chase statements
      // Example: "SHAMDAT CONSTRUCTION, INC.\n7411 NW 23RD ST\nSUNRISE FL 33313-2811"
      
      const lines = pdfText.split('\n').map(line => line.trim());
      let companyName = '';
      let address = {
        street: '',
        city: '',
        state: '',
        zipCode: ''
      };

      // Look for company name after account number section
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Chase statements typically have the company name after the account info
        // Look for lines that appear to be business names (all caps, contains business identifiers)
        if (this.isBusinessName(line)) {
          companyName = line;
          
          // Look for address in next few lines
          for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
            const addressLine = lines[j];
            
            if (this.isStreetAddress(addressLine)) {
              address.street = addressLine;
            } else if (this.isCityStateZip(addressLine)) {
              const parsed = this.parseCityStateZip(addressLine);
              address.city = parsed.city;
              address.state = parsed.state;
              address.zipCode = parsed.zipCode;
            }
          }
          break;
        }
      }

      return {
        name: companyName,
        legalName: companyName,
        address: address,
        extracted: true,
        confidence: companyName ? 0.8 : 0.1
      };
    } catch (error) {
      console.error('Error extracting company from PDF:', error);
      return {
        name: '',
        legalName: '',
        address: { street: '', city: '', state: '', zipCode: '' },
        extracted: false,
        confidence: 0
      };
    }
  }

  /**
   * Check if a line appears to be a business name
   * @param {string} line - Text line
   * @returns {boolean}
   */
  isBusinessName(line) {
    if (!line || line.length < 3) return false;
    
    // Business indicators
    const businessIndicators = [
      'INC.', 'INCORPORATED', 'LLC', 'LTD', 'CORP', 'CORPORATION',
      'COMPANY', 'CO.', 'CONSTRUCTION', 'SERVICES', 'CONSULTING',
      'ENTERPRISES', 'GROUP', 'ASSOCIATES', 'PARTNERS'
    ];
    
    const upperLine = line.toUpperCase();
    
    // Check for business indicators
    const hasBusinessIndicator = businessIndicators.some(indicator => 
      upperLine.includes(indicator)
    );
    
    // Check if mostly uppercase (common for business names in statements)
    const upperCaseRatio = (line.match(/[A-Z]/g) || []).length / line.length;
    
    return hasBusinessIndicator || (upperCaseRatio > 0.7 && line.length > 5);
  }

  /**
   * Check if a line appears to be a street address
   * @param {string} line - Text line
   * @returns {boolean}
   */
  isStreetAddress(line) {
    if (!line) return false;
    
    const streetIndicators = [
      'ST', 'STREET', 'AVE', 'AVENUE', 'RD', 'ROAD', 'BLVD', 'BOULEVARD',
      'DR', 'DRIVE', 'LN', 'LANE', 'CT', 'COURT', 'PL', 'PLACE', 'WAY'
    ];
    
    const upperLine = line.toUpperCase();
    
    // Has number at start and street indicator
    const hasNumber = /^\d+/.test(line.trim());
    const hasStreetIndicator = streetIndicators.some(indicator => 
      upperLine.includes(` ${indicator} `) || upperLine.endsWith(` ${indicator}`)
    );
    
    return hasNumber && hasStreetIndicator;
  }

  /**
   * Check if a line appears to be city, state, zip
   * @param {string} line - Text line
   * @returns {boolean}
   */
  isCityStateZip(line) {
    if (!line) return false;
    
    // Pattern: CITY STATE ZIPCODE (e.g., "SUNRISE FL 33313-2811")
    const pattern = /^[A-Z\s]+\s[A-Z]{2}\s\d{5}(-\d{4})?$/;
    return pattern.test(line.toUpperCase().trim());
  }

  /**
   * Parse city, state, zip from a line
   * @param {string} line - Text line
   * @returns {object} Parsed address components
   */
  parseCityStateZip(line) {
    const parts = line.trim().split(/\s+/);
    const zipIndex = parts.findIndex(part => /\d{5}(-\d{4})?/.test(part));
    
    if (zipIndex === -1) {
      return { city: '', state: '', zipCode: '' };
    }
    
    const zipCode = parts[zipIndex];
    const state = parts[zipIndex - 1] || '';
    const city = parts.slice(0, zipIndex - 1).join(' ');
    
    return { city, state, zipCode };
  }

  /**
   * Get transaction count for a company
   * @param {string} companyId - Company ID
   * @returns {Promise<number>} Transaction count
   */
  async getCompanyTransactionCount(companyId) {
    try {
      const snapshot = await this.db
        .collection('transactions')
        .where('companyId', '==', companyId)
        .count()
        .get();
      
      return snapshot.data().count;
    } catch (error) {
      console.error('Error getting company transaction count:', error);
      return 0;
    }
  }

  /**
   * Find company by name (fuzzy matching)
   * @param {string} userId - User ID
   * @param {string} name - Company name to search for
   * @returns {Promise<object|null>} Matching company or null
   */
  async findCompanyByName(userId, name) {
    try {
      const companies = await this.getUserCompanies(userId);
      const nameLower = name.toLowerCase();
      
      // Exact match first
      let match = companies.find(company => 
        company.name.toLowerCase() === nameLower ||
        company.legalName.toLowerCase() === nameLower
      );
      
      if (match) return match;
      
      // Fuzzy match - contains name
      match = companies.find(company => 
        company.name.toLowerCase().includes(nameLower) ||
        company.legalName.toLowerCase().includes(nameLower) ||
        nameLower.includes(company.name.toLowerCase())
      );
      
      return match || null;
    } catch (error) {
      console.error('Error finding company by name:', error);
      return null;
    }
  }

  /**
   * Find or create a company based on PDF extracted data
   * @param {string} userId - User ID
   * @param {object} pdfCompanyInfo - Company info extracted from PDF
   * @returns {Promise<object>} Company object
   */
  async findOrCreateFromPDFData(userId, pdfCompanyInfo) {
    try {
      if (!pdfCompanyInfo.name) {
        // No company name extracted, return default company or null
        return await this.getDefaultCompany(userId);
      }

      // Try to find existing company by name
      let company = await this.findCompanyByName(userId, pdfCompanyInfo.name);
      
      if (company) {
        console.log(`📍 Found existing company: ${company.name}`);
        return company;
      }

      // Company not found, create a new one
      console.log(`🏢 Creating new company from PDF data: ${pdfCompanyInfo.name}`);
      
      const companyData = {
        name: pdfCompanyInfo.name,
        legalName: pdfCompanyInfo.name,
        description: `Auto-created from bank statement`,
        type: 'business',
        status: 'active',
        address: {
          street: pdfCompanyInfo.address || '',
          city: '',
          state: '',
          zipCode: '',
          country: 'USA'
        },
        source: 'pdf_import',
        extractedFromPDF: true
      };

      const companyId = await this.createCompany(userId, companyData);
      return await this.getCompanyById(companyId, userId);
      
    } catch (error) {
      console.error('Error finding or creating company from PDF data:', error);
      // Return default company as fallback
      return await this.getDefaultCompany(userId);
    }
  }
}

export default new CompanyService();
