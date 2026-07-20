"use client";

import React from "react";
import BaseLayout from "../../layouts/BaseLayout";
import Panel from "../../components/Panel";

export default function DatasetVaultPage() {
  return (
    <BaseLayout>
      <div className="space-y-6 font-mono">
        <Panel 
          title="Dataset Vault" 
          subtitle="Satellite Telemetry and Logs Databases"
          statusIndicator="warning"
        >
          <div className="p-8 text-center text-gray-500 border border-dashed border-primary/20 rounded bg-black/20">
            <p className="text-[#00FFFF] font-bold mb-2">AEROSPACE DATASETS MANAGER</p>
            <p className="text-xs uppercase tracking-widest animate-pulse">Coming in Task 11 — Dataset Vault</p>
          </div>
        </Panel>
      </div>
    </BaseLayout>
  );
}
