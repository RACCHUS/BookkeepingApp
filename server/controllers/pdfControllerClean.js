import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pdfParse from 'pdf-parse';
import firebaseService from '../services/cleanFirebaseService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory store for processing status (in production, use Redis or database)
const processingStatus = new Map();

export const uploadPDF = async (req, res) => {
  try {
    const { file } = req;
    const { uid: userId } = req.user;
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
    const filePath = path.join(uploadsDir, fileName);

    // Ensure uploads directory exists
    await fs.mkdir(uploadsDir, { recursive: true });

    // Save file to local storage
    await fs.writeFile(filePath, file.buffer);

    // Create upload record (using our Firebase service or mock)
    const uploadRecord = {
      id: uploadId,
      userId,
      originalName: file.originalname,
      fileName,
      filePath,
      bankType,
      size: file.size,
      mimetype: file.mimetype,
      uploadedAt: new Date(),
      status: 'uploaded'
    };

    // For now, store in memory (in real app, store in Firebase)
    processingStatus.set(uploadId, uploadRecord);

    console.log(`📄 PDF Upload: ${file.originalname} (${file.size} bytes) for user ${userId}`);

    res.status(201).json({
      success: true,
      data: {
        uploadId,
        fileName: file.originalname,
        size: file.size,
        bankType,
        status: 'uploaded'
      },
      message: 'PDF uploaded successfully'
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
    const { uid: userId } = req.user;

    // Get upload record
    const uploadRecord = processingStatus.get(fileId);
    if (!uploadRecord || uploadRecord.userId !== userId) {
      return res.status(404).json({
        error: 'File not found',
        message: 'Upload not found or access denied'
      });
    }

    // Update status to processing
    uploadRecord.status = 'processing';
    uploadRecord.processedAt = new Date();
    processingStatus.set(fileId, uploadRecord);

    // Read and parse PDF
    const pdfBuffer = await fs.readFile(uploadRecord.filePath);
    const pdfData = await pdfParse(pdfBuffer);

    // Extract transactions from PDF text
    const transactions = extractTransactionsFromText(pdfData.text, uploadRecord.bankType);

    // Create transactions in Firebase
    const createdTransactions = [];
    for (const transaction of transactions) {
      try {
        const result = await firebaseService.createTransaction(userId, transaction);
        createdTransactions.push(result.data);
      } catch (error) {
        console.error('Error creating transaction:', error);
      }
    }

    // Update status to completed
    uploadRecord.status = 'completed';
    uploadRecord.transactionsFound = transactions.length;
    uploadRecord.transactionsCreated = createdTransactions.length;
    uploadRecord.completedAt = new Date();
    processingStatus.set(fileId, uploadRecord);

    console.log(`📊 PDF Processed: ${transactions.length} transactions extracted, ${createdTransactions.length} created`);

    res.json({
      success: true,
      data: {
        uploadId: fileId,
        status: 'completed',
        transactionsFound: transactions.length,
        transactionsCreated: createdTransactions.length,
        transactions: createdTransactions
      },
      message: `Successfully processed PDF and created ${createdTransactions.length} transactions`
    });
  } catch (error) {
    console.error('PDF processing error:', error);
    
    // Update status to error
    const uploadRecord = processingStatus.get(req.params.fileId);
    if (uploadRecord) {
      uploadRecord.status = 'error';
      uploadRecord.error = error.message;
      processingStatus.set(req.params.fileId, uploadRecord);
    }

    res.status(500).json({
      error: 'Processing failed',
      message: error.message
    });
  }
};

export const getPDFStatus = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { uid: userId } = req.user;

    const uploadRecord = processingStatus.get(fileId);
    if (!uploadRecord || uploadRecord.userId !== userId) {
      return res.status(404).json({
        error: 'File not found',
        message: 'Upload not found or access denied'
      });
    }

    res.json({
      success: true,
      data: {
        uploadId: fileId,
        status: uploadRecord.status,
        fileName: uploadRecord.originalName,
        size: uploadRecord.size,
        bankType: uploadRecord.bankType,
        uploadedAt: uploadRecord.uploadedAt,
        processedAt: uploadRecord.processedAt,
        completedAt: uploadRecord.completedAt,
        transactionsFound: uploadRecord.transactionsFound,
        transactionsCreated: uploadRecord.transactionsCreated,
        error: uploadRecord.error
      }
    });
  } catch (error) {
    console.error('Get PDF status error:', error);
    res.status(500).json({
      error: 'Failed to get status',
      message: error.message
    });
  }
};

export const getUserUploads = async (req, res) => {
  try {
    const { uid: userId } = req.user;

    // Get all uploads for user from memory store
    const userUploads = [];
    for (const [fileId, record] of processingStatus.entries()) {
      if (record.userId === userId) {
        userUploads.push({
          uploadId: fileId,
          fileName: record.originalName,
          size: record.size,
          bankType: record.bankType,
          status: record.status,
          uploadedAt: record.uploadedAt,
          transactionsCreated: record.transactionsCreated || 0
        });
      }
    }

    // Sort by upload date (newest first)
    userUploads.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    res.json({
      success: true,
      data: {
        uploads: userUploads,
        total: userUploads.length
      }
    });
  } catch (error) {
    console.error('Get user uploads error:', error);
    res.status(500).json({
      error: 'Failed to get uploads',
      message: error.message
    });
  }
};

// Simple transaction extraction from PDF text
function extractTransactionsFromText(text, bankType = 'chase') {
  const transactions = [];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  console.log(`📄 Extracting transactions from ${lines.length} lines of text...`);

  if (bankType === 'chase') {
    return extractChaseTransactions(lines);
  } else {
    return extractGenericTransactions(lines);
  }
}

function extractChaseTransactions(lines) {
  const transactions = [];
  
  // Chase bank statement patterns
  // Looking for patterns like: "MM/DD/YYYY DESCRIPTION AMOUNT"
  const dateRegex = /^(\d{1,2}\/\d{1,2}\/\d{4})\s+(.+?)\s+([-+]?\$?[\d,]+\.\d{2})$/;
  
  lines.forEach((line, index) => {
    const match = line.match(dateRegex);
    if (match) {
      const [, dateStr, description, amountStr] = match;
      
      // Parse amount
      const amount = parseFloat(amountStr.replace(/[$,]/g, ''));
      if (isNaN(amount)) return;
      
      // Determine transaction type
      const type = amount < 0 ? 'expense' : 'income';
      const absAmount = Math.abs(amount);
      
      // Clean up description
      const cleanDescription = description.trim();
      
      // Simple category classification
      const category = classifyTransaction(cleanDescription, type);
      
      transactions.push({
        date: convertDateFormat(dateStr),
        amount: absAmount,
        description: cleanDescription,
        category,
        type,
        payee: extractPayee(cleanDescription),
        source: 'pdf_import',
        bankType: 'chase'
      });
    }
  });
  
  console.log(`📊 Chase: Extracted ${transactions.length} transactions`);
  return transactions;
}

function extractGenericTransactions(lines) {
  const transactions = [];
  
  // Generic patterns for various banks
  const patterns = [
    /(\d{1,2}\/\d{1,2}\/\d{4})\s+(.+?)\s+([-+]?\$?[\d,]+\.\d{2})/,
    /(\d{1,2}-\d{1,2}-\d{4})\s+(.+?)\s+([-+]?\$?[\d,]+\.\d{2})/,
    /(\d{4}-\d{1,2}-\d{1,2})\s+(.+?)\s+([-+]?\$?[\d,]+\.\d{2})/
  ];
  
  lines.forEach(line => {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        const [, dateStr, description, amountStr] = match;
        
        const amount = parseFloat(amountStr.replace(/[$,]/g, ''));
        if (isNaN(amount)) continue;
        
        const type = amount < 0 ? 'expense' : 'income';
        const absAmount = Math.abs(amount);
        
        transactions.push({
          date: convertDateFormat(dateStr),
          amount: absAmount,
          description: description.trim(),
          category: classifyTransaction(description, type),
          type,
          payee: extractPayee(description),
          source: 'pdf_import',
          bankType: 'generic'
        });
        break;
      }
    }
  });
  
  console.log(`📊 Generic: Extracted ${transactions.length} transactions`);
  return transactions;
}

function convertDateFormat(dateStr) {
  // Convert various date formats to YYYY-MM-DD
  if (dateStr.includes('/')) {
    const [month, day, year] = dateStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  } else if (dateStr.includes('-')) {
    if (dateStr.startsWith('20')) {
      // Already in YYYY-MM-DD format
      return dateStr;
    } else {
      // Assume MM-DD-YYYY format
      const [month, day, year] = dateStr.split('-');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  return dateStr;
}

function extractPayee(description) {
  // Extract payee name from description
  // Remove common prefixes and suffixes
  let payee = description
    .replace(/^(DEBIT CARD|CREDIT CARD|ACH|CHECK|DEPOSIT|WITHDRAWAL)\s+/i, '')
    .replace(/\s+(PURCHASE|PAYMENT|TRANSFER|FEE)$/i, '')
    .replace(/\s+\d+$/, '') // Remove trailing numbers
    .trim();
  
  // Take first few words as payee name
  const words = payee.split(' ');
  return words.slice(0, 3).join(' ');
}

function classifyTransaction(description, type) {
  const desc = description.toLowerCase();
  
  if (type === 'expense') {
    if (desc.includes('gas') || desc.includes('fuel') || desc.includes('exxon') || desc.includes('shell')) {
      return 'Vehicle & Transportation';
    }
    if (desc.includes('grocery') || desc.includes('supermarket') || desc.includes('food')) {
      return 'Groceries & Food';
    }
    if (desc.includes('restaurant') || desc.includes('cafe') || desc.includes('dining')) {
      return 'Meals & Entertainment';
    }
    if (desc.includes('office') || desc.includes('supply') || desc.includes('staples')) {
      return 'Office Expenses';
    }
    if (desc.includes('software') || desc.includes('subscription') || desc.includes('license')) {
      return 'Software & Subscriptions';
    }
    if (desc.includes('utility') || desc.includes('electric') || desc.includes('gas bill') || desc.includes('water')) {
      return 'Utilities';
    }
    return 'General Expenses';
  } else {
    if (desc.includes('salary') || desc.includes('payroll') || desc.includes('wages')) {
      return 'Salary & Wages';
    }
    if (desc.includes('consulting') || desc.includes('freelance') || desc.includes('contract')) {
      return 'Business Income';
    }
    if (desc.includes('interest') || desc.includes('dividend')) {
      return 'Investment Income';
    }
    return 'Other Income';
  }
}
