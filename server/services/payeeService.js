import { getFirestore } from 'firebase-admin/firestore';
import { PayeeSchema, PAYEE_TYPES } from '../../shared/schemas/payeeSchema.js';

class PayeeService {
  constructor() {
    this.db = getFirestore();
  }
  /**
   * Create a new payee (employee/vendor)
   */
  async createPayee(userId, payeeData) {
    try {
      const docRef = this.db.collection('payees').doc();
      
      // Create a clean payee object with only the necessary fields
      const payee = {
        id: docRef.id,
        userId,
        name: payeeData.name || '',
        type: payeeData.type || 'vendor',
        businessName: payeeData.businessName || null,
        email: payeeData.email || null,
        phone: payeeData.phone || null,
        companyId: payeeData.companyId || null,
        taxId: payeeData.taxId || null,
        is1099Required: payeeData.is1099Required || false,
        employeeId: payeeData.employeeId || null,
        position: payeeData.position || null,
        department: payeeData.department || null,
        hireDate: payeeData.hireDate || null,
        isActive: payeeData.isActive !== undefined ? payeeData.isActive : true,
        preferredPaymentMethod: payeeData.preferredPaymentMethod || 'check',
        vendorId: payeeData.vendorId || null,
        category: payeeData.category || null,
        defaultExpenseCategory: payeeData.defaultExpenseCategory || null,
        ytdPaid: payeeData.ytdPaid || 0,
        notes: payeeData.notes || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
        lastModifiedBy: userId
      };

      // Only add address if provided
      if (payeeData.address && (payeeData.address.street || payeeData.address.city || payeeData.address.state || payeeData.address.zipCode)) {
        payee.address = {
          street: payeeData.address.street || null,
          city: payeeData.address.city || null,
          state: payeeData.address.state || null,
          zipCode: payeeData.address.zipCode || null,
          country: payeeData.address.country || 'USA'
        };
      }

      // Only add bank account if provided
      if (payeeData.bankAccount && (payeeData.bankAccount.routingNumber || payeeData.bankAccount.accountNumber)) {
        payee.bankAccount = {
          routingNumber: payeeData.bankAccount.routingNumber || null,
          accountNumber: payeeData.bankAccount.accountNumber || null,
          accountType: payeeData.bankAccount.accountType || 'checking'
        };
      }

      await docRef.set(payee);
      
      return {
        success: true,
        id: docRef.id,
        payee
      };
    } catch (error) {
      console.error('Error creating payee:', error);
      throw new Error(`Failed to create payee: ${error.message}`);
    }
  }

  /**
   * Get all payees for a user
   */
  async getPayees(userId, filters = {}) {
    try {
      let query = this.db.collection('payees')
        .where('userId', '==', userId);

      // Apply only simple filters to avoid composite index requirements
      if (filters.type) {
        query = query.where('type', '==', filters.type);
      }
      
      // For now, skip companyId and isActive filters to avoid index issues
      // These can be filtered in memory
      
      const snapshot = await query.get();
      let payees = [];

      snapshot.forEach(doc => {
        payees.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Apply remaining filters in memory
      if (filters.companyId) {
        payees = payees.filter(payee => payee.companyId === filters.companyId);
      }
      
      if (filters.isActive !== undefined) {
        payees = payees.filter(payee => payee.isActive === filters.isActive);
      }

      // Sort in memory
      payees.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      return payees;
    } catch (error) {
      console.error('Error getting payees:', error);
      throw new Error(`Failed to get payees: ${error.message}`);
    }
  }

  /**
   * Get a specific payee by ID
   */
  async getPayeeById(userId, payeeId) {
    try {
      const doc = await this.db.collection('payees').doc(payeeId).get();
      
      if (!doc.exists) {
        throw new Error('Payee not found');
      }

      const data = doc.data();
      if (data.userId !== userId) {
        throw new Error('Unauthorized access to payee');
      }

      return {
        id: doc.id,
        ...data
      };
    } catch (error) {
      console.error('Error getting payee:', error);
      throw new Error(`Failed to get payee: ${error.message}`);
    }
  }

  /**
   * Update a payee
   */
  async updatePayee(userId, payeeId, updates) {
    try {
      const payeeRef = this.db.collection('payees').doc(payeeId);
      const doc = await payeeRef.get();

      if (!doc.exists) {
        throw new Error('Payee not found');
      }

      const data = doc.data();
      if (data.userId !== userId) {
        throw new Error('Unauthorized access to payee');
      }

      const updatedPayee = {
        ...updates,
        updatedAt: new Date(),
        lastModifiedBy: userId
      };

      await payeeRef.update(updatedPayee);

      return {
        success: true,
        id: payeeId
      };
    } catch (error) {
      console.error('Error updating payee:', error);
      throw new Error(`Failed to update payee: ${error.message}`);
    }
  }

  /**
   * Delete a payee
   */
  async deletePayee(userId, payeeId) {
    try {
      const payeeRef = this.db.collection('payees').doc(payeeId);
      const doc = await payeeRef.get();

      if (!doc.exists) {
        throw new Error('Payee not found');
      }

      const data = doc.data();
      if (data.userId !== userId) {
        throw new Error('Unauthorized access to payee');
      }

      await payeeRef.delete();

      return {
        success: true,
        id: payeeId
      };
    } catch (error) {
      console.error('Error deleting payee:', error);
      throw new Error(`Failed to delete payee: ${error.message}`);
    }
  }

  /**
   * Search payees by name
   */
  async searchPayees(userId, searchTerm, filters = {}) {
    try {
      const allPayees = await this.getPayees(userId, filters);
      
      if (!searchTerm) {
        return allPayees;
      }

      const searchLower = searchTerm.toLowerCase();
      
      return allPayees.filter(payee => 
        payee.name.toLowerCase().includes(searchLower) ||
        (payee.businessName && payee.businessName.toLowerCase().includes(searchLower)) ||
        (payee.email && payee.email.toLowerCase().includes(searchLower))
      );
    } catch (error) {
      console.error('Error searching payees:', error);
      throw new Error(`Failed to search payees: ${error.message}`);
    }
  }

  /**
   * Get payees by type (employees, vendors, etc.)
   */
  async getPayeesByType(userId, type, companyId = null) {
    try {
      const filters = { type };
      if (companyId) {
        filters.companyId = companyId;
      }
      
      return await this.getPayees(userId, filters);
    } catch (error) {
      console.error('Error getting payees by type:', error);
      throw new Error(`Failed to get payees by type: ${error.message}`);
    }
  }

  /**
   * Get transactions without assigned payees
   */
  async getTransactionsWithoutPayees(userId, sectionCode = 'checks') {
    try {
      // Get transactions from the checks section that don't have payee assigned
      let query = this.db.collection('transactions')
        .where('userId', '==', userId)
        .where('sectionCode', '==', sectionCode);

      const snapshot = await query.get();
      const transactions = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        // Include transactions that have no payee or empty payee
        if (!data.payee || data.payee.trim() === '' || data.payee === 'Unknown Payee') {
          transactions.push({
            id: doc.id,
            ...data
          });
        }
      });

      // Sort by date descending
      transactions.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
      });

      return transactions;
    } catch (error) {
      console.error('Error getting transactions without payees:', error);
      throw new Error(`Failed to get transactions without payees: ${error.message}`);
    }
  }

  /**
   * Update payee statistics (YTD paid, last payment, etc.)
   */
  async updatePayeeStats(userId, payeeId) {
    try {
      // Get all transactions for this payee
      const transactionsSnapshot = await this.db.collection('transactions')
        .where('userId', '==', userId)
        .where('payeeId', '==', payeeId)
        .get();

      let ytdPaid = 0;
      let lastPaymentDate = null;
      let lastPaymentAmount = 0;
      const currentYear = new Date().getFullYear();

      transactionsSnapshot.forEach(doc => {
        const transaction = doc.data();
        const transactionDate = new Date(transaction.date);
        
        // Only count current year for YTD
        if (transactionDate.getFullYear() === currentYear && transaction.type === 'expense') {
          ytdPaid += transaction.amount;
        }
        
        // Track most recent payment
        if (!lastPaymentDate || transactionDate > lastPaymentDate) {
          lastPaymentDate = transactionDate;
          lastPaymentAmount = transaction.amount;
        }
      });

      // Update payee with calculated stats
      await this.updatePayee(userId, payeeId, {
        ytdPaid,
        lastPaymentDate,
        lastPaymentAmount
      });

      return {
        success: true,
        stats: {
          ytdPaid,
          lastPaymentDate,
          lastPaymentAmount
        }
      };
    } catch (error) {
      console.error('Error updating payee stats:', error);
      throw new Error(`Failed to update payee stats: ${error.message}`);
    }
  }
}

export default new PayeeService();
