import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";

interface VoiceToggleProps {
  variant?: "default" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showLabel?: boolean;
}

/**
 * Reusable voice toggle component
 * Toggles between "Mic On" and "Mic Off" states
 * Used across all screens for consistent voice control
 */
const VoiceToggle = ({ 
  variant = "default", 
  size = "default", 
  className = "",
  showLabel = true 
}: VoiceToggleProps) => {
  const [isVoiceOn, setIsVoiceOn] = useState(false);

  const handleToggle = () => {
    const newState = !isVoiceOn;
    setIsVoiceOn(newState);
    // TODO: Integrate with actual voice recognition API
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggle}
      className={className}
      aria-label={isVoiceOn ? "Turn microphone off" : "Turn microphone on"}
      aria-pressed={isVoiceOn}
    >
      {isVoiceOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
      {showLabel && <span className="ml-2">{isVoiceOn ? "Mic On" : "Mic Off"}</span>}
    </Button>
  );
};

export default VoiceToggle;
