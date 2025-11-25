// src/types/api.ts

export interface DetectionResult {
  label: string;
  confidence: number;
  position: 'on the left' | 'in the center' | 'on the right';
  timestamp: string;
}

export interface DetectResponse {
  detections: DetectionResult[];
  spoken: string;
}

export interface DetectError {
  error: string;
  timestamp: string;
}

export interface VoiceRequest {
  text: string;
}

export interface VoiceResponse {
  status: 'speaking';
  text: string;
}