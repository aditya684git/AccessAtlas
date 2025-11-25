import React from 'react';

interface ActionButtonsProps {
  onClear: () => void;
  onRetry: () => void;
  isDisabled: boolean;
  showRetry?: boolean;
}

/**
 * Reusable action buttons component
 * Mobile-optimized with larger touch targets and responsive layout
 */
export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onClear,
  onRetry,
  isDisabled,
  showRetry = true,
}) => {
  return (
    <div 
      className="flex flex-col gap-2 sm:gap-3 w-full"
      role="group"
      aria-label="Detection action buttons"
    >
      <button
        onClick={onClear}
        disabled={isDisabled}
        aria-label="Clear results and start over"
        className="w-full px-3 sm:px-4 py-3 sm:py-3.5 bg-gray-200 text-gray-900 rounded-lg text-xs sm:text-sm font-semibold
          hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-200
          transition-all duration-200 active:scale-95"
      >
        Clear
      </button>
      {showRetry && (
        <button
          onClick={onRetry}
          disabled={isDisabled}
          aria-label="Retry detection with the same image"
          className="w-full px-3 sm:px-4 py-3 sm:py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs sm:text-sm font-semibold
            hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-indigo-600
            transition-all duration-200 shadow-md hover:shadow-lg active:scale-95"
        >
          Retry
        </button>
      )}
    </div>
  );
};

export default ActionButtons;
