/**
 * @fileoverview Storage Service - Hybrid Firebase + Cloudinary storage
 * @description Manages file uploads with automatic failover between Firebase and Cloudinary
 * @version 1.0.0
 */

import { getStorage, getDownloadURL } from 'firebase-admin/storage';
import { v2 as cloudinary } from 'cloudinary';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/index.js';
import { STORAGE_PROVIDERS, MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from '../../shared/schemas/receiptSchema.js';

// Storage usage threshold for switching to Cloudinary (80%)
const FIREBASE_USAGE_THRESHOLD = 0.8;
const FIREBASE_FREE_TIER_BYTES = 5 * 1024 * 1024 * 1024; // 5GB

/**
 * Storage Service - Manages file storage with automatic failover
 * Uses Firebase Storage as primary, Cloudinary as backup
 */
class StorageService {
  constructor() {
    this.firebaseStorage = null;
    this.cloudinaryConfigured = false;
    this.estimatedFirebaseUsage = 0;
    
    this._initializeFirebase();
    this._initializeCloudinary();
  }

  /**
   * Initialize Firebase Storage
   */
  _initializeFirebase() {
    try {
      this.firebaseStorage = getStorage();
      logger.info('📦 StorageService: Firebase Storage initialized');
    } catch (error) {
      logger.warn('⚠️ StorageService: Firebase Storage not available:', error.message);
    }
  }

  /**
   * Initialize Cloudinary with environment variables
   */
  _initializeCloudinary() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true
      });
      this.cloudinaryConfigured = true;
      logger.info('☁️ StorageService: Cloudinary initialized');
    } else {
      logger.warn('⚠️ StorageService: Cloudinary not configured (missing env vars)');
    }
  }

  /**
   * Validate file before upload
   * @param {Object} file - File object with buffer, mimetype, size
   * @returns {Object} { valid: boolean, error?: string }
   */
  validateFile(file) {
    if (!file) {
      return { valid: false, error: 'No file provided' };
    }

    if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
      return { 
        valid: false, 
        error: `Invalid file type. Allowed: ${ALLOWED_FILE_TYPES.join(', ')}` 
      };
    }

    if (file.size > MAX_FILE_SIZE) {
      return { 
        valid: false, 
        error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
      };
    }

    return { valid: true };
  }

  /**
   * Check if Firebase Storage should be used based on capacity
   * @returns {Promise<boolean>}
   */
  async shouldUseFirebase() {
    if (!this.firebaseStorage) {
      return false;
    }

    // If Cloudinary is not configured, must use Firebase
    if (!this.cloudinaryConfigured) {
      return true;
    }

    // Check estimated usage
    const usageRatio = this.estimatedFirebaseUsage / FIREBASE_FREE_TIER_BYTES;
    return usageRatio < FIREBASE_USAGE_THRESHOLD;
  }

  /**
   * Upload file to appropriate storage provider
   * @param {string} userId - User ID for organizing files
   * @param {Object} file - File object with buffer, mimetype, originalname, size
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} { url, fileId, storageProvider, thumbnailUrl? }
   */
  async uploadFile(userId, file, options = {}) {
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const useFirebase = await this.shouldUseFirebase();

    if (useFirebase) {
      return this._uploadToFirebase(userId, file, options);
    } else if (this.cloudinaryConfigured) {
      return this._uploadToCloudinary(userId, file, options);
    } else {
      throw new Error('No storage provider available');
    }
  }

  /**
   * Upload file to Firebase Storage
   * @private
   */
  async _uploadToFirebase(userId, file, options = {}) {
    try {
      const bucket = this.firebaseStorage.bucket();
      const fileId = uuidv4();
      const extension = this._getExtension(file.originalname || file.filename || 'file');
      const filePath = `users/${userId}/receipts/${fileId}${extension}`;
      
      const fileRef = bucket.file(filePath);
      
      await fileRef.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
          metadata: {
            originalName: file.originalname || file.filename,
            uploadedAt: new Date().toISOString(),
            userId
          }
        }
      });

      // Make file publicly accessible
      await fileRef.makePublic();

      const url = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

      // Update estimated usage
      this.estimatedFirebaseUsage += file.size;

      logger.info(`✅ Uploaded to Firebase: ${filePath}`);

      return {
        url,
        fileId: filePath,
        storageProvider: STORAGE_PROVIDERS.FIREBASE,
        thumbnailUrl: null // Firebase doesn't generate thumbnails
      };
    } catch (error) {
      logger.error('Firebase upload failed:', error);
      
      // Fallback to Cloudinary if available
      if (this.cloudinaryConfigured) {
        logger.info('Falling back to Cloudinary...');
        return this._uploadToCloudinary(userId, file, options);
      }
      
      throw error;
    }
  }

  /**
   * Upload file to Cloudinary
   * @private
   */
  async _uploadToCloudinary(userId, file, options = {}) {
    try {
      const fileId = uuidv4();
      
      // Convert buffer to base64 data URI
      const base64 = file.buffer.toString('base64');
      const dataUri = `data:${file.mimetype};base64,${base64}`;

      const uploadOptions = {
        public_id: `receipts/${userId}/${fileId}`,
        folder: 'bookkeeping-receipts',
        resource_type: 'auto',
        tags: ['receipt', userId],
        context: {
          userId,
          originalName: file.originalname || file.filename,
          uploadedAt: new Date().toISOString()
        }
      };

      // Add image-specific transformations
      if (file.mimetype.startsWith('image/')) {
        uploadOptions.transformation = [
          { quality: 'auto:good', fetch_format: 'auto' }
        ];
      }

      const result = await cloudinary.uploader.upload(dataUri, uploadOptions);

      // Generate thumbnail URL for images
      let thumbnailUrl = null;
      if (file.mimetype.startsWith('image/')) {
        thumbnailUrl = cloudinary.url(result.public_id, {
          width: 150,
          height: 150,
          crop: 'fill',
          quality: 'auto',
          fetch_format: 'auto'
        });
      }

      logger.info(`✅ Uploaded to Cloudinary: ${result.public_id}`);

      return {
        url: result.secure_url,
        fileId: result.public_id,
        storageProvider: STORAGE_PROVIDERS.CLOUDINARY,
        thumbnailUrl
      };
    } catch (error) {
      logger.error('Cloudinary upload failed:', error);
      throw error;
    }
  }

  /**
   * Delete file from storage
   * @param {string} fileId - File ID or path
   * @param {string} storageProvider - 'firebase' or 'cloudinary'
   * @returns {Promise<boolean>} Success status
   */
  async deleteFile(fileId, storageProvider) {
    if (!fileId || storageProvider === STORAGE_PROVIDERS.NONE) {
      return true; // Nothing to delete
    }

    try {
      if (storageProvider === STORAGE_PROVIDERS.FIREBASE) {
        return this._deleteFromFirebase(fileId);
      } else if (storageProvider === STORAGE_PROVIDERS.CLOUDINARY) {
        return this._deleteFromCloudinary(fileId);
      }
      
      logger.warn(`Unknown storage provider: ${storageProvider}`);
      return false;
    } catch (error) {
      logger.error(`Failed to delete file ${fileId} from ${storageProvider}:`, error);
      return false;
    }
  }

  /**
   * Delete file from Firebase Storage
   * @private
   */
  async _deleteFromFirebase(fileId) {
    try {
      const bucket = this.firebaseStorage.bucket();
      const file = bucket.file(fileId);
      
      const [exists] = await file.exists();
      if (exists) {
        await file.delete();
        // Update estimated usage (approximate)
        this.estimatedFirebaseUsage = Math.max(0, this.estimatedFirebaseUsage - 1024 * 1024);
        logger.info(`🗑️ Deleted from Firebase: ${fileId}`);
      }
      
      return true;
    } catch (error) {
      logger.error('Firebase delete failed:', error);
      throw error;
    }
  }

  /**
   * Delete file from Cloudinary
   * @private
   */
  async _deleteFromCloudinary(fileId) {
    try {
      const result = await cloudinary.uploader.destroy(fileId, {
        resource_type: 'auto'
      });
      
      logger.info(`🗑️ Deleted from Cloudinary: ${fileId} (${result.result})`);
      return result.result === 'ok';
    } catch (error) {
      logger.error('Cloudinary delete failed:', error);
      throw error;
    }
  }

  /**
   * Get storage usage statistics
   * @returns {Object} Storage statistics
   */
  getStorageStats() {
    const firebaseUsageRatio = this.estimatedFirebaseUsage / FIREBASE_FREE_TIER_BYTES;
    
    return {
      firebaseEnabled: !!this.firebaseStorage,
      cloudinaryEnabled: this.cloudinaryConfigured,
      estimatedFirebaseUsage: this.estimatedFirebaseUsage,
      firebaseUsagePercent: Math.round(firebaseUsageRatio * 100),
      firebaseFreeBytes: FIREBASE_FREE_TIER_BYTES,
      usingCloudinaryFallback: firebaseUsageRatio >= FIREBASE_USAGE_THRESHOLD,
      threshold: FIREBASE_USAGE_THRESHOLD
    };
  }

  /**
   * Get file extension from filename
   * @private
   */
  _getExtension(filename) {
    const lastDot = filename.lastIndexOf('.');
    return lastDot > 0 ? filename.substring(lastDot) : '';
  }
}

// Export singleton instance
const storageService = new StorageService();
export default storageService;
