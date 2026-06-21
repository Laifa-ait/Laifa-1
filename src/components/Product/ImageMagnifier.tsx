import React, { useState } from "react";

interface ImageMagnifierProps {
  src: string;
  alt: string;
  className?: string;
  zoomLevel?: number;
  magnifierHeight?: number;
  magnifierWidth?: number;
}

export const ImageMagnifier: React.FC<ImageMagnifierProps> = ({
  src,
  alt,
  className = "",
  zoomLevel = 2.5,
  magnifierHeight = 160,
  magnifierWidth = 160,
}) => {
  const [[x, y], setXY] = useState([0, 0]);
  const [[imgWidth, imgHeight], setSize] = useState([0, 0]);
  const [showMagnifier, setShowMagnifier] = useState(false);

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const elem = e.currentTarget;
    const { width, height } = elem.getBoundingClientRect();
    setSize([width, height]);
    setShowMagnifier(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const elem = e.currentTarget;
    const { top, left } = elem.getBoundingClientRect();

    // Calculate mouse position relative to image bounds
    const xPos = e.clientX - left;
    const yPos = e.clientY - top;
    setXY([xPos, yPos]);
  };

  return (
    <div
      className={`relative overflow-hidden cursor-zoom-in group ${className}`}
      onContextMenu={(e) => e.preventDefault()}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setShowMagnifier(false)}
    >
      <img loading="lazy"
        src={src}
        draggable={false}
        className="w-full h-full object-cover select-none pointer-events-none"
        alt={alt}
      />

      {showMagnifier && (
        <div
          style={{
            position: "absolute",
            pointerEvents: "none",
            height: `${magnifierHeight}px`,
            width: `${magnifierWidth}px`,
            top: `${y - magnifierHeight / 2}px`,
            left: `${x - magnifierWidth / 2}px`,
            borderRadius: "50%",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.3)",
            backgroundColor: "#ffffff",
            backgroundImage: `url('${src}')`,
            backgroundRepeat: "no-repeat",
            backgroundSize: `${imgWidth * zoomLevel}px ${imgHeight * zoomLevel}px`,
            backgroundPosition: `${-x * zoomLevel + magnifierWidth / 2}px ${-y * zoomLevel + magnifierHeight / 2}px`,
          }}
          className="z-30 border border-white/50 bg-white"
        />
      )}
    </div>
  );
};
