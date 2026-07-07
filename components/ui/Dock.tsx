'use client'

// Minimal vertical Dock — fixed, centered on the right edge of the viewport.
// Used to trigger the Properties / Scene Config Sheet.

export type DockItem = {
    id: string
    label: string
    icon: React.ReactNode
    active?: boolean
    onClick: () => void
}

export function Dock({ items }: { items: DockItem[] }) {
    return (
        <div
            style={{
                position: 'fixed', right: 14, top: '50%', transform: 'translateY(-50%)',
                zIndex: 150, display: 'flex', flexDirection: 'column', gap: 6,
                background: 'var(--fp-bg, #FFFFFF)',
                border: '1px solid var(--fp-border, rgba(15,15,15,0.08))',
                borderRadius: 14, padding: 6,
                boxShadow: '0 8px 24px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.05)',
            }}
        >
            {items.map(item => (
                <button
                    key={item.id}
                    onClick={item.onClick}
                    title={item.label}
                    style={{
                        width: 40, height: 40, borderRadius: 10, cursor: 'pointer',
                        border: item.active ? '1px solid var(--fp-accent-border, rgba(99,102,241,0.4))' : '1px solid transparent',
                        background: item.active ? 'var(--fp-accent-bg, rgba(99,102,241,0.1))' : 'transparent',
                        color: item.active ? 'var(--fp-accent, #6366F1)' : 'var(--fp-text-muted, rgba(26,26,26,0.55))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 150ms',
                    }}
                    onMouseEnter={e => { if (!item.active) e.currentTarget.style.background = 'var(--fp-bg-hover, rgba(0,0,0,0.05))' }}
                    onMouseLeave={e => { if (!item.active) e.currentTarget.style.background = 'transparent' }}
                >
                    {item.icon}
                </button>
            ))}
        </div>
    )
}