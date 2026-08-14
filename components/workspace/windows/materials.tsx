import * as THREE from "three";

export const frameColor = "#F4F2EC";
export const sillColor = "#DDD7CA";

export function mat(
    color: string,
    extra: Partial<THREE.MeshStandardMaterialParameters> = {},
    opacity = 1,
    transparent = false
) {
    return (
        <meshStandardMaterial
            color={color}
            {...extra}
            opacity={opacity}
            transparent={transparent || opacity < 1}
        />
    );
}

export function glassMat(
    itemOpacity = 1,
    transparent = false,
    tint = "#DDF4FF"
) {
    return (
        <meshPhysicalMaterial
            color={tint}
            transparent
            opacity={0.12 * itemOpacity}
            transmission={0.98}
            thickness={0.01}
            roughness={0.01}
            metalness={0}
            ior={1.5}
            reflectivity={0.3}
            clearcoat={1}
            clearcoatRoughness={0}
            envMapIntensity={1.1}
            side={THREE.DoubleSide}
            depthWrite={false}
        />
    )
}