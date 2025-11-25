/**
 * Voice Command Control Panel
 * UI component for controlling voice commands
 */

import React from 'react';
import { Mic, MicOff, Volume2, VolumeX, HelpCircle } from 'lucide-react';
import { Button } from './button';
import { Card } from './card';
import { Badge } from './badge';
import { Alert, AlertDescription } from './alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog';
import { commandParser } from '../../lib/voiceCommandParser';

interface VoiceCommandPanelProps {
  /**
   * Whether voice recognition is currently listening
   */
  isListening: boolean;

  /**
   * Whether browser supports speech recognition
   */
  isSupported: boolean;

  /**
   * Current transcript being processed
   */
  transcript: string;

  /**
   * Status message to display
   */
  statusMessage: string;

  /**
   * Error message, if any
   */
  error: string | null;

  /**
   * Callback to start listening
   */
  onStart: () => void;

  /**
   * Callback to stop listening
   */
  onStop: () => void;

  /**
   * Callback to cancel speech
   */
  onCancel?: () => void;

  /**
   * Show help dialog
   */
  showHelp?: boolean;
}

export const VoiceCommandPanel: React.FC<VoiceCommandPanelProps> = ({
  isListening,
  isSupported,
  transcript,
  statusMessage,
  error,
  onStart,
  onStop,
  onCancel,
  showHelp = true
}) => {
  const exampleCommands = commandParser.getExampleCommands();

  if (!isSupported) {
    return (
      <Alert className="bg-yellow-50 border-yellow-200">
        <AlertDescription className="text-yellow-800">
          Voice commands are not supported in this browser. Please use Chrome, Edge, or Safari.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-lg">Voice Commands</h3>
          {isListening && (
            <Badge variant="default" className="bg-green-500 animate-pulse">
              <Mic className="w-3 h-3 mr-1" />
              Listening
            </Badge>
          )}
        </div>

        {showHelp && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" aria-label="Show help">
                <HelpCircle className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Available Voice Commands</DialogTitle>
                <DialogDescription>
                  Speak any of these commands when voice mode is active
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div>
                  <h4 className="font-semibold mb-2">Adding Tags</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>"Add ramp" - Mark a ramp at current location</li>
                    <li>"Add elevator" - Mark an elevator</li>
                    <li>"Add entrance" - Mark an accessible entrance</li>
                    <li>"Add obstacle" - Mark an obstacle</li>
                    <li>"Add tactile path" - Mark tactile paving</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Filtering Tags</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>"Show user tags" - Display your tags only</li>
                    <li>"Clear filters" - Remove all filters</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Navigation</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>"Navigate to nearest elevator" - Find closest elevator</li>
                    <li>"Navigate to nearest ramp" - Find closest ramp</li>
                    <li>"Navigate to nearest entrance" - Find closest entrance</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Information</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>"Read tags" - Speak number of visible tags</li>
                    <li>"Help" - Show this help dialog</li>
                  </ul>
                </div>

                <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
                  <p className="font-semibold mb-1">Tips:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Speak clearly and at normal pace</li>
                    <li>Wait for feedback after each command</li>
                    <li>Commands are case-insensitive</li>
                    <li>You can use variations (e.g., "create ramp" or "mark ramp")</li>
                  </ul>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex gap-2">
        {!isListening ? (
          <Button
            onClick={onStart}
            className="flex-1"
            size="lg"
            variant="default"
          >
            <Mic className="w-5 h-5 mr-2" />
            Start Voice Commands
          </Button>
        ) : (
          <>
            <Button
              onClick={onStop}
              className="flex-1"
              size="lg"
              variant="destructive"
            >
              <MicOff className="w-5 h-5 mr-2" />
              Stop
            </Button>
            {onCancel && (
              <Button
                onClick={onCancel}
                size="lg"
                variant="outline"
                aria-label="Stop speech output"
              >
                <VolumeX className="w-5 h-5" />
              </Button>
            )}
          </>
        )}
      </div>

      {/* Status Display */}
      {(statusMessage || transcript) && (
        <div className="space-y-2">
          {transcript && (
            <div
              className="p-3 bg-blue-50 border border-blue-200 rounded text-sm"
              role="status"
              aria-live="polite"
            >
              <p className="font-semibold text-blue-900 mb-1">You said:</p>
              <p className="text-blue-700">{transcript}</p>
            </div>
          )}

          {statusMessage && (
            <div
              className="p-3 bg-green-50 border border-green-200 rounded text-sm"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-2">
                <Volume2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-green-700">{statusMessage}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Quick Reference */}
      {!isListening && !error && (
        <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
          <p className="font-semibold mb-1">Quick Examples:</p>
          <div className="flex flex-wrap gap-1">
            {exampleCommands.slice(0, 6).map((cmd) => (
              <Badge key={cmd} variant="secondary" className="text-xs">
                "{cmd}"
              </Badge>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
