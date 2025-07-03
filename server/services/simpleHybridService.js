// Simple hybrid service that falls back to mock mode when Firestore is disabled
import admin from '../config/firebaseAdmin.js';

class SimpleHybridService {
  constructor() {
    this.useFirebase = false;
    this.mockData = {
      transactions: [],
      users: {}
    };
    this.nextId = 1;
    
    // Initialize mock data
    this._initMockData();
    
    // Try to enable Firebase
    if (admin) {
      this._testFirebase();
    } else {
      console.log('🎭 SimpleHybridService: Firebase not configured, using mock mode');
    }
  }

  async _testFirebase() {
    try {
      // Test Firestore with a simple operation
      const db = admin.firestore();
      await db.collection('_test').limit(1).get();
      
      this.useFirebase = true;
      this.db = db;
      this.auth = admin.auth();
      console.log('🔥 SimpleHybridService: Firebase enabled successfully');
    } catch (error) {
      this.useFirebase = false;
      if (error.code === 7) {
        console.log('⚠️  SimpleHybridService: Firestore API disabled - using mock mode');
        console.log('   Enable at: https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=bookkeeping-app-12583');
      } else {
        console.log('⚠️  SimpleHybridService: Firebase error - using mock mode:', error.message);
      }
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
  // All methods now properly use Firebase when available
  async createTransaction(userId, transactionData) {
    if (this.useFirebase) {
      try {
        const docRef = await this.db.collection('transactions').add({
          ...transactionData,
          userId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        const doc = await docRef.get();
        console.log(`🔥 Firebase: Created transaction ${docRef.id}`);
        return { id: docRef.id, data: { id: docRef.id, ...doc.data() } };
      } catch (error) {
        console.error('Firebase createTransaction error:', error);
        throw error;
      }
    } else {
      return this._createMockTransaction(userId, transactionData);
    }
  }

  _createMockTransaction(userId, transactionData) {
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
        const limit = parseInt(filters.limit) || 50;
        query = query.limit(limit);

        const snapshot = await query.get();
        const transactions = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          transactions.push({ 
            id: doc.id, 
            ...data,
            // Convert Firestore timestamps to ISO strings
            createdAt: data.createdAt?.toDate?.() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
          });
        });

        console.log(`🔥 Firebase: Retrieved ${transactions.length} transactions for user ${userId}`);
        return {
          transactions,
          total: transactions.length,
          hasMore: transactions.length === limit
        };
      } catch (error) {
        console.error('Firebase getTransactions error:', error);
        throw error;
      }
    } else {
      return this._getMockTransactions(userId, filters);
    }
  }

  _getMockTransactions(userId, filters = {}) {
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

    const mode = this.useFirebase ? 'Firebase (Mock)' : 'Mock';
    console.log(`🎭 ${mode}: Retrieved ${paginatedTransactions.length} transactions for user ${userId}`);
    return {
      transactions: paginatedTransactions,
      total: transactions.length,
      hasMore: offset + limit < transactions.length
    };
  }

  async getTransactionById(userId, transactionId) {
    const transaction = this.mockData.transactions.find(
      t => t.id === transactionId && t.userId === userId
    );
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    const mode = this.useFirebase ? 'Firebase (Mock)' : 'Mock';
    console.log(`🎭 ${mode}: Retrieved transaction ${transactionId}`);
    return transaction;
  }

  async updateTransaction(userId, transactionId, updateData) {
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

    const mode = this.useFirebase ? 'Firebase (Mock)' : 'Mock';
    console.log(`🎭 ${mode}: Updated transaction ${transactionId}`);
    return this.mockData.transactions[index];
  }

  async deleteTransaction(userId, transactionId) {
    const index = this.mockData.transactions.findIndex(
      t => t.id === transactionId && t.userId === userId
    );

    if (index === -1) {
      throw new Error('Transaction not found');
    }

    const deleted = this.mockData.transactions.splice(index, 1)[0];
    const mode = this.useFirebase ? 'Firebase (Mock)' : 'Mock';
    console.log(`🎭 ${mode}: Deleted transaction ${transactionId}`);
    return deleted;
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

    const mode = this.useFirebase ? 'Firebase (Mock)' : 'Mock';
    console.log(`📊 ${mode}: Generated summary for user ${userId}`);
    return summary;
  }

  isUsingFirebase() {
    return this.useFirebase;
  }

  getStatus() {
    return {
      firebase_configured: !!admin,
      firestore_enabled: this.useFirebase,
      mode: this.useFirebase ? 'firebase_mock' : 'mock_only'
    };
  }
}

// Create singleton instance
const simpleHybridService = new SimpleHybridService();

export default simpleHybridService;
