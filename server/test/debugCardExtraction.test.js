import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import ChaseSectionExtractor from '../services/parsers/ChaseSectionExtractor.js';
import ChaseTransactionParser from '../services/parsers/ChaseTransactionParser.js';
import createTransaction from '../services/parsers/createTransaction.js';

/**
 * Debugs card extraction for a single Chase PDF statement.
 * Shows raw extracted card section, cleaned lines, and final transaction objects.
 * Only uses logic from server/services.
 */
async function debugCard() {
  const filePath = path.resolve(
    'server', 'test', 'data', 'pdfs', 'chase', '20240131-statements-5697-.pdf.pdf'
  );
  if (!fs.existsSync(filePath)) {
    console.error('PDF file not found:', filePath);
    return;
  }

  const dataBuffer = fs.readFileSync(filePath);
  const pdfData = await pdfParse(dataBuffer);
  const text = pdfData.text;

  // Extract card section using service logic
  const cardSection = ChaseSectionExtractor.extractCardSection(text);
  if (!cardSection) {
    console.error('No card section found!');
    return;
  }

  // Show raw extracted card section
  console.log('--- RAW CARD SECTION ---');
  console.log(cardSection);

  // Split into lines and show cleaned lines
  const lines = cardSection.split('\n').map(l => l.trim()).filter(Boolean);
  console.log('--- CLEANED CARD LINES ---');
  lines.forEach((line, idx) => {
    console.log(`[${idx + 1}]: '${line}'`);
  });

  // Parse each line using the actual parser
  const parsedCards = lines
    .map(line => ChaseTransactionParser.parseCardLine(line, 2024))
    .filter(tx => tx);

  // Show parsed card objects (pre-transaction)
  console.log('--- PARSED CARD OBJECTS ---');
  parsedCards.forEach((obj, idx) => {
    console.log(`[PARSED ${idx + 1}]:`, obj);
  });

  // Create final transaction objects using createTransaction (async)
  const userId = 'debug-user';
  const companyId = '';
  const companyName = '';
  const finalTransactions = [];
  for (const obj of parsedCards) {
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
  console.log(`Total final card transactions: ${finalTransactions.length}`);
}

debugCard();
