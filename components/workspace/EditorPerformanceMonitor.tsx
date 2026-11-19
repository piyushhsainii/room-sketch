"use client";

import { useEffect, useRef, useState } from "react";

const SAMPLE_MS = 5000;

export default function EditorPerformanceMonitor() {
  const animationFrame = useRef(0);
  const [sampling, setSampling] = useState(false);
  const [result, setResult] = useState("");

  useEffect(() => () => cancelAnimationFrame(animationFrame.current), []);

  function startSample() {
    const intervals: number[] = [];
    let firstFrame: number | undefined;
    let previousFrame: number | undefined;
    setResult("");
    setSampling(true);

    function sampleFrame(now: number) {
      if (document.visibilityState !== "visible") {
        setSampling(false);
        setResult("Sample interrupted. Keep this tab visible and try again.");
        return;
      }

      firstFrame ??= now;
      if (previousFrame !== undefined) intervals.push(now - previousFrame);
      previousFrame = now;

      const elapsed = now - firstFrame;
      if (elapsed < SAMPLE_MS) {
        animationFrame.current = requestAnimationFrame(sampleFrame);
        return;
      }

      const fps = intervals.length * 1000 / elapsed;
      intervals.sort((a, b) => a - b);
      const p95 = intervals[Math.ceil(intervals.length * 0.95) - 1];
      setSampling(false);
      setResult(`${fps.toFixed(1)} browser FPS · p95 ${p95.toFixed(1)} ms · ${intervals.length} frames`);
    }

    animationFrame.current = requestAnimationFrame(sampleFrame);
  }

  return (
    <aside aria-label="Editor performance" style={{
      position: "fixed", right: 16, bottom: 16, zIndex: 1000,
      padding: 8, background: "#222", color: "#fff", borderRadius: 6,
      fontSize: 12,
    }}>
      <button type="button" onClick={startSample} disabled={sampling}>
        {sampling ? "Sampling browser frames…" : "Sample browser frames (5 s)"}
      </button>
      {result && <div role="status">{result}</div>}
    </aside>
  );
}
