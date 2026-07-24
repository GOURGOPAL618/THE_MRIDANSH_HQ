"use client";

import React from "react";

export interface CardSkeletonProps {
  className?: string;
  rows?: number;
}

export function CardSkeleton({
  className = "",
  rows = 3,
}: CardSkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Loading card content"
      className={`p-4 border border-primary/10 bg-black/40 rounded space-y-4 animate-pulse motion-reduce:animate-none ${className}`}
    >
      {/* Title skeleton */}
      <div className="h-4 bg-primary/20 rounded w-1/3" />
      
      {/* Content rows skeletons */}
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, idx) => (
          <div
            key={idx}
            className="h-2.5 bg-gray-800 rounded"
            style={{ width: idx === rows - 1 ? "60%" : "100%" }}
          />
        ))}
      </div>
    </div>
  );
}

export default CardSkeleton;
