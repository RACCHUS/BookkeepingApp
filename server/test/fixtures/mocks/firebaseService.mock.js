/**
 * @fileoverview Mock Firebase Service for Testing
 * @description Provides mock implementation of Firebase operations for unit testing
 */

/**
 * Mock Firestore database
 */
class MockFirestore {
  constructor() {
    this.collections = new Map();
  }

  collection(name) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new MockCollection(name));
    }
    return this.collections.get(name);
  }

  /**
   * Reset all collections (useful between tests)
   */
  reset() {
    this.collections.clear();
  }

  /**
   * Seed collection with test data
   */
  seed(collectionName, data) {
    const collection = this.collection(collectionName);
    collection.seed(data);
  }
}

/**
 * Mock Firestore Collection
 */
class MockCollection {
  constructor(name) {
    this.name = name;
    this.documents = new Map();
    this.queries = [];
  }

  doc(id) {
    return new MockDocumentReference(this, id);
  }

  add(data) {
    const id = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const docData = {
      ...data,
      createdAt: new Date(),
      id
    };
    this.documents.set(id, docData);
    return Promise.resolve({ id, ...docData });
  }

  where(field, op, value) {
    this.queries.push({ field, op, value });
    return this;
  }

  orderBy(field, direction = 'asc') {
    this.queries.push({ orderBy: field, direction });
    return this;
  }

  limit(count) {
    this.queries.push({ limit: count });
    return this;
  }

  async get() {
    let docs = Array.from(this.documents.values());

    // Apply where clauses
    this.queries.forEach(query => {
      if (query.field) {
        docs = docs.filter(doc => {
          const docValue = doc[query.field];
          switch (query.op) {
            case '==':
              return docValue === query.value;
            case '!=':
              return docValue !== query.value;
            case '>':
              return docValue > query.value;
            case '>=':
              return docValue >= query.value;
            case '<':
              return docValue < query.value;
            case '<=':
              return docValue <= query.value;
            case 'in':
              return query.value.includes(docValue);
            case 'array-contains':
              return Array.isArray(docValue) && docValue.includes(query.value);
            default:
              return true;
          }
        });
      }

      // Apply orderBy
      if (query.orderBy) {
        docs.sort((a, b) => {
          const aVal = a[query.orderBy];
          const bVal = b[query.orderBy];
          if (query.direction === 'desc') {
            return bVal > aVal ? 1 : -1;
          }
          return aVal > bVal ? 1 : -1;
        });
      }

      // Apply limit
      if (query.limit) {
        docs = docs.slice(0, query.limit);
      }
    });

    // Reset queries for next call
    this.queries = [];

    return {
      docs: docs.map(data => new MockDocumentSnapshot(data)),
      empty: docs.length === 0,
      size: docs.length
    };
  }

  seed(dataArray) {
    dataArray.forEach(data => {
      const id = data.id || `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.documents.set(id, { ...data, id });
    });
  }
}

/**
 * Mock Document Reference
 */
class MockDocumentReference {
  constructor(collection, id) {
    this.collection = collection;
    this.id = id;
  }

  async get() {
    const data = this.collection.documents.get(this.id);
    return new MockDocumentSnapshot(data || null);
  }

  async set(data, options = {}) {
    const existing = this.collection.documents.get(this.id) || {};
    const newData = options.merge
      ? { ...existing, ...data }
      : { ...data, id: this.id };
    
    this.collection.documents.set(this.id, newData);
    return Promise.resolve();
  }

  async update(data) {
    const existing = this.collection.documents.get(this.id);
    if (!existing) {
      throw new Error(`Document ${this.id} not found`);
    }
    const updated = {
      ...existing,
      ...data,
      updatedAt: new Date()
    };
    this.collection.documents.set(this.id, updated);
    return Promise.resolve();
  }

  async delete() {
    this.collection.documents.delete(this.id);
    return Promise.resolve();
  }
}

/**
 * Mock Document Snapshot
 */
class MockDocumentSnapshot {
  constructor(data) {
    this._data = data;
    this.exists = data !== null;
    this.id = data ? data.id : null;
  }

  data() {
    return this._data;
  }
}

/**
 * Mock Firebase Service
 */
class MockFirebaseService {
  constructor() {
    this.db = new MockFirestore();
    this.isInitialized = true;
  }

  /**
   * Classification Rules
   */
  async getClassificationRules(userId) {
    const snapshot = await this.db.collection('classificationRules')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => doc.data());
  }

  async createClassificationRule(userId, ruleData) {
    const data = {
      userId,
      ...ruleData,
      createdAt: new Date()
    };
    const result = await this.db.collection('classificationRules').add(data);
    return result.id;
  }

  async updateClassificationRule(userId, ruleId, ruleData) {
    await this.db.collection('classificationRules').doc(ruleId).update({
      ...ruleData,
      updatedAt: new Date()
    });
  }

  async deleteClassificationRule(userId, ruleId) {
    await this.db.collection('classificationRules').doc(ruleId).delete();
  }

  /**
   * Transactions
   */
  async getTransactions(userId, filters = {}) {
    let query = this.db.collection('transactions')
      .where('userId', '==', userId);

    if (filters.startDate) {
      query = query.where('date', '>=', filters.startDate);
    }
    if (filters.endDate) {
      query = query.where('date', '<=', filters.endDate);
    }
    if (filters.category) {
      query = query.where('category', '==', filters.category);
    }
    if (filters.companyId) {
      query = query.where('companyId', '==', filters.companyId);
    }
    if (filters.orderBy) {
      query = query.orderBy(filters.orderBy, filters.order || 'desc');
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => doc.data());
  }

  async createTransaction(userId, transactionData) {
    const data = {
      userId,
      ...transactionData,
      createdAt: new Date()
    };
    const result = await this.db.collection('transactions').add(data);
    return result.id;
  }

  async updateTransaction(userId, transactionId, transactionData) {
    await this.db.collection('transactions').doc(transactionId).update({
      ...transactionData,
      updatedAt: new Date()
    });
  }

  async deleteTransaction(userId, transactionId) {
    await this.db.collection('transactions').doc(transactionId).delete();
  }

  /**
   * Upload Records
   */
  async getUploadRecords(userId) {
    const snapshot = await this.db.collection('uploads')
      .where('uploadedBy', '==', userId)
      .orderBy('uploadedAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => doc.data());
  }

  async createUploadRecord(userId, uploadData) {
    const data = {
      uploadedBy: userId,
      ...uploadData,
      createdAt: new Date()
    };
    const result = await this.db.collection('uploads').add(data);
    return result.id;
  }

  async getUploadById(userId, uploadId) {
    const doc = await this.db.collection('uploads').doc(uploadId).get();
    return doc.exists ? doc.data() : null;
  }

  async updateUploadRecord(userId, uploadId, uploadData) {
    await this.db.collection('uploads').doc(uploadId).update({
      ...uploadData,
      updatedAt: new Date()
    });
  }

  async deleteUploadRecord(userId, uploadId) {
    await this.db.collection('uploads').doc(uploadId).delete();
  }

  /**
   * Companies
   */
  async getCompanies(userId) {
    const snapshot = await this.db.collection('companies')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => doc.data());
  }

  async createCompany(userId, companyData) {
    const data = {
      userId,
      ...companyData,
      createdAt: new Date()
    };
    const result = await this.db.collection('companies').add(data);
    return result.id;
  }

  async updateCompany(userId, companyId, companyData) {
    await this.db.collection('companies').doc(companyId).update({
      ...companyData,
      updatedAt: new Date()
    });
  }

  async deleteCompany(userId, companyId) {
    await this.db.collection('companies').doc(companyId).delete();
  }

  /**
   * Utility Methods
   */
  reset() {
    this.db.reset();
  }

  seed(collectionName, data) {
    this.db.seed(collectionName, data);
  }
}

// Export mock service
export default new MockFirebaseService();

// Also export class for creating new instances if needed
export { MockFirebaseService, MockFirestore };
