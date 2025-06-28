import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EditTool } from '../src/tools/editTool';
import { CommandExecutor } from '../src/commandExecutor';
import { Path2DRenderer } from '../src/rendering/path2DRenderer';
import { initialState } from '../src/state';

// Mock canvas
const createMockCanvas = () => ({
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    width: 800,
    height: 600
} as HTMLCanvasElement);

describe('Bezier Curve Edit Integration', () => {
    let editTool: EditTool;
    let executor: CommandExecutor;
    let renderer: Path2DRenderer;
    let state: any;
    let executeSpy: any;

    beforeEach(() => {
        const mockCanvas = createMockCanvas();
        executor = new CommandExecutor();
        renderer = new Path2DRenderer();
        const mockHistoryChange = vi.fn();
        
        editTool = new EditTool(mockCanvas, executor, renderer, mockHistoryChange);
        
        // Spy on executor.execute to verify commands are executed
        executeSpy = vi.spyOn(executor, 'execute');
        
        state = {
            ...initialState,
            tool: 'edit',
            selection: ['bezier-shape'],
            currentEditing: {
                shapeId: null,
                vertexIndex: null,
                isDragging: false,
                isGroupMove: false,
                dragStart: null
            },
            scene: {
                shapes: [
                    {
                        id: 'bezier-shape',
                        type: 'bezier' as const,
                        color: '#ff00ff',
                        points: [
                            { x: 10, y: 10 }, // p0
                            { x: 20, y: 10 }, // cp1
                            { x: 30, y: 20 }, // cp2
                            { x: 40, y: 20 }  // p1
                        ]
                    }
                ]
            },
            view: { panX: 0, panY: 0, zoom: 1 }
        };
    });

    it('should execute MoveVertexCommand for bezier curve control point', () => {
        // Click on the first control point (cp1) at (20, 10)
        const mouseDownEvent = { button: 0, clientX: 20, clientY: 10 } as MouseEvent;
        editTool.handleMouseDown(mouseDownEvent, state);
        
        // Move the control point
        const mouseMoveEvent = { clientX: 25, clientY: 15 } as MouseEvent;
        editTool.handleMouseMove(mouseMoveEvent, state);
        
        // End the move
        editTool.handleMouseUp(state);
        
        // Verify that execute was called
        expect(executeSpy).toHaveBeenCalled();
        
        // Get the last call arguments
        const lastCall = executeSpy.mock.calls[executeSpy.mock.calls.length - 1];
        const [command] = lastCall;
        
        // Verify the command type
        expect(command.constructor.name).toBe('MoveVertexCommand');
        
        // Verify the command affects the bezier curve
        const serialized = command.serialize();
        expect(serialized.shapeId).toBe('bezier-shape');
        expect(serialized.vertexIndex).toBe(1); // cp1
    });

    it('should execute MoveShapesCommand for bezier curve group move', () => {
        // Click in the center of the bezier curve bounding box to avoid handles
        const mouseDownEvent = { button: 0, clientX: 25, clientY: 15 } as MouseEvent;
        editTool.handleMouseDown(mouseDownEvent, state);
        
        // Move the entire curve
        const mouseMoveEvent = { clientX: 35, clientY: 25 } as MouseEvent;
        editTool.handleMouseMove(mouseMoveEvent, state);
        
        // End the move
        editTool.handleMouseUp(state);
        
        // Verify that execute was called
        expect(executeSpy).toHaveBeenCalled();
        
        // Get the last call arguments
        const lastCall = executeSpy.mock.calls[executeSpy.mock.calls.length - 1];
        const [command] = lastCall;
        
        // Verify the command type
        expect(command.constructor.name).toBe('MoveShapesCommand');
        
        // Verify the command affects the bezier curve
        const serialized = command.serialize();
        expect(serialized.shapeIds).toContain('bezier-shape');
    });

    it('should provide handles for all bezier control points', () => {
        const handles = editTool.getHandles(state);
        
        // Should have 4 handles for the bezier curve (p0, cp1, cp2, p1)
        expect(handles).toHaveLength(4);
        
        // Verify handle positions match the bezier points
        expect(handles[0]).toEqual({ x: 10, y: 10, vertexIndex: 0, shapeId: 'bezier-shape' });
        expect(handles[1]).toEqual({ x: 20, y: 10, vertexIndex: 1, shapeId: 'bezier-shape' });
        expect(handles[2]).toEqual({ x: 30, y: 20, vertexIndex: 2, shapeId: 'bezier-shape' });
        expect(handles[3]).toEqual({ x: 40, y: 20, vertexIndex: 3, shapeId: 'bezier-shape' });
    });
});
