import type { Shape, RectangleShape, LineShape, CircleShape, BezierCurveShape } from '../state';

export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Get bounding box for any shape
 */
export function getBoundingBox(shape: Shape): BoundingBox {
    switch (shape.type) {
        case 'rectangle':
            return {
                x: shape.x,
                y: shape.y,
                width: shape.width,
                height: shape.height
            };
        
        case 'circle':
            return {
                x: shape.x - shape.radius,
                y: shape.y - shape.radius,
                width: shape.radius * 2,
                height: shape.radius * 2
            };
        
        case 'line':
            const minX = Math.min(shape.x1, shape.x2);
            const maxX = Math.max(shape.x1, shape.x2);
            const minY = Math.min(shape.y1, shape.y2);
            const maxY = Math.max(shape.y1, shape.y2);
            return {
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY
            };
        
        case 'bezier':
            const points = shape.points;
            const xs = points.map(p => p.x);
            const ys = points.map(p => p.y);
            const minBezierX = Math.min(...xs);
            const maxBezierX = Math.max(...xs);
            const minBezierY = Math.min(...ys);
            const maxBezierY = Math.max(...ys);
            return {
                x: minBezierX,
                y: minBezierY,
                width: maxBezierX - minBezierX,
                height: maxBezierY - minBezierY
            };
        
        default:
            return { x: 0, y: 0, width: 0, height: 0 };
    }
}

/**
 * Check if inner rectangle is fully contained within outer rectangle
 */
export function rectContainsRect(inner: BoundingBox, outer: BoundingBox): boolean {
    return inner.x >= outer.x &&
           inner.y >= outer.y &&
           inner.x + inner.width <= outer.x + outer.width &&
           inner.y + inner.height <= outer.y + outer.height;
}

/**
 * Check if two rectangles intersect (any overlap)
 */
export function rectIntersectsRect(a: BoundingBox, b: BoundingBox): boolean {
    return !(a.x + a.width < b.x ||
             b.x + b.width < a.x ||
             a.y + a.height < b.y ||
             b.y + b.height < a.y);
}

/**
 * Check if a line intersects with a rectangle
 */
export function lineIntersectsRect(line: LineShape, rect: BoundingBox, tolerance: number = 5): boolean {
    // First check if either endpoint is inside the rectangle
    if (pointInRect(line.x1, line.y1, rect) || pointInRect(line.x2, line.y2, rect)) {
        return true;
    }

    // Check if line intersects any of the rectangle edges
    return lineIntersectsLineSegment(line.x1, line.y1, line.x2, line.y2, rect.x, rect.y, rect.x + rect.width, rect.y) ||
           lineIntersectsLineSegment(line.x1, line.y1, line.x2, line.y2, rect.x + rect.width, rect.y, rect.x + rect.width, rect.y + rect.height) ||
           lineIntersectsLineSegment(line.x1, line.y1, line.x2, line.y2, rect.x + rect.width, rect.y + rect.height, rect.x, rect.y + rect.height) ||
           lineIntersectsLineSegment(line.x1, line.y1, line.x2, line.y2, rect.x, rect.y + rect.height, rect.x, rect.y);
}

/**
 * Check if a bezier curve intersects with a rectangle (simple bounding box test for now)
 */
export function bezierIntersectsRect(bezier: BezierCurveShape, rect: BoundingBox): boolean {
    const bezierBounds = getBoundingBox(bezier);
    return rectIntersectsRect(bezierBounds, rect);
}

/**
 * Helper: Check if point is inside rectangle
 */
function pointInRect(x: number, y: number, rect: BoundingBox): boolean {
    return x >= rect.x && x <= rect.x + rect.width &&
           y >= rect.y && y <= rect.y + rect.height;
}

/**
 * Helper: Check if two line segments intersect
 */
function lineIntersectsLineSegment(x1: number, y1: number, x2: number, y2: number, 
                                  x3: number, y3: number, x4: number, y4: number): boolean {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-10) return false; // Parallel lines

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}
