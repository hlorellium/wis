import type { Shape, LineShape, RectangleShape, CircleShape } from '../state';

export class ShapeRenderer {
    private lineWidth = 2;

    renderShape(ctx: CanvasRenderingContext2D, shape: Shape) {
        switch (shape.type) {
            case 'line':
                this.renderLine(ctx, shape);
                break;
            case 'rectangle':
                this.renderRectangle(ctx, shape);
                break;
            case 'circle':
                this.renderCircle(ctx, shape);
                break;
        }
    }

    renderLine(ctx: CanvasRenderingContext2D, line: LineShape) {
        ctx.strokeStyle = line.color;
        ctx.lineWidth = this.lineWidth;
        ctx.beginPath();
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
        ctx.stroke();
    }

    renderRectangle(ctx: CanvasRenderingContext2D, rect: RectangleShape) {
        ctx.fillStyle = rect.color;
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    }

    renderCircle(ctx: CanvasRenderingContext2D, circle: CircleShape) {
        ctx.strokeStyle = circle.color;
        ctx.fillStyle = 'transparent';
        ctx.lineWidth = this.lineWidth;
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
        ctx.stroke();
    }

    renderPreview(ctx: CanvasRenderingContext2D, shape: Shape, type: string) {
        ctx.save();
        ctx.setLineDash([5, 5]);
        ctx.globalAlpha = 0.6;

        switch (type) {
            case 'line':
                this.renderLine(ctx, shape as LineShape);
                break;
            case 'rectangle':
                this.renderRectangle(ctx, shape as RectangleShape);
                break;
            case 'circle':
                this.renderCircle(ctx, shape as CircleShape);
                break;
        }
        
        ctx.restore();
    }
}
