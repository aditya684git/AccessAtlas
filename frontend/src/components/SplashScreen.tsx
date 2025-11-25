import { useEffect, useState } from "react";

interface SplashScreenProps {
  onLoadComplete: () => void;
}

/**
 * Splash screen with AccessAtlas branding and loading animation
 * Displays on app startup for 2 seconds
 */
const SplashScreen = ({ onLoadComplete }: SplashScreenProps) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      onLoadComplete();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onLoadComplete]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/20 animate-fade-in">
      {/* Logo Container */}
      <div className="relative mb-8 animate-scale-in">
        <div className="w-32 h-32 bg-primary rounded-3xl flex items-center justify-center shadow-2xl">
          <span className="text-6xl font-bold text-primary-foreground">A</span>
        </div>
        {/* Pulse Ring Animation */}
        <div className="absolute inset-0 rounded-3xl bg-primary/20 animate-pulse" />
      </div>

      {/* App Name */}
      <h1 className="text-4xl font-bold mb-2 animate-fade-in" style={{ animationDelay: "0.2s" }}>
        AccessAtlas
      </h1>
      <p className="text-muted-foreground mb-8 animate-fade-in" style={{ animationDelay: "0.4s" }}>
        AI-Powered Navigation for Accessibility
      </p>

      {/* Loading Spinner */}
      <div className="flex gap-2 animate-fade-in" style={{ animationDelay: "0.6s" }}>
        <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
        <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
        <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
      </div>
    </div>
  );
};

export default SplashScreen;
