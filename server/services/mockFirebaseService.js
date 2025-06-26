// Mock Firebase service that works with or without Firebase
class MockFirebaseService {
  constructor() {
    this.mockData = {
      transactions: [],
      users: {}
    };
    this.nextId = 1;
    this._initSampleData();
    console.log('🎭 MockFirebaseService: Initialized in mock mode with sample data');
  }

  // Initialize with some sample data
  _initSampleData() {
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

  // Generate mock ID
  _generateId() {
    return `mock_${this.nextId++}_${Date.now()}`;
  }

  // Transaction operations
  async createTransaction(userId, transactionData) {
    const id = this._generateId();
    const transaction = {
      id,
      ...transactionData,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.mockData.transactions.push(transaction);
    console.log(`📝 Mock: Created transaction ${id}`);
    return { id, data: transaction };
  }

  async getTransactions(userId, filters = {}) {
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

    console.log(`📋 Mock: Retrieved ${paginatedTransactions.length} transactions for user ${userId}`);
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

    console.log(`📄 Mock: Retrieved transaction ${transactionId}`);
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

    console.log(`✏️ Mock: Updated transaction ${transactionId}`);
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
    console.log(`🗑️ Mock: Deleted transaction ${transactionId}`);
    return deleted;
  }

  async bulkUpdateTransactions(userId, updates) {
    const results = [];
    for (const update of updates) {
      try {
        const result = await this.updateTransaction(userId, update.id, update.data);
        results.push(result);
      } catch (error) {
        console.error(`Failed to update transaction ${update.id}:`, error.message);
      }
    }
    console.log(`📦 Mock: Bulk updated ${results.length} transactions`);
    return results;
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

    console.log(`📊 Mock: Generated summary for user ${userId}`);
    return summary;
  }
}

// Firebase service that tries real Firebase first, falls back to mock
let firebaseService = null;

const getFirebaseService = async () => {
  if (firebaseService) {
    return firebaseService;
  }

  try {
    // Try to import real Firebase service
    const FirebaseServiceModule = await import('./firebaseService.js');
    const FirebaseService = FirebaseServiceModule.default;
    firebaseService = new FirebaseService();
    console.log('✅ Using real FirebaseService');
    return firebaseService;
  } catch (error) {
    // Fallback to mock service
    console.log('🎭 Firebase not available, using MockFirebaseService');
    firebaseService = new MockFirebaseService();
    return firebaseService;
  }
};

export default getFirebaseService;
