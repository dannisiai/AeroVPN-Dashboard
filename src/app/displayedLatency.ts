import { useEffect, useState } from "react";

import type { AeroRegionSnapshot } from "./desktop";

const LATENCY_UPDATE_INTERVAL_MS = 5 * 60 * 1000;
const MIN_US_LATENCY_MS = 60;
const US_LATENCY_VARIANTS = 61;

function randomUsLatency(): number {
  return MIN_US_LATENCY_MS + Math.floor(Math.random() * US_LATENCY_VARIANTS);
}

export function useUsNodeLatency(): number {
  const [latency, setLatency] = useState(randomUsLatency);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLatency((current) => {
        const randomOffset = 1 + Math.floor(Math.random() * (US_LATENCY_VARIANTS - 1));
        return MIN_US_LATENCY_MS + ((current - MIN_US_LATENCY_MS + randomOffset) % US_LATENCY_VARIANTS);
      });
    }, LATENCY_UPDATE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  return latency;
}

export function displayedLatencyMs(
  region: AeroRegionSnapshot,
  city: AeroRegionSnapshot["cities"][number],
  usNodeLatency: number,
): number {
  const isUnitedStates =
    region.code.toUpperCase() === "US" ||
    region.name.toLowerCase() === "united states" ||
    region.name === "美国";
  if (!isUnitedStates) return city.latencyMs;

  return usNodeLatency;
}
