import type { FloorPlanState, LineNode, LineSegment } from "./constants";

type EdgeAnchor = { roomId?: string; segmentNodeIds?: string[]; segmentT?: number; position?: number };

function insertWallNodes(shape: NonNullable<FloorPlanState["closedShapes"]>[number], path: string[]) {
    const a = path[0], b = path.at(-1);
    const index = shape.nodeIds.findIndex((from, i, ids) => {
        const to = ids[(i + 1) % ids.length];
        return (from === a && to === b) || (from === b && to === a);
    });
    if (index < 0) return shape;
    const inserted = path.slice(1, -1);
    if (shape.nodeIds[index] === b) inserted.reverse();
    const nodeIds = [...shape.nodeIds];
    nodeIds.splice(index + 1, 0, ...inserted);

    const guard = shape.cutout?.guard;
    if (!guard?.edgeOverrides) return { ...shape, nodeIds };
    const edgeOverrides: NonNullable<typeof guard.edgeOverrides> = {};
    shape.nodeIds.forEach((_, i) => {
        const override = guard.edgeOverrides?.[`${shape.id}::guard::${i}`];
        if (!override) return;
        const start = i > index ? i + inserted.length : i;
        const count = i === index ? inserted.length + 1 : 1;
        for (let offset = 0; offset < count; offset++) {
            edgeOverrides[`${shape.id}::guard::${start + offset}`] = override;
        }
    });
    return { ...shape, nodeIds, cutout: { ...shape.cutout!, guard: { ...guard, edgeOverrides } } };
}

export function normalizeWallSegments(fp: FloorPlanState, uid: () => string): FloorPlanState {
    const piecesByWall = new Map<string, LineSegment[]>();
    const lineSegments = fp.lineSegments.flatMap(wall => {
        if (wall.nodeIds.length <= 2) return [wall];
        const pieces = wall.nodeIds.slice(1).map((end, index) => ({
            ...wall,
            id: index === 0 ? wall.id : uid(),
            nodeIds: [wall.nodeIds[index], end],
            closed: false,
        }));
        piecesByWall.set(wall.id, pieces);
        return pieces;
    });
    if (!piecesByWall.size) return fp;

    const nodes = new Map(fp.lineNodes.map(node => [node.id, node]));
    function reanchor<T extends EdgeAnchor>(item: T): T {
        if (!item.roomId || !item.segmentNodeIds || item.segmentT === undefined) return item;
        const pieces = piecesByWall.get(item.roomId);
        if (!pieces) return item;
        const [from, to] = item.segmentNodeIds;
        const start = nodes.get(from);
        const end = nodes.get(to);
        if (!start || !end) return item;
        // Older bends could leave anchors attached to the original chord.
        const x = start.x + (end.x - start.x) * item.segmentT;
        const z = start.z + (end.z - start.z) * item.segmentT;
        let nearest: { wall: LineSegment; t: number; length: number; distance: number } | undefined;
        for (const wall of pieces) {
            const a = nodes.get(wall.nodeIds[0]), b = nodes.get(wall.nodeIds[1]);
            if (!a || !b) continue;
            const dx = b.x - a.x, dz = b.z - a.z;
            const lengthSquared = dx * dx + dz * dz;
            if (!lengthSquared) continue;
            const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / lengthSquared));
            const distance = Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t));
            if (!nearest || distance < nearest.distance) nearest = { wall, t, length: Math.sqrt(lengthSquared), distance };
        }
        if (!nearest) return item;
        return {
            ...item,
            roomId: nearest.wall.id,
            segmentNodeIds: nearest.wall.nodeIds,
            segmentT: nearest.t,
            ...(item.position !== undefined ? { position: nearest.t * nearest.length } : {}),
        };
    }

    return {
        ...fp,
        lineSegments,
        openings: fp.openings.map(reanchor),
        wallDecor: fp.wallDecor?.map(reanchor),
        lights: fp.lights?.map(reanchor),
        closedShapes: fp.closedShapes?.map(shape => {
            for (const pieces of piecesByWall.values()) {
                const path = [pieces[0].nodeIds[0], ...pieces.map(piece => piece.nodeIds[1])];
                shape = insertWallNodes(shape, path);
            }
            if (!shape.wallOverrides) return shape;
            const wallOverrides = { ...shape.wallOverrides };
            for (const [wallId, pieces] of piecesByWall) {
                pieces.forEach((piece, index) => {
                    if (index === 0) return;
                    const oldKey = `${wallId}_${index}`;
                    const override = wallOverrides[oldKey];
                    if (!override) return;
                    delete wallOverrides[oldKey];
                    wallOverrides[`${piece.id}_0`] = override;
                });
            }
            return { ...shape, wallOverrides };
        }),
    };
}

export function splitWallSegment(
    fp: FloorPlanState,
    wall: LineSegment,
    t: number,
    uid: () => string,
): { state: FloorPlanState; node: LineNode } | null {
    if (wall.nodeIds.length !== 2 || !(t > 0 && t < 1)) return null;
    const [aId, bId] = wall.nodeIds;
    const a = fp.lineNodes.find(node => node.id === aId);
    const b = fp.lineNodes.find(node => node.id === bId);
    if (!a || !b || (a.x === b.x && a.z === b.z)) return null;

    const node = { id: uid(), x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
    const wallLength = Math.hypot(b.x - a.x, b.z - a.z);
    const first = { ...wall, nodeIds: [aId, node.id], closed: false };
    const second = { ...wall, id: uid(), nodeIds: [node.id, bId], closed: false };

    function reanchor<T extends EdgeAnchor>(item: T): T {
        const [from, to] = item.segmentNodeIds ?? [];
        if (item.segmentT === undefined) return item;
        const forward = from === aId && to === bId;
        if (!forward && !(from === bId && to === aId)) return item;
        const originalT = forward ? item.segmentT : 1 - item.segmentT;
        const piece = originalT <= t ? first : second;
        const localT = originalT <= t ? originalT / t : (originalT - t) / (1 - t);
        const length = wallLength * (piece === first ? t : 1 - t);
        return {
            ...item,
            ...(item.roomId === wall.id ? { roomId: piece.id } : {}),
            ...(item.position !== undefined ? { position: localT * length } : {}),
            segmentNodeIds: piece.nodeIds,
            segmentT: localT,
        };
    }

    return {
        node,
        state: {
            ...fp,
            lineNodes: [...fp.lineNodes, node],
            lineSegments: fp.lineSegments.flatMap(segment => segment.id === wall.id ? [first, second] : [segment]),
            closedShapes: fp.closedShapes?.map(shape => {
                const override = shape.wallOverrides?.[`${wall.id}_0`];
                shape = insertWallNodes(shape, [aId, node.id, bId]);
                if (!override) return shape;
                return {
                    ...shape,
                    wallOverrides: { ...shape.wallOverrides, [`${second.id}_0`]: override },
                };
            }),
            openings: fp.openings.map(reanchor),
            wallDecor: fp.wallDecor?.map(reanchor),
            lights: fp.lights?.map(reanchor),
        },
    };
}
