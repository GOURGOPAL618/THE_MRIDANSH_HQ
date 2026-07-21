"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import BaseLayout from "../../layouts/BaseLayout";
import Panel from "../../components/Panel";
import { api } from "../../services/api";
import { EarthGlobeRef } from "../../components/EarthGlobe";

// Dynamically import EarthGlobe with SSR disabled to prevent server-side WebGL loading failures
const EarthGlobe = dynamic(() => import("../../components/EarthGlobe"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#05070B] min-h-[600px] border border-primary/20 rounded">
      <div className="text-[#00FFFF] font-mono text-xs uppercase tracking-widest animate-pulse mb-3">
        INITIALIZING ORBITAL GLOBAL WEBGL ENGINE...
      </div>
      <div className="w-48 h-1 bg-[#00FFFF]/10 rounded overflow-hidden relative">
        <div 
          className="h-full bg-[#00FFFF] rounded"
          style={{
            width: "50%",
            animation: "shimmer 1.5s infinite linear",
            backgroundImage: "linear-gradient(to right, transparent, rgba(255,255,255,0.4), transparent)"
          }}
        />
      </div>
    </div>
  ),
});

interface Bookmark {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  altitude: number;
}

interface ApiResponseEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export default function EarthOperationsPage() {
  const globeRef = useRef<EarthGlobeRef>(null);

  // States
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(true);
  const [newBookmarkName, setNewBookmarkName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search/Coordinates HUD states
  const [hoverCoords, setHoverCoords] = useState<{ latitude: number; longitude: number; altitude: number } | null>(null);
  const [cameraCoords, setCameraCoords] = useState<{ latitude: number; longitude: number; altitude: number }>({
    latitude: 21.03,
    longitude: 80.24,
    altitude: 10000000.0,
  });

  // Layer settings
  const [activeBaseLayer, setActiveBaseLayer] = useState<"nasa" | "satellite" | "vector">("nasa");
  const [showBorders, setShowBorders] = useState(true);
  const [showClouds, setShowClouds] = useState(false);
  const [enableLighting, setEnableLighting] = useState(true);

  // Custom Search Query input
  const [searchQuery, setSearchQuery] = useState("");

  // Preset location flight targets
  const presets = [
    { name: "THE MRIDANSH HQ (India)", lat: 21.03, lon: 80.24, alt: 300000 },
    { name: "NASA Kennedy Space Center", lat: 28.5721, lon: -80.648, alt: 150000 },
    { name: "Svalbard Satellite Station", lat: 78.2297, lon: 15.4077, alt: 250000 },
    { name: "Esrange Space Center (Sweden)", lat: 67.8933, lon: 21.1072, alt: 200000 },
  ];

  // Fetch bookmarks
  const fetchBookmarks = async () => {
    setIsLoadingBookmarks(true);
    try {
      const response = await api.get<ApiResponseEnvelope<Bookmark[]>>("/api/v1/earth/bookmarks");
      if (response.data && response.data.success) {
        setBookmarks(response.data!.data);
        setErrorMsg(null);
      } else if (response.error) {
        setErrorMsg(response.error);
      }
    } catch {
      setErrorMsg("Failed to synchronize coordinate bookmarks.");
    } finally {
      setIsLoadingBookmarks(false);
    }
  };

  useEffect(() => {
    fetchBookmarks();
  }, []);

  // Save new bookmark
  const handleSaveBookmark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookmarkName.trim()) return;

    setIsSaving(true);
    setErrorMsg(null);
    try {
      // Use current camera coordinates as bookmark target
      const payload = {
        name: newBookmarkName.trim(),
        latitude: cameraCoords.latitude,
        longitude: cameraCoords.longitude,
        altitude: cameraCoords.altitude,
      };

      const response = await api.post<ApiResponseEnvelope<Bookmark>>("/api/v1/earth/bookmarks", payload);
      if (response.data && response.data.success) {
        setBookmarks((prev) => [response.data!.data, ...prev]);
        setNewBookmarkName("");
      } else if (response.error) {
        setErrorMsg(response.error);
      }
    } catch {
      setErrorMsg("Failed to write coordinate bookmark to remote datastore.");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete bookmark
  const handleDeleteBookmark = async (id: string) => {
    setErrorMsg(null);
    try {
      const response = await api.delete(`/api/v1/earth/bookmarks/${id}`);
      if (!response.error) {
        setBookmarks((prev) => prev.filter((b) => b.id !== id));
      } else {
        setErrorMsg(response.error);
      }
    } catch {
      setErrorMsg("Failed to delete coordinate bookmark.");
    }
  };

  // Flying utilities
  const handlePresetFly = (lat: number, lon: number, alt: number) => {
    globeRef.current?.flyTo(lat, lon, alt);
  };

  // Custom Search Query parser
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Check if coordinates format: "lat, lon" or "lat, lon, alt"
    const coordPattern = /^(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)(?:\s*,\s*(\d+(\.\d+)?))?$/;
    const match = searchQuery.trim().match(coordPattern);

    if (match) {
      const lat = parseFloat(match[1]);
      const lon = parseFloat(match[3]);
      const alt = match[5] ? parseFloat(match[5]) : 200000.0;
      
      if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180 && alt >= 0) {
        globeRef.current?.flyTo(lat, lon, alt);
        setErrorMsg(null);
        return;
      }
    }

    setErrorMsg("Invalid coordinate format. Enter: Latitude, Longitude (e.g. 28.57, -80.64)");
  };

  // Layer switches
  const handleBaseLayerChange = (layer: "nasa" | "satellite" | "vector") => {
    setActiveBaseLayer(layer);
    globeRef.current?.setBaseLayer(layer);
  };

  const handleBordersToggle = () => {
    const nextVal = !showBorders;
    setShowBorders(nextVal);
    globeRef.current?.toggleBorders(nextVal);
  };

  const handleCloudsToggle = () => {
    const nextVal = !showClouds;
    setShowClouds(nextVal);
    globeRef.current?.toggleClouds(nextVal);
  };

  const handleLightingToggle = () => {
    const nextVal = !enableLighting;
    setEnableLighting(nextVal);
    globeRef.current?.toggleLighting(nextVal);
  };

  return (
    <BaseLayout>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 font-mono text-sm">
        
        {/* Main interactive globe viewport panel */}
        <div className="lg:col-span-3 flex flex-col space-y-4">
          <Panel
            title="EARTH ORBITAL RADIAL GRID"
            subtitle="Live 3D Telemetry Mapping Station"
            statusIndicator="healthy"
            headerActions={
              <div className="flex space-x-2 text-xs">
                <button 
                  onClick={() => globeRef.current?.zoomIn()}
                  className="px-2 py-1 bg-black border border-primary/20 hover:border-primary text-primary transition active:scale-95"
                  title="Zoom In"
                >
                  [+] ZOOM IN
                </button>
                <button 
                  onClick={() => globeRef.current?.zoomOut()}
                  className="px-2 py-1 bg-black border border-primary/20 hover:border-primary text-primary transition active:scale-95"
                  title="Zoom Out"
                >
                  [-] ZOOM OUT
                </button>
                <button 
                  onClick={() => globeRef.current?.resetView()}
                  className="px-2 py-1 bg-black border border-primary/20 hover:border-primary text-[#00FFFF] transition active:scale-95"
                  title="Reset Camera view to Base HQ"
                >
                  [¤] RESET
                </button>
              </div>
            }
          >
            {/* Cesium Widget canvas container */}
            <div className="relative w-full h-[550px] bg-black border border-primary/10 rounded overflow-hidden">
              <EarthGlobe 
                ref={globeRef}
                onCoordinatesChange={setHoverCoords}
                onCameraChange={setCameraCoords}
              />

              {/* Cursor coordinates overlay (Aerospace HUD style) */}
              {hoverCoords && (
                <div className="absolute bottom-4 left-4 bg-[#05070B]/90 border border-primary/20 px-3 py-2 text-[10px] text-primary space-y-1 rounded shadow-lg pointer-events-none max-w-xs z-10">
                  <div className="text-[11px] font-bold border-b border-primary/10 pb-1 uppercase tracking-wider text-[#00FFFF]">
                    Target Crosshair HUD
                  </div>
                  <div>LAT: {hoverCoords.latitude.toFixed(6)}°</div>
                  <div>LON: {hoverCoords.longitude.toFixed(6)}°</div>
                  <div>ALT: {(hoverCoords.altitude / 1000).toFixed(2)} KM</div>
                </div>
              )}

              {/* Active Camera Viewport stats overlay */}
              <div className="absolute top-4 left-4 bg-[#05070B]/90 border border-[#00FFFF]/20 px-3 py-2 text-[10px] text-[#00FFFF] space-y-1 rounded shadow-lg pointer-events-none max-w-xs z-10">
                <div className="text-[11px] font-bold border-b border-[#00FFFF]/10 pb-1 uppercase tracking-wider">
                  Orbit Viewport
                </div>
                <div>CAM LAT: {cameraCoords.latitude.toFixed(4)}°</div>
                <div>CAM LON: {cameraCoords.longitude.toFixed(4)}°</div>
                <div>ALTITUDE: {(cameraCoords.altitude / 1000).toFixed(1)} KM</div>
              </div>
            </div>
          </Panel>

          {/* Preset location short-links panel */}
          <Panel title="preset command centers" subtitle="Orbital Quick Link Flight Keys">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-1">
              {presets.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handlePresetFly(preset.lat, preset.lon, preset.alt)}
                  className="p-3 text-left border border-primary/15 bg-black/35 hover:bg-primary/5 hover:border-primary text-gray-300 hover:text-primary transition rounded text-xs"
                >
                  <div className="font-bold text-[#00FFFF] truncate mb-1">{preset.name}</div>
                  <div className="text-[10px] text-gray-500">
                    {preset.lat.toFixed(3)}°, {preset.lon.toFixed(3)}°
                  </div>
                </button>
              ))}
            </div>
          </Panel>
        </div>

        {/* Sidebar Controls panel */}
        <div className="lg:col-span-1 flex flex-col space-y-6">

          {/* Custom coordinate search utility */}
          <Panel title="orbital search tracker">
            <form onSubmit={handleSearchSubmit} className="space-y-3">
              <div className="text-xs text-gray-500">Enter coordinates format: <code className="text-gray-300">Lat, Lon</code></div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="21.03, 80.24"
                className="w-full bg-black border border-primary/20 focus:border-primary text-primary px-3 py-2 text-xs rounded outline-none"
              />
              <button
                type="submit"
                className="w-full bg-primary/10 border border-primary/30 hover:bg-primary/25 text-primary text-xs py-2 uppercase font-bold tracking-widest transition rounded"
              >
                Track Coordinates
              </button>
            </form>
          </Panel>

          {/* Satellite Layer configurations */}
          <Panel title="imagery layer dashboard">
            <div className="space-y-4">
              {/* Base Layer Switchers */}
              <div>
                <label className="block text-[11px] text-[#00FFFF] uppercase tracking-wider mb-2">Base Imagery Layer</label>
                <div className="grid grid-cols-3 gap-1 bg-black p-1 border border-primary/15 rounded">
                  {(["nasa", "satellite", "vector"] as const).map((layer) => (
                    <button
                      key={layer}
                      onClick={() => handleBaseLayerChange(layer)}
                      className={`py-1 text-[10px] uppercase font-bold rounded transition ${
                        activeBaseLayer === layer
                          ? "bg-primary text-black"
                          : "text-gray-400 hover:text-primary"
                      }`}
                    >
                      {layer === "nasa" ? "NASA" : layer === "satellite" ? "SAT" : "VECT"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Overlay togglers */}
              <div className="space-y-2 border-t border-primary/10 pt-3">
                <label className="block text-[11px] text-[#00FFFF] uppercase tracking-wider mb-2">Filters & Indicators</label>
                
                <div className="flex items-center justify-between py-1">
                  <span className="text-xs text-gray-400">COUNTRY BORDERS</span>
                  <button
                    onClick={handleBordersToggle}
                    className={`px-2 py-0.5 text-[10px] border uppercase rounded transition font-bold ${
                      showBorders
                        ? "border-[#00FFFF] text-[#00FFFF] bg-[#00FFFF]/5"
                        : "border-gray-700 text-gray-500"
                    }`}
                  >
                    {showBorders ? "ON" : "OFF"}
                  </button>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-xs text-gray-400">NASA CLOUD FRACTION</span>
                  <button
                    onClick={handleCloudsToggle}
                    className={`px-2 py-0.5 text-[10px] border uppercase rounded transition font-bold ${
                      showClouds
                        ? "border-[#00FFFF] text-[#00FFFF] bg-[#00FFFF]/5"
                        : "border-gray-700 text-gray-500"
                    }`}
                  >
                    {showClouds ? "ON" : "OFF"}
                  </button>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-xs text-gray-400">DAY/NIGHT SHADOW</span>
                  <button
                    onClick={handleLightingToggle}
                    className={`px-2 py-0.5 text-[10px] border uppercase rounded transition font-bold ${
                      enableLighting
                        ? "border-[#00FFFF] text-[#00FFFF] bg-[#00FFFF]/5"
                        : "border-gray-700 text-gray-500"
                    }`}
                  >
                    {enableLighting ? "ON" : "OFF"}
                  </button>
                </div>
              </div>
            </div>
          </Panel>

          {/* Bookmarks Manager */}
          <Panel title="orbit bookmarks">
            <div className="space-y-4">
              
              {/* Save current location form */}
              <form onSubmit={handleSaveBookmark} className="space-y-2 pb-3 border-b border-primary/10">
                <label className="block text-[10px] text-gray-500 uppercase">Save Current Viewport</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    required
                    value={newBookmarkName}
                    onChange={(e) => setNewBookmarkName(e.target.value)}
                    placeholder="Bookmark Title..."
                    className="flex-1 bg-black border border-primary/20 focus:border-primary text-primary px-3 py-1.5 text-xs rounded outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="bg-primary hover:bg-primary/85 text-black px-3 py-1.5 text-xs font-bold rounded transition disabled:opacity-50"
                  >
                    {isSaving ? "SAVING..." : "SAVE"}
                  </button>
                </div>
              </form>

              {/* Feed errors notification inside HUD card */}
              {errorMsg && (
                <div className="text-[10px] text-red-400 bg-red-950/20 border border-red-500/30 p-2 rounded leading-relaxed uppercase">
                  ERROR: {errorMsg}
                </div>
              )}

              {/* Bookmarks list feed */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {isLoadingBookmarks ? (
                  <div className="text-center text-xs text-gray-500 py-3 animate-pulse">
                    SYNCHRONIZING COORDINATE FEED...
                  </div>
                ) : bookmarks.length === 0 ? (
                  <div className="text-center text-xs text-gray-600 py-4 italic border border-dashed border-gray-800 rounded">
                    No coordinate bookmarks found.
                  </div>
                ) : (
                  bookmarks.map((bm) => (
                    <div 
                      key={bm.id}
                      className="flex items-center justify-between p-2 border border-primary/10 bg-black/20 rounded hover:border-primary/30 transition group"
                    >
                      <button
                        onClick={() => handlePresetFly(bm.latitude, bm.longitude, bm.altitude)}
                        className="flex-1 text-left text-xs font-bold text-gray-300 hover:text-[#00FFFF] transition truncate"
                        title="Fly camera viewport to saved coordinates"
                      >
                        <div>{bm.name}</div>
                        <div className="text-[9px] font-normal text-gray-500">
                          {bm.latitude.toFixed(4)}°, {bm.longitude.toFixed(4)}°
                        </div>
                      </button>
                      
                      <button
                        onClick={() => handleDeleteBookmark(bm.id)}
                        className="text-red-400 hover:text-red-600 text-[10px] pl-2 opacity-50 group-hover:opacity-100 transition"
                        title="Delete this bookmark"
                      >
                        [DEL]
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Panel>

        </div>

      </div>
    </BaseLayout>
  );
}
