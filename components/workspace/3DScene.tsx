import { OrbitControls } from "@react-three/drei"
import { DEFAULT_SCENE_CONFIG, FloorPlanState } from "./Tools/constants"
import { Room3D } from "./3dRoom"
import { LineWalls3D } from "./objects/line-walls-3d"
import { StairsMesh } from "./furniture/stairsMesh"
import { WalkModeControls } from "./WalkModeControls"
import { FurnitureMesh } from "./furniture/furnitureMesh"
import { SceneConfig } from "./FloorPlanEditor"
import { LightFixtureMesh } from "./objects/lights-mesh"

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
            <color attach="background" args={['#FFFFFF']} />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
                <planeGeometry args={[500, 500]} />
                <meshStandardMaterial color="#F5F5F3" roughness={0.9} />
            </mesh>
            <fog attach="fog" args={['#F2F2F0', 30, 90]} />
            <ambientLight intensity={cfg.ambientIntensity} color="#FFF8F0" />
            <directionalLight position={[10, 15, 10]} intensity={2.5} castShadow shadow-mapSize={[2048, 2048]} />
            <directionalLight position={[-5, 8, -5]} intensity={0.8} color="#C8D4E8" />
            {cfg.fogEnabled && <fog attach="fog" args={['#F2F2F0', 20, 60]} />}

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

            {(fp.lights ?? []).map(light => {
                let pos: [number, number, number]
                let rot = 0
                const T = 0.15, normalOffset = T / 2 + 0.05

                if (light.segmentNodeIds) {
                    const a = fp.lineNodes.find(n => n.id === light.segmentNodeIds![0])
                    const b = fp.lineNodes.find(n => n.id === light.segmentNodeIds![1])
                    if (!a || !b) return null
                    const t = light.segmentT ?? 0
                    const px = a.x + (b.x - a.x) * t
                    const pz = a.z + (b.z - a.z) * t
                    const angle = Math.atan2(b.z - a.z, b.x - a.x)
                    const nx = Math.sin(angle), nz = -Math.cos(angle)
                    pos = [px + nx * normalOffset, light.heightOffset, pz + nz * normalOffset]
                    rot = -angle
                } else if (light.roomId && light.wall) {
                    const room = fp.rooms.find(r => r.id === light.roomId)
                    if (!room) return null
                    if (light.wall === 'north') { pos = [room.x + (light.position ?? 0), light.heightOffset, room.z + normalOffset]; rot = 0 }
                    else if (light.wall === 'south') { pos = [room.x + (light.position ?? 0), light.heightOffset, room.z + room.depth - normalOffset]; rot = Math.PI }
                    else if (light.wall === 'west') { pos = [room.x + normalOffset, light.heightOffset, room.z + (light.position ?? 0)]; rot = Math.PI / 2 }
                    else { pos = [room.x + room.width - normalOffset, light.heightOffset, room.z + (light.position ?? 0)]; rot = -Math.PI / 2 }
                } else {
                    pos = [light.x ?? 0, light.heightOffset, light.z ?? 0]
                }

                return (
                    <LightFixtureMesh
                        key={light.id}
                        light={light}
                        position={pos}
                        rotation={rot}
                        selected={interactiveMode && selectedId === light.id}
                        onSelect={interactiveMode ? () => onSelect?.(light.id) : undefined}
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
                    onPointerOver={interactiveMode ? () => { document.body.style.cursor = 'pointer' } : undefined}
                    onPointerOut={interactiveMode ? () => { document.body.style.cursor = 'auto' } : undefined}
                >
                    <FurnitureMesh f={f} selected={interactiveMode && selectedId === f.id} />
                </group>
            ))}

            {cfg.showFurniture !== false && (fp.stairs ?? []).map(s => (
                <group
                    key={s.id}
                    onClick={interactiveMode ? (e) => { e.stopPropagation(); onSelect?.(s.id) } : undefined}
                    onPointerOver={interactiveMode ? () => { document.body.style.cursor = 'pointer' } : undefined}
                    onPointerOut={interactiveMode ? () => { document.body.style.cursor = 'auto' } : undefined}
                >
                    <StairsMesh s={s} roomHeight={fp.roomHeight} />
                </group>
            ))}

            {walkMode ? (
                <WalkModeControls />
            ) : (
                <OrbitControls
                    makeDefault
                    enableDamping
                    dampingFactor={0.05}
                    minPolarAngle={0.05}
                    maxPolarAngle={Math.PI / 2 - 0.02}
                    minDistance={1}
                    maxDistance={100}
                    screenSpacePanning={false}
                />
            )}
        </>
    )
}

export default Scene3D