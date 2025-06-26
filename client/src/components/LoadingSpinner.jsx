import React from 'react';

const LoadingSpinner = ({ size = 'md', text = 'Loading...' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-gray-900 transition-colors">
      <div className={`animate-spin rounded-full border-b-2 border-primary-600 dark:border-primary-400 ${sizeClasses[size]} transition-colors`}></div>
      {text && <p className="mt-4 text-gray-600 dark:text-gray-300 transition-colors">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
