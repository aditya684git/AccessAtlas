import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, Camera, MapPin, Navigation, HelpCircle } from "lucide-react";

interface HelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Help and FAQ modal with voice command examples and accessibility tips
 * Accessible from Home and Settings screens
 */
const HelpModal = ({ open, onOpenChange }: HelpModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-primary" />
            Help & Tips
          </DialogTitle>
          <DialogDescription>
            Learn how to use AccessAtlas features and voice commands
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Voice Commands */}
          <section>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Mic className="w-5 h-5 text-primary" />
              Voice Commands
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>"Start navigation to [location]"</li>
              <li>"Add accessibility tag"</li>
              <li>"Call for help"</li>
              <li>"What's nearby?"</li>
              <li>"End navigation"</li>
            </ul>
          </section>

          {/* Camera Features */}
          <section>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              Camera View
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Point camera at obstacles for real-time detection</li>
              <li>Use "Call for Help" for immediate assistance</li>
              <li>Toggle voice guidance for audio descriptions</li>
            </ul>
          </section>

          {/* Tagging Features */}
          <section>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Accessibility Tagging
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Add tags for accessible facilities (restrooms, ramps, etc.)</li>
              <li>Drag tags to reposition them on the map</li>
              <li>Your contributions help the community</li>
            </ul>
          </section>

          {/* Navigation Tips */}
          <section>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Navigation className="w-5 h-5 text-primary" />
              Navigation Tips
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Enable voice guidance for turn-by-turn directions</li>
              <li>Route adapts to accessibility preferences</li>
              <li>Receive obstacle alerts in real-time</li>
            </ul>
          </section>

          {/* Accessibility Features */}
          <section>
            <h3 className="font-semibold mb-3">Accessibility Features</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Adjust font size in Settings for better readability</li>
              <li>Use High Contrast Mode for improved visibility</li>
              <li>All features are screen-reader compatible</li>
              <li>Voice commands work system-wide</li>
            </ul>
          </section>
        </div>

        <Button onClick={() => onOpenChange(false)} className="w-full mt-4">
          Got it!
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default HelpModal;
