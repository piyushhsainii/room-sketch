"use client";

import type { ComponentProps, Ref } from "react";
import Scene3D, { type Scene3DHandle } from "./3DScene";
import ResilientCanvas from "./ResilientCanvas";
import { useSceneQuality } from './hooks/useSceneQuality';

type Props = Omit<ComponentProps<typeof Scene3D>, "ref"> & {
    sceneRef: Ref<Scene3DHandle>;
};

export default function EditorPreview({ sceneRef, ...sceneProps }: Props) {
    const [quality] = useSceneQuality();
    // Keep continuous rendering available while validating the demand path.
    const demandEnabled = process.env.NEXT_PUBLIC_EDITOR_DEMAND_RENDERING === "1" ||
        (process.env.NODE_ENV === "development" &&
            new URLSearchParams(window.location.search).get("render") === "demand");
    const frameLoop = demandEnabled && !sceneProps.walkMode && !sceneProps.interactiveMode
        ? "demand"
        : "always";
    const height = sceneProps.activeFp.roomHeight;
    return (
        <ResilientCanvas
            frameloop={frameLoop}
            shadows={quality !== 'performance'}
            gl={{
                antialias: true,
                alpha: false,
                powerPreference: 'low-power',
                stencil: true,
                depth: true,
                preserveDrawingBuffer: true
            }}
            dpr={quality === 'performance' ? 1 : quality === 'high' ? [1, 2] : [1, 1.5]}
            camera={{
                position: [
                    height * 3,
                    height * 4,
                    height * 4
                ],
                fov: 45, near: 0.1, far: 500
            }}
            style={{ width: '100%', height: '100%', background: '#EFEFEC', display: 'block' }}
            onWheel={e => e.stopPropagation()}
            resize={{ scroll: false, debounce: { scroll: 50, resize: 0 } }}
        >
            <Scene3D ref={sceneRef} {...sceneProps} />
        </ResilientCanvas>
    );
}
