import React from 'react';

/**
 * StatementSelector - Dropdown/select for linking a transaction to a PDF statement
 * Props:
 *   value: current statementId
 *   onChange: function(newStatementId)
 *   statements: array of { id, name, uploadedAt }
 *   onRefresh: optional function to refresh the statements list
 */
const StatementSelector = ({ value, onChange, statements = [], onRefresh }) => {
  // Check if the current value is missing from the statements list
  const hasValue = value && statements.some(s => s.id === value);
  const isEmpty = !value;
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="form-label">Statement/PDF</label>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Refresh List
          </button>
        )}
      </div>
      <select
        className={`form-input ${isEmpty ? 'text-gray-400 dark:text-gray-500' : ''}`}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">Unlinked (Manual/None)</option>
        {statements.map((s) => {
          let displayName = s.name && s.name !== 'undefined' ? s.name : '';
          if (!displayName) {
            if (s.uploadedAt) {
              displayName = `Statement (${new Date(s.uploadedAt).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}) [${String(s.id).slice(-6)}]`;
            } else {
              displayName = `Statement [${s.id}]`;
            }
          }
          return (
            <option key={s.id} value={s.id}>
              {displayName}
            </option>
          );
        })}
        {!hasValue && value && (
          <option value={value} disabled>
            Deleted/Missing Statement (ID: {value})
          </option>
        )}
      </select>
      {!hasValue && value && (
        <div className="text-xs text-red-500 mt-1">This statement was deleted or is missing.</div>
      )}
    </div>
  );
};

export default StatementSelector;
