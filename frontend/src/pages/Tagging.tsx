import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import MobileLayout from "../components/MobileLayout";
import DraggableTag from "../components/DraggableTag";
import TaggingMap from "../components/ui/TaggingMap";
import VoiceToggle from "../components/VoiceToggle";
import { VoiceCommandsContainer } from "../components/VoiceCommandsContainer";
import { Plus, Mic, MicOff, Navigation } from "lucide-react";
import { toast } from "../hooks/use-toast";
import { useNavigation } from "../contexts/NavigationContext";
import type { Tag as MapTag } from "../types/tag";

interface Tag {
  id: string;
  label: string;
  x: number;
  y: number;
}

const Tagging = () => {
  const navigate = useNavigate();
  const { startNavigation } = useNavigation();
  const [tags, setTags] = useState<Tag[]>([
    { id: "1", label: "Family Restroom", x: 50, y: 20 },
    { id: "2", label: "Bakinginator", x: 50, y: 45 },
    { id: "3", label: "Access Path", x: 50, y: 70 },
  ]);
  const [newTag, setNewTag] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [showVoicePanel, setShowVoicePanel] = useState(false);
  const [selectedTag, setSelectedTag] = useState<MapTag | null>(null);

  const handleAddTag = () => {
    if (newTag.trim()) {
      setTags([
        ...tags,
        {
          id: Date.now().toString(),
          label: newTag,
          x: Math.random() * 80 + 10,
          y: Math.random() * 80 + 10,
        },
      ]);
      setNewTag("");
      setIsOpen(false);
      toast({
        title: "Tag Added Successfully",
        description: `"${newTag}" has been added to the map`,
      });
    }
  };

  const handleTagPositionChange = (id: string, x: number, y: number) => {
    setTags(tags.map(tag => 
      tag.id === id ? { ...tag, x, y } : tag
    ));
  };

  // Voice command handlers
  const handleVoiceAddTag = (type: MapTag['type']) => {
    window.dispatchEvent(new CustomEvent('voiceAddTag', { detail: { type } }));
    toast({
      title: "Tag Added via Voice",
      description: `Adding ${type.replace('_', ' ')} at map center`,
    });
  };

  const handleVoiceFilterTags = (source: 'model' | 'osm' | 'user' | 'all') => {
    window.dispatchEvent(new CustomEvent('voiceFilterTags', { detail: { source } }));
    toast({
      title: "Filter Applied",
      description: source === 'all' ? 'Showing all tags' : `Showing ${source} tags`,
    });
  };

  const handleVoiceNavigateTo = (type: MapTag['type']) => {
    window.dispatchEvent(new CustomEvent('voiceNavigateToType', { detail: { type } }));
  };

  const handleVoiceClearFilters = () => {
    window.dispatchEvent(new CustomEvent('voiceClearFilters'));
    toast({
      title: "Filters Cleared",
      description: "Showing all tags",
    });
  };

  const handleVoiceShowHelp = () => {
    toast({
      title: "Voice Commands Help",
      description: "Check the voice panel for available commands",
    });
  };

  /**
   * Handle tag selection from map
   * Listen for custom event from TaggingMap
   */
  useEffect(() => {
    const handleTagSelected = (e: any) => {
      const tag = e.detail.tag;
      setSelectedTag(tag);
      console.log('📍 Tag selected:', tag);
    };

    window.addEventListener('tagSelected', handleTagSelected);
    return () => {
      window.removeEventListener('tagSelected', handleTagSelected);
    };
  }, []);

  /**
   * Handle voice-triggered navigation
   * Listen for navigation event from voice commands
   */
  useEffect(() => {
    const handleVoiceNavigate = (e: any) => {
      const tag = e.detail.tag;
      if (tag) {
        startNavigation(tag);
        navigate('/navigation-screen');
      }
    };

    window.addEventListener('voiceStartNavigation', handleVoiceNavigate);
    return () => {
      window.removeEventListener('voiceStartNavigation', handleVoiceNavigate);
    };
  }, [startNavigation, navigate]);

  /**
   * Start navigation to selected tag
   */
  const handleNavigateToTag = () => {
    if (selectedTag) {
      startNavigation(selectedTag);
      toast({
        title: "Navigation Started",
        description: `Navigating to ${selectedTag.type.replace('_', ' ')}`,
      });
      navigate('/navigation-screen');
    }
  };

  return (
    <MobileLayout title="Accessibility Tagging">
      <div className="relative w-full h-full" style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Voice Command Panel */}
        {showVoicePanel && (
          <div className="absolute top-4 left-4 right-4 z-[1000] max-w-lg">
            <div className="bg-white rounded-lg shadow-lg">
              <VoiceCommandsContainer
                tags={[]}
                onAddTag={handleVoiceAddTag}
                onFilterTags={handleVoiceFilterTags}
                onNavigateTo={handleVoiceNavigateTo}
                onClearFilters={handleVoiceClearFilters}
                onShowHelp={handleVoiceShowHelp}
              />
            </div>
          </div>
        )}

        {/* Map (react-leaflet) */}
        <div style={{ flex: 1, width: '100%', minHeight: 0, position: 'relative' }}>
          <TaggingMap />
        </div>

        {/* Voice Command Button */}
        <div className="absolute bottom-24 left-0 right-0 flex justify-center px-6 z-[1001] gap-3">
          {/* Navigate Button - shown when tag is selected */}
          {selectedTag && (
            <Button
              onClick={handleNavigateToTag}
              className="flex items-center gap-2 px-6 py-3 transition-transform hover:scale-105 bg-green-600 hover:bg-green-700 text-white shadow-lg"
              aria-label={`Navigate to ${selectedTag.type.replace('_', ' ')}`}
            >
              <Navigation className="w-5 h-5" />
              <span>Navigate</span>
            </Button>
          )}

          {/* Voice Command Button */}
          <Button
            onClick={() => {
              console.log('Voice button clicked!', showVoicePanel);
              setShowVoicePanel(!showVoicePanel);
            }}
            variant={showVoicePanel ? "default" : "secondary"}
            className="flex items-center gap-2 px-6 py-3 transition-transform hover:scale-105 bg-blue-600 hover:bg-blue-700 text-white"
            aria-label="Toggle voice commands"
          >
            {showVoicePanel ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            <span>Voice</span>
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
};

export default Tagging;
