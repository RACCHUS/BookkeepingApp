import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import ChaseSectionExtractor from '../services/parsers/ChaseSectionExtractor.js';
import ChaseTransactionParser from '../services/parsers/ChaseTransactionParser.js';
import createTransaction from '../services/parsers/createTransaction.js';

/**
 * Debugs deposit extraction for a single Chase PDF statement.
 * Shows raw extracted deposit section, cleaned lines, and final transaction objects.
 * Only uses logic from server/services.
 */
async function debugDeposits() {
  const filePath = path.resolve(
    'server', 'test', 'data', 'pdfs', 'chase', '20240830-statements-5697-.pdf.crdownload.pdf'
  );
  if (!fs.existsSync(filePath)) {
    console.error('PDF file not found:', filePath);
    return;
  }

  const dataBuffer = fs.readFileSync(filePath);
  const pdfData = await pdfParse(dataBuffer);
  const text = pdfData.text;

  // Extract deposits section using service logic
  const depositsSection = ChaseSectionExtractor.extractDepositsSection(text);
  if (!depositsSection) {
    console.error('No deposits section found!');
    return;
  }

  // Show raw extracted deposit section
  console.log('--- RAW DEPOSITS SECTION ---');
  console.log(depositsSection);

  // Split into lines and show cleaned lines
  const lines = depositsSection.split('\n').map(l => l.trim()).filter(Boolean);
  console.log('--- CLEANED DEPOSIT LINES ---');
  lines.forEach((line, idx) => {
    console.log(`[${idx + 1}]: '${line}'`);
  });

  // Parse each line using the actual parser
  const parsedDeposits = lines
    .map(line => ChaseTransactionParser.parseDepositLine(line, 2024))
    .filter(tx => tx);

  // Show parsed deposit objects (pre-transaction)
  console.log('--- PARSED DEPOSIT OBJECTS ---');
  parsedDeposits.forEach((obj, idx) => {
    console.log(`[PARSED ${idx + 1}]:`, obj);
  });

  // Create final transaction objects using createTransaction (async)
  const userId = 'debug-user'; // Use a test userId
  const companyId = '';
  const companyName = '';
  const finalTransactions = [];
  for (const obj of parsedDeposits) {
    // Only use actual service logic, no new parsing
    const tx = await createTransaction(
      obj.date ? obj.date.slice(5, 10) : '', // MM/DD from ISO
      obj.description,
      obj.amount.toString(),
      obj.type || 'income',
      2024,
      userId,
      companyId,
      companyName
    );
    if (tx) finalTransactions.push(tx);
  }

  // Show final transaction objects
  console.log('--- FINAL TRANSACTION OBJECTS ---');
  finalTransactions.forEach((tx, idx) => {
    console.log(`[TX ${idx + 1}]:`, tx);
  });
  console.log(`Total final deposit transactions: ${finalTransactions.length}`);
}

debugDeposits();
