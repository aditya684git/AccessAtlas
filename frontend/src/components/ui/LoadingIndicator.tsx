import React from 'react';

interface LoadingIndicatorProps {
  isLoading: boolean;
  message?: string;
}

/**
 * Reusable loading indicator with spinner and accessibility
 * Mobile-optimized with responsive sizing
 */
export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  isLoading,
  message = 'Analyzing image...',
}) => {
  if (!isLoading) return null;

  return (
    <div 
      className="p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200 flex items-center gap-3 sm:gap-4"
      role="status"
      aria-live="polite"
      aria-label="Detection in progress"
    >
      <div className="flex-shrink-0">
        <div className="animate-spin h-5 w-5 sm:h-6 sm:w-6 border-3 border-blue-600 border-t-transparent rounded-full" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-blue-700 text-xs sm:text-sm font-medium block">{message}</span>
        <p className="text-xs text-blue-600 mt-1">Processing...</p>
      </div>
    </div>
  );
};

export default LoadingIndicator;
