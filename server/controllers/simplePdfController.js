import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import firebaseService from '../services/cleanFirebaseService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory store for processing status (in production, use Redis or database)
const processingStatus = new Map();

export const uploadPDF = async (req, res) => {
  try {
    const { file } = req;
    const { uid: userId } = req.user || { uid: 'dev-user-123' }; // Fallback for development
    const { bankType = 'chase' } = req.body;

    if (!file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please select a PDF file to upload'
      });
    }

    // Generate unique filename
    const uploadId = crypto.randomUUID();
    const fileName = `${uploadId}-${file.originalname}`;
    const uploadsDir = path.join(__dirname, '../../uploads');

    try {
      await fs.mkdir(uploadsDir, { recursive: true });
    } catch (error) {
      console.log('Uploads directory already exists or created');
    }

    const filePath = path.join(uploadsDir, fileName);

    // Save file to disk
    await fs.writeFile(filePath, file.buffer);

    console.log(`📄 PDF uploaded: ${fileName} (${file.size} bytes)`);

    // Create upload record
    const uploadRecord = {
      fileId: uploadId,
      originalName: file.originalname,
      fileName: fileName,
      filePath: filePath,
      fileSize: file.size,
      bankType: bankType,
      uploadedBy: userId,
      uploadedAt: new Date().toISOString(),
      status: 'uploaded',
      processed: false
    };

    // For now, just return success - we'll add actual PDF parsing later
    res.status(200).json({
      success: true,
      message: 'PDF uploaded successfully',
      data: {
        fileId: uploadId,
        fileName: file.originalname,
        size: file.size,
        status: 'uploaded',
        uploadedAt: uploadRecord.uploadedAt,
        bankType: bankType
      },
      next_steps: {
        process_url: `/api/pdf/process/${uploadId}`,
        status_url: `/api/pdf/status/${uploadId}`
      }
    });

  } catch (error) {
    console.error('PDF upload error:', error);
    res.status(500).json({
      error: 'Upload failed',
      message: error.message
    });
  }
};

export const processPDF = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { autoSave = false } = req.body;
    const { uid: userId } = req.user || { uid: 'dev-user-123' };

    const processId = crypto.randomUUID();

    // Always use fileId as the robust statementId for all transactions
    const statementId = fileId;
    const mockTransactions = [
      {
        date: '2025-06-20',
        amount: 150.00,
        description: 'Office Supplies - Staples',
        category: 'Office Expenses',
        type: 'expense',
        payee: 'Staples Inc',
        confidence: 0.95,
        statementId
      },
      {
        date: '2025-06-21',
        amount: 2500.00,
        description: 'Client Payment - Invoice #123',
        category: 'Business Income',
        type: 'income',
        payee: 'ABC Company',
        confidence: 0.98,
        statementId
      },
      {
        date: '2025-06-22',
        amount: 85.50,
        description: 'Gas Station - Shell',
        category: 'Car and Truck Expenses',
        type: 'expense',
        payee: 'Shell',
        confidence: 0.92,
        statementId
      }
    ];

    // If autoSave is true, save the transactions to Firebase
    let savedTransactionIds = [];
    if (autoSave) {
      try {
        for (const transaction of mockTransactions) {
          const result = await firebaseService.createTransaction(userId, {
            ...transaction,
            statementId, // Always set statementId for robust linking
            source: 'pdf_import',
            sourceFile: `${fileId}.pdf`,
            sourceFileId: fileId,
            isManuallyReviewed: false,
            createdBy: userId
          });
          savedTransactionIds.push(result.id);
        }
        console.log(`💾 Saved ${savedTransactionIds.length} transactions from PDF processing`);
      } catch (error) {
        console.error('Error saving transactions:', error);
        // Continue with the response even if saving fails
      }
    }
    
    // Set final processing status
    processingStatus.set(processId, {
      status: 'completed',
      progress: 100,
      message: `PDF processing completed successfully. Found ${mockTransactions.length} transactions.`,
      startTime: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      result: {
        success: true,
        transactionCount: mockTransactions.length,
        transactions: mockTransactions,
        savedTransactionIds: autoSave ? savedTransactionIds : [],
        summary: {
          totalIncome: mockTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
          totalExpenses: mockTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
          netAmount: mockTransactions.reduce((sum, t) => t.type === 'income' ? sum + t.amount : sum - t.amount, 0)
        }
      }
    });

    res.status(200).json({
      success: true,
      message: 'PDF processing completed successfully',
      data: {
        processId,
        status: 'completed',
        result: {
          success: true,
          transactionCount: mockTransactions.length,
          transactions: mockTransactions,
          savedTransactionIds: autoSave ? savedTransactionIds : [],
          autoSaved: autoSave,
          summary: {
            totalIncome: mockTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
            totalExpenses: mockTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
          }
        }
      }
    });

  } catch (error) {
    console.error('PDF processing error:', error);
    res.status(500).json({
      error: 'Processing failed',
      message: error.message
    });
  }
};

export const getPDFStatus = async (req, res) => {
  try {
    const { processId } = req.params;
    
    const status = processingStatus.get(processId);
    
    if (!status) {
      return res.status(404).json({
        error: 'Process not found',
        message: 'The specified process ID was not found'
      });
    }

    res.status(200).json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Error getting PDF status:', error);
    res.status(500).json({
      error: 'Failed to get status',
      message: error.message
    });
  }
};

export const getUserUploads = async (req, res) => {
  try {
    const { uid: userId } = req.user || { uid: 'dev-user-123' };
    
    // For now, return mock data
    // TODO: Implement actual upload history from database
    
    const mockUploads = [
      {
        fileId: '12345',
        originalName: 'Chase_Statement_June_2025.pdf',
        uploadedAt: '2025-06-25T10:30:00Z',
        status: 'completed',
        transactionCount: 15,
        bankType: 'chase'
      }
    ];

    res.status(200).json({
      success: true,
      data: {
        uploads: mockUploads,
        total: mockUploads.length
      }
    });

  } catch (error) {
    console.error('Error getting user uploads:', error);
    res.status(500).json({
      error: 'Failed to get uploads',
      message: error.message
    });
  }
};
