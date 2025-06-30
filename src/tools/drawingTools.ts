import type { State, LineShape, RectangleShape, CircleShape, BezierCurveShape } from '../state';
import { CoordinateTransformer } from '../canvas/coordinates';
import { generateId } from '../state';
import { AddShapeCommand } from '../commands';
import { CommandExecutor } from '../commandExecutor';
import { PALETTE } from '../constants';

export class DrawingTools {
    private isDrawing = false;
    private startWorldX = 0;
    private startWorldY = 0;
    private coordinateTransformer: CoordinateTransformer;
    private executor: CommandExecutor;
    private onHistoryChange?: () => void;

    constructor(canvas: HTMLCanvasElement, executor: CommandExecutor, onHistoryChange?: () => void) {
        this.coordinateTransformer = new CoordinateTransformer(canvas);
        this.executor = executor;
        this.onHistoryChange = onHistoryChange;
    }

    handleMouseDown(e: MouseEvent, state: State): boolean {
        if (e.button === 0 && state.tool !== 'pan') {
            this.isDrawing = true;
            const worldPos = this.coordinateTransformer.screenToWorld(e.clientX, e.clientY, state);
            this.startWorldX = worldPos.x;
            this.startWorldY = worldPos.y;
            
            // Initialize current drawing
            this.initializeDrawing(state);
            return true;
        }
        return false;
    }

    handleMouseMove(e: MouseEvent, state: State): boolean {
        if (this.isDrawing && state.currentDrawing.shape) {
            const worldPos = this.coordinateTransformer.screenToWorld(e.clientX, e.clientY, state);
            this.updateDrawing(worldPos.x, worldPos.y, state);
            return true;
        }
        return false;
    }

    handleMouseUp(state: State): boolean {
        if (this.isDrawing && state.currentDrawing.shape) {
            this.finalizeDrawing(state);
            this.isDrawing = false;
            return true;
        }
        return false;
    }

    private initializeDrawing(state: State) {
        switch (state.tool) {
            case 'line':
                state.currentDrawing.shape = {
                    id: generateId(),
                    type: 'line',
                    color: state.currentColor,
                    strokeColor: state.strokeColor,
                    strokeStyle: state.strokeStyle,
                    strokeWidth: state.strokeWidth,
                    x1: this.startWorldX,
                    y1: this.startWorldY,
                    x2: this.startWorldX,
                    y2: this.startWorldY
                } as LineShape;
                state.currentDrawing.type = 'line';
                break;
            case 'rectangle':
                state.currentDrawing.shape = {
                    id: generateId(),
                    type: 'rectangle',
                    color: state.currentColor,
                    fillMode: state.fillMode,
                    strokeColor: state.strokeColor,
                    fillColor: state.fillColor,
                    strokeStyle: state.strokeStyle,
                    strokeWidth: state.strokeWidth,
                    x: this.startWorldX,
                    y: this.startWorldY,
                    width: 0,
                    height: 0
                } as RectangleShape;
                state.currentDrawing.type = 'rectangle';
                break;
            case 'circle':
                state.currentDrawing.shape = {
                    id: generateId(),
                    type: 'circle',
                    color: state.currentColor,
                    fillMode: state.fillMode,
                    strokeColor: state.strokeColor,
                    fillColor: state.fillColor,
                    strokeStyle: state.strokeStyle,
                    strokeWidth: state.strokeWidth,
                    x: this.startWorldX,
                    y: this.startWorldY,
                    radius: 0
                } as CircleShape;
                state.currentDrawing.type = 'circle';
                break;
            case 'curve':
                state.currentDrawing.shape = {
                    id: generateId(),
                    type: 'bezier',
                    color: state.currentColor,
                    strokeColor: state.strokeColor,
                    strokeStyle: state.strokeStyle,
                    strokeWidth: state.strokeWidth,
                    points: [
                        { x: this.startWorldX, y: this.startWorldY }, // p0
                        { x: this.startWorldX, y: this.startWorldY }, // cp1
                        { x: this.startWorldX, y: this.startWorldY }, // cp2
                        { x: this.startWorldX, y: this.startWorldY }  // p1
                    ]
                } as BezierCurveShape;
                state.currentDrawing.type = 'curve';
                break;
        }
    }

    private updateDrawing(currentX: number, currentY: number, state: State) {
        if (!state.currentDrawing.shape) return;

        switch (state.tool) {
            case 'line':
                const line = state.currentDrawing.shape as LineShape;
                line.x2 = currentX;
                line.y2 = currentY;
                break;
            case 'rectangle':
                const rect = state.currentDrawing.shape as RectangleShape;
                rect.x = Math.min(this.startWorldX, currentX);
                rect.y = Math.min(this.startWorldY, currentY);
                rect.width = Math.abs(currentX - this.startWorldX);
                rect.height = Math.abs(currentY - this.startWorldY);
                break;
            case 'circle':
                const circle = state.currentDrawing.shape as CircleShape;
                const dx = currentX - this.startWorldX;
                const dy = currentY - this.startWorldY;
                circle.radius = Math.sqrt(dx * dx + dy * dy);
                break;
            case 'curve':
                const curve = state.currentDrawing.shape as BezierCurveShape;
                // Update end point
                curve.points[3] = { x: currentX, y: currentY };
                
                // Calculate direction vector and perpendicular offset for visible curve
                const vx = currentX - this.startWorldX;
                const vy = currentY - this.startWorldY;
                const length = Math.sqrt(vx * vx + vy * vy);
                
                if (length > 0) {
                    // Perpendicular vector (normalized)
                    const px = -vy / length;
                    const py = vx / length;
                    
                    // Offset distance for curve visibility
                    const offset = length / 4;
                    
                    // Control points at 1/3 and 2/3 along the line, offset perpendicularly
                    const t1 = 1/3, t2 = 2/3;
                    curve.points[1] = {
                        x: this.startWorldX + vx * t1 + px * offset,
                        y: this.startWorldY + vy * t1 + py * offset
                    };
                    curve.points[2] = {
                        x: this.startWorldX + vx * t2 + px * offset,
                        y: this.startWorldY + vy * t2 + py * offset
                    };
                } else {
                    // Fallback for zero-length case
                    curve.points[1] = { x: this.startWorldX, y: this.startWorldY };
                    curve.points[2] = { x: currentX, y: currentY };
                }
                break;
        }
    }

    private finalizeDrawing(state: State) {
        if (!state.currentDrawing.shape) return;

        let shouldAdd = false;
        const shape = state.currentDrawing.shape;

        switch (state.currentDrawing.type) {
            case 'line':
                shouldAdd = true;
                break;
            case 'rectangle':
                const rect = shape as RectangleShape;
                shouldAdd = rect.width > 1 || rect.height > 1;
                break;
            case 'circle':
                const circle = shape as CircleShape;
                shouldAdd = circle.radius > 1;
                break;
            case 'curve':
                const curve = shape as BezierCurveShape;
                const p0 = curve.points[0];
                const p1 = curve.points[3];
                const distance = Math.sqrt((p1.x - p0.x) ** 2 + (p1.y - p0.y) ** 2);
                shouldAdd = distance > 1;
                break;
        }

        if (shouldAdd) {
            const command = new AddShapeCommand(shape);
            this.executor.execute(command, state);
            this.onHistoryChange?.();
        }
        
        // Clear current drawing
        state.currentDrawing.shape = null;
        state.currentDrawing.type = null;
    }
}
