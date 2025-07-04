import pdfParse from 'pdf-parse';
import fs from 'fs/promises';
import path from 'path';
import ChaseSectionExtractor from './services/parsers/ChaseSectionExtractor.js';
import ChaseTransactionParser from './services/parsers/ChaseTransactionParser.js';

// Test with the actual PDF file without Firebase dependencies
const pdfPath = path.join(process.cwd(), '..', 'uploads', '63dd2bdc-60c3-4220-9168-74ad251553b7-20240131-statements-5697-.pdf.pdf');

console.log('🔍 TESTING REAL PDF PROCESSING (No Firebase)');
console.log('=============================================');
console.log(`PDF Path: ${pdfPath}`);

try {
  // Read and parse PDF directly
  const pdfBuffer = await fs.readFile(pdfPath);
  const pdfData = await pdfParse(pdfBuffer);
  const text = pdfData.text;
  
  console.log(`\n📄 PDF Text Length: ${text.length} characters`);
  
  // Extract deposits section
  console.log('\n🏦 EXTRACTING DEPOSITS SECTION');
  console.log('==============================');
  
  const depositsSection = ChaseSectionExtractor.extractDepositsSection(text);
  
  if (depositsSection) {
    console.log('✅ Deposits section found!');
    console.log('--- START SECTION ---');
    console.log(depositsSection);
    console.log('--- END SECTION ---');
    
    // Split into lines and parse
    const lines = depositsSection.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    console.log(`\n📋 Split into ${lines.length} non-empty lines:`);
    
    lines.forEach((line, idx) => {
      console.log(`Line ${idx}: "${line}"`);
    });
    
    console.log('\n💰 PARSING DEPOSIT TRANSACTIONS');
    console.log('===============================');
    
    const year = 2024; // Use 2024 based on the filename
    const deposits = [];
    
    let processedCount = 0;
    for (const line of lines) {
      processedCount++;
      console.log(`\n🔍 Processing line ${processedCount}: "${line}"`);
      
      // Apply filtering logic
      if (line.includes('DATE') && line.includes('DESCRIPTION')) {
        console.log(`  → SKIPPED: Header line`);
        continue;
      }
      if (line.includes('Total Deposits') || line.includes('TOTAL DEPOSITS')) {
        console.log(`  → SKIPPED: Total line`);
        continue;
      }
      if (line.trim() === 'DEPOSITS AND ADDITIONS') {
        console.log(`  → SKIPPED: Section header`);
        continue;
      }
      
      // Try to parse
      const tx = ChaseTransactionParser.parseDepositLine(line, year);
      if (tx) {
        console.log(`  → ✅ SUCCESS: ${tx.description} - $${tx.amount} on ${tx.date}`);
        deposits.push(tx);
      } else {
        console.log(`  → ❌ FAILED to parse`);
      }
    }
    
    console.log(`\n🎯 FINAL RESULTS`);
    console.log('================');
    console.log(`Parsed ${deposits.length} deposit transactions:`);
    
    deposits.forEach((tx, idx) => {
      console.log(`${idx + 1}. ${tx.date} | ${tx.description} | $${tx.amount}`);
    });
    
    // Check for the missing first transaction
    console.log('\n🔍 CHECKING FOR MISSING FIRST TRANSACTION');
    console.log('==========================================');
    
    const expectedFirst = { date: '01/08', amount: 3640.00 };
    const foundFirst = deposits.find(tx => 
      tx.date.includes('2024-01-08') && Math.abs(tx.amount - expectedFirst.amount) < 0.01
    );
    
    if (foundFirst) {
      console.log(`✅ First transaction FOUND: ${foundFirst.date} | $${foundFirst.amount}`);
    } else {
      console.log(`❌ First transaction MISSING: Expected 01/08 $3,640.00`);
      
      // Check if there's a line that looks like the first transaction
      console.log('\n🔍 Looking for lines containing "01/08"...');
      lines.forEach((line, idx) => {
        if (line.includes('01/08')) {
          console.log(`  Line ${idx}: "${line}"`);
          
          // Try parsing it manually
          const testTx = ChaseTransactionParser.parseDepositLine(line, year);
          if (testTx) {
            console.log(`    → Parses to: ${testTx.description} - $${testTx.amount}`);
          } else {
            console.log(`    → Failed to parse`);
          }
        }
      });
    }
    
  } else {
    console.log('❌ No deposits section found!');
    
    // Search for deposit-related text in the raw PDF
    console.log('\n🔍 SEARCHING FOR DEPOSIT TEXT IN RAW PDF');
    console.log('=========================================');
    
    const depositLines = text.split('\n').filter(line => 
      line.includes('Remote Online Deposit') || 
      line.includes('DEPOSITS AND ADDITIONS')
    );
    
    console.log(`Found ${depositLines.length} lines with deposit-related text:`);
    depositLines.forEach((line, idx) => {
      console.log(`${idx + 1}: "${line.trim()}"`);
    });
  }
  
} catch (error) {
  console.error('❌ Error processing PDF:', error);
}
