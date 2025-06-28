import type { State, Shape, LineShape, RectangleShape, CircleShape, BezierCurveShape } from '../state';
import { CoordinateTransformer } from '../canvas/coordinates';
import { MoveShapesCommand, MoveVertexCommand } from '../commands';
import type { CommandExecutor } from '../commandExecutor';
import type { Path2DRenderer } from '../rendering/path2DRenderer';
import { getBoundingBox } from '../utils/geometry';
import { HIT_CONFIG } from '../constants';

interface Handle {
    x: number;
    y: number;
    vertexIndex: number;
    shapeId: string;
}

export class EditTool {
    private coordinateTransformer: CoordinateTransformer;
    private executor: CommandExecutor;
    private renderer: Path2DRenderer;
    private onHistoryChange: () => void;

    constructor(canvas: HTMLCanvasElement, executor: CommandExecutor, renderer: Path2DRenderer, onHistoryChange: () => void) {
        this.coordinateTransformer = new CoordinateTransformer(canvas);
        this.executor = executor;
        this.renderer = renderer;
        this.onHistoryChange = onHistoryChange;
    }

    handleMouseDown(e: MouseEvent, state: State): boolean {
        if (e.button === 0 && state.tool === 'edit' && state.selection.length > 0) {
            const worldPos = this.coordinateTransformer.screenToWorld(e.clientX, e.clientY, state);
            
            // Check for handle hit first
            const handleHit = this.hitTestHandles(state, worldPos.x, worldPos.y);
            if (handleHit) {
                // Start vertex drag
                const shape = state.scene.shapes.find(s => s.id === handleHit.shapeId);
                if (shape) {
                    const oldPos = this.getVertexPosition(shape, handleHit.vertexIndex);
                    state.currentEditing.shapeId = handleHit.shapeId;
                    state.currentEditing.vertexIndex = handleHit.vertexIndex;
                    state.currentEditing.isDragging = true;
                    state.currentEditing.isGroupMove = false;
                    state.currentEditing.dragStart = { x: worldPos.x, y: worldPos.y };
                    
                    // Store the original position for command creation
                    (state.currentEditing as any).originalPos = oldPos;
                    return true;
                }
            }

            // Check if clicking inside any selected shape's bounding box for group move
            const selectedShapes = state.scene.shapes.filter(s => state.selection.includes(s.id));
            if (selectedShapes.length > 0) {
                const isInsideAnyShape = selectedShapes.some(shape => this.isPointInsideShape(shape, worldPos.x, worldPos.y));
                
                if (isInsideAnyShape) {
                    // Start group move - store original positions
                    state.currentEditing.shapeId = null;
                    state.currentEditing.vertexIndex = null;
                    state.currentEditing.isDragging = true;
                    state.currentEditing.isGroupMove = true;
                    state.currentEditing.dragStart = { x: worldPos.x, y: worldPos.y };
                    
                    // Store original positions of all selected shapes
                    (state.currentEditing as any).originalPositions = {};
                    selectedShapes.forEach(shape => {
                        (state.currentEditing as any).originalPositions[shape.id] = this.getShapePosition(shape);
                    });
                    
                    return true;
                }
            }
        }
        return false;
    }

    handleMouseMove(e: MouseEvent, state: State): boolean {
        if (state.currentEditing.isDragging && state.tool === 'edit') {
            const worldPos = this.coordinateTransformer.screenToWorld(e.clientX, e.clientY, state);
            
            if (state.currentEditing.isGroupMove) {
                // Group move: calculate total delta from original drag start
                if (state.currentEditing.dragStart && (state.currentEditing as any).originalPositions) {
                    const totalDx = worldPos.x - state.currentEditing.dragStart.x;
                    const totalDy = worldPos.y - state.currentEditing.dragStart.y;
                    
                    // Set shapes to their original positions + total delta
                    const originalPositions = (state.currentEditing as any).originalPositions as Record<string, any>;
                    state.scene.shapes.forEach(shape => {
                        if (state.selection.includes(shape.id)) {
                            const originalPos = originalPositions[shape.id];
                            if (originalPos) {
                                this.setShapeToPosition(shape, originalPos, totalDx, totalDy);
                                // Clear cache since shape was moved
                                this.renderer.clearCache(shape.id);
                            }
                        }
                    });
                    
                    // Store total delta for command creation
                    (state.currentEditing as any).totalDelta = { x: totalDx, y: totalDy };
                }
            } else if (state.currentEditing.shapeId && state.currentEditing.vertexIndex !== null) {
                // Vertex move: update the specific vertex
                const shape = state.scene.shapes.find(s => s.id === state.currentEditing.shapeId);
                if (shape) {
                    this.setVertexPosition(shape, state.currentEditing.vertexIndex, worldPos);
                }
            }
            
            return true;
        }
        return false;
    }

    handleMouseUp(state: State): boolean {
        if (state.currentEditing.isDragging && state.tool === 'edit') {
            if (state.currentEditing.isGroupMove && state.currentEditing.dragStart) {
                // Create MoveShapesCommand with the total movement delta
                const totalDelta = (state.currentEditing as any).totalDelta || { x: 0, y: 0 };
                if (totalDelta.x !== 0 || totalDelta.y !== 0) {
                    // Reset shapes to their original positions before applying the command
                    // This prevents double-application of the movement delta
                    const originalPositions = (state.currentEditing as any).originalPositions as Record<string, any>;
                    if (originalPositions) {
                        state.scene.shapes.forEach(shape => {
                            if (state.selection.includes(shape.id)) {
                                const originalPos = originalPositions[shape.id];
                                if (originalPos) {
                                    this.setShapeToPosition(shape, originalPos, 0, 0);
                                    this.renderer.clearCache(shape.id);
                                }
                            }
                        });
                    }
                    
                    const command = new MoveShapesCommand([...state.selection], totalDelta.x, totalDelta.y);
                    this.executor.execute(command, state);
                    this.onHistoryChange();
                }
            } else if (state.currentEditing.shapeId && state.currentEditing.vertexIndex !== null) {
                // Create MoveVertexCommand
                const shape = state.scene.shapes.find(s => s.id === state.currentEditing.shapeId!);
                if (shape && (state.currentEditing as any).originalPos) {
                    const oldPos = (state.currentEditing as any).originalPos;
                    const newPos = this.getVertexPosition(shape, state.currentEditing.vertexIndex);
                    
                    // Only create command if position actually changed
                    if (oldPos.x !== newPos.x || oldPos.y !== newPos.y) {
                        const command = new MoveVertexCommand(
                            state.currentEditing.shapeId,
                            state.currentEditing.vertexIndex,
                            oldPos,
                            newPos
                        );
                        this.executor.execute(command, state);
                        this.onHistoryChange();
                    }
                }
            }

            // Reset editing state
            state.currentEditing.shapeId = null;
            state.currentEditing.vertexIndex = null;
            state.currentEditing.isDragging = false;
            state.currentEditing.isGroupMove = false;
            state.currentEditing.dragStart = null;
            (state.currentEditing as any).originalPos = null;
            (state.currentEditing as any).originalPositions = null;
            (state.currentEditing as any).totalDelta = null;
            
            return true;
        }
        return false;
    }

    // Get all handles for currently selected shapes
    getHandles(state: State): Handle[] {
        const handles: Handle[] = [];
        
        state.scene.shapes.forEach(shape => {
            if (state.selection.includes(shape.id)) {
                const shapeHandles = this.getShapeHandles(shape);
                handles.push(...shapeHandles);
            }
        });
        
        return handles;
    }

    private getShapeHandles(shape: Shape): Handle[] {
        const handles: Handle[] = [];
        
        switch (shape.type) {
            case 'line':
                const lineShape = shape as LineShape;
                handles.push(
                    { x: lineShape.x1, y: lineShape.y1, vertexIndex: 0, shapeId: shape.id },
                    { x: lineShape.x2, y: lineShape.y2, vertexIndex: 1, shapeId: shape.id }
                );
                break;
                
            case 'rectangle':
                const rectShape = shape as RectangleShape;
                handles.push(
                    { x: rectShape.x, y: rectShape.y, vertexIndex: 0, shapeId: shape.id }, // top-left
                    { x: rectShape.x + rectShape.width, y: rectShape.y, vertexIndex: 1, shapeId: shape.id }, // top-right
                    { x: rectShape.x + rectShape.width, y: rectShape.y + rectShape.height, vertexIndex: 2, shapeId: shape.id }, // bottom-right
                    { x: rectShape.x, y: rectShape.y + rectShape.height, vertexIndex: 3, shapeId: shape.id } // bottom-left
                );
                break;
                
            case 'circle':
                const circleShape = shape as CircleShape;
                handles.push(
                    { x: circleShape.x, y: circleShape.y, vertexIndex: 0, shapeId: shape.id }, // center
                    { x: circleShape.x + circleShape.radius, y: circleShape.y, vertexIndex: 1, shapeId: shape.id } // radius point
                );
                break;
                
            case 'bezier':
                const bezierShape = shape as BezierCurveShape;
                bezierShape.points.forEach((point, index) => {
                    handles.push({ x: point.x, y: point.y, vertexIndex: index, shapeId: shape.id });
                });
                break;
        }
        
        return handles;
    }

    private hitTestHandles(state: State, x: number, y: number): Handle | null {
        const handles = this.getHandles(state);
        const tolerance = HIT_CONFIG.HANDLE_RADIUS;
        
        for (const handle of handles) {
            const dx = x - handle.x;
            const dy = y - handle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= tolerance) {
                return handle;
            }
        }
        
        return null;
    }

    private getVertexPosition(shape: Shape, vertexIndex: number): { x: number; y: number } {
        switch (shape.type) {
            case 'line':
                const lineShape = shape as LineShape;
                return vertexIndex === 0 
                    ? { x: lineShape.x1, y: lineShape.y1 }
                    : { x: lineShape.x2, y: lineShape.y2 };
                    
            case 'rectangle':
                const rectShape = shape as RectangleShape;
                switch (vertexIndex) {
                    case 0: return { x: rectShape.x, y: rectShape.y };
                    case 1: return { x: rectShape.x + rectShape.width, y: rectShape.y };
                    case 2: return { x: rectShape.x + rectShape.width, y: rectShape.y + rectShape.height };
                    case 3: return { x: rectShape.x, y: rectShape.y + rectShape.height };
                    default: return { x: rectShape.x, y: rectShape.y };
                }
                
            case 'circle':
                const circleShape = shape as CircleShape;
                return vertexIndex === 0
                    ? { x: circleShape.x, y: circleShape.y }
                    : { x: circleShape.x + circleShape.radius, y: circleShape.y };
                    
            case 'bezier':
                const bezierShape = shape as BezierCurveShape;
                return bezierShape.points[vertexIndex] || { x: 0, y: 0 };
                
            default:
                return { x: 0, y: 0 };
        }
    }

    private setVertexPosition(shape: Shape, vertexIndex: number, pos: { x: number; y: number }): void {
        switch (shape.type) {
            case 'line':
                const lineShape = shape as LineShape;
                if (vertexIndex === 0) {
                    lineShape.x1 = pos.x;
                    lineShape.y1 = pos.y;
                } else {
                    lineShape.x2 = pos.x;
                    lineShape.y2 = pos.y;
                }
                break;
                
            case 'rectangle':
                const rectShape = shape as RectangleShape;
                if (vertexIndex === 0) {
                    const oldRight = rectShape.x + rectShape.width;
                    const oldBottom = rectShape.y + rectShape.height;
                    rectShape.x = pos.x;
                    rectShape.y = pos.y;
                    rectShape.width = oldRight - pos.x;
                    rectShape.height = oldBottom - pos.y;
                } else if (vertexIndex === 1) {
                    const oldBottom = rectShape.y + rectShape.height;
                    rectShape.y = pos.y;
                    rectShape.width = pos.x - rectShape.x;
                    rectShape.height = oldBottom - pos.y;
                } else if (vertexIndex === 2) {
                    rectShape.width = pos.x - rectShape.x;
                    rectShape.height = pos.y - rectShape.y;
                } else if (vertexIndex === 3) {
                    const oldRight = rectShape.x + rectShape.width;
                    rectShape.x = pos.x;
                    rectShape.width = oldRight - pos.x;
                    rectShape.height = pos.y - rectShape.y;
                }
                break;
                
            case 'circle':
                const circleShape = shape as CircleShape;
                if (vertexIndex === 0) {
                    circleShape.x = pos.x;
                    circleShape.y = pos.y;
                } else {
                    const dx = pos.x - circleShape.x;
                    const dy = pos.y - circleShape.y;
                    circleShape.radius = Math.sqrt(dx * dx + dy * dy);
                }
                break;
                
            case 'bezier':
                const bezierShape = shape as BezierCurveShape;
                if (vertexIndex >= 0 && vertexIndex < bezierShape.points.length) {
                    bezierShape.points[vertexIndex].x = pos.x;
                    bezierShape.points[vertexIndex].y = pos.y;
                }
                break;
        }
        
        // Clear the cache for this shape since its geometry has changed
        this.renderer.clearCache(shape.id);
    }

    private moveShapeBy(shape: Shape, dx: number, dy: number): void {
        switch (shape.type) {
            case 'rectangle':
                const rectShape = shape as RectangleShape;
                rectShape.x += dx;
                rectShape.y += dy;
                break;
            case 'circle':
                const circleShape = shape as CircleShape;
                circleShape.x += dx;
                circleShape.y += dy;
                break;
            case 'line':
                const lineShape = shape as LineShape;
                lineShape.x1 += dx;
                lineShape.y1 += dy;
                lineShape.x2 += dx;
                lineShape.y2 += dy;
                break;
            case 'bezier':
                const bezierShape = shape as BezierCurveShape;
                bezierShape.points.forEach(point => {
                    point.x += dx;
                    point.y += dy;
                });
                break;
        }
        
        // Clear the cache for this shape since its geometry has changed
        this.renderer.clearCache(shape.id);
    }

    private getShapePosition(shape: Shape): any {
        switch (shape.type) {
            case 'rectangle':
                const rectShape = shape as RectangleShape;
                return { x: rectShape.x, y: rectShape.y, width: rectShape.width, height: rectShape.height };
            case 'circle':
                const circleShape = shape as CircleShape;
                return { x: circleShape.x, y: circleShape.y, radius: circleShape.radius };
            case 'line':
                const lineShape = shape as LineShape;
                return { x1: lineShape.x1, y1: lineShape.y1, x2: lineShape.x2, y2: lineShape.y2 };
            case 'bezier':
                const bezierShape = shape as BezierCurveShape;
                return { points: bezierShape.points.map(p => ({ x: p.x, y: p.y })) };
            default:
                return {};
        }
    }

    private setShapeToPosition(shape: Shape, originalPos: any, dx: number, dy: number): void {
        switch (shape.type) {
            case 'rectangle':
                const rectShape = shape as RectangleShape;
                rectShape.x = originalPos.x + dx;
                rectShape.y = originalPos.y + dy;
                rectShape.width = originalPos.width;
                rectShape.height = originalPos.height;
                break;
            case 'circle':
                const circleShape = shape as CircleShape;
                circleShape.x = originalPos.x + dx;
                circleShape.y = originalPos.y + dy;
                circleShape.radius = originalPos.radius;
                break;
            case 'line':
                const lineShape = shape as LineShape;
                lineShape.x1 = originalPos.x1 + dx;
                lineShape.y1 = originalPos.y1 + dy;
                lineShape.x2 = originalPos.x2 + dx;
                lineShape.y2 = originalPos.y2 + dy;
                break;
            case 'bezier':
                const bezierShape = shape as BezierCurveShape;
                bezierShape.points = originalPos.points.map((p: any) => ({
                    x: p.x + dx,
                    y: p.y + dy
                }));
                break;
        }
    }

    private isPointInsideShape(shape: Shape, x: number, y: number): boolean {
        const bounds = getBoundingBox(shape);
        return x >= bounds.x && 
               x <= bounds.x + bounds.width && 
               y >= bounds.y && 
               y <= bounds.y + bounds.height;
    }

    // Reset editing state when switching away from edit mode
    reset(state: State): void {
        state.currentEditing.shapeId = null;
        state.currentEditing.vertexIndex = null;
        state.currentEditing.isDragging = false;
        state.currentEditing.isGroupMove = false;
        state.currentEditing.dragStart = null;
        (state.currentEditing as any).originalPos = null;
        (state.currentEditing as any).originalPositions = null;
        (state.currentEditing as any).totalDelta = null;
    }
}
