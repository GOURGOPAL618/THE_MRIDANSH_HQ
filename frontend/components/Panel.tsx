"use client";

import React, { ReactNode } from "react";
import Card from "./ui/Card";
import StatusIndicator from "./ui/StatusIndicator";

export interface PanelProps {
  title?: string;
  subtitle?: string;
  headerActions?: ReactNode;
  statusIndicator?: "healthy" | "warning" | "danger" | "off";
  variant?: "primary" | "secondary";
  className?: string;
  children: ReactNode;
}

export function Panel({
  title,
  subtitle,
  headerActions,
  statusIndicator,
  variant = "primary",
  className = "",
  children,
}: PanelProps) {
  // Construct title element with status indicator
  const titleNode = title || statusIndicator ? (
    <div className="flex items-center space-x-2">
      {statusIndicator && (
        <StatusIndicator status={statusIndicator === "danger" ? "danger" : statusIndicator === "healthy" ? "healthy" : statusIndicator === "warning" ? "warning" : "off"} />
      )}
      {title && <span>{title}</span>}
    </div>
  ) : undefined;

  return (
    <Card
      title={titleNode}
      subtitle={subtitle}
      headerActions={headerActions}
      variant={variant}
      className={className}
    >
      {children}
    </Card>
  );
}

export default Panel;
