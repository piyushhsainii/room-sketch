import type { DesignDocument } from './document';
import { McpToolError } from './errors';

function escape(text: string) { return text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!); }

/** Portable SVG only: no scripts, external URLs, HTML, or untrusted markup. */
export function renderPreview(document: DesignDocument, floorId: string) {
  const floor = document.projectFloorPlan.floors.find(floor => floor.id === floorId);
  if (!floor) throw new McpToolError('not_found', 'Floor not found.');
  const fp = floor.state;
  const points = [...fp.rooms.flatMap(room => [{ x: room.x, z: room.z }, { x: room.x + room.width, z: room.z + room.depth }]),
    ...fp.lineNodes, ...fp.furniture.map(item => ({ x: item.x, z: item.z }))];
  const minX = Math.min(0, ...points.map(p => p.x)) - 1, minZ = Math.min(0, ...points.map(p => p.z)) - 1;
  const width = Math.max(5, ...points.map(p => p.x - minX)) + 1, height = Math.max(5, ...points.map(p => p.z - minZ)) + 1;
  const rooms = fp.rooms.map(room => `<g><rect x="${room.x}" y="${room.z}" width="${room.width}" height="${room.depth}" fill="#eef2ff" stroke="#334155" stroke-width="0.12"/><text x="${room.x + room.width / 2}" y="${room.z + room.depth / 2}" text-anchor="middle" font-size="0.25">${escape(room.label)}</text></g>`).join('');
  const nodes = new Map(fp.lineNodes.map(node => [node.id, node]));
  const walls = fp.lineSegments.map(segment => `<polyline points="${segment.nodeIds.map(id => nodes.get(id)).filter(p => p !== undefined).map(p => `${p.x},${p.z}`).join(' ')}" fill="none" stroke="#334155" stroke-width="${segment.thickness}"/>`).join('');
  const furniture = fp.furniture.map(item => {
    const w = (item.targetWidth ?? 0.6) * 1.3 * item.scale, d = (item.targetDepth ?? 0.6) * 1.3 * item.scale;
    return `<rect x="${item.x - w / 2}" y="${item.z - d / 2}" width="${w}" height="${d}" transform="rotate(${item.rotation * 180 / Math.PI} ${item.x} ${item.z})" fill="#cbd5e1" stroke="#64748b" stroke-width="0.03"/>`;
  }).join('');
  const openings = fp.openings.filter(item => !item.segmentNodeIds).map(item => {
    const room = fp.rooms.find(room => room.id === item.roomId); if (!room) return '';
    const horizontal = item.wall === 'north' || item.wall === 'south';
    const x = room.x + (horizontal ? item.position - item.width / 2 : item.wall === 'east' ? room.width : 0);
    const z = room.z + (!horizontal ? item.position - item.width / 2 : item.wall === 'south' ? room.depth : 0);
    return `<line x1="${x}" y1="${z}" x2="${x + (horizontal ? item.width : 0)}" y2="${z + (horizontal ? 0 : item.width)}" stroke="${item.type === 'window' ? '#0ea5e9' : '#f59e0b'}" stroke-width="0.14"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minZ} ${width} ${height}" width="960" height="720" role="img" aria-label="${escape(floor.label)}"><rect x="${minX}" y="${minZ}" width="${width}" height="${height}" fill="white"/>${rooms}${walls}${furniture}${openings}</svg>`;
}
