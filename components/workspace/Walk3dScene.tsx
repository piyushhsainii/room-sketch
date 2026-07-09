import { OrbitControls, PointerLockControls } from "@react-three/drei"
import { DEFAULT_SCENE_CONFIG, FloorPlanState } from "./Tools/constants"
import { Room3D } from "./3dRoom"
import { LineWalls3D } from "./objects/line-walls-3d"
import { StairsMesh } from "./furniture/stairsMesh"
import { WalkModeControls } from "./WalkModeControls"
import { FurnitureMesh } from "./furniture/furnitureMesh"
import { SceneConfig } from "./FloorPlanEditor"

export function Scene3D({ fp, sceneConfig, walkMode = false }: {
    fp: FloorPlanState
    sceneConfig?: SceneConfig
    walkMode?: boolean
}) {
    const cfg = sceneConfig ?? DEFAULT_SCENE_CONFIG // import this from constants/FloorPlanEditor

    if (!fp?.rooms) return null

    return (
        <>
            <ambientLight intensity={cfg.ambientIntensity} color="#FFF8F0" />
            <directionalLight position={[10, 15, 10]} intensity={2.5} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0001} />
            <directionalLight position={[-5, 8, -5]} intensity={0.8} color="#C8D4E8" />
            {cfg.fogEnabled && <fog attach="fog" args={['#0F0E0C', 20, 60]} />}

            {fp.rooms.map(room => {
                const roomCfg = cfg.rooms.find(r => r.roomId === room.id)
                return (
                    <Room3D
                        key={room.id}
                        room={room}
                        openings={fp.openings.filter(o => o.roomId === room.id)}
                        roomHeight={fp.roomHeight}
                        wallColor={roomCfg?.wallColor ?? '#FFFFFF'}
                        wallMaterial={roomCfg?.wallMaterial ?? cfg.globalWallMaterial ?? 'paint'}
                        wallRoughness={cfg.wallRoughness}
                        wallTextured={cfg.wallTextured}
                        floorMat={roomCfg?.floorMaterial ?? cfg.globalFloorMaterial ?? 'plain'}
                        doorStyle={cfg.doorStyle ?? 'natural'}
                        wallDecor={fp.wallDecor}
                    />
                )
            })}

            <LineWalls3D
                fp={fp}
                wallRoughness={cfg.wallRoughness}
                wallColor="#FFFFFF"
                floorMaterial={cfg.globalFloorMaterial ?? 'plain'}
                doorStyle={cfg.doorStyle ?? 'natural'}
                closedShapes={fp.closedShapes}
            />

            {cfg.showFurniture !== false && (fp.furniture ?? []).map(f => <FurnitureMesh key={f.id} f={f} />)}
            {cfg.showFurniture !== false && (fp.stairs ?? []).map(s => <StairsMesh key={s.id} s={s} roomHeight={fp.roomHeight} />)}

            {walkMode ? <WalkModeControls /> : (
                <OrbitControls makeDefault enableDamping dampingFactor={0.05} minDistance={2} maxDistance={40} maxPolarAngle={Math.PI / 2 - 0.05} />
            )}

            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
                <planeGeometry args={[500, 500]} />
                <meshStandardMaterial color="#DCDCD8" roughness={0.95} metalness={0} />
            </mesh>
        </>
    )
}

export default Scene3D