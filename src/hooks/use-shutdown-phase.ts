import { useEffect, useState } from "react";
import { shutdownPhaseAt, type ShutdownPhase } from "@/lib/shutdown-schedule";

/** Client-side shutdown phase; stays "idle" during SSR to avoid hydration mismatch. */
export function useShutdownPhase(): ShutdownPhase {
  const [phase, setPhase] = useState<ShutdownPhase>("idle");
  useEffect(() => {
    const tick = () => setPhase(shutdownPhaseAt(Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return phase;
}
