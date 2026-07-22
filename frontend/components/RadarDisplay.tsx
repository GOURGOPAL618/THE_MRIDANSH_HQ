"use client";

import React, { useEffect, useRef } from "react";

export interface RadarTarget {
  id: string;
  designation: string;
  bearing: number;  // degrees
  distance: number; // km
  speed: number;    // knots
  elevation: number; // degrees
  type: string;
  status: string;
}

interface RadarDisplayProps {
  targets: RadarTarget[];
  selectedTargetId: string | null;
  onSelectTarget: (target: RadarTarget | null) => void;
  showNoise: boolean;
  maxRange: number; // e.g. 200
  sweepSpeed: number; // degrees per frame
}

export default function RadarDisplay({
  targets,
  selectedTargetId,
  onSelectTarget,
  showNoise,
  maxRange = 200,
  sweepSpeed = 1.0,
}: RadarDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number | null>(null);
  const sweepAngleRef = useRef<number>(0);
  const targetsRef = useRef<RadarTarget[]>(targets);
  const selectedTargetIdRef = useRef<string | null>(selectedTargetId);
  const onSelectTargetRef = useRef(onSelectTarget);

  // Radar image assets references
  const radarImageRef = useRef<HTMLImageElement | null>(null);
  const gridImageRef = useRef<HTMLImageElement | null>(null);

  // Intensity trackers to animate target sweeps fading out
  const targetIntensities = useRef<{ [key: string]: number }>({});

  // Sync references to avoid re-triggering requestAnimationFrame loop
  useEffect(() => {
    targetsRef.current = targets;
  }, [targets]);

  useEffect(() => {
    selectedTargetIdRef.current = selectedTargetId;
  }, [selectedTargetId]);

  useEffect(() => {
    onSelectTargetRef.current = onSelectTarget;
  }, [onSelectTarget]);

  // Load image assets on mount
  useEffect(() => {
    const rImg = new Image();
    rImg.src = "/radar/radar.png";
    rImg.onload = () => {
      radarImageRef.current = rImg;
    };
    const gImg = new Image();
    gImg.src = "/radar/radar-grid.png";
    gImg.onload = () => {
      gridImageRef.current = gImg;
    };
  }, []);

  // Click handler to select targets
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const size = canvas.width / (window.devicePixelRatio || 1);
    const centerX = size / 2;
    const centerY = size / 2;
    const maxRadius = (size / 2) - 30;

    // Filter clicked targets
    let closestTarget: RadarTarget | null = null;
    let minClickRadius = 15; // Click tolerance in pixels

    for (const tgt of targetsRef.current) {
      // Calculate target polar coordinates position in pixels
      const rad = (tgt.bearing - 90) * (Math.PI / 180);
      const distPercent = tgt.distance / maxRange;
      const targetRadius = distPercent * maxRadius;

      const tx = centerX + targetRadius * Math.cos(rad);
      const ty = centerY + targetRadius * Math.sin(rad);

      const tdx = x - tx;
      const tdy = y - ty;
      const dist = Math.sqrt(tdx * tdx + tdy * tdy);

      if (dist < minClickRadius) {
        closestTarget = tgt;
        minClickRadius = dist;
      }
    }

    onSelectTargetRef.current(closestTarget);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle high DPI retina screens
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const size = Math.min(parent.clientWidth, 600);
      const dpr = window.devicePixelRatio || 1;

      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Core Animation loop running at 60 FPS
    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const size = canvas.width / dpr;
      const centerX = size / 2;
      const centerY = size / 2;
      const maxRadius = (size / 2) - 30;

      // 1. Clear background
      ctx.fillStyle = "#05070B";
      ctx.fillRect(0, 0, size, size);

      // Draw static grid asset if loaded
      if (gridImageRef.current) {
        ctx.globalAlpha = 0.15;
        ctx.drawImage(gridImageRef.current, centerX - maxRadius, centerY - maxRadius, maxRadius * 2, maxRadius * 2);
        ctx.globalAlpha = 1.0;
      }

      // Draw concentric rings lines on top for visual precision
      ctx.strokeStyle = "rgba(0, 255, 255, 0.08)";
      ctx.lineWidth = 1;
      const rings = 4;
      for (let i = 1; i <= rings; i++) {
        const radius = (maxRadius / rings) * i;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.stroke();

        // Print distance indicators
        ctx.fillStyle = "rgba(0, 255, 255, 0.4)";
        ctx.font = "8px monospace";
        const rangeText = `${Math.round((maxRange / rings) * i)} KM`;
        ctx.fillText(rangeText, centerX + 5, centerY - radius + 12);
      }

      // 3. Draw crosshairs lines (Bearing lines)
      ctx.strokeStyle = "rgba(0, 255, 255, 0.05)";
      for (let angle = 0; angle < 360; angle += 30) {
        const rad = angle * (Math.PI / 180);
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + maxRadius * Math.cos(rad), centerY + maxRadius * Math.sin(rad));
        ctx.stroke();
      }

      // 4. Update sweep rotation
      sweepAngleRef.current = (sweepAngleRef.current + sweepSpeed) % 360;

      // 5. Draw sweep beam with trailing fade gradient tail
      const currentRad = (sweepAngleRef.current - 90) * (Math.PI / 180);
      
      // Draw gradient trailing tail
      const tailResolution = 60; // angular segments of trail fading out
      for (let i = 0; i < tailResolution; i++) {
        const stepAngle = sweepAngleRef.current - 90 - i * 0.8;
        const startRad = stepAngle * (Math.PI / 180);
        const endRad = (stepAngle + 1.0) * (Math.PI / 180);
        const opacity = (1.0 - i / tailResolution) * 0.15;

        ctx.fillStyle = `rgba(0, 255, 255, ${opacity})`;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, maxRadius, startRad, endRad);
        ctx.closePath();
        ctx.fill();
      }

      // Draw rotating radar overlay if loaded
      if (radarImageRef.current) {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(currentRad + Math.PI / 2); // Sync rotation angle
        ctx.globalAlpha = 0.3; // Glow opacity
        ctx.drawImage(radarImageRef.current, -maxRadius, -maxRadius, maxRadius * 2, maxRadius * 2);
        ctx.restore();
      }

      // Draw primary sweep line beam
      ctx.strokeStyle = "rgba(0, 255, 255, 0.8)";
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#00FFFF";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + maxRadius * Math.cos(currentRad), centerY + maxRadius * Math.sin(currentRad));
      ctx.stroke();

      // Reset shadow mapping to avoid canvas blur cascades
      ctx.shadowBlur = 0;

      // 6. Draw Targets
      const curAngle = sweepAngleRef.current;

      for (const tgt of targetsRef.current) {
        const tgtAngle = tgt.bearing;
        
        // Calculate angular distance between sweep beam and target position
        // Wrapping target check across 0-360 angle boundary
        let angularDiff = curAngle - tgtAngle;
        if (angularDiff < 0) angularDiff += 360;

        // Reset target sweep intensity to 1.0 when sweep intersects it
        if (angularDiff < sweepSpeed * 1.5) {
          targetIntensities.current[tgt.id] = 1.0;
        } else {
          // Gradual decay of intensity
          const prev = targetIntensities.current[tgt.id] || 0.05;
          targetIntensities.current[tgt.id] = Math.max(0.05, prev - 0.003); //Snappy fade tail
        }

        const intensity = targetIntensities.current[tgt.id] || 0.05;

        // Target position coordinates in pixels
        const rad = (tgt.bearing - 90) * (Math.PI / 180);
        const distPercent = tgt.distance / maxRange;
        const targetRadius = distPercent * maxRadius;

        const tx = centerX + targetRadius * Math.cos(rad);
        const ty = centerY + targetRadius * Math.sin(rad);

        // Draw outer pulsing radar ring
        ctx.strokeStyle = tgt.status === "locked" || selectedTargetIdRef.current === tgt.id
          ? `rgba(239, 68, 68, ${intensity})`
          : `rgba(0, 255, 255, ${intensity * 0.3})`;
        ctx.beginPath();
        ctx.arc(tx, ty, 8 + Math.sin(Date.now() / 150) * 2, 0, 2 * Math.PI);
        ctx.stroke();

        // Draw target center dot
        ctx.fillStyle = tgt.status === "locked" || selectedTargetIdRef.current === tgt.id
          ? `rgba(239, 68, 68, ${Math.max(0.4, intensity)})`
          : `rgba(0, 255, 255, ${Math.max(0.3, intensity)})`;
        ctx.beginPath();
        ctx.arc(tx, ty, 3, 0, 2 * Math.PI);
        ctx.fill();

        // Print target tag label (locked or active)
        if (selectedTargetIdRef.current === tgt.id) {
          ctx.fillStyle = "#EF4444";
          ctx.font = "bold 9px monospace";
          ctx.fillText(`[LOCK: ${tgt.id}]`, tx + 10, ty - 5);
        } else if (intensity > 0.4) {
          ctx.fillStyle = "rgba(0, 255, 255, 0.8)";
          ctx.font = "8px monospace";
          ctx.fillText(tgt.id, tx + 8, ty - 4);
        }

        // Draw lock-on reticle boxes if selected/locked
        if (selectedTargetIdRef.current === tgt.id) {
          ctx.strokeStyle = "#EF4444";
          ctx.lineWidth = 1;
          const boxSize = 12 + Math.sin(Date.now() / 100) * 1.5;
          ctx.strokeRect(tx - boxSize / 2, ty - boxSize / 2, boxSize, boxSize);
          
          // Draw coordinates pointer line linking back to center
          ctx.strokeStyle = "rgba(239, 68, 68, 0.25)";
          ctx.setLineDash([2, 4]);
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(tx, ty);
          ctx.stroke();
          ctx.setLineDash([]); // Reset dash array
        }
      }

      // 7. Draw Signal Static Noise Overlay (draw random noise pixels if enabled)
      if (showNoise) {
        ctx.fillStyle = "rgba(0, 255, 255, 0.035)";
        for (let k = 0; k < 120; k++) {
          const rx = Math.random() * size;
          const ry = Math.random() * size;
          ctx.fillRect(rx, ry, 1, 1);
        }
      }

      // Request next frame
      requestRef.current = requestAnimationFrame(render);
    };

    // Trigger loop
    requestRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [sweepSpeed, showNoise, maxRange]);

  return (
    <div className="w-full flex justify-center items-center bg-black/40 p-4 border border-primary/10 rounded relative select-none">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="cursor-crosshair active:scale-[0.99] transition-transform duration-100"
      />
    </div>
  );
}
