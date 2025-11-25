import { Button } from "@/components/ui/button";
import MobileLayout from "@/components/MobileLayout";
import { useNavigate } from "react-router-dom";
import RecentActivity from "@/components/RecentActivity";
import HelpModal from "@/components/HelpModal";
import { HelpCircle, Mic } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "@/hooks/use-toast";

/**
 * Web Speech API types
 */
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

const Home = () => {
  const navigate = useNavigate();
  const [helpOpen, setHelpOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [feedback, setFeedback] = useState<string>("");
  const recognitionRef = useRef<ISpeechRecognition | null>(null);

  /**
   * Initialize Web Speech API
   */
  useEffect(() => {
    // Check if browser supports Web Speech API
    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Web Speech API not supported in this browser");
      return;
    }

    // Create speech recognition instance
    const recognition: ISpeechRecognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    // Handle results
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript.toLowerCase().trim();
      const confidence = event.results[0][0].confidence;

      console.log("Voice command:", transcript, "Confidence:", confidence);
      handleVoiceCommand(transcript);
    };

    // Handle errors
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      
      let errorMessage = "Voice recognition error";
      if (event.error === "no-speech") {
        errorMessage = "No speech detected. Please try again.";
      } else if (event.error === "not-allowed") {
        errorMessage = "Microphone access denied";
      }
      
      provideFeedback(errorMessage);
    };

    // Handle end of recognition
    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    // Cleanup
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  /**
   * Parse and execute voice command
   */
  const handleVoiceCommand = (transcript: string) => {
    console.log("Processing command:", transcript);

    // Command patterns
    const commands = [
      { pattern: /open camera|camera|take photo|capture/i, route: "/camera", label: "Camera" },
      { pattern: /open tag|tagging|tag accessibility/i, route: "/tagging", label: "Tagging" },
      { pattern: /open setting|settings|preferences/i, route: "/settings", label: "Settings" },
    ];

    // Find matching command
    const matchedCommand = commands.find(cmd => cmd.pattern.test(transcript));

    if (matchedCommand) {
      const message = `Opening ${matchedCommand.label}`;
      provideFeedback(message);
      
      // Navigate after brief delay for feedback
      setTimeout(() => {
        navigate(matchedCommand.route);
      }, 500);
    } else {
      provideFeedback("Command not recognized. Try: open camera, open tagging, or open settings.");
    }
  };

  /**
   * Provide spoken and visible feedback
   */
  const provideFeedback = (message: string) => {
    setFeedback(message);
    
    // Show toast notification
    toast({
      title: "Voice Command",
      description: message,
    });

    // Speak feedback using Web Speech Synthesis API
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    }

    // Clear feedback after 3 seconds
    setTimeout(() => setFeedback(""), 3000);
  };

  /**
   * Toggle microphone listening
   */
  const handleMicToggle = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Not Supported",
        description: "Voice recognition is not supported in this browser",
        variant: "destructive",
      });
      return;
    }

    if (isListening) {
      // Stop listening
      recognitionRef.current.stop();
      setIsListening(false);
      provideFeedback("Stopped listening");
    } else {
      // Start listening
      try {
        recognitionRef.current.start();
        setIsListening(true);
        provideFeedback("Listening... Say: open camera, open tagging, or open settings");
      } catch (error) {
        console.error("Failed to start recognition:", error);
        provideFeedback("Failed to start voice recognition");
      }
    }
  };

  return (
    <MobileLayout title="AccessAtlas">
      <div className="flex flex-col h-full px-6 py-6 overflow-y-auto">
        {/* Help Button */}
        <div className="flex justify-end mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setHelpOpen(true)}
            aria-label="Open help and tips"
          >
            <HelpCircle className="w-6 h-6" />
          </Button>
        </div>

        {/* Main Actions */}
        <div className="space-y-4 w-full max-w-xs mx-auto mb-6">
          {/* Removed Start Navigation button per user request */}
          
          <Button
            onClick={() => navigate("/tagging")}
            className="w-full h-14 text-lg font-semibold transition-transform hover:scale-105"
            size="lg"
            aria-label="Tag accessibility features on the map"
          >
            Tag Accessibility
          </Button>
 
          <Button
            onClick={() => navigate("/upload")}
            className="w-full h-14 text-lg font-semibold transition-transform hover:scale-105"
            size="lg"
            aria-label="Upload image for object detection"
          >
            Detect Objects
          </Button>

          <Button
            onClick={() => navigate("/settings")}
            className="w-full h-14 text-lg font-semibold transition-transform hover:scale-105"
            size="lg"
            aria-label="Open application settings"
          >
            Settings
          </Button>
        </div>

        {/* Recent Activity */}
        <div className="w-full max-w-xs mx-auto mb-24">
          <RecentActivity />
        </div>

        {/* Voice Command Feedback - Visible feedback for accessibility */}
        {feedback && (
          <div 
            className="fixed bottom-40 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-6 py-3 rounded-lg shadow-lg max-w-xs text-center"
            role="status"
            aria-live="polite"
          >
            {feedback}
          </div>
        )}

        {/* Voice Command Button - Functional mic button using Web Speech API */}
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2">
          <Button
            onClick={handleMicToggle}
            size="lg"
            variant={isListening ? "default" : "secondary"}
            className={`rounded-full px-8 h-14 text-lg font-semibold shadow-lg transition-all ${
              isListening ? "animate-pulse" : ""
            }`}
            aria-label={isListening ? "Stop listening" : "Start voice commands"}
            aria-pressed={isListening}
          >
            <Mic className={`w-5 h-5 ${isListening ? "text-red-500" : ""}`} />
            <span className="ml-2">{isListening ? "Listening..." : "Voice Commands"}</span>
          </Button>
        </div>
      </div>

      {/* Help Modal */}
      <HelpModal open={helpOpen} onOpenChange={setHelpOpen} />
    </MobileLayout>
  );
};

export default Home;
