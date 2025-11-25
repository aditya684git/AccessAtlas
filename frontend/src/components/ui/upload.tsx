import { useState, useRef } from 'react';
import MobileLayout from '../MobileLayout';
import { ArrowLeft } from 'lucide-react';
import { Button } from './button';
import { useDetection } from '../../hooks/useDetection';
import { useVoice } from '../../hooks/useVoice';
import { useHistory } from '../../hooks/useHistory';
import FileInput from './FileInput';
import LoadingIndicator from './LoadingIndicator';
import VoiceFeedback from './VoiceFeedback';
import ErrorMessage from './ErrorMessage';
import { DetectionList } from './DetectionList';
import ActionButtons from './ActionButtons';

/**
 * Upload component for image detection
 * Handles file uploads, detection, voice feedback, and history tracking
 * with mobile-first responsive design and accessibility
 */
const Upload = () => {
  const { detections, loading, error, spokenText, timestamp, detect, clear } = useDetection();
  const { isSpeaking, error: voiceError, speak } = useVoice();
  const { addEntry } = useHistory();
  const [fileName, setFileName] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handle image upload and trigger detection
   */
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  /**
   * Handle drag and drop
   */
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    }
  };

  /**
   * Process file: update state and run detection
   */
  const processFile = async (file: File) => {
    fileRef.current = file;
    setFileName(file.name);
    clear(); // Clear previous results

    try {
      // Run detection
      await detect(file);

      // Log to history
      addEntry(
        'detection',
        { fileName: file.name, objectCount: detections.length },
        'success'
      );

      // Trigger voice feedback if speech is available
      if (spokenText && spokenText.trim().length > 0) {
        await speak(spokenText);
        addEntry('voice', { text: spokenText }, 'success');
      }
    } catch (err) {
      console.error('Upload handler error:', err);
      addEntry('detection', { fileName: file.name }, 'error', String(err));
    }
  };

  /**
   * Retry last detection with stored file
   */
  const handleRetry = async () => {
    if (!fileRef.current) return;

    try {
      await detect(fileRef.current);
      addEntry(
        'detection',
        { fileName: fileRef.current.name, objectCount: detections.length, isRetry: true },
        'success'
      );

      if (spokenText && spokenText.trim().length > 0) {
        await speak(spokenText);
      }
    } catch (err) {
      console.error('Retry error:', err);
      addEntry('detection', { fileName: fileRef.current?.name }, 'error', String(err));
    }
  };

  /**
   * Clear all results
   */
  const handleClear = () => {
    setFileName('');
    fileRef.current = null;
    clear();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <MobileLayout title="Detect Objects">
      <div className="flex flex-col h-full px-4 py-4 pb-24 overflow-y-auto scrollbar-hide bg-background">
        {/* Help Text - Top of page */}
        {!fileName && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 flex-shrink-0">
            <p className="text-xs sm:text-sm text-blue-800">
              💡 <strong>Tip:</strong> Tap to select or drag an image to detect objects.
            </p>
          </div>
        )}

        {/* Upload Card */}
        <div
          className="bg-white rounded-xl shadow-md border border-border flex-shrink-0 overflow-hidden"
          role="main"
          aria-label="Image detection upload area"
        >
          {/* Upload Section */}
          <div className="p-4 sm:p-6">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`p-6 sm:p-8 rounded-lg border-2 border-dashed transition-all duration-200 ${
                dragOver
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 bg-gray-50 hover:border-gray-400'
              }`}
              role="region"
              aria-label="Drag and drop area for image upload"
            >
              <FileInput
                fileName={fileName}
                disabled={loading}
                onChange={handleUpload}
                ref={fileInputRef}
              />
              {dragOver && (
                <p className="text-center text-xs sm:text-sm text-blue-600 font-medium mt-3">
                  ✓ Drop your image here
                </p>
              )}
            </div>
          </div>

          {/* Status Section */}
          {(loading || error || voiceError || isSpeaking) && (
            <div className="px-4 sm:px-6 py-4 border-t border-border space-y-3 overflow-y-auto max-h-40">
              <LoadingIndicator
                isLoading={loading}
                message="Analyzing with YOLOv5..."
              />

              <VoiceFeedback
                isSpeaking={isSpeaking}
                text={spokenText}
                voiceError={voiceError}
              />

              <ErrorMessage error={error} type="detection" />
              {voiceError && <ErrorMessage error={voiceError} type="voice" />}
            </div>
          )}

          {/* Results Section */}
          {detections.length > 0 && (
            <div className="px-4 sm:px-6 py-4 border-t border-border bg-blue-50 overflow-y-auto max-h-64">
              <DetectionList
                detections={detections}
                isLoading={loading}
                timestamp={timestamp ?? undefined}
              />
            </div>
          )}

          {/* Actions Section */}
          <div className="px-4 sm:px-6 py-4 border-t border-border bg-muted/30 flex-shrink-0">
            <ActionButtons
              onClear={handleClear}
              onRetry={handleRetry}
              isDisabled={!fileName || loading}
              showRetry={detections.length > 0}
            />
          </div>
        </div>

        {/* Spacer for bottom nav and scrolling space */}
        <div className="h-4 flex-shrink-0" />
      </div>
    </MobileLayout>
  );
};

export default Upload;