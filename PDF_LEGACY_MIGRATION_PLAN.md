# PDF Extraction Legacy Migration Plan

**Status**: Pending  
**Created**: January 5, 2026  
**Goal**: Deprecate PDF extraction/parsing while keeping PDF upload and transaction linking

---

## Overview

PDF extraction from bank statements is being deprecated. Users can still:
- ✅ Upload PDF files (bank statements, receipts, checks)
- ✅ Link transactions to uploaded PDFs manually
- ✅ View and manage uploaded PDFs

Users can NO longer:
- ❌ Extract transactions automatically from PDFs
- ❌ Process PDFs to parse transaction data

---

## Phase 1: Create Legacy Directory Structure

Create `server/legacy/` to preserve extraction code:

```
server/legacy/
├── README.md                    # Deprecation notice & restoration instructions
├── pdf-parsing/
│   ├── chasePDFParser.js       # Move from server/services/
│   └── parsers/                # Move from server/services/parsers/
│       ├── ChaseClassifier.js
│       ├── ChaseDateUtils.js
│       ├── ChaseSectionExtractor.js
│       ├── ChaseSectionExtractorLogs.js
│       ├── ChaseSectionExtractorNoLog.js
│       ├── ChaseSummary.js
│       ├── ChaseTransactionParser.js
│       ├── ChaseTransactionParserNoLog.js
│       ├── createTransaction.js
│       ├── extractCompanyInfo.js
│       ├── parserConstants.js
│       ├── parseTransactionLine.js
│       └── index.js
└── tests/
    ├── chasePDFParser.test.js
    └── parsers/                # All parser unit tests
```

---

## Phase 2: Backend Changes

### 2.1 Move Files to Legacy

| Source | Destination |
|--------|-------------|
| `server/services/chasePDFParser.js` | `server/legacy/pdf-parsing/` |
| `server/services/parsers/*` | `server/legacy/pdf-parsing/parsers/` |
| `server/test/unit/services/chasePDFParser.test.js` | `server/legacy/tests/` |
| `server/test/unit/services/parsers/*` | `server/legacy/tests/parsers/` |
| `scripts/development/debug-pdf-analysis.js` | `server/legacy/scripts/` |

### 2.2 Modify pdfController.js

**Remove/Comment Out:**
- `processPDF` function
- `getProcessingStatus` function
- `extractTransactions` helper function
- Any imports from `chasePDFParser.js`

**Keep:**
- `uploadPDF` - File upload only (remove auto-processing option)
- `getUploads` - List uploads
- `getUpload` - Get upload details
- `deleteUpload` - Delete upload
- `batchDeleteUploads` - Batch delete
- `renameUpload` - Rename upload
- `updateUploadCompany` - Update company
- `linkTransactions` - Link transactions to upload
- `unlinkTransactions` - Unlink transactions

### 2.3 Modify pdfRoutes.js

**Remove:**
```javascript
router.post('/:uploadId/process', ...)     // Remove
router.get('/:uploadId/status', ...)       // Remove  
router.get('/test-chase', ...)             // Remove
```

**Keep all other routes.**

### 2.4 Modify cleanFirebaseService.js

**Remove:**
- `processedCount` references
- `processingStatus` field handling
- `parsedData` storage

**Keep:**
- All upload CRUD methods
- `linkTransactionsToUpload`
- `unlinkTransactionsFromUpload`
- `getUploadTransactions`

---

## Phase 3: Frontend Changes

### 3.1 Modify PDFUploader.jsx

**Remove:**
- `isProcessing` state
- `processPDF` mutation
- `handleProcessPDF` function
- `shouldProcess` checkbox and state
- "Process" button in file list
- Processing status display
- `autoProcess` option

**Keep:**
- Dropzone for file upload
- Company selector
- File list display
- Upload mutation
- Success/error feedback

### 3.2 Modify UploadDetails.jsx / PDFList.jsx

**Remove:**
- `processing` status handling
- Processing progress indicators
- Extracted transaction counts from processing

**Keep:**
- Upload metadata display
- Linked transaction count
- Company information
- Delete/rename functionality

### 3.3 Modify uploadService.js

**Remove:**
- `processUpload` function
- `getProcessingStatus` function

**Keep:**
- `uploadPDF`
- `getUploads`
- `getUpload`
- `deleteUpload`
- `batchDelete`
- `renameUpload`
- `updateCompany`
- `linkTransactions`
- `unlinkTransactions`

### 3.4 Modify DocumentManagement.jsx

**Remove:**
- Any "Process PDF" buttons or options
- Auto-process toggle
- Processing status indicators

**Keep:**
- Upload tab functionality
- Manage tab with upload list
- Company filtering

---

## Phase 4: Database Schema Updates

### Upload Document (Firestore)

**Fields to simplify:**
```javascript
// BEFORE
status: 'pending' | 'processing' | 'completed' | 'error'
processedCount: number
parsedData: object

// AFTER  
status: 'uploaded' | 'error'  // Simplified
// Remove: processedCount, parsedData
```

### Transaction Document (Firestore)

**Keep unchanged:**
```javascript
statementId: string  // Still used for manual linking
```

---

## Phase 5: Documentation Updates

### Update These Files:
- `docs/PDF_PROCESSING.md` - Mark as legacy, reference new workflow
- `README.md` - Update feature list
- `.github/copilot-instructions.md` - Update PDF section

### Create:
- `server/legacy/README.md` - Deprecation notice with restoration instructions

---

## Implementation Checklist

```
[ ] Phase 1: Create legacy directory structure
    [ ] Create server/legacy/pdf-parsing/
    [ ] Create server/legacy/tests/
    [ ] Create server/legacy/README.md

[ ] Phase 2: Backend migration
    [ ] Move chasePDFParser.js to legacy
    [ ] Move services/parsers/* to legacy
    [ ] Move parser tests to legacy
    [ ] Modify pdfController.js (remove extraction)
    [ ] Modify pdfRoutes.js (remove extraction routes)
    [ ] Modify cleanFirebaseService.js (remove processing fields)
    [ ] Test remaining upload/link functionality

[ ] Phase 3: Frontend migration  
    [ ] Modify PDFUploader.jsx (remove processing UI)
    [ ] Modify PDFList.jsx (remove processing status)
    [ ] Modify UploadDetails.jsx (simplify status)
    [ ] Modify DocumentManagement.jsx (remove process options)
    [ ] Modify uploadService.js (remove process functions)
    [ ] Test upload and linking workflow

[ ] Phase 4: Database cleanup
    [ ] Remove parsedData from new uploads
    [ ] Simplify status values
    [ ] Keep statementId on transactions

[ ] Phase 5: Documentation
    [ ] Update docs/PDF_PROCESSING.md
    [ ] Update README.md
    [ ] Update copilot-instructions.md
    [ ] Create legacy/README.md
```

---

## New User Workflow

### Before (Deprecated)
1. Upload PDF → 2. Auto-extract transactions → 3. Review & classify

### After (New)
1. Upload PDF (as reference document)
2. Manually enter transactions OR import from CSV
3. Link transactions to PDF statement for reference

---

## Rollback Instructions

If extraction needs to be restored:

1. Move files from `server/legacy/pdf-parsing/` back to `server/services/`
2. Restore removed routes in `pdfRoutes.js`
3. Restore removed controller functions in `pdfController.js`
4. Restore frontend processing UI components
5. See `server/legacy/README.md` for detailed steps

---

## Notes

- All legacy code preserved in `server/legacy/` for potential future use
- Transaction-to-PDF linking remains fully functional
- CSV import becomes the primary bulk transaction entry method
- Manual transaction entry available for individual entries
