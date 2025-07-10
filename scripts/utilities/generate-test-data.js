#!/usr/bin/env node

/**
 * Generate Test Data Script
 * 
 * Creates sample transactions, companies, and uploads for testing
 * and development purposes.
 * 
 * Usage: node scripts/utilities/generate-test-data.js [--count=50] [--companies=3]
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

// Parse command line arguments
const countMatch = process.argv.find(arg => arg.startsWith('--count='));
const companiesMatch = process.argv.find(arg => arg.startsWith('--companies='));

const TRANSACTION_COUNT = countMatch ? parseInt(countMatch.split('=')[1]) : 50;
const COMPANY_COUNT = companiesMatch ? parseInt(companiesMatch.split('=')[1]) : 3;

// Sample data templates
const COMPANIES = [
  { name: 'Acme Corp', type: 'LLC', industry: 'Technology' },
  { name: 'Smith Consulting', type: 'Sole Proprietorship', industry: 'Consulting' },
  { name: 'Green Energy Solutions', type: 'Corporation', industry: 'Energy' },
  { name: 'Digital Marketing Pro', type: 'LLC', industry: 'Marketing' },
  { name: 'Local Coffee Shop', type: 'Partnership', industry: 'Food & Beverage' }
];

const TRANSACTION_TEMPLATES = [
  { description: 'Office Supplies - Staples', category: 'Office Supplies', type: 'expense', baseAmount: 89.47 },
  { description: 'Internet Service - Comcast', category: 'Utilities', type: 'expense', baseAmount: 79.99 },
  { description: 'Client Payment - Project ABC', category: 'Service Revenue', type: 'income', baseAmount: 2500.00 },
  { description: 'Fuel - Gas Station', category: 'Vehicle Expenses', type: 'expense', baseAmount: 45.23 },
  { description: 'Software License - Adobe', category: 'Software', type: 'expense', baseAmount: 29.99 },
  { description: 'Freelancer Payment', category: 'Contract Labor', type: 'expense', baseAmount: 800.00 },
  { description: 'Bank Fee', category: 'Bank Charges', type: 'expense', baseAmount: 15.00 },
  { description: 'Client Deposit', category: 'Service Revenue', type: 'income', baseAmount: 1000.00 },
  { description: 'Phone Bill - Verizon', category: 'Utilities', type: 'expense', baseAmount: 125.50 },
  { description: 'Marketing - Google Ads', category: 'Advertising', type: 'expense', baseAmount: 350.00 },
  { description: 'Insurance Premium', category: 'Insurance', type: 'expense', baseAmount: 245.00 },
  { description: 'Professional Services', category: 'Professional Fees', type: 'expense', baseAmount: 500.00 },
  { description: 'Equipment Purchase', category: 'Equipment', type: 'expense', baseAmount: 1200.00 },
  { description: 'Travel Expenses', category: 'Travel', type: 'expense', baseAmount: 180.75 },
  { description: 'Meal - Client Meeting', category: 'Meals', type: 'expense', baseAmount: 67.50 },
  { description: 'Product Sales', category: 'Product Revenue', type: 'income', baseAmount: 750.00 }
];

const PAYEES = [
  'Staples', 'Comcast', 'ABC Client', 'Shell', 'Adobe', 'John Doe Freelancer',
  'First National Bank', 'XYZ Company', 'Verizon', 'Google', 'State Farm',
  'Legal Associates', 'TechCorp', 'Airlines Inc', 'Restaurant & Co', 'Customer Corp'
];

function log(message, emoji = '📝') {
  console.log(`${emoji} ${message}`);
}

function generateRandomDate(daysBack = 365) {
  const now = new Date();
  const randomDays = Math.floor(Math.random() * daysBack);
  const date = new Date(now.getTime() - (randomDays * 24 * 60 * 60 * 1000));
  return date.toISOString().split('T')[0];
}

function generateRandomAmount(baseAmount, variance = 0.3) {
  const min = baseAmount * (1 - variance);
  const max = baseAmount * (1 + variance);
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateCompanies(count) {
  log(`Generating ${count} sample companies...`);
  
  const companies = [];
  
  for (let i = 0; i < count; i++) {
    const template = COMPANIES[i % COMPANIES.length];
    const company = {
      id: `company-${i + 1}`,
      name: i === 0 ? template.name : `${template.name} ${i + 1}`,
      type: template.type,
      industry: template.industry,
      taxId: `${Math.floor(Math.random() * 90) + 10}-${Math.floor(Math.random() * 9000000) + 1000000}`,
      address: {
        street: `${Math.floor(Math.random() * 9999) + 1} Business St`,
        city: getRandomElement(['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix']),
        state: getRandomElement(['NY', 'CA', 'IL', 'TX', 'AZ']),
        zipCode: `${Math.floor(Math.random() * 90000) + 10000}`
      },
      createdAt: generateRandomDate(180),
      isActive: true
    };
    
    companies.push(company);
  }
  
  return companies;
}

function generateTransactions(count, companies) {
  log(`Generating ${count} sample transactions...`);
  
  const transactions = [];
  
  for (let i = 0; i < count; i++) {
    const template = getRandomElement(TRANSACTION_TEMPLATES);
    const company = getRandomElement(companies);
    
    const transaction = {
      id: `transaction-${i + 1}`,
      date: generateRandomDate(),
      description: template.description,
      amount: generateRandomAmount(template.baseAmount),
      type: template.type,
      category: template.category,
      payee: getRandomElement(PAYEES),
      companyId: company.id,
      companyName: company.name,
      statementId: `statement-${Math.floor(i / 10) + 1}`,
      section: template.type === 'income' ? 'deposits' : 'electronic',
      notes: Math.random() > 0.8 ? 'Auto-generated test data' : '',
      isReconciled: Math.random() > 0.7,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    transactions.push(transaction);
  }
  
  // Sort by date
  transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  return transactions;
}

function generateUploads(companies) {
  log('Generating sample upload records...');
  
  const uploads = [];
  
  for (let i = 0; i < 5; i++) {
    const company = getRandomElement(companies);
    const upload = {
      id: `upload-${i + 1}`,
      fileName: `statement-${i + 1}.pdf`,
      displayName: `${company.name} - ${generateRandomDate(30)}`,
      companyId: company.id,
      companyName: company.name,
      status: 'completed',
      uploadedAt: generateRandomDate(30),
      processedAt: generateRandomDate(30),
      fileSize: Math.floor(Math.random() * 2000000) + 500000, // 500KB - 2.5MB
      transactionCount: Math.floor(Math.random() * 50) + 10,
      accountInfo: {
        accountNumber: `****${Math.floor(Math.random() * 9000) + 1000}`,
        accountType: getRandomElement(['Checking', 'Savings', 'Business Checking']),
        bankName: getRandomElement(['Chase', 'Bank of America', 'Wells Fargo', 'Citibank'])
      },
      summary: {
        totalIncome: generateRandomAmount(5000),
        totalExpenses: generateRandomAmount(3000),
        netAmount: 0 // Will be calculated
      }
    };
    
    upload.summary.netAmount = upload.summary.totalIncome - upload.summary.totalExpenses;
    uploads.push(upload);
  }
  
  return uploads;
}

function generateClassificationRules() {
  log('Generating classification rules...');
  
  const rules = [
    {
      id: 'rule-1',
      name: 'Office Supplies',
      pattern: 'staples|office|supplies',
      category: 'Office Supplies',
      useRegex: true,
      caseSensitive: false,
      priority: 10,
      isActive: true
    },
    {
      id: 'rule-2',
      name: 'Utilities',
      pattern: 'comcast|verizon|electric|gas|water|internet',
      category: 'Utilities',
      useRegex: true,
      caseSensitive: false,
      priority: 10,
      isActive: true
    },
    {
      id: 'rule-3',
      name: 'Client Payments',
      pattern: 'payment|deposit|invoice',
      category: 'Service Revenue',
      useRegex: true,
      caseSensitive: false,
      priority: 5,
      isActive: true
    },
    {
      id: 'rule-4',
      name: 'Software Subscriptions',
      pattern: 'adobe|microsoft|google|software|subscription',
      category: 'Software',
      useRegex: true,
      caseSensitive: false,
      priority: 8,
      isActive: true
    },
    {
      id: 'rule-5',
      name: 'Bank Fees',
      pattern: 'fee|charge|overdraft',
      category: 'Bank Charges',
      useRegex: true,
      caseSensitive: false,
      priority: 10,
      isActive: true
    }
  ];
  
  return rules;
}

async function writeJSONFile(filePath, data, description) {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    log(`${description} written to ${path.basename(filePath)}`, '✅');
  } catch (error) {
    log(`Failed to write ${description}: ${error.message}`, '❌');
  }
}

async function writeCSVFile(filePath, data, headers) {
  try {
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => 
        typeof row[header] === 'string' && row[header].includes(',') 
          ? `"${row[header]}"` 
          : row[header]
      ).join(','))
    ].join('\n');
    
    await fs.writeFile(filePath, csvContent);
    log(`CSV file written to ${path.basename(filePath)}`, '✅');
  } catch (error) {
    log(`Failed to write CSV: ${error.message}`, '❌');
  }
}

async function createTestDataFiles() {
  const testDataPath = path.join(projectRoot, 'test', 'data');
  
  // Ensure directory exists
  await fs.mkdir(testDataPath, { recursive: true });
  
  // Generate data
  const companies = generateCompanies(COMPANY_COUNT);
  const transactions = generateTransactions(TRANSACTION_COUNT, companies);
  const uploads = generateUploads(companies);
  const rules = generateClassificationRules();
  
  // Write JSON files
  await writeJSONFile(
    path.join(testDataPath, 'sample-companies.json'),
    companies,
    'Sample companies'
  );
  
  await writeJSONFile(
    path.join(testDataPath, 'sample-transactions.json'),
    transactions,
    'Sample transactions'
  );
  
  await writeJSONFile(
    path.join(testDataPath, 'sample-uploads.json'),
    uploads,
    'Sample uploads'
  );
  
  await writeJSONFile(
    path.join(testDataPath, 'sample-rules.json'),
    rules,
    'Sample classification rules'
  );
  
  // Write CSV files
  const transactionHeaders = ['date', 'description', 'amount', 'type', 'category', 'payee', 'companyName'];
  await writeCSVFile(
    path.join(testDataPath, 'sample-transactions.csv'),
    transactions,
    transactionHeaders
  );
  
  const companyHeaders = ['name', 'type', 'industry', 'taxId'];
  await writeCSVFile(
    path.join(testDataPath, 'sample-companies.csv'),
    companies,
    companyHeaders
  );
  
  return { companies, transactions, uploads, rules };
}

async function generateSummaryReport(data) {
  const { companies, transactions, uploads, rules } = data;
  
  log('\n📊 Test Data Summary', '📊');
  console.log('='.repeat(50));
  console.log(`Companies: ${companies.length}`);
  console.log(`Transactions: ${transactions.length}`);
  console.log(`Uploads: ${uploads.length}`);
  console.log(`Classification Rules: ${rules.length}`);
  
  console.log('\n💰 Financial Summary:');
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  console.log(`Total Income: $${totalIncome.toFixed(2)}`);
  console.log(`Total Expenses: $${totalExpenses.toFixed(2)}`);
  console.log(`Net Income: $${(totalIncome - totalExpenses).toFixed(2)}`);
  
  console.log('\n🏢 Companies:');
  companies.forEach(company => {
    const companyTransactions = transactions.filter(t => t.companyId === company.id);
    console.log(`  ${company.name}: ${companyTransactions.length} transactions`);
  });
}

async function main() {
  console.log('🧪 Generating test data...\n');
  
  try {
    const data = await createTestDataFiles();
    await generateSummaryReport(data);
    
    console.log('\n✅ Test data generation completed!');
    console.log('\n📁 Files created in test/data/:');
    console.log('   - sample-companies.json');
    console.log('   - sample-transactions.json');
    console.log('   - sample-uploads.json');
    console.log('   - sample-rules.json');
    console.log('   - sample-transactions.csv');
    console.log('   - sample-companies.csv');
    
  } catch (error) {
    log(`Test data generation failed: ${error.message}`, '❌');
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default main;
