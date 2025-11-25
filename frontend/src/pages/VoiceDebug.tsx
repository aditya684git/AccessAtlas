import React from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

export function VoiceDebug() {
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
    finalTranscript,
    interimTranscript
  } = useSpeechRecognition();

  const [debugLog, setDebugLog] = React.useState<string[]>([]);
  
  console.log('Browser Support:', browserSupportsSpeechRecognition);
  console.log('Listening:', listening);
  console.log('Transcript:', transcript);
  console.log('Microphone Available:', isMicrophoneAvailable);
  console.log('Final Transcript:', finalTranscript);
  console.log('Interim Transcript:', interimTranscript);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLog(prev => [`[${timestamp}] ${msg}`, ...prev.slice(0, 9)]);
    console.log(msg);
  };

  // Log when transcript changes
  React.useEffect(() => {
    if (transcript) {
      addLog(`📝 Transcript updated: "${transcript}"`);
    }
  }, [transcript]);

  React.useEffect(() => {
    if (listening) {
      addLog('🎤 Started listening');
    } else {
      addLog('⏸️ Stopped listening');
    }
  }, [listening]);

  if (!browserSupportsSpeechRecognition) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
          <h1 className="text-2xl font-bold text-red-800 mb-4">
            ❌ Speech Recognition Not Supported
          </h1>
          <div className="space-y-3 text-red-700">
            <p><strong>Browser:</strong> {navigator.userAgent}</p>
            <p><strong>HTTPS:</strong> {window.location.protocol === 'https:' ? '✅ Yes' : '❌ No (required for some browsers)'}</p>
            <p><strong>SpeechRecognition in window:</strong> {'SpeechRecognition' in window ? '✅ Yes' : '❌ No'}</p>
            <p><strong>webkitSpeechRecognition in window:</strong> {'webkitSpeechRecognition' in window ? '✅ Yes' : '❌ No'}</p>
            
            <div className="mt-4 p-4 bg-white rounded">
              <p className="font-semibold mb-2">Recommended Browsers:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Google Chrome (Desktop)</li>
                <li>Microsoft Edge (Desktop)</li>
                <li>Safari (macOS/iOS)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const startListening = async () => {
    addLog('🎤 Button clicked - requesting microphone...');
    try {
      await SpeechRecognition.startListening({ 
        continuous: true, 
        language: 'en-US' 
      });
      addLog('✅ Listening started successfully!');
      addLog('💬 Try saying "Hello world" or "Testing one two three"');
    } catch (err: any) {
      addLog(`❌ Error: ${err.message}`);
      console.error('Start error:', err);
    }
  };

  const stopListening = () => {
    addLog('⏹️ Stopping...');
    SpeechRecognition.stopListening();
    addLog('⏸️ Stopped');
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
        <h1 className="text-2xl font-bold text-green-800 mb-4">
          ✅ Speech Recognition Supported!
        </h1>
        <div className="space-y-2 text-green-700">
          <p><strong>Browser:</strong> {navigator.userAgent.split(' ').slice(-2).join(' ')}</p>
          <p><strong>Status:</strong> {listening ? '🎤 Listening...' : '⏸️ Stopped'}</p>
          <p><strong>Microphone:</strong> {isMicrophoneAvailable ? '✅ Available' : '⚠️ Unknown'}</p>
          <p><strong>Transcript length:</strong> {transcript.length} characters</p>
        </div>
      </div>

      {/* Debug Log */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-3">Debug Log</h2>
        <div className="bg-gray-900 text-green-400 rounded p-4 h-48 overflow-y-auto font-mono text-sm">
          {debugLog.length === 0 ? (
            <span className="text-gray-500">No events yet...</span>
          ) : (
            debugLog.map((log, idx) => (
              <div key={idx}>{log}</div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-xl font-semibold">Controls</h2>
        
        <div className="flex gap-3">
          <button
            onClick={startListening}
            disabled={listening}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold"
          >
            {listening ? '🎤 Listening...' : '▶️ Start Voice Commands'}
          </button>
          
          <button
            onClick={stopListening}
            disabled={!listening}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold"
          >
            ⏹️ Stop
          </button>
          
          <button
            onClick={resetTranscript}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold"
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-3">Transcript</h2>
        <div className="space-y-2 mb-3 text-sm text-gray-600">
          <p><strong>Full:</strong> {transcript.length > 0 ? `"${transcript}"` : '(empty)'}</p>
          <p><strong>Final:</strong> {finalTranscript || '(none)'}</p>
          <p><strong>Interim:</strong> {interimTranscript || '(none)'}</p>
        </div>
        <div className="bg-gray-50 rounded p-4 min-h-[100px] font-mono text-lg">
          {transcript || <span className="text-gray-400">Speak something...</span>}
        </div>
      </div>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <div className="space-y-2">
          <p className="text-yellow-800">
            <strong>🔍 Troubleshooting:</strong>
          </p>
          <ul className="text-yellow-700 text-sm space-y-1 ml-4">
            <li>• Make sure your microphone is enabled in browser settings</li>
            <li>• Check Windows Sound settings → Input → Select correct microphone</li>
            <li>• Try speaking louder and more clearly</li>
            <li>• Open browser console (F12) to check for errors</li>
            <li>• Check site permissions: Click padlock icon in address bar → Microphone → Allow</li>
          </ul>
        </div>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
        <p className="text-blue-800">
          <strong>💡 Tip:</strong> Click "Start Voice Commands" and say something like "Hello testing" or "Testing one two three" clearly.
        </p>
      </div>
    </div>
  );
}
