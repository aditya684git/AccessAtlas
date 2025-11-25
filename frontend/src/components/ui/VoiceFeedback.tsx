import React from 'react';

interface VoiceFeedbackProps {
  isSpeaking: boolean;
  text: string | null;
  voiceError: string | null;
}

/**
 * Reusable voice feedback status component
 * Shows when voice is playing and any errors
 */
export const VoiceFeedback: React.FC<VoiceFeedbackProps> = ({ isSpeaking, text, voiceError }) => {
  if (isSpeaking && text) {
    return (
      <div
        className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200 flex items-center gap-3"
        role="status"
        aria-live="polite"
        aria-label="Voice feedback playing"
      >
        <div className="animate-pulse">
          <span className="text-2xl">🔊</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-purple-700">Speaking...</p>
          <p className="text-sm text-purple-600 line-clamp-2">{text}</p>
        </div>
      </div>
    );
  }

  if (voiceError) {
    return (
      <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <p className="text-yellow-700 text-sm font-semibold">⚠️ Voice Feedback Error</p>
        <p className="text-yellow-600 text-sm mt-1">{voiceError}</p>
      </div>
    );
  }

  return null;
};

export default VoiceFeedback;
