import type { State } from "../state";

export class CoordinateTransformer {
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  screenToWorld(screenX: number, screenY: number, state: State) {
    const rect = this.canvas.getBoundingClientRect();
    const x = screenX - rect.left;
    const y = screenY - rect.top;

    return {
      x: (x - state.view.panX) / state.view.zoom,
      y: (y - state.view.panY) / state.view.zoom,
    };
  }

  worldToScreen(worldX: number, worldY: number, state: State) {
    const rect = this.canvas.getBoundingClientRect();

    return {
      x: worldX * state.view.zoom + state.view.panX + rect.left,
      y: worldY * state.view.zoom + state.view.panY + rect.top,
    };
  }
}
