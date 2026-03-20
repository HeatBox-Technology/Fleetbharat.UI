"use client";

import { useEffect, useRef, useState } from "react";
import type { Vehicle } from "@/lib/mapTypes";

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

type Options = {
  pollMs?: number;
  smoothMs?: number;
};

export function useVehiclesLive(
  fetchVehicles: () => Promise<Vehicle[]>,
  opts: Options = {},
) {
  const pollMs = opts.pollMs ?? 3000;
  const smoothMs = opts.smoothMs ?? 900;

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const prevRef = useRef<Map<string, Vehicle>>(new Map());
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    let timer: any;

    let isUnmounted = false;

    const tick = async () => {
      const latest = await fetchVehicles();
      if (!latest) return;

      const prevMap = prevRef.current;
      const nextMap = new Map(latest.map((v) => [v.id, v]));

      // animate positions from prev -> latest
      const start = performance.now();

      if (animRef.current) cancelAnimationFrame(animRef.current);

      const step = (now: number) => {
        if (isUnmounted) return;
        const t = Math.min(1, (now - start) / smoothMs);
        const blended: Vehicle[] = latest.map((v) => {
          const p = prevMap.get(v.id);
          if (!p) return v;
          return {
            ...v,
            lat: lerp(p.lat, v.lat, t),
            lng: lerp(p.lng, v.lng, t),
            heading: v.heading ?? p.heading,
          };
        });

        // Only update if changed
        setVehicles((prev) => {
          // Simple shallow compare
          if (
            prev.length === blended.length &&
            prev.every(
              (v, i) =>
                v.id === blended[i].id &&
                v.lat === blended[i].lat &&
                v.lng === blended[i].lng,
            )
          ) {
            return prev;
          }
          return blended;
        });

        if (t < 1) {
          animRef.current = requestAnimationFrame(step);
        } else {
          animRef.current = null;
          prevRef.current = nextMap;
          setVehicles(latest);
        }
      };

      animRef.current = requestAnimationFrame(step);
    };

    const start = async () => {
      const first = await fetchVehicles();
      prevRef.current = new Map(first.map((v) => [v.id, v]));
      setVehicles(first);

      timer = setInterval(tick, pollMs);
    };

    start();

    return () => {
      isUnmounted = true;
      if (timer) clearInterval(timer);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollMs, smoothMs]);

  return { vehicles, setVehicles };
}
