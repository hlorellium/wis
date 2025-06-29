/**
 * Canvas polyfill for testing environments
 * Provides minimal mocks for HTMLCanvasElement and Path2D APIs
 */

// Mock Path2D class
class MockPath2D implements Path2D {
  private operations: string[] = [];

  constructor(path?: Path2D | string) {
    if (typeof path === 'string') {
      this.operations.push(`path:${path}`);
    } else if (path instanceof MockPath2D) {
      this.operations = [...path.operations];
    }
  }

  addPath(path: Path2D, transform?: DOMMatrix2DInit): void {
    this.operations.push(`addPath:${transform ? JSON.stringify(transform) : 'identity'}`);
  }

  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, anticlockwise?: boolean): void {
    this.operations.push(`arc:${x},${y},${radius},${startAngle},${endAngle},${anticlockwise}`);
  }

  arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void {
    this.operations.push(`arcTo:${x1},${y1},${x2},${y2},${radius}`);
  }

  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void {
    this.operations.push(`bezierCurveTo:${cp1x},${cp1y},${cp2x},${cp2y},${x},${y}`);
  }

  closePath(): void {
    this.operations.push('closePath');
  }

  ellipse(x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number, anticlockwise?: boolean): void {
    this.operations.push(`ellipse:${x},${y},${radiusX},${radiusY},${rotation},${startAngle},${endAngle},${anticlockwise}`);
  }

  lineTo(x: number, y: number): void {
    this.operations.push(`lineTo:${x},${y}`);
  }

  moveTo(x: number, y: number): void {
    this.operations.push(`moveTo:${x},${y}`);
  }

  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    this.operations.push(`quadraticCurveTo:${cpx},${cpy},${x},${y}`);
  }

  rect(x: number, y: number, w: number, h: number): void {
    this.operations.push(`rect:${x},${y},${w},${h}`);
  }

  roundRect(x: number, y: number, w: number, h: number, radii?: number | DOMPointInit | Iterable<number | DOMPointInit>): void {
    this.operations.push(`roundRect:${x},${y},${w},${h},${JSON.stringify(radii)}`);
  }

  // Test utility to inspect operations
  getOperations(): string[] {
    return [...this.operations];
  }
}

// Mock CanvasRenderingContext2D
class MockCanvasRenderingContext2D implements Partial<CanvasRenderingContext2D> {
  canvas = document.createElement('canvas');
  fillStyle: string | CanvasGradient | CanvasPattern = '#000000';
  strokeStyle: string | CanvasGradient | CanvasPattern = '#000000';
  lineWidth: number = 1;
  font: string = '10px sans-serif';
  textAlign: CanvasTextAlign = 'start';
  textBaseline: CanvasTextBaseline = 'alphabetic';

  private operations: string[] = [];

  // Path methods
  beginPath(): void {
    this.operations.push('beginPath');
  }

  closePath(): void {
    this.operations.push('closePath');
  }

  moveTo(x: number, y: number): void {
    this.operations.push(`moveTo:${x},${y}`);
  }

  lineTo(x: number, y: number): void {
    this.operations.push(`lineTo:${x},${y}`);
  }

  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, anticlockwise?: boolean): void {
    this.operations.push(`arc:${x},${y},${radius},${startAngle},${endAngle},${anticlockwise}`);
  }

  rect(x: number, y: number, w: number, h: number): void {
    this.operations.push(`rect:${x},${y},${w},${h}`);
  }

  // Drawing methods
  fill(fillRule?: CanvasFillRule): void;
  fill(path: Path2D, fillRule?: CanvasFillRule): void;
  fill(pathOrFillRule?: Path2D | CanvasFillRule, fillRule?: CanvasFillRule): void {
    this.operations.push(`fill:${pathOrFillRule},${fillRule}`);
  }

  stroke(): void;
  stroke(path: Path2D): void;
  stroke(path?: Path2D): void {
    this.operations.push(`stroke:${path}`);
  }

  clearRect(x: number, y: number, w: number, h: number): void {
    this.operations.push(`clearRect:${x},${y},${w},${h}`);
  }

  fillRect(x: number, y: number, w: number, h: number): void {
    this.operations.push(`fillRect:${x},${y},${w},${h}`);
  }

  strokeRect(x: number, y: number, w: number, h: number): void {
    this.operations.push(`strokeRect:${x},${y},${w},${h}`);
  }

  // Transform methods
  save(): void {
    this.operations.push('save');
  }

  restore(): void {
    this.operations.push('restore');
  }

  scale(x: number, y: number): void {
    this.operations.push(`scale:${x},${y}`);
  }

  translate(x: number, y: number): void {
    this.operations.push(`translate:${x},${y}`);
  }

  transform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.operations.push(`transform:${a},${b},${c},${d},${e},${f}`);
  }

  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  setTransform(transform?: DOMMatrix2DInit): void;
  setTransform(aOrTransform?: number | DOMMatrix2DInit, b?: number, c?: number, d?: number, e?: number, f?: number): void {
    if (typeof aOrTransform === 'number') {
      this.operations.push(`setTransform:${aOrTransform},${b},${c},${d},${e},${f}`);
    } else {
      this.operations.push(`setTransform:${JSON.stringify(aOrTransform)}`);
    }
  }

  // Test utility
  getOperations(): string[] {
    return [...this.operations];
  }

  clearOperations(): void {
    this.operations = [];
  }
}

// Install polyfills
if (typeof globalThis !== 'undefined') {
  if (!globalThis.Path2D) {
    globalThis.Path2D = MockPath2D as any;
  }

  // Mock HTMLCanvasElement.getContext
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(contextId: string, ...args: any[]): any {
    if (contextId === '2d') {
      return new MockCanvasRenderingContext2D();
    }
    return originalGetContext?.call(this, contextId, ...args) || null;
  };
}

export { MockPath2D, MockCanvasRenderingContext2D };
