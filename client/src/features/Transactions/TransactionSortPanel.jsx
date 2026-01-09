import React, { useState, useMemo } from 'react';
import {
  ArrowsUpDownIcon,
  PlusIcon,
  XMarkIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import {
  SORT_OPTIONS,
  SORT_DIRECTIONS,
  SORT_PRESETS,
  SORT_GROUPS,
  getGroupedSortOptions,
  createDefaultSorts,
  addSortLevel,
  removeSortLevel,
  updateSortLevel,
  moveSortLevel,
  getSortOptionByValue,
  getSortDirectionByValue
} from '@shared/constants/sorting';

/**
 * TransactionSortPanel - Reusable, comprehensive multi-level sorting panel
 * 
 * Supports sorting by multiple columns with priority ordering.
 * Can be used in TransactionList, ExpenseBulkEdit, IncomeBulkEdit, and reports.
 * 
 * @param {Object} props
 * @param {Array} props.sorts - Current sort configuration array [{ field, direction }, ...]
 * @param {Function} props.onSortsChange - Callback when sorts change
 * @param {number} props.maxLevels - Maximum number of sort levels allowed (default: 5)
 * @param {boolean} props.showPresets - Whether to show preset buttons (default: true)
 * @param {boolean} props.showGrouped - Show fields grouped by category (default: false)
 * @param {boolean} props.compact - Use compact layout (default: false)
 * @param {boolean} props.collapsible - Allow collapsing the panel (default: true)
 * @param {boolean} props.defaultCollapsed - Start collapsed (default: false)
 * @param {string} props.title - Panel title (default: "Sort Options")
 * @param {Array} props.excludeFields - Fields to exclude from options
 * @param {Array} props.includeFields - Only include these fields (overrides excludeFields)
 */
const TransactionSortPanel = ({
  sorts = [],
  onSortsChange,
  maxLevels = 5,
  showPresets = true,
  showGrouped = false,
  compact = false,
  collapsible = true,
  defaultCollapsed = false,
  title = "Sort Options",
  excludeFields = [],
  includeFields = null
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  // Filter available sort options
  const availableOptions = useMemo(() => {
    let options = SORT_OPTIONS;
    
    if (includeFields && includeFields.length > 0) {
      options = options.filter(opt => includeFields.includes(opt.value));
    } else if (excludeFields.length > 0) {
      options = options.filter(opt => !excludeFields.includes(opt.value));
    }
    
    return options;
  }, [includeFields, excludeFields]);

  // Get grouped options
  const groupedOptions = useMemo(() => {
    if (!showGrouped) return null;
    
    const groups = {};
    Object.entries(SORT_GROUPS).forEach(([key, group]) => {
      const options = availableOptions.filter(opt => opt.group === key);
      if (options.length > 0) {
        groups[key] = { ...group, options };
      }
    });
    
    return Object.entries(groups)
      .sort(([, a], [, b]) => a.order - b.order)
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {});
  }, [availableOptions, showGrouped]);

  // Get fields already in use
  const usedFields = useMemo(() => new Set(sorts.map(s => s.field)), [sorts]);

  // Get available fields for a specific level (excludes already used fields)
  const getAvailableFieldsForLevel = (currentField) => {
    return availableOptions.filter(opt => 
      opt.value === currentField || !usedFields.has(opt.value)
    );
  };

  // Current sort summary
  const sortSummary = useMemo(() => {
    if (sorts.length === 0) return 'No sorting applied';
    
    return sorts.map((sort, index) => {
      const option = getSortOptionByValue(sort.field);
      const direction = getSortDirectionByValue(sort.direction);
      return `${index + 1}. ${option.icon} ${option.label} ${direction.icon}`;
    }).join(' → ');
  }, [sorts]);

  // Handlers
  const handleAddSort = () => {
    if (sorts.length >= maxLevels) return;
    
    // Find first unused field
    const unusedField = availableOptions.find(opt => !usedFields.has(opt.value));
    if (unusedField) {
      onSortsChange(addSortLevel(sorts, unusedField.value, 'asc'));
    }
  };

  const handleRemoveSort = (index) => {
    onSortsChange(removeSortLevel(sorts, index));
  };

  const handleUpdateField = (index, field) => {
    onSortsChange(updateSortLevel(sorts, index, { field }));
  };

  const handleUpdateDirection = (index, direction) => {
    onSortsChange(updateSortLevel(sorts, index, { direction }));
  };

  const handleToggleDirection = (index) => {
    const newDirection = sorts[index].direction === 'asc' ? 'desc' : 'asc';
    onSortsChange(updateSortLevel(sorts, index, { direction: newDirection }));
  };

  const handleMoveUp = (index) => {
    onSortsChange(moveSortLevel(sorts, index, 'up'));
  };

  const handleMoveDown = (index) => {
    onSortsChange(moveSortLevel(sorts, index, 'down'));
  };

  const handleApplyPreset = (preset) => {
    onSortsChange([...preset.sorts]);
  };

  const handleReset = () => {
    onSortsChange(createDefaultSorts());
  };

  // Render grouped field selector
  const renderGroupedSelector = (currentField, onChange) => (
    <select
      value={currentField}
      onChange={(e) => onChange(e.target.value)}
      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
    >
      {Object.entries(groupedOptions).map(([groupKey, group]) => (
        <optgroup key={groupKey} label={group.label}>
          {group.options.map(option => (
            <option 
              key={option.value} 
              value={option.value}
              disabled={usedFields.has(option.value) && option.value !== currentField}
            >
              {option.icon} {option.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );

  // Render flat field selector
  const renderFlatSelector = (currentField, onChange, index) => {
    const availableFields = getAvailableFieldsForLevel(currentField);
    return (
      <select
        value={currentField}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
      >
        {availableOptions.map(option => (
          <option 
            key={option.value} 
            value={option.value}
            disabled={usedFields.has(option.value) && option.value !== currentField}
          >
            {option.icon} {option.label}
          </option>
        ))}
      </select>
    );
  };

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort:</span>
        {sorts.map((sort, index) => {
          const option = getSortOptionByValue(sort.field);
          const direction = getSortDirectionByValue(sort.direction);
          return (
            <span
              key={index}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
            >
              {index > 0 && <span className="mr-1 text-gray-400">→</span>}
              {option.icon} {option.label}
              <button
                onClick={() => handleToggleDirection(index)}
                className="ml-1 hover:text-blue-600 dark:hover:text-blue-300"
                title={`Click to toggle direction (currently ${direction.label})`}
              >
                {direction.icon}
              </button>
              <button
                onClick={() => handleRemoveSort(index)}
                className="ml-1 hover:text-red-600 dark:hover:text-red-400"
              >
                ×
              </button>
            </span>
          );
        })}
        {sorts.length < maxLevels && (
          <button
            onClick={handleAddSort}
            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <PlusIcon className="h-3 w-3 mr-1" />
            Add
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div 
        className={`px-4 py-3 border-b border-gray-200 dark:border-gray-600 ${collapsible ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600' : ''}`}
        onClick={() => collapsible && setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
              <ArrowsUpDownIcon className="h-5 w-5 mr-2" />
              {title}
              {sorts.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                  ({sorts.length} level{sorts.length !== 1 ? 's' : ''})
                </span>
              )}
            </h3>
            {!isCollapsed && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {sortSummary}
              </p>
            )}
          </div>
          {collapsible && (
            <button className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
              {isCollapsed ? (
                <ChevronDownIcon className="h-5 w-5" />
              ) : (
                <ChevronUpIcon className="h-5 w-5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="p-4 space-y-4">
          {/* Sort Levels */}
          <div className="space-y-2">
            {sorts.map((sort, index) => {
              const option = getSortOptionByValue(sort.field);
              return (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-600"
                >
                  {/* Priority indicator */}
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium flex items-center justify-center">
                    {index + 1}
                  </div>

                  {/* Field selector */}
                  <div className="flex-1 min-w-0">
                    {showGrouped && groupedOptions 
                      ? renderGroupedSelector(sort.field, (f) => handleUpdateField(index, f))
                      : renderFlatSelector(sort.field, (f) => handleUpdateField(index, f), index)
                    }
                  </div>

                  {/* Direction selector */}
                  <div className="flex-shrink-0 w-32">
                    <select
                      value={sort.direction}
                      onChange={(e) => handleUpdateDirection(index, e.target.value)}
                      className="block w-full px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                      {SORT_DIRECTIONS.map(dir => (
                        <option key={dir.value} value={dir.value}>
                          {dir.icon} {dir.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Move buttons */}
                  <div className="flex-shrink-0 flex flex-col">
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className={`p-0.5 rounded ${
                        index === 0 
                          ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' 
                          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                      title="Move up (higher priority)"
                    >
                      <ChevronUpIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === sorts.length - 1}
                      className={`p-0.5 rounded ${
                        index === sorts.length - 1 
                          ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' 
                          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                      title="Move down (lower priority)"
                    >
                      <ChevronDownIcon className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => handleRemoveSort(index)}
                    className="flex-shrink-0 p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded"
                    title="Remove this sort level"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              );
            })}

            {/* Empty state */}
            {sorts.length === 0 && (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                No sorting applied. Add a sort level to begin.
              </div>
            )}

            {/* Add sort button */}
            {sorts.length < maxLevels && (
              <button
                onClick={handleAddSort}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors"
              >
                <PlusIcon className="h-4 w-4" />
                Add Sort Level ({sorts.length}/{maxLevels})
              </button>
            )}
          </div>

          {/* Presets and Reset */}
          {showPresets && (
            <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Quick Presets
                </span>
                <button
                  onClick={handleReset}
                  className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <ArrowPathIcon className="h-4 w-4 mr-1" />
                  Reset
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {SORT_PRESETS.map((preset, index) => (
                  <button
                    key={index}
                    onClick={() => handleApplyPreset(preset)}
                    className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-900/20 dark:hover:border-blue-600 transition-colors"
                    title={`${preset.sorts.length} level sort`}
                  >
                    <span className="mr-1">{preset.icon}</span>
                    {preset.label}
                    {preset.sorts.length > 1 && (
                      <span className="ml-1 text-gray-400 dark:text-gray-500">
                        ({preset.sorts.length})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Current sort display */}
          {sorts.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
              <div className="text-sm text-gray-500 dark:text-gray-400 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                <div className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Current Sort Order:
                </div>
                <div className="text-blue-700 dark:text-blue-300 flex flex-wrap items-center gap-1">
                  {sorts.map((sort, index) => {
                    const option = getSortOptionByValue(sort.field);
                    const direction = getSortDirectionByValue(sort.direction);
                    return (
                      <span key={index} className="inline-flex items-center">
                        {index > 0 && <span className="mx-1 text-blue-400">→</span>}
                        <span className="font-medium">{option.icon} {option.label}</span>
                        <span className="ml-0.5">{direction.icon}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TransactionSortPanel;
