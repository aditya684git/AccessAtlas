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
import { Plus, Mic, MicOff, Navigation, Sparkles, Loader2 } from "lucide-react";
import { toast } from "../hooks/use-toast";
import { useNavigation } from "../contexts/NavigationContext";
import type { Tag as MapTag } from "../types/tag";
import { sendImage } from "../lib/api";
import { fetchAccessibilityFeatures } from "../lib/osmApi";

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
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTags, setGeneratedTags] = useState<{
    osmTags: MapTag[];
    modelTags: MapTag[];
  }>({ osmTags: [], modelTags: [] });

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

  /**
   * Generate tags from OSM and Model detection
   * Integrates with backend /detect endpoint and OSM API
   */
  const handleGenerateTags = async () => {
    setIsGenerating(true);
    const osmTagsResult: MapTag[] = [];
    const modelTagsResult: MapTag[] = [];

    try {
      // Get current map center for OSM query
      // Dispatch event to get map center from TaggingMap component
      const mapCenterPromise = new Promise<{ lat: number; lon: number }>((resolve) => {
        const handler = (e: any) => {
          resolve(e.detail);
          window.removeEventListener('mapCenterResponse', handler);
        };
        window.addEventListener('mapCenterResponse', handler);
        window.dispatchEvent(new CustomEvent('requestMapCenter'));
        
        // Fallback to default if no response in 1s
        setTimeout(() => {
          window.removeEventListener('mapCenterResponse', handler);
          resolve({ lat: 34.67, lon: -82.48 });
        }, 1000);
      });

      const mapCenter = await mapCenterPromise;

      // 1. Fetch OSM accessibility features
      toast({
        title: "Generating Tags",
        description: "Fetching OSM accessibility features...",
      });

      try {
        const osmElements = await fetchAccessibilityFeatures(mapCenter.lat, mapCenter.lon, 500);
        
        // Map OSM elements to tags
        const osmTags = osmElements
          .map((el): MapTag | null => {
            // Map OSM tags to our tag types
            let type: MapTag['type'] = 'Entrance';
            
            if (el.tags.wheelchair === 'yes' || el.tags.ramp === 'yes') {
              type = 'Ramp';
            } else if (el.tags.highway === 'steps' && el.tags.ramp === 'yes') {
              type = 'Ramp';
            } else if (el.tags.amenity === 'elevator' || el.tags.highway === 'elevator') {
              type = 'Elevator';
            } else if (el.tags.tactile_paving === 'yes') {
              type = 'Tactile Path';
            } else if (el.tags.entrance) {
              type = 'Entrance';
            } else if (el.tags.barrier || el.tags.obstacle) {
              type = 'Obstacle';
            }

            return {
              id: `osm-${el.id}-${Date.now()}`,
              type,
              lat: el.lat,
              lon: el.lon,
              timestamp: new Date().toISOString(),
              source: 'osm',
              osmId: el.id,
              readonly: true,
              address: el.tags.name || el.tags['addr:street'],
            };
          })
          .filter((t): t is MapTag => t !== null);

        osmTagsResult.push(...osmTags);
        
        toast({
          title: "OSM Tags Loaded",
          description: `Found ${osmTags.length} accessibility features`,
        });
      } catch (error) {
        console.error('OSM fetch error:', error);
        toast({
          title: "OSM Fetch Failed",
          description: "Could not load OSM features. Continuing with model detection.",
          variant: "destructive",
        });
      }

      // 2. If image is selected, call model detection endpoint
      if (selectedImage) {
        toast({
          title: "Generating Tags",
          description: "Running ML model detection...",
        });

        try {
          const detectResponse = await sendImage(selectedImage);
          
          // Convert detections to tags at map center with slight offsets
          const modelTags = detectResponse.detections.map((detection, index) => {
            // Offset tags slightly to avoid overlap
            const offsetLat = mapCenter.lat + (Math.random() - 0.5) * 0.001;
            const offsetLon = mapCenter.lon + (Math.random() - 0.5) * 0.001;
            
            // Map detection labels to tag types
            let type: MapTag['type'] = 'Obstacle';
            const label = detection.label.toLowerCase();
            
            if (label.includes('ramp') || label.includes('wheelchair')) {
              type = 'Ramp';
            } else if (label.includes('elevator') || label.includes('lift')) {
              type = 'Elevator';
            } else if (label.includes('door') || label.includes('entrance')) {
              type = 'Entrance';
            } else if (label.includes('path') || label.includes('tactile')) {
              type = 'Tactile Path';
            }

            return {
              id: `model-${Date.now()}-${index}`,
              type,
              lat: offsetLat,
              lon: offsetLon,
              timestamp: new Date().toISOString(),
              source: 'model' as const,
              confidence: detection.confidence,
              address: `Detected: ${detection.label} (${detection.position})`,
            };
          });

          modelTagsResult.push(...modelTags);
          
          toast({
            title: "Model Tags Generated",
            description: `Detected ${modelTags.length} objects with AI`,
          });
        } catch (error) {
          console.error('Model detection error:', error);
          toast({
            title: "Model Detection Failed",
            description: error instanceof Error ? error.message : "Could not run model detection",
            variant: "destructive",
          });
        }
      }

      // Update state with all generated tags
      setGeneratedTags({
        osmTags: osmTagsResult,
        modelTags: modelTagsResult,
      });

      // Dispatch event to add tags to map
      window.dispatchEvent(new CustomEvent('addGeneratedTags', {
        detail: {
          tags: [...osmTagsResult, ...modelTagsResult]
        }
      }));

      // Show success message
      const totalTags = osmTagsResult.length + modelTagsResult.length;
      toast({
        title: "Tags Generated Successfully!",
        description: `Added ${totalTags} tags (${osmTagsResult.length} OSM, ${modelTagsResult.length} Model)`,
      });

    } catch (error) {
      console.error('Generate tags error:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Could not generate tags",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Handle image file selection
   */
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }
      setSelectedImage(file);
      toast({
        title: "Image Selected",
        description: `${file.name} ready for detection`,
      });
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

        {/* Generate Tags Panel */}
        <div className="absolute top-4 right-4 z-[1000] max-w-sm">
          <div className="bg-white rounded-lg shadow-lg p-4 space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Generate Tags
            </h3>
            
            {/* Image Upload */}
            <div>
              <label 
                htmlFor="image-upload" 
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Select Image (Optional)
              </label>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {selectedImage && (
                <p className="text-xs text-gray-500 mt-1">
                  ✓ {selectedImage.name}
                </p>
              )}
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerateTags}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Tags</span>
                </>
              )}
            </Button>

            {/* Generated Tags Summary */}
            {(generatedTags.osmTags.length > 0 || generatedTags.modelTags.length > 0) && (
              <div className="border-t pt-3 space-y-2">
                <h4 className="font-medium text-sm text-gray-700">Generated Tags:</h4>
                
                {/* Local Tags (User-created) */}
                <div className="text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="font-medium">Local Tags:</span>
                    <span className="text-gray-600">{tags.length}</span>
                  </div>
                  {tags.length > 0 && (
                    <ul className="ml-5 space-y-1">
                      {tags.slice(0, 3).map((tag) => (
                        <li key={tag.id} className="text-gray-600">
                          • {tag.label}
                        </li>
                      ))}
                      {tags.length > 3 && (
                        <li className="text-gray-500 italic">
                          +{tags.length - 3} more
                        </li>
                      )}
                    </ul>
                  )}
                </div>

                {/* OSM Tags */}
                <div className="text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="font-medium">OSM Tags:</span>
                    <span className="text-gray-600">{generatedTags.osmTags.length}</span>
                  </div>
                  {generatedTags.osmTags.length > 0 && (
                    <ul className="ml-5 space-y-1">
                      {generatedTags.osmTags.slice(0, 3).map((tag) => (
                        <li key={tag.id} className="text-gray-600">
                          • {tag.type} {tag.address && `- ${tag.address.substring(0, 30)}...`}
                        </li>
                      ))}
                      {generatedTags.osmTags.length > 3 && (
                        <li className="text-gray-500 italic">
                          +{generatedTags.osmTags.length - 3} more
                        </li>
                      )}
                    </ul>
                  )}
                </div>

                {/* Model Tags */}
                <div className="text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span className="font-medium">Model Tags:</span>
                    <span className="text-gray-600">{generatedTags.modelTags.length}</span>
                  </div>
                  {generatedTags.modelTags.length > 0 && (
                    <ul className="ml-5 space-y-1">
                      {generatedTags.modelTags.slice(0, 3).map((tag) => (
                        <li key={tag.id} className="text-gray-600 flex items-center gap-1">
                          • {tag.type}
                          {tag.confidence && (
                            <span className="text-purple-600 font-medium">
                              ({Math.round(tag.confidence * 100)}%)
                            </span>
                          )}
                        </li>
                      ))}
                      {generatedTags.modelTags.length > 3 && (
                        <li className="text-gray-500 italic">
                          +{generatedTags.modelTags.length - 3} more
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
};

export default Tagging;
