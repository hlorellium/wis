import { describe, it, expect, beforeEach, vi } from "vitest";
import { BackgroundRenderer } from "../src/rendering/background";
import { createTestState } from "./helpers";
import type { State } from "../src/state";

// Extended mock for canvas context with additional methods needed for background rendering
class MockCanvasRenderingContext2D {
  public calls: Array<{ method: string; args: any[] }> = [];
  public strokeStyle = "";
  public lineWidth = 1;

  save() {
    this.calls.push({ method: "save", args: [] });
  }

  restore() {
    this.calls.push({ method: "restore", args: [] });
  }

  scale(x: number, y: number) {
    this.calls.push({ method: "scale", args: [x, y] });
  }

  translate(x: number, y: number) {
    this.calls.push({ method: "translate", args: [x, y] });
  }

  clearRect(x: number, y: number, width: number, height: number) {
    this.calls.push({ method: "clearRect", args: [x, y, width, height] });
  }

  beginPath() {
    this.calls.push({ method: "beginPath", args: [] });
  }

  moveTo(x: number, y: number) {
    this.calls.push({ method: "moveTo", args: [x, y] });
  }

  lineTo(x: number, y: number) {
    this.calls.push({ method: "lineTo", args: [x, y] });
  }

  stroke() {
    this.calls.push({ method: "stroke", args: [] });
  }
}

describe("BackgroundRenderer", () => {
  let renderer: BackgroundRenderer;
  let mockCtx: MockCanvasRenderingContext2D;
  let canvas: HTMLCanvasElement;
  let state: State;

  beforeEach(() => {
    renderer = new BackgroundRenderer();
    mockCtx = new MockCanvasRenderingContext2D();
    canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    state = createTestState();

    // Mock devicePixelRatio
    Object.defineProperty(window, "devicePixelRatio", {
      writable: true,
      value: 1,
    });
  });

  describe("render", () => {
    it("should clear the canvas and draw grid lines", () => {
      renderer.render(mockCtx as any, canvas, state);

      // Should clear the canvas
      const clearCall = mockCtx.calls.find(
        (call) => call.method === "clearRect"
      );
      expect(clearCall).toBeDefined();
      expect(clearCall?.args).toEqual([0, 0, 800, 600]);

      // Should begin a path for drawing grid
      const beginPathCall = mockCtx.calls.find(
        (call) => call.method === "beginPath"
      );
      expect(beginPathCall).toBeDefined();

      // Should draw grid lines (moveTo and lineTo calls)
      const moveToCall = mockCtx.calls.find((call) => call.method === "moveTo");
      const lineToCall = mockCtx.calls.find((call) => call.method === "lineTo");
      expect(moveToCall).toBeDefined();
      expect(lineToCall).toBeDefined();

      // Should stroke the grid
      const strokeCall = mockCtx.calls.find((call) => call.method === "stroke");
      expect(strokeCall).toBeDefined();

      // Should set grid color
      expect(mockCtx.strokeStyle).toBe("#444");
    });

    it("should apply view transformations", () => {
      state.view.panX = 50;
      state.view.panY = 30;
      state.view.zoom = 2;

      renderer.render(mockCtx as any, canvas, state);

      // Should apply pan transformation
      const translateCall = mockCtx.calls.find(
        (call) => call.method === "translate"
      );
      expect(translateCall).toBeDefined();
      expect(translateCall?.args).toEqual([50, 30]);

      // Should apply zoom transformation
      const scaleCalls = mockCtx.calls.filter(
        (call) => call.method === "scale"
      );
      const zoomScaleCall = scaleCalls.find(
        (call) => call.args[0] === 2 && call.args[1] === 2
      );
      expect(zoomScaleCall).toBeDefined();
    });

    it("should handle device pixel ratio scaling", () => {
      Object.defineProperty(window, "devicePixelRatio", {
        writable: true,
        value: 2,
      });

      renderer.render(mockCtx as any, canvas, state);

      // Should scale by DPR
      const scaleCalls = mockCtx.calls.filter(
        (call) => call.method === "scale"
      );
      expect(scaleCalls[0]?.args).toEqual([2, 2]); // DPR scaling
    });

    it("should adjust line width based on zoom level", () => {
      state.view.zoom = 2;

      renderer.render(mockCtx as any, canvas, state);

      // Line width should be inversely proportional to zoom to maintain consistent appearance
      expect(mockCtx.lineWidth).toBe(0.5); // 1 / 2
    });

    it("should optimize grid rendering based on visible area", () => {
      // Set a large pan offset to test optimization
      state.view.panX = -1000;
      state.view.panY = -1000;
      state.view.zoom = 0.5;

      renderer.render(mockCtx as any, canvas, state);

      // Should still draw grid lines (exact number depends on optimization)
      const moveToCall = mockCtx.calls.find((call) => call.method === "moveTo");
      const lineToCall = mockCtx.calls.find((call) => call.method === "lineTo");
      expect(moveToCall).toBeDefined();
      expect(lineToCall).toBeDefined();
    });

    it("should handle different canvas sizes", () => {
      canvas.width = 1200;
      canvas.height = 800;

      renderer.render(mockCtx as any, canvas, state);

      // Should clear with correct dimensions
      const clearCall = mockCtx.calls.find(
        (call) => call.method === "clearRect"
      );
      expect(clearCall?.args).toEqual([0, 0, 1200, 800]);
    });

    it("should save and restore canvas context", () => {
      renderer.render(mockCtx as any, canvas, state);

      const saveCalls = mockCtx.calls.filter((call) => call.method === "save");
      const restoreCalls = mockCtx.calls.filter(
        (call) => call.method === "restore"
      );

      expect(saveCalls.length).toBe(1);
      expect(restoreCalls.length).toBe(1);
    });

    it("should draw both vertical and horizontal grid lines", () => {
      renderer.render(mockCtx as any, canvas, state);

      const moveToCall = mockCtx.calls.filter(
        (call) => call.method === "moveTo"
      );
      const lineToCall = mockCtx.calls.filter(
        (call) => call.method === "lineTo"
      );

      // Should have multiple moveTo/lineTo pairs for grid lines
      expect(moveToCall.length).toBeGreaterThan(1);
      expect(lineToCall.length).toBeGreaterThan(1);

      // Should have equal numbers of moveTo and lineTo calls (each line needs both)
      expect(moveToCall.length).toBe(lineToCall.length);
    });

    it("should handle extreme zoom levels", () => {
      // Test very high zoom
      state.view.zoom = 10;
      renderer.render(mockCtx as any, canvas, state);
      expect(mockCtx.lineWidth).toBe(0.1); // 1 / 10

      // Reset context
      mockCtx = new MockCanvasRenderingContext2D();

      // Test very low zoom
      state.view.zoom = 0.1;
      renderer.render(mockCtx as any, canvas, state);
      expect(mockCtx.lineWidth).toBe(10); // 1 / 0.1
    });

    it("should handle missing devicePixelRatio", () => {
      Object.defineProperty(window, "devicePixelRatio", {
        writable: true,
        value: undefined,
      });

      renderer.render(mockCtx as any, canvas, state);

      // Should still render without errors
      const strokeCall = mockCtx.calls.find((call) => call.method === "stroke");
      expect(strokeCall).toBeDefined();
    });
  });

  describe("grid properties", () => {
    it("should use consistent grid color", () => {
      renderer.render(mockCtx as any, canvas, state);
      expect(mockCtx.strokeStyle).toBe("#444");
    });

    it("should maintain grid structure across different view states", () => {
      const testCases = [
        { panX: 0, panY: 0, zoom: 1 },
        { panX: 100, panY: 50, zoom: 1.5 },
        { panX: -200, panY: -100, zoom: 0.8 },
        { panX: 500, panY: 300, zoom: 3 },
      ];

      testCases.forEach(({ panX, panY, zoom }) => {
        state.view.panX = panX;
        state.view.panY = panY;
        state.view.zoom = zoom;

        mockCtx.calls = []; // Reset calls
        renderer.render(mockCtx as any, canvas, state);

        // Should always draw grid lines regardless of view state
        const strokeCall = mockCtx.calls.find(
          (call) => call.method === "stroke"
        );
        expect(strokeCall).toBeDefined();
        expect(mockCtx.strokeStyle).toBe("#444");
      });
    });
  });
});
