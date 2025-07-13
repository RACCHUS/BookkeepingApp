import fs from 'fs';
import path from 'path';

let pdfParse;
try {
  pdfParse = (await import('pdf-parse')).default;
  console.log('✅ pdf-parse imported successfully');
} catch (e) {
  console.error('❌ Failed importing pdf-parse:', e);
  process.exit(1);
}

import ChaseSectionExtractor from '../services/parsers/ChaseSectionExtractor.js';

// Inline utility and parser for standalone behavior
class ChaseDateUtils {
  static toISODate(dateStr, year) {
    const normalizedDateStr = (dateStr || '').replace(/-/g, '/');
    const [month, day] = normalizedDateStr.split('/').map(Number);
    if (!month || !day) return null;
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T12:00:00`;
  }
}

class ChaseTransactionParser {
  static parseDepositLine(line, year) {
    const cleanLine = line.trim();
    if (!cleanLine || cleanLine.includes('DATE') || cleanLine.includes('Total')) return null;

    const dateMatch = cleanLine.match(/^(\d{1,2}\/\d{1,2})/);
    if (!dateMatch) return null;
    const dateStr = dateMatch[1];

    let amountMatch =
      cleanLine.match(/\s+\$?(\d{1,3}(?:,\d{3})*\.\d{2})\s*$/);

    if (!amountMatch) {
      return null;
    }
    let amountStr = amountMatch[1];

    if (amountStr.startsWith('1') && (amountStr.includes(',') || amountStr.length >= 6)) {
      const withoutFirst = amountStr.substring(1);
      if (/^\d{1,3}(?:,\d{3})*\.?\d{0,2}$/.test(withoutFirst) || /^\d{3,4}\.\d{2}$/.test(withoutFirst)) {
        amountStr = withoutFirst;
      }
    }

    const cleanAmountStr = amountStr.replace(/,/g, '');
    const amount = parseFloat(cleanAmountStr.includes('.') ? cleanAmountStr : `${cleanAmountStr}.00`);
    if (isNaN(amount)) return null;

    const dateEnd = dateMatch.index + dateMatch[0].length;
    const amountStart = amountMatch.index;
    const description = cleanLine.substring(dateEnd, amountStart).trim().replace(/\s+/g, ' ');

    if (!description) return null;
    const date = ChaseDateUtils.toISODate(dateStr, year);

    return { date, amount, description };
  }

  static parseCheckLine(line, year) {
    const match = line.match(/(\d+)\s*[^\d\s]?[\^]?\s*(\d{2}\/\d{2})(?:\s*(\d{2}\/\d{2}))?\s*\$?(\d{1,3}(?:,\d{3})*\.\d{2})/);
    if (!match) return null;
    const checkNum = match[1];
    const dateStr = match[3] || match[2];
    const amount = parseFloat(match[4].replace(/,/g, ''));
    if (isNaN(amount)) return null;
    const date = ChaseDateUtils.toISODate(dateStr, year);
    return { date, amount, description: `CHECK #${checkNum}` };
  }

  static parseCardLine(line, year) {
    const match = line.match(/^(\d{2}\/\d{2})\s*Card Purchase(?:\s+With Pin)?\s*(?:\d{2}\/\d{2}\s+)?(.+?)\s+[A-Z]{2}\s+Card\s+1819\s*\$?(\d{1,3}(?:,\d{3})*\.\d{2})$/);
    if (!match) return null;
    const [_, dateStr, rawMerchant, amountStr] = match;
    const amount = parseFloat(amountStr.replace(/,/g, ''));
    if (isNaN(amount)) return null;
    const date = ChaseDateUtils.toISODate(dateStr, year);
    return { date, amount, description: rawMerchant.trim() };
  }

  static parseElectronicLine(line, year) {
    const match = line.match(/(\d{2}\/\d{2})\s+Orig CO Name:([^O]+?)(?:Orig|$)/);
    if (!match) return null;
    const dateStr = match[1];
    const company = match[2].trim();
    const amountMatch = line.match(/\$?(\d{1,3}(?:,\d{3})*\.\d{2})/);
    if (!amountMatch) return null;
    const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    if (isNaN(amount)) return null;
    const date = ChaseDateUtils.toISODate(dateStr, year);
    return { date, amount, description: `Electronic Payment: ${company}` };
  }
}

function extractLines(sectionText) {
  return sectionText ? sectionText.split('\n').map(l => l.trim()).filter(Boolean) : [];
}

// MAIN TEST FUNCTION
async function test() {
  const dataDir = path.join(
    'C:', 'Users', 'richa', 'Documents', 'Code', 'BookkeepingApp', 'server', 'test', 'data', 'pdfs', 'chase'
  );

  const expectedJsonPath = path.join(dataDir, 'expected-transaction-counts.json');

  if (!fs.existsSync(expectedJsonPath)) {
    console.error(`❌ Expected JSON file not found: ${expectedJsonPath}`);
    process.exit(1);
  }

  const rawJson = fs.readFileSync(expectedJsonPath, 'utf-8');
  const expectedCounts = JSON.parse(rawJson);

  let totalMatched = 0;

  // Import the regular parser
  const parser = (await import('../services/chasePDFParser.js')).default;

  for (const { filename, deposits, checks, card, electronic } of expectedCounts) {
    const filePath = path.join(dataDir, filename);

    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${filename} at path: ${filePath}`);
      continue;
    }

    let result;
    try {
      result = await parser.parsePDF(filePath, 'test-user');
      console.log(`📄 Parsing file: ${filename}`);
    } catch (e) {
      console.error(`❌ Error parsing PDF ${filename}:`, e);
      continue;
    }


    const transactions = result.transactions || [];
    // Count by type
    const depParsed = transactions.filter(tx => tx.sectionCode === 'deposits');
    const checkParsed = transactions.filter(tx => tx.sectionCode === 'checks');
    const cardParsed = transactions.filter(tx => tx.sectionCode === 'card');
    const elecParsed = transactions.filter(tx => tx.sectionCode === 'electronic');

    const ok =
      depParsed.length === deposits &&
      checkParsed.length === checks &&
      cardParsed.length === card &&
      elecParsed.length === electronic;

    console.log(`\n📄 ${filename}`);
    console.log(`   Deposits:   expected ${deposits}, found ${depParsed.length}`);
    console.log(`   Checks:     expected ${checks},   found ${checkParsed.length}`);
    console.log(`   Card:       expected ${card},     found ${cardParsed.length}`);
    console.log(`   Electronic: expected ${electronic}, found ${elecParsed.length}`);
    console.log(`   Total transactions found: ${transactions.length}`);

    if (ok) {
      console.log('✅ All counts match.');
      totalMatched++;
    } else {
      console.log('❌ Mismatch found.');
    }
  }

  console.log(`\n🎯 Matched ${totalMatched}/${expectedCounts.length} PDFs.`);
}

test();
