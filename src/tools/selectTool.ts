import type { State, Shape, RectangleShape, LineShape, CircleShape, BezierCurveShape } from '../state';
import { CoordinateTransformer } from '../canvas/coordinates';
import { getBoundingBox, rectContainsRect, rectIntersectsRect, lineIntersectsRect, bezierIntersectsRect, type BoundingBox } from '../utils/geometry';
import { SelectionManager } from '../utils/selectionManager';
import { HIT_CONFIG } from '../constants';

export class SelectTool {
    private coordinateTransformer: CoordinateTransformer;

    constructor(canvas: HTMLCanvasElement) {
        this.coordinateTransformer = new CoordinateTransformer(canvas);
    }

    handleMouseDown(e: MouseEvent, state: State): boolean {
        if (e.button === 0 && (state.tool === 'select' || state.tool === 'edit')) {
            const worldPos = this.coordinateTransformer.screenToWorld(e.clientX, e.clientY, state);
            
            // Start drag operation in state
            state.ui.selectionDrag.isActive = true;
            state.ui.selectionDrag.start = { x: worldPos.x, y: worldPos.y };
            state.ui.selectionDrag.current = { x: worldPos.x, y: worldPos.y };
            
            // Check for single-click hit test with small tolerance
            const clickTolerance = HIT_CONFIG.CLICK_TOLERANCE;
            const shapes = state.scene.shapes;
            for (let i = shapes.length - 1; i >= 0; i--) {
                if (this.hitTest(shapes[i], worldPos.x, worldPos.y)) {
                    // Single click on shape - select it and exit early
                    SelectionManager.setSelection(state, [shapes[i].id]);
                    console.log('selected', state.selection);
                    state.ui.selectionDrag.isActive = false;
                    state.ui.selectionDrag.start = null;
                    state.ui.selectionDrag.current = null;
                    return true;
                }
            }
            
            // If in edit mode and no shape was hit, clear selection immediately
            if (state.tool === 'edit') {
                const result = SelectionManager.clear(state);
                console.log('cleared selection (click on empty space in edit mode)');
                state.ui.selectionDrag.isActive = false;
                state.ui.selectionDrag.start = null;
                state.ui.selectionDrag.current = null;
                return true;
            }
            
            return true;
        }
        return false;
    }

    handleMouseMove(e: MouseEvent, state: State): boolean {
        if (state.ui.selectionDrag.isActive && (state.tool === 'select' || state.tool === 'edit')) {
            const worldPos = this.coordinateTransformer.screenToWorld(e.clientX, e.clientY, state);
            state.ui.selectionDrag.current = { x: worldPos.x, y: worldPos.y };
            return state.tool === 'select'; // Only return true for select mode to show drag preview
        }
        return false;
    }

    handleMouseUp(state: State): boolean {
        if (state.ui.selectionDrag.isActive && (state.tool === 'select' || state.tool === 'edit')) {
            // Only perform drag selection in select mode, not in edit mode
            if (state.tool === 'select') {
                this.performDragSelection(state);
            } else if (state.tool === 'edit') {
                // In edit mode, if there was a significant drag, clear selection
                if (state.ui.selectionDrag.start && state.ui.selectionDrag.current) {
                    const dragDistance = Math.abs(state.ui.selectionDrag.current.x - state.ui.selectionDrag.start.x) + 
                                       Math.abs(state.ui.selectionDrag.current.y - state.ui.selectionDrag.start.y);
                    if (dragDistance > HIT_CONFIG.DRAG_THRESHOLD) {
                        SelectionManager.clear(state);
                        console.log('cleared selection (drag in edit mode)');
                    }
                }
            }
            
            state.ui.selectionDrag.isActive = false;
            state.ui.selectionDrag.start = null;
            state.ui.selectionDrag.current = null;
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
            case 'bezier':
                return this.hitTestBezier(shape as BezierCurveShape, x, y);
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
        const tolerance = HIT_CONFIG.LINE_TOLERANCE;
        
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

    private hitTestBezier(bezier: BezierCurveShape, x: number, y: number): boolean {
        // Simple bounding box test for bezier curves (arcs)
        const bounds = getBoundingBox(bezier);
        const tolerance = HIT_CONFIG.CLICK_TOLERANCE;
        
        return x >= bounds.x - tolerance && 
               x <= bounds.x + bounds.width + tolerance && 
               y >= bounds.y - tolerance && 
               y <= bounds.y + bounds.height + tolerance;
    }

    private performDragSelection(state: State): void {
        if (!state.ui.selectionDrag.start || !state.ui.selectionDrag.current) return;

        // Create selection rectangle
        const selectionRect: BoundingBox = {
            x: Math.min(state.ui.selectionDrag.start.x, state.ui.selectionDrag.current.x),
            y: Math.min(state.ui.selectionDrag.start.y, state.ui.selectionDrag.current.y),
            width: Math.abs(state.ui.selectionDrag.current.x - state.ui.selectionDrag.start.x),
            height: Math.abs(state.ui.selectionDrag.current.y - state.ui.selectionDrag.start.y)
        };

        // Determine selection mode based on drag direction
        const isWindow = state.ui.selectionDrag.start.x < state.ui.selectionDrag.current.x; // Left-to-right = window
        const isCrossing = state.ui.selectionDrag.start.x > state.ui.selectionDrag.current.x; // Right-to-left = crossing

        // If no significant drag, clear selection
        if (selectionRect.width < HIT_CONFIG.SELECTION_RECT_MIN && selectionRect.height < HIT_CONFIG.SELECTION_RECT_MIN) {
            SelectionManager.clear(state);
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

        SelectionManager.setSelection(state, selectedIds);
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

    // Getter for current drag state (for backward compatibility)
    getDragState(): { start: { x: number; y: number }; current: { x: number; y: number }; isDragging: boolean } | null {
        // This method is deprecated - state.ui.selectionDrag should be used directly
        return null;
    }

    // Cancel any active drag operation
    cancelDrag(state: State): void {
        state.ui.selectionDrag.isActive = false;
        state.ui.selectionDrag.start = null;
        state.ui.selectionDrag.current = null;
    }
}
