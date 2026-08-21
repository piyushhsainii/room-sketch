// GLTFErrorBoundary.tsx
import { Component, ReactNode } from 'react'

export class GLTFErrorBoundary extends Component<
    { fallback: ReactNode; children: ReactNode },
    { hasError: boolean }
> {
    state = { hasError: false }
    static getDerivedStateFromError() {
        return { hasError: true }
    }
    componentDidCatch(err: unknown) {
        console.error('[GLTFErrorBoundary] falling back to procedural mesh:', err)
    }
    render() {
        return this.state.hasError ? this.props.fallback : this.props.children
    }
}