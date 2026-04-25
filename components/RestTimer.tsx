"use client";

import { useEffect, useMemo, useState } from "react";

interface RestTimerProps {
  defaultSeconds: number;
}

export function RestTimer({ defaultSeconds }: RestTimerProps) {
  const [remaining, setRemaining] = useState(defaultSeconds);
  const [running, setRunning] = useState(false);

  useEffect(() => setRemaining(defaultSeconds), [defaultSeconds]);

  useEffect(() => {
    if (!running || remaining <= 0) return;
    const timer = window.setInterval(() => setRemaining((sec) => sec - 1), 1000);
    return () => window.clearInterval(timer);
  }, [running, remaining]);

  const mmss = useMemo(() => {
    const min = Math.floor(Math.max(0, remaining) / 60);
    const sec = Math.max(0, remaining) % 60;
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }, [remaining]);

  return (
    <div className="restCard">
      <h3>Chrono repos</h3>
      <p className="timer">{mmss}</p>
      <div className="inlineActions">
        <button type="button" onClick={() => setRunning((v) => !v)}>
          {running ? "Pause" : "Démarrer"}
        </button>
        <button type="button" onClick={() => { setRunning(false); setRemaining(defaultSeconds); }}>
          Reset
        </button>
      </div>
    </div>
  );
}
