"use client";

import { useEffect, useState } from "react";

function computeMinutes(since: string | Date): number {
  const date = typeof since === "string" ? new Date(since) : since;
  return Math.max(0, (Date.now() - date.getTime()) / 60_000);
}

/** Minutes elapsed since `since`, re-computed every `tickMs` (default 15s). */
export function useElapsedMinutes(since: string | Date, tickMs = 15_000): number {
  const [elapsed, setElapsed] = useState(() => computeMinutes(since));

  useEffect(() => {
    setElapsed(computeMinutes(since));
    const id = setInterval(() => setElapsed(computeMinutes(since)), tickMs);
    return () => clearInterval(id);
  }, [since, tickMs]);

  return elapsed;
}
