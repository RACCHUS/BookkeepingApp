import React, { memo, useState } from 'react';
import { 
  ChevronRightIcon, 
  ChevronDownIcon,
  PencilIcon, 
  TrashIcon, 
  CheckIcon, 
  XMarkIcon,
  TagIcon,
  ReceiptPercentIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  UserIcon,
  CalendarIcon,
  BanknotesIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline';
import { CATEGORY_GROUPS, isTaxDeductible, isBusinessCategory } from '@shared/constants/categories';

/**
 * Compact transaction row with expandable details
 * Shows basic info by default, more details when expanded
 */
const CompactTransactionRow = memo(({
  transaction,
  isSelectMode,
  isSelected,
  onSelect,
  editingCategoryId,
  editingCategoryValue,
  onCategoryEdit,
  onCategoryChange,
  onCategoryKeyPress,
  onSaveCategoryEdit,
  onCancelCategoryEdit,
  onEdit,
  onDelete,
  deletingId,
  // Dynamic columns based on active filters/sorts
  visibleColumns = [],
  columnWidths = {},
  statement,
  getPaymentMethodDisplay
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (date) => {
    if (!date) return '';
    let isoDate = date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const d = new Date(date);
      if (!isNaN(d)) {
        isoDate = d.toISOString().split('T')[0];
      }
    }
    return new Date(isoDate + 'T12:00:00').toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.abs(amount));
  };

  // Type colors
  const getTypeColor = (type) => {
    switch (type) {
      case 'income':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30';
      case 'expense':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30';
      case 'transfer':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700';
    }
  };

  // Check if a column should be visible (either in visibleColumns or has a value worth showing)
  const shouldShowColumn = (columnName) => {
    return visibleColumns.includes(columnName);
  };

  // Render a compact badge for dynamic columns
  const renderDynamicColumn = (columnName) => {
    // Helper to render empty placeholder
    const renderEmpty = () => (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-gray-400 dark:text-gray-500 italic">
        —
      </span>
    );

    switch (columnName) {
      case 'category':
        return transaction.category ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 truncate max-w-full" title={transaction.category}>
            {transaction.category}
          </span>
        ) : renderEmpty();
      
      case 'payee':
        const payeeValue = transaction.payee || transaction.payeeName;
        return payeeValue ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 truncate max-w-full" title={payeeValue}>
            <UserIcon className="w-3 h-3 mr-1 flex-shrink-0" />
            {payeeValue}
          </span>
        ) : renderEmpty();
      
      case 'company':
      case 'companyId':
        return transaction.companyName ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 truncate max-w-full" title={transaction.companyName}>
            <BuildingOfficeIcon className="w-3 h-3 mr-1 flex-shrink-0" />
            {transaction.companyName}
          </span>
        ) : renderEmpty();
      
      case 'source':
        return transaction.source ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
            {transaction.source}
          </span>
        ) : renderEmpty();
      
      case 'vendor':
      case 'vendorName':
        return transaction.vendorName ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 truncate max-w-full" title={transaction.vendorName}>
            <BuildingOfficeIcon className="w-3 h-3 mr-1 flex-shrink-0" />
            {transaction.vendorName}
          </span>
        ) : renderEmpty();
      
      case 'incomeSource':
      case 'incomeSourceName':
        return transaction.incomeSourceName ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 truncate max-w-full" title={transaction.incomeSourceName}>
            💵
            {transaction.incomeSourceName}
          </span>
        ) : renderEmpty();
      
      case 'sectionCode':
        return transaction.sectionCode ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
            {transaction.sectionCode}
          </span>
        ) : renderEmpty();
      
      case 'paymentMethod':
        return transaction.paymentMethod ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300">
            {getPaymentMethodDisplay ? getPaymentMethodDisplay(transaction.paymentMethod) : transaction.paymentMethod}
          </span>
        ) : renderEmpty();

      case 'taxYear':
        // Extract year from transaction date
        const year = transaction.date ? new Date(transaction.date).getFullYear() : null;
        return year ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">
            📊 {year}
          </span>
        ) : renderEmpty();

      case 'subcategory':
        return transaction.subcategory ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 truncate max-w-full" title={transaction.subcategory}>
            {transaction.subcategory}
          </span>
        ) : renderEmpty();

      case 'statementId':
        return statement ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 truncate max-w-full" title={statement.name}>
            <DocumentTextIcon className="w-3 h-3 mr-1 flex-shrink-0" />
            {statement.name?.replace(/^\[(PDF|CSV)\]\s*/, '').slice(0, 15)}
          </span>
        ) : renderEmpty();
      
      case 'hasReceipt':
        return transaction.receiptId ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
            <ReceiptPercentIcon className="w-3 h-3 mr-1" />
            Receipt
          </span>
        ) : renderEmpty();
      
      case 'hasCheckNumber':
      case 'checkNumber':
        return transaction.checkNumber ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
            #{transaction.checkNumber}
          </span>
        ) : renderEmpty();

      case 'referenceNumber':
        return transaction.referenceNumber ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 truncate max-w-full" title={transaction.referenceNumber}>
            {transaction.referenceNumber}
          </span>
        ) : renderEmpty();

      case 'employee':
      case 'employeeName':
        return transaction.employeeName ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 truncate max-w-full" title={transaction.employeeName}>
            <UserIcon className="w-3 h-3 mr-1 flex-shrink-0" />
            {transaction.employeeName}
          </span>
        ) : renderEmpty();

      case 'quarterlyPeriod':
        return transaction.quarterlyPeriod ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">
            {transaction.quarterlyPeriod}
          </span>
        ) : renderEmpty();

      case 'isTaxDeductible':
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            transaction.isTaxDeductible !== false
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
          }`}>
            {transaction.isTaxDeductible !== false ? '✓ Yes' : '✗ No'}
          </span>
        );

      case 'businessPurpose':
        return transaction.businessPurpose ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 truncate max-w-full" title={transaction.businessPurpose}>
            {transaction.businessPurpose}
          </span>
        ) : renderEmpty();

      case 'clientProject':
        return transaction.clientProject ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 truncate max-w-full" title={transaction.clientProject}>
            {transaction.clientProject}
          </span>
        ) : renderEmpty();

      case 'location':
        return transaction.location ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 truncate max-w-full" title={transaction.location}>
            📍 {transaction.location}
          </span>
        ) : renderEmpty();

      case 'isRecurring':
        return transaction.isRecurring ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
            🔄 Yes
          </span>
        ) : renderEmpty();

      case 'isReimbursable':
        return transaction.isReimbursable ? (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            transaction.reimbursementStatus === 'paid'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              : transaction.reimbursementStatus === 'approved'
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
          }`}>
            💰 {transaction.reimbursementStatus || 'Pending'}
          </span>
        ) : renderEmpty();

      case 'isContractorPayment':
        return transaction.isContractorPayment ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
            1099
          </span>
        ) : renderEmpty();

      case 'createdAt':
        return transaction.createdAt ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
            {new Date(transaction.createdAt).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}
          </span>
        ) : renderEmpty();

      case 'notes':
        return transaction.notes ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 truncate max-w-full" title={transaction.notes}>
            📝 {transaction.notes.slice(0, 20)}{transaction.notes.length > 20 ? '...' : ''}
          </span>
        ) : renderEmpty();
      
      default:
        return renderEmpty();
    }
  };

  return (
    <li className="border-b border-gray-100 dark:border-gray-700 last:border-b-0 bg-white dark:bg-gray-800">
      {/* Main compact row */}
      <div 
        className={`flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors ${
          isSelected ? 'bg-blue-100 dark:bg-blue-900/50 ring-1 ring-inset ring-blue-400 dark:ring-blue-500' : ''
        }`}
      >
        {/* Expand button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
          title={isExpanded ? 'Collapse' : 'Show details'}
        >
          {isExpanded ? (
            <ChevronDownIcon className="w-4 h-4" />
          ) : (
            <ChevronRightIcon className="w-4 h-4" />
          )}
        </button>

        {/* Selection checkbox */}
        {isSelectMode && (
          <div className="flex-shrink-0 mr-3">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onSelect(transaction.id)}
              className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
            />
          </div>
        )}

        {/* Date */}
        <div 
          className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400"
          style={{ width: columnWidths.date || 64 }}
        >
          {formatDate(transaction.date)}
        </div>

        {/* Type badge */}
        <div 
          className={`flex-shrink-0 text-center text-xs font-medium px-1.5 py-0.5 rounded ${getTypeColor(transaction.type)}`}
          style={{ width: columnWidths.type || 64 }}
        >
          {transaction.type?.charAt(0).toUpperCase() + transaction.type?.slice(1) || 'Other'}
        </div>

        {/* Description - flexible but with minimum width */}
        <div 
          className="flex-shrink-0 mx-2"
          style={{ width: columnWidths.description || 200 }}
        >
          <p className="text-sm text-gray-900 dark:text-white truncate" title={transaction.description}>
            {transaction.description || 'No description'}
          </p>
        </div>

        {/* Dynamic columns based on active filters - each with width from columnWidths */}
        {visibleColumns.map(col => (
          <div 
            key={col} 
            className="flex-shrink-0 flex items-center justify-center px-2"
            style={{ width: columnWidths[col] || 128 }}
          >
            {renderDynamicColumn(col)}
          </div>
        ))}

        {/* Amount */}
        <div 
          className={`flex-shrink-0 text-right text-sm font-medium ${
          transaction.type === 'income' 
            ? 'text-green-600 dark:text-green-400' 
            : transaction.type === 'expense'
            ? 'text-red-600 dark:text-red-400'
            : 'text-gray-900 dark:text-white'
        }`}
          style={{ width: columnWidths.amount || 112 }}
        >
          {transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : ''}
          {formatCurrency(transaction.amount)}
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          {/* Receipt indicator (compact) */}
          {transaction.receiptId && !shouldShowColumn('hasReceipt') && (
            <ReceiptPercentIcon className="w-4 h-4 text-green-500" title="Has receipt" />
          )}
          
          <button
            onClick={() => onEdit(transaction)}
            className="p-1.5 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
            title="Edit"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(transaction.id, transaction.description)}
            disabled={deletingId === transaction.id}
            className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
            title="Delete"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Expanded details panel */}
      {isExpanded && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-750 border-t border-gray-100 dark:border-gray-600">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-3 text-sm">
            {/* Category with edit */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Category</label>
              {editingCategoryId === transaction.id ? (
                <div className="flex items-center gap-1">
                  <select
                    value={editingCategoryValue}
                    onChange={(e) => onCategoryChange(e.target.value)}
                    onKeyDown={onCategoryKeyPress}
                    className="flex-1 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    autoFocus
                  >
                    <option value="">Select Category</option>
                    {Object.entries(CATEGORY_GROUPS).map(([groupName, categories]) => (
                      <optgroup key={groupName} label={groupName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}>
                        {categories.map(category => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <button onClick={onSaveCategoryEdit} className="p-1 text-green-600 hover:text-green-700" title="Save">
                    <CheckIcon className="h-4 w-4" />
                  </button>
                  <button onClick={onCancelCategoryEdit} className="p-1 text-gray-400 hover:text-gray-600" title="Cancel">
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span className={transaction.category ? 'text-gray-900 dark:text-white' : 'text-gray-400 italic'}>
                    {transaction.category || 'Uncategorized'}
                  </span>
                  {!isSelectMode && (
                    <button
                      onClick={() => onCategoryEdit(transaction.id, transaction.category)}
                      className="p-1 text-gray-400 hover:text-blue-500"
                      title="Edit category"
                    >
                      <TagIcon className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
              {transaction.category && (
                <div className="flex gap-1 mt-1">
                  {isBusinessCategory(transaction.category) && (
                    <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">Business</span>
                  )}
                  {isTaxDeductible(transaction.category) && (
                    <span className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">Tax Deductible</span>
                  )}
                </div>
              )}
            </div>

            {/* Payee */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Payee</label>
              <span className={transaction.payee ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}>
                {transaction.payee || 'Not specified'}
              </span>
            </div>

            {/* Vendor */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Vendor</label>
              <span className={transaction.vendorName ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}>
                {transaction.vendorName || 'Not specified'}
              </span>
            </div>

            {/* Company */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Company</label>
              <span className={transaction.companyName ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}>
                {transaction.companyName || 'Not assigned'}
              </span>
            </div>

            {/* Full Date */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Date</label>
              <span className="text-gray-900 dark:text-white">
                {new Date(transaction.date).toLocaleDateString('en-US', { 
                  weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' 
                })}
              </span>
            </div>

            {/* Source */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Source</label>
              <span className={transaction.source ? 'text-gray-900 dark:text-white capitalize' : 'text-gray-400 dark:text-gray-500 italic'}>
                {transaction.source ? transaction.source.replace(/_/g, ' ') : 'Unknown'}
              </span>
            </div>

            {/* Statement */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Statement</label>
              <span className={statement ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}>
                {statement?.name || 'Not linked'}
              </span>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Payment Method</label>
              <span className={transaction.paymentMethod ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}>
                {transaction.paymentMethod && getPaymentMethodDisplay ? getPaymentMethodDisplay(transaction.paymentMethod) : 'Not specified'}
              </span>
            </div>

            {/* Check Number */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Check #</label>
              <span className={transaction.checkNumber ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}>
                {transaction.checkNumber || 'N/A'}
              </span>
            </div>

            {/* Reference Number */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Reference #</label>
              <span className={transaction.referenceNumber ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}>
                {transaction.referenceNumber || 'N/A'}
              </span>
            </div>

            {/* Bank Info */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Bank Account</label>
              <span className={transaction.bankName || transaction.accountLastFour ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}>
                {transaction.bankName ? `${transaction.bankName}${transaction.accountLastFour ? ` ****${transaction.accountLastFour}` : ''}` : transaction.accountLastFour ? `****${transaction.accountLastFour}` : 'Not specified'}
              </span>
            </div>

            {/* Subcategory */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Subcategory</label>
              <span className={transaction.subcategory ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}>
                {transaction.subcategory || 'None'}
              </span>
            </div>

            {/* Receipt */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Receipt</label>
              {transaction.receiptId ? (
                <span className="inline-flex items-center text-green-600 dark:text-green-400">
                  <ReceiptPercentIcon className="w-4 h-4 mr-1" />
                  Attached
                </span>
              ) : (
                <span className="text-gray-400 dark:text-gray-500 italic">None</span>
              )}
            </div>

            {/* Amount (full precision) */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Amount</label>
              <span className={`font-medium ${
                transaction.type === 'income' 
                  ? 'text-green-600 dark:text-green-400' 
                  : transaction.type === 'expense'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-900 dark:text-white'
              }`}>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(transaction.amount)}
              </span>
            </div>

            {/* Notes */}
            <div className="col-span-full">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes</label>
              <p className={transaction.notes ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}>
                {transaction.notes || 'No notes'}
              </p>
            </div>

            {/* Tags */}
            {transaction.tags && transaction.tags.length > 0 && (
              <div className="col-span-full">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Tags</label>
                <div className="flex flex-wrap gap-1">
                  {transaction.tags.map((tag, idx) => (
                    <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Status indicators */}
            <div className="col-span-full flex flex-wrap gap-2 mt-2">
              {transaction.isReconciled && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                  ✓ Reconciled
                </span>
              )}
              {transaction.isManuallyReviewed && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                  ✓ Reviewed
                </span>
              )}
              {transaction.is1099 && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                  1099
                </span>
              )}
              {transaction.csvImportId && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                  <DocumentDuplicateIcon className="w-3 h-3 mr-1" />
                  CSV Import
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </li>
  );
});

CompactTransactionRow.displayName = 'CompactTransactionRow';

export default CompactTransactionRow;
