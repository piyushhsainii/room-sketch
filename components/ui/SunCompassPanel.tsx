import { SceneConfig, THEME } from '../workspace/FloorPlanEditor'

const PANEL = {
    bg: '#1C1C1F',
    rowHover: 'rgba(255,255,255,0.06)',
    border: 'rgba(255,255,255,0.08)',
    text: '#E4E4E7',
    textMuted: '#A1A1AA',
    textFaint: '#71717A',
    accent: '#8B8FFF',
    accentBg: 'rgba(139,143,255,0.15)',
}

function formatTime(t: number): string {
    const h = Math.floor(t)
    const m = Math.round((t - h) * 60)
    const period = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 === 0 ? 12 : h % 12
    return `${h12}:${m.toString().padStart(2, '0')} ${period}`
}

function SunIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
    )
}

function ClockIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 3" />
        </svg>
    )
}

function CompassIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M14.5 9.5 12 12l-2.5 2.5L12 12l2.5-2.5z" fill="currentColor" stroke="none" />
        </svg>
    )
}

// ── Realistic compass dial — SVG ring with degree ticks, cardinal labels,
// intercardinal labels, and a needle. ─────────────────────────────────────
function CompassDial({
    heading,
    onChange,
}: {
    heading: number
    onChange: (deg: number) => void
}) {
    const size = 180
    const cx = size / 2
    const cy = size / 2
    const r = 78

    const onPointer = (e: React.PointerEvent<SVGSVGElement>) => {
        const svg = e.currentTarget
        const move = (ev: PointerEvent) => {
            const rect = svg.getBoundingClientRect()
            const px = ev.clientX - rect.left - rect.width / 2
            const py = ev.clientY - rect.top - rect.height / 2
            let deg = (Math.atan2(px, -py) * 180) / Math.PI
            if (deg < 0) deg += 360
            onChange(Math.round(deg))
        }
        const up = () => {
            window.removeEventListener('pointermove', move)
            window.removeEventListener('pointerup', up)
        }
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', up)
        move(e.nativeEvent)
    }

    const ticks = []
    for (let deg = 0; deg < 360; deg += 10) {
        const major = deg % 90 === 0
        const minor = deg % 30 === 0
        const tickLen = major ? 10 : minor ? 7 : 4
        const rad = (deg * Math.PI) / 180
        const x1 = cx + Math.sin(rad) * (r - 1)
        const y1 = cy - Math.cos(rad) * (r - 1)
        const x2 = cx + Math.sin(rad) * (r - 1 - tickLen)
        const y2 = cy - Math.cos(rad) * (r - 1 - tickLen)
        ticks.push(
            <line
                key={deg}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={major ? PANEL.text : PANEL.textFaint}
                strokeWidth={major ? 1.5 : 1}
                opacity={major ? 0.9 : 0.35}
            />
        )
    }

    const cardinals = [
        { label: 'N', deg: 0 },
        { label: 'E', deg: 90 },
        { label: 'S', deg: 180 },
        { label: 'W', deg: 270 },
    ]
    const labelR = r - 22

    const needleRad = (heading * Math.PI) / 180
    const needleTipX = cx + Math.sin(needleRad) * (r - 20)
    const needleTipY = cy - Math.cos(needleRad) * (r - 20)
    const needleTailX = cx - Math.sin(needleRad) * (r - 55)
    const needleTailY = cy + Math.cos(needleRad) * (r - 55)

    return (
        <svg
            width={size} height={size} viewBox={`0 0 ${size} ${size}`}
            onPointerDown={onPointer}
            style={{
                cursor: 'grab',
                touchAction: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
            }}
        >
            <circle cx={cx} cy={cy} r={r} fill="rgba(139,143,255,0.04)" stroke={PANEL.border} strokeWidth={1} />
            <circle cx={cx} cy={cy} r={r - 24} fill="none" stroke={PANEL.border} strokeWidth={0.5} opacity={0.5} />
            {ticks}
            {cardinals.map(c => {
                const rad = (c.deg * Math.PI) / 180
                const x = cx + Math.sin(rad) * labelR
                const y = cy - Math.cos(rad) * labelR
                return (
                    <text
                        key={c.label}
                        x={x} y={y}
                        fill={c.label === 'N' ? PANEL.accent : PANEL.textMuted}
                        fontSize={c.label === 'N' ? 12 : 11}
                        fontWeight={c.label === 'N' ? 700 : 500}
                        textAnchor="middle"
                        dominantBaseline="middle"
                    >
                        {c.label}
                    </text>
                )
            })}
            {/* Needle — south tail (faint) + north-pointing head (accent) */}
            <line x1={cx} y1={cy} x2={needleTailX} y2={needleTailY} stroke={PANEL.textFaint} strokeWidth={2} strokeLinecap="round" />
            <line x1={cx} y1={cy} x2={needleTipX} y2={needleTipY} stroke={PANEL.accent} strokeWidth={2.5} strokeLinecap="round" />
            <circle cx={cx} cy={cy} r={4} fill={PANEL.accent} />
        </svg>
    )
}

export function SunScenePanel({
    sceneConfig,
    onChange,
    theme, // pass THEME from parent
}: {
    sceneConfig: SceneConfig
    onChange: (patch: Partial<SceneConfig>) => void
    theme: typeof THEME
}) {
    const PANEL = {
        bg: theme.bg ?? '#fff',
        rowHover: 'rgba(0,0,0,0.04)',
        border: theme.border ?? 'rgba(0,0,0,0.08)',
        text: theme.text ?? '#18181B',
        textMuted: theme.textMuted ?? '#71717A',
        textFaint: '#A1A1AA',
        accent: '#6366F1',
        accentBg: 'rgba(99,102,241,0.1)',
    }
    const enabled = sceneConfig.sunToolEnabled ?? true
    const timeOfDay = sceneConfig.sunTimeOfDay ?? 12
    const heading = sceneConfig.sunCompassHeading ?? 180

    return (
        <div style={{ background: PANEL.bg, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Enable row — matches the toggle-row pattern (icon, label, right control) */}
            <label
                style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px',
                    borderRadius: 10, cursor: 'pointer', color: PANEL.text, fontSize: 13.5,
                }}
                onMouseEnter={e => e.currentTarget.style.background = PANEL.rowHover}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
                <span style={{ color: PANEL.textMuted, display: 'flex' }}><SunIcon /></span>
                <span style={{ flex: 1 }}>Sun override</span>
                <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: enabled ? PANEL.accent : PANEL.textFaint,
                }}>
                    {enabled ? 'On' : 'Off'}
                </span>
                <input
                    type="checkbox"
                    checked={enabled}
                    onChange={e => onChange({ sunToolEnabled: e.target.checked })}
                    style={{ display: 'none' }}
                />
                <div
                    onClick={e => { e.preventDefault(); onChange({ sunToolEnabled: !enabled }) }}
                    style={{
                        width: 34, height: 20, borderRadius: 999, position: 'relative',
                        background: enabled ? PANEL.accent : 'rgba(255,255,255,0.14)',
                        transition: 'background 150ms',
                    }}
                >
                    <div style={{
                        position: 'absolute', top: 2, left: enabled ? 16 : 2,
                        width: 16, height: 16, borderRadius: '50%', background: '#fff',
                        transition: 'left 150ms',
                    }} />
                </div>
            </label>

            <div style={{
                opacity: enabled ? 1 : 0.4, pointerEvents: enabled ? 'auto' : 'none',
                display: 'flex', flexDirection: 'column', gap: 2,
            }}>
                {/* Time of day row */}
                <div style={{ padding: '10px 10px', borderRadius: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <span style={{ color: PANEL.textMuted, display: 'flex' }}><ClockIcon /></span>
                        <span style={{ flex: 1, fontSize: 13.5, color: PANEL.text }}>Time of day</span>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: PANEL.accent }}>{formatTime(timeOfDay)}</span>
                    </div>
                    <input
                        type="range" min={0} max={24} step={0.25} value={timeOfDay}
                        onChange={e => onChange({ sunTimeOfDay: parseFloat(e.target.value) })}
                        style={{ width: '100%', accentColor: PANEL.accent }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: PANEL.textFaint, marginTop: 3 }}>
                        <span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>12 AM</span>
                    </div>
                </div>

                <div style={{ height: 1, background: PANEL.border, margin: '2px 10px' }} />

                {/* Compass row */}
                <div style={{ padding: '10px 10px 14px', borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
                        <span style={{ color: PANEL.textMuted, display: 'flex' }}><CompassIcon /></span>
                        <span style={{ flex: 1, fontSize: 13.5, color: PANEL.text }}>Compass heading</span>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: PANEL.accent }}>{Math.round(heading)}°</span>
                    </div>
                    <CompassDial heading={heading} onChange={deg => onChange({ sunCompassHeading: deg })} />
                </div>
            </div>
        </div>
    )
}