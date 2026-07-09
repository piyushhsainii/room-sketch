// components/workspace/objects/error-boundary.tsx
import React from 'react'

class SceneErrorBoundary extends React.Component<{ children: React.ReactNode; fallback: React.ReactNode }, { hasError: boolean }> {
    state = { hasError: false }
    static getDerivedStateFromError() { return { hasError: true } }
    componentDidCatch(err: unknown) { console.error('3D scene error:', err) }
    render() { return this.state.hasError ? this.props.fallback : this.props.children }
}

export default SceneErrorBoundary