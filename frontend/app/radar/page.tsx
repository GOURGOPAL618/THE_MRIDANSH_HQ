"use client";

import React from "react";
import BaseLayout from "../../layouts/BaseLayout";
import Panel from "../../components/Panel";

export default function RadarControlPage() {
  return (
    <BaseLayout>
      <div className="space-y-6 font-mono">
        <Panel 
          title="Radar Control" 
          subtitle="360-Degree Target Sweeps and Scans"
          statusIndicator="warning"
        >
          <div className="p-8 text-center text-gray-500 border border-dashed border-primary/20 rounded bg-black/20">
            <p className="text-[#00FFFF] font-bold mb-2">TARGET SCANNING FEEDS</p>
            <p className="text-xs uppercase tracking-widest animate-pulse">Coming in Task 08 — Radar Module</p>
          </div>
        </Panel>
      </div>
    </BaseLayout>
  );
}
