import { useGLTF } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useEffect, useMemo, useRef, useState } from 'react'

import type { PlacedFurniture } from '../lib/furniture-constants'
import type { FurnitureModelDef } from './furniture-model-registry'

import { getMaterialsFor } from '../texture/universalMaterials'
import { useTextureMaterialProps } from './furnitureMesh'

const _furnitureMatById = new Map(
    getMaterialsFor('furniture').map(m => [m.id, m])
)

export function GLTFFurnitureMesh({
    f,
    def,
    selected = false,
    interactive = false,
    overlapping = false,
    onSelect,
    opacity = 1,
    transparent = false,
}: {
    f: PlacedFurniture
    def: FurnitureModelDef
    selected?: boolean
    interactive?: boolean
    overlapping?: boolean
    onSelect?: (id: string) => void
    opacity?: number
    transparent?: boolean
}) {
    const itemTransparent = transparent || opacity < 1

    const groupRef = useRef<THREE.Group>(null)

    const [hovered, setHovered] = useState(false)

    const { gl } = useThree()

    // -------------------------------------------------------------------------
    // LOAD GLB
    // -------------------------------------------------------------------------

    const { scene } = useGLTF(def.url)

    /*
     * Clone the GLB so that changing materials/textures on this furniture
     * instance does not modify the original cached GLTF scene.
     */
    const cloned = useMemo(() => {
        return scene.clone(true)
    }, [scene])

    // -------------------------------------------------------------------------
    // MEASURE MODEL
    // -------------------------------------------------------------------------

    const measuredSize = useMemo(() => {
        const box = new THREE.Box3().setFromObject(cloned)
        const size = new THREE.Vector3()
        box.getSize(size)

        return [
            size.x,
            size.y,
            size.z,
        ] as [number, number, number]
    }, [cloned])

    useEffect(() => {
        console.log('[REAL SIZE]', def.url, {
            x: measuredSize[0],
            y: measuredSize[1],
            z: measuredSize[2],
        })
    }, [measuredSize, def.url])

    // -------------------------------------------------------------------------
    // SCALE
    // -------------------------------------------------------------------------

    const GLB_DEFAULT_SIZE_MULTIPLIER = 1.3

    const scale = useMemo(() => {
        const baseWidth =
            f.targetWidth ??
            def.defaultTargetWidth ??
            measuredSize[0] * 3

        const baseDepth =
            f.targetDepth ??
            def.defaultTargetDepth ??
            measuredSize[2] * 3

        const userScale = f.scale ?? 1

        const w = baseWidth * userScale
        const d = baseDepth * userScale

        const sx =
            (w / measuredSize[0]) *
            GLB_DEFAULT_SIZE_MULTIPLIER

        const sz =
            (d / measuredSize[2]) *
            GLB_DEFAULT_SIZE_MULTIPLIER

        const sy =
            (f.heightScale ?? userScale) *
            GLB_DEFAULT_SIZE_MULTIPLIER

        return [sx, sy, sz] as [number, number, number]
    }, [
        f.targetWidth,
        f.targetDepth,
        f.heightScale,
        f.scale,
        def,
        measuredSize,
    ])

    // -------------------------------------------------------------------------
    // SELECTED MATERIAL
    // -------------------------------------------------------------------------

    const overrideMat = f.materialId
        ? _furnitureMatById.get(f.materialId)
        : undefined

    /*
     * Build the texture URL collection from the selected universal material.
     *
     * At the moment the universal material primarily supplies:
     *
     *   textureUrl
     *   normalMapUrl
     *   roughnessMapUrl
     *
     * Only add a URL when it actually exists.
     */
    const textureUrls = useMemo(() => {
        if (!overrideMat?.textureUrl) {
            return null
        }

        const urls: Record<string, string> = {
            map: overrideMat.textureUrl,
        }

        if (overrideMat.normalMapUrl) {
            urls.normalMap = overrideMat.normalMapUrl
        }

        if (overrideMat.roughnessMapUrl) {
            urls.roughnessMap = overrideMat.roughnessMapUrl
        }

        return urls
    }, [
        overrideMat?.textureUrl,
        overrideMat?.normalMapUrl,
        overrideMat?.roughnessMapUrl,
    ])

    // -------------------------------------------------------------------------
    // TEXTURE SCALE
    // -------------------------------------------------------------------------

    /*
     * The old value was:
     *
     *     useTextureMaterialProps(textureUrls, 2, 2)
     *
     * which caused the fabric pattern to become extremely dense on many GLBs.
     *
     * Use a much larger physical-looking texture size by default.
     *
     * If UniversalMaterial later gets:
     *
     *     textureScale?: number
     *
     * this automatically uses that value.
     */
    const textureScale =
        overrideMat?.textureScale ?? 0.35

    const {
        textures,
        status,
    } = useTextureMaterialProps(
        textureUrls,
        textureScale,
        textureScale,
    )
    const materialReady =
        !overrideMat?.textureUrl ||
        status === 'loaded' ||
        status === 'failed'
    // -------------------------------------------------------------------------
    // DEBUG GLTF MATERIALS / UVs
    // -------------------------------------------------------------------------

    useEffect(() => {
        const found: string[] = []

        cloned.traverse((obj) => {
            const mesh = obj as THREE.Mesh

            if (!mesh.isMesh || !mesh.material) {
                return
            }

            const materials = Array.isArray(mesh.material)
                ? mesh.material
                : [mesh.material]

            materials.forEach((material) => {
                found.push(
                    material.name || '(unnamed)'
                )
            })

            const uv = mesh.geometry?.attributes?.uv

            console.log('[GLTF UV]', {
                model: def.url,
                mesh: mesh.name || '(unnamed mesh)',
                materials: materials.map(
                    material =>
                        material.name || '(unnamed)'
                ),
                hasUV: !!uv,
                uvCount: uv?.count,
            })
        })

        console.log(
            '[GLTF materials]',
            def.url,
            Array.from(new Set(found)),
            'expected slots:',
            def.materialSlots
        )
    }, [
        cloned,
        def,
    ])

    // -------------------------------------------------------------------------
    // APPLY MATERIAL / TEXTURE
    // -------------------------------------------------------------------------

    useEffect(() => {
        cloned.traverse((obj) => {
            const mesh = obj as THREE.Mesh

            if (!mesh.isMesh) {
                return
            }

            if (!mesh.geometry || !mesh.material) {
                return
            }

            mesh.castShadow = true
            mesh.receiveShadow = true

            const sourceMaterials = Array.isArray(mesh.material)
                ? mesh.material
                : [mesh.material]

            const newMaterials = sourceMaterials.map((srcMaterial) => {
                /*
                 * We expect GLB furniture materials to normally be
                 * MeshStandardMaterial / MeshPhysicalMaterial.
                 *
                 * Clone regardless so we never mutate the original GLB
                 * material.
                 */
                const mat = srcMaterial.clone() as THREE.Material

                // -------------------------------------------------------------
                // MATERIAL SLOT CHECK
                // -------------------------------------------------------------

                const matName = srcMaterial.name

                const eligible =
                    !def.materialSlots ||
                    def.materialSlots.length === 0 ||
                    def.materialSlots.includes(matName)

                /*
                 * Material slots that aren't intended for furniture
                 * replacement should retain their original material.
                 */
                if (!eligible) {
                    return mat
                }

                // -------------------------------------------------------------
                // STANDARD / PHYSICAL MATERIAL
                // -------------------------------------------------------------

                if (
                    mat instanceof THREE.MeshStandardMaterial ||
                    mat instanceof THREE.MeshPhysicalMaterial
                ) {
                    if (overrideMat) {
                        // -----------------------------------------------------
                        // COLOR / DIFFUSE MAP
                        // -----------------------------------------------------

                        if (textures.map) {
                            const colorTexture = textures.map

                            /*
                             * Color textures are encoded in sRGB.
                             */
                            colorTexture.colorSpace =
                                THREE.SRGBColorSpace

                            colorTexture.wrapS =
                                THREE.RepeatWrapping

                            colorTexture.wrapT =
                                THREE.RepeatWrapping

                            /*
                             * IMPORTANT:
                             *
                             * The lower repeat value produces a larger,
                             * more physically believable furniture pattern.
                             */
                            colorTexture.repeat.set(
                                textureScale,
                                textureScale,
                            )

                            /*
                             * Improve texture sharpness when viewed at
                             * oblique angles.
                             */
                            colorTexture.anisotropy =
                                Math.min(
                                    16,
                                    gl.capabilities.getMaxAnisotropy()
                                )

                            colorTexture.needsUpdate = true

                            mat.map = colorTexture

                            /*
                             * Prevent the original GLB material color or
                             * vertex colors from tinting the texture.
                             */
                            mat.color.setRGB(
                                1,
                                1,
                                1
                            )

                            mat.vertexColors = false
                        }
                        else if (
                            overrideMat.textureUrl &&
                            status === 'loading'
                        ) {
                            /*
                             * Texture is still loading.
                             *
                             * Don't replace the GLB material with a flat
                             * swatch while we're waiting.
                             */
                        }
                        else {
                            /*
                             * Material has no usable texture.
                             * Fall back to the universal material swatch.
                             */
                            mat.map = null

                            mat.vertexColors = false

                            mat.color.set(
                                overrideMat.swatch ??
                                '#FFFFFF'
                            )
                        }

                        // -----------------------------------------------------
                        // NORMAL MAP
                        // -----------------------------------------------------

                        if (textures.normalMap) {
                            const normalTexture =
                                textures.normalMap

                            normalTexture.colorSpace =
                                THREE.NoColorSpace

                            normalTexture.wrapS =
                                THREE.RepeatWrapping

                            normalTexture.wrapT =
                                THREE.RepeatWrapping

                            normalTexture.repeat.set(
                                textureScale,
                                textureScale,
                            )

                            normalTexture.anisotropy =
                                Math.min(
                                    16,
                                    gl.capabilities.getMaxAnisotropy()
                                )

                            normalTexture.needsUpdate = true

                            mat.normalMap =
                                normalTexture
                        }

                        // -----------------------------------------------------
                        // ROUGHNESS MAP
                        // -----------------------------------------------------

                        if (textures.roughnessMap) {
                            const roughnessTexture =
                                textures.roughnessMap

                            roughnessTexture.colorSpace =
                                THREE.NoColorSpace

                            roughnessTexture.wrapS =
                                THREE.RepeatWrapping

                            roughnessTexture.wrapT =
                                THREE.RepeatWrapping

                            roughnessTexture.repeat.set(
                                textureScale,
                                textureScale,
                            )

                            roughnessTexture.anisotropy =
                                Math.min(
                                    16,
                                    gl.capabilities.getMaxAnisotropy()
                                )

                            roughnessTexture.needsUpdate = true

                            mat.roughnessMap =
                                roughnessTexture

                            /*
                             * The roughness texture should control the
                             * roughness value.
                             */
                            mat.roughness = 1
                        }
                        else if (
                            overrideMat.roughness !== undefined
                        ) {
                            mat.roughness =
                                overrideMat.roughness
                        }

                        // -----------------------------------------------------
                        // METALNESS
                        // -----------------------------------------------------

                        if (
                            overrideMat.metalness !==
                            undefined
                        ) {
                            mat.metalness =
                                overrideMat.metalness
                        }
                    }

                    // ---------------------------------------------------------
                    // OPACITY
                    // ---------------------------------------------------------

                    if (
                        mat.userData.__baseOpacity ===
                        undefined
                    ) {
                        mat.userData.__baseOpacity =
                            mat.opacity
                    }

                    mat.opacity =
                        mat.userData.__baseOpacity *
                        opacity

                    mat.transparent =
                        itemTransparent ||
                        mat.userData.__baseOpacity < 1

                    mat.needsUpdate = true
                }

                return mat
            })

            /*
             * Preserve the original GLB's multi-material structure.
             */
            mesh.material =
                Array.isArray(mesh.material)
                    ? newMaterials
                    : newMaterials[0]
        })

        /*
         * Cleanup:
         *
         * We intentionally DO NOT dispose the textures here because the
         * texture cache in useTextureMaterialProps owns those textures.
         *
         * Disposing them here could break another furniture instance using
         * the same cached texture.
         */
    }, [
        cloned,
        overrideMat,
        def,
        opacity,
        itemTransparent,
        textures,
        status,
        textureScale,
        gl,
    ])

    // -------------------------------------------------------------------------
    // POINTER EVENTS
    // -------------------------------------------------------------------------

    const handleClick = (e: any) => {
        if (!interactive) {
            return
        }

        e.stopPropagation()

        onSelect?.(f.id)
    }

    const handleOver = (e: any) => {
        if (!interactive) {
            return
        }

        e.stopPropagation()

        setHovered(true)

        document.body.style.cursor = 'pointer'
    }

    const handleOut = (e: any) => {
        if (!interactive) {
            return
        }

        e.stopPropagation()

        setHovered(false)

        document.body.style.cursor = 'auto'
    }
    const { center, bottomY } = useMemo(() => {
        const box = new THREE.Box3().setFromObject(cloned)
        const c = new THREE.Vector3()
        box.getCenter(c)
        return { center: c, bottomY: box.min.y }
    }, [cloned])
    // -------------------------------------------------------------------------
    // DEBUG
    // -------------------------------------------------------------------------

    console.log('[GLTFFurnitureMesh]', {
        type: f.type,
        materialId: f.materialId,
        material: overrideMat,
        textureScale,
        status,
        textures: {
            map: !!textures.map,
            normalMap: !!textures.normalMap,
            roughnessMap: !!textures.roughnessMap,
        },
    })

    // -------------------------------------------------------------------------
    // RENDER
    // -------------------------------------------------------------------------

    return (
        <group
            ref={groupRef}
            position={[f.x, f.heightOffset ?? 0, f.z]}
            rotation={[
                0,
                f.rotation +
                (f.rotationOffset ?? 0) +
                (def.rotationOffset?.[1] ?? 0),
                0,
            ]}
            scale={scale}
            visible={materialReady}
            onClick={handleClick}
            onPointerOver={handleOver}
            onPointerOut={handleOut}
        >
            <primitive
                object={cloned}
                position={[
                    -center.x + (def.positionOffset?.[0] ?? 0),
                    -bottomY + (def.positionOffset?.[1] ?? 0),
                    -center.z + (def.positionOffset?.[2] ?? 0),
                ]}
            />
        </group>
    )
}