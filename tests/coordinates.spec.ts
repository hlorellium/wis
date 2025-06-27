import { describe, it, expect, beforeEach, vi } from "vitest";
import { CoordinateTransformer } from "../src/canvas/coordinates";
import { createTestState } from "./helpers";
import type { State } from "../src/state";

describe("CoordinateTransformer", () => {
  let canvas: HTMLCanvasElement;
  let transformer: CoordinateTransformer;
  let state: State;

  beforeEach(() => {
    // Create a mock canvas element
    canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;

    // Mock getBoundingClientRect to return predictable values
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      left: 100,
      top: 50,
      width: 800,
      height: 600,
      right: 900,
      bottom: 650,
      x: 100,
      y: 50,
      toJSON: () => ({}),
    } as DOMRect);

    transformer = new CoordinateTransformer(canvas);
    state = createTestState();
  });

  describe("screenToWorld", () => {
    it("should convert screen coordinates to world coordinates with no pan/zoom", () => {
      // Screen point (200, 150) -> Canvas point (100, 100) -> World point (100, 100)
      const result = transformer.screenToWorld(200, 150, state);

      expect(result.x).toBe(100); // (200 - 100) / 1
      expect(result.y).toBe(100); // (150 - 50) / 1
    });

    it("should handle zoom scaling correctly", () => {
      state.view.zoom = 2;

      // Screen point (300, 250) -> Canvas point (200, 200) -> World point (100, 100)
      const result = transformer.screenToWorld(300, 250, state);

      expect(result.x).toBe(100); // (300 - 100 - 0) / 2
      expect(result.y).toBe(100); // (250 - 50 - 0) / 2
    });

    it("should handle pan offset correctly", () => {
      state.view.panX = 50;
      state.view.panY = 30;

      // Screen point (200, 150) -> Canvas point (100, 100) -> World point (50, 70)
      const result = transformer.screenToWorld(200, 150, state);

      expect(result.x).toBe(50); // (200 - 100 - 50) / 1
      expect(result.y).toBe(70); // (150 - 50 - 30) / 1
    });

    it("should handle combined zoom and pan", () => {
      state.view.zoom = 2;
      state.view.panX = 100;
      state.view.panY = 50;

      // Screen point (400, 300) -> Canvas point (300, 250) -> World point (100, 100)
      const result = transformer.screenToWorld(400, 300, state);

      expect(result.x).toBe(100); // (400 - 100 - 100) / 2
      expect(result.y).toBe(100); // (300 - 50 - 50) / 2
    });

    it("should handle fractional zoom values", () => {
      state.view.zoom = 0.5;

      // Screen point (150, 100) -> Canvas point (50, 50) -> World point (100, 100)
      const result = transformer.screenToWorld(150, 100, state);

      expect(result.x).toBe(100); // (150 - 100 - 0) / 0.5
      expect(result.y).toBe(100); // (100 - 50 - 0) / 0.5
    });

    it("should handle negative pan values", () => {
      state.view.panX = -50;
      state.view.panY = -30;

      // Screen point (200, 150) -> Canvas point (100, 100) -> World point (150, 130)
      const result = transformer.screenToWorld(200, 150, state);

      expect(result.x).toBe(150); // (200 - 100 - (-50)) / 1
      expect(result.y).toBe(130); // (150 - 50 - (-30)) / 1
    });
  });

  describe("worldToScreen", () => {
    it("should convert world coordinates to screen coordinates with no pan/zoom", () => {
      // World point (100, 100) -> Canvas point (100, 100) -> Screen point (200, 150)
      const result = transformer.worldToScreen(100, 100, state);

      expect(result.x).toBe(200); // 100 * 1 + 0 + 100
      expect(result.y).toBe(150); // 100 * 1 + 0 + 50
    });

    it("should handle zoom scaling correctly", () => {
      state.view.zoom = 2;

      // World point (100, 100) -> Canvas point (200, 200) -> Screen point (300, 250)
      const result = transformer.worldToScreen(100, 100, state);

      expect(result.x).toBe(300); // 100 * 2 + 0 + 100
      expect(result.y).toBe(250); // 100 * 2 + 0 + 50
    });

    it("should handle pan offset correctly", () => {
      state.view.panX = 50;
      state.view.panY = 30;

      // World point (100, 100) -> Canvas point (150, 130) -> Screen point (250, 180)
      const result = transformer.worldToScreen(100, 100, state);

      expect(result.x).toBe(250); // 100 * 1 + 50 + 100
      expect(result.y).toBe(180); // 100 * 1 + 30 + 50
    });

    it("should handle combined zoom and pan", () => {
      state.view.zoom = 2;
      state.view.panX = 100;
      state.view.panY = 50;

      // World point (100, 100) -> Canvas point (300, 250) -> Screen point (400, 300)
      const result = transformer.worldToScreen(100, 100, state);

      expect(result.x).toBe(400); // 100 * 2 + 100 + 100
      expect(result.y).toBe(300); // 100 * 2 + 50 + 50
    });

    it("should handle fractional zoom values", () => {
      state.view.zoom = 0.5;

      // World point (100, 100) -> Canvas point (50, 50) -> Screen point (150, 100)
      const result = transformer.worldToScreen(100, 100, state);

      expect(result.x).toBe(150); // 100 * 0.5 + 0 + 100
      expect(result.y).toBe(100); // 100 * 0.5 + 0 + 50
    });

    it("should handle negative world coordinates", () => {
      // World point (-50, -30) -> Canvas point (-50, -30) -> Screen point (50, 20)
      const result = transformer.worldToScreen(-50, -30, state);

      expect(result.x).toBe(50); // -50 * 1 + 0 + 100
      expect(result.y).toBe(20); // -30 * 1 + 0 + 50
    });
  });

  describe("round-trip conversion", () => {
    it("should maintain precision in round-trip conversions", () => {
      const testCases = [
        { zoom: 1, panX: 0, panY: 0, worldX: 100, worldY: 100 },
        { zoom: 2, panX: 50, panY: 30, worldX: 150, worldY: 200 },
        { zoom: 0.5, panX: -20, panY: -10, worldX: 75, worldY: 125 },
        { zoom: 1.5, panX: 100, panY: 75, worldX: 0, worldY: 0 },
      ];

      testCases.forEach(({ zoom, panX, panY, worldX, worldY }) => {
        state.view.zoom = zoom;
        state.view.panX = panX;
        state.view.panY = panY;

        // World -> Screen -> World
        const screen = transformer.worldToScreen(worldX, worldY, state);
        const backToWorld = transformer.screenToWorld(
          screen.x,
          screen.y,
          state
        );

        expect(backToWorld.x).toBeCloseTo(worldX, 10);
        expect(backToWorld.y).toBeCloseTo(worldY, 10);
      });
    });

    it("should handle extreme zoom values in round-trip", () => {
      const extremeCases = [
        { zoom: 0.1, worldX: 1000, worldY: 500 },
        { zoom: 10, worldX: 10, worldY: 20 },
        { zoom: 0.01, worldX: 5000, worldY: 3000 },
      ];

      extremeCases.forEach(({ zoom, worldX, worldY }) => {
        state.view.zoom = zoom;
        state.view.panX = 0;
        state.view.panY = 0;

        const screen = transformer.worldToScreen(worldX, worldY, state);
        const backToWorld = transformer.screenToWorld(
          screen.x,
          screen.y,
          state
        );

        expect(backToWorld.x).toBeCloseTo(worldX, 5);
        expect(backToWorld.y).toBeCloseTo(worldY, 5);
      });
    });
  });

  describe("canvas getBoundingClientRect dependency", () => {
    it("should update when canvas position changes", () => {
      // Change the canvas position
      vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
        left: 200,
        top: 100,
        width: 800,
        height: 600,
        right: 1000,
        bottom: 700,
        x: 200,
        y: 100,
        toJSON: () => ({}),
      } as DOMRect);

      // Screen point (300, 200) -> Canvas point (100, 100) -> World point (100, 100)
      const result = transformer.screenToWorld(300, 200, state);

      expect(result.x).toBe(100); // (300 - 200) / 1
      expect(result.y).toBe(100); // (200 - 100) / 1
    });
  });
});
