import { DoorMat } from "./doormat";

export function DoorLeaf({ width, height, doorStyle, hingeSide = 1 }: { width: number; height: number; doorStyle: string; hingeSide?: 1 | -1 }) {
    const inset = 0.06
    return (
        <group>
            <mesh castShadow>
                <boxGeometry args={[width, height, 0.045]} />
                <DoorMat style={doorStyle} />
            </mesh>
            <mesh position={[0, height * 0.22, 0.024]}>
                <boxGeometry args={[width - inset * 2, height * 0.38, 0.006]} />
                <meshStandardMaterial color="#E9E9E6" roughness={0.6} />
            </mesh>
            <mesh position={[0, -height * 0.22, 0.024]}>
                <boxGeometry args={[width - inset * 2, height * 0.44, 0.006]} />
                <meshStandardMaterial color="#E9E9E6" roughness={0.6} />
            </mesh>
            <mesh position={[hingeSide * (width / 2 - 0.08), 0, 0.03]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.012, 0.012, 0.12, 12]} />
                <meshStandardMaterial color="#B8B8B4" metalness={0.6} roughness={0.3} />
            </mesh>
        </group>
    )
}