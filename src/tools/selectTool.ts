import type { State, Shape, RectangleShape, LineShape, CircleShape, BezierCurveShape } from '../state';
import { CoordinateTransformer } from '../canvas/coordinates';
import { getBoundingBox, rectContainsRect, rectIntersectsRect, lineIntersectsRect, bezierIntersectsRect, type BoundingBox } from '../utils/geometry';

export class SelectTool {
    private coordinateTransformer: CoordinateTransformer;
    private dragStart: { x: number; y: number } | null = null;
    private dragCurrent: { x: number; y: number } | null = null;
    private isDragging = false;

    constructor(canvas: HTMLCanvasElement) {
        this.coordinateTransformer = new CoordinateTransformer(canvas);
    }

    handleMouseDown(e: MouseEvent, state: State): boolean {
        if (e.button === 0 && (state.tool === 'select' || state.tool === 'edit')) {
            const worldPos = this.coordinateTransformer.screenToWorld(e.clientX, e.clientY, state);
            
            // Start drag operation
            this.dragStart = { x: worldPos.x, y: worldPos.y };
            this.dragCurrent = { x: worldPos.x, y: worldPos.y };
            this.isDragging = true;
            
            // Check for single-click hit test with small tolerance
            const clickTolerance = 5;
            const shapes = state.scene.shapes;
            for (let i = shapes.length - 1; i >= 0; i--) {
                if (this.hitTest(shapes[i], worldPos.x, worldPos.y)) {
                    // Single click on shape - select it and exit early
                    state.selection = [shapes[i].id];
                    console.log('selected', state.selection);
                    this.isDragging = false;
                    this.dragStart = null;
                    this.dragCurrent = null;
                    return true;
                }
            }
            
            // If in edit mode and no shape was hit, clear selection immediately
            if (state.tool === 'edit') {
                state.selection = [];
                console.log('cleared selection (click on empty space in edit mode)');
                this.isDragging = false;
                this.dragStart = null;
                this.dragCurrent = null;
                return true;
            }
            
            return true;
        }
        return false;
    }

    handleMouseMove(e: MouseEvent, state: State): boolean {
        if (this.isDragging && (state.tool === 'select' || state.tool === 'edit')) {
            const worldPos = this.coordinateTransformer.screenToWorld(e.clientX, e.clientY, state);
            this.dragCurrent = { x: worldPos.x, y: worldPos.y };
            return state.tool === 'select'; // Only return true for select mode to show drag preview
        }
        return false;
    }

    handleMouseUp(state: State): boolean {
        if (this.isDragging && (state.tool === 'select' || state.tool === 'edit')) {
            // Only perform drag selection in select mode, not in edit mode
            if (state.tool === 'select') {
                this.performDragSelection(state);
            } else if (state.tool === 'edit') {
                // In edit mode, if there was a significant drag, clear selection
                if (this.dragStart && this.dragCurrent) {
                    const dragDistance = Math.abs(this.dragCurrent.x - this.dragStart.x) + 
                                       Math.abs(this.dragCurrent.y - this.dragStart.y);
                    if (dragDistance > 5) {
                        state.selection = [];
                        console.log('cleared selection (drag in edit mode)');
                    }
                }
            }
            
            this.isDragging = false;
            this.dragStart = null;
            this.dragCurrent = null;
            return true;
        }
        return false;
    }

    private hitTest(shape: Shape, x: number, y: number): boolean {
        switch (shape.type) {
            case 'rectangle':
                return this.hitTestRectangle(shape as RectangleShape, x, y);
            case 'circle':
                return this.hitTestCircle(shape as CircleShape, x, y);
            case 'line':
                return this.hitTestLine(shape as LineShape, x, y);
            default:
                return false;
        }
    }

    private hitTestRectangle(rect: RectangleShape, x: number, y: number): boolean {
        return x >= rect.x && 
               x <= rect.x + rect.width && 
               y >= rect.y && 
               y <= rect.y + rect.height;
    }

    private hitTestCircle(circle: CircleShape, x: number, y: number): boolean {
        const dx = x - circle.x;
        const dy = y - circle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= circle.radius;
    }

    private hitTestLine(line: LineShape, x: number, y: number): boolean {
        const tolerance = 5; // 5 pixels tolerance for line selection
        
        // Distance from point to line segment
        const A = x - line.x1;
        const B = y - line.y1;
        const C = line.x2 - line.x1;
        const D = line.y2 - line.y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        
        if (lenSq === 0) {
            // Line is actually a point
            const dx = x - line.x1;
            const dy = y - line.y1;
            return Math.sqrt(dx * dx + dy * dy) <= tolerance;
        }

        let param = dot / lenSq;
        
        let xx, yy;
        if (param < 0) {
            xx = line.x1;
            yy = line.y1;
        } else if (param > 1) {
            xx = line.x2;
            yy = line.y2;
        } else {
            xx = line.x1 + param * C;
            yy = line.y1 + param * D;
        }

        const dx = x - xx;
        const dy = y - yy;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance <= tolerance;
    }

    private performDragSelection(state: State): void {
        if (!this.dragStart || !this.dragCurrent) return;

        // Create selection rectangle
        const selectionRect: BoundingBox = {
            x: Math.min(this.dragStart.x, this.dragCurrent.x),
            y: Math.min(this.dragStart.y, this.dragCurrent.y),
            width: Math.abs(this.dragCurrent.x - this.dragStart.x),
            height: Math.abs(this.dragCurrent.y - this.dragStart.y)
        };

        // Determine selection mode based on drag direction
        const isWindow = this.dragStart.x < this.dragCurrent.x; // Left-to-right = window
        const isCrossing = this.dragStart.x > this.dragCurrent.x; // Right-to-left = crossing

        // If no significant drag, clear selection
        if (selectionRect.width < 5 && selectionRect.height < 5) {
            state.selection = [];
            console.log('cleared selection (small drag)');
            return;
        }

        const selectedIds: string[] = [];

        // Test each shape against selection rectangle
        state.scene.shapes.forEach(shape => {
            let isSelected = false;

            if (isWindow) {
                // Window selection: shape must be fully enclosed
                isSelected = this.shapeFullyContained(shape, selectionRect);
            } else if (isCrossing) {
                // Crossing selection: any intersection
                isSelected = this.shapeIntersects(shape, selectionRect);
            }

            if (isSelected) {
                selectedIds.push(shape.id);
            }
        });

        state.selection = selectedIds;
        console.log(`${isWindow ? 'Window' : 'Crossing'} selection:`, selectedIds);
    }

    private shapeFullyContained(shape: Shape, selectionRect: BoundingBox): boolean {
        const shapeBounds = getBoundingBox(shape);
        return rectContainsRect(shapeBounds, selectionRect);
    }

    private shapeIntersects(shape: Shape, selectionRect: BoundingBox): boolean {
        switch (shape.type) {
            case 'rectangle':
            case 'circle':
                const shapeBounds = getBoundingBox(shape);
                return rectIntersectsRect(shapeBounds, selectionRect);
            
            case 'line':
                return lineIntersectsRect(shape as LineShape, selectionRect);
            
            case 'bezier':
                return bezierIntersectsRect(shape as BezierCurveShape, selectionRect);
            
            default:
                return false;
        }
    }

    // Getter for current drag state (for renderer to show preview)
    getDragState(): { start: { x: number; y: number }; current: { x: number; y: number }; isDragging: boolean } | null {
        if (!this.isDragging || !this.dragStart || !this.dragCurrent) {
            return null;
        }
        return {
            start: this.dragStart,
            current: this.dragCurrent,
            isDragging: this.isDragging
        };
    }

    // Cancel any active drag operation
    cancelDrag(): void {
        this.isDragging = false;
        this.dragStart = null;
        this.dragCurrent = null;
    }
}
