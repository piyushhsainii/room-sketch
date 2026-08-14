import { glassMat, mat } from "../windows/materials"

export function WindowGlass({
    width,
    height,
    itemOpacity,
    itemTransparent,
}: {
    width: number
    height: number
    itemOpacity: number
    itemTransparent: boolean
}) {
    return (
        <mesh>
            <planeGeometry args={[width, height]} />
            {glassMat(itemOpacity, itemTransparent)}
        </mesh>
    )
}