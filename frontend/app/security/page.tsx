"use client";

import React from "react";
import BaseLayout from "../../layouts/BaseLayout";
import Panel from "../../components/Panel";

export default function SecurityCenterPage() {
  return (
    <BaseLayout>
      <div className="space-y-6 font-mono">
        <Panel 
          title="Security Center" 
          subtitle="Auditing, Override Controls, and Lockdown Switches"
          statusIndicator="healthy"
        >
          <div className="p-8 text-center text-gray-500 border border-dashed border-primary/20 rounded bg-black/20">
            <p className="text-[#00FFFF] font-bold mb-2">JCC SECURITY AUDIT PANELS</p>
            <p className="text-xs uppercase tracking-widest animate-pulse">Coming in Task 14 — Security Center</p>
          </div>
        </Panel>
      </div>
    </BaseLayout>
  );
}
