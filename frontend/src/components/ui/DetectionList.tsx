import type { Detection } from '../../lib/api';

interface DetectionListProps {
  detections: Detection[];
  isLoading: boolean;
  timestamp?: string;
}

export const DetectionList: React.FC<DetectionListProps> = ({
  detections,
  isLoading,
  timestamp,
}) => {
  if (isLoading) {
    return null;
  }

  if (!detections || detections.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 space-y-3">
      <h3 className="text-lg font-semibold text-gray-800">Detected Objects</h3>
      <div className="space-y-2">
        {detections.map((detection, index) => (
          <div
            key={index}
            className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium text-gray-800">{detection.label}</p>
                <p className="text-sm text-gray-600 mt-1">
                  Position: <span className="font-semibold">{detection.position}</span>
                </p>
              </div>
              <div className="ml-4 px-3 py-1 bg-blue-500 text-white rounded-full text-sm font-semibold">
                {(detection.confidence * 100).toFixed(1)}%
              </div>
            </div>
            {detection.timestamp && (
              <p className="text-xs text-gray-500 mt-2">{detection.timestamp}</p>
            )}
          </div>
        ))}
      </div>
      {timestamp && (
        <p className="text-xs text-gray-400 mt-3">Detected at: {timestamp}</p>
      )}
    </div>
  );
};
