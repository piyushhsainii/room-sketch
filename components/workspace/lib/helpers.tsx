import { FloorPlanState, LineNode } from "../lib/constants";

export function getSegmentAngle(a: LineNode, b: LineNode) {
    return Math.atan2(b.z - a.z, b.x - a.x)
}
