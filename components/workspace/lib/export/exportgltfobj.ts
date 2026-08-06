// lib/export/exportGltfObj.ts
//
// STEP 3 — glTF and OBJ (3D) exporters.
//
// Design decisions (per Plan 3, documented up front rather than buried):
//  - Materials: BASE-COLOR ONLY for v1. No texture maps are bundled.
//    This matches Plan 3's recommendation — texture bundling introduces
//    asset-licensing and file-size concerns that are explicitly scoped
//    out of the first version. Every mesh material below sets `color`
//    from the same value used on screen and nothing else.
//  - Runs synchronously on the main thread with a progress callback.
//    Given the primitive complexity in this app (boxes, cylinders, simple
//    extrusions — no imported high-poly assets), this is fast enough that
//    a worker isn't warranted for v1. Revisit if plans start containing
//    very large object counts.
//  - Source of truth is the SAME Object3D graph already mounted for the
//    live 3D preview (see integration note at the bottom of this file) —
//    NOT a second independent walk of FloorPlanState. This guarantees
//    "what you see in 3D is what you get in the file" by construction.

function warnOnEmptyTaggedGroups(root: THREE.Object3D) {
  if (process.env.NODE_ENV === "production") return;
  root.traverse((obj) => {
    const tag = obj.userData?.__meshType;
    if (!tag) return;
    let hasGeometry = false;
    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) hasGeometry = true;
    });
    if (!hasGeometry) {
      // eslint-disable-next-line no-console
      console.warn(
        `[export] "${tag}" (id=${obj.userData?.__id ?? "?"}) produced no geometry — ` +
          `this object type is likely falling through to a null/default branch ` +
          `in its mesh component and will be silently missing from the export.`,
      );
    }
  });
}

import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { OBJExporter } from "three/examples/jsm/exporters/OBJExporter.js";

function extractColor(
  material: THREE.Material | THREE.Material[] | null | undefined,
): THREE.Color {
  if (!material) return new THREE.Color(0xcccccc);

  const mat = Array.isArray(material) ? material[0] : material;

  // Only trust real Three.js materials that still have a .color
  if (
    mat &&
    typeof (mat as any).isMaterial === "boolean" &&
    (mat as any).isMaterial &&
    (mat as any).color?.isColor
  ) {
    return (mat as any).color.clone();
  }

  return new THREE.Color(0xcccccc);
}

function buildFlatColorExportGraph(sceneRoot: THREE.Object3D): THREE.Group {
  const root = new THREE.Group();
  root.name = "export-root";

  sceneRoot.updateMatrixWorld(true);

  sceneRoot.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return;

    const mesh = obj as THREE.Mesh;
    if (!mesh.geometry) return;

    // Skip empty / invalid geometry
    const pos = mesh.geometry.attributes.position;
    if (!pos || pos.count === 0) return;

    const color = extractColor(mesh.material);

    // Always create a brand-new material – never reuse / clone the original
    const flatMat = new THREE.MeshStandardMaterial({
      color,
      side: THREE.DoubleSide,
      metalness: 0,
      roughness: 1,
      // no maps, no event listeners needed
    });

    const exportMesh = new THREE.Mesh(mesh.geometry.clone(), flatMat);
    exportMesh.name = mesh.name || "mesh";
    exportMesh.matrix.copy(mesh.matrixWorld);
    exportMesh.matrix.decompose(
      exportMesh.position,
      exportMesh.quaternion,
      exportMesh.scale,
    );
    exportMesh.matrixAutoUpdate = true;

    root.add(exportMesh);
  });

  return root;
}

// Your existing export functions stay almost the same
export async function exportGLTF(
  sceneRoot: THREE.Object3D,
  filename = "floor-plan.glb",
  onProgress?: ExportProgress,
): Promise<void> {
  onProgress?.("Preparing scene", 10);
  warnOnEmptyTaggedGroups?.(sceneRoot);

  const exportGraph = buildFlatColorExportGraph(sceneRoot);

  onProgress?.("Serializing glTF", 50);
  const exporter = new GLTFExporter();
  const result = await new Promise<ArrayBuffer | object>((resolve, reject) => {
    exporter.parse(
      exportGraph,
      (gltf) => resolve(gltf),
      (err) => reject(err),
      { binary: true, onlyVisible: true },
    );
  });

  onProgress?.("Triggering download", 90);
  const blob =
    result instanceof ArrayBuffer
      ? new Blob([result], { type: "model/gltf-binary" })
      : new Blob([JSON.stringify(result)], { type: "model/gltf+json" });
  triggerDownload(blob, filename);
  onProgress?.("Done", 100);
}

export type ExportProgress = (
  stage: string,
  percent: number, // 0–100
) => void;

export function exportOBJ(
  sceneRoot: THREE.Object3D,
  filename = "floor-plan.obj",
  onProgress?: ExportProgress,
): void {
  onProgress?.("Preparing scene", 10);
  warnOnEmptyTaggedGroups?.(sceneRoot);

  const exportGraph = buildFlatColorExportGraph(sceneRoot);

  onProgress?.("Serializing OBJ", 60);
  const exporter = new OBJExporter();
  const objText = exporter.parse(exportGraph);

  onProgress?.("Triggering download", 90);
  const blob = new Blob([objText], { type: "text/plain" });
  triggerDownload(blob, filename);
  onProgress?.("Done", 100);
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Integration note ────────────────────────────────────────────────────
// In scene-graph.tsx / your R3F canvas, get a ref to the group that
// contains <LineWalls3D>, furniture, stairs, lights, outdoor objects, etc:
//
//   const exportRootRef = useRef<THREE.Group>(null)
//   <group ref={exportRootRef}> ...all 3D content... </group>
//
// Then, from the export menu handler:
//   if (exportRootRef.current) exportGLTF(exportRootRef.current)
//
// This deliberately reuses the mounted R3F scene graph rather than
// reconstructing geometry from FloorPlanState, per Step 3.
