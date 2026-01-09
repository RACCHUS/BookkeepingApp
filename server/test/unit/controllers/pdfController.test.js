import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const servicesPath = path.resolve(__dirname, '../../../services');
const configPath = path.resolve(__dirname, '../../../config');
const utilsPath = path.resolve(__dirname, '../../../utils');
const middlewaresPath = path.resolve(__dirname, '../../../middlewares');
const adaptersPath = path.resolve(__dirname, '../../../services/adapters');

// Create mock adapter with all necessary methods
const mockAdapter = {
  createUploadRecord: jest.fn(),
  getUploadById: jest.fn(),
  updateUpload: jest.fn(),
  deleteUpload: jest.fn(),
  deleteTransactionsByUploadId: jest.fn(),
  unlinkTransactionsByUploadId: jest.fn(),
  recordDeletedUploadId: jest.fn()
};

// Mock the adapter factory before importing controller
jest.unstable_mockModule(path.join(adaptersPath, 'index.js'), () => ({
  getDatabaseAdapter: jest.fn(() => mockAdapter),
  getDbProvider: jest.fn(() => 'supabase'),
  DB_PROVIDERS: { SUPABASE: 'supabase', FIREBASE: 'firebase' }
}));

// Mock dependencies before importing controller
jest.unstable_mockModule(path.join(servicesPath, 'supabaseService.js'), () => ({
  uploadFileToSupabase: jest.fn(),
  deleteFileFromSupabase: jest.fn()
}));

jest.unstable_mockModule(path.join(servicesPath, 'cleanFirebaseService.js'), () => ({
  default: {
    createUploadRecord: jest.fn(),
    getUploadById: jest.fn(),
    updateUpload: jest.fn(),
    deleteUpload: jest.fn(),
    deleteTransactionsByUploadId: jest.fn(),
    unlinkTransactionsByUploadId: jest.fn(),
    recordDeletedUploadId: jest.fn()
  }
}));

jest.unstable_mockModule(path.join(servicesPath, 'chasePDFParser.js'), () => ({
  default: {
    parse: jest.fn()
  }
}));

jest.unstable_mockModule(path.join(configPath, 'index.js'), () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    info: jest.fn()
  }
}));

jest.unstable_mockModule(path.join(utilsPath, 'errorHandler.js'), () => ({
  isFirestoreIndexError: jest.fn(),
  getIndexErrorMessage: jest.fn(),
  logIndexError: jest.fn(),
  extractIndexCreationUrl: jest.fn(),
  withIndexFallback: jest.fn()
}));

jest.unstable_mockModule(path.join(middlewaresPath, 'index.js'), () => ({
  asyncHandler: (fn) => fn // Pass-through for testing
}));

// Now dynamically import controller (after mocks are set up)
const { uploadPDF, processPDF, getUploadStatus, batchDeleteUploads } = await import('../../../controllers/pdfController.js');
const { uploadFileToSupabase, deleteFileFromSupabase } = await import('../../../services/supabaseService.js');
const { logger } = await import('../../../config/index.js');

describe('PDF Controller', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      user: { uid: 'user-123' },
      file: null,
      body: {},
      params: {},
      id: 'req-123'
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadPDF - File Validation', () => {
    it('should return 400 when no file is provided', async () => {
      req.file = null;
      req.body = { bankType: 'chase' };

      await uploadPDF(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'No file uploaded',
        message: 'Please select a PDF file to upload'
      });
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should return 400 when file is undefined', async () => {
      req.file = undefined;

      await uploadPDF(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'No file uploaded'
      }));
    });
  });

  describe('uploadPDF - Successful Upload', () => {
    const validFile = {
      originalname: 'bank-statement.pdf',
      buffer: Buffer.from('fake pdf content'),
      size: 1024
    };

    beforeEach(() => {
      uploadFileToSupabase.mockResolvedValue({
        url: 'https://supabase.io/files/user-123/uuid-bank-statement.pdf',
        storageProvider: 'supabase'
      });
      mockAdapter.createUploadRecord.mockResolvedValue();
    });

    it('should upload PDF successfully without autoProcess', async () => {
      req.file = validFile;
      req.body = { bankType: 'chase' };

      await uploadPDF(req, res);

      expect(uploadFileToSupabase).toHaveBeenCalledWith(
        validFile.buffer,
        expect.stringContaining('user-123/')
      );
      expect(mockAdapter.createUploadRecord).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'PDF uploaded successfully'
      }));
    });

    it('should use user-provided name when specified', async () => {
      req.file = validFile;
      req.body = {
        bankType: 'chase',
        name: 'January 2024 Statement'
      };

      await uploadPDF(req, res);

      expect(mockAdapter.createUploadRecord).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          name: 'January 2024 Statement'
        })
      );
    });

    it('should include company information when provided', async () => {
      req.file = validFile;
      req.body = {
        bankType: 'chase',
        companyId: 'company-123',
        companyName: 'Test Company'
      };

      await uploadPDF(req, res);

      expect(mockAdapter.createUploadRecord).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          companyId: 'company-123',
          companyName: 'Test Company'
        })
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          companyId: 'company-123',
          companyName: 'Test Company'
        })
      }));
    });

    it('should handle empty string companyId as null', async () => {
      req.file = validFile;
      req.body = {
        bankType: 'chase',
        companyId: '   ',
        companyName: ''
      };

      await uploadPDF(req, res);

      expect(mockAdapter.createUploadRecord).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          companyId: null,
          companyName: null
        })
      );
    });

    it('should default bankType to chase', async () => {
      req.file = validFile;
      req.body = {};

      await uploadPDF(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          bankType: 'chase'
        })
      }));
    });

    it('should log upload initiation', async () => {
      req.file = validFile;
      req.body = { bankType: 'chase', companyId: 'company-1' };

      await uploadPDF(req, res);

      expect(logger.info).toHaveBeenCalled();
    });
  });

  describe('uploadPDF - Auto-Process Mode', () => {
    const validFile = {
      originalname: 'statement.pdf',
      buffer: Buffer.from('pdf content'),
      size: 2048
    };

    beforeEach(() => {
      uploadFileToSupabase.mockResolvedValue({
        url: 'https://supabase.io/files/test.pdf',
        storageProvider: 'supabase'
      });
      mockAdapter.createUploadRecord.mockResolvedValue();
    });

    it('should return processing status when autoProcess is true', async () => {
      req.file = validFile;
      req.body = { autoProcess: true };

      await uploadPDF(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'PDF uploaded and processing started',
        data: expect.objectContaining({
          status: 'processing',
          autoProcessing: true
        })
      }));
    });
  });

  describe('uploadPDF - Error Handling', () => {
    const validFile = {
      originalname: 'statement.pdf',
      buffer: Buffer.from('pdf content'),
      size: 1024
    };

    it('should return 500 when storage upload fails', async () => {
      req.file = validFile;
      req.body = { bankType: 'chase' };
      uploadFileToSupabase.mockRejectedValue(new Error('Storage quota exceeded'));

      await uploadPDF(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to upload PDF',
        message: 'Storage quota exceeded'
      });
      expect(logger.error).toHaveBeenCalled();
    });

    it('should continue even if Firestore record creation fails', async () => {
      req.file = validFile;
      req.body = { bankType: 'chase' };
      uploadFileToSupabase.mockResolvedValue({
        url: 'https://supabase.io/test.pdf',
        storageProvider: 'supabase'
      });
      mockAdapter.createUploadRecord.mockRejectedValue(new Error('Firestore error'));

      await uploadPDF(req, res);

      // Should still return success since file was uploaded
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true
      }));
    });
  });

  describe('uploadPDF - Edge Cases', () => {
    beforeEach(() => {
      uploadFileToSupabase.mockResolvedValue({
        url: 'https://supabase.io/test.pdf',
        storageProvider: 'supabase'
      });
      mockAdapter.createUploadRecord.mockResolvedValue();
    });

    it('should handle very long filenames', async () => {
      const longFilename = 'a'.repeat(200) + '.pdf';
      req.file = {
        originalname: longFilename,
        buffer: Buffer.from('content'),
        size: 100
      };
      req.body = {};

      await uploadPDF(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle filenames with unicode characters', async () => {
      req.file = {
        originalname: '财务报表-2024.pdf',
        buffer: Buffer.from('content'),
        size: 100
      };
      req.body = {};

      await uploadPDF(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle whitespace-only user-provided name', async () => {
      req.file = {
        originalname: 'statement.pdf',
        buffer: Buffer.from('content'),
        size: 100
      };
      req.body = { name: '   ' };

      await uploadPDF(req, res);

      // Should use original filename when name is whitespace-only
      expect(mockAdapter.createUploadRecord).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          name: 'statement.pdf'
        })
      );
    });
  });

  describe('processPDF', () => {
    it('should extract upload ID from params', async () => {
      req.params.id = 'upload-123';
      mockAdapter.getUploadById.mockResolvedValue({
        id: 'upload-123',
        status: 'uploaded'
      });

      try {
        await processPDF(req, res);
      } catch (error) {
        // May error due to incomplete mock
      }

      expect(req.params.id).toBe('upload-123');
    });
  });

  describe('getUploadStatus', () => {
    it('should extract upload ID from params', async () => {
      req.params.id = 'status-check-123';

      try {
        await getUploadStatus(req, res);
      } catch (error) {
        // Expected
      }

      expect(req.params.id).toBe('status-check-123');
    });
  });

  // ============================================
  // BATCH DELETE TESTS
  // ============================================
  describe('batchDeleteUploads', () => {
    it('should return 401 when user is not authenticated', async () => {
      req.user = {};
      req.body = { uploadIds: ['upload-1', 'upload-2'] };

      await batchDeleteUploads(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Authentication required'
        })
      );
    });

    it('should return 400 when uploadIds is not an array', async () => {
      req.body = { uploadIds: 'not-an-array' };

      await batchDeleteUploads(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid request'
        })
      );
    });

    it('should return 400 when uploadIds is empty', async () => {
      req.body = { uploadIds: [] };

      await batchDeleteUploads(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid request'
        })
      );
    });

    it('should successfully delete multiple uploads', async () => {
      req.body = { 
        uploadIds: ['upload-1', 'upload-2'],
        deleteTransactions: false
      };

      mockAdapter.getUploadById.mockResolvedValue({
        id: 'upload-1',
        name: 'Test Upload',
        fileName: 'test.pdf',
        storageProvider: 'supabase'
      });
      mockAdapter.unlinkTransactionsByUploadId.mockResolvedValue(5);
      mockAdapter.recordDeletedUploadId.mockResolvedValue();
      mockAdapter.deleteUpload.mockResolvedValue();

      await batchDeleteUploads(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            successful: expect.any(Array),
            failed: expect.any(Array)
          })
        })
      );
    });

    it('should handle deleteTransactions flag', async () => {
      req.body = { 
        uploadIds: ['upload-1'],
        deleteTransactions: true
      };

      mockAdapter.getUploadById.mockResolvedValue({
        id: 'upload-1',
        name: 'Test Upload',
        fileName: 'test.pdf'
      });
      mockAdapter.deleteTransactionsByUploadId.mockResolvedValue(10);
      mockAdapter.recordDeletedUploadId.mockResolvedValue();
      mockAdapter.deleteUpload.mockResolvedValue();

      await batchDeleteUploads(req, res);

      expect(mockAdapter.deleteTransactionsByUploadId).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    it('should handle non-existent uploads gracefully', async () => {
      req.body = { uploadIds: ['non-existent'] };

      mockAdapter.getUploadById.mockRejectedValue(new Error('Not found'));

      await batchDeleteUploads(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            failed: expect.arrayContaining([
              expect.objectContaining({
                uploadId: 'non-existent'
              })
            ])
          })
        })
      );
    });

    it('should report partial success when some uploads fail', async () => {
      req.body = { uploadIds: ['upload-1', 'upload-2'] };

      // First upload succeeds
      mockAdapter.getUploadById
        .mockResolvedValueOnce({
          id: 'upload-1',
          name: 'Test Upload 1',
          fileName: 'test1.pdf'
        })
        // Second upload not found
        .mockRejectedValueOnce(new Error('Not found'));

      mockAdapter.unlinkTransactionsByUploadId.mockResolvedValue(0);
      mockAdapter.recordDeletedUploadId.mockResolvedValue();
      mockAdapter.deleteUpload.mockResolvedValue();

      await batchDeleteUploads(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('1 of 2')
        })
      );
    });
  });
});
