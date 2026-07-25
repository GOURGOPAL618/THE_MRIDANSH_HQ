"use client";

import React, { useState } from "react";

export interface AvatarProps {
  src?: string;
  alt?: string;
  fallback: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  shape?: "round" | "hex";
}

export function Avatar({
  src,
  alt = "avatar",
  fallback,
  size = "md",
  className = "",
  shape = "hex",
}: AvatarProps) {
  const [error, setError] = useState(false);

  const sizeClasses = {
    sm: "w-8 h-8 text-[10px]",
    md: "w-10 h-10 text-xs",
    lg: "w-14 h-14 text-sm",
  };

  const shapeStyles =
    shape === "hex"
      ? "clip-polygon border border-primary/40 bg-[#0E1525]"
      : "rounded-full border border-primary/30 bg-[#0E1525]";

  const renderContent = () => {
    if (src && !error) {
      return (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src}
          alt={alt}
          onError={() => setError(true)}
          className="w-full h-full object-cover"
        />
      );
    }

    return (
      <span className="font-mono font-bold tracking-wider text-primary text-glow uppercase">
        {fallback.slice(0, 2)}
      </span>
    );
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center overflow-hidden shrink-0 select-none ${sizeClasses[size]} ${shapeStyles} ${className}`}
    >
      {renderContent()}

      {/* Hexagonal Clip Path style rules scope */}
      {shape === "hex" && (
        <style>{`
          .clip-polygon {
            clip-path: polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%);
          }
        `}</style>
      )}
    </div>
  );
}

export default Avatar;
