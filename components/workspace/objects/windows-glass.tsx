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

    const paneThickness = 0.004
    const paneGap = 0.012
    const spacerInset = 0.018

    return (
        <>
            {/* Front pane */}
            <mesh position={[0, 0, paneGap / 2]}>
                <boxGeometry
                    args={[
                        width,
                        height,
                        paneThickness,
                    ]}
                />
                {glassMat(itemOpacity, itemTransparent)}
            </mesh>

            {/* Rear pane */}
            <mesh position={[0, 0, -paneGap / 2]}>
                <boxGeometry
                    args={[
                        width,
                        height,
                        paneThickness,
                    ]}
                />
                {glassMat(itemOpacity, itemTransparent)}
            </mesh>

            {/* Spacer */}
            <mesh>
                <boxGeometry
                    args={[
                        width - spacerInset,
                        height - spacerInset,
                        0.005,
                    ]}
                />
                {mat(
                    "#A7A9AC",
                    {
                        metalness: 0.8,
                        roughness: 0.25,
                    },
                    itemOpacity,
                    itemTransparent
                )}
            </mesh>
        </>
    )
}