/**
 * Test section filtering functionality
 */
import ChaseTransactionParser from './services/parsers/ChaseTransactionParser.js';

// Mock transactions with section metadata
const mockTransactions = [
  {
    date: '2024-01-08T12:00:00',
    amount: 3640,
    description: 'Remote Online Deposit 1',
    type: 'income',
    section: 'DEPOSITS AND ADDITIONS',
    sectionCode: 'deposits'
  },
  {
    date: '2024-01-02T12:00:00',
    amount: 38.80,
    description: 'Chevron',
    type: 'expense',
    section: 'ATM & DEBIT CARD WITHDRAWALS',
    sectionCode: 'card'
  },
  {
    date: '2024-01-11T12:00:00',
    amount: 389.20,
    description: 'Electronic Payment: Home Depot',
    type: 'expense',
    section: 'ELECTRONIC WITHDRAWALS',
    sectionCode: 'electronic'
  },
  {
    date: '2024-01-19T12:00:00',
    amount: 2500,
    description: 'CHECK #538',
    type: 'expense',
    section: 'CHECKS PAID',
    sectionCode: 'checks'
  }
];

// Create a mock parser instance to test filtering methods
const mockParser = {
  filterTransactionsBySection(transactions, sectionCode) {
    if (!sectionCode) return transactions;
    return transactions.filter(tx => tx.sectionCode === sectionCode);
  },
  
  getAvailableSections(transactions) {
    const sections = {
      deposits: { code: 'deposits', name: 'DEPOSITS AND ADDITIONS', count: 0, total: 0 },
      checks: { code: 'checks', name: 'CHECKS PAID', count: 0, total: 0 },
      card: { code: 'card', name: 'ATM & DEBIT CARD WITHDRAWALS', count: 0, total: 0 },
      electronic: { code: 'electronic', name: 'ELECTRONIC WITHDRAWALS', count: 0, total: 0 }
    };

    transactions.forEach(tx => {
      if (tx.sectionCode && sections[tx.sectionCode]) {
        sections[tx.sectionCode].count++;
        sections[tx.sectionCode].total += tx.amount;
      }
    });

    return Object.values(sections).filter(section => section.count > 0);
  }
};

console.log('🧪 Testing section filtering functionality:');
console.log('==========================================');

// Test 1: Get all available sections
console.log('\n1️⃣ Available sections:');
const availableSections = mockParser.getAvailableSections(mockTransactions);
availableSections.forEach(section => {
  console.log(`   ${section.name}: ${section.count} transactions, $${section.total.toFixed(2)}`);
});

// Test 2: Filter by each section
console.log('\n2️⃣ Filter by section:');
const sectionCodes = ['deposits', 'card', 'electronic', 'checks'];
sectionCodes.forEach(code => {
  const filtered = mockParser.filterTransactionsBySection(mockTransactions, code);
  console.log(`   ${code}: ${filtered.length} transactions`);
  filtered.forEach(tx => {
    console.log(`      - ${tx.description}: $${tx.amount}`);
  });
});

// Test 3: No filter (all transactions)
console.log('\n3️⃣ No filter (all transactions):');
const all = mockParser.filterTransactionsBySection(mockTransactions, null);
console.log(`   Total: ${all.length} transactions`);

console.log('\n✅ Section filtering tests completed!');
