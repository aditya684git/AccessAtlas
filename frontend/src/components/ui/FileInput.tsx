import React, { forwardRef } from 'react';

interface FileInputProps {
  fileName: string;
  disabled: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Reusable file input component with drag-and-drop support
 * Mobile-optimized with larger touch targets and responsive layout
 */
const FileInput = forwardRef<HTMLInputElement, FileInputProps>(
  ({ fileName, disabled, onChange }, ref) => {
    return (
      <div className="space-y-2 sm:space-y-3 w-full">
        <label className="block text-xs sm:text-sm font-semibold text-gray-900">
          Choose an Image
        </label>
        <div className="relative">
          <input
            ref={ref}
            type="file"
            accept="image/*"
            onChange={onChange}
            disabled={disabled}
            aria-label="Upload image for object detection"
            className="block w-full text-xs sm:text-sm text-gray-700
              file:mr-2 sm:file:mr-3 file:py-2 sm:file:py-2.5 file:px-3 sm:file:px-4
              file:rounded-lg file:border-0
              file:text-xs sm:file:text-sm file:font-semibold
              file:bg-gradient-to-r file:from-blue-500 file:to-blue-600
              file:text-white
              hover:file:from-blue-600 hover:file:to-blue-700
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed disabled:file:bg-gray-400
              transition-all duration-200 cursor-pointer active:scale-95"
          />
        </div>
        {fileName && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg animate-in fade-in duration-200">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8 16.5a.5.5 0 01-.5-.5v-5.19l-1.841-1.841A.75.75 0 107.757 7.757L10 9.93l2.243-2.173a.75.75 0 0 1 1.06 1.06l-1.84 1.84V16a.5.5 0 01-.5.5h-3z" clipRule="evenodd" />
            </svg>
            <p className="text-xs sm:text-sm text-green-700 font-medium truncate">📁 {fileName}</p>
          </div>
        )}
      </div>
    );
  }
);

FileInput.displayName = 'FileInput';

export default FileInput;
