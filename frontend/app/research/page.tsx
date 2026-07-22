"use client";

import React, { useState, useEffect } from "react";
import BaseLayout from "../../layouts/BaseLayout";
import Panel from "../../components/Panel";
import { api } from "../../services/api";

interface ResearchNote {
  id: string;
  title: string;
  category: string;
  description: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface ApiResponseEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export default function ResearchVaultPage() {
  const [notes, setNotes] = useState<ResearchNote[]>([]);
  const [selectedNote, setSelectedNote] = useState<ResearchNote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // Search and filter parameters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Form states (Create / Edit)
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("Propulsion");
  const [formDescription, setFormDescription] = useState("");
  const [formTagsString, setFormTagsString] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Fetch all research notes
  const fetchResearchNotes = async () => {
    setIsLoading(true);
    try {
      // Build query string
      const params: Record<string, string> = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedCategory !== "ALL") params.category = selectedCategory;
      if (selectedTag) params.tag = selectedTag;

      const queryString = new URLSearchParams(params).toString();
      const url = `/api/v1/research${queryString ? `?${queryString}` : ""}`;

      const response = await api.get<ApiResponseEnvelope<ResearchNote[]>>(url);
      if (response.data && response.data.success) {
        const data = response.data.data;
        setNotes(data);
        setErrorMsg(null);

        // Keep select note in sync if updated
        if (selectedNote) {
          const fresh = data.find((n) => n.id === selectedNote.id);
          if (fresh) setSelectedNote(fresh);
        }
      } else if (response.error) {
        setErrorMsg(response.error);
      }
    } catch {
      setErrorMsg("Failed to synchronize with research vault archive.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResearchNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedCategory, selectedTag]);

  // Handle Note Selection
  const handleSelectNote = (note: ResearchNote) => {
    setSelectedNote(note);
    setIsEditing(false);
    setIsCreating(false);
    
    // Set edit form defaults
    setFormTitle(note.title);
    setFormCategory(note.category);
    setFormDescription(note.description);
    setFormTagsString(note.tags.join(", "));
  };

  // Trigger Create Form Mode
  const triggerCreateForm = () => {
    setIsCreating(true);
    setIsEditing(false);
    setSelectedNote(null);

    setFormTitle("");
    setFormCategory("Propulsion");
    setFormDescription("");
    setFormTagsString("");
  };

  // Trigger Edit Form Mode
  const triggerEditForm = () => {
    if (!selectedNote) return;
    setIsEditing(true);
    setIsCreating(false);
  };

  // Cancel edit/create
  const handleCancelForm = () => {
    setIsEditing(false);
    setIsCreating(false);
    if (selectedNote) {
      // Restore form values
      setFormTitle(selectedNote.title);
      setFormCategory(selectedNote.category);
      setFormDescription(selectedNote.description);
      setFormTagsString(selectedNote.tags.join(", "));
    }
  };

  // Save changes (Create or Update)
  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDescription.trim()) {
      setErrorMsg("Document title and description parameters cannot be empty.");
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setInfoMsg(null);

    // Format tags from comma-separated string to string array
    const tagsArray = formTagsString
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      title: formTitle.trim(),
      category: formCategory.trim(),
      description: formDescription.trim(),
      tags: tagsArray
    };

    try {
      if (isCreating) {
        const response = await api.post<ApiResponseEnvelope<ResearchNote>>("/api/v1/research", payload);
        if (response.data && response.data.success) {
          const newDoc = response.data.data;
          setInfoMsg("Document registered to vault archives successfully.");
          setIsCreating(false);
          await fetchResearchNotes();
          setSelectedNote(newDoc);
        } else if (response.error) {
          setErrorMsg(response.error);
        }
      } else if (isEditing && selectedNote) {
        const response = await api.put<ApiResponseEnvelope<ResearchNote>>(
          `/api/v1/research/${selectedNote.id}`,
          payload
        );
        if (response.data && response.data.success) {
          setInfoMsg("Document changes updated successfully.");
          setIsEditing(false);
          await fetchResearchNotes();
        } else if (response.error) {
          setErrorMsg(response.error);
        }
      }
    } catch {
      setErrorMsg("Failed to sync changes with backend archives.");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete document
  const handleDeleteDocument = async () => {
    if (!selectedNote) return;
    if (!confirm("Are you sure you want to permanently delete this research document from the database?")) return;

    setIsSaving(true);
    setErrorMsg(null);
    setInfoMsg(null);

    try {
      const response = await api.delete<ApiResponseEnvelope<null>>(`/api/v1/research/${selectedNote.id}`);
      if (response.data && response.data.success) {
        setInfoMsg("Research document deleted successfully.");
        setSelectedNote(null);
        setIsEditing(false);
        setIsCreating(false);
        await fetchResearchNotes();
      } else if (response.error) {
        setErrorMsg(response.error);
      }
    } catch {
      setErrorMsg("Failed to execute deletion cascade on database.");
    } finally {
      setIsSaving(false);
    }
  };

  // Get stats summaries
  const categoriesList = ["ALL", "Propulsion", "Astrodynamics", "Security", "General", "Cybernetics"];
  
  // Calculate unique tags from all current notes in memory
  const allTags = Array.from(
    new Set(notes.flatMap((n) => n.tags))
  ).slice(0, 12); // Cap unique tag cloud selection size

  return (
    <BaseLayout>
      <div className="space-y-6 font-mono text-sm">
        
        {/* STATS OVERVIEW HEADER CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-3 border border-primary/10 bg-black/40 rounded flex flex-col justify-between h-20">
            <span className="text-[9px] text-gray-500 uppercase tracking-wider">vault files count</span>
            <span className="text-2xl font-bold text-[#00FFFF] text-glow">{notes.length} NOTES</span>
          </div>
          <div className="p-3 border border-primary/10 bg-black/40 rounded flex flex-col justify-between h-20">
            <span className="text-[9px] text-gray-500 uppercase tracking-wider">categories active</span>
            <span className="text-2xl font-bold text-gray-200">
              {Array.from(new Set(notes.map((n) => n.category))).length} CATS
            </span>
          </div>
          <div className="p-3 border border-primary/10 bg-black/40 rounded flex flex-col justify-between h-20">
            <span className="text-[9px] text-gray-500 uppercase tracking-wider">unique tags mapped</span>
            <span className="text-2xl font-bold text-gray-200">{allTags.length} TAGS</span>
          </div>
          <div className="p-3 border border-primary/10 bg-black/40 rounded flex flex-col justify-between h-20">
            <span className="text-[9px] text-gray-500 uppercase tracking-wider">security clearing</span>
            <span className="text-lg font-bold text-success uppercase">cleared / level 5</span>
          </div>
        </div>

        {/* MAIN CONSOLE GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT SIDEBAR PANEL: Filter controls (3 cols) */}
          <div className="lg:col-span-3 flex flex-col space-y-6">
            
            {/* Search & Filter settings */}
            <Panel title="VAULT INTEGRITY FILTER">
              <div className="space-y-4">
                
                {/* Search query input */}
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">Keyword Search</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter keywords..."
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
                        onClick={() => {
                          setSelectedCategory(cat);
                          setSelectedTag(null); // Clear tag filter if category is selected
                        }}
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

                {/* Tag cloud filter buttons */}
                {allTags.length > 0 && (
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">Tag filters</label>
                    <div className="flex flex-wrap gap-1">
                      {allTags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                          className={`px-1.5 py-0.5 border text-[9px] uppercase rounded transition ${
                            selectedTag === tag
                              ? "border-success text-success bg-success/10 font-bold"
                              : "border-primary/10 text-gray-500 hover:border-primary/30"
                          }`}
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* [+] CREATE DOCUMENT BUTTON */}
                <div className="border-t border-primary/10 pt-3">
                  <button
                    onClick={triggerCreateForm}
                    className="w-full py-2 bg-black border border-primary text-primary font-bold uppercase rounded hover:bg-primary hover:text-black active:scale-95 transition text-xs shadow-[0_0_10px_rgba(0,255,255,0.05)]"
                  >
                    [+] ADD NEW DOCUMENT
                  </button>
                </div>

              </div>
            </Panel>

          </div>

          {/* MIDDLE COLUMN: Notes Feed (4 cols) */}
          <div className="lg:col-span-4">
            <Panel title={`ARCHIVE CATALOG FEED (${notes.length})`}>
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
                {isLoading && notes.length === 0 ? (
                  <div className="text-center text-xs text-primary animate-pulse py-8 uppercase tracking-widest">
                    SYNCING VAULT METADATA...
                  </div>
                ) : notes.length === 0 ? (
                  <div className="text-center py-12 text-xs text-gray-600 italic border border-dashed border-gray-800 rounded">
                    No matching research documents found.
                  </div>
                ) : (
                  notes.map((note) => (
                    <button
                      key={note.id}
                      onClick={() => handleSelectNote(note)}
                      className={`w-full text-left p-3 border rounded transition flex flex-col text-xs space-y-1.5 ${
                        selectedNote?.id === note.id
                          ? "border-[#00FFFF] bg-[#00FFFF]/5 text-[#00FFFF]"
                          : "border-primary/10 bg-black/25 text-gray-300 hover:border-primary/30"
                      }`}
                    >
                      <div className="flex justify-between w-full">
                        <span className="font-bold truncate text-[13px]">{note.title}</span>
                        <span className="text-[8px] bg-primary/10 border border-primary/20 text-primary px-1.5 py-0.5 rounded uppercase font-bold text-glow">
                          {note.category}
                        </span>
                      </div>
                      <p className="text-gray-500 line-clamp-2 leading-relaxed text-[11px]">
                        {note.description}
                      </p>
                      <div className="flex justify-between items-center text-[9px] pt-1">
                        <span className="text-gray-600">
                          {new Date(note.created_at).toLocaleDateString()}
                        </span>
                        <div className="flex space-x-1">
                          {note.tags.slice(0, 3).map((tag, idx) => (
                            <span key={idx} className="text-gray-500 bg-gray-900 px-1 rounded">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </Panel>
          </div>

          {/* RIGHT PANEL: Details / Editors (5 cols) */}
          <div className="lg:col-span-5">
            <Panel title="INTELLIGENCE DETAIL VIEWER / EDITOR">
              
              {/* Form editing / creating views */}
              {(isCreating || isEditing) ? (
                <form onSubmit={handleSaveDocument} className="space-y-4 text-xs">
                  <div className="flex justify-between items-center border-b border-primary/15 pb-2">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                      {isCreating ? "REGISTER NEW DOCUMENT" : "EDITING ARCHIVE FILE"}
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
                      placeholder="e.g. AETHER Propulsion Characteristics"
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

                  {/* Description input */}
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">Content Details</label>
                    <textarea
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Document text and intelligence notes..."
                      rows={10}
                      className="w-full bg-black border border-primary/20 focus:border-primary text-gray-300 px-2 py-1.5 rounded outline-none font-mono"
                    />
                  </div>

                  {/* Tags list (comma-separated list) */}
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">Tags (Comma-separated)</label>
                    <input
                      type="text"
                      value={formTagsString}
                      onChange={(e) => setFormTagsString(e.target.value)}
                      placeholder="Propulsion, AETHER, MRID-1607X"
                      className="w-full bg-black border border-primary/20 focus:border-primary text-gray-300 px-2 py-1.5 rounded outline-none"
                    />
                    <span className="text-[9px] text-gray-600 mt-1 block uppercase">System strips spaces and maps as JSON arrays</span>
                  </div>

                </form>
              ) : selectedNote ? (
                
                // Document Display View
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-primary/10 pb-2">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">DOCUMENT VIEW PANEL</span>
                    <div className="flex space-x-1">
                      <button
                        onClick={triggerEditForm}
                        className="px-2.5 py-1 border border-primary/20 hover:border-primary text-primary font-bold uppercase rounded transition active:scale-95 text-[10px]"
                      >
                        [EDIT]
                      </button>
                      <button
                        onClick={handleDeleteDocument}
                        className="px-2.5 py-1 bg-red-950/20 border border-danger text-danger hover:bg-danger hover:text-black font-bold uppercase rounded transition active:scale-95 text-[10px] text-glow-danger"
                      >
                        [DELETE]
                      </button>
                    </div>
                  </div>

                  {/* Header title details */}
                  <div>
                    <span className="text-[8px] bg-primary/10 border border-primary/20 text-primary px-1.5 py-0.5 rounded uppercase font-bold text-glow mr-2">
                      {selectedNote.category}
                    </span>
                    <h2 className="text-lg font-bold text-gray-200 mt-2">{selectedNote.title}</h2>
                    <span className="text-[9px] text-gray-500 block mt-1">
                      ID: {selectedNote.id} • CREATED: {new Date(selectedNote.created_at).toLocaleString()}
                    </span>
                  </div>

                  {/* Main text description block */}
                  <div className="bg-black/30 border border-primary/5 p-4 rounded text-xs font-mono whitespace-pre-wrap leading-relaxed text-gray-300 max-h-[300px] overflow-y-auto">
                    {selectedNote.description}
                  </div>

                  {/* Tag list badges */}
                  {selectedNote.tags.length > 0 && (
                    <div className="border-t border-primary/10 pt-3">
                      <span className="block text-[9px] text-gray-500 uppercase mb-1.5">DOCUMENT TAGS</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedNote.tags.map((tag, idx) => (
                          <span key={idx} className="px-2 py-0.5 border border-primary/15 bg-primary/5 text-primary text-[9px] uppercase rounded">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <div className="text-center py-16 text-xs text-gray-600 italic border border-dashed border-gray-800 rounded">
                  Select a document from the archive feed on the left to read or inspect details, or click [+] to register a new vault entry.
                </div>
              )}

            </Panel>
          </div>

        </div>

      </div>
    </BaseLayout>
  );
}
