# Reports Directory

This directory contains generated reports and exports from the Bookkeeping App.

## Directory Structure

```
reports/
├── README.md           # This documentation file
├── .gitignore         # Ignore generated files
├── generated/         # Runtime-generated reports (not versioned)
│   ├── pdf/          # PDF report exports
│   ├── csv/          # CSV data exports  
│   └── temp/         # Temporary processing files
├── templates/         # Report templates (versioned)
│   ├── profit-loss.html
│   ├── tax-summary.html
│   └── expense-summary.html
└── samples/          # Sample report outputs (for testing/demo)
    ├── sample-profit-loss.pdf
    └── sample-tax-summary.pdf
```

## Generated Reports Location

**Production**: Generated reports are stored in Firebase Storage under `/users/{userId}/reports/`

**Development**: Generated reports are temporarily stored in `generated/` subdirectories

## Report Types

### PDF Reports
- **Profit & Loss Statements**: Financial performance over time periods
- **Tax Summary Reports**: IRS category breakdown for tax filing
- **Expense Summary Reports**: Detailed expense analysis
- **Employee Payment Reports**: 1099 contractor payment tracking

### CSV Exports
- **Transaction Exports**: Raw transaction data with filters
- **Category Summaries**: Expense/income by category
- **Monthly Summaries**: Period-based financial summaries

## File Naming Convention

Generated files follow this pattern:
```
{report-type}-{userId}-{timestamp}.{extension}

Examples:
- profit-loss-KAqbZ0AIowcTSd6cjqjSfGfjC2M2-1752136859020.pdf
- tax-summary-KAqbZ0AIowcTSd6cjqjSfGfjC2M2-2024-12-31.pdf
- transactions-export-userId123-20241231.csv
```

## Cleanup

Generated files are automatically cleaned up:
- **Local files**: Deleted after 24 hours
- **Firebase Storage**: Expired after 30 days (configurable)
- **Temporary files**: Deleted immediately after processing

## Security

- Generated reports contain sensitive financial data
- Access restricted to authenticated users
- Files are user-scoped (userId in filename/path)
- Automatic cleanup prevents data accumulation

## Development

When working locally:
1. Generated files appear in `generated/` subdirectories
2. Use sample files from `samples/` for testing
3. Templates in `templates/` can be modified for layout changes
4. All generated content is gitignored

## API Integration

Reports are generated via:
- `POST /api/reports/generate` - Generate new report
- `GET /api/reports/{reportId}` - Download generated report
- `DELETE /api/reports/{reportId}` - Delete report (admin only)

See [REPORTS.md](../docs/REPORTS.md) for detailed API documentation.
