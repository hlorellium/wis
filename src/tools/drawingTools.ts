import type { State, Rectangle, Line, Circle } from '../state';
import { CoordinateTransformer } from '../canvas/coordinates';

export class DrawingTools {
    private isDrawing = false;
    private startWorldX = 0;
    private startWorldY = 0;
    private coordinateTransformer: CoordinateTransformer;

    constructor(canvas: HTMLCanvasElement) {
        this.coordinateTransformer = new CoordinateTransformer(canvas);
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
                    x1: this.startWorldX,
                    y1: this.startWorldY,
                    x2: this.startWorldX,
                    y2: this.startWorldY
                };
                state.currentDrawing.type = 'line';
                break;
            case 'rectangle':
                state.currentDrawing.shape = {
                    x: this.startWorldX,
                    y: this.startWorldY,
                    width: 0,
                    height: 0
                };
                state.currentDrawing.type = 'rectangle';
                break;
            case 'circle':
                state.currentDrawing.shape = {
                    x: this.startWorldX,
                    y: this.startWorldY,
                    radius: 0
                };
                state.currentDrawing.type = 'circle';
                break;
        }
    }

    private updateDrawing(currentX: number, currentY: number, state: State) {
        switch (state.tool) {
            case 'line':
                const line = state.currentDrawing.shape as Line;
                line.x2 = currentX;
                line.y2 = currentY;
                break;
            case 'rectangle':
                const rect = state.currentDrawing.shape as Rectangle;
                rect.x = Math.min(this.startWorldX, currentX);
                rect.y = Math.min(this.startWorldY, currentY);
                rect.width = Math.abs(currentX - this.startWorldX);
                rect.height = Math.abs(currentY - this.startWorldY);
                break;
            case 'circle':
                const circle = state.currentDrawing.shape as Circle;
                const dx = currentX - this.startWorldX;
                const dy = currentY - this.startWorldY;
                circle.radius = Math.sqrt(dx * dx + dy * dy);
                break;
        }
    }

    private finalizeDrawing(state: State) {
        switch (state.currentDrawing.type) {
            case 'line':
                state.scene.lines.push(state.currentDrawing.shape as Line);
                break;
            case 'rectangle':
                const rect = state.currentDrawing.shape as Rectangle;
                // Only add if it has some size
                if (rect.width > 1 || rect.height > 1) {
                    state.scene.rectangles.push(rect);
                }
                break;
            case 'circle':
                const circle = state.currentDrawing.shape as Circle;
                // Only add if it has some radius
                if (circle.radius > 1) {
                    state.scene.circles.push(circle);
                }
                break;
        }
        
        // Clear current drawing
        state.currentDrawing.shape = null;
        state.currentDrawing.type = null;
    }
}
