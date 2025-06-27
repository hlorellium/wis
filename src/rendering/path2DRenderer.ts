import type {
  State,
  Shape,
  LineShape,
  RectangleShape,
  CircleShape,
} from "../state";

export class Path2DRenderer {
  private pathCache = new Map<string, Path2D>();
  private colorMap = {
    rectangle: "#f00",
    line: "#0080ff",
    circle: "#00ff80",
  };

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

    // Render all shapes using Path2D
    state.scene.shapes.forEach((shape) => {
      this.renderShape(ctx, shape, state);
    });

    // Draw current drawing preview
    if (state.currentDrawing.shape && state.currentDrawing.type) {
      this.renderPreview(
        ctx,
        state.currentDrawing.shape,
        state.currentDrawing.type
      );
    }

    ctx.restore();
  }

  private renderShape(
    ctx: CanvasRenderingContext2D,
    shape: Shape,
    state: State
  ) {
    // Get or create Path2D from cache
    let path = this.pathCache.get(shape.id);
    if (!path) {
      path = this.createPath2D(shape);
      this.pathCache.set(shape.id, path);
    }

    // Set style based on shape type and color
    this.setShapeStyle(ctx, shape);

    // Render the path
    if (shape.type === "rectangle") {
      ctx.fill(path);
    } else {
      ctx.stroke(path);
    }

    // Render selection highlight if this shape is selected
    if (state.selection === shape.id) {
      this.renderSelectionHighlight(ctx, shape);
    }
  }

  private createPath2D(shape: Shape): Path2D {
    const path = new Path2D();

    switch (shape.type) {
      case "line":
        path.moveTo(shape.x1, shape.y1);
        path.lineTo(shape.x2, shape.y2);
        break;
      case "rectangle":
        path.rect(shape.x, shape.y, shape.width, shape.height);
        break;
      case "circle":
        path.arc(shape.x, shape.y, shape.radius, 0, Math.PI * 2);
        break;
    }

    return path;
  }

  private setShapeStyle(ctx: CanvasRenderingContext2D, shape: Shape) {
    const color = shape.color || this.colorMap[shape.type];

    if (shape.type === "rectangle") {
      ctx.fillStyle = color;
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
    }
  }

  private renderPreview(
    ctx: CanvasRenderingContext2D,
    shape: Shape,
    type: string
  ) {
    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.globalAlpha = 0.6;

    const path = new Path2D();

    switch (type) {
      case "line":
        const lineShape = shape as LineShape;
        path.moveTo(lineShape.x1, lineShape.y1);
        path.lineTo(lineShape.x2, lineShape.y2);
        ctx.strokeStyle = lineShape.color;
        ctx.lineWidth = 2;
        ctx.stroke(path);
        break;
      case "rectangle":
        const rectShape = shape as RectangleShape;
        path.rect(rectShape.x, rectShape.y, rectShape.width, rectShape.height);
        ctx.fillStyle = rectShape.color;
        ctx.fill(path);
        break;
      case "circle":
        const circleShape = shape as CircleShape;
        path.arc(
          circleShape.x,
          circleShape.y,
          circleShape.radius,
          0,
          Math.PI * 2
        );
        ctx.strokeStyle = circleShape.color;
        ctx.lineWidth = 2;
        ctx.stroke(path);
        break;
    }

    ctx.restore();
  }

  private renderSelectionHighlight(
    ctx: CanvasRenderingContext2D,
    shape: Shape
  ) {
    ctx.save();
    ctx.strokeStyle = "#ffaa00";
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);

    switch (shape.type) {
      case "rectangle":
        const rect = shape as RectangleShape;
        ctx.strokeRect(rect.x - 2, rect.y - 2, rect.width + 4, rect.height + 4);
        break;
      case "circle":
        const circle = shape as CircleShape;
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, circle.radius + 3, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case "line":
        const line = shape as LineShape;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
        ctx.stroke();
        break;
    }

    ctx.restore();
  }

  // Clear cache when shapes are deleted or modified
  clearCache(shapeId?: string) {
    if (shapeId) {
      this.pathCache.delete(shapeId);
    } else {
      this.pathCache.clear();
    }
  }

  // Public method to check if a shape is cached (for testing)
  isCached(shapeId: string): boolean {
    return this.pathCache.has(shapeId);
  }

  // Public method to get cache size (for testing)
  getCacheSize(): number {
    return this.pathCache.size;
  }
}
