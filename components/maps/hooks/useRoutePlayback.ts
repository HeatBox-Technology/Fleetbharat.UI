"use client";

import { useEffect, useRef, useState } from "react";
import type { RoutePoint } from "@/lib/mapTypes";

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function useRoutePlayback(route: RoutePoint[], speed = 1) {
  // speed: 1 = normal, 2 = faster, etc
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const raf = useRef<number | null>(null);
  const startTime = useRef<number>(0);
  const startProgress = useRef<number>(0);

  const durationMs = Math.max(2000, route.length * 200); // simple heuristic (adjust as you like)

  useEffect(() => {
    // reset when route changes
    setIsPlaying(false);
    setProgress(0);
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
  }, [route]);

  const play = () => {
    if (!route?.length) return;
    setIsPlaying(true);
    startTime.current = performance.now();
    startProgress.current = progress;

    const step = (now: number) => {
      const elapsed = (now - startTime.current) * speed;
      const t = Math.min(1, startProgress.current + elapsed / durationMs);
      setProgress(t);

      if (t < 1) raf.current = requestAnimationFrame(step);
      else setIsPlaying(false);
    };

    raf.current = requestAnimationFrame(step);
  };

  const pause = () => {
    setIsPlaying(false);
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
  };

  const seek = (t: number) => setProgress(Math.min(1, Math.max(0, t)));

  // Current point from progress
  const current = (() => {
    if (!route?.length) return null;
    if (route.length === 1) return route[0];

    const idxFloat = progress * (route.length - 1);
    const idx = Math.floor(idxFloat);
    const frac = idxFloat - idx;

    const a = route[idx];
    const b = route[Math.min(route.length - 1, idx + 1)];

    return {
      lat: lerp(a.lat, b.lat, frac),
      lng: lerp(a.lng, b.lng, frac),
      heading: a.heading ?? b.heading,
      speed: a.speed ?? b.speed,
      timestamp: a.timestamp ?? b.timestamp,
    };
  })();

  return { isPlaying, progress, current, play, pause, seek, setIsPlaying };
}
