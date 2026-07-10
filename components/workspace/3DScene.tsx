import { OrbitControls, PointerLockControls } from "@react-three/drei"
import { DEFAULT_SCENE_CONFIG, FloorPlanState } from "./Tools/constants"
import { Room3D } from "./3dRoom"
import { LineWalls3D } from "./objects/line-walls-3d"
import { StairsMesh } from "./furniture/stairsMesh"
import { WalkModeControls } from "./WalkModeControls"
import { FurnitureMesh } from "./furniture/furnitureMesh"
import { SceneConfig } from "./FloorPlanEditor"

function Scene3D({ fp, sceneConfig, walkMode = false, interactiveMode = false, selectedId, onSelect }: {
    fp: FloorPlanState
    sceneConfig?: SceneConfig
    walkMode?: boolean
    interactiveMode?: boolean
    selectedId?: string | null
    onSelect?: (id: string | null) => void
}) {
    const cfg = sceneConfig ?? DEFAULT_SCENE_CONFIG
    return (
        <>
            <ambientLight intensity={cfg.ambientIntensity} color="#FFF8F0" />
            <directionalLight position={[10, 15, 10]} intensity={2.5} castShadow shadow-mapSize={[2048, 2048]} />
            <directionalLight position={[-5, 8, -5]} intensity={0.8} color="#C8D4E8" />
            {cfg.fogEnabled && <fog attach="fog" args={['#0F0E0C', 20, 60]} />}

            {/* Click empty space to deselect, only when interactive mode is on */}
            {interactiveMode && (
                <mesh
                    position={[0, -0.01, 0]}
                    rotation={[-Math.PI / 2, 0, 0]}
                    onClick={(e) => { e.stopPropagation(); onSelect?.(null) }}
                    visible={false}
                >
                    <planeGeometry args={[500, 500]} />
                    <meshBasicMaterial />
                </mesh>
            )}

            {fp.rooms.map(room => {
                const roomCfg = cfg.rooms.find(r => r.roomId === room.id)
                return (
                    <Room3D
                        key={room.id}
                        room={room}
                        openings={fp.openings.filter(o => o.roomId === room.id)}
                        roomHeight={fp.roomHeight}
                        wallColor={roomCfg?.wallColor ?? '#FFFFFF'}
                        wallRoughness={cfg.wallRoughness}
                        wallTextured={cfg.wallTextured}
                        floorMat={roomCfg?.floorMaterial ?? cfg.globalFloorMaterial ?? 'plain'}
                        doorStyle={cfg.doorStyle ?? 'natural'}
                        wallDecor={fp.wallDecor}
                        interactive={interactiveMode}
                        selectedId={selectedId}
                        onSelect={onSelect}
                        wallMaterial={roomCfg?.wallMaterial ?? cfg.globalWallMaterial ?? 'paint'}
                    />
                )
            })}

            <LineWalls3D
                fp={fp}
                wallRoughness={cfg.wallRoughness}
                wallColor="#FFFFFF"
                wallMaterial={cfg.globalWallMaterial ?? 'paint'}
                floorMaterial={cfg.globalFloorMaterial ?? 'plain'}
                doorStyle={cfg.doorStyle ?? 'natural'}
                closedShapes={fp.closedShapes}
                interactive={interactiveMode}
                selectedId={selectedId}
                onSelect={onSelect}
            />

            {cfg.showFurniture !== false && (fp.furniture ?? []).map(f => (
                <group
                    key={f.id}
                    onClick={interactiveMode ? (e) => { e.stopPropagation(); onSelect?.(f.id) } : undefined}
                    onPointerOver={interactiveMode ? (e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' } : undefined}
                    onPointerOut={interactiveMode ? () => { document.body.style.cursor = 'auto' } : undefined}
                >
                    <FurnitureMesh f={f} selected={interactiveMode && selectedId === f.id} />
                </group>
            ))}

            {cfg.showFurniture !== false && (fp.stairs ?? []).map(s => (
                <group
                    key={s.id}
                    onClick={interactiveMode ? (e) => { e.stopPropagation(); onSelect?.(s.id) } : undefined}
                    onPointerOver={interactiveMode ? (e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' } : undefined}
                    onPointerOut={interactiveMode ? () => { document.body.style.cursor = 'auto' } : undefined}
                >
                    <StairsMesh s={s} roomHeight={fp.roomHeight} />
                </group>
            ))}

            {walkMode ? (
                <WalkModeControls />
            ) : (
                <OrbitControls makeDefault enableDamping dampingFactor={0.05} enabled={!interactiveMode || true} />
            )}
            <gridHelper args={[50, 50, '#1C1A17', '#1C1A17']} position={[0, -0.01, 0]} />
        </>
    )
}

export default Scene3D