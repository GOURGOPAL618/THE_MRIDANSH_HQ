"use client";

import React from "react";
import BaseLayout from "../../layouts/BaseLayout";
import Panel from "../../components/Panel";

export default function EarthOperationsPage() {
  return (
    <BaseLayout>
      <div className="space-y-6 font-mono">
        <Panel 
          title="Earth Operations" 
          subtitle="Global Orbital Mapping and Telemetry"
          statusIndicator="warning"
        >
          <div className="p-8 text-center text-gray-500 border border-dashed border-primary/20 rounded bg-black/20">
            <p className="text-[#00FFFF] font-bold mb-2">AETHER ORBITAL PATHS FEED</p>
            <p className="text-xs uppercase tracking-widest animate-pulse">Coming in Task 07 — Earth Module</p>
          </div>
        </Panel>
      </div>
    </BaseLayout>
  );
}
