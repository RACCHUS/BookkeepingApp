import React, { useState } from 'react';
import { 
  QuestionMarkCircleIcon, 
  ChevronDownIcon, 
  ChevronRightIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  TagIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  ArrowUpTrayIcon,
  Cog6ToothIcon,
  LightBulbIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

/**
 * Accordion component for collapsible help sections
 */
const HelpSection = ({ title, icon: Icon, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-lg mb-4 overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className="h-5 w-5 text-blue-600" />}
          <span className="font-semibold text-gray-800">{title}</span>
        </div>
        {isOpen ? (
          <ChevronDownIcon className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronRightIcon className="h-5 w-5 text-gray-500" />
        )}
      </button>
      {isOpen && (
        <div className="p-4 bg-white text-gray-700">
          {children}
        </div>
      )}
    </div>
  );
};

/**
 * Tip box component for helpful tips
 */
const TipBox = ({ children }) => (
  <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg my-3">
    <LightBulbIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
    <div className="text-sm text-blue-800">{children}</div>
  </div>
);

/**
 * Warning box component
 */
const WarningBox = ({ children }) => (
  <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg my-3">
    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
    <div className="text-sm text-yellow-800">{children}</div>
  </div>
);

/**
 * Step by step guide component
 */
const Steps = ({ steps }) => (
  <ol className="list-decimal list-inside space-y-2 my-3">
    {steps.map((step, index) => (
      <li key={index} className="text-gray-700">{step}</li>
    ))}
  </ol>
);

/**
 * HelpPage component - Comprehensive help documentation for the bookkeeping app
 */
const HelpPage = () => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <QuestionMarkCircleIcon className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-800">Help Center</h1>
        </div>
        <p className="text-gray-600">
          Welcome to the Bookkeeping App help center. Find answers to common questions and learn how to use all features.
        </p>
      </div>

      {/* Quick Start */}
      <HelpSection title="Getting Started" icon={DocumentTextIcon} defaultOpen={true}>
        <p className="mb-4">
          This app helps you track income and expenses, categorize transactions for tax purposes, 
          and generate financial reports. Here's how to get started:
        </p>
        <Steps steps={[
          'Create a company (if managing multiple businesses) or use the default setup',
          'Import transactions via CSV upload or add them manually',
          'Set up classification rules to automatically categorize transactions',
          'Review and categorize any uncategorized transactions',
          'Generate reports for tax filing or business analysis'
        ]} />
        <TipBox>
          Start by importing your bank statement CSV - the app will help you categorize 
          transactions based on patterns you define.
        </TipBox>
      </HelpSection>

      {/* Transaction Types */}
      <HelpSection title="Transaction Types" icon={CurrencyDollarIcon}>
        <p className="mb-4">The app supports three types of transactions:</p>
        
        <h4 className="font-semibold text-green-700 mt-4 mb-2">💰 Income</h4>
        <p className="mb-2">
          Money your business earns - sales revenue, service fees, interest income, etc. 
          Income transactions are shown as positive amounts and count toward your total revenue.
        </p>
        
        <h4 className="font-semibold text-red-700 mt-4 mb-2">💸 Expense</h4>
        <p className="mb-2">
          Business costs - supplies, utilities, rent, advertising, etc. 
          Expenses are shown as negative amounts and are deductible from your taxes.
          <strong className="text-red-600"> Owner withdrawals (draws) are also tracked as expenses</strong> so they appear in your records for tax purposes.
        </p>
        
        <h4 className="font-semibold text-blue-700 mt-4 mb-2">🔄 Transfer (Neutral)</h4>
        <p className="mb-2">
          Money that moves but isn't income or expense - owner contributions (deposits), loans received, 
          transfers between accounts. <strong className="text-blue-600">Transfers don't affect your profit/loss calculations.</strong>
        </p>
        
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h5 className="font-semibold mb-2 text-blue-700 dark:text-blue-400">Neutral Transfer Categories (Blue):</h5>
          <ul className="list-disc list-inside text-sm space-y-1">
            <li><strong>Owner Contribution/Capital</strong> - Personal money you put INTO the business (ATM deposits, cash deposits)</li>
            <li><strong>Loan Received</strong> - Borrowed money (not income - just an obligation)</li>
            <li><strong>Transfer Between Accounts</strong> - Moving money between business accounts</li>
            <li><strong>Personal Transfer</strong> - Transfers from personal accounts</li>
          </ul>
        </div>

        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <h5 className="font-semibold mb-2 text-red-700 dark:text-red-400">NOT Neutral (Tracked as Expense):</h5>
          <ul className="list-disc list-inside text-sm space-y-1">
            <li><strong>Owner Draws/Distributions</strong> - Money you take OUT for personal use (ATM withdrawals) - tracked for tax records</li>
            <li><strong>Personal Expense</strong> - Non-business purchases made with business funds</li>
          </ul>
          <p className="text-xs text-red-600 dark:text-red-400 mt-2">
            ⚠️ Owner withdrawals must be tracked as expenses so you know how much you paid yourself for tax purposes.
          </p>
        </div>
        
        <WarningBox>
          Don't categorize owner contributions as income - this would overstate your revenue 
          and potentially increase your tax liability. Use the "Transfer" type instead.
        </WarningBox>
      </HelpSection>

      {/* CSV Import */}
      <HelpSection title="Importing Transactions (CSV)" icon={ArrowUpTrayIcon}>
        <p className="mb-4">
          The fastest way to add transactions is by importing a CSV file from your bank.
        </p>
        
        <h4 className="font-semibold mt-4 mb-2">Supported CSV Formats</h4>
        <p className="mb-2">The app automatically detects columns. Common supported formats include:</p>
        <ul className="list-disc list-inside mb-4 text-sm">
          <li>Chase Bank statements</li>
          <li>Bank of America statements</li>
          <li>Wells Fargo statements</li>
          <li>Most bank export formats with Date, Description, and Amount columns</li>
        </ul>
        
        <h4 className="font-semibold mt-4 mb-2">How to Import</h4>
        <Steps steps={[
          'Go to "Upload CSV" in the sidebar',
          'Select your company (if applicable)',
          'Choose your bank\'s CSV file',
          'Preview the detected transactions',
          'Click "Confirm Import" to add them',
          'Transactions will be auto-classified based on your rules'
        ]} />
        
        <TipBox>
          Set up classification rules before importing - new transactions will be 
          automatically categorized during import, saving you time.
        </TipBox>
      </HelpSection>

      {/* Classification Rules */}
      <HelpSection title="Classification Rules" icon={TagIcon}>
        <p className="mb-4">
          Classification rules automatically assign categories to transactions based on 
          payee names or descriptions. This is key to efficient bookkeeping.
        </p>
        
        <h4 className="font-semibold mt-4 mb-2">Creating Rules</h4>
        <Steps steps={[
          'Go to "Classification" in the sidebar',
          'Click "Add Rule"',
          'Enter a pattern to match (e.g., "AMAZON", "WALMART")',
          'Choose the category to assign',
          'Optionally check "Apply to existing transactions"',
          'Save the rule'
        ]} />
        
        <h4 className="font-semibold mt-4 mb-2">Pattern Matching</h4>
        <p className="mb-2">Rules use simple text matching:</p>
        <ul className="list-disc list-inside mb-4 text-sm">
          <li><code className="bg-gray-100 px-1 rounded">AMAZON</code> - Matches any transaction containing "AMAZON"</li>
          <li><code className="bg-gray-100 px-1 rounded">UBER</code> - Matches "UBER EATS", "UBER TRIP", etc.</li>
          <li>Matching is case-insensitive</li>
        </ul>
        
        <TipBox>
          Create rules for your most common vendors first. After importing transactions, 
          review uncategorized items and create rules for frequently occurring payees.
        </TipBox>
        
        <h4 className="font-semibold mt-4 mb-2">Apply to Existing Transactions</h4>
        <p>
          When creating or editing a rule, check "Apply to existing uncategorized transactions" 
          to retroactively categorize matching transactions. This is useful when you discover 
          a pattern in already-imported data.
        </p>
      </HelpSection>

      {/* IRS Categories */}
      <HelpSection title="Tax Categories (IRS Schedule C)" icon={ChartBarIcon}>
        <p className="mb-4">
          Categories in this app align with IRS Schedule C (Profit or Loss from Business) 
          line items. Proper categorization makes tax filing easier.
        </p>
        
        <h4 className="font-semibold mt-4 mb-2 text-green-700">Income Categories</h4>
        <ul className="list-disc list-inside text-sm mb-4">
          <li><strong>Gross Receipts/Sales</strong> - Primary business income</li>
          <li><strong>Returns & Allowances</strong> - Customer refunds (negative)</li>
          <li><strong>Other Income</strong> - Interest, occasional income sources</li>
        </ul>
        
        <h4 className="font-semibold mt-4 mb-2 text-red-700">Expense Categories (Most Common)</h4>
        <ul className="list-disc list-inside text-sm mb-4">
          <li><strong>Advertising</strong> - Marketing, ads, promotions</li>
          <li><strong>Car & Truck Expenses</strong> - Business vehicle costs</li>
          <li><strong>Contract Labor</strong> - 1099 contractors, freelancers</li>
          <li><strong>Office Expense</strong> - Supplies, software, small equipment</li>
          <li><strong>Supplies</strong> - Materials used in business operations</li>
          <li><strong>Utilities</strong> - Electric, water, internet, phone</li>
          <li><strong>Meals</strong> - Business meals (50% deductible)</li>
          <li><strong>Travel</strong> - Business travel expenses</li>
        </ul>
        
        <WarningBox>
          When in doubt about categorization, consult a tax professional. 
          Incorrect categorization could affect your tax liability.
        </WarningBox>
      </HelpSection>

      {/* Companies */}
      <HelpSection title="Managing Companies" icon={BuildingOfficeIcon}>
        <p className="mb-4">
          If you manage multiple businesses or want to separate different income streams, 
          you can create multiple companies.
        </p>
        
        <h4 className="font-semibold mt-4 mb-2">When to Use Multiple Companies</h4>
        <ul className="list-disc list-inside mb-4 text-sm">
          <li>Operating separate LLCs or business entities</li>
          <li>Tracking different business ventures separately</li>
          <li>Separating personal from business finances</li>
        </ul>
        
        <h4 className="font-semibold mt-4 mb-2">Company Features</h4>
        <ul className="list-disc list-inside text-sm">
          <li>Filter all views by company</li>
          <li>Generate company-specific reports</li>
          <li>Assign transactions to specific companies during import</li>
        </ul>
      </HelpSection>

      {/* Vendors & Payees */}
      <HelpSection title="Vendors & Payees" icon={UserGroupIcon}>
        <p className="mb-4">
          Track who you pay and who pays you for better financial insights.
        </p>
        
        <h4 className="font-semibold mt-4 mb-2">Vendors (You Pay Them)</h4>
        <p className="mb-2">
          Vendors are businesses or individuals you purchase from. Mark vendors as 
          "1099 Contractor" if you pay them $600+ annually for services - you may need 
          to issue them a 1099 form.
        </p>
        
        <h4 className="font-semibold mt-4 mb-2">Payees (They Pay You)</h4>
        <p className="mb-2">
          Payees are your income sources - customers, clients, or platforms that pay you.
        </p>
        
        <TipBox>
          Setting up vendors and payees helps you track who you do business with 
          and makes year-end reporting easier, especially for 1099 requirements.
        </TipBox>
      </HelpSection>

      {/* Reports */}
      <HelpSection title="Reports" icon={ChartBarIcon}>
        <p className="mb-4">
          Generate financial reports to understand your business performance and prepare for taxes.
        </p>
        
        <h4 className="font-semibold mt-4 mb-2">Available Reports</h4>
        <ul className="list-disc list-inside mb-4">
          <li><strong>Profit & Loss</strong> - Income vs expenses for a period</li>
          <li><strong>Tax Summary</strong> - Expenses grouped by IRS category</li>
          <li><strong>Expense Summary</strong> - Detailed breakdown of all expenses</li>
          <li><strong>Vendor Summary</strong> - Payments by vendor (useful for 1099s)</li>
        </ul>
        
        <h4 className="font-semibold mt-4 mb-2">Export Options</h4>
        <p className="text-sm">
          Reports can be exported as PDF for records or CSV for further analysis in Excel/Sheets.
        </p>
      </HelpSection>

      {/* Reconciliation */}
      <HelpSection title="Reconciliation" icon={ArrowPathIcon}>
        <p className="mb-4">
          Reconciliation ensures your records match your bank statements.
        </p>
        
        <h4 className="font-semibold mt-4 mb-2">Marking Transactions as Reconciled</h4>
        <p className="mb-2">
          After comparing your records to your bank statement, mark matching transactions 
          as "Reconciled" to indicate they've been verified.
        </p>
        
        <h4 className="font-semibold mt-4 mb-2">Monthly Review Workflow</h4>
        <Steps steps={[
          'Download your bank statement at month\'s end',
          'Compare statement transactions to app transactions',
          'Mark verified transactions as reconciled',
          'Investigate any discrepancies',
          'Note: imported CSV transactions are usually already accurate'
        ]} />
      </HelpSection>

      {/* Best Practices */}
      <HelpSection title="Best Practices" icon={LightBulbIcon}>
        <h4 className="font-semibold mb-2">Weekly Tasks</h4>
        <ul className="list-disc list-inside mb-4 text-sm">
          <li>Import new transactions from your bank</li>
          <li>Review and categorize any uncategorized items</li>
          <li>Create rules for new recurring vendors</li>
        </ul>
        
        <h4 className="font-semibold mt-4 mb-2">Monthly Tasks</h4>
        <ul className="list-disc list-inside mb-4 text-sm">
          <li>Reconcile your accounts with bank statements</li>
          <li>Review the monthly P&L report</li>
          <li>Check for any unusual expenses</li>
        </ul>
        
        <h4 className="font-semibold mt-4 mb-2">Year-End Tasks</h4>
        <ul className="list-disc list-inside text-sm">
          <li>Ensure all transactions are categorized</li>
          <li>Generate annual tax summary report</li>
          <li>Review vendor payments for 1099 requirements</li>
          <li>Export reports for your tax preparer</li>
        </ul>
      </HelpSection>

      {/* Troubleshooting */}
      <HelpSection title="Troubleshooting" icon={Cog6ToothIcon}>
        <h4 className="font-semibold mb-2">Common Issues</h4>
        
        <div className="space-y-4 mt-4">
          <div>
            <p className="font-medium text-gray-800">CSV import shows wrong amounts</p>
            <p className="text-sm text-gray-600">
              Check if your bank uses separate credit/debit columns. The app tries to auto-detect, 
              but some formats may need the amount to be in a single column with +/- signs.
            </p>
          </div>
          
          <div>
            <p className="font-medium text-gray-800">Classification rule not matching</p>
            <p className="text-sm text-gray-600">
              Rules match partial text case-insensitively. Check for typos in your pattern. 
              Look at actual transaction descriptions to find the exact text to match.
            </p>
          </div>
          
          <div>
            <p className="font-medium text-gray-800">Dashboard shows $0</p>
            <p className="text-sm text-gray-600">
              Make sure you have transactions in the selected date range. Try adjusting the 
              date filter or selecting "All time" to see if data exists.
            </p>
          </div>
          
          <div>
            <p className="font-medium text-gray-800">Transfer not affecting balance</p>
            <p className="text-sm text-gray-600">
              This is expected! Transfers are designed to be neutral - they don't count as 
              income or expense. Use transfers for owner contributions, loans, and account transfers.
            </p>
          </div>
        </div>
      </HelpSection>

      {/* Keyboard Shortcuts */}
      <HelpSection title="Quick Tips" icon={LightBulbIcon}>
        <ul className="list-disc list-inside space-y-2">
          <li>Use the company filter dropdown to quickly switch between businesses</li>
          <li>Click column headers in transaction tables to sort</li>
          <li>Use the search bar to find specific transactions</li>
          <li>Double-click a transaction to edit it</li>
          <li>Export reports as CSV for use in Excel or Google Sheets</li>
        </ul>
      </HelpSection>

      {/* Footer */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg text-center text-sm text-gray-600">
        <p>
          Need more help? Check the{' '}
          <a href="https://github.com/your-repo/bookkeeping-app" className="text-blue-600 hover:underline">
            documentation
          </a>{' '}
          or contact support.
        </p>
      </div>
    </div>
  );
};

export default HelpPage;
