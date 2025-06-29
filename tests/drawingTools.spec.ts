import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { DrawingTools } from '../src/tools/drawingTools';
import { CommandExecutor } from '../src/commandExecutor';
import { CoordinateTransformer } from '../src/canvas/coordinates';
import { AddShapeCommand } from '../src/history';
import { PALETTE } from '../src/constants';
import type { State, LineShape, RectangleShape, CircleShape, BezierCurveShape } from '../src/state';

// Mock dependencies
vi.mock('../src/canvas/coordinates');
vi.mock('../src/commandExecutor');
vi.mock('../src/history');
vi.mock('../src/state', () => ({
  generateId: vi.fn(() => 'test-id-123')
}));

describe('DrawingTools', () => {
  let drawingTools: DrawingTools;
  let mockCanvas: HTMLCanvasElement;
  let mockExecutor: {
    execute: MockedFunction<any>;
  };
  let mockCoordinateTransformer: {
    screenToWorld: MockedFunction<any>;
  };
  let mockOnHistoryChange: MockedFunction<any>;
  let mockState: State;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock canvas
    mockCanvas = {
      width: 800,
      height: 600,
      getBoundingClientRect: vi.fn(() => ({
        left: 0,
        top: 0,
        width: 800,
        height: 600
      }))
    } as any;

    // Create mock executor
    mockExecutor = {
      execute: vi.fn(),
      listeners: [],
      executedCommands: new Set(),
      setHistoryManager: vi.fn(),
      subscribe: vi.fn(),
      getListenerCount: vi.fn(() => 0)
    } as any;

    // Create mock coordinate transformer
    mockCoordinateTransformer = {
      screenToWorld: vi.fn()
    };

    // Mock the CoordinateTransformer constructor
    (CoordinateTransformer as any).mockImplementation(() => mockCoordinateTransformer);

    // Create mock history change callback
    mockOnHistoryChange = vi.fn();

    // Create DrawingTools instance
    drawingTools = new DrawingTools(mockCanvas, mockExecutor as any, mockOnHistoryChange);

    // Create mock state with correct structure
    mockState = {
      tool: 'line',
      currentColor: '#000000',
      scene: { shapes: [] },
      view: { panX: 0, panY: 0, zoom: 1 },
      selection: [],
      currentEditing: {
        shapeId: null,
        vertexIndex: null,
        isDragging: false,
        isGroupMove: false,
        dragStart: null
      },
      currentDrawing: {
        shape: null,
        type: null
      },
      ui: {
        selectionDrag: {
          isActive: false,
          start: null,
          current: null
        }
      }
    } as State;

    // Setup default coordinate transformation
    mockCoordinateTransformer.screenToWorld.mockReturnValue({ x: 100, y: 100 });
  });

  describe('constructor', () => {
    it('should initialize with canvas, executor and history callback', () => {
      expect(CoordinateTransformer).toHaveBeenCalledWith(mockCanvas);
      expect(drawingTools).toBeInstanceOf(DrawingTools);
    });

    it('should work without history callback', () => {
      const toolsWithoutCallback = new DrawingTools(mockCanvas, mockExecutor as any);
      expect(toolsWithoutCallback).toBeInstanceOf(DrawingTools);
    });
  });

  describe('handleMouseDown', () => {
    it('should return false for non-left mouse button', () => {
      const event = new MouseEvent('mousedown', { button: 1 }); // Right click
      const result = drawingTools.handleMouseDown(event, mockState);
      
      expect(result).toBe(false);
      expect(mockCoordinateTransformer.screenToWorld).not.toHaveBeenCalled();
    });

    it('should return false when tool is pan', () => {
      mockState.tool = 'pan';
      const event = new MouseEvent('mousedown', { button: 0, clientX: 200, clientY: 150 });
      const result = drawingTools.handleMouseDown(event, mockState);
      
      expect(result).toBe(false);
      expect(mockCoordinateTransformer.screenToWorld).not.toHaveBeenCalled();
    });

    it('should start drawing line on left click', () => {
      mockState.tool = 'line';
      const event = new MouseEvent('mousedown', { button: 0, clientX: 200, clientY: 150 });
      const result = drawingTools.handleMouseDown(event, mockState);
      
      expect(result).toBe(true);
      expect(mockCoordinateTransformer.screenToWorld).toHaveBeenCalledWith(200, 150, mockState);
      expect(mockState.currentDrawing.shape).toEqual({
        id: 'test-id-123',
        type: 'line',
        color: '#000000',
        x1: 100,
        y1: 100,
        x2: 100,
        y2: 100
      });
      expect(mockState.currentDrawing.type).toBe('line');
    });

    it('should start drawing rectangle on left click', () => {
      mockState.tool = 'rectangle';
      const event = new MouseEvent('mousedown', { button: 0, clientX: 200, clientY: 150 });
      const result = drawingTools.handleMouseDown(event, mockState);
      
      expect(result).toBe(true);
      expect(mockState.currentDrawing.shape).toEqual({
        id: 'test-id-123',
        type: 'rectangle',
        color: '#000000',
        x: 100,
        y: 100,
        width: 0,
        height: 0
      });
      expect(mockState.currentDrawing.type).toBe('rectangle');
    });

    it('should start drawing circle on left click', () => {
      mockState.tool = 'circle';
      const event = new MouseEvent('mousedown', { button: 0, clientX: 200, clientY: 150 });
      const result = drawingTools.handleMouseDown(event, mockState);
      
      expect(result).toBe(true);
      expect(mockState.currentDrawing.shape).toEqual({
        id: 'test-id-123',
        type: 'circle',
        color: '#000000',
        x: 100,
        y: 100,
        radius: 0
      });
      expect(mockState.currentDrawing.type).toBe('circle');
    });

    it('should start drawing bezier curve on left click', () => {
      mockState.tool = 'curve';
      const event = new MouseEvent('mousedown', { button: 0, clientX: 200, clientY: 150 });
      const result = drawingTools.handleMouseDown(event, mockState);
      
      expect(result).toBe(true);
      expect(mockState.currentDrawing.shape).toEqual({
        id: 'test-id-123',
        type: 'bezier',
        color: '#000000',
        points: [
          { x: 100, y: 100 }, // p0
          { x: 100, y: 100 }, // cp1
          { x: 100, y: 100 }, // cp2
          { x: 100, y: 100 }  // p1
        ]
      });
      expect(mockState.currentDrawing.type).toBe('curve');
    });
  });

  describe('handleMouseMove', () => {
    beforeEach(() => {
      // Start drawing first
      const event = new MouseEvent('mousedown', { button: 0, clientX: 100, clientY: 100 });
      mockCoordinateTransformer.screenToWorld.mockReturnValueOnce({ x: 50, y: 50 });
      drawingTools.handleMouseDown(event, mockState);
    });

    it('should return false when not drawing', () => {
      const nonDrawingTools = new DrawingTools(mockCanvas, mockExecutor as any);
      const event = new MouseEvent('mousemove', { clientX: 200, clientY: 150 });
      const result = nonDrawingTools.handleMouseMove(event, mockState);
      
      expect(result).toBe(false);
    });

    it('should return false when no current drawing shape', () => {
      mockState.currentDrawing.shape = null;
      const event = new MouseEvent('mousemove', { clientX: 200, clientY: 150 });
      const result = drawingTools.handleMouseMove(event, mockState);
      
      expect(result).toBe(false);
    });

    it('should update line during drawing', () => {
      mockState.tool = 'line';
      mockCoordinateTransformer.screenToWorld.mockReturnValue({ x: 200, y: 150 });
      
      const event = new MouseEvent('mousemove', { clientX: 300, clientY: 250 });
      const result = drawingTools.handleMouseMove(event, mockState);
      
      expect(result).toBe(true);
      expect(mockCoordinateTransformer.screenToWorld).toHaveBeenCalledWith(300, 250, mockState);
      
      const line = mockState.currentDrawing.shape as LineShape;
      expect(line.x2).toBe(200);
      expect(line.y2).toBe(150);
    });

    it('should update rectangle during drawing', () => {
      mockState.tool = 'rectangle';
      mockState.currentDrawing.shape = {
        id: 'test-id',
        type: 'rectangle',
        color: PALETTE.RECTANGLE,
        x: 50,
        y: 50,
        width: 0,
        height: 0
      } as RectangleShape;
      
      mockCoordinateTransformer.screenToWorld.mockReturnValue({ x: 200, y: 150 });
      
      const event = new MouseEvent('mousemove', { clientX: 300, clientY: 250 });
      const result = drawingTools.handleMouseMove(event, mockState);
      
      expect(result).toBe(true);
      
      const rect = mockState.currentDrawing.shape as RectangleShape;
      expect(rect.x).toBe(50); // min(50, 200)
      expect(rect.y).toBe(50); // min(50, 150)
      expect(rect.width).toBe(150); // abs(200 - 50)
      expect(rect.height).toBe(100); // abs(150 - 50)
    });

    it('should update rectangle with reversed coordinates', () => {
      mockState.tool = 'rectangle';
      mockState.currentDrawing.shape = {
        id: 'test-id',
        type: 'rectangle',
        color: PALETTE.RECTANGLE,
        x: 200,
        y: 150,
        width: 0,
        height: 0
      } as RectangleShape;
      
      // Mouse starts at 200,150 and moves to 50,50 (reverse direction)
      mockCoordinateTransformer.screenToWorld.mockReturnValue({ x: 50, y: 50 });
      
      const event = new MouseEvent('mousemove', { clientX: 100, clientY: 100 });
      const result = drawingTools.handleMouseMove(event, mockState);
      
      expect(result).toBe(true);
      
      const rect = mockState.currentDrawing.shape as RectangleShape;
      expect(rect.x).toBe(50); // min(200, 50) - should use start position from mousedown
      expect(rect.y).toBe(50); // min(150, 50)
    });

    it('should update circle during drawing', () => {
      mockState.tool = 'circle';
      mockState.currentDrawing.shape = {
        id: 'test-id',
        type: 'circle',
        color: PALETTE.CIRCLE,
        x: 50,
        y: 50,
        radius: 0
      } as CircleShape;
      
      mockCoordinateTransformer.screenToWorld.mockReturnValue({ x: 90, y: 90 });
      
      const event = new MouseEvent('mousemove', { clientX: 200, clientY: 200 });
      const result = drawingTools.handleMouseMove(event, mockState);
      
      expect(result).toBe(true);
      
      const circle = mockState.currentDrawing.shape as CircleShape;
      // Distance from (50,50) to (90,90) = sqrt((90-50)² + (90-50)²) = sqrt(40² + 40²) ≈ 56.57
      expect(circle.radius).toBeCloseTo(56.57, 1);
    });

    it('should update bezier curve during drawing', () => {
      mockState.tool = 'curve';
      mockState.currentDrawing.shape = {
        id: 'test-id',
        type: 'bezier',
        color: PALETTE.CURVE,
        points: [
          { x: 50, y: 50 },   // p0
          { x: 50, y: 50 },   // cp1
          { x: 50, y: 50 },   // cp2
          { x: 50, y: 50 }    // p1
        ]
      } as BezierCurveShape;
      
      mockCoordinateTransformer.screenToWorld.mockReturnValue({ x: 200, y: 150 });
      
      const event = new MouseEvent('mousemove', { clientX: 300, clientY: 250 });
      const result = drawingTools.handleMouseMove(event, mockState);
      
      expect(result).toBe(true);
      
      const curve = mockState.currentDrawing.shape as BezierCurveShape;
      expect(curve.points[3]).toEqual({ x: 200, y: 150 }); // End point updated
      
      // Control points should be calculated based on the direction vector
      expect(curve.points[1].x).not.toBe(50); // Control point 1 should be different from start
      expect(curve.points[2].x).not.toBe(50); // Control point 2 should be different from start
    });

    it('should handle zero-length bezier curve', () => {
      mockState.tool = 'curve';
      mockState.currentDrawing.shape = {
        id: 'test-id',
        type: 'bezier',
        color: PALETTE.CURVE,
        points: [
          { x: 50, y: 50 },
          { x: 50, y: 50 },
          { x: 50, y: 50 },
          { x: 50, y: 50 }
        ]
      } as BezierCurveShape;
      
      // Same position as start
      mockCoordinateTransformer.screenToWorld.mockReturnValue({ x: 50, y: 50 });
      
      const event = new MouseEvent('mousemove', { clientX: 100, clientY: 100 });
      const result = drawingTools.handleMouseMove(event, mockState);
      
      expect(result).toBe(true);
      
      const curve = mockState.currentDrawing.shape as BezierCurveShape;
      // Should use fallback for zero-length case
      expect(curve.points[1]).toEqual({ x: 50, y: 50 });
      expect(curve.points[2]).toEqual({ x: 50, y: 50 });
    });
  });

  describe('handleMouseUp', () => {
    beforeEach(() => {
      // Start drawing first
      const event = new MouseEvent('mousedown', { button: 0, clientX: 100, clientY: 100 });
      mockCoordinateTransformer.screenToWorld.mockReturnValue({ x: 50, y: 50 });
      drawingTools.handleMouseDown(event, mockState);
    });

    it('should return false when not drawing', () => {
      const nonDrawingTools = new DrawingTools(mockCanvas, mockExecutor as any);
      const result = nonDrawingTools.handleMouseUp(mockState);
      
      expect(result).toBe(false);
    });

    it('should return false when no current drawing shape', () => {
      mockState.currentDrawing.shape = null;
      const result = drawingTools.handleMouseUp(mockState);
      
      expect(result).toBe(false);
    });

    it('should finalize line drawing and execute command', () => {
      mockState.tool = 'line';
      const expectedShape = mockState.currentDrawing.shape; // Capture before it's cleared
      const result = drawingTools.handleMouseUp(mockState);
      
      expect(result).toBe(true);
      expect(AddShapeCommand).toHaveBeenCalledWith(expectedShape);
      expect(mockExecutor.execute).toHaveBeenCalled();
      expect(mockOnHistoryChange).toHaveBeenCalled();
      expect(mockState.currentDrawing.shape).toBeNull();
      expect(mockState.currentDrawing.type).toBeNull();
    });

    it('should finalize rectangle with sufficient size', () => {
      mockState.tool = 'rectangle';
      mockState.currentDrawing.shape = {
        id: 'test-id',
        type: 'rectangle',
        color: PALETTE.RECTANGLE,
        x: 50,
        y: 50,
        width: 10,
        height: 15
      } as RectangleShape;
      mockState.currentDrawing.type = 'rectangle';
      
      const result = drawingTools.handleMouseUp(mockState);
      
      expect(result).toBe(true);
      expect(mockExecutor.execute).toHaveBeenCalled();
      expect(mockOnHistoryChange).toHaveBeenCalled();
    });

    it('should not finalize rectangle with insufficient size', () => {
      mockState.tool = 'rectangle';
      mockState.currentDrawing.shape = {
        id: 'test-id',
        type: 'rectangle',
        color: PALETTE.RECTANGLE,
        x: 50,
        y: 50,
        width: 0.5,
        height: 0.5
      } as RectangleShape;
      mockState.currentDrawing.type = 'rectangle';
      
      const result = drawingTools.handleMouseUp(mockState);
      
      expect(result).toBe(true);
      expect(mockExecutor.execute).not.toHaveBeenCalled();
      expect(mockOnHistoryChange).not.toHaveBeenCalled();
      expect(mockState.currentDrawing.shape).toBeNull();
      expect(mockState.currentDrawing.type).toBeNull();
    });

    it('should finalize circle with sufficient radius', () => {
      mockState.tool = 'circle';
      mockState.currentDrawing.shape = {
        id: 'test-id',
        type: 'circle',
        color: PALETTE.CIRCLE,
        x: 50,
        y: 50,
        radius: 10
      } as CircleShape;
      mockState.currentDrawing.type = 'circle';
      
      const result = drawingTools.handleMouseUp(mockState);
      
      expect(result).toBe(true);
      expect(mockExecutor.execute).toHaveBeenCalled();
      expect(mockOnHistoryChange).toHaveBeenCalled();
    });

    it('should not finalize circle with insufficient radius', () => {
      mockState.tool = 'circle';
      mockState.currentDrawing.shape = {
        id: 'test-id',
        type: 'circle',
        color: PALETTE.CIRCLE,
        x: 50,
        y: 50,
        radius: 0.5
      } as CircleShape;
      mockState.currentDrawing.type = 'circle';
      
      const result = drawingTools.handleMouseUp(mockState);
      
      expect(result).toBe(true);
      expect(mockExecutor.execute).not.toHaveBeenCalled();
      expect(mockOnHistoryChange).not.toHaveBeenCalled();
    });

    it('should finalize bezier curve with sufficient distance', () => {
      mockState.tool = 'curve';
      mockState.currentDrawing.shape = {
        id: 'test-id',
        type: 'bezier',
        color: PALETTE.CURVE,
        points: [
          { x: 50, y: 50 },    // p0
          { x: 60, y: 60 },    // cp1
          { x: 70, y: 70 },    // cp2
          { x: 80, y: 80 }     // p1
        ]
      } as BezierCurveShape;
      mockState.currentDrawing.type = 'curve';
      
      const result = drawingTools.handleMouseUp(mockState);
      
      expect(result).toBe(true);
      expect(mockExecutor.execute).toHaveBeenCalled();
      expect(mockOnHistoryChange).toHaveBeenCalled();
    });

    it('should not finalize bezier curve with insufficient distance', () => {
      mockState.tool = 'curve';
      mockState.currentDrawing.shape = {
        id: 'test-id',
        type: 'bezier',
        color: PALETTE.CURVE,
        points: [
          { x: 50, y: 50 },      // p0
          { x: 50.1, y: 50.1 },  // cp1
          { x: 50.2, y: 50.2 },  // cp2
          { x: 50.3, y: 50.3 }   // p1 - very close to start
        ]
      } as BezierCurveShape;
      mockState.currentDrawing.type = 'curve';
      
      const result = drawingTools.handleMouseUp(mockState);
      
      expect(result).toBe(true);
      expect(mockExecutor.execute).not.toHaveBeenCalled();
      expect(mockOnHistoryChange).not.toHaveBeenCalled();
    });

    it('should work without history callback', () => {
      const toolsWithoutCallback = new DrawingTools(mockCanvas, mockExecutor as any);
      
      // Start drawing
      const mouseDownEvent = new MouseEvent('mousedown', { button: 0, clientX: 100, clientY: 100 });
      mockCoordinateTransformer.screenToWorld.mockReturnValue({ x: 50, y: 50 });
      toolsWithoutCallback.handleMouseDown(mouseDownEvent, mockState);
      
      const result = toolsWithoutCallback.handleMouseUp(mockState);
      
      expect(result).toBe(true);
      expect(mockExecutor.execute).toHaveBeenCalled();
      // Should not throw when callback is undefined
    });
  });

  describe('edge cases and integration', () => {
    it('should handle complete drawing workflow for line', () => {
      mockState.tool = 'line';
      
      // Mouse down
      const mouseDownEvent = new MouseEvent('mousedown', { button: 0, clientX: 100, clientY: 100 });
      mockCoordinateTransformer.screenToWorld.mockReturnValueOnce({ x: 50, y: 50 });
      expect(drawingTools.handleMouseDown(mouseDownEvent, mockState)).toBe(true);
      
      // Mouse move
      const mouseMoveEvent = new MouseEvent('mousemove', { clientX: 200, clientY: 200 });
      mockCoordinateTransformer.screenToWorld.mockReturnValueOnce({ x: 150, y: 150 });
      expect(drawingTools.handleMouseMove(mouseMoveEvent, mockState)).toBe(true);
      
      // Mouse up
      expect(drawingTools.handleMouseUp(mockState)).toBe(true);
      
      expect(mockExecutor.execute).toHaveBeenCalledOnce();
      expect(mockOnHistoryChange).toHaveBeenCalledOnce();
    });

    it('should handle complete drawing workflow for rectangle', () => {
      mockState.tool = 'rectangle';
      
      // Mouse down
      const mouseDownEvent = new MouseEvent('mousedown', { button: 0, clientX: 100, clientY: 100 });
      mockCoordinateTransformer.screenToWorld.mockReturnValueOnce({ x: 50, y: 50 });
      expect(drawingTools.handleMouseDown(mouseDownEvent, mockState)).toBe(true);
      
      // Mouse move
      const mouseMoveEvent = new MouseEvent('mousemove', { clientX: 200, clientY: 200 });
      mockCoordinateTransformer.screenToWorld.mockReturnValueOnce({ x: 100, y: 100 });
      expect(drawingTools.handleMouseMove(mouseMoveEvent, mockState)).toBe(true);
      
      // Mouse up
      expect(drawingTools.handleMouseUp(mockState)).toBe(true);
      
      expect(mockExecutor.execute).toHaveBeenCalledOnce();
    });

    it('should handle interrupted drawing session', () => {
      mockState.tool = 'circle';
      
      // Start drawing
      const mouseDownEvent = new MouseEvent('mousedown', { button: 0, clientX: 100, clientY: 100 });
      mockCoordinateTransformer.screenToWorld.mockReturnValue({ x: 50, y: 50 });
      drawingTools.handleMouseDown(mouseDownEvent, mockState);
      
      // Simulate external clearing of drawing state
      mockState.currentDrawing.shape = null;
      
      // Mouse up should handle gracefully
      expect(drawingTools.handleMouseUp(mockState)).toBe(false);
      expect(mockExecutor.execute).not.toHaveBeenCalled();
    });

    it('should handle unknown tool type gracefully', () => {
      mockState.tool = 'unknown' as any;
      
      const mouseDownEvent = new MouseEvent('mousedown', { button: 0, clientX: 100, clientY: 100 });
      mockCoordinateTransformer.screenToWorld.mockReturnValue({ x: 50, y: 50 });
      const result = drawingTools.handleMouseDown(mouseDownEvent, mockState);
      
      expect(result).toBe(true); // Still returns true for left click
      expect(mockState.currentDrawing.shape).toBeNull(); // But no shape is created
    });
  });
});
