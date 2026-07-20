"use client";

import React from "react";
import BaseLayout from "../../layouts/BaseLayout";
import Panel from "../../components/Panel";

export default function SettingsPage() {
  return (
    <BaseLayout>
      <div className="space-y-6 font-mono">
        <Panel 
          title="Settings" 
          subtitle="Cockpit Sub-themes, Audio Volumes, and Decryption Key Config"
          statusIndicator="healthy"
        >
          <div className="p-8 text-center text-gray-500 border border-dashed border-primary/20 rounded bg-black/20">
            <p className="text-[#00FFFF] font-bold mb-2">COCKPIT SETTINGS PANELS</p>
            <p className="text-xs uppercase tracking-widest animate-pulse">Coming in Task 15 — Settings</p>
          </div>
        </Panel>
      </div>
    </BaseLayout>
  );
}
