import React from 'react';
import { isBusinessCategory, isTaxDeductible, getCategoryGroup, CATEGORY_METADATA } from '@shared/constants/categories';

const CategoryBadge = ({ category, subcategory, showGroup = false, showTaxStatus = false, showSpecialReporting = false, compact = false }) => {
  if (!category) {
    return (
      <span className="badge badge-personal">
        Uncategorized
      </span>
    );
  }

  const isBusiness = isBusinessCategory(category);
  const isDeductible = isTaxDeductible(category);
  const group = getCategoryGroup(category);
  const metadata = CATEGORY_METADATA[category];
  const hasSpecialReporting = metadata?.specialReporting;
  const scheduleCLine = metadata?.line;

  const formatGroupName = (groupName) => {
    return groupName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-1">
        <span className={`badge ${isBusiness ? 'badge-business' : 'badge-personal'}`}>
          {category}
        </span>
        {subcategory && (
          <span className="subcategory text-xs">
            {subcategory}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="category-label space-y-1">
      {/* Main category with group */}
      <div className="flex items-center space-x-2">
        {showGroup && (
          <span className="category-group">
            {formatGroupName(group)}
          </span>
        )}
        <span className={`badge ${isBusiness ? 'badge-business' : 'badge-personal'}`}>
          {category}
        </span>
        {scheduleCLine && (
          <span className="badge badge-schedule-c text-xs">
            Line {scheduleCLine}
          </span>
        )}
        {showTaxStatus && (
          <span className={`badge ${isDeductible ? 'badge-tax-deductible' : 'badge-non-deductible'}`}>
            {isDeductible ? 'Deductible' : 'Non-deductible'}
          </span>
        )}
        {showSpecialReporting && hasSpecialReporting && (
          <span className="badge badge-special-reporting text-xs">
            Special Reporting
          </span>
        )}
      </div>

      {/* Subcategory */}
      {subcategory && (
        <div className="subcategory">
          {subcategory}
        </div>
      )}
    </div>
  );
};

export default CategoryBadge;
