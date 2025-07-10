# Chase PDF Transaction Count Validation

## Overview
This document tracks the expected transaction counts for each Chase PDF statement to validate our PDF parsing accuracy. Each PDF contains multiple sections (checking accounts, savings accounts, credit cards, etc.) with different transaction types.

## Test Data Location
- **Path**: `server/test/data/pdfs/chase/`
- **Purpose**: Validate PDF parsing extraction accuracy
- **Usage**: Compare expected counts vs actual extraction results

## Chase PDF Transaction Counts

### 2024 January Statement

**File**: `20240131-statements-5697-.pdf.pdf`

| Section                  | Expected Transactions |
|--------------------------|----------------------|
| Deposits and Additions   | _[7]_          |
| Checks Paid              | _[10]_          |
| ATM & Debit Card         | _[14]_          |
| Electronic Withdrawals   | _[2]_          |
---
### 2024 February Statement

**File**: `20240229-statements-5697-.pdf.crdownload.pdf`

| Section                  | Expected Transactions |
|--------------------------|----------------------|
| Deposits and Additions   | _[5]_          |
| Checks Paid              | _[6]_          |
| ATM & Debit Card         | _[17]_          |
| Electronic Withdrawals   | _[3]_          |
---
### 2024 March Statement

**File**: `20240329-statements-5697-.pdf.crdownload.pdf`

| Section                  | Expected Transactions |
|--------------------------|----------------------|
| Deposits and Additions   | _[7]_          |
| Checks Paid              | _[4]_          |
| ATM & Debit Card         | _[23]_          |
| Electronic Withdrawals   | _[3]_          |
---
### 2024 April Statement

**File**: `20240430-statements-5697-.pdf.crdownload.pdf`

| Section                  | Expected Transactions |
|--------------------------|----------------------|
| Deposits and Additions   | _[4]_          |
| Checks Paid              | _[6]_          |
| ATM & Debit Card         | _[19]_          |
| Electronic Withdrawals   | _[4]_          |
---
### 2024 May Statement

**File**: `20240531-statements-5697-.pdf.crdownload.pdf`

| Section                  | Expected Transactions |
|--------------------------|----------------------|
| Deposits and Additions   | _[5]_          |
| Checks Paid              | _[3]_          |
| ATM & Debit Card         | _[15]_          |
| Electronic Withdrawals   | _[2]_          |
---
### 2024 June Statement

**File**: `20240628-statements-5697-.pdf.crdownload.pdf`

| Section                  | Expected Transactions |
|--------------------------|----------------------|
| Deposits and Additions   | _[9]_          |
| Checks Paid              | _[3]_          |
| ATM & Debit Card         | _[22]_          |
| Electronic Withdrawals   | _[2]_          |
---
### 2024 July Statement

**File**: `20240731-statements-5697-.pdf.crdownload.pdf`

| Section                  | Expected Transactions |
|--------------------------|----------------------|
| Deposits and Additions   | _[5]_          |
| Checks Paid              | _[6]_          |
| ATM & Debit Card         | _[28]_          |
| Electronic Withdrawals   | _[4]_          |
---
### 2024 August Statement

**File**: `20240830-statements-5697-.pdf.crdownload.pdf`

| Section                  | Expected Transactions |
|--------------------------|----------------------|
| Deposits and Additions   | _[10]_          |
| Checks Paid              | _[3]_          |
| ATM & Debit Card         | _[18]_          |
| Electronic Withdrawals   | _[2]_          |
---
### 2024 September Statement

**File**: `20240930-statements-5697-.pdf.crdownload.pdf`

| Section                  | Expected Transactions |
|--------------------------|----------------------|
| Deposits and Additions   | _[5]_          |
| Checks Paid              | _[9]_          |
| ATM & Debit Card         | _[26]_          |
| Electronic Withdrawals   | _[3]_          |
---
### 2024 October Statement

**File**: `20241031-statements-5697-.pdf.crdownload.pdf`

| Section                  | Expected Transactions |
|--------------------------|----------------------|
| Deposits and Additions   | _[12]_          |
| Checks Paid              | _[6]_          |
| ATM & Debit Card         | _[21]_          |
| Electronic Withdrawals   | _[3]_          |
---
### 2024 November Statement

**File**: `20241129-statements-5697-.pdf.crdownload.pdf`

| Section                  | Expected Transactions |
|--------------------------|----------------------|
| Deposits and Additions   | _[4]_          |
| Checks Paid              | _[5]_          |
| ATM & Debit Card         | _[20]_          |
| Electronic Withdrawals   | _[3]_          |
---
### 2024 December Statement

**File**: `20241231-statements-5697-.pdf`

| Section                  | Expected Transactions |
|--------------------------|----------------------|
| Deposits and Additions   | _[10]_          |
| Checks Paid              | _[13]_          |
| ATM & Debit Card         | _[30]_          |
| Electronic Withdrawals   | _[2]_          |
---
## Validation Instructions

### How to Fill This Document
1. **Manual Review**: Open each PDF and manually count transactions in each section
2. **Section Identification**: Look for clear section headers (Checking, Savings, Credit Card)
3. **Transaction Types**: Count deposits, withdrawals, purchases, payments separately
4. **Verification**: Double-check totals match section summaries in PDF
5. **Notes**: Add any special observations about transaction formats

### Using for Testing
1. **Run PDF Parser**: Process each PDF with our extraction method
2. **Compare Results**: Match extracted transaction counts vs expected counts
3. **Identify Gaps**: Note any discrepancies for parser improvement
4. **Section Analysis**: Verify parser correctly identifies different sections
5. **Edge Cases**: Document any unusual transaction formats or edge cases

### Test Automation
After filling expected counts, this data can be used to create automated tests:
```javascript
// Example test structure
describe('Chase PDF Parsing Validation', () => {
  const expectedCounts = require('./chase-pdf-expected-counts.json');
  
  expectedCounts.forEach(pdfData => {
    it(`should extract correct transaction counts from ${pdfData.filename}`, async () => {
      const result = await chasePDFParser.parsePDF(pdfData.filepath);
      expect(result.totalTransactions).toBe(pdfData.grandTotal);
      // Additional section-specific validations
    });
  });
});
```

## Notes
- **_[TO_FILL]_** placeholders should be replaced with actual transaction counts
- **Bold totals** represent aggregated counts that should match sum of components
- **Account types** may vary depending on what's included in each statement
- **Section headers** in PDFs should be used to identify different account types
- **Date ranges** help context for transaction volume expectations

This document will serve as the source of truth for validating our PDF parsing accuracy across multiple Chase bank statements.
