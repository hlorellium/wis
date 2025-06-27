import type {
  State,
  Shape,
  RectangleShape,
  LineShape,
  CircleShape,
} from "../state";
import { CoordinateTransformer } from "../canvas/coordinates";

export class SelectTool {
  private coordinateTransformer: CoordinateTransformer;

  constructor(canvas: HTMLCanvasElement) {
    this.coordinateTransformer = new CoordinateTransformer(canvas);
  }

  handleMouseDown(e: MouseEvent, state: State): boolean {
    if (e.button === 0 && state.tool === "select") {
      const worldPos = this.coordinateTransformer.screenToWorld(
        e.clientX,
        e.clientY,
        state
      );

      // Check shapes from top to bottom (reverse order)
      const shapes = state.scene.shapes;
      for (let i = shapes.length - 1; i >= 0; i--) {
        if (this.hitTest(shapes[i], worldPos.x, worldPos.y)) {
          state.selection = shapes[i].id;
          console.log("selected", state.selection);
          return true;
        }
      }

      // Click on empty space clears selection
      state.selection = null;
      console.log("selected", state.selection);

      return true;
    }
    return false;
  }

  handleMouseMove(e: MouseEvent, state: State): boolean {
    // No action needed for select tool on mouse move
    return false;
  }

  handleMouseUp(state: State): boolean {
    // No action needed for select tool on mouse up
    return false;
  }

  private hitTest(shape: Shape, x: number, y: number): boolean {
    switch (shape.type) {
      case "rectangle":
        return this.hitTestRectangle(shape as RectangleShape, x, y);
      case "circle":
        return this.hitTestCircle(shape as CircleShape, x, y);
      case "line":
        return this.hitTestLine(shape as LineShape, x, y);
      default:
        return false;
    }
  }

  private hitTestRectangle(
    rect: RectangleShape,
    x: number,
    y: number
  ): boolean {
    return (
      x >= rect.x &&
      x <= rect.x + rect.width &&
      y >= rect.y &&
      y <= rect.y + rect.height
    );
  }

  private hitTestCircle(circle: CircleShape, x: number, y: number): boolean {
    const dx = x - circle.x;
    const dy = y - circle.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= circle.radius;
  }

  private hitTestLine(line: LineShape, x: number, y: number): boolean {
    const tolerance = 5; // 5 pixels tolerance for line selection

    // Distance from point to line segment
    const A = x - line.x1;
    const B = y - line.y1;
    const C = line.x2 - line.x1;
    const D = line.y2 - line.y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq === 0) {
      // Line is actually a point
      const dx = x - line.x1;
      const dy = y - line.y1;
      return Math.sqrt(dx * dx + dy * dy) <= tolerance;
    }

    let param = dot / lenSq;

    let xx, yy;
    if (param < 0) {
      xx = line.x1;
      yy = line.y1;
    } else if (param > 1) {
      xx = line.x2;
      yy = line.y2;
    } else {
      xx = line.x1 + param * C;
      yy = line.y1 + param * D;
    }

    const dx = x - xx;
    const dy = y - yy;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance <= tolerance;
  }
}
