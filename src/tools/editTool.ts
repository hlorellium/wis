import type { State, Shape, LineShape, RectangleShape, CircleShape, BezierCurveShape } from '../state';
import { CoordinateTransformer } from '../canvas/coordinates';
import { MoveShapesCommand, MoveVertexCommand } from '../commands';
import type { CommandExecutor } from '../commandExecutor';
import type { Path2DRenderer } from '../rendering/path2DRenderer';
import { getBoundingBox } from '../utils/geometry';
import { HIT_CONFIG } from '../constants';
import { logger } from '../utils/logger';

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
                // Start vertex drag - setup preview state
                const shape = state.scene.shapes.find(s => s.id === handleHit.shapeId);
                if (shape) {
                    state.currentEditing.shapeId = handleHit.shapeId;
                    state.currentEditing.vertexIndex = handleHit.vertexIndex;
                    state.currentEditing.isDragging = true;
                    state.currentEditing.isGroupMove = false;
                    state.currentEditing.dragStart = { x: worldPos.x, y: worldPos.y };
                    
                    // Store original shapes state and create preview copies
                    state.currentEditing.originalShapes = this.cloneShapes(state.scene.shapes);
                    state.currentEditing.previewShapes = this.cloneShapes(state.scene.shapes);
                    
                    logger.info(`Starting vertex edit for shape ${handleHit.shapeId}, vertex ${handleHit.vertexIndex}`, 'EditTool');
                    return true;
                }
            }

            // Check if clicking inside any selected shape's bounding box for group move
            const selectedShapes = state.scene.shapes.filter(s => state.selection.includes(s.id));
            if (selectedShapes.length > 0) {
                const isInsideAnyShape = selectedShapes.some(shape => this.isPointInsideShape(shape, worldPos.x, worldPos.y));
                
                if (isInsideAnyShape) {
                    // Start group move - setup preview state
                    state.currentEditing.shapeId = null;
                    state.currentEditing.vertexIndex = null;
                    state.currentEditing.isDragging = true;
                    state.currentEditing.isGroupMove = true;
                    state.currentEditing.dragStart = { x: worldPos.x, y: worldPos.y };
                    
                    // Store original shapes state and create preview copies
                    state.currentEditing.originalShapes = this.cloneShapes(state.scene.shapes);
                    state.currentEditing.previewShapes = this.cloneShapes(state.scene.shapes);
                    
                    logger.info(`Starting group move for ${selectedShapes.length} shapes`, 'EditTool');
                    return true;
                }
            }
        }
        return false;
    }

    handleMouseMove(e: MouseEvent, state: State): boolean {
        if (state.currentEditing.isDragging && state.tool === 'edit' && state.currentEditing.previewShapes) {
            const worldPos = this.coordinateTransformer.screenToWorld(e.clientX, e.clientY, state);
            
            if (state.currentEditing.isGroupMove && state.currentEditing.dragStart) {
                // Group move: calculate delta and update preview shapes
                const dx = worldPos.x - state.currentEditing.dragStart.x;
                const dy = worldPos.y - state.currentEditing.dragStart.y;
                
                // Update preview shapes
                state.currentEditing.previewShapes.forEach(shape => {
                    if (state.selection.includes(shape.id)) {
                        const originalShape = state.currentEditing.originalShapes!.find(s => s.id === shape.id);
                        if (originalShape) {
                            this.setShapeToAbsolutePosition(shape, originalShape, dx, dy);
                        }
                    }
                });
                
                // Replace scene shapes with preview for rendering
                state.scene.shapes = state.currentEditing.previewShapes;
                
            } else if (state.currentEditing.shapeId && state.currentEditing.vertexIndex !== null) {
                // Vertex move: update the specific vertex in preview
                const shape = state.currentEditing.previewShapes.find(s => s.id === state.currentEditing.shapeId);
                if (shape) {
                    this.setVertexPosition(shape, state.currentEditing.vertexIndex, worldPos);
                    
                    // Replace scene shapes with preview for rendering
                    state.scene.shapes = state.currentEditing.previewShapes;
                }
            }
            
            return true;
        }
        return false;
    }

    handleMouseUp(state: State): boolean {
        if (state.currentEditing.isDragging && state.tool === 'edit') {
            try {
                if (state.currentEditing.isGroupMove && state.currentEditing.dragStart) {
                    // Calculate final movement delta
                    const previewShapes = state.currentEditing.previewShapes!;
                    const originalShapes = state.currentEditing.originalShapes!;
                    
                    // Find any moved shape to calculate delta
                    const movedShapeId = state.selection[0];
                    const originalShape = originalShapes.find(s => s.id === movedShapeId);
                    const previewShape = previewShapes.find(s => s.id === movedShapeId);
                    
                    if (originalShape && previewShape) {
                        const originalPos = this.getShapePosition(originalShape);
                        const previewPos = this.getShapePosition(previewShape);
                        const dx = this.calculatePositionDelta(originalPos, previewPos, 'x');
                        const dy = this.calculatePositionDelta(originalPos, previewPos, 'y');
                        
                        // Restore original state before applying command
                        state.scene.shapes = originalShapes;
                        
                        // Only create command if there was actual movement
                        if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
                            const command = new MoveShapesCommand([...state.selection], dx, dy);
                            logger.info(`Executing MoveShapesCommand: dx=${dx}, dy=${dy}, shapes=${state.selection.length}`, 'EditTool');
                            this.executor.execute(command, state);
                            this.onHistoryChange();
                        } else {
                            logger.info('Group move had no significant delta, skipping command', 'EditTool');
                        }
                    }
                    
                } else if (state.currentEditing.shapeId && state.currentEditing.vertexIndex !== null) {
                    // Calculate vertex movement
                    const originalShapes = state.currentEditing.originalShapes!;
                    const previewShapes = state.currentEditing.previewShapes!;
                    
                    const originalShape = originalShapes.find(s => s.id === state.currentEditing.shapeId);
                    const previewShape = previewShapes.find(s => s.id === state.currentEditing.shapeId);
                    
                    if (originalShape && previewShape) {
                        const oldPos = this.getVertexPosition(originalShape, state.currentEditing.vertexIndex);
                        const newPos = this.getVertexPosition(previewShape, state.currentEditing.vertexIndex);
                        
                        // Restore original state before applying command
                        state.scene.shapes = originalShapes;
                        
                        // Only create command if position actually changed
                        if (Math.abs(oldPos.x - newPos.x) > 0.01 || Math.abs(oldPos.y - newPos.y) > 0.01) {
                            const command = new MoveVertexCommand(
                                state.currentEditing.shapeId,
                                state.currentEditing.vertexIndex,
                                oldPos,
                                newPos
                            );
                            
                            logger.info(`Executing MoveVertexCommand: shape=${state.currentEditing.shapeId}, vertex=${state.currentEditing.vertexIndex}`, 'EditTool');
                            logger.info(`Position change: (${oldPos.x},${oldPos.y}) -> (${newPos.x},${newPos.y})`, 'EditTool');
                            
                            this.executor.execute(command, state);
                            this.onHistoryChange();
                        } else {
                            logger.info('Vertex move had no significant change, skipping command', 'EditTool');
                        }
                    }
                }
                
            } catch (error) {
                logger.error('Error in EditTool handleMouseUp:', 'EditTool', error);
                // Restore original state on error
                if (state.currentEditing.originalShapes) {
                    state.scene.shapes = state.currentEditing.originalShapes;
                }
            } finally {
                // Always reset editing state
                this.resetEditingState(state);
            }
            
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
                    { x: circleShape.x + circleShape.radius, y: circleShape.y, vertexIndex: 0, shapeId: shape.id }, // East
                    { x: circleShape.x, y: circleShape.y + circleShape.radius, vertexIndex: 1, shapeId: shape.id }, // South
                    { x: circleShape.x - circleShape.radius, y: circleShape.y, vertexIndex: 2, shapeId: shape.id }, // West
                    { x: circleShape.x, y: circleShape.y - circleShape.radius, vertexIndex: 3, shapeId: shape.id } // North
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
                switch (vertexIndex) {
                    case 0: return { x: circleShape.x + circleShape.radius, y: circleShape.y }; // East
                    case 1: return { x: circleShape.x, y: circleShape.y + circleShape.radius }; // South
                    case 2: return { x: circleShape.x - circleShape.radius, y: circleShape.y }; // West
                    case 3: return { x: circleShape.x, y: circleShape.y - circleShape.radius }; // North
                    default: return { x: circleShape.x + circleShape.radius, y: circleShape.y };
                }
                    
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
                // For all 4 handles, calculate distance from center and update radius
                const dx = pos.x - circleShape.x;
                const dy = pos.y - circleShape.y;
                circleShape.radius = Math.sqrt(dx * dx + dy * dy);
                break;
                
            case 'bezier':
                const bezierShape = shape as BezierCurveShape;
                if (vertexIndex >= 0 && vertexIndex < bezierShape.points.length) {
                    bezierShape.points[vertexIndex].x = pos.x;
                    bezierShape.points[vertexIndex].y = pos.y;
                }
                break;
        }
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

    private setShapeToAbsolutePosition(shape: Shape, originalShape: Shape, dx: number, dy: number): void {
        const originalPos = this.getShapePosition(originalShape);
        
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

    private calculatePositionDelta(originalPos: any, newPos: any, axis: 'x' | 'y'): number {
        // For different shape types, calculate the delta differently
        if (originalPos.x !== undefined && newPos.x !== undefined) {
            // Rectangle or Circle
            return axis === 'x' ? (newPos.x - originalPos.x) : (newPos.y - originalPos.y);
        } else if (originalPos.x1 !== undefined && newPos.x1 !== undefined) {
            // Line - use first point as reference
            return axis === 'x' ? (newPos.x1 - originalPos.x1) : (newPos.y1 - originalPos.y1);
        } else if (originalPos.points && newPos.points) {
            // Bezier - use first point as reference
            return axis === 'x' 
                ? (newPos.points[0].x - originalPos.points[0].x)
                : (newPos.points[0].y - originalPos.points[0].y);
        }
        return 0;
    }

    private isPointInsideShape(shape: Shape, x: number, y: number): boolean {
        const bounds = getBoundingBox(shape);
        return x >= bounds.x && 
               x <= bounds.x + bounds.width && 
               y >= bounds.y && 
               y <= bounds.y + bounds.height;
    }

    private cloneShapes(shapes: Shape[]): Shape[] {
        return shapes.map(shape => JSON.parse(JSON.stringify(shape)));
    }

    private resetEditingState(state: State): void {
        state.currentEditing.shapeId = null;
        state.currentEditing.vertexIndex = null;
        state.currentEditing.isDragging = false;
        state.currentEditing.isGroupMove = false;
        state.currentEditing.dragStart = null;
        state.currentEditing.previewShapes = null;
        state.currentEditing.originalShapes = null;
    }

    // Reset editing state when switching away from edit mode
    reset(state: State): void {
        // If we were in the middle of an edit, restore original state
        if (state.currentEditing.originalShapes) {
            state.scene.shapes = state.currentEditing.originalShapes;
        }
        this.resetEditingState(state);
    }
}
