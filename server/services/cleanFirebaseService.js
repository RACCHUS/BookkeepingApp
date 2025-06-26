// Clean Firebase service now that Firestore API is enabled
import admin from '../config/firebaseAdmin.js';

class FirebaseService {
  constructor() {
    this.isInitialized = false;
    this.mockData = {
      transactions: []
    };
    this.nextId = 1;
    
    if (admin) {
      try {
        this.db = admin.firestore();
        this.auth = admin.auth();
        this.isInitialized = true;
        console.log('🔥 FirebaseService: Initialized with Firestore and Auth');
        this._seedInitialData();
      } catch (error) {
        console.error('FirebaseService initialization error:', error);
        this.isInitialized = false;
        this._initMockData();
      }
    } else {
      console.log('🎭 FirebaseService: Running in mock mode');
      this._initMockData();
    }
  }
  async _seedInitialData() {
    try {
      console.log('🔥 Firebase: Checking for existing data...');
      // Check if we already have data
      const existingData = await this.db.collection('transactions').limit(1).get();
      if (!existingData.empty) {
        console.log('🔥 Firebase: Data already exists, skipping seed');
        return;
      }

      // Add some initial sample data to Firebase
      const sampleTransactions = [
        {
          date: '2025-06-01',
          amount: 3500.00,
          description: 'Software Development Consulting',
          category: 'Business Income',
          type: 'income',
          payee: 'Tech Corp Ltd',
          userId: 'dev-user-123'
        },
        {
          date: '2025-06-02',
          amount: 85.50,
          description: 'Office Supplies - Staples',
          category: 'Office Expenses',
          type: 'expense',
          payee: 'Staples',
          userId: 'dev-user-123'
        },
        {
          date: '2025-06-05',
          amount: 1250.00,
          description: 'Freelance Web Design Project',
          category: 'Business Income',
          type: 'income',
          payee: 'Creative Agency Inc',
          userId: 'dev-user-123'
        }
      ];

      const batch = this.db.batch();
      sampleTransactions.forEach(transaction => {
        const docRef = this.db.collection('transactions').doc();
        batch.set(docRef, {
          ...transaction,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });      await batch.commit();
      console.log('🔥 Firebase: Seeded initial sample data');
    } catch (error) {
      console.error('Error seeding initial data:', error);
      if (error.code === 5 || error.message.includes('NOT_FOUND')) {
        console.log('❌ Firestore database not found!');
        console.log('📋 To fix this:');
        console.log('   1. Go to https://console.firebase.google.com/');
        console.log('   2. Select your project: bookkeeping-app-12583');
        console.log('   3. Click "Firestore Database" in the sidebar');
        console.log('   4. Click "Create database"');
        console.log('   5. Choose "Start in test mode"');
        console.log('   6. Select a location and click "Done"');
        console.log('');
        console.log('🔄 Server will continue running with mock data until database is created.');
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
      }
    ];

    this.mockData.transactions = sampleTransactions;
  }

  _generateId() {
    return `mock_${this.nextId++}_${Date.now()}`;
  }

  async createTransaction(userId, transactionData) {
    if (this.isInitialized) {
      try {
        const docRef = await this.db.collection('transactions').add({
          ...transactionData,
          userId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        const doc = await docRef.get();
        const data = doc.data();
        console.log(`🔥 Firebase: Created transaction ${docRef.id}`);
        return { 
          id: docRef.id, 
          data: { 
            id: docRef.id, 
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date()
          } 
        };
      } catch (error) {
        console.error('Firebase createTransaction error:', error);
        throw error;
      }
    } else {
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
  }
  async getTransactions(userId, filters = {}) {
    if (this.isInitialized) {
      try {
        console.log(`🔥 Firebase: Querying transactions for userId: ${userId}`);
        
        // Start with simple query to avoid index requirements
        let query = this.db.collection('transactions').where('userId', '==', userId);
        
        // For development: also check for dev-user-123 transactions if user is authenticated
        let devQuery = null;
        if (userId !== 'dev-user-123') {
          devQuery = this.db.collection('transactions').where('userId', '==', 'dev-user-123');
        }
        
        const [snapshot, devSnapshot] = await Promise.all([
          query.get(),
          devQuery ? devQuery.get() : Promise.resolve({ empty: true, forEach: () => {} })
        ]);
        
        let transactions = [];
        
        // Get user's own transactions
        snapshot.forEach(doc => {
          const data = doc.data();
          transactions.push({ 
            id: doc.id, 
            ...data,
            // Convert Firestore timestamps to Date objects
            createdAt: data.createdAt?.toDate?.() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
          });
        });
        
        // If no transactions found for user, temporarily show dev transactions
        if (transactions.length === 0 && !devSnapshot.empty) {
          console.log('🔧 No transactions found for user, showing dev transactions as fallback');
          devSnapshot.forEach(doc => {
            const data = doc.data();
            transactions.push({ 
              id: doc.id, 
              ...data,
              // Mark these as dev transactions
              _isDevTransaction: true,
              // Convert Firestore timestamps to Date objects
              createdAt: data.createdAt?.toDate?.() || data.createdAt,
              updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
            });
          });
        }

        // Apply filters in memory for now
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

        // Apply sorting in memory
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

        // Apply pagination in memory
        const offset = parseInt(filters.offset) || 0;
        const limit = parseInt(filters.limit) || 50;
        const total = transactions.length;
        transactions = transactions.slice(offset, offset + limit);

        console.log(`🔥 Firebase: Retrieved ${transactions.length} of ${total} transactions for user ${userId}`);
        return {
          transactions,
          total: total,
          hasMore: offset + limit < total
        };
      } catch (error) {
        console.error('Firebase getTransactions error:', error);
        throw error;
      }
    } else {
      // Mock implementation
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
    if (this.isInitialized) {
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
        return { 
          id: doc.id, 
          ...data,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
        };
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
    if (this.isInitialized) {
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
        const updatedData = updatedDoc.data();
        console.log(`🔥 Firebase: Updated transaction ${transactionId}`);
        return { 
          id: updatedDoc.id, 
          ...updatedData,
          createdAt: updatedData.createdAt?.toDate?.() || updatedData.createdAt,
          updatedAt: updatedData.updatedAt?.toDate?.() || updatedData.updatedAt
        };
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
    if (this.isInitialized) {
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

    const mode = this.isInitialized ? 'Firebase' : 'Mock';
    console.log(`📊 ${mode}: Generated summary for user ${userId}`);
    return summary;
  }

  // Migration helper: Move dev transactions to authenticated user
  async migrateDevTransactions(newUserId) {
    if (!this.isInitialized || newUserId === 'dev-user-123') {
      return { migrated: 0, message: 'No migration needed' };
    }

    try {
      console.log(`🔄 Migrating dev transactions to user: ${newUserId}`);
      
      // Get all dev transactions
      const devQuery = this.db.collection('transactions').where('userId', '==', 'dev-user-123');
      const devSnapshot = await devQuery.get();
      
      if (devSnapshot.empty) {
        return { migrated: 0, message: 'No dev transactions to migrate' };
      }

      // Check if user already has transactions
      const userQuery = this.db.collection('transactions').where('userId', '==', newUserId).limit(1);
      const userSnapshot = await userQuery.get();
      
      if (!userSnapshot.empty) {
        console.log('🔄 User already has transactions, skipping migration');
        return { migrated: 0, message: 'User already has transactions' };
      }

      // Migrate transactions in batches
      const batch = this.db.batch();
      let migratedCount = 0;
      
      devSnapshot.forEach(doc => {
        const data = doc.data();
        const newDocRef = this.db.collection('transactions').doc();
        batch.set(newDocRef, {
          ...data,
          userId: newUserId,
          migratedFrom: 'dev-user-123',
          migratedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Delete the old dev transaction
        batch.delete(doc.ref);
        migratedCount++;
      });

      await batch.commit();
      console.log(`✅ Migrated ${migratedCount} transactions to user ${newUserId}`);
      
      return { 
        migrated: migratedCount, 
        message: `Successfully migrated ${migratedCount} transactions` 
      };
    } catch (error) {
      console.error('Migration error:', error);
      throw error;
    }
  }

  isUsingFirebase() {
    return this.isInitialized;
  }

  getStatus() {
    return {
      firebase_configured: !!admin,
      firestore_enabled: this.isInitialized,
      mode: this.isInitialized ? 'firebase' : 'mock'
    };
  }
}

// Create singleton instance
const firebaseService = new FirebaseService();

export default firebaseService;
