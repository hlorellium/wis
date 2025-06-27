import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CanvasSetup } from "../src/canvas/setup";

// Mock ResizeObserver
class MockResizeObserver {
  private callback: (entries: any[]) => void;

  constructor(callback: (entries: any[]) => void) {
    this.callback = callback;
  }

  observe(target: Element) {
    // Simulate immediate resize observation
    setTimeout(() => {
      this.callback([
        {
          target,
          contentRect: { width: 800, height: 600 },
        },
      ]);
    }, 0);
  }

  disconnect() {
    // No-op for testing
  }
}

describe("CanvasSetup", () => {
  let bgCanvas: HTMLCanvasElement;
  let canvas: HTMLCanvasElement;
  let container: HTMLDivElement;
  let canvasSetup: CanvasSetup;
  let originalResizeObserver: typeof ResizeObserver;
  let originalDevicePixelRatio: number;

  beforeEach(() => {
    // Create mock DOM elements
    bgCanvas = document.createElement("canvas");
    canvas = document.createElement("canvas");
    container = document.createElement("div");

    // Set initial container size
    Object.defineProperty(container, "clientWidth", {
      value: 800,
      configurable: true,
    });
    Object.defineProperty(container, "clientHeight", {
      value: 600,
      configurable: true,
    });

    // Mock ResizeObserver
    originalResizeObserver = globalThis.ResizeObserver;
    globalThis.ResizeObserver = MockResizeObserver as any;

    // Mock devicePixelRatio
    originalDevicePixelRatio = window.devicePixelRatio;
    Object.defineProperty(window, "devicePixelRatio", {
      writable: true,
      value: 1,
    });

    canvasSetup = new CanvasSetup(bgCanvas, canvas, container);
  });

  afterEach(() => {
    globalThis.ResizeObserver = originalResizeObserver;
    Object.defineProperty(window, "devicePixelRatio", {
      writable: true,
      value: originalDevicePixelRatio,
    });
  });

  describe("constructor", () => {
    it("should initialize with provided canvases and container", () => {
      expect(canvasSetup.getCanvas()).toBe(canvas);
      expect(canvasSetup.getBgCanvas()).toBe(bgCanvas);
    });
  });

  describe("resizeCanvases", () => {
    it("should resize canvases to container size times DPR", () => {
      canvasSetup.resizeCanvases();

      expect(bgCanvas.width).toBe(800); // 800 * 1
      expect(bgCanvas.height).toBe(600); // 600 * 1
      expect(canvas.width).toBe(800);
      expect(canvas.height).toBe(600);
    });

    it("should handle high DPR correctly", () => {
      Object.defineProperty(window, "devicePixelRatio", {
        writable: true,
        value: 2,
      });

      canvasSetup.resizeCanvases();

      expect(bgCanvas.width).toBe(1600); // 800 * 2
      expect(bgCanvas.height).toBe(1200); // 600 * 2
      expect(canvas.width).toBe(1600);
      expect(canvas.height).toBe(1200);
    });

    it("should handle fractional DPR correctly", () => {
      Object.defineProperty(window, "devicePixelRatio", {
        writable: true,
        value: 1.5,
      });

      canvasSetup.resizeCanvases();

      expect(bgCanvas.width).toBe(1200); // Math.round(800 * 1.5)
      expect(bgCanvas.height).toBe(900); // Math.round(600 * 1.5)
      expect(canvas.width).toBe(1200);
      expect(canvas.height).toBe(900);
    });

    it("should only resize when dimensions actually change", () => {
      // Set initial size
      bgCanvas.width = 800;
      bgCanvas.height = 600;
      canvas.width = 800;
      canvas.height = 600;

      // Spy on width/height setters to detect changes
      const bgWidthSetter = vi.spyOn(bgCanvas, "width", "set");
      const canvasWidthSetter = vi.spyOn(canvas, "width", "set");

      canvasSetup.resizeCanvases();

      // Should not set width/height since they're already correct
      expect(bgWidthSetter).not.toHaveBeenCalled();
      expect(canvasWidthSetter).not.toHaveBeenCalled();
    });

    it("should handle different container sizes", () => {
      Object.defineProperty(container, "clientWidth", {
        value: 1200,
        configurable: true,
      });
      Object.defineProperty(container, "clientHeight", {
        value: 800,
        configurable: true,
      });

      canvasSetup.resizeCanvases();

      expect(bgCanvas.width).toBe(1200);
      expect(bgCanvas.height).toBe(800);
      expect(canvas.width).toBe(1200);
      expect(canvas.height).toBe(800);
    });
  });

  describe("setupResizeObserver", () => {
    it("should setup ResizeObserver and call callback on resize", async () => {
      const onResize = vi.fn();

      canvasSetup.setupResizeObserver(onResize);

      // Wait for the mocked ResizeObserver to trigger
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(onResize).toHaveBeenCalledTimes(1);
    });

    it("should resize canvases when observer triggers", async () => {
      const onResize = vi.fn();

      // Set different initial canvas sizes
      bgCanvas.width = 100;
      bgCanvas.height = 100;
      canvas.width = 100;
      canvas.height = 100;

      canvasSetup.setupResizeObserver(onResize);

      // Wait for the mocked ResizeObserver to trigger
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Canvases should be resized to container size
      expect(bgCanvas.width).toBe(800);
      expect(bgCanvas.height).toBe(600);
      expect(canvas.width).toBe(800);
      expect(canvas.height).toBe(600);
    });
  });

  describe("context getters", () => {
    it("should call getContext on canvas elements", () => {
      const canvasGetContextSpy = vi.spyOn(canvas, "getContext");
      const bgCanvasGetContextSpy = vi.spyOn(bgCanvas, "getContext");

      canvasSetup.getCanvasContext();
      canvasSetup.getBgCanvasContext();

      expect(canvasGetContextSpy).toHaveBeenCalledWith("2d");
      expect(bgCanvasGetContextSpy).toHaveBeenCalledWith("2d");
    });
  });

  describe("canvas getters", () => {
    it("should return the main canvas element", () => {
      expect(canvasSetup.getCanvas()).toBe(canvas);
    });

    it("should return the background canvas element", () => {
      expect(canvasSetup.getBgCanvas()).toBe(bgCanvas);
    });
  });

  describe("edge cases", () => {
    it("should handle missing devicePixelRatio", () => {
      Object.defineProperty(window, "devicePixelRatio", {
        writable: true,
        value: undefined,
      });

      canvasSetup.resizeCanvases();

      // Should default to 1
      expect(bgCanvas.width).toBe(800);
      expect(bgCanvas.height).toBe(600);
    });

    it("should handle zero container size", () => {
      Object.defineProperty(container, "clientWidth", {
        value: 0,
        configurable: true,
      });
      Object.defineProperty(container, "clientHeight", {
        value: 0,
        configurable: true,
      });

      canvasSetup.resizeCanvases();

      expect(bgCanvas.width).toBe(0);
      expect(bgCanvas.height).toBe(0);
      expect(canvas.width).toBe(0);
      expect(canvas.height).toBe(0);
    });
  });
});
