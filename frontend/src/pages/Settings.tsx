import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import MobileLayout from "@/components/MobileLayout";
import { useNavigate } from "react-router-dom";
import DropdownMenu from "@/components/DropdownMenu";
import HelpModal from "@/components/HelpModal";
import { toast } from "@/hooks/use-toast";
import { HelpCircle } from "lucide-react";
import { useOfflineMode } from "@/hooks/useOfflineMode";

const Settings = () => {
  const navigate = useNavigate();
  // Removed fontSize state - font size option removed per user request
  const [colorContrast, setColorContrast] = useState("Dark Mode");
  const [highContrast, setHighContrast] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [offlineMode, setOfflineMode] = useOfflineMode();

  // Apply contrast mode on mount
  useEffect(() => {
    if (colorContrast === "Dark Mode") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const handleContrastChange = (value: string) => {
    setColorContrast(value);
    // Apply dark/light mode
    if (value === "Dark Mode") {
      document.documentElement.classList.add("dark");
      toast({
        title: "Dark Mode Enabled",
        description: "Color contrast updated successfully",
      });
    } else {
      document.documentElement.classList.remove("dark");
      toast({
        title: "Light Mode Enabled",
        description: "Color contrast updated successfully",
      });
    }
  };

  // Removed handleFontSizeChange - font size option removed per user request

  const handleHighContrastToggle = (checked: boolean) => {
    setHighContrast(checked);
    if (checked) {
      document.documentElement.classList.add("high-contrast");
      toast({
        title: "High Contrast Mode Enabled",
        description: "Enhanced visual separation for better accessibility",
      });
    } else {
      document.documentElement.classList.remove("high-contrast");
      toast({
        title: "High Contrast Mode Disabled",
      });
    }
  };

  const handleOfflineModeToggle = (checked: boolean) => {
    setOfflineMode(checked);
    toast({
      title: checked ? "Offline Mode Enabled" : "Offline Mode Disabled",
      description: checked 
        ? "API calls will be disabled. Tags and navigation still work locally."
        : "API calls are now enabled.",
    });
  };

  return (
    <MobileLayout title="Settings" showNav={true}>
      <div className="space-y-6 p-6 pb-24">
        {/* Help Button */}
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setHelpOpen(true)}
            aria-label="Open help and tips"
          >
            <HelpCircle className="w-6 h-6" />
          </Button>
        </div>

        {/* General Settings */}
        <section>
          <h2 className="text-xl font-semibold mb-4">General</h2>
          <div className="space-y-3">
            {/* Font Size option removed per user request */}

            {/* Color Contrast */}
            <DropdownMenu
              label={`Color Contrast: ${colorContrast}`}
              value={colorContrast}
              options={["Light Mode", "Dark Mode"]}
              onValueChange={handleContrastChange}
              ariaLabel="Switch between light and dark mode"
            />

            {/* High Contrast Mode */}
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <span className="font-medium block">High Contrast Mode</span>
                <span className="text-xs text-muted-foreground">Enhanced visual separation</span>
              </div>
              <Switch
                checked={highContrast}
                onCheckedChange={handleHighContrastToggle}
                aria-label="Toggle high contrast mode for improved visibility"
              />
            </div>

            {/* Offline Mode */}
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <span className="font-medium block">Offline Mode</span>
                <span className="text-xs text-muted-foreground">Disable API calls and work locally</span>
              </div>
              <Switch
                checked={offlineMode}
                onCheckedChange={handleOfflineModeToggle}
                aria-label="Toggle offline mode to disable network requests"
              />
            </div>
          </div>
        </section>

        {/* Accessibility Preferences */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Accessibility</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <span className="font-medium block">Voice Guidance</span>
                <span className="text-xs text-muted-foreground">Audio navigation instructions</span>
              </div>
              <Switch defaultChecked aria-label="Enable or disable voice guidance" />
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <span className="font-medium block">Screen Reader Support</span>
                <span className="text-xs text-muted-foreground">Optimize for screen readers</span>
              </div>
              <Switch defaultChecked aria-label="Enable or disable screen reader support" />
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <span className="font-medium block">Haptic Feedback</span>
                <span className="text-xs text-muted-foreground">Vibration alerts</span>
              </div>
              <Switch aria-label="Enable or disable haptic feedback" />
            </div>
          </div>
        </section>

        {/* Navigation Options */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Navigation</h2>
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate("/")}
              aria-label="Return to home screen"
            >
              Back to Home
            </Button>
          </div>
        </section>
      </div>

      {/* Help Modal */}
      <HelpModal open={helpOpen} onOpenChange={setHelpOpen} />
    </MobileLayout>
  );
};

export default Settings;
