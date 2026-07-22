"use client";

import React, { useState, useEffect, useRef } from "react";
import BaseLayout from "../../layouts/BaseLayout";
import Panel from "../../components/Panel";
import { api } from "../../services/api";

interface ExperimentNote {
  id: string;
  title: string;
  objective: string;
  status: "draft" | "active" | "completed" | "failed";
  notes: {
    category: string;
    target_thrust?: number;
    nozzle_yaw?: number;
    nozzle_pitch?: number;
    duration_seconds?: number;
    dataset_id?: string;
    research_id?: string;
    observations?: string;
  };
  created_at: string;
  updated_at: string;
}

interface DatasetNote {
  id: string;
  dataset_name: string;
  category: string;
}

interface ResearchNote {
  id: string;
  title: string;
  category: string;
}

interface ApiResponseEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export default function ExperimentLabPage() {
  const [experiments, setExperiments] = useState<ExperimentNote[]>([]);
  const [selectedExp, setSelectedExp] = useState<ExperimentNote | null>(null);
  
  // Auxiliary metadata lists for select dropdowns
  const [datasetsList, setDatasetsList] = useState<DatasetNote[]>([]);
  const [researchList, setResearchList] = useState<ResearchNote[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formObjective, setFormObjective] = useState("");
  const [formCategory, setFormCategory] = useState("Propulsion");
  const [formThrust, setFormThrust] = useState(50.0);
  const [formYaw, setFormYaw] = useState(0.0);
  const [formPitch, setFormPitch] = useState(0.0);
  const [formDuration, setFormDuration] = useState(10);
  const [formDatasetId, setFormDatasetId] = useState("");
  const [formResearchId, setFormResearchId] = useState("");
  const [formObservations, setFormObservations] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Simulation parameters (Client-side lightweight loop)
  const [simProgress, setSimProgress] = useState(0);
  const [simRunning, setSimRunning] = useState(false);
  const [simComplete, setSimComplete] = useState(false);
  const [simMetrics, setSimMetrics] = useState({ thrust: 0, yaw: 0, pitch: 0 });
  const simInterval = useRef<NodeJS.Timeout | null>(null);

  // Load experiments list
  const fetchExperiments = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (statusFilter !== "ALL") params.status_filter = statusFilter;

      const queryString = new URLSearchParams(params).toString();
      const url = `/api/v1/experiments${queryString ? `?${queryString}` : ""}`;

      const response = await api.get<ApiResponseEnvelope<ExperimentNote[]>>(url);
      if (response.data && response.data.success) {
        const data = response.data.data;
        setExperiments(data);
        setErrorMsg(null);

        // Keep detail view in sync
        if (selectedExp) {
          const fresh = data.find((e) => e.id === selectedExp.id);
          if (fresh) setSelectedExp(fresh);
        }
      } else if (response.error) {
        setErrorMsg(response.error);
      }
    } catch {
      setErrorMsg("Failed to synchronize with experiments lab archives.");
    } finally {
      setIsLoading(false);
    }
  };

  // Load auxiliary lists on mount
  const fetchMetadataOptions = async () => {
    try {
      const dsRes = await api.get<ApiResponseEnvelope<DatasetNote[]>>("/api/v1/datasets");
      if (dsRes.data && dsRes.data.success) setDatasetsList(dsRes.data.data);
      
      const resRes = await api.get<ApiResponseEnvelope<ResearchNote[]>>("/api/v1/research");
      if (resRes.data && resRes.data.success) setResearchList(resRes.data.data);
    } catch {
      // Fail silently and non-blocking
    }
  };

  useEffect(() => {
    fetchExperiments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    fetchMetadataOptions();
  }, []);

  // Handle Experiment selection
  const handleSelectExperiment = (exp: ExperimentNote) => {
    setSelectedExp(exp);
    setIsEditing(false);
    setIsCreating(false);

    // Cancel any active simulation states
    if (simInterval.current) clearInterval(simInterval.current);
    setSimRunning(false);
    setSimComplete(false);
    setSimProgress(0);

    setFormTitle(exp.title);
    setFormObjective(exp.objective);
    setFormCategory(exp.notes.category || "Propulsion");
    setFormThrust(exp.notes.target_thrust ?? 50.0);
    setFormYaw(exp.notes.nozzle_yaw ?? 0.0);
    setFormPitch(exp.notes.nozzle_pitch ?? 0.0);
    setFormDuration(exp.notes.duration_seconds ?? 10);
    setFormDatasetId(exp.notes.dataset_id || "");
    setFormResearchId(exp.notes.research_id || "");
    setFormObservations(exp.notes.observations || "");
  };

  // Trigger Create Form Mode
  const triggerCreateForm = () => {
    setIsCreating(true);
    setIsEditing(false);
    setSelectedExp(null);

    setFormTitle("");
    setFormObjective("");
    setFormCategory("Propulsion");
    setFormThrust(50.0);
    setFormYaw(0.0);
    setFormPitch(0.0);
    setFormDuration(10);
    setFormDatasetId("");
    setFormResearchId("");
    setFormObservations("");
  };

  // Trigger Edit Form Mode
  const triggerEditForm = () => {
    if (!selectedExp) return;
    setIsEditing(true);
    setIsCreating(false);
  };

  // Cancel form edit/creation
  const handleCancelForm = () => {
    setIsEditing(false);
    setIsCreating(false);
    if (selectedExp) {
      setFormTitle(selectedExp.title);
      setFormObjective(selectedExp.objective);
      setFormCategory(selectedExp.notes.category || "Propulsion");
      setFormThrust(selectedExp.notes.target_thrust ?? 50.0);
      setFormYaw(selectedExp.notes.nozzle_yaw ?? 0.0);
      setFormPitch(selectedExp.notes.nozzle_pitch ?? 0.0);
      setFormDuration(selectedExp.notes.duration_seconds ?? 10);
      setFormDatasetId(selectedExp.notes.dataset_id || "");
      setFormResearchId(selectedExp.notes.research_id || "");
      setFormObservations(selectedExp.notes.observations || "");
    }
  };

  // Save changes
  const handleSaveExperiment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formObjective.trim()) {
      setErrorMsg("Experiment title and objective details cannot be empty.");
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setInfoMsg(null);

    const notesStruct = {
      category: formCategory.trim(),
      target_thrust: Number(formThrust),
      nozzle_yaw: Number(formYaw),
      nozzle_pitch: Number(formPitch),
      duration_seconds: Number(formDuration),
      dataset_id: formDatasetId || null,
      research_id: formResearchId || null,
      observations: formObservations.trim()
    };

    const payload = {
      title: formTitle.trim(),
      objective: formObjective.trim(),
      notes: JSON.stringify(notesStruct)
    };

    try {
      if (isCreating) {
        const response = await api.post<ApiResponseEnvelope<ExperimentNote>>("/api/v1/experiments", payload);
        if (response.data && response.data.success) {
          setInfoMsg("New experiment draft registered successfully.");
          setIsCreating(false);
          await fetchExperiments();
          setSelectedExp(response.data.data);
        } else if (response.error) {
          setErrorMsg(response.error);
        }
      } else if (isEditing && selectedExp) {
        const response = await api.put<ApiResponseEnvelope<ExperimentNote>>(
          `/api/v1/experiments/${selectedExp.id}`,
          payload
        );
        if (response.data && response.data.success) {
          setInfoMsg("Experiment details updated successfully.");
          setIsEditing(false);
          await fetchExperiments();
        } else if (response.error) {
          setErrorMsg(response.error);
        }
      }
    } catch {
      setErrorMsg("Failed to synchronize changes with laboratory database.");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete experiment record
  const handleDeleteExperiment = async () => {
    if (!selectedExp) return;
    if (!confirm("Are you sure you want to permanently delete this experiment record from laboratory archives?")) return;

    setIsSaving(true);
    setErrorMsg(null);
    setInfoMsg(null);

    try {
      const response = await api.delete<ApiResponseEnvelope<null>>(`/api/v1/experiments/${selectedExp.id}`);
      if (response.data && response.data.success) {
        setInfoMsg("Experiment record deleted successfully.");
        setSelectedExp(null);
        setIsEditing(false);
        setIsCreating(false);
        await fetchExperiments();
      } else if (response.error) {
        setErrorMsg(response.error);
      }
    } catch {
      setErrorMsg("Failed to execute deletion cascade on database.");
    } finally {
      setIsSaving(false);
    }
  };

  // Simulated Telemetry Loop Execution (DRAFT -> START SIMULATION -> ACTIVE)
  const handleStartSimulation = async () => {
    if (!selectedExp) return;
    
    setErrorMsg(null);
    setInfoMsg(null);

    try {
      // 1. Transition backend status to active
      const response = await api.put<ApiResponseEnvelope<ExperimentNote>>(
        `/api/v1/experiments/${selectedExp.id}`,
        { status: "active" }
      );
      
      if (response.data && response.data.success) {
        setSelectedExp(response.data.data);
        await fetchExperiments();

        // 2. Start client-side progress sweep
        setSimRunning(true);
        setSimComplete(false);
        setSimProgress(0);

        const duration = selectedExp.notes.duration_seconds || 10;
        const targetThrust = selectedExp.notes.target_thrust ?? 50.0;
        const targetYaw = selectedExp.notes.nozzle_yaw ?? 0.0;
        const targetPitch = selectedExp.notes.nozzle_pitch ?? 0.0;

        let elapsed = 0;
        simInterval.current = setInterval(() => {
          elapsed += 1;
          const percentage = Math.min(100, Math.floor((elapsed / duration) * 100));
          setSimProgress(percentage);

          // Simulated fluctuations in telemetry parameters (for simulation visual mode)
          setSimMetrics({
            thrust: Number((targetThrust + (Math.random() - 0.5) * 5).toFixed(2)),
            yaw: Number((targetYaw + (Math.random() - 0.5) * 0.5).toFixed(2)),
            pitch: Number((targetPitch + (Math.random() - 0.5) * 0.5).toFixed(2))
          });

          if (elapsed >= duration) {
            if (simInterval.current) clearInterval(simInterval.current);
            setSimRunning(false);
            setSimComplete(true);
          }
        }, 1000);

      } else if (response.error) {
        setErrorMsg(response.error);
      }
    } catch {
      setErrorMsg("Failed to initiate active simulation state on backend.");
    }
  };

  // Persist final simulation status to backend (completed / failed)
  const handleConfirmSimulationResult = async (finalStatus: "completed" | "failed") => {
    if (!selectedExp) return;

    setIsSaving(true);
    setErrorMsg(null);
    setInfoMsg(null);

    try {
      // Append observations mapping to notes
      const notesCopy = { ...selectedExp.notes };
      notesCopy.observations = `Simulated execution completed under confirmation. Status: ${finalStatus.toUpperCase()}. Metrics logged: Thrust: ${simMetrics.thrust}%, Yaw: ${simMetrics.yaw}°, Pitch: ${simMetrics.pitch}°`;

      const response = await api.put<ApiResponseEnvelope<ExperimentNote>>(
        `/api/v1/experiments/${selectedExp.id}`,
        { 
          status: finalStatus,
          notes: JSON.stringify(notesCopy)
        }
      );

      if (response.data && response.data.success) {
        setInfoMsg(`Simulation finalized. Status set to: ${finalStatus.toUpperCase()}`);
        setSimComplete(false);
        setSimProgress(0);
        setSelectedExp(response.data.data);
        await fetchExperiments();
      } else if (response.error) {
        setErrorMsg(response.error);
      }
    } catch {
      setErrorMsg("Failed to persist final simulation outcome coordinates.");
    } finally {
      setIsSaving(false);
    }
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (simInterval.current) clearInterval(simInterval.current);
    };
  }, []);

  // Stats summaries
  const statsDraft = experiments.filter((e) => e.status === "draft").length;
  const statsActive = experiments.filter((e) => e.status === "active").length;
  const statsCompleted = experiments.filter((e) => e.status === "completed").length;
  const statsFailed = experiments.filter((e) => e.status === "failed").length;

  return (
    <BaseLayout>
      <div className="space-y-6 font-mono text-sm">
        
        {/* STATS OVERVIEW CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-3 border border-primary/10 bg-black/40 rounded flex flex-col justify-between h-20">
            <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">draft setup sweeps</span>
            <span className="text-2xl font-bold text-gray-300">{statsDraft} DRAFTS</span>
          </div>
          <div className="p-3 border border-primary/10 bg-black/40 rounded flex flex-col justify-between h-20">
            <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">active simulations</span>
            <span className="text-2xl font-bold text-[#00FFFF] text-glow animate-pulse">{statsActive} RUNNING</span>
          </div>
          <div className="p-3 border border-primary/10 bg-black/40 rounded flex flex-col justify-between h-20">
            <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">completed runs</span>
            <span className="text-2xl font-bold text-success text-glow">{statsCompleted} COMPLETED</span>
          </div>
          <div className="p-3 border border-primary/10 bg-black/40 rounded flex flex-col justify-between h-20">
            <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">failed threshold sweeps</span>
            <span className="text-2xl font-bold text-danger text-glow-danger">{statsFailed} FAILED</span>
          </div>
        </div>

        {/* MAIN MODULE GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT SIDEBAR: Search & filter buttons */}
          <div className="lg:col-span-3 flex flex-col space-y-6">
            <Panel title="SIMULATION LAB CONTROLS">
              <div className="space-y-4">
                
                {/* Keyword search query */}
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">Search sweeps</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter keywords..."
                    className="w-full bg-black border border-primary/20 hover:border-primary/40 focus:border-primary text-gray-300 text-xs px-2 py-1.5 rounded outline-none focus:shadow-[0_0_8px_rgba(0,255,255,0.15)] transition"
                  />
                </div>

                {/* Status selector */}
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">status filters</label>
                  <div className="space-y-1">
                    {["ALL", "draft", "active", "completed", "failed"].map((st) => (
                      <button
                        key={st}
                        onClick={() => setStatusFilter(st)}
                        className={`w-full text-left px-2 py-1.5 border rounded text-xs transition uppercase ${
                          statusFilter === st
                            ? "border-primary text-black bg-primary font-bold shadow-[0_0_8px_#00FFFF]"
                            : "border-primary/5 text-gray-400 hover:border-primary/25 bg-black/10"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Register simulation [+] */}
                <div className="border-t border-primary/10 pt-3">
                  <button
                    onClick={triggerCreateForm}
                    className="w-full py-2 bg-black border border-primary text-primary font-bold uppercase rounded hover:bg-primary hover:text-black active:scale-95 transition text-xs shadow-[0_0_10px_rgba(0,255,255,0.05)]"
                  >
                    [+] REGISTER NEW TEST
                  </button>
                </div>

              </div>
            </Panel>
          </div>

          {/* CENTER PANEL: Experiments list catalog (4 cols) */}
          <div className="lg:col-span-4">
            <Panel title={`EXPERIMENT MATRIX (${experiments.length})`}>
              {errorMsg && (
                <div className="text-[10px] text-red-400 bg-red-950/20 border border-red-500/30 p-2 rounded uppercase mb-4">
                  ERROR: {errorMsg}
                </div>
              )}
              {infoMsg && (
                <div className="text-[10px] text-success bg-success/5 border border-success/30 p-2 rounded uppercase mb-4">
                  INFO: {infoMsg}
                </div>
              )}

              <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                {isLoading && experiments.length === 0 ? (
                  <div className="text-center text-xs text-primary animate-pulse py-8 uppercase tracking-widest">
                    SYNCING METADATA CATALOG...
                  </div>
                ) : experiments.length === 0 ? (
                  <div className="text-center py-12 text-xs text-gray-600 italic border border-dashed border-gray-800 rounded">
                    No matching experiment records found.
                  </div>
                ) : (
                  experiments.map((exp) => (
                    <button
                      key={exp.id}
                      onClick={() => handleSelectExperiment(exp)}
                      className={`w-full text-left p-3 border rounded transition flex flex-col text-xs space-y-1.5 ${
                        selectedExp?.id === exp.id
                          ? "border-[#00FFFF] bg-[#00FFFF]/5 text-[#00FFFF]"
                          : "border-primary/10 bg-black/25 text-gray-300 hover:border-primary/30"
                      }`}
                    >
                      <div className="flex justify-between w-full">
                        <span className="font-bold truncate text-[13px]">{exp.title}</span>
                        <span className={`text-[8px] border px-1.5 py-0.5 rounded uppercase font-bold shrink-0 text-glow ${
                          exp.status === "completed"
                            ? "border-success text-success"
                            : exp.status === "failed"
                            ? "border-danger text-danger"
                            : exp.status === "active"
                            ? "border-primary text-primary animate-pulse"
                            : "border-gray-600 text-gray-400"
                        }`}>
                          {exp.status}
                        </span>
                      </div>
                      <p className="text-gray-500 line-clamp-2 leading-relaxed text-[11px]">
                        {exp.objective}
                      </p>
                      
                      {/* Sub-details snippet */}
                      <div className="text-[8px] text-gray-600 truncate border-t border-primary/5 pt-1.5 flex justify-between">
                        <span>CAT: {exp.notes.category || "GENERAL"}</span>
                        <span>THRUST: {exp.notes.target_thrust ?? 0}%</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </Panel>
          </div>

          {/* RIGHT COLUMN: Simulator & Details Viewer (5 cols) */}
          <div className="lg:col-span-5">
            <Panel title="EXPERIMENT SWEEP INTERACTIVE INSPECTOR">
              
              {/* Form editing / creating view */}
              {(isCreating || isEditing) ? (
                <form onSubmit={handleSaveExperiment} className="space-y-4 text-xs">
                  
                  <div className="flex justify-between items-center border-b border-primary/15 pb-2">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                      {isCreating ? "SETUP NEW EXPERIMENT" : "EDIT SWEEP SETUP"}
                    </span>
                    <div className="flex space-x-1">
                      <button
                        type="button"
                        onClick={handleCancelForm}
                        className="px-2.5 py-1 border border-gray-700 hover:border-gray-500 rounded text-gray-400 font-bold uppercase transition active:scale-95 text-[10px]"
                      >
                        [x] Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="px-2.5 py-1 bg-success text-black font-bold uppercase rounded hover:bg-success/90 transition active:scale-95 text-[10px] text-glow shadow-[0_0_8px_#10B981]"
                      >
                        [✓] Save
                      </button>
                    </div>
                  </div>

                  {/* Title input */}
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">Title</label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="e.g. Engine Plume Heat Threshold Sweep"
                      className="w-full bg-black border border-primary/20 focus:border-primary text-gray-300 px-2 py-1.5 rounded outline-none"
                    />
                  </div>

                  {/* Objective input */}
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">Objective</label>
                    <textarea
                      value={formObjective}
                      onChange={(e) => setFormObjective(e.target.value)}
                      placeholder="Describe target goals of testing..."
                      rows={3}
                      className="w-full bg-black border border-primary/20 focus:border-primary text-gray-300 px-2 py-1.5 rounded outline-none font-mono"
                    />
                  </div>

                  {/* Parameter sliders */}
                  <div className="grid grid-cols-2 gap-4 border-t border-b border-primary/10 py-3">
                    
                    {/* Target Thrust */}
                    <div>
                      <label className="block text-[9px] text-gray-500 uppercase tracking-wider mb-1.5">
                        Target Thrust: {formThrust}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={formThrust}
                        onChange={(e) => setFormThrust(Number(e.target.value))}
                        className="w-full accent-primary"
                      />
                    </div>

                    {/* Duration seconds */}
                    <div>
                      <label className="block text-[9px] text-gray-500 uppercase tracking-wider mb-1.5">
                        Duration: {formDuration}s
                      </label>
                      <input
                        type="range"
                        min="5"
                        max="120"
                        step="5"
                        value={formDuration}
                        onChange={(e) => setFormDuration(Number(e.target.value))}
                        className="w-full accent-primary"
                      />
                    </div>

                    {/* Nozzle Yaw */}
                    <div>
                      <label className="block text-[9px] text-gray-500 uppercase tracking-wider mb-1.5">
                        Nozzle Yaw: {formYaw}°
                      </label>
                      <input
                        type="range"
                        min="-5.0"
                        max="5.0"
                        step="0.5"
                        value={formYaw}
                        onChange={(e) => setFormYaw(Number(e.target.value))}
                        className="w-full accent-primary"
                      />
                    </div>

                    {/* Nozzle Pitch */}
                    <div>
                      <label className="block text-[9px] text-gray-500 uppercase tracking-wider mb-1.5">
                        Nozzle Pitch: {formPitch}°
                      </label>
                      <input
                        type="range"
                        min="-5.0"
                        max="5.0"
                        step="0.5"
                        value={formPitch}
                        onChange={(e) => setFormPitch(Number(e.target.value))}
                        className="w-full accent-primary"
                      />
                    </div>

                  </div>

                  {/* Optional Dataset selection */}
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                      Linked Dataset reference (optional)
                    </label>
                    <select
                      value={formDatasetId}
                      onChange={(e) => setFormDatasetId(e.target.value)}
                      className="w-full bg-black border border-primary/20 focus:border-primary text-gray-300 px-2 py-1.5 rounded outline-none uppercase"
                    >
                      <option value="">-- No Linked Dataset --</option>
                      {datasetsList.map((ds) => (
                        <option key={ds.id} value={ds.id}>
                          {ds.dataset_name.toUpperCase()} ({ds.category.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Optional Research document selection */}
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                      Linked Research reference (optional)
                    </label>
                    <select
                      value={formResearchId}
                      onChange={(e) => setFormResearchId(e.target.value)}
                      className="w-full bg-black border border-primary/20 focus:border-primary text-gray-300 px-2 py-1.5 rounded outline-none uppercase"
                    >
                      <option value="">-- No Linked Research Document --</option>
                      {researchList.map((res) => (
                        <option key={res.id} value={res.id}>
                          {res.title.toUpperCase()} ({res.category.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Observations detail */}
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">Notes observations</label>
                    <input
                      type="text"
                      value={formObservations}
                      onChange={(e) => setFormObservations(e.target.value)}
                      placeholder="Simulation setup parameters log remarks..."
                      className="w-full bg-black border border-primary/20 focus:border-primary text-gray-300 px-2 py-1.5 rounded outline-none"
                    />
                  </div>

                </form>
              ) : selectedExp ? (
                
                // Detailed inspector view
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-primary/10 pb-2">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">METADATA DETAILS VIEW</span>
                    <div className="flex space-x-1">
                      {/* Allow edit/delete only if not currently running simulation */}
                      {!simRunning && (
                        <>
                          <button
                            onClick={triggerEditForm}
                            className="px-2.5 py-1 border border-primary/20 hover:border-primary text-primary font-bold uppercase rounded transition active:scale-95 text-[10px]"
                          >
                            [EDIT]
                          </button>
                          <button
                            onClick={handleDeleteExperiment}
                            className="px-2.5 py-1 bg-red-950/20 border border-danger text-danger hover:bg-danger hover:text-black font-bold uppercase rounded transition active:scale-95 text-[10px] text-glow-danger"
                          >
                            [DELETE]
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Header Title */}
                  <div>
                    <span className={`text-[8px] border px-1.5 py-0.5 rounded uppercase font-bold text-glow mr-2 ${
                      selectedExp.status === "completed"
                        ? "border-success text-success"
                        : selectedExp.status === "failed"
                        ? "border-danger text-danger"
                        : selectedExp.status === "active"
                        ? "border-primary text-primary animate-pulse"
                        : "border-gray-600 text-gray-400"
                    }`}>
                      {selectedExp.status.toUpperCase()}
                    </span>
                    <h2 className="text-lg font-bold text-gray-200 mt-2">{selectedExp.title}</h2>
                    <span className="text-[9px] text-gray-500 block mt-1">
                      ID: {selectedExp.id} • SETUP TIME: {new Date(selectedExp.created_at).toLocaleString()}
                    </span>
                  </div>

                  {/* Objective Description */}
                  <div className="text-xs text-gray-400 leading-relaxed font-mono whitespace-pre-wrap p-2 border-l border-primary/20 bg-black/10">
                    <span className="text-gray-500 uppercase text-[9px] block mb-1">Experiment objective:</span>
                    {selectedExp.objective}
                  </div>

                  {/* Experimental parameters table */}
                  <div className="grid grid-cols-2 gap-3 p-3 border border-primary/5 bg-black/25 rounded text-xs">
                    <div>
                      <span className="text-gray-500 block text-[9px]">TARGET THRUST:</span>
                      <span className="text-gray-200 font-bold">{selectedExp.notes.target_thrust ?? 0}%</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[9px]">SWEEP DURATION:</span>
                      <span className="text-gray-200 font-bold">{selectedExp.notes.duration_seconds ?? 0} SECONDS</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[9px]">NOZZLE YAW:</span>
                      <span className="text-gray-200 font-bold">{selectedExp.notes.nozzle_yaw ?? 0}°</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[9px]">NOZZLE PITCH:</span>
                      <span className="text-gray-200 font-bold">{selectedExp.notes.nozzle_pitch ?? 0}°</span>
                    </div>
                  </div>

                  {/* Display optional linked references */}
                  {(selectedExp.notes.dataset_id || selectedExp.notes.research_id) && (
                    <div className="border-t border-primary/10 pt-3 text-[10px] space-y-1 text-gray-500">
                      {selectedExp.notes.dataset_id && (
                        <div>
                          LINKED DATASET:{" "}
                          <span className="text-primary font-mono select-all">
                            {datasetsList.find(d => d.id === selectedExp.notes.dataset_id)?.dataset_name.toUpperCase() || selectedExp.notes.dataset_id}
                          </span>
                        </div>
                      )}
                      {selectedExp.notes.research_id && (
                        <div>
                          LINKED RESEARCH NOTE:{" "}
                          <span className="text-primary font-mono select-all">
                            {researchList.find(r => r.id === selectedExp.notes.research_id)?.title.toUpperCase() || selectedExp.notes.research_id}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SIMULATED TELEMETRY PANEL SECTION */}
                  <div className="border-t border-primary/15 pt-3">
                    <span className="block text-[10px] text-[#00FFFF] font-bold uppercase tracking-wider mb-2">
                      ⚙️ simulated telemetry / simulation mode
                    </span>

                    {/* DRAFT STATE -> Start simulation */}
                    {selectedExp.status === "draft" && (
                      <button
                        onClick={handleStartSimulation}
                        className="w-full py-2 bg-black border border-primary text-primary font-bold uppercase rounded hover:bg-primary hover:text-black transition active:scale-95 text-xs shadow-[0_0_8px_rgba(0,255,255,0.1)]"
                      >
                        [⚡ START SIMULATION SWEEP]
                      </button>
                    )}

                    {/* ACTIVE SIMULATION PROGRESS SWEEP */}
                    {simRunning && (
                      <div className="p-3 border border-primary/20 bg-primary/5 rounded space-y-3">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-primary font-bold animate-pulse">SWEEPING TELEMETRY VECTORS...</span>
                          <span className="text-primary font-bold">{simProgress}%</span>
                        </div>
                        {/* Progress Bar container */}
                        <div className="w-full bg-black h-2.5 rounded overflow-hidden border border-primary/15">
                          <div 
                            className="bg-primary h-full transition-all duration-300"
                            style={{ width: `${simProgress}%` }}
                          />
                        </div>

                        {/* Simulated parameters readout */}
                        <div className="grid grid-cols-3 gap-2 bg-black/40 p-2 rounded text-[10px] font-mono">
                          <div>
                            <span className="text-gray-500 block text-[8px]">SIM THRUST:</span>
                            <span className="text-[#00FFFF] font-bold">{simMetrics.thrust}%</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block text-[8px]">SIM YAW:</span>
                            <span className="text-[#00FFFF] font-bold">{simMetrics.yaw}°</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block text-[8px]">SIM PITCH:</span>
                            <span className="text-[#00FFFF] font-bold">{simMetrics.pitch}°</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SIMULATION COMPLETE -> COMMANDER CONFIRMATION SCREEN */}
                    {simComplete && (
                      <div className="p-3 border border-success/30 bg-success/5 rounded space-y-3 text-center">
                        <span className="block text-[11px] text-success font-bold uppercase text-glow">
                          ✓ simulation sweep complete
                        </span>
                        <p className="text-[10px] text-gray-400">
                          Review simulated telemetry thresholds. Please provide Commander authorization to finalize results status.
                        </p>
                        
                        {/* Final simulated metrics summary */}
                        <div className="bg-black/50 p-2 rounded text-[10px] text-left grid grid-cols-3 gap-2 border border-success/10 font-mono mb-2">
                          <div>
                            <span className="text-gray-500 block text-[8px]">FINAL THRUST:</span>
                            <span className="text-success font-bold">{simMetrics.thrust}%</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block text-[8px]">FINAL YAW:</span>
                            <span className="text-success font-bold">{simMetrics.yaw}°</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block text-[8px]">FINAL PITCH:</span>
                            <span className="text-success font-bold">{simMetrics.pitch}°</span>
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleConfirmSimulationResult("completed")}
                            disabled={isSaving}
                            className="flex-1 py-1.5 bg-success text-black font-bold uppercase rounded hover:bg-success/90 transition active:scale-95 text-xs text-glow shadow-[0_0_8px_#10B981]"
                          >
                            [✓] Confirm Success
                          </button>
                          <button
                            onClick={() => handleConfirmSimulationResult("failed")}
                            disabled={isSaving}
                            className="flex-1 py-1.5 bg-red-950/20 border border-danger text-danger hover:bg-danger hover:text-black font-bold uppercase rounded transition active:scale-95 text-xs text-glow-danger"
                          >
                            [x] Mark Failure
                          </button>
                        </div>
                      </div>
                    )}

                    {/* COMPLETED OR FAILED DISPLAY READOUT */}
                    {(selectedExp.status === "completed" || selectedExp.status === "failed") && (
                      <div className="p-3 bg-black/30 border border-primary/5 rounded space-y-2">
                        <span className="block text-[9px] text-gray-500 uppercase">
                          final experimental observations & parameters:
                        </span>
                        <p className="text-xs text-gray-300 font-mono leading-relaxed bg-black/40 p-2 rounded border border-primary/5">
                          {selectedExp.notes.observations || "No result log details recorded."}
                        </p>
                      </div>
                    )}

                  </div>

                </div>
              ) : (
                <div className="text-center py-16 text-xs text-gray-600 italic border border-dashed border-gray-800 rounded">
                  Select an experiment sweep from the matrix feed on the left to inspect target parameters, or click [+] to configure a new test.
                </div>
              )}

            </Panel>
          </div>

        </div>

      </div>
    </BaseLayout>
  );
}
