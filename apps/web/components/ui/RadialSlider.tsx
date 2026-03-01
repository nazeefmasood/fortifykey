"use client";

import { useCallback, useRef, useState, useEffect } from "react";

interface RadialSliderProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  radius?: number;
  strokeWidth?: number;
  trackColor?: string;
  fillGradient?: [string, string];
  thumbColor?: string;
}

/**
 * Custom SVG radial (circular) slider.
 * Replaces react-native-radial-slider from the original RN app.
 */
export function RadialSlider({
  value,
  min = 1,
  max = 100,
  onChange,
  radius = 120,
  strokeWidth = 20,
  trackColor = "#fcedec",
  fillGradient = ["#eb564F", "#eb264F"],
  thumbColor = "#eb564F",
}: RadialSliderProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const size = (radius + strokeWidth) * 2;
  const center = size / 2;
  const normalizedRadius = radius;

  // Angle calculation (start from top, go clockwise)
  const percentage = (value - min) / (max - min);
  const angle = percentage * 360;
  const startAngle = -90; // Start from top

  // Convert angle to radians for arc calculations
  const angleToCoords = (deg: number) => {
    const rad = ((deg + startAngle) * Math.PI) / 180;
    return {
      x: center + normalizedRadius * Math.cos(rad),
      y: center + normalizedRadius * Math.sin(rad),
    };
  };

  // SVG arc path
  const start = angleToCoords(0);
  const end = angleToCoords(angle);
  const largeArc = angle > 180 ? 1 : 0;

  const arcPath =
    angle > 0
      ? `M ${start.x} ${start.y} A ${normalizedRadius} ${normalizedRadius} 0 ${largeArc} 1 ${end.x} ${end.y}`
      : "";

  // Thumb position
  const thumbPos = angleToCoords(angle);

  // Handle drag
  const getAngleFromEvent = useCallback(
    (clientX: number, clientY: number) => {
      if (!svgRef.current) return null;
      const rect = svgRef.current.getBoundingClientRect();
      const x = clientX - rect.left - center;
      const y = clientY - rect.top - center;
      let deg = (Math.atan2(y, x) * 180) / Math.PI + 90;
      if (deg < 0) deg += 360;
      return Math.round(min + (deg / 360) * (max - min));
    },
    [center, min, max]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      setIsDragging(true);
      (e.target as Element).setPointerCapture(e.pointerId);
      const newValue = getAngleFromEvent(e.clientX, e.clientY);
      if (newValue !== null) onChange(Math.max(min, Math.min(max, newValue)));
    },
    [getAngleFromEvent, onChange, min, max]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const newValue = getAngleFromEvent(e.clientX, e.clientY);
      if (newValue !== null) onChange(Math.max(min, Math.min(max, newValue)));
    },
    [isDragging, getAngleFromEvent, onChange, min, max]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const gradientId = "radial-gradient";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        ref={svgRef}
        width={size}
        height={size}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="touch-none cursor-pointer"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={fillGradient[0]} />
            <stop offset="100%" stopColor={fillGradient[1]} />
          </linearGradient>
        </defs>

        {/* Track (full circle) */}
        <circle
          cx={center}
          cy={center}
          r={normalizedRadius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />

        {/* Filled arc */}
        {angle > 0 && (
          <path
            d={arcPath}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}

        {/* Thumb */}
        <circle
          cx={thumbPos.x}
          cy={thumbPos.y}
          r={strokeWidth / 2 + 4}
          fill={thumbColor}
          stroke="white"
          strokeWidth={3}
          className="drop-shadow-md"
        />
      </svg>

      {/* Center value display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-bold text-white">{value}</span>
        <span className="text-sm text-white/70 uppercase tracking-wider">
          Characters
        </span>
      </div>
    </div>
  );
}
