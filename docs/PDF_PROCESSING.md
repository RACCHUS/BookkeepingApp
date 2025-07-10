# PDF Processing

This document describes the PDF processing capabilities for bank statement import.

## Overview

The app processes PDF bank statements to extract transaction data automatically. The system is primarily designed for Chase bank statements but includes fallback parsing for other formats.

## Supported Formats

### Primary Support
- **Chase Bank Statements**: Full parsing with section detection
- **PDF Format**: Text-based PDFs (not scanned images)

### Partial Support
- **Generic Bank Statements**: Basic transaction extraction
- **Multiple Account Types**: Checking, savings, credit cards

## Processing Pipeline

### 1. Upload Processing
```javascript
// Upload endpoint: POST /api/pdf/upload
{
  "file": "<PDF file>",
  "companyId": "optional-company-id",
  "displayName": "Optional custom name"
}
```

### 2. PDF Text Extraction
```javascript
// Extract text from PDF using pdf-parse
const pdfData = await pdfParse(buffer);
const text = pdfData.text;
```

### 3. Statement Analysis
```javascript
// Detect statement type and extract metadata
const analysisResult = {
  bankType: "chase" | "generic",
  accountNumber: "****1234",
  statementPeriod: {
    start: "2024-01-01",
    end: "2024-01-31"
  },
  balances: {
    beginning: 1000.00,
    ending: 1500.00
  }
};
```

### 4. Section Detection
```javascript
// Chase statements have distinct sections
const sections = {
  deposits: {
    title: "DEPOSITS AND ADDITIONS",
    code: "deposits",
    transactions: []
  },
  checks: {
    title: "CHECKS PAID",
    code: "checks", 
    transactions: []
  },
  electronic: {
    title: "ELECTRONIC WITHDRAWALS",
    code: "electronic",
    transactions: []
  },
  fees: {
    title: "SERVICE FEES",
    code: "fees",
    transactions: []
  }
};
```

### 5. Transaction Extraction
```javascript
// Extract individual transactions
const transaction = {
  date: "01/15",
  description: "PAYROLL DEPOSIT",
  amount: 2500.00,
  type: "income", // or "expense"
  section: "deposits",
  sectionCode: "deposits"
};
```

## Chase PDF Parser

### Implementation Details

The Chase parser (`services/chasePDFParser.js`) handles:

1. **Account Information Extraction**
   - Account number from header
   - Statement period dates
   - Beginning/ending balance

2. **Section Identification**
   - Looks for specific section headers
   - Groups transactions by section type
   - Handles multi-page sections

3. **Transaction Parsing**
   - Date parsing (MM/DD format)
   - Amount extraction with proper sign
   - Description cleaning and normalization

### Code Example
```javascript
const parsePDF = async (buffer, options = {}) => {
  try {
    // Extract text from PDF
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text;

    // Extract account info
    const accountInfo = extractAccountInfo(text);
    
    // Find and parse sections
    const sections = detectSections(text);
    const transactions = [];
    
    for (const section of sections) {
      const sectionTransactions = parseSection(text, section);
      transactions.push(...sectionTransactions);
    }

    return {
      success: true,
      accountInfo,
      transactions,
      metadata: {
        totalPages: pdfData.numpages,
        processingTime: new Date().toISOString()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};
```

## Transaction Classification

### Rule-Based System
After extraction, transactions are classified using user-defined rules:

```javascript
const classifyTransaction = (transaction, rules) => {
  for (const rule of rules.sort((a, b) => b.priority - a.priority)) {
    if (rule.isActive && matchesPattern(transaction.description, rule)) {
      return {
        category: rule.category,
        ruleId: rule.id,
        confidence: 100
      };
    }
  }
  
  return {
    category: null,
    ruleId: null,
    confidence: 0
  };
};
```

### Pattern Matching
```javascript
const matchesPattern = (text, rule) => {
  const flags = rule.caseSensitive ? 'g' : 'gi';
  
  if (rule.useRegex) {
    const regex = new RegExp(rule.pattern, flags);
    return regex.test(text);
  } else {
    return rule.caseSensitive 
      ? text.includes(rule.pattern)
      : text.toLowerCase().includes(rule.pattern.toLowerCase());
  }
};
```

## Error Handling

### Common Issues
1. **Corrupted PDFs**: Invalid or password-protected files
2. **Scanned Images**: PDFs without extractable text
3. **Unexpected Formats**: Non-standard bank statement layouts
4. **Large Files**: Memory limitations for very large PDFs

### Error Recovery
```javascript
const processWithFallback = async (buffer) => {
  try {
    // Try Chase-specific parser first
    return await chasePDFParser.parse(buffer);
  } catch (chaseError) {
    try {
      // Fall back to generic parser
      return await genericPDFParser.parse(buffer);
    } catch (genericError) {
      // Return structured error
      return {
        success: false,
        error: 'Unable to process PDF',
        details: {
          chaseError: chaseError.message,
          genericError: genericError.message
        }
      };
    }
  }
};
```

## Performance Considerations

### Memory Management
- Stream large files instead of loading entirely into memory
- Implement timeouts for processing
- Clean up temporary files

### Processing Time
- Typical processing time: 2-10 seconds for standard statements
- Large files (>5MB): 10-30 seconds
- Background processing with status updates

### Optimization Strategies
```javascript
// Chunk processing for large files
const processInChunks = async (text) => {
  const chunkSize = 10000; // characters
  const chunks = [];
  
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  
  const results = await Promise.all(
    chunks.map(chunk => processChunk(chunk))
  );
  
  return mergeResults(results);
};
```

## API Endpoints

### Upload PDF
```http
POST /api/pdf/upload
Content-Type: multipart/form-data

{
  "file": "<PDF file>",
  "companyId": "optional-company-id",
  "displayName": "Custom Statement Name"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "uploadId": "upload-123",
    "status": "processing",
    "fileName": "statement.pdf",
    "processingStarted": "2024-01-15T10:00:00Z"
  }
}
```

### Check Processing Status
```http
GET /api/uploads/{uploadId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "upload-123",
    "status": "completed",
    "transactionCount": 45,
    "totalIncome": 5000.00,
    "totalExpenses": 3500.00,
    "accountInfo": {
      "accountNumber": "****1234",
      "statementPeriod": {
        "start": "2024-01-01",
        "end": "2024-01-31"
      }
    }
  }
}
```

## Testing

### Unit Tests
```javascript
describe('Chase PDF Parser', () => {
  test('extracts account information correctly', async () => {
    const mockPDF = fs.readFileSync('test/data/chase-statement.pdf');
    const result = await chasePDFParser.parse(mockPDF);
    
    expect(result.success).toBe(true);
    expect(result.accountInfo.accountNumber).toBe('****1234');
  });

  test('handles corrupted PDFs gracefully', async () => {
    const corruptedPDF = Buffer.from('invalid pdf data');
    const result = await chasePDFParser.parse(corruptedPDF);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unable to parse PDF');
  });
});
```

### Integration Tests
```javascript
describe('PDF Upload API', () => {
  test('processes valid Chase statement', async () => {
    const pdfPath = 'test/data/chase-statement.pdf';
    
    const response = await request(app)
      .post('/api/pdf/upload')
      .attach('file', pdfPath)
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('processing');
  });
});
```

## Future Enhancements

### Planned Features
1. **OCR Support**: Process scanned PDF images
2. **Multiple Banks**: Support for Bank of America, Wells Fargo, etc.
3. **CSV Import**: Alternative to PDF processing
4. **Batch Processing**: Handle multiple files simultaneously
5. **Machine Learning**: Improve classification accuracy

### Technical Improvements
1. **Parallel Processing**: Process multiple PDFs concurrently
2. **Caching**: Cache parsed results for duplicate uploads
3. **Progress Tracking**: Real-time processing progress
4. **Error Recovery**: Better handling of partial failures

## Troubleshooting

### Common Problems

**PDF Won't Process**
- Check file size (limit: 10MB)
- Ensure PDF is not password-protected
- Verify PDF contains text (not just images)

**Missing Transactions**
- Check section detection logic
- Verify date format parsing
- Review amount extraction patterns

**Incorrect Categories**
- Review classification rules
- Check rule priority order
- Verify pattern matching logic

### Debug Tools
```javascript
// Enable debug logging
const DEBUG_PDF = process.env.DEBUG_PDF === 'true';

if (DEBUG_PDF) {
  console.log('Raw PDF text:', text.substring(0, 500));
  console.log('Detected sections:', sections.map(s => s.title));
  console.log('Extracted transactions:', transactions.length);
}
```
