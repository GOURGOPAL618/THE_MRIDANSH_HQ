"use client";

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import * as Cesium from "cesium";
import "cesium/Source/Widgets/widgets.css";

// Set base URL for Cesium assets copied via prebuild script
if (typeof window !== "undefined") {
  ((window as unknown) as { CESIUM_BASE_URL: string }).CESIUM_BASE_URL = "/cesium";
}

interface CoordinateInfo {
  latitude: number;
  longitude: number;
  altitude: number;
}

export interface EarthGlobeRef {
  zoomIn: () => void;
  zoomOut: () => void;
  rotateGlobe: (direction: "left" | "right") => void;
  resetView: () => void;
  flyTo: (latitude: number, longitude: number, altitude?: number) => void;
  getCurrentCoordinates: () => CoordinateInfo | null;
  setBaseLayer: (layerType: "nasa" | "satellite" | "vector") => void;
  toggleBorders: (show: boolean) => void;
  toggleClouds: (show: boolean) => void;
  toggleLighting: (show: boolean) => void;
}

interface EarthGlobeProps {
  onCoordinatesChange?: (coords: CoordinateInfo) => void;
  onCameraChange?: (coords: CoordinateInfo) => void;
}

const EarthGlobe = forwardRef<EarthGlobeRef, EarthGlobeProps>(
  ({ onCoordinatesChange, onCameraChange }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<Cesium.Viewer | null>(null);

    // Dynamic layer layers refs
    const bordersLayerRef = useRef<Cesium.ImageryLayer | null>(null);
    const cloudsLayerRef = useRef<Cesium.ImageryLayer | null>(null);
    const baseLayersRef = useRef<{
      nasa: Cesium.ImageryLayer | null;
      satellite: Cesium.ImageryLayer | null;
      vector: Cesium.ImageryLayer | null;
    }>({ nasa: null, satellite: null, vector: null });

    // Expose control actions to parent
    useImperativeHandle(ref, () => ({
      zoomIn: () => {
        if (!viewerRef.current) return;
        viewerRef.current.camera.zoomIn(viewerRef.current.camera.positionCartographic.height * 0.3);
      },
      zoomOut: () => {
        if (!viewerRef.current) return;
        viewerRef.current.camera.zoomOut(viewerRef.current.camera.positionCartographic.height * 0.3);
      },
      rotateGlobe: (direction: "left" | "right") => {
        if (!viewerRef.current) return;
        const angle = direction === "left" ? 0.1 : -0.1;
        viewerRef.current.camera.rotate(Cesium.Cartesian3.UNIT_Z, angle);
      },
      resetView: () => {
        if (!viewerRef.current) return;
        viewerRef.current.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(80.24, 21.03, 10000000.0), // Centered generally above Central India/HQ
          duration: 1.5,
        });
      },
      flyTo: (lat: number, lon: number, alt: number = 200000.0) => {
        if (!viewerRef.current) return;
        viewerRef.current.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
          duration: 2.0,
        });
      },
      getCurrentCoordinates: () => {
        if (!viewerRef.current) return null;
        const camera = viewerRef.current.camera;
        const cartographic = Cesium.Cartographic.fromCartesian(camera.position);
        return {
          latitude: Number(Cesium.Math.toDegrees(cartographic.latitude).toFixed(6)),
          longitude: Number(Cesium.Math.toDegrees(cartographic.longitude).toFixed(6)),
          altitude: Number(cartographic.height.toFixed(1)),
        };
      },
      setBaseLayer: (layerType) => {
        if (!viewerRef.current) return;
        const layers = viewerRef.current.imageryLayers;

        // Hide all base layers
        if (baseLayersRef.current.nasa) baseLayersRef.current.nasa.show = false;
        if (baseLayersRef.current.satellite) baseLayersRef.current.satellite.show = false;
        if (baseLayersRef.current.vector) baseLayersRef.current.vector.show = false;

        // Show selected
        const targetLayer = baseLayersRef.current[layerType];
        if (targetLayer) {
          targetLayer.show = true;
          // Ensure base layer stays at bottom
          layers.lowerToBottom(targetLayer);
        }
      },
      toggleBorders: (show) => {
        if (bordersLayerRef.current) {
          bordersLayerRef.current.show = show;
        }
      },
      toggleClouds: (show) => {
        if (cloudsLayerRef.current) {
          cloudsLayerRef.current.show = show;
        }
      },
      toggleLighting: (show) => {
        if (viewerRef.current) {
          viewerRef.current.scene.globe.enableLighting = show;
        }
      },
    }));

    useEffect(() => {
      if (!containerRef.current) return;

      // Configure Cesium Access Token safely
      const ionToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
      if (ionToken && ionToken !== "placeholder_cesium_token") {
        Cesium.Ion.defaultAccessToken = ionToken;
      }

      // Initialize Viewer
      const viewer = new Cesium.Viewer(containerRef.current, {
        animation: false,
        timeline: false,
        infoBox: false,
        selectionIndicator: false,
        navigationHelpButton: false,
        homeButton: false,
        sceneModePicker: false,
        baseLayerPicker: false,
        geocoder: false, // Handled custom
        skyBox: false, // Dark cosmic background styled via mission control theme
        creditContainer: document.createElement("div"), // Hide watermark overlay
      });

      viewerRef.current = viewer;

      // Custom black space background styling
      viewer.scene.backgroundColor = Cesium.Color.BLACK;
      viewer.scene.globe.baseColor = Cesium.Color.BLACK;
      viewer.scene.globe.enableLighting = true; // Enabled day/night by default
      if (viewer.scene.skyAtmosphere) {
        viewer.scene.skyAtmosphere.show = true; // Atmosphere rendering enabled
      }

      const layers = viewer.imageryLayers;

      // Build Base Layers
      // 1. NASA GIBS Layer
      const nasaProvider = new Cesium.UrlTemplateImageryProvider({
        url: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg",
        maximumLevel: 9,
        credit: "NASA EOSDIS GIBS",
      });
      baseLayersRef.current.nasa = layers.addImageryProvider(nasaProvider);
      baseLayersRef.current.nasa.show = true;

      // 2. OpenStreetMap Layer
      const vectorProvider = new Cesium.OpenStreetMapImageryProvider({
        url: "https://a.tile.openstreetmap.org/",
      });
      baseLayersRef.current.vector = layers.addImageryProvider(vectorProvider);
      baseLayersRef.current.vector.show = false;

      // 3. Cesium Ion Sentinel-2 Satellite Default
      try {
        const satelliteProvider = Cesium.createWorldImageryAsync({
          style: Cesium.IonWorldImageryStyle.AERIAL,
        });
        satelliteProvider.then((provider) => {
          if (viewerRef.current) {
            baseLayersRef.current.satellite = layers.addImageryProvider(provider);
            baseLayersRef.current.satellite.show = false;
            // Always keep base layers at the bottom
            layers.lowerToBottom(baseLayersRef.current.satellite);
          }
        }).catch(() => {});
      } catch {}

      // Build Overlays
      // 1. Borders Layer (NASA GIBS reference land borders)
      const bordersProvider = new Cesium.UrlTemplateImageryProvider({
        url: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/Reference_Features_1.1/default/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png",
        maximumLevel: 9,
        credit: "NASA EOSDIS GIBS",
      });
      bordersLayerRef.current = layers.addImageryProvider(bordersProvider);
      bordersLayerRef.current.show = true;

      // 2. NASA GIBS dynamic clouds (Cloud Fraction)
      const cloudsProvider = new Cesium.UrlTemplateImageryProvider({
        url: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_Cloud_Fraction_Day/default/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png",
        maximumLevel: 9,
        credit: "NASA EOSDIS GIBS",
      });
      cloudsLayerRef.current = layers.addImageryProvider(cloudsProvider);
      cloudsLayerRef.current.show = false; // Hidden by default

      // Initial Camera flying to JCC Headquarter (India)
      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(80.24, 21.03, 10000000.0),
      });

      // Mouse Move Event Listener for Coordinate HUD
      const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
      handler.setInputAction((movement: { endPosition: Cesium.Cartesian2 }) => {
        if (!viewerRef.current) return;
        const scene = viewerRef.current.scene;
        const cartesian = viewerRef.current.camera.pickEllipsoid(
          movement.endPosition,
          scene.globe.ellipsoid
        );

        if (cartesian && onCoordinatesChange) {
          const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
          onCoordinatesChange({
            latitude: Number(Cesium.Math.toDegrees(cartographic.latitude).toFixed(6)),
            longitude: Number(Cesium.Math.toDegrees(cartographic.longitude).toFixed(6)),
            altitude: Number(cartographic.height.toFixed(1)),
          });
        }
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

      // Camera Change Event Listener
      viewer.camera.changed.addEventListener(() => {
        if (!viewerRef.current || !onCameraChange) return;
        const camera = viewerRef.current.camera;
        const cartographic = Cesium.Cartographic.fromCartesian(camera.position);
        onCameraChange({
          latitude: Number(Cesium.Math.toDegrees(cartographic.latitude).toFixed(6)),
          longitude: Number(Cesium.Math.toDegrees(cartographic.longitude).toFixed(6)),
          altitude: Number(cartographic.height.toFixed(1)),
        });
      });

      // Cleanup
      return () => {
        handler.destroy();
        if (viewerRef.current && !viewerRef.current.isDestroyed()) {
          viewerRef.current.destroy();
        }
        viewerRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <div className="w-full h-full relative overflow-hidden bg-black">
        <div ref={containerRef} className="w-full h-full" style={{ minHeight: "500px" }} />
      </div>
    );
  }
);

EarthGlobe.displayName = "EarthGlobe";

export default React.memo(EarthGlobe);
