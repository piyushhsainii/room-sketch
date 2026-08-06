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
            transparent={transparent || itemOpacity < 1}
            opacity={0.22 * itemOpacity}
            transmission={0.96}
            thickness={0.02}
            roughness={0.02}
            metalness={0}
            ior={1.52}
            reflectivity={1}
            clearcoat={1}
            clearcoatRoughness={0}
            envMapIntensity={1.35}
            side={THREE.DoubleSide}
        />
    )
}