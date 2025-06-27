import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Path2DRenderer } from '../src/rendering/path2DRenderer';
import { createTestState, createTestRectangle, createTestCircle, createTestLine } from './helpers';
import type { State } from '../src/state';

// Mock Path2D to capture method calls
class MockPath2D {
  public calls: Array<{ method: string; args: any[] }> = [];

  moveTo(x: number, y: number) {
    this.calls.push({ method: 'moveTo', args: [x, y] });
  }

  lineTo(x: number, y: number) {
    this.calls.push({ method: 'lineTo', args: [x, y] });
  }

  rect(x: number, y: number, width: number, height: number) {
    this.calls.push({ method: 'rect', args: [x, y, width, height] });
  }

  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
    this.calls.push({ method: 'arc', args: [x, y, radius, startAngle, endAngle] });
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

  describe('createPath2D', () => {
    it('should create correct Path2D for rectangle', () => {
      const rectangle = createTestRectangle({ x: 10, y: 20, width: 100, height: 50 });
      
      // Trigger path creation by rendering
      state.scene.shapes = [rectangle];
      renderer.render(mockCtx as any, canvas, state);

      // Find the Path2D that was created
      const rectanglePath = createdPaths.find((path: MockPath2D) => 
        path.calls.some(call => call.method === 'rect')
      );

      expect(rectanglePath).toBeDefined();
      expect(rectanglePath!.calls).toContainEqual({
        method: 'rect',
        args: [10, 20, 100, 50]
      });
    });

    it('should create correct Path2D for circle', () => {
      const circle = createTestCircle({ x: 50, y: 75, radius: 25 });
      
      state.scene.shapes = [circle];
      renderer.render(mockCtx as any, canvas, state);

      const circlePath = createdPaths.find((path: MockPath2D) => 
        path.calls.some(call => call.method === 'arc')
      );

      expect(circlePath).toBeDefined();
      expect(circlePath!.calls).toContainEqual({
        method: 'arc',
        args: [50, 75, 25, 0, Math.PI * 2]
      });
    });

    it('should create correct Path2D for line', () => {
      const line = createTestLine({ x1: 0, y1: 0, x2: 100, y2: 50 });
      
      state.scene.shapes = [line];
      renderer.render(mockCtx as any, canvas, state);

      const linePath = createdPaths.find((path: MockPath2D) => 
        path.calls.some(call => call.method === 'moveTo') &&
        path.calls.some(call => call.method === 'lineTo')
      );

      expect(linePath).toBeDefined();
      expect(linePath!.calls).toContainEqual({
        method: 'moveTo',
        args: [0, 0]
      });
      expect(linePath!.calls).toContainEqual({
        method: 'lineTo',
        args: [100, 50]
      });
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

  describe('caching', () => {
    it('should cache Path2D objects by shape ID', () => {
      const rectangle = createTestRectangle();
      state.scene.shapes = [rectangle];

      // Render twice
      renderer.render(mockCtx as any, canvas, state);
      const firstRenderPathCount = createdPaths.length;
      
      renderer.render(mockCtx as any, canvas, state);
      const secondRenderPathCount = createdPaths.length;

      // Should not create additional Path2D objects on second render (cache hit)
      expect(secondRenderPathCount).toBe(firstRenderPathCount);
    });

    it('should clear cache for specific shape ID', () => {
      const rectangle = createTestRectangle();
      state.scene.shapes = [rectangle];

      renderer.render(mockCtx as any, canvas, state);
      const pathCountBefore = createdPaths.length;
      
      renderer.clearCache(rectangle.id);

      // After clearing cache, should create new Path2D on next render
      renderer.render(mockCtx as any, canvas, state);
      const pathCountAfter = createdPaths.length;

      expect(pathCountAfter).toBeGreaterThan(pathCountBefore);
    });

    it('should clear entire cache', () => {
      const shapes = [createTestRectangle(), createTestCircle(), createTestLine()];
      state.scene.shapes = shapes;

      renderer.render(mockCtx as any, canvas, state);
      const pathCountBefore = createdPaths.length;
      
      renderer.clearCache(); // Clear all

      // Should create new Path2D objects for all shapes
      renderer.render(mockCtx as any, canvas, state);
      const pathCountAfter = createdPaths.length;

      expect(pathCountAfter).toBeGreaterThan(pathCountBefore);
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
