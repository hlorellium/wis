import type { State, Shape, Rectangle, Line, Circle } from '../state';

export class Path2DRenderer {
    private pathCache = new Map<string, Path2D>();
    private colorMap = {
        'rectangle': '#f00',
        'line': '#0080ff',
        'circle': '#00ff80'
    };

    render(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, state: State) {
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
        state.scene.shapes.forEach(shape => {
            this.renderShape(ctx, shape);
        });

        // Draw current drawing preview
        if (state.currentDrawing.shape && state.currentDrawing.type) {
            this.renderPreview(ctx, state.currentDrawing.shape, state.currentDrawing.type);
        }

        ctx.restore();
    }

    private renderShape(ctx: CanvasRenderingContext2D, shape: Shape) {
        // Get or create Path2D from cache
        let path = this.pathCache.get(shape.id);
        if (!path) {
            path = this.createPath2D(shape);
            this.pathCache.set(shape.id, path);
        }

        // Set style based on shape type and color
        this.setShapeStyle(ctx, shape);

        // Render the path
        if (shape.type === 'rectangle') {
            ctx.fill(path);
        } else {
            ctx.stroke(path);
        }
    }

    private createPath2D(shape: Shape): Path2D {
        const path = new Path2D();

        switch (shape.type) {
            case 'line':
                const line = shape as Shape & Line;
                path.moveTo(line.x1, line.y1);
                path.lineTo(line.x2, line.y2);
                break;
            case 'rectangle':
                const rect = shape as Shape & Rectangle;
                path.rect(rect.x, rect.y, rect.width, rect.height);
                break;
            case 'circle':
                const circle = shape as Shape & Circle;
                path.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
                break;
        }

        return path;
    }

    private setShapeStyle(ctx: CanvasRenderingContext2D, shape: Shape) {
        const color = shape.color || this.colorMap[shape.type];
        
        if (shape.type === 'rectangle') {
            ctx.fillStyle = color;
        } else {
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
        }
    }

    private renderPreview(ctx: CanvasRenderingContext2D, shape: Rectangle | Line | Circle, type: string) {
        ctx.save();
        ctx.setLineDash([5, 5]);
        ctx.globalAlpha = 0.6;

        const path = new Path2D();

        switch (type) {
            case 'line':
                const line = shape as Line;
                path.moveTo(line.x1, line.y1);
                path.lineTo(line.x2, line.y2);
                ctx.strokeStyle = this.colorMap.line;
                ctx.lineWidth = 2;
                ctx.stroke(path);
                break;
            case 'rectangle':
                const rect = shape as Rectangle;
                path.rect(rect.x, rect.y, rect.width, rect.height);
                ctx.fillStyle = this.colorMap.rectangle;
                ctx.fill(path);
                break;
            case 'circle':
                const circle = shape as Circle;
                path.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
                ctx.strokeStyle = this.colorMap.circle;
                ctx.lineWidth = 2;
                ctx.stroke(path);
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
}
