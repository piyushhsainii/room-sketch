import { FloorPlanState, LineNode } from "@/components/workspace/lib/constants";
import { classifySelection } from "@/components/workspace/QuickActionMenu";
import { snapFurniture, snapM, uid } from "@/lib/helpers";

type SetFp = (updater: (prev: FloorPlanState) => FloorPlanState) => void;

/**
 * Applies a "Move" commit (from the QuickActionMenu's Move-to-click flow) for
 * whichever entity kind `id` resolves to. Kept as one switch — matching how
 * classifySelection already centralizes "what kind of thing is this id" — so
 * a new entity kind only needs a case added here, not a parallel dispatcher.
 *
 * `currentFp` is passed in explicitly (rather than reaching into a ref)
 * so this is easy to call from anywhere with whatever fp snapshot is live.
 */
export function commitMove(
  currentFp: FloorPlanState,
  id: string,
  wx: number,
  wz: number,
  setFp: SetFp,
  pushHistory: () => void,
) {
  const kind = classifySelection(currentFp, id);
  if (!kind) return;

  switch (kind) {
    case "furniture": {
      const nx = snapFurniture(wx),
        nz = snapFurniture(wz);
      pushHistory();
      setFp((prev) => ({
        ...prev,
        furniture: (prev.furniture ?? []).map((f) =>
          f.id === id ? { ...f, x: nx, z: nz } : f,
        ),
      }));
      return;
    }
    case "stairs": {
      const s = (currentFp.stairs ?? []).find((s) => s.id === id);
      if (!s) return;
      const nx = snapM(wx - s.width / 2),
        nz = snapM(wz - s.depth / 2);
      pushHistory();
      setFp((prev) => ({
        ...prev,
        stairs: (prev.stairs ?? []).map((st) =>
          st.id === id ? { ...st, x: nx, z: nz } : st,
        ),
      }));
      return;
    }
    case "outdoor": {
      const nx = snapM(wx),
        nz = snapM(wz);
      pushHistory();
      setFp((prev) => ({
        ...prev,
        outdoorObjects: (prev.outdoorObjects ?? []).map((o) =>
          o.id === id ? { ...o, x: nx, z: nz } : o,
        ),
      }));
      return;
    }
    case "room": {
      const room = currentFp.rooms.find((r) => r.id === id);
      if (!room) return;
      const nx = snapM(wx - room.width / 2);
      const nz = snapM(wz - room.depth / 2);
      pushHistory();
      setFp((prev) => ({
        ...prev,
        rooms: prev.rooms.map((r) =>
          r.id === id ? { ...r, x: nx, z: nz } : r,
        ),
      }));
      return;
    }
    case "segment": {
      // Same connected-chain BFS the segment drag-start uses, so
      // "move the whole wall loop" behaves identically whether
      // triggered by drag or by Move-commit.
      const seg = currentFp.lineSegments.find((s) => s.id === id);
      if (!seg) return;
      const adj = new Map<string, string[]>();
      for (const s of currentFp.lineSegments) {
        for (let i = 0; i < s.nodeIds.length - 1; i++) {
          const a = s.nodeIds[i]!,
            b = s.nodeIds[i + 1]!;
          if (!adj.has(a)) adj.set(a, []);
          if (!adj.has(b)) adj.set(b, []);
          adj.get(a)!.push(b);
          adj.get(b)!.push(a);
        }
      }
      const visited = new Set<string>();
      const queue = [seg.nodeIds[0]!];
      while (queue.length) {
        const cur = queue.shift()!;
        if (visited.has(cur)) continue;
        visited.add(cur);
        for (const nb of adj.get(cur) ?? [])
          if (!visited.has(nb)) queue.push(nb);
      }
      const nodes = [...visited]
        .map((nid) => currentFp.lineNodes.find((n) => n.id === nid))
        .filter(Boolean) as LineNode[];
      if (nodes.length === 0) return;
      const cx = nodes.reduce((s, n) => s + n.x, 0) / nodes.length;
      const cz = nodes.reduce((s, n) => s + n.z, 0) / nodes.length;
      const ddx = snapM(wx) - cx,
        ddz = snapM(wz) - cz;
      pushHistory();
      setFp((prev) => ({
        ...prev,
        lineNodes: prev.lineNodes.map((n) =>
          visited.has(n.id) ? { ...n, x: n.x + ddx, z: n.z + ddz } : n,
        ),
      }));
      return;
    }
    case "shape": {
      // IMPORTANT: shapes can share lineNodes with neighboring shapes
      // (adjacent rooms sharing a wall corner, etc). Moving a shape's
      // nodes directly would drag the neighbor's geometry along with
      // it, so any node shared with another shape is cloned first and
      // only the clone is moved — the original stays put for whoever
      // else references it. Do not "simplify" this away.
      const shape = (currentFp.closedShapes ?? []).find((s) => s.id === id);
      if (!shape) return;

      const otherShapes = (currentFp.closedShapes ?? []).filter(
        (s) => s.id !== shape.id,
      );
      const sharedNodeIds = new Set(
        shape.nodeIds.filter((nid) =>
          otherShapes.some((o) => o.nodeIds.includes(nid)),
        ),
      );

      let workingFp = currentFp;
      let workingNodeIds = shape.nodeIds;

      if (sharedNodeIds.size > 0) {
        const idRemap = new Map<string, string>();
        const clonedNodes: LineNode[] = [];
        for (const nid of sharedNodeIds) {
          const original = workingFp.lineNodes.find((n) => n.id === nid);
          if (!original) continue;
          const clone: LineNode = { id: uid(), x: original.x, z: original.z };
          idRemap.set(nid, clone.id);
          clonedNodes.push(clone);
        }
        workingNodeIds = shape.nodeIds.map((nid) => idRemap.get(nid) ?? nid);
        const updatedSegments = workingFp.lineSegments.map((seg) => {
          const touchesThisShape = seg.nodeIds.every((nid) =>
            shape.nodeIds.includes(nid),
          );
          if (!touchesThisShape) return seg;
          return {
            ...seg,
            nodeIds: seg.nodeIds.map((nid) => idRemap.get(nid) ?? nid),
          };
        });
        const updatedShapes = (workingFp.closedShapes ?? []).map((s) =>
          s.id === shape.id ? { ...s, nodeIds: workingNodeIds } : s,
        );
        workingFp = {
          ...workingFp,
          lineNodes: [...workingFp.lineNodes, ...clonedNodes],
          lineSegments: updatedSegments,
          closedShapes: updatedShapes,
        };
      }

      const nodes = workingNodeIds
        .map((nid) => workingFp.lineNodes.find((n) => n.id === nid))
        .filter(Boolean) as LineNode[];
      if (nodes.length === 0) return;
      const cx = nodes.reduce((s, n) => s + n.x, 0) / nodes.length;
      const cz = nodes.reduce((s, n) => s + n.z, 0) / nodes.length;
      const ddx = snapM(wx) - cx,
        ddz = snapM(wz) - cz;
      const nodeIdSet = new Set(workingNodeIds);

      pushHistory();
      setFp((prev) => {
        const base = sharedNodeIds.size > 0 ? { ...prev, ...workingFp } : prev;
        return {
          ...base,
          lineNodes: base.lineNodes.map((n) =>
            nodeIdSet.has(n.id) ? { ...n, x: n.x + ddx, z: n.z + ddz } : n,
          ),
        };
      });
      return;
    }
    default:
      return; // node / wall / wallDecor / opening / light — no Move button, nothing to commit
  }
}
