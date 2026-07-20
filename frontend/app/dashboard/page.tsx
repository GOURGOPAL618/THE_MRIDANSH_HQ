"use client";

import React from "react";
import BaseLayout from "../../layouts/BaseLayout";
import Panel from "../../components/Panel";
import Button from "../../components/Button";
import StatusBadge from "../../components/StatusBadge";
import { useAuth } from "../../contexts/AuthContext";

export default function DashboardPage() {
  const { commander } = useAuth();

  return (
    <BaseLayout>
      <div className="space-y-6 font-mono">
        <Panel 
          title="Jagannath Command Center (JCC) Console" 
          subtitle="Central Cockpit Operations Center"
          statusIndicator="healthy"
        >
          <div className="space-y-6">
            <div className="border-l-2 border-[#0072FF] pl-4 py-1 text-xs text-gray-300">
              Welcome back, <span className="text-[#00FFFF] font-bold">{commander?.username}</span>. The cockpit environment is fully operational.
              Select modules in the sidebar for telemetry control.
            </div>

            {/* Grid of system diagnostics cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Panel variant="secondary" title="REACTOR STATUS" statusIndicator="healthy">
                <div className="space-y-2 text-[10px] text-gray-400">
                  <div className="flex justify-between">
                    <span>CORE ENGINE</span>
                    <span className="text-success font-bold">NOMINAL</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TEMPERATURE</span>
                    <span className="text-[#00FFFF]">298K (24.8°C)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>THRUST VECTOR</span>
                    <span className="text-success">0% (IDLE)</span>
                  </div>
                </div>
              </Panel>

              <Panel variant="secondary" title="RADAR SCANNER" statusIndicator="warning">
                <div className="space-y-2 text-[10px] text-gray-400">
                  <div className="flex justify-between">
                    <span>SWEEP MODE</span>
                    <span className="text-[#00FFFF] font-bold">STANDBY</span>
                  </div>
                  <div className="flex justify-between">
                    <span>RADAR GRID</span>
                    <span className="text-success">SYNCD (100%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TARGET COUNT</span>
                    <span>0 DETECTED</span>
                  </div>
                </div>
              </Panel>

              <Panel variant="secondary" title="SECURE ACCESS" statusIndicator="healthy">
                <div className="space-y-2 text-[10px] text-gray-400">
                  <div className="flex justify-between">
                    <span>CLEARANCE LEVEL</span>
                    <span className="text-success font-bold">{commander?.role.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DECRYPTION ENGINE</span>
                    <span className="text-success">ACTIVE</span>
                  </div>
                  <div className="flex justify-between">
                    <span>LOCKDOWN MODE</span>
                    <span className="text-warning">ARMED</span>
                  </div>
                </div>
              </Panel>
            </div>

            {/* Footer status summary alerts */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-primary/10 items-center justify-between">
              <div className="flex flex-wrap gap-2">
                <StatusBadge status="healthy" label="SYSTEMS ONLINE" />
                <StatusBadge status="standby" label="TELEMETRY FEED STANDBY" />
                <StatusBadge status="offline" label="STAGING LINK INACTIVE" />
              </div>
              
              <Button 
                variant="glow"
                onClick={() => alert("Querying active aerospace coordinates telemetry...")}
              >
                Query Coordinates
              </Button>
            </div>
          </div>
        </Panel>
      </div>
    </BaseLayout>
  );
}
