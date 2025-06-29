import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { Renderer } from '../src/rendering/renderer';
import { ShapeRenderer } from '../src/rendering/shapes';
import type { State } from '../src/state';
import { createRectangle, createCircle, createLine, createTestState } from './factories/shapeFactory';

// Mock the ShapeRenderer class
vi.mock('../src/rendering/shapes', () => ({
  ShapeRenderer: vi.fn().mockImplementation(() => ({
    renderShape: vi.fn(),
    renderPreview: vi.fn()
  }))
}));

describe('Renderer', () => {
  let renderer: Renderer;
  let mockCtx: CanvasRenderingContext2D;
  let mockCanvas: HTMLCanvasElement;
  let mockShapeRenderer: {
    renderShape: MockedFunction<any>;
    renderPreview: MockedFunction<any>;
  };
  let mockState: State;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create renderer instance
    renderer = new Renderer();
    
    // Get the mocked ShapeRenderer instance
    mockShapeRenderer = (renderer as any).shapeRenderer;
    
    // Mock canvas context
    mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      translate: vi.fn(),
      clearRect: vi.fn(),
      canvas: {} as HTMLCanvasElement
    } as any;

    // Mock canvas element
    mockCanvas = {
      width: 800,
      height: 600,
      getContext: vi.fn().mockReturnValue(mockCtx)
    } as any;

    // Mock devicePixelRatio
    Object.defineProperty(window, 'devicePixelRatio', {
      writable: true,
      value: 1
    });

    // Create mock state using the factory
    mockState = createTestState();
    mockState.scene.shapes = []; // Start with empty scene for most tests
  });

  describe('constructor', () => {
    it('should create a ShapeRenderer instance', () => {
      expect(ShapeRenderer).toHaveBeenCalledOnce();
    });
  });

  describe('render', () => {
    it('should apply device pixel ratio scaling', () => {
      Object.defineProperty(window, 'devicePixelRatio', {
        value: 2
      });
      
      renderer.render(mockCtx, mockCanvas, mockState);
      
      expect(mockCtx.scale).toHaveBeenCalledWith(2, 2);
    });

    it('should fallback to devicePixelRatio of 1 when not available', () => {
      Object.defineProperty(window, 'devicePixelRatio', {
        value: undefined
      });
      
      renderer.render(mockCtx, mockCanvas, mockState);
      
      expect(mockCtx.scale).toHaveBeenCalledWith(1, 1);
    });

    it('should clear the canvas with correct dimensions', () => {
      mockCanvas.width = 1600; // 800 * 2 (dpr)
      mockCanvas.height = 1200; // 600 * 2 (dpr)
      Object.defineProperty(window, 'devicePixelRatio', {
        value: 2
      });
      
      renderer.render(mockCtx, mockCanvas, mockState);
      
      expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);
    });

    it('should apply view transformations', () => {
      mockState.view.panX = 50;
      mockState.view.panY = 30;
      mockState.view.zoom = 1.5;
      
      renderer.render(mockCtx, mockCanvas, mockState);
      
      expect(mockCtx.translate).toHaveBeenCalledWith(50, 30);
      expect(mockCtx.scale).toHaveBeenCalledWith(1.5, 1.5);
    });

    it('should save and restore canvas context', () => {
      renderer.render(mockCtx, mockCanvas, mockState);
      
      expect(mockCtx.save).toHaveBeenCalledOnce();
      expect(mockCtx.restore).toHaveBeenCalledOnce();
    });

    it('should render all shapes in the scene', () => {
      const shape1 = createRectangle({ id: 'shape1' });
      const shape2 = createCircle({ id: 'shape2' });
      
      mockState.scene.shapes = [shape1, shape2];
      
      renderer.render(mockCtx, mockCanvas, mockState);
      
      expect(mockShapeRenderer.renderShape).toHaveBeenCalledTimes(2);
      expect(mockShapeRenderer.renderShape).toHaveBeenCalledWith(mockCtx, shape1, mockState);
      expect(mockShapeRenderer.renderShape).toHaveBeenCalledWith(mockCtx, shape2, mockState);
    });

    it('should not render shapes when scene is empty', () => {
      mockState.scene.shapes = [];
      
      renderer.render(mockCtx, mockCanvas, mockState);
      
      expect(mockShapeRenderer.renderShape).not.toHaveBeenCalled();
    });

    it('should render current drawing preview when available', () => {
      const previewShape = createLine({ id: 'preview' });
      mockState.currentDrawing.shape = previewShape;
      mockState.currentDrawing.type = 'line';
      
      renderer.render(mockCtx, mockCanvas, mockState);
      
      expect(mockShapeRenderer.renderPreview).toHaveBeenCalledWith(
        mockCtx,
        previewShape,
        'line'
      );
    });

    it('should not render preview when no current drawing shape', () => {
      mockState.currentDrawing.shape = null;
      mockState.currentDrawing.type = 'line';
      
      renderer.render(mockCtx, mockCanvas, mockState);
      
      expect(mockShapeRenderer.renderPreview).not.toHaveBeenCalled();
    });

    it('should not render preview when no current drawing type', () => {
      const previewShape = createLine({ id: 'preview' });
      mockState.currentDrawing.shape = previewShape;
      mockState.currentDrawing.type = null;
      
      renderer.render(mockCtx, mockCanvas, mockState);
      
      expect(mockShapeRenderer.renderPreview).not.toHaveBeenCalled();
    });

    it('should handle complex rendering scenario', () => {
      // Setup complex state
      const shapes = [
        createRectangle({ id: 'rect1' }),
        createCircle({ id: 'circle1' }),
        createLine({ id: 'line1' })
      ];
      const previewShape = createRectangle({ id: 'preview' });
      
      mockState.scene.shapes = shapes;
      mockState.view = { panX: 100, panY: 50, zoom: 2 };
      mockState.currentDrawing = { shape: previewShape, type: 'rectangle' };
      
      // Set high DPI
      Object.defineProperty(window, 'devicePixelRatio', { value: 2 });
      mockCanvas.width = 1600;
      mockCanvas.height = 1200;
      
      renderer.render(mockCtx, mockCanvas, mockState);
      
      // Verify all operations occurred
      expect(mockCtx.save).toHaveBeenCalledOnce();
      expect(mockCtx.scale).toHaveBeenCalledWith(2, 2); // DPI scaling
      expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);
      expect(mockCtx.translate).toHaveBeenCalledWith(100, 50);
      expect(mockCtx.scale).toHaveBeenCalledWith(2, 2); // View zoom (called twice)
      expect(mockShapeRenderer.renderShape).toHaveBeenCalledTimes(3);
      expect(mockShapeRenderer.renderPreview).toHaveBeenCalledWith(mockCtx, previewShape, 'rectangle');
      expect(mockCtx.restore).toHaveBeenCalledOnce();
    });

    it('should handle zero dimensions gracefully', () => {
      mockCanvas.width = 0;
      mockCanvas.height = 0;
      
      renderer.render(mockCtx, mockCanvas, mockState);
      
      expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, 0, 0);
    });

    it('should handle negative view transformations', () => {
      mockState.view.panX = -100;
      mockState.view.panY = -50;
      mockState.view.zoom = 0.5;
      
      renderer.render(mockCtx, mockCanvas, mockState);
      
      expect(mockCtx.translate).toHaveBeenCalledWith(-100, -50);
      expect(mockCtx.scale).toHaveBeenCalledWith(0.5, 0.5);
    });
  });
});
