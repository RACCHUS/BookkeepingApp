# Test Data Directory

This directory contains test files for PDF processing, transaction import, and other testing scenarios.

## Directory Structure

```
server/test/data/
├── README.md                     # This file
├── pdfs/                         # PDF test files
│   ├── chase/                   # Chase bank statement PDFs
│   │   ├── chase-statement-simple.pdf
│   │   ├── chase-statement-complex.pdf
│   │   ├── chase-checking-account.pdf
│   │   ├── chase-savings-account.pdf
│   │   └── chase-credit-card.pdf
│   ├── generic/                 # Non-Chase bank statement PDFs
│   │   ├── bank-of-america.pdf
│   │   ├── wells-fargo.pdf
│   │   ├── capital-one.pdf
│   │   └── credit-union.pdf
│   ├── corrupted/               # Invalid/corrupted test PDFs
│   │   ├── password-protected.pdf
│   │   ├── scanned-image.pdf
│   │   ├── corrupted-file.pdf
│   │   └── invalid-format.pdf
│   └── samples/                 # Sample and reference PDFs
│       ├── 05-versions-space.pdf # Existing test file
│       └── 05-versions-space.pdf.txt # Text extraction
├── csv/                         # CSV test files
│   ├── transactions-valid.csv
│   ├── transactions-invalid.csv
│   ├── transactions-empty.csv
│   └── transactions-large.csv
├── json/                        # JSON test data
│   ├── mock-transactions.json
│   ├── mock-companies.json
│   ├── mock-payees.json
│   └── classification-rules.json
└── .gitignore                   # Git ignore rules
```

## Usage Guidelines

### PDF Test Files

#### Chase Bank Statements
- **chase-statement-simple.pdf**: Basic checking account with minimal transactions
- **chase-statement-complex.pdf**: Complex statement with multiple sections and many transactions
- **chase-checking-account.pdf**: Standard checking account statement
- **chase-savings-account.pdf**: Savings account statement format
- **chase-credit-card.pdf**: Credit card statement format

#### Generic Bank Statements
- **bank-of-america.pdf**: Bank of America statement format
- **wells-fargo.pdf**: Wells Fargo statement format
- **capital-one.pdf**: Capital One statement format
- **credit-union.pdf**: Generic credit union statement

#### Corrupted/Invalid Files
- **password-protected.pdf**: PDF with password protection
- **scanned-image.pdf**: Scanned PDF without extractable text
- **corrupted-file.pdf**: Intentionally corrupted PDF file
- **invalid-format.pdf**: Non-PDF file with .pdf extension

### CSV Test Files
- **transactions-valid.csv**: Well-formatted transaction data
- **transactions-invalid.csv**: Invalid data for error testing
- **transactions-empty.csv**: Empty file for edge case testing
- **transactions-large.csv**: Large dataset for performance testing

### JSON Test Data
- **mock-transactions.json**: Sample transaction objects
- **mock-companies.json**: Sample company data
- **mock-payees.json**: Sample payee information
- **classification-rules.json**: Sample classification rules

## File Naming Conventions

### PDF Files
- Use descriptive names indicating bank and type
- Include account type when relevant (checking, savings, credit)
- Use lowercase with hyphens for separation
- Example: `chase-checking-2024-01.pdf`

### CSV Files
- Prefix with data type (transactions, companies, etc.)
- Include status or purpose (valid, invalid, large, etc.)
- Example: `transactions-valid-sample.csv`

### JSON Files
- Prefix with "mock-" for test data
- Use plural nouns for collections
- Example: `mock-transactions.json`

## Testing Scenarios

### PDF Processing Tests
1. **Valid Chase Statements**: Test successful parsing and transaction extraction
2. **Generic Bank Statements**: Test fallback parsing logic
3. **Corrupted Files**: Test error handling and graceful failures
4. **Edge Cases**: Empty files, single transactions, large files

### Integration Tests
1. **Upload API**: Test file upload with various PDF types
2. **Processing Pipeline**: End-to-end processing from upload to transactions
3. **Error Handling**: Test with invalid files and edge cases
4. **Performance**: Test with large files and multiple concurrent uploads

### Unit Tests
1. **PDF Parser**: Test individual parsing functions
2. **Section Detection**: Test Chase statement section identification
3. **Transaction Extraction**: Test transaction parsing accuracy
4. **Classification**: Test rule-based transaction classification

## Adding New Test Files

### Requirements
- **Real Data**: Use sanitized real bank statements when possible
- **Privacy**: Remove all personal information (names, addresses, account numbers)
- **Variety**: Include different statement formats and edge cases
- **Documentation**: Update this README when adding new files

### Process
1. **Sanitize Data**: Remove all personal/sensitive information
2. **Categorize**: Place in appropriate subdirectory
3. **Name Properly**: Follow naming conventions
4. **Document**: Add to this README with description
5. **Test**: Verify file works with parsing logic

## File Size Guidelines

### PDF Files
- **Small** (< 100KB): Simple statements with few transactions
- **Medium** (100KB - 1MB): Standard statements with typical transaction volume
- **Large** (1MB - 5MB): Complex statements with many transactions
- **Extra Large** (5MB+): Performance testing files

### CSV Files
- **Small** (< 10KB): Basic test data
- **Medium** (10KB - 100KB): Standard test datasets
- **Large** (100KB+): Performance and stress testing

## Security Considerations

### Sensitive Data
- **Never commit real account numbers, SSNs, or personal information**
- **Use masked or fake data for testing**
- **Sanitize all uploaded test files before committing**

### File Safety
- **Scan files for malware before adding**
- **Verify PDF files don't contain embedded scripts**
- **Use read-only permissions where possible**

## Maintenance

### Regular Tasks
1. **Review and update test files** quarterly
2. **Remove outdated or irrelevant test data**
3. **Add new test cases** for new features
4. **Verify all test files** still work with current parsing logic

### File Cleanup
- Remove temporary test files after use
- Archive old test files that are no longer relevant
- Keep file sizes reasonable for repository performance

## Integration with Tests

### Jest Configuration
```javascript
// In test files, reference test data:
const testPDFPath = path.join(__dirname, 'data/pdfs/chase/chase-statement-simple.pdf');
const testCSVPath = path.join(__dirname, 'data/csv/transactions-valid.csv');
```

### Test Utilities
```javascript
// Helper function to load test data
export const loadTestPDF = (filename) => {
  return fs.readFileSync(path.join(__dirname, 'data/pdfs', filename));
};

export const loadTestJSON = (filename) => {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'data/json', filename), 'utf8'));
};
```

## Environment-Specific Testing

### Development
- Use full test suite with all file types
- Include performance testing with large files

### CI/CD Pipeline
- Use subset of test files for faster execution
- Focus on critical path testing

### Production Testing
- Use sanitized production-like data
- Test with realistic file sizes and formats
