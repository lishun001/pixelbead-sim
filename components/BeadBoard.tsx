import React, { useRef, useEffect, useState } from 'react';
import { GridData } from '../types';

interface BeadBoardProps {
  gridData: GridData;
  width: number; // grid width in beads
  height: number; // grid height in beads
  zoom: number;
  showGridLines: boolean;
  onBeadClick: (x: number, y: number) => void;
  isPainting: boolean; // Mouse down state from parent if needed, though we can handle it here
}

const BeadBoard: React.FC<BeadBoardProps> = ({
  gridData,
  width,
  height,
  zoom,
  showGridLines,
  onBeadClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // We use CSS Grid for interaction because it's easier to handle "hover" and "click" logic 
  // without complex raycasting on a canvas, and 100x100 (10,000 nodes) is manageable 
  // in modern React if we don't re-render the whole tree constantly. 
  // To optimize, we just render divs.

  const handleMouseDown = (x: number, y: number) => {
    setIsDragging(true);
    onBeadClick(x, y);
  };

  const handleMouseEnter = (x: number, y: number) => {
    if (isDragging) {
      onBeadClick(x, y);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  // Attach global mouse up listener to handle dragging outside the board
  useEffect(() => {
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
          window.removeEventListener('mouseup', handleMouseUp);
      }
  }, []);

  return (
    <div 
        ref={containerRef}
        className="bg-white shadow-lg p-4 rounded-sm overflow-auto max-w-full max-h-full flex justify-center items-center"
        style={{ minHeight: '400px' }}
    >
      <div
        className="relative select-none"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${width}, ${zoom}px)`,
          gap: showGridLines ? '1px' : '0px',
          backgroundColor: showGridLines ? '#e2e8f0' : 'transparent',
          border: '1px solid #cbd5e1',
          width: 'max-content'
        }}
        onMouseLeave={() => setIsDragging(false)}
      >
        {gridData.map((row, y) =>
          row.map((color, x) => (
            <div
              key={`${x}-${y}`}
              className="rounded-[1px] transition-colors duration-75"
              style={{
                width: `${zoom}px`,
                height: `${zoom}px`,
                backgroundColor: color,
                boxShadow: 'inset 0 0 2px rgba(0,0,0,0.1)', // subtle bevel for square tiles
              }}
              onMouseDown={() => handleMouseDown(x, y)}
              onMouseEnter={() => handleMouseEnter(x, y)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default BeadBoard;