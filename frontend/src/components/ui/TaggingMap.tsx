/**
 * TaggingMap - Using vanilla Leaflet (not react-leaflet)
 */

import React, { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import { v4 as uuidv4 } from 'uuid';
import type { Tag } from '../../types/tag';
import { LocalTagStorage, NoopTagStorage, type TagStorageService } from '../../lib/tagStorage';
import { reverseGeocode, fetchAccessibilityFeatures, mapOSMTagToType, type OverpassElement } from '../../lib/osmApi';
import { DuplicateWarningDialog } from './DuplicateWarningDialog';
import { validateTag } from '../../lib/tagValidation';
import { TagDebugPanel } from './TagDebugPanel';
import { getSourceColor } from '../../lib/tagDebugger';
import '../../lib/testDataGenerator'; // Adds window.addTestTags() and window.clearTestTags()

const DEFAULT_CENTER: [number, number] = [34.67, -82.48];
const DEFAULT_ZOOM = 15;

// Tag type to emoji icon mapping
const TAG_ICONS: Record<string, string> = {
  'Ramp': '♿',
  'Elevator': '🛗',
  'Tactile Path': '🦯',
  'Entrance': '🚪',
  'Obstacle': '🚧',
};

// Create custom divIcon for tag type with source indicator
const getTagIcon = (type: string, source: 'user' | 'osm' | 'model', confidence?: number): L.DivIcon => {
  const emoji = TAG_ICONS[type] || '📍';
  const sourceColor = getSourceColor(source);
  const border = `3px solid ${sourceColor}`;
  const confidenceBadge = confidence !== undefined 
    ? `<div style="position: absolute; bottom: -8px; right: -8px; background: ${sourceColor}; color: white; font-size: 10px; padding: 2px 4px; border-radius: 4px; font-weight: bold;">${Math.round(confidence * 100)}%</div>`
    : '';
  
  return L.divIcon({
    html: `<div style="font-size: 24px; line-height: 1; position: relative; padding: 4px; border-radius: 50%; border: ${border}; background: white;">${emoji}${confidenceBadge}</div>`,
    className: 'tag-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

const TaggingMap: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedType, setSelectedType] = useState<string>('Ramp');
  const selectedTypeRef = useRef<string>(selectedType);
  const storageRef = useRef<TagStorageService | null>(null);
  const [storageAvailable, setStorageAvailable] = useState<boolean>(true);
  const [visibleTypes, setVisibleTypes] = useState<string[]>(['Ramp', 'Elevator', 'Tactile Path', 'Entrance', 'Obstacle']);
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [osmFeatures, setOsmFeatures] = useState<Tag[]>([]);
  const [showOSMFeatures, setShowOSMFeatures] = useState<boolean>(true);
  const markers = useRef<L.Marker[]>([]);
  
  // Source filtering state
  const [showUserTags, setShowUserTags] = useState(true);
  const [showOSMTags, setShowOSMTags] = useState(true);
  const [showModelTags, setShowModelTags] = useState(true);
  const [minConfidence, setMinConfidence] = useState(0.5);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  
  // Duplicate warning dialog state
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [pendingTag, setPendingTag] = useState<Tag | null>(null);
  const [duplicateTags, setDuplicateTags] = useState<Tag[]>([]);


  useEffect(() => {
    // Inject Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    // Initialize map
    if (mapContainer.current && !map.current) {
      try {
        map.current = L.map(mapContainer.current).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(map.current!);

        // Handle map clicks (use ref to read latest selected type)
        map.current.on('click', async (e: L.LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          
          // Try to fetch address
          let address: string | undefined;
          try {
            const addressData = await reverseGeocode(lat, lng);
            address = addressData?.display_name;
          } catch (err) {
            console.warn('Failed to fetch address:', err);
          }

          const tag: Tag = {
            id: uuidv4(),
            type: selectedTypeRef.current,
            lat,
            lon: lng,
            timestamp: new Date().toISOString(),
            source: 'user',
            address,
          };
          
          // Validate before adding
          const allTags = [...tags, ...osmFeatures];
          const validation = validateTag(tag, allTags, {
            allowedTypes: ['Ramp', 'Elevator', 'Tactile Path', 'Entrance', 'Obstacle'],
            spatialThreshold: 2,
            checkDuplicates: true,
          });
          
          // Show warning if duplicates found
          if (validation.duplicates && validation.duplicates.length > 0) {
            setPendingTag(tag);
            setDuplicateTags(validation.duplicates);
            setShowDuplicateWarning(true);
            return;
          }
          
          setTags((prev) => [...prev, tag]);
        });

        console.log('Map initialized successfully');
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    }

    // Voice command event listeners
    const handleVoiceAddTag = async (e: any) => {
      if (!map.current) return;
      const type = e.detail.type;
      const center = map.current.getCenter();
      
      // Fetch address
      let address: string | undefined;
      try {
        const addressData = await reverseGeocode(center.lat, center.lng);
        address = addressData?.display_name;
      } catch (err) {
        console.warn('Failed to fetch address:', err);
      }

      const tag: Tag = {
        id: uuidv4(),
        type,
        lat: center.lat,
        lon: center.lng,
        timestamp: new Date().toISOString(),
        source: 'user',
        address,
      };
      
      setTags((prev) => [...prev, tag]);
      console.log('✅ Voice command: Added', type, 'at map center');
    };

    const handleVoiceFilterTags = (e: any) => {
      const source = e.detail.source;
      if (source === 'all') {
        setShowUserTags(true);
        setShowOSMTags(true);
        setShowModelTags(true);
      } else if (source === 'user') {
        setShowUserTags(true);
        setShowOSMTags(false);
        setShowModelTags(false);
      } else if (source === 'osm') {
        setShowUserTags(false);
        setShowOSMTags(true);
        setShowModelTags(false);
      } else if (source === 'model') {
        setShowUserTags(false);
        setShowOSMTags(false);
        setShowModelTags(true);
      }
      console.log('✅ Voice command: Filtered to', source, 'tags');
    };

    const handleVoiceNavigateTo = (e: any) => {
      if (!map.current) return;
      const type = e.detail.type;
      const allTags = [...tags, ...osmFeatures].filter(t => 
        (t.source === 'user' && showUserTags) ||
        (t.source === 'osm' && showOSMTags) ||
        (t.source === 'model' && showModelTags)
      );
      const matchingTags = allTags.filter(t => t.type === type);
      
      if (matchingTags.length > 0) {
        const nearest = matchingTags[0];
        // Emit navigation event with the tag
        window.dispatchEvent(new CustomEvent('voiceStartNavigation', { detail: { tag: nearest } }));
        console.log('✅ Voice command: Starting navigation to', type);
      } else {
        console.log('❌ Voice command: No', type, 'found');
        // Speak fallback message
        const fallback = `No ${type.replace('_', ' ')} found nearby`;
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(fallback);
          window.speechSynthesis.speak(utterance);
        }
      }
    };

    const handleVoiceNavigateToType = (e: any) => {
      // Handle old event name for compatibility
      handleVoiceNavigateTo(e);
    };

    const handleVoiceClearFilters = () => {
      setShowUserTags(true);
      setShowOSMTags(true);
      setShowModelTags(true);
      console.log('✅ Voice command: Cleared filters');
    };

    window.addEventListener('voiceAddTag', handleVoiceAddTag);
    window.addEventListener('voiceFilterTags', handleVoiceFilterTags);
    window.addEventListener('voiceNavigateTo', handleVoiceNavigateTo);
    window.addEventListener('voiceNavigateToType', handleVoiceNavigateToType);
    window.addEventListener('voiceClearFilters', handleVoiceClearFilters);

    return () => {
      window.removeEventListener('voiceAddTag', handleVoiceAddTag);
      window.removeEventListener('voiceFilterTags', handleVoiceFilterTags);
      window.removeEventListener('voiceNavigateTo', handleVoiceNavigateTo);
      window.removeEventListener('voiceNavigateToType', handleVoiceNavigateToType);
      window.removeEventListener('voiceClearFilters', handleVoiceClearFilters);
      
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Initialize storage and load tags via storage service
  useEffect(() => {
    // prefer LocalTagStorage, fall back to NoopTagStorage
    try {
      storageRef.current = new LocalTagStorage();
      setStorageAvailable(true);
    } catch (err) {
      console.warn('Could not initialize LocalTagStorage, falling back to noop:', err);
      storageRef.current = new NoopTagStorage();
      setStorageAvailable(false);
    }

    (async () => {
      try {
        const existing = await (storageRef.current?.getTags() ?? Promise.resolve([]));
        console.log('📦 Loaded', existing.length, 'tags from storage');
        
        // Log breakdown by source
        const bySource = {
          user: existing.filter(t => t.source === 'user').length,
          osm: existing.filter(t => t.source === 'osm').length,
          model: existing.filter(t => t.source === 'model').length,
        };
        console.log('📊 Tag breakdown - User:', bySource.user, 'OSM:', bySource.osm, 'Model:', bySource.model);
        
        // If no tags under new key, try migrating from old key used previously
        if ((!existing || existing.length === 0) && typeof window !== 'undefined') {
          const old = localStorage.getItem('tagging-map-tags');
          if (old) {
            try {
              const parsed: Tag[] = JSON.parse(old);
              if (parsed && parsed.length > 0) {
                console.log('🔄 Migrating', parsed.length, 'tags from old storage');
                setTags(parsed);
                // save into new storage
                for (const t of parsed) {
                  try {
                    await storageRef.current?.saveTag(t, { skipValidation: true });
                  } catch (e) {
                    // ignore per-item save errors
                  }
                }
                // optionally remove old key
                try {
                  localStorage.removeItem('tagging-map-tags');
                } catch {}
                return;
              }
            } catch (e) {
              // ignore parsing error and continue
            }
          }
        }

        setTags(existing);
      } catch (err) {
        console.warn('Failed to load tags from storage service:', err);
      }
    })();
  }, []);

  // When tags change, persist the last-added tag via storage service
  useEffect(() => {
    if (!storageRef.current) return;
    // If tags array grew, save the last item
    if (tags.length === 0) return;
    const last = tags[tags.length - 1];
    (async () => {
      try {
        const result = await storageRef.current?.saveTag(last, { skipValidation: true });
        if (result && !result.success) {
          console.warn('Failed to save tag:', result.validation.errors);
        }
      } catch (err) {
        console.warn('Failed to persist tag via storage service:', err);
      }
    })();
  }, [tags]);

  // Update markers when tags or visibility filters change
  useEffect(() => {
    if (!map.current) return;

    // Remove old markers
    markers.current.forEach((marker) => map.current?.removeLayer(marker));
    markers.current = [];

    // Combine user tags and OSM features
    const allTags = [...tags, ...(showOSMFeatures ? osmFeatures : [])];
    
    console.log('🗺️ Rendering markers:');
    console.log('  - User tags:', tags.length);
    console.log('  - OSM features:', osmFeatures.length, '(showOSMFeatures:', showOSMFeatures + ')');
    console.log('  - Total to process:', allTags.length);

    // Add new markers (filtered by visibility and source)
    const filtered = allTags.filter((tag) => {
        // Type filter
        if (!visibleTypes.includes(tag.type)) return false;
        
        // Source filter
        if (tag.source === 'user' && !showUserTags) return false;
        if (tag.source === 'osm' && !showOSMTags) return false;
        if (tag.source === 'model' && !showModelTags) return false;
        
        // Confidence filter (only for model tags)
        if (tag.source === 'model' && tag.confidence !== undefined && tag.confidence < minConfidence) {
          return false;
        }
        
        return true;
      });
    
    console.log('  - After filters:', filtered.length);
    console.log('    * User:', filtered.filter(t => t.source === 'user').length);
    console.log('    * OSM:', filtered.filter(t => t.source === 'osm').length);
    console.log('    * Model:', filtered.filter(t => t.source === 'model').length);
    
    filtered.forEach((tag) => {
        const icon = getTagIcon(tag.type, tag.source, tag.confidence);
        const isReadonly = tag.readonly === true;
        
        // Log for debugging
        if (tag.address) {
          console.log(`✅ Tag ${tag.id.substring(0, 8)} HAS address:`, tag.address.substring(0, 50));
        } else {
          console.log(`❌ Tag ${tag.id.substring(0, 8)} NO address (old tag or offline)`);
        }

        let popupContent = `
          <div style="font-size: 13px; min-width: 200px; max-width: 280px;">
            <div style="margin-bottom: 8px;">
              <strong style="font-size: 14px;">${tag.type}</strong>
              ${isReadonly ? '<span style="background: #10b981; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 6px;">OSM</span>' : ''}
              ${!tag.address && !isReadonly ? '<span style="background: #f59e0b; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 6px;">OLD TAG</span>' : ''}<br/>
              <span style="color: #666; font-size: 11px;">${tag.lat.toFixed(6)}, ${tag.lon.toFixed(6)}</span>
              ${tag.address ? `<div style="margin-top: 6px; padding: 6px; background: #f3f4f6; border-radius: 4px; border-left: 3px solid #2563eb;"><span style="color: #374151; font-size: 12px; line-height: 1.4;">${tag.address}</span></div>` : `<div style="margin-top: 6px; padding: 4px; background: #fef3c7; border-radius: 4px; border-left: 3px solid #f59e0b;"><span style="color: #92400e; font-size: 11px;">Created when offline</span></div>`}
              <div style="margin-top: 6px;"><small style="color: #999; font-size: 11px;">${new Date(tag.timestamp).toLocaleString()}</small></div>
            </div>`;

        if (!isReadonly) {
          popupContent += `
            <div style="display: flex; gap: 6px; margin-top: 8px;">
              <select 
                id="edit-type-${tag.id}" 
                style="flex: 1; padding: 4px; font-size: 11px; border: 1px solid #d1d5db; border-radius: 4px;"
              >
                ${Object.keys(TAG_ICONS).map(type => 
                  `<option value="${type}" ${type === tag.type ? 'selected' : ''}>${TAG_ICONS[type]} ${type}</option>`
                ).join('')}
              </select>
              <button 
                onclick="window.updateTag('${tag.id}')" 
                style="padding: 4px 8px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold;"
              >
                Update
              </button>
            </div>
            <button 
              onclick="window.deleteTag('${tag.id}')" 
              style="width: 100%; margin-top: 6px; padding: 4px 8px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold;"
            >
              Delete
            </button>`;
        }
        
        popupContent += '</div>';
        
        const marker = L.marker([tag.lat, tag.lon], { icon })
          .bindPopup(popupContent)
          .addTo(map.current!);

        // Handle marker click - emit tag selection event
        marker.on('click', () => {
          console.log('🎯 Marker clicked:', tag.type, tag.id);
          window.dispatchEvent(new CustomEvent('tagSelected', { detail: { tag } }));
        });

        markers.current.push(marker);
      });
    
    // Attach global handlers for popup buttons
    (window as any).deleteTag = deleteTag;
    (window as any).updateTag = (id: string) => {
      const select = document.getElementById(`edit-type-${id}`) as HTMLSelectElement;
      if (select) {
        updateTagType(id, select.value);
      }
    };
  }, [tags, osmFeatures, visibleTypes, showOSMFeatures, showUserTags, showOSMTags, showModelTags, minConfidence]);

  // Add a tag at the current map center
  const addTagAtCenter = async () => {
    if (!map.current) return;
    const center = map.current.getCenter();
    
    // Try to fetch address
    let address: string | undefined;
    try {
      const addressData = await reverseGeocode(center.lat, center.lng);
      address = addressData?.display_name;
    } catch (err) {
      console.warn('Failed to fetch address:', err);
    }
    
    const tag: Tag = {
      id: uuidv4(),
      type: selectedType,
      lat: center.lat,
      lon: center.lng,
      timestamp: new Date().toISOString(),
      source: 'user',
      address,
    };
    
    // Validate tag before adding
    const allTags = [...tags, ...osmFeatures];
    const validation = validateTag(tag, allTags, {
      allowedTypes: ['Ramp', 'Elevator', 'Tactile Path', 'Entrance', 'Obstacle'],
      spatialThreshold: 2,
      checkDuplicates: true,
    });
    
    // Show warning if duplicates found
    if (validation.duplicates && validation.duplicates.length > 0) {
      setPendingTag(tag);
      setDuplicateTags(validation.duplicates);
      setShowDuplicateWarning(true);
      return;
    }
    
    // Otherwise add immediately
    setTags((prev) => [...prev, tag]);
  };

  // Handle duplicate warning confirmation
  const handleDuplicateConfirm = () => {
    if (pendingTag) {
      setTags((prev) => [...prev, pendingTag]);
    }
    setShowDuplicateWarning(false);
    setPendingTag(null);
    setDuplicateTags([]);
  };

  const handleDuplicateCancel = () => {
    setShowDuplicateWarning(false);
    setPendingTag(null);
    setDuplicateTags([]);
  };

  // Delete a tag by id
  const deleteTag = async (id: string) => {
    try {
      await storageRef.current?.deleteTag?.(id);
      setTags((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.warn('Failed to delete tag:', err);
    }
  };

  // Update a tag's type
  const updateTagType = async (id: string, newType: string) => {
    try {
      await storageRef.current?.updateTag?.(id, { type: newType });
      setTags((prev) =>
        prev.map((t) => (t.id === id ? { ...t, type: newType } : t))
      );
    } catch (err) {
      console.warn('Failed to update tag:', err);
    }
  };

  // keep selectedTypeRef in sync with state so handlers read latest value
  useEffect(() => {
    selectedTypeRef.current = selectedType;
  }, [selectedType]);

  // Fetch OSM accessibility features when map moves
  useEffect(() => {
    if (!map.current || !showOSMFeatures) return;

    const fetchFeatures = async () => {
      const center = map.current!.getCenter();
      console.log('🗺️ Fetching OSM features at:', center.lat, center.lng);
      try {
        const elements = await fetchAccessibilityFeatures(center.lat, center.lng, 500);
        console.log('🗺️ OSM API returned', elements.length, 'elements');
        
        const osmTags: Tag[] = elements
          .map((el): Tag | null => {
            const type = mapOSMTagToType(el.tags);
            if (!type) {
              console.log('⚠️ Skipping OSM element (no matching type):', el.tags);
              return null;
            }
            return {
              id: `osm-${el.id}`,
              type,
              lat: el.lat,
              lon: el.lon,
              timestamp: new Date().toISOString(),
              source: 'osm',
              osmId: el.id,
              readonly: true,
              address: el.tags.name || el.tags['addr:street'],
            } as Tag;
          })
          .filter((t): t is Tag => t !== null);
        
        console.log('🗺️ Created', osmTags.length, 'OSM tags');
        if (osmTags.length > 0) {
          console.log('🗺️ Sample OSM tag:', osmTags[0]);
        }
        setOsmFeatures(osmTags);
      } catch (err) {
        console.error('❌ Failed to fetch OSM features:', err);
      }
    };

    // Fetch on mount
    fetchFeatures();

    // Fetch when map stops moving
    const handleMoveEnd = () => {
      fetchFeatures();
    };

    map.current.on('moveend', handleMoveEnd);

    return () => {
      map.current?.off('moveend', handleMoveEnd);
    };
  }, [showOSMFeatures]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100vh',
        position: 'relative',
      }}
      role="region"
      aria-label="Tagging map"
    >
      {/* Map */}
      <div
        ref={mapContainer}
        style={{
          flex: 1,
          width: '100%',
          minHeight: 0,
          position: 'relative',
          backgroundColor: '#e8e8e8',
        }}
      />

      {/* Toggle Menu Button */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 10001,
          backgroundColor: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          padding: '10px 14px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 'bold',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
        aria-label="Toggle menu"
      >
        <span style={{ fontSize: '18px' }}>☰</span>
        {showMenu ? 'Close' : 'Menu'}
      </button>

      {/* Debug Toggle Button */}
      <button
        onClick={() => setShowDebugPanel(!showDebugPanel)}
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 10001,
          backgroundColor: showDebugPanel ? '#ef4444' : '#8b5cf6',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          padding: '10px 14px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 'bold',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
        aria-label="Toggle debug panel"
      >
        <span style={{ fontSize: '18px' }}>🐛</span>
        {showDebugPanel ? 'Close' : 'Debug'}
      </button>

      {/* Filter & Add Tag Panel (collapsible) */}
      {showMenu && (
        <div
          style={{
            position: 'absolute',
            top: 60,
            left: 12,
            zIndex: 10000,
            backgroundColor: 'white',
            padding: '12px',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            maxWidth: '220px',
            maxHeight: 'calc(100vh - 80px)',
            overflowY: 'auto',
          }}
        >
          <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '8px', color: '#000' }}>
            Show Types:
          </label>
          {Object.keys(TAG_ICONS).map((type) => (
            <label
              key={type}
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                color: '#000',
              }}
            >
              <input
                type="checkbox"
                checked={visibleTypes.includes(type)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setVisibleTypes((prev) => [...prev, type]);
                  } else {
                    setVisibleTypes((prev) => prev.filter((t) => t !== type));
                  }
                }}
                style={{ marginRight: '6px' }}
              />
              <span style={{ fontSize: '16px', marginRight: '4px' }}>{TAG_ICONS[type]}</span>
              {type}
            </label>
          ))}

          {/* OSM Features Toggle */}
          <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '10px', paddingTop: '10px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                fontSize: '12px',
                color: '#000',
                fontWeight: 'bold',
              }}
            >
              <input
                type="checkbox"
                checked={showOSMFeatures}
                onChange={(e) => setShowOSMFeatures(e.target.checked)}
                style={{ marginRight: '6px' }}
              />
              Show OSM Features
            </label>
            <span style={{ fontSize: '10px', color: '#999', marginLeft: '22px', display: 'block' }}>
              Real-world accessibility data
            </span>
          </div>

          <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '12px', paddingTop: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '6px', color: '#000' }}>
              Add Tag Type:
            </label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            style={{
              width: '100%',
              padding: '6px',
              fontSize: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              color: '#000',
              backgroundColor: '#fff',
            }}
            aria-label="Select tag type"
          >
            {Object.keys(TAG_ICONS).map((type) => (
              <option key={type} value={type} style={{ color: '#000' }}>
                {TAG_ICONS[type]} {type}
              </option>
            ))}
          </select>

          {/* Add Tag Button */}
          <button
            onClick={addTagAtCenter}
            style={{
              marginTop: '10px',
              width: '100%',
              padding: '8px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
            }}
            aria-label={`Add ${selectedType} tag at center`}
          >
            {TAG_ICONS[selectedType]} Add {selectedType}
          </button>
        </div>
      </div>
      )}

      {/* Clear Tags Button */}
      <button
        onClick={async () => {
          try {
            await storageRef.current?.clearTags?.();
          } catch (err) {
            console.warn('Failed to clear tags from storage:', err);
          }
          setTags([]);
        }}
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 1000,
          padding: '8px 14px',
          backgroundColor: '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 'bold',
          boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
        }}
      >
        Clear Tags
      </button>

      {/* Tag Count */}
      {tags.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 90,
            right: 12,
            zIndex: 1000,
            backgroundColor: '#2563eb',
            color: 'white',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          {tags.length}
        </div>
      )}
      
      {/* Duplicate Warning Dialog */}
      <DuplicateWarningDialog
        open={showDuplicateWarning}
        onOpenChange={setShowDuplicateWarning}
        duplicates={duplicateTags}
        onConfirm={handleDuplicateConfirm}
        onCancel={handleDuplicateCancel}
        tagType={pendingTag?.type || 'Tag'}
      />

      {/* Debug Panel */}
      {showDebugPanel && (
        <TagDebugPanel
          allTags={[...tags, ...osmFeatures]}
          visibleTags={[...tags, ...(showOSMFeatures ? osmFeatures : [])].filter((tag) => {
            if (!visibleTypes.includes(tag.type)) return false;
            if (tag.source === 'user' && !showUserTags) return false;
            if (tag.source === 'osm' && !showOSMTags) return false;
            if (tag.source === 'model' && !showModelTags) return false;
            if (tag.source === 'model' && tag.confidence !== undefined && tag.confidence < minConfidence) return false;
            return true;
          })}
          filters={{
            minConfidence,
            allowedSources: [
              ...(showUserTags ? ['user' as const] : []),
              ...(showOSMTags ? ['osm' as const] : []),
              ...(showModelTags ? ['model' as const] : []),
            ],
            allowedTypes: visibleTypes,
          }}
          onFilterChange={(filters) => {
            setShowUserTags(filters.showUser);
            setShowOSMTags(filters.showOSM);
            setShowModelTags(filters.showModel);
            setMinConfidence(filters.minConfidence);
          }}
        />
      )}
    </div>
  );
};

export default TaggingMap;
