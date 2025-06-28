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

describe('EditTool Integration - Command Source', () => {
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
        
        // Spy on executor.execute to verify source parameter
        executeSpy = vi.spyOn(executor, 'execute');
        
        state = {
            ...initialState,
            tool: 'edit',
            selection: ['test-shape'],
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
                        id: 'test-shape',
                        type: 'rectangle' as const,
                        color: '#ff0000',
                        x: 10,
                        y: 10,
                        width: 20,
                        height: 20
                    }
                ]
            },
            camera: { x: 0, y: 0, zoom: 1 }
        };
    });

    it('should execute MoveShapesCommand with default source (local)', () => {
        // Start group move - click in the center of the rectangle to avoid handles
        const mouseDownEvent = { button: 0, clientX: 20, clientY: 20 } as MouseEvent;
        editTool.handleMouseDown(mouseDownEvent, state);
        
        // Move the shapes
        const mouseMoveEvent = { clientX: 30, clientY: 30 } as MouseEvent;
        editTool.handleMouseMove(mouseMoveEvent, state);
        
        // End the move
        editTool.handleMouseUp(state);
        
        // Verify that execute was called
        expect(executeSpy).toHaveBeenCalled();
        
        // Get the last call arguments
        const lastCall = executeSpy.mock.calls[executeSpy.mock.calls.length - 1];
        const [command, stateArg, source] = lastCall;
        
        // Verify the command type
        expect(command.constructor.name).toBe('MoveShapesCommand');
        
        // Verify the source parameter - should be undefined (defaults to 'local')
        expect(source).toBeUndefined();
    });

    it('should execute MoveVertexCommand with default source (local)', () => {
        // Start vertex move by clicking on a handle (top-left corner of rectangle)
        const mouseDownEvent = { button: 0, clientX: 10, clientY: 10 } as MouseEvent;
        editTool.handleMouseDown(mouseDownEvent, state);
        
        // Move the vertex
        const mouseMoveEvent = { clientX: 15, clientY: 15 } as MouseEvent;
        editTool.handleMouseMove(mouseMoveEvent, state);
        
        // End the move
        editTool.handleMouseUp(state);
        
        // Verify that execute was called
        expect(executeSpy).toHaveBeenCalled();
        
        // Get the last call arguments
        const lastCall = executeSpy.mock.calls[executeSpy.mock.calls.length - 1];
        const [command, stateArg, source] = lastCall;
        
        // Verify the command type
        expect(command.constructor.name).toBe('MoveVertexCommand');
        
        // Verify the source parameter - should be undefined (defaults to 'local')
        expect(source).toBeUndefined();
    });
});
