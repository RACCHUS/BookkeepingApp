import React, { useState, useRef, useMemo, memo } from 'react';
import {
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Cog6ToothIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';
import CompactTransactionRow from '../../components/CompactTransactionRow';
import { multiLevelSort } from '@shared/constants/sorting';

/**
 * Reusable transaction grid with draggable columns, resizing, sorting, and selection
 * 
 * Used by:
 * - TransactionList (all transactions)
 * - IncomeBulkEdit (income transactions)
 * - ExpenseBulkEdit (expense transactions)
 */
const TransactionGrid = memo(({
  // Data
  transactions = [],
  isLoading = false,
  
  // Selection
  selectedTransactions = new Set(),
  onSelectionChange,
  selectionColor = 'blue', // 'blue' for expense, 'green' for income
  
  // Sorting
  sorts = [],
  onSortsChange,
  
  // Columns
  defaultColumns,
  storageKey = 'transactionGridColumns', // localStorage key for column prefs
  
  // Column widths
  defaultColumnWidths = {},
  
  // Actions
  onEdit,
  onDelete,
  onSplit,
  deletingId,
  
  // Inline editing
  editingCategoryId,
  editingCategoryValue,
  onCategoryEdit,
  onCategoryChange,
  onCategoryKeyPress,
  onSaveCategoryEdit,
  onCancelCategoryEdit,
  
  // Helpers
  getPaymentMethodDisplay,
  
  // Variant
  variant = 'all', // 'all', 'income', 'expense'
}) => {
  // Column state management
  const loadColumnPreferences = () => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        const savedIds = new Set(parsed.map(c => c.id));
        const merged = [
          ...parsed,
          ...defaultColumns.filter(c => !savedIds.has(c.id))
        ];
        return merged;
      }
    } catch (e) {
      console.warn('Failed to load column preferences:', e);
    }
    return defaultColumns;
  };

  const [columns, setColumns] = useState(loadColumnPreferences);
  const [columnWidths, setColumnWidths] = useState(defaultColumnWidths);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [draggedColumn, setDraggedColumn] = useState(null);
  const resizingRef = useRef(null);

  // Save column preferences
  const saveColumnPreferences = (newColumns) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(newColumns));
    } catch (e) {
      console.warn('Failed to save column preferences:', e);
    }
  };

  // Toggle column visibility
  const toggleColumnVisibility = (columnId) => {
    setColumns(prev => {
      const updated = prev.map(col =>
        col.id === columnId ? { ...col, visible: !col.visible } : col
      );
      saveColumnPreferences(updated);
      return updated;
    });
  };

  // Drag and drop for column reordering
  const handleColumnDragStart = (e, columnId) => {
    setDraggedColumn(columnId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleColumnDragOver = (e, targetColumnId) => {
    e.preventDefault();
    if (!draggedColumn || draggedColumn === targetColumnId) return;

    setColumns(prev => {
      const dragIndex = prev.findIndex(c => c.id === draggedColumn);
      const targetIndex = prev.findIndex(c => c.id === targetColumnId);
      if (dragIndex === -1 || targetIndex === -1) return prev;

      const updated = [...prev];
      const [removed] = updated.splice(dragIndex, 1);
      updated.splice(targetIndex, 0, removed);
      return updated;
    });
  };

  const handleColumnDragEnd = () => {
    if (draggedColumn) {
      saveColumnPreferences(columns);
    }
    setDraggedColumn(null);
  };

  // Get visible columns in order
  const visibleColumns = useMemo(() => {
    return columns.filter(col => col.visible).map(col => col.id);
  }, [columns]);

  // Column resize handling
  const handleResizeStart = (e, columnKey) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = columnWidths[columnKey] || defaultColumnWidths[columnKey] || 128;

    resizingRef.current = { columnKey, startX, startWidth };

    const handleMouseMove = (moveEvent) => {
      if (!resizingRef.current) return;
      const diff = moveEvent.clientX - resizingRef.current.startX;
      const newWidth = Math.max(50, resizingRef.current.startWidth + diff);
      setColumnWidths(prev => ({ ...prev, [resizingRef.current.columnKey]: newWidth }));
    };

    const handleMouseUp = () => {
      resizingRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  // Sorting helpers
  const handleColumnSort = (field) => {
    if (!onSortsChange) return;
    
    onSortsChange(currentSorts => {
      const existingSort = currentSorts.find(s => s.field === field);
      if (!existingSort) {
        return [{ field, direction: 'asc' }, ...currentSorts.filter(s => s.field !== field)];
      } else if (existingSort.direction === 'asc') {
        return currentSorts.map(s => s.field === field ? { ...s, direction: 'desc' } : s);
      } else {
        const filtered = currentSorts.filter(s => s.field !== field);
        return filtered.length > 0 ? filtered : [{ field: 'date', direction: 'desc' }];
      }
    });
  };

  const getSortIndicator = (field) => {
    const sortIndex = sorts.findIndex(s => s.field === field);
    if (sortIndex === -1) return null;
    const sort = sorts[sortIndex];
    return {
      direction: sort.direction,
      priority: sortIndex + 1
    };
  };

  // Sort indicator component
  const SortIndicator = ({ field }) => {
    const indicator = getSortIndicator(field);
    if (!indicator) return <span className="ml-1 text-gray-300 dark:text-gray-600">↕</span>;
    return (
      <span className="ml-1 text-blue-500 dark:text-blue-400">
        {indicator.direction === 'asc' ? '↑' : '↓'}
        {sorts.length > 1 && <sup className="text-[9px]">{indicator.priority}</sup>}
      </span>
    );
  };

  // Resizable header component
  const ResizableHeader = ({ columnKey, children, className, onClick, draggable, onDragStart, onDragOver, onDragEnd }) => (
    <div
      className={`flex-shrink-0 relative ${className}`}
      style={{ width: columnWidths[columnKey] || defaultColumnWidths[columnKey] || 128 }}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div
        className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none pr-3"
        onClick={onClick}
      >
        {children}
      </div>
      <div
        className="absolute right-0 top-0 bottom-0 w-[3px] cursor-col-resize bg-gray-300 dark:bg-gray-600 hover:bg-blue-400 dark:hover:bg-blue-500 active:bg-blue-500 dark:active:bg-blue-400 rounded-full opacity-60 hover:opacity-100"
        onMouseDown={(e) => handleResizeStart(e, columnKey)}
      />
    </div>
  );

  // Selection helpers
  const toggleSelectAll = () => {
    if (!onSelectionChange) return;
    if (selectedTransactions.size === transactions.length && transactions.length > 0) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(transactions.map(tx => tx.id)));
    }
  };

  const toggleSelect = (id) => {
    if (!onSelectionChange) return;
    const next = new Set(selectedTransactions);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange(next);
  };

  // Apply sorting to transactions
  const sortedTransactions = useMemo(() => {
    return multiLevelSort(transactions, sorts);
  }, [transactions, sorts]);

  // Color classes based on variant
  const checkboxColor = selectionColor === 'green' 
    ? 'text-green-600 focus:ring-green-500' 
    : 'text-blue-600 focus:ring-blue-500';
  
  const selectedRowBg = selectionColor === 'green'
    ? 'bg-green-50 dark:bg-green-900/20'
    : 'bg-blue-50 dark:bg-blue-900/20';

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 flex items-center justify-center">
        <ArrowPathIcon className="w-8 h-8 animate-spin text-gray-400" />
        <span className="ml-3 text-gray-500 dark:text-gray-400">Loading transactions...</span>
      </div>
    );
  }

  if (sortedTransactions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">No transactions found</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
      {/* Column Settings Button */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {sortedTransactions.length} transactions
          {selectedTransactions.size > 0 && (
            <span className={`ml-2 ${selectionColor === 'green' ? 'text-green-600' : 'text-blue-600'}`}>
              ({selectedTransactions.size} selected)
            </span>
          )}
        </div>
        <button
          onClick={() => setShowColumnSettings(!showColumnSettings)}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        >
          <Cog6ToothIcon className="w-4 h-4" />
          Columns
        </button>
      </div>

      {/* Column Settings Panel */}
      {showColumnSettings && (
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Toggle columns (drag to reorder):
          </div>
          <div className="flex flex-wrap gap-2">
            {columns.map(col => (
              <button
                key={col.id}
                onClick={() => toggleColumnVisibility(col.id)}
                draggable
                onDragStart={(e) => handleColumnDragStart(e, col.id)}
                onDragOver={(e) => handleColumnDragOver(e, col.id)}
                onDragEnd={handleColumnDragEnd}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded border cursor-move ${
                  col.visible
                    ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                    : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                }`}
              >
                <Bars3Icon className="w-3 h-3" />
                {col.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Header Row */}
          <div className="flex items-center gap-0 px-2 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
            {/* Checkbox */}
            <div className="flex-shrink-0 w-10 px-2">
              <input
                type="checkbox"
                checked={selectedTransactions.size === sortedTransactions.length && sortedTransactions.length > 0}
                onChange={toggleSelectAll}
                className={`rounded border-gray-300 ${checkboxColor}`}
              />
            </div>
            
            {/* Fixed columns: Date, Type, Description, Amount */}
            <ResizableHeader
              columnKey="date"
              className="px-2"
              onClick={() => handleColumnSort('date')}
            >
              Date <SortIndicator field="date" />
            </ResizableHeader>

            {variant === 'all' && (
              <ResizableHeader
                columnKey="type"
                className="px-2"
                onClick={() => handleColumnSort('type')}
              >
                Type <SortIndicator field="type" />
              </ResizableHeader>
            )}

            <ResizableHeader
              columnKey="description"
              className="px-2 flex-1 min-w-[200px]"
              onClick={() => handleColumnSort('description')}
            >
              Description <SortIndicator field="description" />
            </ResizableHeader>

            {/* Dynamic columns */}
            {visibleColumns.map(colId => {
              const col = columns.find(c => c.id === colId);
              if (!col) return null;
              return (
                <ResizableHeader
                  key={colId}
                  columnKey={colId}
                  className="px-2"
                  onClick={() => handleColumnSort(colId)}
                  draggable
                  onDragStart={(e) => handleColumnDragStart(e, colId)}
                  onDragOver={(e) => handleColumnDragOver(e, colId)}
                  onDragEnd={handleColumnDragEnd}
                >
                  {col.label} <SortIndicator field={colId} />
                </ResizableHeader>
              );
            })}

            <ResizableHeader
              columnKey="amount"
              className="px-2 text-right"
              onClick={() => handleColumnSort('amount')}
            >
              Amount <SortIndicator field="amount" />
            </ResizableHeader>

            {/* Actions column */}
            <div className="flex-shrink-0 w-24 px-2 text-center">Actions</div>
          </div>

          {/* Data Rows */}
          {sortedTransactions.map(tx => (
            <CompactTransactionRow
              key={tx.id}
              transaction={tx}
              isSelectMode={true}
              isSelected={selectedTransactions.has(tx.id)}
              onSelect={() => toggleSelect(tx.id)}
              editingCategoryId={editingCategoryId}
              editingCategoryValue={editingCategoryValue}
              onCategoryEdit={onCategoryEdit}
              onCategoryChange={onCategoryChange}
              onCategoryKeyPress={onCategoryKeyPress}
              onSaveCategoryEdit={onSaveCategoryEdit}
              onCancelCategoryEdit={onCancelCategoryEdit}
              onEdit={onEdit}
              onDelete={onDelete}
              onSplit={onSplit}
              deletingId={deletingId}
              visibleColumns={visibleColumns}
              columnWidths={columnWidths}
              getPaymentMethodDisplay={getPaymentMethodDisplay}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
          <span>
            Showing {sortedTransactions.length} {variant === 'income' ? 'income' : variant === 'expense' ? 'expense' : ''} transactions
          </span>
          {selectedTransactions.size > 0 && (
            <span className={selectionColor === 'green' ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}>
              {selectedTransactions.size} selected
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

TransactionGrid.displayName = 'TransactionGrid';

export default TransactionGrid;
