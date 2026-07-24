"use client";

import React from "react";

export interface TableSkeletonProps {
  className?: string;
  rows?: number;
  columns?: number;
}

export function TableSkeleton({
  className = "",
  rows = 5,
  columns = 4,
}: TableSkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Loading table records"
      className={`w-full overflow-hidden border border-primary/10 rounded animate-pulse motion-reduce:animate-none ${className}`}
    >
      {/* Table Header Row Skeleton */}
      <div className="flex bg-[#0E1525]/60 border-b border-primary/15 p-3 space-x-4">
        {Array.from({ length: columns }).map((_, colIdx) => (
          <div
            key={colIdx}
            className="h-3 bg-primary/20 rounded flex-1"
            style={{ maxWidth: colIdx === 0 ? "100px" : "none" }}
          />
        ))}
      </div>
      
      {/* Table Body Rows Skeletons */}
      <div className="divide-y divide-primary/5 bg-black/40">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="flex p-3.5 space-x-4 items-center">
            {Array.from({ length: columns }).map((_, colIdx) => (
              <div
                key={colIdx}
                className="h-2.5 bg-gray-800 rounded flex-1"
                style={{ maxWidth: colIdx === 0 ? "80px" : "none" }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default TableSkeleton;
