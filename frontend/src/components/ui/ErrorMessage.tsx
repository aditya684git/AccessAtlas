import React from 'react';

interface ErrorMessageProps {
  error: string | null;
  type?: 'detection' | 'voice' | 'general';
}

/**
 * Reusable error message component
 */
export const ErrorMessage: React.FC<ErrorMessageProps> = ({ error, type = 'detection' }) => {
  if (!error) return null;

  const colors = {
    detection: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: '❌' },
    voice: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', icon: '⚠️' },
    general: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: '⚡' },
  };

  const style = colors[type];

  return (
    <div className={`mb-6 p-4 ${style.bg} rounded-md border ${style.border}`}>
      <p className={`${style.text} text-sm font-semibold`}>
        {style.icon} {type.charAt(0).toUpperCase() + type.slice(1)} Error
      </p>
      <p className={`${style.text} text-sm mt-1`}>{error}</p>
    </div>
  );
};

export default ErrorMessage;
