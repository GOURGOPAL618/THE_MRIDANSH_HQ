"use client";

import React, { useState, useEffect } from "react";
import BaseLayout from "../../layouts/BaseLayout";
import Panel from "../../components/Panel";
import { api } from "../../services/api";
import { CardSkeleton } from "../../components/loading";

interface DatasetNote {
  id: string;
  dataset_name: string;
  category: string;
  source: string;
  description: string;
  location: string;
  created_at: string;
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

export default function DatasetVaultPage() {
  const [datasets, setDatasets] = useState<DatasetNote[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<DatasetNote | null>(null);
  const [relatedResearch, setRelatedResearch] = useState<ResearchNote[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // Search and filter parameters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Form states (Create / Edit)
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("Propulsion");
  const [formSource, setFormSource] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Fetch datasets catalog
  const fetchDatasets = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedCategory !== "ALL") params.category = selectedCategory;

      const queryString = new URLSearchParams(params).toString();
      const url = `/api/v1/datasets${queryString ? `?${queryString}` : ""}`;

      const response = await api.get<ApiResponseEnvelope<DatasetNote[]>>(url);
      if (response.data && response.data.success) {
        const data = response.data.data;
        setDatasets(data);
        setErrorMsg(null);

        // Sync selected detail view if updated
        if (selectedDataset) {
          const fresh = data.find((d) => d.id === selectedDataset.id);
          if (fresh) setSelectedDataset(fresh);
        }
      } else if (response.error) {
        setErrorMsg(response.error);
      }
    } catch {
      setErrorMsg("Failed to synchronize with aerospace datasets catalog.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedCategory]);

  // Fetch optional related research recommendations based on category
  const fetchRelatedResearch = async (category: string) => {
    setRelatedResearch([]);
    try {
      const url = `/api/v1/research?category=${encodeURIComponent(category)}`;
      const response = await api.get<ApiResponseEnvelope<ResearchNote[]>>(url);
      if (response.data && response.data.success) {
        setRelatedResearch(response.data.data);
      }
    } catch {
      // Fail silently and non-blocking as per refinements instructions
    }
  };

  // Handle selection of a dataset entry
  const handleSelectDataset = (ds: DatasetNote) => {
    setSelectedDataset(ds);
    setIsEditing(false);
    setIsCreating(false);

    setFormName(ds.dataset_name);
    setFormCategory(ds.category);
    setFormSource(ds.source);
    setFormDescription(ds.description);
    setFormLocation(ds.location);

    // Load related research recommendations
    fetchRelatedResearch(ds.category);
  };

  // Trigger Create Form Mode
  const triggerCreateForm = () => {
    setIsCreating(true);
    setIsEditing(false);
    setSelectedDataset(null);
    setRelatedResearch([]);

    setFormName("");
    setFormCategory("Propulsion");
    setFormSource("");
    setFormDescription("");
    setFormLocation("");
  };

  // Trigger Edit Form Mode
  const triggerEditForm = () => {
    if (!selectedDataset) return;
    setIsEditing(true);
    setIsCreating(false);
  };

  // Cancel edit/create
  const handleCancelForm = () => {
    setIsEditing(false);
    setIsCreating(false);
    if (selectedDataset) {
      setFormName(selectedDataset.dataset_name);
      setFormCategory(selectedDataset.category);
      setFormSource(selectedDataset.source);
      setFormDescription(selectedDataset.description);
      setFormLocation(selectedDataset.location);
    }
  };

  // Save changes (Create or Update)
  const handleSaveDataset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formDescription.trim() || !formLocation.trim() || !formSource.trim()) {
      setErrorMsg("Dataset registration details cannot be empty.");
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setInfoMsg(null);

    const payload = {
      dataset_name: formName.trim(),
      category: formCategory.trim(),
      source: formSource.trim(),
      description: formDescription.trim(),
      location: formLocation.trim()
    };

    try {
      if (isCreating) {
        const response = await api.post<ApiResponseEnvelope<DatasetNote>>("/api/v1/datasets", payload);
        if (response.data && response.data.success) {
          const newDs = response.data.data;
          setInfoMsg("Aerospace dataset registered successfully to catalog.");
          setIsCreating(false);
          await fetchDatasets();
          setSelectedDataset(newDs);
          fetchRelatedResearch(newDs.category);
        } else if (response.error) {
          setErrorMsg(response.error);
        }
      } else if (isEditing && selectedDataset) {
        const response = await api.put<ApiResponseEnvelope<DatasetNote>>(
          `/api/v1/datasets/${selectedDataset.id}`,
          payload
        );
        if (response.data && response.data.success) {
          setInfoMsg("Dataset catalog details updated successfully.");
          setIsEditing(false);
          await fetchDatasets();
        } else if (response.error) {
          setErrorMsg(response.error);
        }
      }
    } catch {
      setErrorMsg("Failed to synchronize changes with catalog database.");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete dataset (database entry only)
  const handleDeleteDataset = async () => {
    if (!selectedDataset) return;
    if (!confirm("Are you sure you want to unregister this dataset? Note: This deletes ONLY the database catalog record. No physical file is deleted.")) return;

    setIsSaving(true);
    setErrorMsg(null);
    setInfoMsg(null);

    try {
      const response = await api.delete<ApiResponseEnvelope<null>>(`/api/v1/datasets/${selectedDataset.id}`);
      if (response.data && response.data.success) {
        setInfoMsg("Dataset catalog record unregistered successfully.");
        setSelectedDataset(null);
        setIsEditing(false);
        setIsCreating(false);
        await fetchDatasets();
      } else if (response.error) {
        setErrorMsg(response.error);
      }
    } catch {
      setErrorMsg("Failed to execute unregister cascade on database.");
    } finally {
      setIsSaving(false);
    }
  };

  // Stats summaries
  const categoriesList = ["ALL", "Propulsion", "Satellites", "Astrodynamics", "Weather", "Security", "General"];
  const uniqueSources = Array.from(new Set(datasets.map((d) => d.source)));
  const locationsCount = datasets.filter((d) => d.location && d.location.trim().length > 0).length;

  return (
    <BaseLayout>
      <div className="space-y-6 font-mono text-sm">
        
        {/* STATS OVERVIEW HEADER CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-3 border border-primary/10 bg-black/40 rounded flex flex-col justify-between h-20">
            <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">total datasets</span>
            <span className="text-2xl font-bold text-[#00FFFF] text-glow">{datasets.length} DATASETS</span>
          </div>
          <div className="p-3 border border-primary/10 bg-black/40 rounded flex flex-col justify-between h-20">
            <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">unique categories</span>
            <span className="text-2xl font-bold text-gray-200">
              {Array.from(new Set(datasets.map((d) => d.category))).length} CATS
            </span>
          </div>
          <div className="p-3 border border-primary/10 bg-black/40 rounded flex flex-col justify-between h-20">
            <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">unique telemetry sources</span>
            <span className="text-2xl font-bold text-gray-200">{uniqueSources.length} SOURCES</span>
          </div>
          <div className="p-3 border border-primary/10 bg-black/40 rounded flex flex-col justify-between h-20">
            <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">registered locations</span>
            <span className="text-2xl font-bold text-success text-glow">{locationsCount} PATHS</span>
          </div>
        </div>

        {/* MAIN CONSOLE GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT SIDEBAR: Search & Filters (3 cols) */}
          <div className="lg:col-span-3 flex flex-col space-y-6">
            
            <Panel title="dataset directory filters">
              <div className="space-y-4">
                
                {/* Keyword Search */}
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">Keyword Search</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, description..."
                    className="w-full bg-black border border-primary/20 hover:border-primary/40 focus:border-primary text-gray-300 text-xs px-2 py-1.5 rounded outline-none focus:shadow-[0_0_8px_rgba(0,255,255,0.15)] transition"
                  />
                </div>

                {/* Categories filtering list */}
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">Category filters</label>
                  <div className="space-y-1">
                    {categoriesList.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`w-full text-left px-2 py-1.5 border rounded text-xs transition uppercase ${
                          selectedCategory === cat
                            ? "border-primary text-black bg-primary font-bold shadow-[0_0_8px_#00FFFF]"
                            : "border-primary/5 text-gray-400 hover:border-primary/25 bg-black/10"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* [+] REGISTER DATASET BUTTON */}
                <div className="border-t border-primary/10 pt-3">
                  <button
                    onClick={triggerCreateForm}
                    className="w-full py-2 bg-black border border-primary text-primary font-bold uppercase rounded hover:bg-primary hover:text-black active:scale-95 transition text-xs shadow-[0_0_10px_rgba(0,255,255,0.05)]"
                  >
                    [+] REGISTER DATASET
                  </button>
                </div>

              </div>
            </Panel>

          </div>

          {/* MIDDLE COLUMN: Datasets Feed list (4 cols) */}
          <div className="lg:col-span-4">
            <Panel title={`DATASETS VAULT REGISTER (${datasets.length})`}>
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
                {isLoading && datasets.length === 0 ? (
                  <div className="space-y-3">
                    <CardSkeleton rows={3} />
                    <CardSkeleton rows={3} />
                    <CardSkeleton rows={3} />
                  </div>
                ) : datasets.length === 0 ? (
                  <div className="text-center py-12 text-xs text-gray-600 italic border border-dashed border-gray-800 rounded">
                    No matching aerospace datasets found in directory.
                  </div>
                ) : (
                  datasets.map((ds) => (
                    <button
                      key={ds.id}
                      onClick={() => handleSelectDataset(ds)}
                      className={`w-full text-left p-3 border rounded transition flex flex-col text-xs space-y-1.5 ${
                        selectedDataset?.id === ds.id
                          ? "border-[#00FFFF] bg-[#00FFFF]/5 text-[#00FFFF]"
                          : "border-primary/10 bg-black/25 text-gray-300 hover:border-primary/30"
                      }`}
                    >
                      <div className="flex justify-between w-full">
                        <span className="font-bold truncate text-[13px]">{ds.dataset_name}</span>
                        <span className="text-[8px] bg-primary/10 border border-primary/20 text-primary px-1.5 py-0.5 rounded uppercase font-bold text-glow shrink-0">
                          {ds.category}
                        </span>
                      </div>
                      <p className="text-gray-500 line-clamp-2 leading-relaxed text-[11px]">
                        {ds.description}
                      </p>
                      
                      {/* Location index metadata snippet */}
                      <div className="text-[9px] text-gray-600 truncate border-t border-primary/5 pt-1.5">
                        LOC: <span className="text-gray-400 font-mono">{ds.location}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </Panel>
          </div>

          {/* RIGHT PANEL: Details / Editors + Related Research vault recommendations (5 cols) */}
          <div className="lg:col-span-5">
            <Panel title="DATASET INTELLIGENCE INSPECTOR">
              
              {/* Form editing / creating views */}
              {(isCreating || isEditing) ? (
                <form onSubmit={handleSaveDataset} className="space-y-4 text-xs">
                  <div className="flex justify-between items-center border-b border-primary/15 pb-2">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                      {isCreating ? "REGISTER NEW DATASET" : "EDITING DATASET REGISTRY"}
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

                  {/* Name input */}
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">Dataset Name</label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. AETHER Propulsion telemetry logs"
                      className="w-full bg-black border border-primary/20 focus:border-primary text-gray-300 px-2 py-1.5 rounded outline-none"
                    />
                  </div>

                  {/* Category selector */}
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full bg-black border border-primary/20 focus:border-primary text-gray-300 px-2 py-1.5 rounded outline-none uppercase"
                    >
                      {categoriesList.filter(c => c !== "ALL").map((cat) => (
                        <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>

                  {/* Source input */}
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">Source Logger / Device</label>
                    <input
                      type="text"
                      value={formSource}
                      onChange={(e) => setFormSource(e.target.value)}
                      placeholder="e.g. AETHER Solar Coordinates sensors array"
                      className="w-full bg-black border border-primary/20 focus:border-primary text-gray-300 px-2 py-1.5 rounded outline-none"
                    />
                  </div>

                  {/* Description input */}
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">Metadata Description</label>
                    <textarea
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Enter dataset telemetry characteristics parameters..."
                      rows={5}
                      className="w-full bg-black border border-primary/20 focus:border-primary text-gray-300 px-2 py-1.5 rounded outline-none font-mono"
                    />
                  </div>

                  {/* Storage Location path (metadata only) */}
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">Metadata storage Location (Path)</label>
                    <input
                      type="text"
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      placeholder="e.g. D:/storage/datasets/telemetry_heat.csv"
                      className="w-full bg-black border border-primary/20 focus:border-primary text-gray-300 px-2 py-1.5 rounded outline-none"
                    />
                    <span className="text-[9px] text-gray-600 mt-1 block uppercase">Treats path strictly as index data; no files are moved or deleted.</span>
                  </div>

                </form>
              ) : selectedDataset ? (
                
                // Detailed inspector view
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-primary/10 pb-2">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">METADATA DETAILS VIEW</span>
                    <div className="flex space-x-1">
                      <button
                        onClick={triggerEditForm}
                        className="px-2.5 py-1 border border-primary/20 hover:border-primary text-primary font-bold uppercase rounded transition active:scale-95 text-[10px]"
                      >
                        [EDIT]
                      </button>
                      <button
                        onClick={handleDeleteDataset}
                        className="px-2.5 py-1 bg-red-950/20 border border-danger text-danger hover:bg-danger hover:text-black font-bold uppercase rounded transition active:scale-95 text-[10px] text-glow-danger"
                      >
                        [DELETE]
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[8px] bg-primary/10 border border-primary/20 text-primary px-1.5 py-0.5 rounded uppercase font-bold text-glow mr-2">
                      {selectedDataset.category}
                    </span>
                    <h2 className="text-lg font-bold text-gray-200 mt-2">{selectedDataset.dataset_name}</h2>
                    <span className="text-[9px] text-gray-500 block mt-1">
                      ID: {selectedDataset.id} • REGISTERED: {new Date(selectedDataset.created_at).toLocaleString()}
                    </span>
                  </div>

                  {/* Source device details block */}
                  <div className="bg-black/30 border border-primary/5 p-3 rounded text-xs leading-relaxed space-y-1">
                    <div>
                      <span className="text-gray-500 uppercase text-[9px] block">Telemetry source:</span>
                      <span className="text-gray-200 font-bold">{selectedDataset.source}</span>
                    </div>
                    <div className="pt-2">
                      <span className="text-gray-500 uppercase text-[9px] block">Storage Catalog Location path:</span>
                      <span className="text-gray-300 font-mono break-all">{selectedDataset.location}</span>
                    </div>
                  </div>

                  {/* Main Description */}
                  <div className="text-xs text-gray-400 leading-relaxed font-mono whitespace-pre-wrap p-2 border-l border-primary/20 bg-black/10">
                    {selectedDataset.description}
                  </div>

                  {/* OPTIONAL Related Research vault recommendations (Non-blocking) */}
                  {relatedResearch.length > 0 && (
                    <div className="border-t border-primary/15 pt-3">
                      <span className="block text-[9px] text-glow text-primary uppercase font-bold mb-2">
                        💡 related mission intelligence reference notes
                      </span>
                      <div className="space-y-2">
                        {relatedResearch.slice(0, 3).map((res) => (
                          <div 
                            key={res.id} 
                            className="p-2 border border-primary/5 bg-black/20 rounded flex items-center justify-between text-[11px] hover:border-primary/20 transition cursor-pointer"
                          >
                            <span className="text-gray-300 font-bold truncate pr-3">{res.title}</span>
                            <span className="text-[8px] bg-primary/10 border border-primary/20 text-primary px-1.5 py-0.5 rounded uppercase font-bold shrink-0">
                              {res.category}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <div className="text-center py-16 text-xs text-gray-600 italic border border-dashed border-gray-800 rounded">
                  Select an aerospace dataset from the catalog list to inspect coordinates and telemetry metadata, or click [+] to register a new entry.
                </div>
              )}

            </Panel>
          </div>

        </div>

      </div>
    </BaseLayout>
  );
}
