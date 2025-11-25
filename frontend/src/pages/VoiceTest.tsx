import React, { useState, useCallback } from 'react';
import { VoiceCommandsContainer } from '../components/VoiceCommandsContainer';
import { Tag } from '../types/tag';

export function VoiceTest() {
  // Sample test data - mix of different tag types
  const [tags, setTags] = useState<Tag[]>([
    {
      id: 'test-1',
      type: 'ramp',
      lat: 34.6834,
      lon: -82.8374,
      source: 'model',
      confidence: 0.85,
      timestamp: new Date().toISOString(),
      address: '123 Main St, Clemson, SC'
    },
    {
      id: 'test-2',
      type: 'elevator',
      lat: 34.6840,
      lon: -82.8380,
      source: 'osm',
      timestamp: new Date().toISOString(),
      address: '456 College Ave, Clemson, SC'
    },
    {
      id: 'test-3',
      type: 'entrance',
      lat: 34.6850,
      lon: -82.8390,
      source: 'user',
      timestamp: new Date().toISOString(),
      address: '789 University Blvd, Clemson, SC'
    }
  ]);

  const [filteredTags, setFilteredTags] = useState<Tag[]>(tags);
  const [activeFilters, setActiveFilters] = useState<any>({});
  const [actionLog, setActionLog] = useState<string[]>([]);

  const logAction = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setActionLog(prev => [`[${timestamp}] ${message}`, ...prev]);
  };

  const handleAddTag = useCallback((type: Tag['type']) => {
    const newTag: Tag = {
      id: `user-${Date.now()}`,
      type,
      lat: 34.6834 + (Math.random() - 0.5) * 0.01,
      lon: -82.8374 + (Math.random() - 0.5) * 0.01,
      source: 'user',
      timestamp: new Date().toISOString(),
      address: 'Added via voice command'
    };
    setTags(prev => [...prev, newTag]);
    setFilteredTags(prev => [...prev, newTag]);
    logAction(`✅ Added ${type} tag`);
  }, []);

  const handleFilterTags = useCallback((source: 'model' | 'osm' | 'user' | 'all') => {
    if (source === 'all') {
      setFilteredTags(tags);
      setActiveFilters({});
      logAction(`🔍 Showing all ${tags.length} tags`);
    } else {
      const filtered = tags.filter(t => t.source === source);
      setFilteredTags(filtered);
      setActiveFilters({ source });
      logAction(`🔍 Filtered to ${filtered.length} ${source} tags`);
    }
  }, [tags]);

  const handleNavigateTo = useCallback((type: Tag['type']) => {
    const matches = filteredTags.filter(t => t.type === type);
    if (matches.length > 0) {
      logAction(`🧭 Navigate to ${type} at ${matches[0].address || 'location'}`);
    } else {
      logAction(`❌ No ${type} tags found`);
    }
  }, [filteredTags]);

  const handleClearFilters = useCallback(() => {
    setFilteredTags(tags);
    setActiveFilters({});
    logAction('🔄 Cleared all filters');
  }, [tags]);

  const handleShowHelp = useCallback(() => {
    logAction('ℹ️ Help dialog opened');
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🎤 Voice Command Test Page
          </h1>
          <p className="text-gray-600">
            Test the voice command system with sample data. Click "Start Voice Commands" and try speaking commands like:
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              "add ramp"
            </span>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
              "show model tags"
            </span>
            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
              "read tags"
            </span>
            <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
              "help"
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Voice Command Panel */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Voice Commands</h2>
            <VoiceCommandsContainer
              tags={filteredTags}
              onAddTag={handleAddTag}
              onFilterTags={handleFilterTags}
              onNavigateTo={handleNavigateTo}
              onClearFilters={handleClearFilters}
              onShowHelp={handleShowHelp}
              activeFilters={activeFilters}
            />
          </div>

          {/* Action Log */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Action Log</h2>
              <button
                onClick={() => setActionLog([])}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Clear
              </button>
            </div>
            <div className="bg-gray-50 rounded p-4 h-64 overflow-y-auto font-mono text-sm">
              {actionLog.length === 0 ? (
                <p className="text-gray-400">No actions yet. Try speaking a command!</p>
              ) : (
                actionLog.map((log, idx) => (
                  <div key={idx} className="mb-1 text-gray-700">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Tag Display */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            Current Tags ({filteredTags.length} of {tags.length})
          </h2>
          
          {activeFilters.source && (
            <div className="mb-4 flex items-center gap-2">
              <span className="text-sm text-gray-600">Active filter:</span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                {activeFilters.source}
              </span>
              <button
                onClick={handleClearFilters}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTags.map(tag => (
              <div
                key={tag.id}
                className={`p-4 rounded-lg border-2 ${
                  tag.source === 'model'
                    ? 'border-blue-300 bg-blue-50'
                    : tag.source === 'osm'
                    ? 'border-green-300 bg-green-50'
                    : 'border-purple-300 bg-purple-50'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-semibold text-lg capitalize">
                    {tag.type.replace('_', ' ')}
                  </span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      tag.source === 'model'
                        ? 'bg-blue-200 text-blue-800'
                        : tag.source === 'osm'
                        ? 'bg-green-200 text-green-800'
                        : 'bg-purple-200 text-purple-800'
                    }`}
                  >
                    {tag.source.toUpperCase()}
                  </span>
                </div>
                {tag.confidence && (
                  <div className="text-sm text-gray-600 mb-1">
                    Confidence: {(tag.confidence * 100).toFixed(0)}%
                  </div>
                )}
                {tag.address && (
                  <div className="text-sm text-gray-600">
                    📍 {tag.address}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Browser Requirements:</strong> Voice commands work best in Chrome or Edge. 
                Make sure to allow microphone access when prompted. If using localhost, some browsers 
                require HTTPS for speech recognition.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
