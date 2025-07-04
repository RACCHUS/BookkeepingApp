import fs from 'fs/promises';
import pdfParse from 'pdf-parse';
import ChaseSectionExtractor from './services/parsers/ChaseSectionExtractor.js';
import ChaseTransactionParser from './services/parsers/ChaseTransactionParser.js';

// Function to test the full PDF pipeline
async function testPDFPipeline(pdfPath) {
  console.log(`🔍 Testing PDF pipeline with: ${pdfPath}`);
  
  try {
    // Step 1: Read and parse PDF
    console.log('\n1. Reading PDF file...');
    const pdfBuffer = await fs.readFile(pdfPath);
    console.log(`   File size: ${pdfBuffer.length} bytes`);
    
    // Step 2: Extract text
    console.log('\n2. Extracting text from PDF...');
    const pdfData = await pdfParse(pdfBuffer);
    const text = pdfData.text;
    console.log(`   Text length: ${text.length} characters`);
    console.log(`   First 200 chars: "${text.substring(0, 200)}..."`);
    
    // Step 3: Check if deposits section exists
    console.log('\n3. Checking for deposits section...');
    const hasDepositsSection = text.includes('DEPOSITS AND ADDITIONS');
    console.log(`   Has deposits section: ${hasDepositsSection}`);
    
    if (hasDepositsSection) {
      // Step 4: Extract deposits section
      console.log('\n4. Extracting deposits section...');
      const sectionText = ChaseSectionExtractor.extractDepositsSection(text);
      
      if (sectionText) {
        console.log('   Section extracted successfully');
        console.log(`   Section length: ${sectionText.length} characters`);
        console.log('   Section content:');
        console.log('   --- START ---');
        console.log(sectionText);
        console.log('   --- END ---');
        
        // Step 5: Split into lines
        console.log('\n5. Splitting into lines...');
        const lines = sectionText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        console.log(`   Found ${lines.length} non-empty lines`);
        
        // Step 6: Process each line
        console.log('\n6. Processing each line...');
        const transactions = [];
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          console.log(`\n   Line ${i}: "${line}"`);
          console.log(`   Length: ${line.length} chars`);
          console.log(`   Starts with date? ${/^\d{1,2}\/\d{1,2}/.test(line)}`);
          
          // Check filters
          if (line.includes('DATE') && line.includes('DESCRIPTION')) {
            console.log(`   → SKIP: Header line`);
            continue;
          }
          if (line.includes('Total Deposits') || line.includes('TOTAL DEPOSITS')) {
            console.log(`   → SKIP: Total line`);
            continue;
          }
          if (line.trim() === 'DEPOSITS AND ADDITIONS') {
            console.log(`   → SKIP: Section header`);
            continue;
          }
          
          // Try to parse
          console.log(`   → PARSING...`);
          const tx = ChaseTransactionParser.parseDepositLine(line, 2024);
          if (tx) {
            console.log(`   → ✅ SUCCESS: ${tx.description} - $${tx.amount} on ${tx.date}`);
            transactions.push(tx);
          } else {
            console.log(`   → ❌ FAILED to parse`);
            
            // Additional debug for failed lines
            console.log(`   → Debug: Line details:`);
            console.log(`      - Trimmed: "${line.trim()}"`);
            console.log(`      - Has date pattern: ${/^\d{1,2}\/\d{1,2}/.test(line.trim())}`);
            console.log(`      - Has amount pattern: ${/\$?\d{1,3}(?:,\d{3})*\.?\d{0,2}/.test(line)}`);
            console.log(`      - Char codes: [${line.split('').map(c => c.charCodeAt(0)).slice(0, 20).join(', ')}...]`);
          }
        }
        
        console.log(`\n7. FINAL RESULT:`);
        console.log(`   Total transactions parsed: ${transactions.length}`);
        console.log(`   Expected: 7 (based on your data)`);
        
        if (transactions.length < 7) {
          console.log('   ⚠️  MISSING TRANSACTIONS DETECTED!');
        }
        
        // Show all parsed transactions
        transactions.forEach((tx, idx) => {
          console.log(`   ${idx + 1}. ${tx.date} - ${tx.description} - $${tx.amount}`);
        });
        
      } else {
        console.log('   ❌ Section extraction failed');
      }
    } else {
      console.log('   ❌ No deposits section found in PDF');
    }
    
  } catch (error) {
    console.error('❌ Error testing PDF pipeline:', error);
  }
}

// Check if a PDF file path is provided
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node debug_pdf_pipeline.js <path-to-pdf>');
  console.log('');
  console.log('This script will test the full PDF processing pipeline');
  console.log('to identify where the first deposit transaction is being lost.');
  process.exit(1);
}

const pdfPath = args[0];
testPDFPipeline(pdfPath);
