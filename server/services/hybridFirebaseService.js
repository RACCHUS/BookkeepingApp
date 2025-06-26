// Hybrid Firebase service that seamlessly switches between real Firebase and mock mode
import admin from '../config/firebaseAdmin.js';

class HybridFirebaseService {  constructor() {
    this.useFirebase = !!admin;
    this.firestoreEnabled = false;
    this.mockData = {
      transactions: [],
      users: {}
    };
    this.nextId = 1;
    
    if (this.useFirebase) {
      this.db = admin.firestore();
      this.auth = admin.auth();
      this._testFirestoreConnection();
    } else {
      this._initMockData();
      console.log('🎭 HybridFirebaseService: Using mock mode (Firebase not configured)');
    }
  }

  async _testFirestoreConnection() {
    try {
      // Test Firestore connection with a simple operation
      await this.db.collection('_connection_test').limit(1).get();
      this.firestoreEnabled = true;
      console.log('🔥 HybridFirebaseService: Using real Firebase with Firestore enabled');
    } catch (error) {
      this.firestoreEnabled = false;
      if (error.code === 7 && error.details?.includes('Cloud Firestore API has not been used')) {
        console.log('⚠️  HybridFirebaseService: Firestore API is disabled for this project');
        console.log('   Enable it at: https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=bookkeeping-app-12583');
        console.log('   Falling back to mock mode...');
      } else {
        console.log('⚠️  HybridFirebaseService: Firestore connection failed:', error.message);
        console.log('   Falling back to mock mode...');
      }
      this._initMockData();
    }
  }

  _initMockData() {
    const sampleTransactions = [
      {
        id: this._generateId(),
        date: '2025-06-01',
        amount: 3500.00,
        description: 'Software Development Consulting',
        category: 'Business Income',
        type: 'income',
        payee: 'Tech Corp Ltd',
        userId: 'dev-user-123',
        createdAt: new Date('2025-06-01'),
        updatedAt: new Date('2025-06-01')
      },
      {
        id: this._generateId(),
        date: '2025-06-02',
        amount: 85.50,
        description: 'Office Supplies - Staples',
        category: 'Office Expenses',
        type: 'expense',
        payee: 'Staples',
        userId: 'dev-user-123',
        createdAt: new Date('2025-06-02'),
        updatedAt: new Date('2025-06-02')
      },
      {
        id: this._generateId(),
        date: '2025-06-05',
        amount: 1250.00,
        description: 'Freelance Web Design Project',
        category: 'Business Income',
        type: 'income',
        payee: 'Creative Agency Inc',
        userId: 'dev-user-123',
        createdAt: new Date('2025-06-05'),
        updatedAt: new Date('2025-06-05')
      },
      {
        id: this._generateId(),
        date: '2025-06-08',
        amount: 45.00,
        description: 'Business Lunch - Client Meeting',
        category: 'Meals & Entertainment',
        type: 'expense',
        payee: 'Downtown Bistro',
        userId: 'dev-user-123',
        createdAt: new Date('2025-06-08'),
        updatedAt: new Date('2025-06-08')
      },
      {
        id: this._generateId(),
        date: '2025-06-10',
        amount: 120.00,
        description: 'Software License - Adobe Creative Suite',
        category: 'Software & Subscriptions',
        type: 'expense',
        payee: 'Adobe Systems',
        userId: 'dev-user-123',
        createdAt: new Date('2025-06-10'),
        updatedAt: new Date('2025-06-10')
      }
    ];

    this.mockData.transactions = sampleTransactions;
  }

  _generateId() {
    return `mock_${this.nextId++}_${Date.now()}`;
  }
  // Transaction operations - seamlessly handle both Firebase and mock
  async createTransaction(userId, transactionData) {
    if (this.useFirebase && this.firestoreEnabled) {
      try {
        const docRef = await this.db.collection('transactions').add({
          ...transactionData,
          userId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        const doc = await docRef.get();        console.log(`🔥 Firebase: Created transaction ${docRef.id}`);
        return { id: docRef.id, data: { id: docRef.id, ...doc.data() } };
      } catch (error) {
        console.error('Firebase createTransaction error:', error);
        // If Firestore fails, fall back to mock mode for this operation
        if (error.code === 7) {
          console.log('🎭 Falling back to mock mode for this transaction...');
          return this._createTransactionMock(userId, transactionData);
        }
        throw error;
      }
    } else {
      return this._createTransactionMock(userId, transactionData);
    }
  }

  _createTransactionMock(userId, transactionData) {
    // Mock implementation
    const id = this._generateId();
    const transaction = {
      id,
      ...transactionData,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.mockData.transactions.push(transaction);
    console.log(`🎭 Mock: Created transaction ${id}`);
    return { id, data: transaction };
  }
      const id = this._generateId();
      const transaction = {
        id,
        ...transactionData,
        userId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      this.mockData.transactions.push(transaction);
      console.log(`🎭 Mock: Created transaction ${id}`);
      return { id, data: transaction };
    }
  }

  async getTransactions(userId, filters = {}) {
    if (this.useFirebase) {
      try {
        let query = this.db.collection('transactions').where('userId', '==', userId);
        
        // Apply filters
        if (filters.startDate) {
          query = query.where('date', '>=', filters.startDate);
        }
        if (filters.endDate) {
          query = query.where('date', '<=', filters.endDate);
        }
        if (filters.category) {
          query = query.where('category', '==', filters.category);
        }
        if (filters.type) {
          query = query.where('type', '==', filters.type);
        }

        // Apply ordering
        const orderBy = filters.orderBy || 'date';
        const order = filters.order || 'desc';
        query = query.orderBy(orderBy, order);

        // Apply pagination
        const offset = parseInt(filters.offset) || 0;
        const limit = parseInt(filters.limit) || 50;
        if (offset > 0) {
          // For Firebase, we'd need to implement cursor-based pagination
          // For now, just apply limit
        }
        query = query.limit(limit);

        const snapshot = await query.get();
        const transactions = [];
        snapshot.forEach(doc => {
          transactions.push({ id: doc.id, ...doc.data() });
        });

        console.log(`🔥 Firebase: Retrieved ${transactions.length} transactions for user ${userId}`);
        return {
          transactions,
          total: transactions.length, // Note: Firebase doesn't provide total count easily
          hasMore: transactions.length === limit
        };
      } catch (error) {
        console.error('Firebase getTransactions error:', error);
        throw error;
      }
    } else {
      // Mock implementation (same as before)
      let transactions = this.mockData.transactions.filter(t => t.userId === userId);
      
      // Apply filters
      if (filters.startDate) {
        transactions = transactions.filter(t => new Date(t.date) >= new Date(filters.startDate));
      }
      if (filters.endDate) {
        transactions = transactions.filter(t => new Date(t.date) <= new Date(filters.endDate));
      }
      if (filters.category) {
        transactions = transactions.filter(t => t.category === filters.category);
      }
      if (filters.type) {
        transactions = transactions.filter(t => t.type === filters.type);
      }

      // Apply sorting
      const orderBy = filters.orderBy || 'date';
      const order = filters.order || 'desc';
      transactions.sort((a, b) => {
        const aVal = a[orderBy];
        const bVal = b[orderBy];
        if (order === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });

      // Apply pagination
      const offset = parseInt(filters.offset) || 0;
      const limit = parseInt(filters.limit) || 50;
      const paginatedTransactions = transactions.slice(offset, offset + limit);

      console.log(`🎭 Mock: Retrieved ${paginatedTransactions.length} transactions for user ${userId}`);
      return {
        transactions: paginatedTransactions,
        total: transactions.length,
        hasMore: offset + limit < transactions.length
      };
    }
  }

  async getTransactionById(userId, transactionId) {
    if (this.useFirebase) {
      try {
        const doc = await this.db.collection('transactions').doc(transactionId).get();
        
        if (!doc.exists) {
          throw new Error('Transaction not found');
        }

        const data = doc.data();
        if (data.userId !== userId) {
          throw new Error('Transaction not found');
        }

        console.log(`🔥 Firebase: Retrieved transaction ${transactionId}`);
        return { id: doc.id, ...data };
      } catch (error) {
        console.error('Firebase getTransactionById error:', error);
        throw error;
      }
    } else {
      // Mock implementation
      const transaction = this.mockData.transactions.find(
        t => t.id === transactionId && t.userId === userId
      );
      
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      console.log(`🎭 Mock: Retrieved transaction ${transactionId}`);
      return transaction;
    }
  }

  async updateTransaction(userId, transactionId, updateData) {
    if (this.useFirebase) {
      try {
        const docRef = this.db.collection('transactions').doc(transactionId);
        const doc = await docRef.get();

        if (!doc.exists) {
          throw new Error('Transaction not found');
        }

        const data = doc.data();
        if (data.userId !== userId) {
          throw new Error('Transaction not found');
        }

        await docRef.update({
          ...updateData,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const updatedDoc = await docRef.get();
        console.log(`🔥 Firebase: Updated transaction ${transactionId}`);
        return { id: updatedDoc.id, ...updatedDoc.data() };
      } catch (error) {
        console.error('Firebase updateTransaction error:', error);
        throw error;
      }
    } else {
      // Mock implementation
      const index = this.mockData.transactions.findIndex(
        t => t.id === transactionId && t.userId === userId
      );

      if (index === -1) {
        throw new Error('Transaction not found');
      }

      this.mockData.transactions[index] = {
        ...this.mockData.transactions[index],
        ...updateData,
        updatedAt: new Date()
      };

      console.log(`🎭 Mock: Updated transaction ${transactionId}`);
      return this.mockData.transactions[index];
    }
  }

  async deleteTransaction(userId, transactionId) {
    if (this.useFirebase) {
      try {
        const docRef = this.db.collection('transactions').doc(transactionId);
        const doc = await docRef.get();

        if (!doc.exists) {
          throw new Error('Transaction not found');
        }

        const data = doc.data();
        if (data.userId !== userId) {
          throw new Error('Transaction not found');
        }

        await docRef.delete();
        console.log(`🔥 Firebase: Deleted transaction ${transactionId}`);
        return { id: transactionId, ...data };
      } catch (error) {
        console.error('Firebase deleteTransaction error:', error);
        throw error;
      }
    } else {
      // Mock implementation
      const index = this.mockData.transactions.findIndex(
        t => t.id === transactionId && t.userId === userId
      );

      if (index === -1) {
        throw new Error('Transaction not found');
      }

      const deleted = this.mockData.transactions.splice(index, 1)[0];
      console.log(`🎭 Mock: Deleted transaction ${transactionId}`);
      return deleted;
    }
  }

  async getTransactionSummary(userId, filters = {}) {
    const { transactions } = await this.getTransactions(userId, filters);
    
    const summary = {
      totalIncome: 0,
      totalExpenses: 0,
      netIncome: 0,
      transactionCount: transactions.length,
      categories: {}
    };

    transactions.forEach(transaction => {
      const amount = parseFloat(transaction.amount);
      
      if (transaction.type === 'income') {
        summary.totalIncome += amount;
      } else if (transaction.type === 'expense') {
        summary.totalExpenses += amount;
      }

      // Category breakdown
      if (!summary.categories[transaction.category]) {
        summary.categories[transaction.category] = {
          total: 0,
          count: 0,
          type: transaction.type
        };
      }
      summary.categories[transaction.category].total += amount;
      summary.categories[transaction.category].count += 1;
    });

    summary.netIncome = summary.totalIncome - summary.totalExpenses;

    const mode = this.useFirebase ? 'Firebase' : 'Mock';
    console.log(`📊 ${mode}: Generated summary for user ${userId}`);
    return summary;
  }

  // Utility method to check if Firebase is available
  isUsingFirebase() {
    return this.useFirebase;
  }
}

// Create singleton instance
const hybridFirebaseService = new HybridFirebaseService();

export default hybridFirebaseService;
