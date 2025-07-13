import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import ChaseSectionExtractor from '../services/parsers/ChaseSectionExtractor.js';
import ChaseTransactionParser from '../services/parsers/ChaseTransactionParser.js';
import createTransaction from '../services/parsers/createTransaction.js';

/**
 * Debugs electronic extraction for a single Chase PDF statement.
 * Shows raw extracted electronic section, cleaned lines, and final transaction objects.
 * Only uses logic from server/services.
 */
async function debugElectronic() {
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

  // Extract electronic section using service logic
  const electronicSection = ChaseSectionExtractor.extractElectronicSection(text);
  if (!electronicSection) {
    console.error('No electronic section found!');
    return;
  }

  // Show raw extracted electronic section
  console.log('--- RAW ELECTRONIC SECTION ---');
  console.log(electronicSection);

  // Split into lines and show cleaned lines
  const lines = electronicSection.split('\n').map(l => l.trim()).filter(Boolean);
  console.log('--- CLEANED ELECTRONIC LINES ---');
  lines.forEach((line, idx) => {
    console.log(`[${idx + 1}]: '${line}'`);
  });

  // Parse each line using the actual parser
  const parsedElectronic = lines
    .map(line => ChaseTransactionParser.parseElectronicLine(line, 2024))
    .filter(tx => tx);

  // Show parsed electronic objects (pre-transaction)
  console.log('--- PARSED ELECTRONIC OBJECTS ---');
  parsedElectronic.forEach((obj, idx) => {
    console.log(`[PARSED ${idx + 1}]:`, obj);
  });

  // Create final transaction objects using createTransaction (async)
  const userId = 'debug-user';
  const companyId = '';
  const companyName = '';
  const finalTransactions = [];
  for (const obj of parsedElectronic) {
    const tx = await createTransaction(
      obj.date ? obj.date.slice(5, 10) : '',
      obj.description,
      obj.amount.toString(),
      obj.type || 'expense',
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
  console.log(`Total final electronic transactions: ${finalTransactions.length}`);
}

debugElectronic();
