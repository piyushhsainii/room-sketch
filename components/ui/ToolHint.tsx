import React from 'react'
import { THEME } from '../workspace/FloorPlanEditor';
import { FURNITURE_LABELS, FurnitureType } from '../workspace/Tools/constants';


interface WorkspaceStatusBarProps {
    tool: string;
    drawStart: {
        x: number;
        z: number;
    } | null;
    lineActiveNodeRef: React.RefObject<any>; // Can replace 'any' with your Node type if available
    isDoorTool: boolean;
    isWindowTool: boolean;
    isOpeningTool: boolean;
    isStairsTool: boolean;
    isWallDecorTool: boolean;
    selectedFurnitureType: FurnitureType;
}

const ToolHintBar = ({
    tool,
    drawStart,
    lineActiveNodeRef,
    isDoorTool,
    isWindowTool,
    isOpeningTool,
    isStairsTool,
    isWallDecorTool,
    selectedFurnitureType
}: WorkspaceStatusBarProps) => {
    return (
        <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', background: THEME.bgPanel, border: `1px solid ${THEME.border}`, borderRadius: 8, padding: '6px 14px', fontSize: 11, color: THEME.textMuted, pointerEvents: 'none', whiteSpace: 'nowrap', boxShadow: THEME.shadow }}>
            {tool === 'select' && 'Click to select · Drag room/node · Click segment to drag whole wall'}
            {tool === 'pan' && 'Click and drag to pan the canvas'}
            {tool === 'room' && (drawStart ? 'Drag to set room size · Release to place' : 'Click and drag to draw a room')}
            {tool === 'line' && (lineActiveNodeRef.current ? 'Click to continue wall · Click existing node to close' : 'Click to start a wall segment')}
            {tool === 'bend' && (lineActiveNodeRef.current ? 'Click to place curved wall point · Click existing node to close' : 'Click to start a curved wall')}
            {isDoorTool && 'Click on a room wall or line wall to place a door'}
            {isWindowTool && 'Click on a room wall or line wall to place a window'}
            {isOpeningTool && 'Click on a room wall or line wall to place an opening'}
            {isStairsTool && 'Click and drag to place stairs · Drag to set orientation'}
            {tool === 'delete' && 'Click on a room, wall or node to delete it'}
            {tool === 'pencil' && 'Draw freehand — release to create room from bounding box'}
            {tool === 'annotate' && 'Click anywhere to add a label · Click existing label to edit · Delete tool removes labels'}
            {tool === 'furniture' && `Placing: ${FURNITURE_LABELS[selectedFurnitureType]} · Click canvas to place · Drag to move · Delete tool removes`}
            {isWallDecorTool && 'Click on a wall to place wall decor · Drag along wall to reposition'}
        </div>
    )
}

export default ToolHintBar