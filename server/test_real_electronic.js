import pdfParse from 'pdf-parse';
import fs from 'fs/promises';
import path from 'path';
import ChaseSectionExtractor from './services/parsers/ChaseSectionExtractor.js';

// Test with the actual PDF file to see electronic transactions in context
const pdfPath = path.join(process.cwd(), '..', 'uploads', '63dd2bdc-60c3-4220-9168-74ad251553b7-20240131-statements-5697-.pdf.pdf');

console.log('🔍 TESTING ELECTRONIC TRANSACTIONS IN REAL PDF');
console.log('===============================================');

try {
  // Read and parse PDF directly
  const pdfBuffer = await fs.readFile(pdfPath);
  const pdfData = await pdfParse(pdfBuffer);
  const text = pdfData.text;
  
  console.log(`📄 PDF Text Length: ${text.length} characters`);
  
  // Look for electronic withdrawals in the raw text
  console.log('\n🔍 Searching for electronic withdrawals in raw PDF...');
  const hasElectronicSection = text.includes('ELECTRONIC WITHDRAWALS');
  console.log(`Has electronic section: ${hasElectronicSection}`);
  
  if (hasElectronicSection) {
    // Extract electronic section
    const electronicSection = ChaseSectionExtractor.extractElectronicSection(text);
    
    if (electronicSection) {
      console.log('\n✅ Electronic section extracted!');
      console.log('--- START SECTION ---');
      console.log(electronicSection);
      console.log('--- END SECTION ---');
      
      // Count potential transactions
      const lines = electronicSection.split('\n');
      const dateLines = lines.filter(line => /^\s*\d{2}\/\d{2}.*Orig CO Name:/.test(line));
      console.log(`\n📊 Found ${dateLines.length} potential electronic transactions:`);
      
      dateLines.forEach((line, idx) => {
        const match = line.match(/(\d{2}\/\d{2}).*Orig CO Name:([^O\n]+)/);
        if (match) {
          console.log(`${idx + 1}. ${match[1]} - ${match[2].trim()}`);
        }
      });
      
    } else {
      console.log('❌ Could not extract electronic section');
    }
  } else {
    // Look for any text that might contain electronic payments
    console.log('\n🔍 Searching for any electronic payment text...');
    const electronicLines = text.split('\n').filter(line => 
      line.includes('Orig CO Name:') || 
      line.includes('Electronic') ||
      line.includes('ELECTRONIC')
    );
    
    console.log(`Found ${electronicLines.length} lines with electronic-related text:`);
    electronicLines.slice(0, 10).forEach((line, idx) => {
      console.log(`${idx + 1}: "${line.trim()}"`);
    });
  }
  
} catch (error) {
  console.error('❌ Error processing PDF:', error);
}
