import { useCallback, useEffect, useRef, useState } from "react";

export function ScrollableList({ children, maxHeight }: { children: React.ReactNode; maxHeight: number | string }) {
    const contentRef = useRef<HTMLDivElement>(null)
    const trackRef = useRef<HTMLDivElement>(null)
    const [thumb, setThumb] = useState({ height: 0, top: 0, visible: false })
    const dragRef = useRef<{ startY: number; startScrollTop: number } | null>(null)

    const updateThumb = useCallback(() => {
        const el = contentRef.current
        if (!el) return
        const { scrollHeight, clientHeight, scrollTop } = el

        if (scrollHeight <= clientHeight) {
            setThumb(prev => (prev.visible ? { height: 0, top: 0, visible: false } : prev))
            return
        }

        const thumbHeight = Math.max(24, (clientHeight / scrollHeight) * clientHeight)
        const thumbTop = (scrollTop / (scrollHeight - clientHeight)) * (clientHeight - thumbHeight)

        setThumb(prev => {
            const changed =
                Math.abs(prev.height - thumbHeight) > 0.5 ||
                Math.abs(prev.top - thumbTop) > 0.5 ||
                !prev.visible
            return changed ? { height: thumbHeight, top: thumbTop, visible: true } : prev
        })
    }, [])

    // Re-measure on mount, on content change, AND on parent resize — a
    // string/percentage maxHeight means clientHeight can change after the
    // initial render (e.g. the Dock sheet expanding), and the old effect
    // only re-ran on `children` changes, so the thumb could get stuck wrong.
    useEffect(() => {
        updateThumb()
        const el = contentRef.current
        if (!el || typeof ResizeObserver === 'undefined') return
        const ro = new ResizeObserver(() => updateThumb())
        ro.observe(el)
        return () => ro.disconnect()
    }, [updateThumb, children])

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

    const isPercent = typeof maxHeight === 'string'

    return (
        <div style={{ position: 'relative', display: 'flex', height: isPercent ? maxHeight : undefined, minHeight: 0 }}>
            <div
                ref={contentRef}
                onScroll={updateThumb}
                style={{
                    maxHeight, overflowY: 'auto', flex: 1,
                    height: isPercent ? '100%' : undefined,
                    minHeight: 0,
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