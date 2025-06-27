import type { State } from "../state";

export class BackgroundRenderer {
  private gridColor = "#444";
  private gridGap = 50;

  render(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    state: State
  ) {
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Apply view transformations
    ctx.translate(state.view.panX, state.view.panY);
    ctx.scale(state.view.zoom, state.view.zoom);

    // Calculate visible area to optimize grid rendering
    const startX =
      Math.floor(-state.view.panX / state.view.zoom / this.gridGap) *
      this.gridGap;
    const startY =
      Math.floor(-state.view.panY / state.view.zoom / this.gridGap) *
      this.gridGap;
    const endX = startX + width / state.view.zoom + this.gridGap * 2;
    const endY = startY + height / state.view.zoom + this.gridGap * 2;

    ctx.beginPath();
    for (let x = startX; x <= endX; x += this.gridGap) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    for (let y = startY; y <= endY; y += this.gridGap) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
    ctx.strokeStyle = this.gridColor;
    ctx.lineWidth = 1 / state.view.zoom; // Keep line width consistent
    ctx.stroke();
    ctx.restore();
  }
}
