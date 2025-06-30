import type { State, Shape } from '../state';
import { ShapeMigration } from '../core/binary/shapeMigration';
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
        const styles = {
            fillMode: state.fillMode,
            strokeColor: state.strokeColor,
            fillColor: state.fillColor,
            strokeStyle: state.strokeStyle,
            strokeWidth: state.strokeWidth
        };

        switch (state.tool) {
            case 'line':
                state.currentDrawing.shape = ShapeMigration.createBinaryShape('line', {
                    x1: this.startWorldX,
                    y1: this.startWorldY,
                    x2: this.startWorldX,
                    y2: this.startWorldY
                }, styles);
                state.currentDrawing.type = 'line';
                break;
            case 'rectangle':
                state.currentDrawing.shape = ShapeMigration.createBinaryShape('rectangle', {
                    x: this.startWorldX,
                    y: this.startWorldY,
                    width: 0,
                    height: 0
                }, styles);
                state.currentDrawing.type = 'rectangle';
                break;
            case 'circle':
                state.currentDrawing.shape = ShapeMigration.createBinaryShape('circle', {
                    x: this.startWorldX,
                    y: this.startWorldY,
                    radius: 0
                }, styles);
                state.currentDrawing.type = 'circle';
                break;
            case 'curve':
                state.currentDrawing.shape = ShapeMigration.createBinaryShape('bezier', {
                    points: [
                        { x: this.startWorldX, y: this.startWorldY }, // p0
                        { x: this.startWorldX, y: this.startWorldY }, // cp1
                        { x: this.startWorldX, y: this.startWorldY }, // cp2
                        { x: this.startWorldX, y: this.startWorldY }  // p1
                    ]
                }, styles);
                state.currentDrawing.type = 'curve';
                break;
        }
    }

    private updateDrawing(currentX: number, currentY: number, state: State) {
        if (!state.currentDrawing.shape) return;

        switch (state.tool) {
            case 'line':
                state.currentDrawing.shape.x2 = currentX;
                state.currentDrawing.shape.y2 = currentY;
                break;
            case 'rectangle':
                state.currentDrawing.shape.x = Math.min(this.startWorldX, currentX);
                state.currentDrawing.shape.y = Math.min(this.startWorldY, currentY);
                state.currentDrawing.shape.width = Math.abs(currentX - this.startWorldX);
                state.currentDrawing.shape.height = Math.abs(currentY - this.startWorldY);
                break;
            case 'circle':
                const dx = currentX - this.startWorldX;
                const dy = currentY - this.startWorldY;
                state.currentDrawing.shape.radius = Math.sqrt(dx * dx + dy * dy);
                break;
            case 'curve':
                // Update end point
                const currentPoints = [...state.currentDrawing.shape.points];
                currentPoints[3] = { x: currentX, y: currentY };
                
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
                    currentPoints[1] = {
                        x: this.startWorldX + vx * t1 + px * offset,
                        y: this.startWorldY + vy * t1 + py * offset
                    };
                    currentPoints[2] = {
                        x: this.startWorldX + vx * t2 + px * offset,
                        y: this.startWorldY + vy * t2 + py * offset
                    };
                } else {
                    // Fallback for zero-length case
                    currentPoints[1] = { x: this.startWorldX, y: this.startWorldY };
                    currentPoints[2] = { x: currentX, y: currentY };
                }
                
                state.currentDrawing.shape.points = currentPoints;
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
                shouldAdd = shape.width > 1 || shape.height > 1;
                break;
            case 'circle':
                shouldAdd = shape.radius > 1;
                break;
            case 'curve':
                const points = shape.points;
                const p0 = points[0];
                const p1 = points[3];
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
