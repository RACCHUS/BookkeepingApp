import PDFParserService from './services/pdfParser.js';

// Test the patterns directly
const testLines = [
  '529 ^ 01/03 $1,000.00',
  '530 ^ 01/03 1,500.00',
  '538 *^ 01/19 2,500.00'
];

console.log('Testing transaction line parsing...');
testLines.forEach((line, index) => {
  console.log(`\nTesting line ${index + 1}: ${line}`);
  const result = PDFParserService.parseChaseTransactionLine(line, 2025);
  console.log('Result:', result ? 'PARSED' : 'NOT PARSED');
  if (result) {
    console.log('  Description:', result.description);
    console.log('  Amount:', result.amount);
    console.log('  Date:', result.date);
  }
});
