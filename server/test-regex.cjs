const pdfParse = require('pdf-parse');
const fs = require('fs').promises;

// Test specific regex patterns
async function testRegexPatterns() {
  const testLines = [
    '01/02Card Purchase 12/29 Chevron 0202648 Plantation FL Card 1819$38.80',
    '01/02Card Purchase 12/30 Goldenrod Petroleum Orlando FL Card 181930.00',
    '01/04Card Purchase With Pin 01/04 Chevron/Sunshine 39 Plantation FL Card 181960.00',
    '01/08Card Purchase With Pin 01/07 2185 N    Universi Sunrise FL Card 181948.38',
    '01/09Card Purchase With Pin 01/09 Lowe\'s #1681 Pembroke Pnes FL Card 181987.74'
  ];
  
  console.log('🧪 Testing regex patterns:\n');
  
  testLines.forEach((line, i) => {
    console.log(`Test ${i + 1}: ${line}`);
    
    // Pattern 1: Original
    const pattern1 = /^(\d{2}\/\d{2})Card Purchase(?: With Pin)?(?: \d{2}\/\d{2})?\s+(.+?)\s+Card \d+\$?([\d,]+\.?\d{2})$/;
    const match1 = line.match(pattern1);
    if (match1) {
      console.log(`  Pattern 1 ✅: Date=${match1[1]}, Desc='${match1[3]}', Amount=${match1[4]}`);
    } else {
      console.log(`  Pattern 1 ❌`);
    }
    
    // Pattern 2: Handle no $ symbol
    const pattern2 = /^(\d{2}\/\d{2})Card Purchase(?: With Pin)?(?: \d{2}\/\d{2})?\s+(.+?)\s+Card \d+([\d,]+\.\d{2})$/;
    const match2 = line.match(pattern2);
    if (match2) {
      console.log(`  Pattern 2 ✅: Date=${match2[1]}, Desc='${match2[3]}', Amount=${match2[4]}`);
    } else {
      console.log(`  Pattern 2 ❌`);
    }
    
    // Pattern 3: More flexible amount capture
    const pattern3 = /^(\d{2}\/\d{2})Card Purchase(?: With Pin)?.*?(.+?)\s+Card \d+\$?([\d,]+\.?\d{2})$/;
    const match3 = line.match(pattern3);
    if (match3) {
      console.log(`  Pattern 3 ✅: Date=${match3[1]}, Desc='${match3[2]}', Amount=${match3[3]}`);
    } else {
      console.log(`  Pattern 3 ❌`);
    }
    
    // Pattern 4: Extract everything between Card Purchase and Card nnnn
    const pattern4 = /^(\d{2}\/\d{2})Card Purchase(?: With Pin)?\s*(.*?)\s+Card \d+\$?([\d,]+\.?\d{2})$/;
    const match4 = line.match(pattern4);
    if (match4) {
      console.log(`  Pattern 4 ✅: Date=${match4[1]}, Desc='${match4[2]}', Amount=${match4[3]}`);
    } else {
      console.log(`  Pattern 4 ❌`);
    }
    
    console.log('');
  });
  
  // Test electronic patterns
  console.log('🧪 Testing electronic patterns:\n');
  const electronicLines = [
    '01/11Orig CO Name:Home Depot Orig ID:Citictp Desc Date:240110 CO Entry',
    '01/12Orig CO Name:Geico Orig ID:3530075853 Desc Date:240111 CO Entry Descr:Prem'
  ];
  
  electronicLines.forEach((line, i) => {
    console.log(`Electronic ${i + 1}: ${line}`);
    
    const pattern = /^(\d{2}\/\d{2})Orig CO Name:(.+?)(?:\s+Orig ID|$)/;
    const match = line.match(pattern);
    if (match) {
      console.log(`  ✅: Date=${match[1]}, Company='${match[2]}'`);
    } else {
      console.log(`  ❌`);
    }
    console.log('');
  });
}

testRegexPatterns();
