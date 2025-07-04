import React from 'react';

/**
 * StatementSelector - Dropdown/select for linking a transaction to a statement/PDF
 * Props:
 *   value: current statementId
 *   onChange: function(newStatementId)
 *   statements: array of { id, name, uploadedAt }
 */
const StatementSelector = ({ value, onChange, statements = [] }) => {
  // Check if the current value is missing from the statements list
  const hasValue = value && statements.some(s => s.id === value);
  return (
    <div>
      <label className="form-label">Statement/PDF</label>
      <select
        className="form-input"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">Unlinked (Manual/None)</option>
        {statements.map((s) => {
          let displayName = s.name && s.name !== 'undefined' ? s.name : '';
          if (!displayName) {
            if (s.uploadedAt) {
              displayName = `Statement (${new Date(s.uploadedAt).toLocaleDateString()}) [${String(s.id).slice(-6)}]`;
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
