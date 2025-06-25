import admin from '../config/firebaseAdmin.js';

class FirebaseService {  constructor() {
    if (admin) {
      this.db = admin.firestore();
      this.auth = admin.auth();
      this.isInitialized = true;
      console.log('✅ FirebaseService: Initialized with Firestore and Auth (Storage disabled)');
    } else {
      this.isInitialized = false;
      console.log('⚠️  FirebaseService: Running in mock mode without Firebase');
    }
  }

  _checkInitialized() {
    if (!this.isInitialized) {
      throw new Error('Firebase is not initialized. Please configure Firebase credentials in .env file.');
    }
  }
  // Transaction operations
  async createTransaction(userId, transactionData) {
    this._checkInitialized();
    try {
      const docRef = await this.db.collection('transactions').add({
        ...transactionData,
        userId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

  async getTransactions(userId, filters = {}) {
    try {
      let query = this.db.collection('transactions').where('userId', '==', userId);

      // Apply filters
      if (filters.startDate && filters.endDate) {
        query = query.where('date', '>=', filters.startDate)
                    .where('date', '<=', filters.endDate);
      }

      if (filters.category) {
        query = query.where('category', '==', filters.category);
      }

      if (filters.type) {
        query = query.where('type', '==', filters.type);
      }

      // Apply ordering
      query = query.orderBy(filters.orderBy || 'date', filters.order || 'desc');

      // Apply limit
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const snapshot = await query.get();
      const transactions = [];

      snapshot.forEach(doc => {
        transactions.push({
          id: doc.id,
          ...doc.data(),
          // Convert Firestore timestamps to JavaScript dates
          date: doc.data().date?.toDate(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        });
      });

      return transactions;
    } catch (error) {
      console.error('Error getting transactions:', error);
      throw error;
    }
  }

  async updateTransaction(transactionId, userId, updateData) {
    try {
      const docRef = this.db.collection('transactions').doc(transactionId);
      
      // Verify ownership
      const doc = await docRef.get();
      if (!doc.exists || doc.data().userId !== userId) {
        throw new Error('Transaction not found or access denied');
      }

      await docRef.update({
        ...updateData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastModifiedBy: userId
      });

      return true;
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  }

  async deleteTransaction(transactionId, userId) {
    try {
      const docRef = this.db.collection('transactions').doc(transactionId);
      
      // Verify ownership
      const doc = await docRef.get();
      if (!doc.exists || doc.data().userId !== userId) {
        throw new Error('Transaction not found or access denied');
      }

      await docRef.delete();
      return true;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  }

  // Employee operations
  async createEmployee(userId, employeeData) {
    try {
      const docRef = await this.db.collection('employees').add({
        ...employeeData,
        userId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating employee:', error);
      throw error;
    }
  }

  async getEmployees(userId) {
    try {
      const snapshot = await this.db.collection('employees')
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .orderBy('lastName', 'asc')
        .get();

      const employees = [];
      snapshot.forEach(doc => {
        employees.push({
          id: doc.id,
          ...doc.data(),
          hireDate: doc.data().hireDate?.toDate(),
          terminationDate: doc.data().terminationDate?.toDate(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        });
      });

      return employees;
    } catch (error) {
      console.error('Error getting employees:', error);
      throw error;
    }
  }

  // Classification rules operations
  async createClassificationRule(userId, ruleData) {
    try {
      const docRef = await this.db.collection('classificationRules').add({
        ...ruleData,
        userId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating classification rule:', error);
      throw error;
    }
  }

  async getClassificationRules(userId) {
    try {
      const snapshot = await this.db.collection('classificationRules')
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .orderBy('confidence', 'desc')
        .get();

      const rules = [];
      snapshot.forEach(doc => {
        rules.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        });
      });

      return rules;
    } catch (error) {
      console.error('Error getting classification rules:', error);
      throw error;
    }  }

  // File storage operations (local file system replacement for Firebase Storage)
  async uploadFile(buffer, fileName, contentType, userId) {
    try {
      // Since Firebase Storage is not used, we'll save files locally
      // In production, you might want to use a different storage solution
      const fs = await import('fs');
      const path = await import('path');
      
      const uploadDir = path.join(process.cwd(), 'uploads', userId);
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, buffer);
      
      return {
        fileId: `${userId}/${fileName}`,
        url: `/uploads/${userId}/${fileName}`,
        fileName,
        contentType,
        localPath: filePath
      };
    } catch (error) {
      console.error('Error uploading file locally:', error);
      throw error;
    }  }

  // File storage operations (local file system replacement for Firebase Storage)
  async uploadFile(buffer, fileName, contentType, userId) {
    try {
      // Since Firebase Storage is not used, we'll save files locally
      const fs = await import('fs');
      const path = await import('path');
      
      const uploadDir = path.join(process.cwd(), 'uploads', userId);
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, buffer);
      
      return {
        fileId: `${userId}/${fileName}`,
        url: `/uploads/${userId}/${fileName}`,
        fileName,
        contentType,
        localPath: filePath
      };
    } catch (error) {
      console.error('Error uploading file locally:', error);
      throw error;
    }
  }

  async deleteFile(fileId, userId) {
    try {
      // Local file system deletion
      const fs = await import('fs');
      const path = await import('path');
      
      const filePath = path.join(process.cwd(), 'uploads', fileId);
      
      // Verify the file belongs to the user
      if (!fileId.startsWith(`${userId}/`)) {
        throw new Error('Access denied to file');
      }
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  // Batch operations for better performance
  async batchCreateTransactions(userId, transactions) {
    try {
      const batch = this.db.batch();
      const transactionIds = [];

      transactions.forEach(transactionData => {
        const docRef = this.db.collection('transactions').doc();
        batch.set(docRef, {
          ...transactionData,
          userId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        transactionIds.push(docRef.id);
      });

      await batch.commit();
      return transactionIds;
    } catch (error) {
      console.error('Error batch creating transactions:', error);
      throw error;
    }
  }

  // Analytics and reporting helpers
  async getTransactionSummary(userId, startDate, endDate) {
    try {
      const transactions = await this.getTransactions(userId, {
        startDate,
        endDate
      });

      const summary = {
        totalIncome: 0,
        totalExpenses: 0,
        netIncome: 0,
        transactionCount: transactions.length,
        categorySummary: {},
        employeeSummary: {}
      };

      transactions.forEach(transaction => {
        const amount = Math.abs(transaction.amount);
        
        if (transaction.type === 'income') {
          summary.totalIncome += amount;
        } else if (transaction.type === 'expense') {
          summary.totalExpenses += amount;
        }

        // Category summary
        if (!summary.categorySummary[transaction.category]) {
          summary.categorySummary[transaction.category] = 0;
        }
        summary.categorySummary[transaction.category] += amount;

        // Employee summary
        if (transaction.employeeId) {
          if (!summary.employeeSummary[transaction.employeeId]) {
            summary.employeeSummary[transaction.employeeId] = {
              name: transaction.employeeName,
              totalAmount: 0,
              transactionCount: 0
            };
          }
          summary.employeeSummary[transaction.employeeId].totalAmount += amount;
          summary.employeeSummary[transaction.employeeId].transactionCount++;
        }
      });

      summary.netIncome = summary.totalIncome - summary.totalExpenses;

      return summary;
    } catch (error) {
      console.error('Error getting transaction summary:', error);
      throw error;
    }
  }
}

export default new FirebaseService();
