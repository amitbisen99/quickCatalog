import { useEffect, useState } from 'react';

/**
 * Fake-but-reassuring progress for a single long-running request that has
 * no real server-side progress signal (no SSE/WebSocket infra behind
 * this) — climbs quickly at first, then eases off and holds just short
 * of 100% for as long as `active` stays true, so the bar never looks
 * stuck and never claims to be done before the request actually
 * resolves. The caller just flips `active` off when the request settles;
 * the surrounding UI (result screen, success state, etc.) takes over
 * from there.
 */
export function useSimulatedProgress(active: boolean, capAt = 92): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active) {
      setProgress(0);
      return;
    }
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= capAt) return p;
        const remaining = capAt - p;
        return Math.min(capAt, p + Math.max(0.5, remaining * 0.12));
      });
    }, 250);
    return () => clearInterval(interval);
  }, [active, capAt]);

  return progress;
}
