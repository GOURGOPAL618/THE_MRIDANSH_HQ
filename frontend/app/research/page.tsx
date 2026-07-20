"use client";

import React from "react";
import BaseLayout from "../../layouts/BaseLayout";
import Panel from "../../components/Panel";

export default function ResearchVaultPage() {
  return (
    <BaseLayout>
      <div className="space-y-6 font-mono">
        <Panel 
          title="Research Vault" 
          subtitle="Document Catalog and Notes Repository"
          statusIndicator="warning"
        >
          <div className="p-8 text-center text-gray-500 border border-dashed border-primary/20 rounded bg-black/20">
            <p className="text-[#00FFFF] font-bold mb-2">RESEARCH TELEMETRY INDEX</p>
            <p className="text-xs uppercase tracking-widest animate-pulse">Coming in Task 10 — Research Vault</p>
          </div>
        </Panel>
      </div>
    </BaseLayout>
  );
}
