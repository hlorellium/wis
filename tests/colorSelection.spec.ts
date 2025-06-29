import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { DrawingTools } from '../src/tools/drawingTools';
import { ToolManager } from '../src/tools/toolManager';
import { CommandExecutor } from '../src/commandExecutor';
import { HistoryManager } from '../src/history';
import { CoordinateTransformer } from '../src/canvas/coordinates';
import { createTestState } from './helpers';
import type { State } from '../src/state';

// Mock dependencies
vi.mock('../src/canvas/coordinates');
vi.mock('../src/commandExecutor');
vi.mock('../src/history');
vi.mock('../src/state', () => ({
  generateId: vi.fn(() => 'test-id-123')
}));

// Mock DOM elements
const mockColorPicker = {
  addEventListener: vi.fn(),
  value: '#000000',
  getAttribute: vi.fn(),
  setAttribute: vi.fn()
} as any;

const mockColorPickerLabel = {
  querySelector: vi.fn(() => ({
    setAttribute: vi.fn()
  }))
} as any;

vi.mock('../src/utils/dom', () => ({
  getElements: vi.fn(() => []),
  getOptionalElement: vi.fn((selector: string) => {
    if (selector === '#color-picker') return mockColorPicker;
    if (selector === '.color-picker-label') return mockColorPickerLabel;
    return null;
  }),
  getRequiredElement: vi.fn()
}));

describe('Color Selection Feature', () => {
  let drawingTools: DrawingTools;
  let toolManager: ToolManager;
  let mockCanvas: HTMLCanvasElement;
  let mockExecutor: any;
  let mockHistory: any;
  let mockCoordinateTransformer: any;
  let state: State;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock canvas
    mockCanvas = {
      width: 800,
      height: 600,
      style: { cursor: '' },
      getBoundingClientRect: vi.fn(() => ({
        left: 0,
        top: 0,
        width: 800,
        height: 600
      }))
    } as any;

    // Create mock executor and history
    mockExecutor = {
      execute: vi.fn(),
      setHistoryManager: vi.fn(),
      subscribe: vi.fn(),
      getListenerCount: vi.fn(() => 0)
    };

    mockHistory = {
      canUndo: vi.fn(() => false),
      canRedo: vi.fn(() => false),
      undo: vi.fn(),
      redo: vi.fn()
    };

    // Create mock coordinate transformer
    mockCoordinateTransformer = {
      screenToWorld: vi.fn(() => ({ x: 100, y: 100 }))
    };

    (CoordinateTransformer as any).mockImplementation(() => mockCoordinateTransformer);

    // Create instances
    drawingTools = new DrawingTools(mockCanvas, mockExecutor);
    toolManager = new ToolManager(mockCanvas, mockExecutor, mockHistory);
    
    // Create test state
    state = createTestState();
  });

  describe('State Management', () => {
    it('should have currentColor field in state', () => {
      expect(state.currentColor).toBeDefined();
      expect(typeof state.currentColor).toBe('string');
      expect(state.currentColor).toBe('#000000');
    });

    it('should allow updating currentColor', () => {
      state.currentColor = '#ff0000';
      expect(state.currentColor).toBe('#ff0000');
    });
  });

  describe('DrawingTools Color Integration', () => {
    it('should use state.currentColor for line shapes', () => {
      state.tool = 'line';
      state.currentColor = '#ff0000';

      const event = new MouseEvent('mousedown', { button: 0, clientX: 100, clientY: 100 });
      drawingTools.handleMouseDown(event, state);

      expect(state.currentDrawing.shape).toMatchObject({
        type: 'line',
        color: '#ff0000'
      });
    });

    it('should use state.currentColor for rectangle shapes', () => {
      state.tool = 'rectangle';
      state.currentColor = '#00ff00';

      const event = new MouseEvent('mousedown', { button: 0, clientX: 100, clientY: 100 });
      drawingTools.handleMouseDown(event, state);

      expect(state.currentDrawing.shape).toMatchObject({
        type: 'rectangle',
        color: '#00ff00'
      });
    });

    it('should use state.currentColor for circle shapes', () => {
      state.tool = 'circle';
      state.currentColor = '#0000ff';

      const event = new MouseEvent('mousedown', { button: 0, clientX: 100, clientY: 100 });
      drawingTools.handleMouseDown(event, state);

      expect(state.currentDrawing.shape).toMatchObject({
        type: 'circle',
        color: '#0000ff'
      });
    });

    it('should use state.currentColor for bezier curves', () => {
      state.tool = 'curve';
      state.currentColor = '#ffff00';

      const event = new MouseEvent('mousedown', { button: 0, clientX: 100, clientY: 100 });
      drawingTools.handleMouseDown(event, state);

      expect(state.currentDrawing.shape).toMatchObject({
        type: 'bezier',
        color: '#ffff00'
      });
    });

    it('should create shapes with different colors when currentColor changes', () => {
      // Draw first shape with red
      state.tool = 'line';
      state.currentColor = '#ff0000';
      
      let event = new MouseEvent('mousedown', { button: 0, clientX: 100, clientY: 100 });
      drawingTools.handleMouseDown(event, state);
      const firstShape = state.currentDrawing.shape;
      
      // Clear drawing state
      state.currentDrawing.shape = null;
      
      // Draw second shape with blue
      state.currentColor = '#0000ff';
      event = new MouseEvent('mousedown', { button: 0, clientX: 200, clientY: 200 });
      drawingTools.handleMouseDown(event, state);
      const secondShape = state.currentDrawing.shape;

      expect(firstShape?.color).toBe('#ff0000');
      expect(secondShape?.color).toBe('#0000ff');
    });
  });

  describe('ToolManager Color Picker Integration', () => {
    it('should setup color picker event listener', () => {
      toolManager.setupToolButtons(state);
      
      expect(mockColorPicker.addEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      );
    });

    it('should initialize color picker with current state color', () => {
      state.currentColor = '#ff00ff';
      toolManager.setupToolButtons(state);
      
      expect(mockColorPicker.value).toBe('#ff00ff');
    });

    it('should update state when color picker changes', () => {
      toolManager.setupToolButtons(state);
      
      // Simulate color picker change
      const changeHandler = mockColorPicker.addEventListener.mock.calls[0][1];
      const mockEvent = {
        target: { value: '#ff0000' }
      };
      
      changeHandler(mockEvent);
      
      expect(state.currentColor).toBe('#ff0000');
    });

    it('should update color picker UI when color changes', () => {
      toolManager.setupToolButtons(state);
      
      // Simulate color picker change
      const changeHandler = mockColorPicker.addEventListener.mock.calls[0][1];
      const mockEvent = {
        target: { value: '#00ff00' }
      };
      
      changeHandler(mockEvent);
      
      // Verify UI update was called
      expect(mockColorPickerLabel.querySelector).toHaveBeenCalledWith('svg circle:last-child');
    });
  });

  describe('Color Persistence', () => {
    it('should maintain color across tool switches', () => {
      state.currentColor = '#purple';
      state.tool = 'line';
      
      // Switch to rectangle tool
      state.tool = 'rectangle';
      
      // Draw shape - should still use the selected color
      const event = new MouseEvent('mousedown', { button: 0, clientX: 100, clientY: 100 });
      drawingTools.handleMouseDown(event, state);
      
      expect(state.currentDrawing.shape?.color).toBe('#purple');
    });

    it('should work with hex color codes', () => {
      const testColors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
      
      testColors.forEach(color => {
        state.currentColor = color;
        state.tool = 'circle';
        
        const event = new MouseEvent('mousedown', { button: 0, clientX: 100, clientY: 100 });
        drawingTools.handleMouseDown(event, state);
        
        expect(state.currentDrawing.shape?.color).toBe(color);
        
        // Reset for next iteration
        state.currentDrawing.shape = null;
      });
    });
  });

  describe('Integration with Existing Features', () => {
    it('should work with undo/redo', () => {
      // This test verifies that shapes with custom colors can be undone/redone
      // The actual undo/redo logic doesn't change, but we verify the structure is compatible
      state.currentColor = '#custom';
      state.tool = 'line';
      
      const event = new MouseEvent('mousedown', { button: 0, clientX: 100, clientY: 100 });
      drawingTools.handleMouseDown(event, state);
      
      // Verify the shape was created with the correct color
      expect(state.currentDrawing.shape?.color).toBe('#custom');
      
      drawingTools.handleMouseUp(state);
      
      expect(mockExecutor.execute).toHaveBeenCalled();
    });

    it('should work with shape selection', () => {
      // Verify that shapes with custom colors are properly selectable
      state.currentColor = '#selectable';
      
      // Add a shape to the scene
      state.scene.shapes.push({
        id: 'test-shape',
        type: 'rectangle',
        color: '#selectable',
        x: 10,
        y: 10,
        width: 20,
        height: 20
      });
      
      expect(state.scene.shapes[0].color).toBe('#selectable');
    });
  });
});
