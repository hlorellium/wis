import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Path2DRenderer } from '../src/rendering/path2DRenderer';
import { createTestState, createTestRectangle, createTestCircle, createTestLine } from './helpers';
import type { State } from '../src/state';

// Simple Path2D mock that implements the necessary methods
class MockPath2D {
  // Implement Path2D methods that the renderer calls
  moveTo(x: number, y: number) {
    // No-op implementation for testing
  }

  lineTo(x: number, y: number) {
    // No-op implementation for testing
  }

  rect(x: number, y: number, width: number, height: number) {
    // No-op implementation for testing
  }

  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
    // No-op implementation for testing
  }
}

// Mock CanvasRenderingContext2D
class MockCanvasRenderingContext2D {
  public calls: Array<{ method: string; args: any[] }> = [];
  public fillStyle = '';
  public strokeStyle = '';
  public lineWidth = 1;
  public globalAlpha = 1;

  save() {
    this.calls.push({ method: 'save', args: [] });
  }

  restore() {
    this.calls.push({ method: 'restore', args: [] });
  }

  scale(x: number, y: number) {
    this.calls.push({ method: 'scale', args: [x, y] });
  }

  translate(x: number, y: number) {
    this.calls.push({ method: 'translate', args: [x, y] });
  }

  clearRect(x: number, y: number, width: number, height: number) {
    this.calls.push({ method: 'clearRect', args: [x, y, width, height] });
  }

  fill(path?: Path2D) {
    this.calls.push({ method: 'fill', args: path ? [path] : [] });
  }

  stroke(path?: Path2D) {
    this.calls.push({ method: 'stroke', args: path ? [path] : [] });
  }

  strokeRect(x: number, y: number, width: number, height: number) {
    this.calls.push({ method: 'strokeRect', args: [x, y, width, height] });
  }

  beginPath() {
    this.calls.push({ method: 'beginPath', args: [] });
  }

  setLineDash(segments: number[]) {
    this.calls.push({ method: 'setLineDash', args: [segments] });
  }

  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
    this.calls.push({ method: 'arc', args: [x, y, radius, startAngle, endAngle] });
  }

  moveTo(x: number, y: number) {
    this.calls.push({ method: 'moveTo', args: [x, y] });
  }

  lineTo(x: number, y: number) {
    this.calls.push({ method: 'lineTo', args: [x, y] });
  }
}

describe('Path2DRenderer', () => {
  let renderer: Path2DRenderer;
  let mockCtx: MockCanvasRenderingContext2D;
  let canvas: HTMLCanvasElement;
  let state: State;
  let originalPath2D: typeof Path2D;
  let createdPaths: MockPath2D[] = [];

  beforeEach(() => {
    // Reset paths array
    createdPaths = [];
    
    // Mock Path2D globally
    originalPath2D = globalThis.Path2D;
    globalThis.Path2D = vi.fn().mockImplementation(() => {
      const mockPath = new MockPath2D();
      createdPaths.push(mockPath);
      return mockPath;
    }) as any;

    // Mock devicePixelRatio
    Object.defineProperty(window, 'devicePixelRatio', {
      writable: true,
      value: 1,
    });

    renderer = new Path2DRenderer();
    mockCtx = new MockCanvasRenderingContext2D();
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    state = createTestState();
  });

  afterEach(() => {
    globalThis.Path2D = originalPath2D;
    vi.clearAllMocks();
  });

  describe('shape rendering behavior', () => {
    it('should render rectangle using fill operation', () => {
      const rectangle = createTestRectangle({ color: '#ff0000' });
      state.scene.shapes = [rectangle];
      
      renderer.render(mockCtx as any, canvas, state);

      // Check that rectangle is filled, not stroked
      const fillCalls = mockCtx.calls.filter(call => call.method === 'fill');
      expect(fillCalls.length).toBe(1);
      expect(mockCtx.fillStyle).toBe('#ff0000');
    });

    it('should render circle using stroke operation', () => {
      const circle = createTestCircle({ color: '#00ff00' });
      state.scene.shapes = [circle];
      
      renderer.render(mockCtx as any, canvas, state);

      // Check that circle is stroked, not filled
      const strokeCalls = mockCtx.calls.filter(call => call.method === 'stroke');
      expect(strokeCalls.length).toBeGreaterThan(0);
      expect(mockCtx.strokeStyle).toBe('#00ff00');
      expect(mockCtx.lineWidth).toBe(2);
    });

    it('should render line using stroke operation', () => {
      const line = createTestLine({ color: '#0000ff' });
      state.scene.shapes = [line];
      
      renderer.render(mockCtx as any, canvas, state);

      // Check that line is stroked
      const strokeCalls = mockCtx.calls.filter(call => call.method === 'stroke');
      expect(strokeCalls.length).toBeGreaterThan(0);
      expect(mockCtx.strokeStyle).toBe('#0000ff');
      expect(mockCtx.lineWidth).toBe(2);
    });
  });

  describe('render transformations', () => {
    it('should apply view transformations correctly', () => {
      state.view.panX = 50;
      state.view.panY = 30;
      state.view.zoom = 2;

      renderer.render(mockCtx as any, canvas, state);

      // Check that transformations are applied in correct order
      const calls = mockCtx.calls;
      const translateCall = calls.find(call => call.method === 'translate');
      const scaleCalls = calls.filter(call => call.method === 'scale');

      expect(translateCall).toBeDefined();
      expect(translateCall?.args).toEqual([50, 30]);
      
      // Should have two scale calls: DPR (1,1) and zoom (2,2)
      expect(scaleCalls.length).toBeGreaterThanOrEqual(1);
      const zoomScaleCall = scaleCalls.find(call => call.args[0] === 2 && call.args[1] === 2);
      expect(zoomScaleCall).toBeDefined();
    });

    it('should handle device pixel ratio', () => {
      Object.defineProperty(window, 'devicePixelRatio', {
        writable: true,
        value: 2,
      });

      renderer.render(mockCtx as any, canvas, state);

      // Should scale by DPR first
      const scaleCalls = mockCtx.calls.filter(call => call.method === 'scale');
      expect(scaleCalls[0]?.args).toEqual([2, 2]); // DPR scaling
    });

    it('should clear canvas with correct dimensions', () => {
      renderer.render(mockCtx as any, canvas, state);

      const clearCall = mockCtx.calls.find(call => call.method === 'clearRect');
      expect(clearCall?.args).toEqual([0, 0, 800, 600]);
    });
  });

  describe('shape rendering', () => {
    it('should fill rectangles and stroke other shapes', () => {
      const rectangle = createTestRectangle();
      const circle = createTestCircle();
      const line = createTestLine();

      state.scene.shapes = [rectangle, circle, line];
      renderer.render(mockCtx as any, canvas, state);

      // Rectangle should be filled
      const fillCalls = mockCtx.calls.filter(call => call.method === 'fill');
      expect(fillCalls.length).toBeGreaterThan(0);

      // Circle and line should be stroked
      const strokeCalls = mockCtx.calls.filter(call => call.method === 'stroke');
      expect(strokeCalls.length).toBeGreaterThan(0);
    });

    it('should set correct styles for different shape types', () => {
      const rectangle = createTestRectangle({ color: '#ff0000' });
      state.scene.shapes = [rectangle];
      
      renderer.render(mockCtx as any, canvas, state);

      expect(mockCtx.fillStyle).toBe('#ff0000');
    });

    it('should use default colors when shape color is not specified', () => {
      const rectangle = createTestRectangle();
      // Remove color to test default
      delete (rectangle as any).color;
      
      state.scene.shapes = [rectangle];
      renderer.render(mockCtx as any, canvas, state);

      expect(mockCtx.fillStyle).toBe('#f00'); // Default rectangle color
    });
  });

  describe('selection highlighting', () => {
    it('should render selection highlight for selected rectangle', () => {
      const rectangle = createTestRectangle({ x: 10, y: 20, width: 100, height: 50 });
      state.scene.shapes = [rectangle];
      state.selection = rectangle.id;

      renderer.render(mockCtx as any, canvas, state);

      // Should call strokeRect for selection highlight
      const strokeRectCall = mockCtx.calls.find(call => call.method === 'strokeRect');
      expect(strokeRectCall).toBeDefined();
      expect(strokeRectCall?.args).toEqual([8, 18, 104, 54]); // x-2, y-2, width+4, height+4
    });

    it('should render selection highlight for selected circle', () => {
      const circle = createTestCircle({ x: 50, y: 75, radius: 25 });
      state.scene.shapes = [circle];
      state.selection = circle.id;

      renderer.render(mockCtx as any, canvas, state);

      // Should call arc for selection highlight
      const arcCalls = mockCtx.calls.filter(call => call.method === 'arc');
      const selectionArc = arcCalls.find(call => call.args[2] === 28); // radius + 3
      expect(selectionArc).toBeDefined();
    });

    it('should set selection highlight style', () => {
      const rectangle = createTestRectangle();
      state.scene.shapes = [rectangle];
      state.selection = rectangle.id;

      renderer.render(mockCtx as any, canvas, state);

      // Check that selection style is applied
      expect(mockCtx.strokeStyle).toBe('#ffaa00');
    });
  });

  describe('preview rendering', () => {
    it('should render preview with dashed line style', () => {
      const previewShape = createTestRectangle();
      state.currentDrawing.shape = previewShape;
      state.currentDrawing.type = 'rectangle';

      renderer.render(mockCtx as any, canvas, state);

      // Should set dashed line for preview
      const dashCall = mockCtx.calls.find(call => call.method === 'setLineDash');
      expect(dashCall?.args).toEqual([[5, 5]]);
      expect(mockCtx.globalAlpha).toBe(0.6);
    });

    it('should render different preview types correctly', () => {
      const testCases = [
        { shape: createTestRectangle(), type: 'rectangle' },
        { shape: createTestCircle(), type: 'circle' },
        { shape: createTestLine(), type: 'line' }
      ];

      testCases.forEach(({ shape, type }) => {
        mockCtx.calls = []; // Reset calls
        state.currentDrawing.shape = shape;
        state.currentDrawing.type = type as any;

        renderer.render(mockCtx as any, canvas, state);

        // All previews should have dashed lines
        const dashCall = mockCtx.calls.find(call => call.method === 'setLineDash');
        expect(dashCall).toBeDefined();
      });
    });
  });

  describe('caching behavior (via public API)', () => {
    it('should cache shapes after first render', () => {
      const rectangle = createTestRectangle();
      const circle = createTestCircle();
      state.scene.shapes = [rectangle, circle];

      // Initially nothing should be cached
      expect(renderer.isCached(rectangle.id)).toBe(false);
      expect(renderer.isCached(circle.id)).toBe(false);
      expect(renderer.getCacheSize()).toBe(0);

      // After rendering, shapes should be cached
      renderer.render(mockCtx as any, canvas, state);
      expect(renderer.isCached(rectangle.id)).toBe(true);
      expect(renderer.isCached(circle.id)).toBe(true);
      expect(renderer.getCacheSize()).toBe(2);
    });

    it('should clear cache for specific shape ID', () => {
      const rectangle = createTestRectangle();
      const circle = createTestCircle();
      state.scene.shapes = [rectangle, circle];

      renderer.render(mockCtx as any, canvas, state);
      expect(renderer.getCacheSize()).toBe(2);
      
      // Clear specific shape
      renderer.clearCache(rectangle.id);
      expect(renderer.isCached(rectangle.id)).toBe(false);
      expect(renderer.isCached(circle.id)).toBe(true);
      expect(renderer.getCacheSize()).toBe(1);
    });

    it('should clear entire cache', () => {
      const shapes = [createTestRectangle(), createTestCircle(), createTestLine()];
      state.scene.shapes = shapes;

      renderer.render(mockCtx as any, canvas, state);
      expect(renderer.getCacheSize()).toBe(3);
      
      // Clear all
      renderer.clearCache();
      expect(renderer.getCacheSize()).toBe(0);
      shapes.forEach(shape => {
        expect(renderer.isCached(shape.id)).toBe(false);
      });
    });

    it('should rebuild cache after clearing', () => {
      const rectangle = createTestRectangle();
      state.scene.shapes = [rectangle];

      // Initial render
      renderer.render(mockCtx as any, canvas, state);
      expect(renderer.isCached(rectangle.id)).toBe(true);

      // Clear and verify
      renderer.clearCache(rectangle.id);
      expect(renderer.isCached(rectangle.id)).toBe(false);

      // Re-render should rebuild cache
      renderer.render(mockCtx as any, canvas, state);
      expect(renderer.isCached(rectangle.id)).toBe(true);
    });
  });

  describe('context state management', () => {
    it('should save and restore context state', () => {
      renderer.render(mockCtx as any, canvas, state);

      const saveCalls = mockCtx.calls.filter(call => call.method === 'save');
      const restoreCalls = mockCtx.calls.filter(call => call.method === 'restore');

      expect(saveCalls.length).toBeGreaterThan(0);
      expect(restoreCalls.length).toBeGreaterThan(0);
      expect(saveCalls.length).toBe(restoreCalls.length);
    });
  });
});
