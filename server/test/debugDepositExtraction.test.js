import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import ChaseSectionExtractor from '../services/parsers/ChaseSectionExtractor.js';
import ChaseTransactionParser from '../services/parsers/ChaseTransactionParser.js';

/**
 * Debugs deposit extraction for a single Chase PDF statement.
 * Prints each line in the deposits section, shows which lines are parsed/skipped, and the parsed result.
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

  // Extract deposits section
  const depositsSection = ChaseSectionExtractor.extractDepositsSection(text);
  if (!depositsSection) {
    console.error('No deposits section found!');
    return;
  }

  // Split into lines and debug each
  const lines = depositsSection.split('\n').map(l => l.trim()).filter(Boolean);
  let parsedCount = 0;
  console.log('--- Deposits Section Lines ---');
  // Print total number of lines and enumerate all lines before parsing
  console.log(`Deposits section contains ${lines.length} lines:`);
  lines.forEach((line, idx) => {
    console.log(`  [LINE ${idx + 1}]: '${line}'`);
  });
  lines.forEach((line, idx) => {
    let cleanedLine = line.trim()
      // Insert space after date if missing
      .replace(/^(\d{1,2}\/\d{1,2})([A-Za-z])/, '$1 $2')
      // Insert space between last digit after 'Deposit' and the amount
      .replace(/(Deposit\s*\d)(?=\d{2,}\.\d{2})/, '$1 ');
    let parsedOriginal = ChaseTransactionParser.parseDepositLine(line, 2024);
    let parsedCleaned = ChaseTransactionParser.parseDepositLine(cleanedLine, 2024);
    console.log(`Line ${idx + 1}:`);
    console.log(`  [RAW]     '${line}'`);
    console.log(`  [CLEANED] '${cleanedLine}'`);
    let parsed = parsedOriginal || parsedCleaned;
    if (parsed) {
      parsedCount++;
      if (parsedOriginal) {
        console.log(`  [PARSED RAW]`, parsedOriginal);
      } else {
        console.log(`  [PARSED CLEANED]`, parsedCleaned);
      }
    } else {
      console.log(`  [SKIPPED RAW]`);
      console.log(`  [SKIPPED CLEANED]`);
    }
    // Print character codes for raw line
    const charCodes = Array.from(line).map(c => c.charCodeAt(0));
    console.log(`  [CHARCODES]`, charCodes.join(' '));
    console.log(`  [RUNNING COUNT]: ${parsedCount}`);
  });
  console.log(`Total parsed deposits: ${parsedCount}`);
}

debugDeposits();
