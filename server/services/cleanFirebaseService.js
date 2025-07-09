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
        // Note: Auto-seeding disabled to prevent unwanted sample data
        // this._seedInitialData();
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
    // Initialize with empty data instead of sample transactions
    this.mockData.transactions = [];
    console.log('🎭 Firebase: Initialized with empty mock data');
  }

  _generateId() {
    return `mock_${this.nextId++}_${Date.now()}`;
  }

  async createTransaction(userId, transactionData) {
    // Always ensure category is a string (never undefined/null)
    const safeTransactionData = {
      ...transactionData,
      category: typeof transactionData.category === 'string' ? transactionData.category : '',
    };
    if (this.isInitialized) {
      try {
        const docRef = await this.db.collection('transactions').add({
          ...safeTransactionData,
          userId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        // Patch the document to include its Firestore ID as a field
        await docRef.update({ id: docRef.id });
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
        ...safeTransactionData,
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
        // Only query the authenticated user's transactions (no dev fallback)
        let query = this.db.collection('transactions').where('userId', '==', userId);
        const snapshot = await query.get();
        let transactions = [];
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

        // Idempotent: If not found, treat as success
        if (!doc.exists) {
          console.log(`🔥 Firebase: Transaction ${transactionId} not found (already deleted)`);
          return { id: transactionId, deleted: true };
        }

        const data = doc.data();
        if (data.userId !== userId) {
          // Idempotent: If not owned by user, treat as success
          console.log(`🔥 Firebase: Transaction ${transactionId} not owned by user (already deleted)`);
          return { id: transactionId, deleted: true };
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

      // Idempotent: If not found, treat as success
      if (index === -1) {
        console.log(`🎭 Mock: Transaction ${transactionId} not found (already deleted)`);
        return { id: transactionId, deleted: true };
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

  // Upload management methods
  async createUploadRecord(userId, uploadData) {
    if (!this.isInitialized) {
      console.log('📁 Mock: Creating upload record');
      return { id: uploadData.id, ...uploadData };
    }

    try {
      const uploadRef = this.db.collection('uploads').doc(uploadData.id);
      const uploadRecord = {
        ...uploadData,
        userId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      await uploadRef.set(uploadRecord);
      console.log(`✅ Created upload record: ${uploadData.id}`);
      return { id: uploadData.id, ...uploadRecord };
    } catch (error) {
      console.error('Error creating upload record:', error);
      throw error;
    }
  }

  async getUploads(userId, filters = {}) {
    if (!this.isInitialized) {
      console.log('📁 Mock: Getting uploads');
      return [];
    }

    try {
      let query = this.db.collection('uploads').where('userId', '==', userId);
      
      // Apply company filter
      if (filters.companyId) {
        query = query.where('companyId', '==', filters.companyId);
      }
      
      // Apply sorting
      const sortBy = filters.sortBy || 'uploadedAt';
      const sortOrder = filters.sortOrder || 'desc';
      query = query.orderBy(sortBy, sortOrder);
      
      const snapshot = await query.get();
      const uploads = [];
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        // Convert Firestore timestamps to ISO strings
        const upload = {
          id: doc.id,
          ...data,
          uploadedAt: data.uploadedAt?.toDate?.()?.toISOString() || data.uploadedAt,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
        };
        uploads.push(upload);
      }
      
      return uploads;
    } catch (error) {
      console.error('Error getting uploads:', error);
      
      // Check if this is an index-related error
      if (error.code === 9 || error.message?.includes('index') || error.message?.includes('composite index')) {
        console.warn('🔍 Firestore Index Required for uploads query:', {
          operation: 'getUploads',
          error: error.message,
          recommendation: 'Create a composite index for collection "uploads" with fields: userId (asc), uploadedAt (desc)'
        });
        
        // Extract index creation URL if available
        const urlMatch = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]+/);
        if (urlMatch) {
          console.warn('🔧 Create index at:', urlMatch[0]);
        }
      }
      
      throw error;
    }
  }

  async getUploadById(userId, uploadId) {
    if (!this.isInitialized) {
      console.log('📁 Mock: Getting upload by ID');
      return null;
    }

    try {
      const uploadRef = this.db.collection('uploads').doc(uploadId);
      const doc = await uploadRef.get();
      
      if (!doc.exists) {
        return null;
      }
      
      const data = doc.data();
      
      // Verify ownership
      if (data.userId !== userId) {
        throw new Error('Access denied: Upload belongs to another user');
      }
      
      return {
        id: doc.id,
        ...data,
        uploadedAt: data.uploadedAt?.toDate?.()?.toISOString() || data.uploadedAt,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
      };
    } catch (error) {
      console.error('Error getting upload by ID:', error);
      throw error;
    }
  }

  async updateUpload(userId, uploadId, updates) {
    if (!this.isInitialized) {
      console.log('📁 Mock: Updating upload');
      return { id: uploadId, ...updates };
    }

    try {
      const uploadRef = this.db.collection('uploads').doc(uploadId);
      
      // Verify ownership first
      const doc = await uploadRef.get();
      if (!doc.exists) {
        throw new Error('Upload not found');
      }
      
      if (doc.data().userId !== userId) {
        throw new Error('Access denied: Upload belongs to another user');
      }
      
      const updateData = {
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      await uploadRef.update(updateData);
      console.log(`✅ Updated upload: ${uploadId}`);
      
      // Return updated data
      const updatedDoc = await uploadRef.get();
      const data = updatedDoc.data();
      return {
        id: uploadId,
        ...data,
        uploadedAt: data.uploadedAt?.toDate?.()?.toISOString() || data.uploadedAt,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
      };
    } catch (error) {
      console.error('Error updating upload:', error);
      throw error;
    }
  }

  async deleteUpload(userId, uploadId) {
    if (!this.isInitialized) {
      console.log('📁 Mock: Deleting upload');
      return { deleted: true };
    }

    try {
      const uploadRef = this.db.collection('uploads').doc(uploadId);
      
      // Verify ownership first
      const doc = await uploadRef.get();
      if (!doc.exists) {
        throw new Error('Upload not found');
      }
      
      if (doc.data().userId !== userId) {
        throw new Error('Access denied: Upload belongs to another user');
      }
      
      await uploadRef.delete();
      console.log(`✅ Deleted upload: ${uploadId}`);
      return { deleted: true };
    } catch (error) {
      console.error('Error deleting upload:', error);
      throw error;
    }
  }

  async getTransactionsByUploadId(userId, uploadId) {
    if (!this.isInitialized) {
      console.log('📁 Mock: Getting transactions by upload ID');
      return [];
    }

    try {
      console.log(`🔍 Querying transactions for uploadId: ${uploadId}, userId: ${userId}`);
      
      const query = this.db.collection('transactions')
        .where('userId', '==', userId)
        .where('statementId', '==', uploadId)
        .orderBy('date', 'desc');
      
      const snapshot = await query.get();
      console.log(`📊 Found ${snapshot.size} transactions for upload ${uploadId}`);
      
      const transactions = [];
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`📄 Transaction ${doc.id}: statementId=${data.statementId}, amount=${data.amount}`);
        transactions.push({
          id: doc.id,
          ...data,
          date: data.date?.toDate?.()?.toISOString()?.split('T')[0] || data.date,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
        });
      });
      
      return transactions;
    } catch (error) {
      console.error('Error getting transactions by upload ID:', error);
      throw error;
    }
  }

  async deleteTransactionsByUploadId(userId, uploadId) {
    if (!this.isInitialized) {
      console.log('📁 Mock: Deleting transactions by upload ID');
      return 0;
    }

    try {
      const query = this.db.collection('transactions')
        .where('userId', '==', userId)
        .where('uploadId', '==', uploadId);
      
      const snapshot = await query.get();
      const batch = this.db.batch();
      
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log(`✅ Deleted ${snapshot.size} transactions for upload: ${uploadId}`);
      return snapshot.size;
    } catch (error) {
      console.error('Error deleting transactions by upload ID:', error);
      throw error;
    }
  }

  // === PAYEE MANAGEMENT METHODS ===

  /**
   * Assign payee to a transaction
   */
  async assignPayeeToTransaction(userId, transactionId, payeeId, payeeName) {
    try {
      if (!this.isInitialized) {
        throw new Error('Firebase not initialized - cannot assign payee to transaction');
      }

      const transactionRef = this.db.collection('transactions').doc(transactionId);
      const transactionDoc = await transactionRef.get();

      if (!transactionDoc.exists) {
        throw new Error('Transaction not found');
      }

      const transactionData = transactionDoc.data();
      if (transactionData.userId !== userId) {
        throw new Error('Unauthorized access to transaction');
      }

      // Update transaction with payee information
      await transactionRef.update({
        payeeId: payeeId,
        payee: payeeName,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastModifiedBy: userId
      });

      return {
        success: true,
        id: transactionId
      };
    } catch (error) {
      console.error('Error assigning payee to transaction:', error);
      throw error;
    }
  }

  /**
   * Bulk assign payee to multiple transactions
   */
  async bulkAssignPayeeToTransactions(userId, transactionIds, payeeId, payeeName) {
    try {
      if (!this.isInitialized) {
        throw new Error('Firebase not initialized - cannot bulk assign payee');
      }

      const batch = this.db.batch();
      const results = [];

      for (const transactionId of transactionIds) {
        const transactionRef = this.db.collection('transactions').doc(transactionId);
        const transactionDoc = await transactionRef.get();

        if (!transactionDoc.exists) {
          results.push({ id: transactionId, success: false, error: 'Transaction not found' });
          continue;
        }

        const transactionData = transactionDoc.data();
        if (transactionData.userId !== userId) {
          results.push({ id: transactionId, success: false, error: 'Unauthorized access' });
          continue;
        }

        batch.update(transactionRef, {
          payeeId: payeeId,
          payee: payeeName,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastModifiedBy: userId
        });

        results.push({ id: transactionId, success: true });
      }

      await batch.commit();

      return {
        success: true,
        results,
        updatedCount: results.filter(r => r.success).length
      };
    } catch (error) {
      console.error('Error bulk assigning payee:', error);
      throw error;
    }
  }

  /**
   * Get transactions by payee
   */
  async getTransactionsByPayee(userId, payeeId, filters = {}) {
    try {
      if (!this.isInitialized) {
        throw new Error('Firebase not initialized - cannot get transactions by payee');
      }

      let query = this.db.collection('transactions')
        .where('userId', '==', userId)
        .where('payeeId', '==', payeeId);

      // Apply date filters if provided
      if (filters.startDate) {
        query = query.where('date', '>=', filters.startDate);
      }
      if (filters.endDate) {
        query = query.where('date', '<=', filters.endDate);
      }

      // Order by date descending
      query = query.orderBy('date', 'desc');

      const snapshot = await query.get();
      const transactions = [];

      snapshot.forEach(doc => {
        transactions.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return transactions;
    } catch (error) {
      console.error('Error getting transactions by payee:', error);
      throw error;
    }
  }

  /**
   * Get payee summary with total payments and transaction count
   */
  async getPayeeSummary(userId, payeeId, year = null) {
    try {
      if (!this.isInitialized) {
        throw new Error('Firebase not initialized - cannot get payee summary');
      }

      let query = this.db.collection('transactions')
        .where('userId', '==', userId)
        .where('payeeId', '==', payeeId);

      // Filter by year if provided
      if (year) {
        const startDate = new Date(`${year}-01-01`);
        const endDate = new Date(`${year}-12-31`);
        query = query.where('date', '>=', startDate).where('date', '<=', endDate);
      }

      const snapshot = await query.get();
      
      let totalPaid = 0;
      let transactionCount = 0;
      let lastPaymentDate = null;
      let lastPaymentAmount = 0;

      snapshot.forEach(doc => {
        const transaction = doc.data();
        const transactionDate = new Date(transaction.date);
        
        if (transaction.type === 'expense') {
          totalPaid += transaction.amount;
        }
        
        transactionCount++;
        
        if (!lastPaymentDate || transactionDate > lastPaymentDate) {
          lastPaymentDate = transactionDate;
          lastPaymentAmount = transaction.amount;
        }
      });

      return {
        payeeId,
        totalPaid,
        transactionCount,
        lastPaymentDate,
        lastPaymentAmount,
        year: year || 'all'
      };
    } catch (error) {
      console.error('Error getting payee summary:', error);
      throw error;
    }
  }

  /**
   * Get uncategorized transactions for a user (category is empty string or 'Uncategorized')
   * @param {string} userId
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async getUncategorizedTransactions(userId, limit = 50) {
    if (!this.isInitialized) {
      // Mock mode: filter mock transactions
      return this.mockData.transactions
        .filter(t => t.userId === userId && (!t.category || t.category === '' || t.category === 'Uncategorized'))
        .slice(0, limit);
    }
    try {
      // Try Firestore compound query first
      let query = this.db.collection('transactions')
        .where('userId', '==', userId)
        .where('category', 'in', ['', 'Uncategorized'])
        .orderBy('date', 'desc')
        .limit(limit);
      let snapshot;
      try {
        snapshot = await query.get();
      } catch (err) {
        // Fallback: Firestore may not support 'in' queries on category if not indexed
        query = this.db.collection('transactions')
          .where('userId', '==', userId)
          .orderBy('date', 'desc')
          .limit(limit * 2);
        snapshot = await query.get();
        // Filter manually
        return snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(t => !t.category || t.category === '' || t.category === 'Uncategorized')
          .slice(0, limit);
      }
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting uncategorized transactions:', error);
      return [];
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
