import { useCallback, useEffect, useRef, useState } from "react";

export function ScrollableList({ children, maxHeight }: { children: React.ReactNode; maxHeight: number }) {
    const contentRef = useRef<HTMLDivElement>(null)
    const trackRef = useRef<HTMLDivElement>(null)
    const [thumb, setThumb] = useState({ height: 0, top: 0, visible: false })
    const dragRef = useRef<{ startY: number; startScrollTop: number } | null>(null)

    const updateThumb = useCallback(() => {
        const el = contentRef.current
        if (!el) return
        const { scrollHeight, clientHeight, scrollTop } = el
        if (scrollHeight <= clientHeight) { setThumb({ height: 0, top: 0, visible: false }); return }
        const thumbHeight = Math.max(24, (clientHeight / scrollHeight) * clientHeight)
        const thumbTop = (scrollTop / (scrollHeight - clientHeight)) * (clientHeight - thumbHeight)
        setThumb({ height: thumbHeight, top: thumbTop, visible: true })
    }, [])

    useEffect(() => { updateThumb() }, [updateThumb, children])

    const onThumbMouseDown = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        dragRef.current = { startY: e.clientY, startScrollTop: contentRef.current?.scrollTop ?? 0 }
        const onMove = (ev: MouseEvent) => {
            const el = contentRef.current
            if (!el || !dragRef.current) return
            const { scrollHeight, clientHeight } = el
            const deltaY = ev.clientY - dragRef.current.startY
            const scrollableDist = scrollHeight - clientHeight
            const trackDist = clientHeight - thumb.height
            if (trackDist <= 0) return
            el.scrollTop = dragRef.current.startScrollTop + (deltaY / trackDist) * scrollableDist
            updateThumb()
        }
        const onUp = () => {
            dragRef.current = null
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
        }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
    }

    return (
        <div style={{ position: 'relative', display: 'flex' }}>
            <div
                ref={contentRef}
                onScroll={updateThumb}
                style={{
                    maxHeight, overflowY: 'auto', flex: 1,
                    scrollbarWidth: 'none', msOverflowStyle: 'none',
                }}
                className="hide-native-scrollbar"
            >
                {children}
            </div>
            {thumb.visible && (
                <div ref={trackRef} style={{ width: 5, flexShrink: 0, position: 'relative', marginLeft: 2 }}>
                    <div
                        onMouseDown={onThumbMouseDown}
                        style={{
                            position: 'absolute', top: thumb.top, left: 0,
                            width: 5, height: thumb.height, borderRadius: 3,
                            background: 'rgba(99,102,241,0.35)', cursor: 'pointer',
                        }}
                    />
                </div>
            )}
        </div>
    )
}