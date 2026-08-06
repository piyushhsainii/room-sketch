"use client";
import { useMemo } from "react";

function seededRandom(seed: number) {
    let s = seed;
    return () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
    };
}

export default function DotGrid({ className = "" }: { className?: string }) {
    const cellSize = 120;     // was 100 — bigger grid cells to match reference
    const pixelStep = 11;     // was 8 — more space between pixels
    const pixelSize = 5;    // was 2.5 — chunkier, more visible squares
    const cols = 18;          // fewer cols since each is now wider
    const rows = 9;
    const subPerCell = Math.floor(cellSize / pixelStep);

    const pixels = useMemo(() => {
        const rand = seededRandom(42);
        const out: { x: number; y: number; opacity: number }[] = [];

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const fillChance = rand();
                const density =
                    fillChance > 0.82 ? 0 :
                        fillChance > 0.55 ? 0.12 :
                            fillChance > 0.3 ? 0.35 :
                                0.65;

                for (let sy = 0; sy < subPerCell; sy++) {
                    for (let sx = 0; sx < subPerCell; sx++) {
                        if (rand() < density) {
                            out.push({
                                x: col * cellSize + sx * pixelStep + 4,
                                y: row * cellSize + sy * pixelStep + 4,
                                opacity: rand() * 0.35 + 0.12,
                            });
                        }
                    }
                }
            }
        }
        return out;
    }, []);

    const trails = useMemo(() => {
        const rand = seededRandom(7);
        return Array.from({ length: 8 }).map(() => ({
            x: rand() * cols * cellSize,
            y: rand() * rows * cellSize,
            rot: rand() * 360,
            delay: rand() * 6,
            dur: 5 + rand() * 4,
        }));
    }, []);

    return (
        <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
            <svg
                className="absolute inset-0 w-full h-full"
                viewBox={`0 0 ${cols * cellSize} ${rows * cellSize}`}
                preserveAspectRatio="xMidYMid slice"
            >
                <defs>
                    {/* near-zero on the left, full strength by ~60% across */}
                    <linearGradient id="fadeMask" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="white" stopOpacity="0.02" />
                        <stop offset="30%" stopColor="white" stopOpacity="0.15" />
                        <stop offset="60%" stopColor="white" stopOpacity="0.65" />
                        <stop offset="100%" stopColor="white" stopOpacity="1" />
                    </linearGradient>
                    <mask id="gridFadeMask">
                        <rect width="100%" height="100%" fill="url(#fadeMask)" />
                    </mask>
                </defs>

                <g mask="url(#gridFadeMask)">
                    {Array.from({ length: cols + 1 }).map((_, i) => (
                        <line key={`v${i}`} x1={i * cellSize} y1={0} x2={i * cellSize} y2={rows * cellSize} stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
                    ))}
                    {Array.from({ length: rows + 1 }).map((_, i) => (
                        <line key={`h${i}`} x1={0} y1={i * cellSize} x2={cols * cellSize} y2={i * cellSize} stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
                    ))}

                    {pixels.map((p, i) => (
                        <rect key={i} x={p.x} y={p.y} width={pixelSize} height={pixelSize} fill={`rgba(0,0,0,${p.opacity})`} />
                    ))}

                    {trails.map((t, i) => (
                        <g key={i} transform={`translate(${t.x} ${t.y}) rotate(${t.rot})`} style={{ animation: `dotDrift ${t.dur}s ease-in-out ${t.delay}s infinite alternate`, transformOrigin: "center" }}>
                            <path d="M0,0 L0,-12" stroke="rgba(0,0,0,0.22)" strokeWidth="1.4" strokeLinecap="round" />
                        </g>
                    ))}
                </g>
            </svg>

            <style jsx>{`
        @keyframes dotDrift {
          0% { transform: translate(0, 0); opacity: 0.5; }
          100% { transform: translate(5px, 8px); opacity: 1; }
        }
      `}</style>
        </div>
    );
}