import { useState, useRef, useEffect } from "react";

interface DraggableTagProps {
  id: string;
  label: string;
  initialX: number;
  initialY: number;
  onPositionChange: (id: string, x: number, y: number) => void;
}

/**
 * Draggable tag component for accessibility tagging
 * Allows users to reposition tags freely across the map
 */
const DraggableTag = ({ id, label, initialX, initialY, onPositionChange }: DraggableTagProps) => {
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const tagRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !containerRef.current) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newX = ((clientX - dragStart.x) / containerRect.width) * 100;
      const newY = ((clientY - dragStart.y) / containerRect.height) * 100;

      const clampedX = Math.max(5, Math.min(95, newX));
      const clampedY = Math.max(5, Math.min(95, newY));

      setPosition({ x: clampedX, y: clampedY });
      onPositionChange(id, clampedX, clampedY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove);
      window.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, dragStart, id, onPositionChange]);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    if (tagRef.current) {
      const rect = tagRef.current.getBoundingClientRect();
      setDragStart({
        x: clientX - rect.left,
        y: clientY - rect.top,
      });
    }

    // Store reference to container
    if (!containerRef.current && tagRef.current) {
      containerRef.current = tagRef.current.closest('.map-container') as HTMLDivElement;
    }
  };

  return (
    <div
      ref={tagRef}
      className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${
        isDragging ? 'cursor-grabbing z-50' : 'cursor-grab z-10'
      }`}
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
      role="button"
      tabIndex={0}
      aria-label={`Draggable accessibility tag: ${label}. Position: ${Math.round(position.x)}%, ${Math.round(position.y)}%`}
      aria-grabbed={isDragging}
    >
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 bg-primary rounded-full flex items-center justify-center mb-1 transition-transform ${
          isDragging ? 'scale-110' : 'scale-100'
        }`}>
          <span className="text-xs font-bold" aria-hidden="true">
            {label.charAt(0)}
          </span>
        </div>
        <div className="px-2 py-1 bg-secondary/90 rounded text-xs whitespace-nowrap">
          {label}
        </div>
      </div>
    </div>
  );
};

export default DraggableTag;
