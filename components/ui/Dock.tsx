'use client'

export type DockItem = {
    id: string
    label: string
    icon: React.ReactNode
    onClick: () => void
}

export function Dock({
    items, activeId, expanded, onExpandedChange, children,
}: {
    items: DockItem[]
    activeId: string | null
    expanded: boolean
    onExpandedChange: (v: boolean) => void
    children?: React.ReactNode
}) {



    return (
        <div style={{ position: 'fixed', right: 14, top: '50%', transform: 'translateY(-50%)', zIndex: 150, display: 'flex', alignItems: 'stretch', gap: 8 }}>
            {expanded && (
                <div style={{
                    width: 320, maxHeight: '80vh',
                    display: 'flex', flexDirection: 'column',
                    background: 'var(--fp-bg, #FFFFFF)',
                    border: '1px solid var(--fp-border, rgba(15,15,15,0.08))',
                    borderRadius: 14,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.05)',
                    overflow: 'hidden',
                }}>
                    {children}
                </div>
            )}
            <div style={{
                display: 'flex', flexDirection: 'column', gap: 6,
                background: 'var(--fp-bg, #FFFFFF)',
                border: '1px solid var(--fp-border, rgba(15,15,15,0.08))',
                borderRadius: 14, padding: 6, alignSelf: 'flex-start',
                boxShadow: '0 8px 24px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.05)',
            }}>
                {items.map(item => {
                    const isActive = expanded && activeId === item.id
                    return (
                        <button
                            key={item.id}
                            onClick={() => { if (isActive) onExpandedChange(false); else { item.onClick(); onExpandedChange(true) } }}
                            title={item.label}
                            style={{
                                width: 40, height: 40, borderRadius: 10, cursor: 'pointer',
                                border: isActive ? '1px solid var(--fp-accent-border, rgba(99,102,241,0.4))' : '1px solid transparent',
                                background: isActive ? 'var(--fp-accent-bg, rgba(99,102,241,0.1))' : 'transparent',
                                color: isActive ? 'var(--fp-accent, #6366F1)' : 'var(--fp-text-muted, rgba(26,26,26,0.55))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 150ms',
                            }}
                        >
                            {item.icon}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}