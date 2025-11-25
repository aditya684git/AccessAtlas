/**
 * Camera Screen Component
 * Allows users to capture photos and run ML predictions on accessibility features
 * Integrates with voice commands and navigation
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera as CameraIcon, Check, Edit3, Navigation, Loader2, X, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import MobileLayout from '../components/MobileLayout';
import { useNavigation } from '../contexts/NavigationContext';
import { ttsService } from '../lib/ttsService';
import { toast } from '../hooks/use-toast';
import type { Tag } from '../types/tag';

/**
 * Prediction result from ML model
 */
interface Prediction {
  type: string;
  confidence: number;
  lat: number;
  lon: number;
}

/**
 * Tag type options for editing
 */
const TAG_TYPES = ['ramp', 'elevator', 'tactile_path', 'entrance', 'obstacle'] as const;

/**
 * Tag type display names
 */
const TAG_TYPE_NAMES: Record<string, string> = {
  'ramp': 'Ramp',
  'elevator': 'Elevator',
  'tactile_path': 'Tactile Path',
  'entrance': 'Entrance',
  'obstacle': 'Obstacle',
};

/**
 * Tag type to emoji mapping
 */
const TAG_ICONS: Record<string, string> = {
  'ramp': '♿',
  'elevator': '🛗',
  'tactile_path': '🦯',
  'entrance': '🚪',
  'obstacle': '🚧',
};

/**
 * Run ML prediction on captured image
 * @param file - Image file to analyze
 * @returns Prediction object with type, confidence, and location
 */
const runPrediction = async (file: File): Promise<Prediction> => {
  // TODO: Replace with actual ML model API call
  // For now, simulate inference with random prediction
  
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate model inference delay
      const types = ['ramp', 'elevator', 'tactile_path', 'entrance', 'obstacle'];
      const randomType = types[Math.floor(Math.random() * types.length)];
      const randomConfidence = 0.7 + Math.random() * 0.25; // 70-95%
      
      // Get current location (or use default)
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            type: randomType,
            confidence: randomConfidence,
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        () => {
          // Fallback to default location if geolocation fails
          resolve({
            type: randomType,
            confidence: randomConfidence,
            lat: 34.67,
            lon: -82.48,
          });
        }
      );
    }, 1500); // Simulate 1.5s model inference time
  });
};

/**
 * Camera Screen Component
 */
const Camera = () => {
  const navigate = useNavigate();
  const { startNavigation } = useNavigation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedType, setEditedType] = useState<string>('');
  const [confirmedTag, setConfirmedTag] = useState<Tag | null>(null);

  /**
   * Handle camera capture
   * Triggered when user selects/captures an image
   */
  const handleCapture = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Display captured image
    const reader = new FileReader();
    reader.onload = (e) => {
      setCapturedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Reset previous states
    setPrediction(null);
    setConfirmedTag(null);
    setIsEditing(false);
    setIsLoading(true);

    try {
      // Announce that model is running
      ttsService.speak('Analyzing image...');
      
      // Run ML prediction
      const result = await runPrediction(file);
      setPrediction(result);
      setEditedType(result.type);

      // Announce prediction result
      const confidencePercent = Math.round(result.confidence * 100);
      const message = `Detected ${TAG_TYPE_NAMES[result.type] || result.type} with ${confidencePercent}% confidence.`;
      ttsService.speak(message);
      
      toast({
        title: 'Prediction Complete',
        description: message,
      });
    } catch (error) {
      console.error('Prediction error:', error);
      ttsService.speak('Failed to analyze image. Please try again.');
      toast({
        title: 'Prediction Failed',
        description: 'Could not analyze the image. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Trigger camera input
   */
  const triggerCamera = useCallback(() => {
    fileInputRef.current?.click();
    ttsService.speak('Opening camera...');
  }, []);

  /**
   * Handle tag confirmation
   * Saves the predicted/edited tag to localStorage and global state
   */
  const handleConfirm = useCallback(() => {
    if (!prediction) return;

    // Create tag object
    const tag: Tag = {
      id: `camera_${Date.now()}`,
      type: editedType,
      lat: prediction.lat,
      lon: prediction.lon,
      timestamp: new Date().toISOString(),
      source: 'user',
      confidence: prediction.confidence,
    };

    // Save to localStorage
    try {
      const storedTags = localStorage.getItem('accessibility_tags');
      const tags: Tag[] = storedTags ? JSON.parse(storedTags) : [];
      tags.push(tag);
      localStorage.setItem('accessibility_tags', JSON.stringify(tags));

      // Update confirmed tag state
      setConfirmedTag(tag);
      setIsEditing(false);

      // Speak feedback
      const message = `Tag confirmed: ${TAG_TYPE_NAMES[editedType] || editedType}.`;
      ttsService.speak(message);
      
      toast({
        title: 'Tag Saved',
        description: message,
      });

      // Emit event for map to refresh
      window.dispatchEvent(new CustomEvent('tagAdded', { detail: { tag } }));
    } catch (error) {
      console.error('Failed to save tag:', error);
      ttsService.speak('Failed to save tag. Please try again.');
      toast({
        title: 'Save Failed',
        description: 'Could not save the tag.',
        variant: 'destructive',
      });
    }
  }, [prediction, editedType]);

  /**
   * Handle tag editing
   * Allows user to change the predicted tag type
   */
  const handleEdit = useCallback(() => {
    setIsEditing(true);
    ttsService.speak('Edit mode. Select a tag type.');
  }, []);

  /**
   * Cancel editing
   */
  const handleCancelEdit = useCallback(() => {
    if (prediction) {
      setEditedType(prediction.type);
    }
    setIsEditing(false);
    ttsService.speak('Edit cancelled.');
  }, [prediction]);

  /**
   * Handle navigation to confirmed tag
   */
  const handleNavigate = useCallback(() => {
    if (!confirmedTag) return;

    // Set as navigation target
    startNavigation(confirmedTag);
    
    // Announce navigation start
    ttsService.speak(`Navigating to ${TAG_TYPE_NAMES[confirmedTag.type] || confirmedTag.type}.`);
    
    // Navigate to navigation screen
    navigate('/navigation-screen');
  }, [confirmedTag, startNavigation, navigate]);

  /**
   * Reset camera screen
   */
  const handleReset = useCallback(() => {
    setCapturedImage(null);
    setPrediction(null);
    setConfirmedTag(null);
    setIsEditing(false);
    setEditedType('');
    ttsService.speak('Camera reset. Ready to capture.');
  }, []);

  /**
   * Voice command handlers
   */
  useEffect(() => {
    const handleVoiceCapturePhoto = () => {
      triggerCamera();
    };

    const handleVoiceConfirmTag = () => {
      if (prediction && !confirmedTag) {
        handleConfirm();
      }
    };

    const handleVoiceNavigate = () => {
      if (confirmedTag) {
        handleNavigate();
      }
    };

    // Register event listeners for voice commands
    window.addEventListener('voiceCapturePhoto', handleVoiceCapturePhoto);
    window.addEventListener('voiceConfirmTag', handleVoiceConfirmTag);
    window.addEventListener('voiceNavigateToTag', handleVoiceNavigate);

    return () => {
      window.removeEventListener('voiceCapturePhoto', handleVoiceCapturePhoto);
      window.removeEventListener('voiceConfirmTag', handleVoiceConfirmTag);
      window.removeEventListener('voiceNavigateToTag', handleVoiceNavigate);
    };
  }, [triggerCamera, handleConfirm, handleNavigate, prediction, confirmedTag]);

  return (
    <MobileLayout title="Camera Detection" showNav={true}>
      <div className="flex flex-col h-full p-4 space-y-4 overflow-y-auto">
        {/* Hidden camera input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleCapture}
          className="hidden"
          aria-label="Camera input"
        />

        {/* Camera Capture Section */}
        {!capturedImage && (
          <Card className="p-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
                <CameraIcon className="w-12 h-12 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-center">
                Capture Accessibility Feature
              </h2>
              <p className="text-sm text-gray-600 text-center">
                Take a photo of a ramp, elevator, tactile path, entrance, or obstacle.
                Our AI will identify it automatically.
              </p>
              <Button
                onClick={triggerCamera}
                size="lg"
                className="w-full"
                aria-label="Open camera to capture photo"
              >
                <CameraIcon className="w-5 h-5 mr-2" />
                Take Photo
              </Button>
            </div>
          </Card>
        )}

        {/* Image Preview and Loading */}
        {capturedImage && (
          <Card className="overflow-hidden">
            <div className="relative">
              <img
                src={capturedImage}
                alt="Captured accessibility feature"
                className="w-full h-64 object-cover"
              />
              {isLoading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="flex flex-col items-center space-y-2">
                    <Loader2 className="w-12 h-12 text-white animate-spin" />
                    <p className="text-white font-medium">Analyzing image...</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Prediction Display */}
        {prediction && !confirmedTag && !isLoading && (
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Prediction Result</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  aria-label="Take another photo"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>

              {/* Prediction Info */}
              {!isEditing ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="text-4xl">
                      {TAG_ICONS[editedType] || '📍'}
                    </div>
                    <div className="flex-1">
                      <p className="text-xl font-semibold capitalize">
                        {TAG_TYPE_NAMES[editedType] || editedType}
                      </p>
                      <p className="text-sm text-gray-600">
                        Confidence: {Math.round(prediction.confidence * 100)}%
                      </p>
                    </div>
                  </div>

                  {/* Confidence Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${prediction.confidence * 100}%` }}
                      role="progressbar"
                      aria-valuenow={prediction.confidence * 100}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Prediction confidence"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={handleConfirm}
                      className="flex-1"
                      size="lg"
                      aria-label="Confirm prediction and save tag"
                    >
                      <Check className="w-5 h-5 mr-2" />
                      Confirm
                    </Button>
                    <Button
                      onClick={handleEdit}
                      variant="outline"
                      className="flex-1"
                      size="lg"
                      aria-label="Edit tag type"
                    >
                      <Edit3 className="w-5 h-5 mr-2" />
                      Edit
                    </Button>
                  </div>
                </div>
              ) : (
                // Edit Mode
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Select the correct tag type:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {TAG_TYPES.map((type) => (
                      <Button
                        key={type}
                        onClick={() => setEditedType(type)}
                        variant={editedType === type ? 'default' : 'outline'}
                        className="h-auto py-4"
                        aria-label={`Select ${TAG_TYPE_NAMES[type]}`}
                        aria-pressed={editedType === type}
                      >
                        <div className="flex flex-col items-center space-y-1">
                          <span className="text-2xl">{TAG_ICONS[type]}</span>
                          <span className="text-xs capitalize">
                            {TAG_TYPE_NAMES[type]}
                          </span>
                        </div>
                      </Button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleConfirm}
                      className="flex-1"
                      size="lg"
                      aria-label="Confirm edited tag"
                    >
                      <Check className="w-5 h-5 mr-2" />
                      Confirm
                    </Button>
                    <Button
                      onClick={handleCancelEdit}
                      variant="outline"
                      className="flex-1"
                      size="lg"
                      aria-label="Cancel editing"
                    >
                      <X className="w-5 h-5 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Confirmed Tag - Navigate Option */}
        {confirmedTag && (
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">Tag Saved!</h3>
                  <p className="text-sm text-gray-600">
                    {TAG_TYPE_NAMES[confirmedTag.type] || confirmedTag.type} added to map
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={handleNavigate}
                  size="lg"
                  className="w-full"
                  aria-label={`Navigate to ${TAG_TYPE_NAMES[confirmedTag.type]}`}
                >
                  <Navigation className="w-5 h-5 mr-2" />
                  Navigate to This Tag
                </Button>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  size="lg"
                  className="w-full"
                  aria-label="Capture another photo"
                >
                  <CameraIcon className="w-5 h-5 mr-2" />
                  Capture Another
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Fallback Message */}
        {!capturedImage && !isLoading && (
          <Card className="p-4 bg-blue-50 border-blue-200">
            <p className="text-sm text-blue-800 text-center">
              💡 <strong>Tip:</strong> Point your camera at accessibility features like ramps,
              elevators, or tactile paths. The AI will identify them automatically.
            </p>
          </Card>
        )}

        {/* Voice Commands Help */}
        <Card className="p-4 bg-gray-50">
          <h4 className="text-sm font-semibold mb-2">Voice Commands</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• "capture photo" - Open camera</li>
            <li>• "confirm tag" - Confirm prediction</li>
            <li>• "navigate to [type]" - Navigate to tag</li>
          </ul>
        </Card>

        {/* Accessibility: Hidden live region for screen readers */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {isLoading && <p>Analyzing image, please wait...</p>}
          {prediction && !confirmedTag && (
            <p>
              Detected {TAG_TYPE_NAMES[prediction.type] || prediction.type} with{' '}
              {Math.round(prediction.confidence * 100)}% confidence.
              Press Confirm to save or Edit to change the tag type.
            </p>
          )}
          {confirmedTag && (
            <p>
              Tag saved successfully. You can now navigate to this {TAG_TYPE_NAMES[confirmedTag.type]} or
              capture another photo.
            </p>
          )}
        </div>
      </div>
    </MobileLayout>
  );
};

export default Camera;
