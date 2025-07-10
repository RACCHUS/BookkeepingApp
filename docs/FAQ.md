# Frequently Asked Questions

This document answers common questions about the Bookkeeping App functionality, usage, and technical implementation.

## General Usage

### Q: How do I get started with the app?
**A:** Follow the [Getting Started Guide](GETTING_STARTED.md) to set up your account, create your first company, and upload your first bank statement. The basic workflow is:
1. Create an account and log in
2. Set up a company profile
3. Upload a PDF bank statement
4. Review and categorize transactions
5. Generate reports

### Q: What bank statements are supported?
**A:** The app is primarily designed for Chase bank statements but can handle other PDF-based bank statements. Currently supported:
- Chase Bank (checking, savings, credit cards)
- Generic PDF bank statements with tabular transaction data
- Text-based PDFs (not scanned images)

The system automatically detects Chase format and applies specialized parsing, while other banks use generic PDF text extraction.

### Q: Can I manage multiple businesses?
**A:** Yes! The app supports multiple companies under one user account. You can:
- Create separate company profiles
- Upload statements for different businesses
- Filter transactions and reports by company
- Generate company-specific tax reports

### Q: How accurate is the automatic transaction categorization?
**A:** Transaction categorization is 100% rule-based - it only assigns categories when your custom rules match transaction descriptions. The system:
- Uses only user-defined classification rules
- Assigns categories when rules match transaction text
- Leaves transactions uncategorized if no rules match
- Requires manual review for unmatched transactions

There's no machine learning or "guessing" - categories are only assigned when rules explicitly match.

## PDF Processing

### Q: Why isn't my PDF being processed?
**A:** Common reasons for PDF processing failures:
- **File size too large** (limit: 10MB)
- **Password-protected PDF** (not supported)
- **Scanned image PDF** (text must be selectable)
- **Corrupted or invalid PDF file**

Try opening the PDF in a PDF viewer and checking if you can select/copy text. If not, the PDF is likely a scanned image.

### Q: How long does PDF processing take?
**A:** Processing times vary by file size and complexity:
- Small statements (1-2 pages): 2-5 seconds
- Medium statements (3-10 pages): 5-15 seconds  
- Large statements (10+ pages): 15-30 seconds

Processing happens in the background, so you can navigate away and return later to view results.

### Q: Can I edit transactions after import?
**A:** Yes, you have full control over imported transactions:
- Edit descriptions, amounts, dates, and categories
- Add notes and assign to payees
- Delete incorrect transactions
- Manually add missing transactions

All changes are saved immediately and reflected in reports.

### Q: What if the wrong transactions are extracted?
**A:** The PDF parser sometimes captures extraneous text. You can:
- Delete invalid transactions individually
- Use the batch selection to delete multiple transactions
- Report parsing issues to help improve the parser
- Manually add any missing transactions

## Transaction Classification

### Q: How do I create classification rules?
**A:** Navigate to Settings > Classification Rules and create rules by:
1. Entering a text pattern to match (e.g., "PAYROLL")
2. Selecting the target IRS tax category
3. Setting priority (higher numbers are checked first)
4. Choosing case sensitivity and regex options

Rules are applied in priority order until a match is found.

### Q: My classification rules aren't working. What's wrong?
**A:** Common rule issues:
- **Case sensitivity**: Check if your rule needs to be case-sensitive
- **Pattern too specific**: Try broader patterns like "AMAZON" instead of "AMAZON MARKETPLACE"
- **Priority conflicts**: Higher priority rules might match first
- **Regex errors**: If using regex, verify the pattern is valid

Enable debug mode in development to see which rules are being tested.

### Q: Can I have different rules for different companies?
**A:** Currently, classification rules are user-level (apply to all companies). This is planned to be enhanced to support company-specific rules in a future update.

### Q: What are the available tax categories?
**A:** The app uses standard IRS business tax categories including:
- **Income**: Business Income, Interest Income, Rental Income
- **Expenses**: Advertising, Office Expense, Travel, Meals, Utilities, etc.
- **Personal**: Personal Income/Expense, Transfers, Uncategorized

See the [Transaction Classification Guide](TRANSACTION_CLASSIFICATION.md) for the complete list.

## Reports and Analytics

### Q: What reports can I generate?
**A:** Available reports include:
- **Profit & Loss Statement**: Income vs expenses over a period
- **Tax Summary Report**: IRS category breakdown for tax filing
- **Expense Summary**: Detailed expense analysis by category
- **Employee Payment Report**: Contractor payments for 1099 reporting
- **Custom date range reports**

All reports can be exported to PDF format.

### Q: How do I generate a year-end tax report?
**A:** To generate tax reports:
1. Go to Reports section
2. Select "Tax Summary Report"
3. Choose the tax year (e.g., 2024)
4. Select company (if multiple)
5. Click "Generate Report"

The report will show income and expenses organized by IRS form lines.

### Q: Can I export data to Excel or my accountant's software?
**A:** Currently, the app exports to PDF format. CSV export and accounting software integration (QuickBooks, etc.) are planned for future releases.

### Q: Why don't my reports match my bank balance?
**A:** Report totals may differ from bank balances because:
- Personal transactions mixed with business transactions
- Transfers between accounts (should be categorized as "Transfer")
- Transactions from multiple time periods
- Unprocessed or missing transactions

Review your transaction categorization and ensure all business transactions are properly classified.

## Technical Questions

### Q: Is my financial data secure?
**A:** Yes, security is a top priority:
- All data is encrypted in transit and at rest
- Firebase security rules restrict access to user's own data
- No data is shared with third parties
- Regular security audits and updates

See the [Security Documentation](DATABASE.md#security-rules) for technical details.

### Q: Can I use this app offline?
**A:** The app requires an internet connection for most functions (authentication, data sync, PDF processing). Basic viewing of cached data may work offline, but full functionality requires connectivity.

### Q: What browsers are supported?
**A:** The app works on modern browsers including:
- Chrome (recommended)
- Firefox
- Safari
- Edge

Mobile browsers are supported but the experience is optimized for desktop use.

### Q: Can multiple users access the same company data?
**A:** Currently, each user account has private access to their own companies and data. Multi-user company access is planned for future releases.

## Account and Billing

### Q: Is there a free trial?
**A:** Check the current pricing model on the app's main page. The app is currently in development and pricing structure may vary.

### Q: How do I delete my account?
**A:** To delete your account:
1. Export any data you want to keep
2. Contact support or use account deletion feature (if available)
3. All data will be permanently removed within 30 days

### Q: Can I export my data before canceling?
**A:** Yes, you can export your data through the Reports section. Generate reports for all time periods and companies before account deletion.

## Troubleshooting

### Q: The app is loading slowly. What can I do?
**A:** To improve performance:
- Close unnecessary browser tabs
- Clear browser cache and cookies
- Check your internet connection
- Try using a different browser
- Use date range filters to reduce data loading

### Q: I'm getting authentication errors. How do I fix this?
**A:** Try these steps:
1. Log out and log back in
2. Clear browser cache and cookies
3. Disable browser extensions
4. Check if your email is verified
5. Try an incognito/private browser window

### Q: My uploaded PDF disappeared. Where did it go?
**A:** Check the Uploads section to see processing status. PDFs might be:
- Still processing (wait for completion)
- Failed to process (check error message)
- Successfully processed (transactions extracted)

Processing failures are usually due to unsupported PDF formats or file size limits.

### Q: I accidentally deleted transactions. Can I recover them?
**A:** Currently, there's no undo function for deleted transactions. You can:
- Re-upload the original PDF to re-extract transactions
- Manually recreate the deleted transactions
- Contact support if you need assistance

## Development and Integration

### Q: Is there an API for third-party integrations?
**A:** The app has a REST API that powers the frontend, but it's not currently documented for external use. API documentation for third-party developers is planned for future releases.

### Q: Can I contribute to the project?
**A:** The project is currently in private development. Check the repository for contribution guidelines if/when it becomes open source.

### Q: How can I request new features?
**A:** Feature requests can be submitted through:
- GitHub issues (if repository is public)
- Support contact form
- User feedback within the app

Priority is given to features that benefit the majority of users.

### Q: What technologies does the app use?
**A:** The app is built with:
- **Frontend**: React, Vite, TailwindCSS, React Query
- **Backend**: Node.js, Express, Firebase Cloud Functions
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **File Storage**: Firebase Storage

See the [Development Guide](DEVELOPMENT.md) for detailed technical information.

## Business Use Cases

### Q: Can I use this for personal finance tracking?
**A:** While designed for business bookkeeping, the app can handle personal finances. Create a "Personal" company and categorize transactions as personal income/expenses.

### Q: Is this suitable for large businesses?
**A:** The app is designed for small to medium businesses. For large enterprises with complex accounting needs, consider dedicated accounting software like QuickBooks Enterprise.

### Q: Can I track inventory or assets?
**A:** The current version focuses on transaction tracking and categorization. Inventory and asset management features are not included but may be added in future releases.

### Q: Does this replace my accountant?
**A:** The app helps organize and categorize financial data, but it doesn't replace professional accounting advice. Use the generated reports as input for your accountant or tax professional.

### Q: Can I track employee payroll?
**A:** The app can track payroll expenses and payments to contractors (for 1099 reporting), but it's not a full payroll management system. For comprehensive payroll processing, use dedicated payroll software.

## Still Have Questions?

If your question isn't answered here:

1. **Check the Documentation**: Review the [Getting Started Guide](GETTING_STARTED.md) and other documentation
2. **Search GitHub Issues**: Look for similar questions or issues
3. **Contact Support**: Use the contact form or support email
4. **Check Status Page**: Verify if there are any known system issues

For technical issues, please include:
- Browser and version
- Error messages or screenshots
- Steps to reproduce the problem
- Your account email (but never your password)
