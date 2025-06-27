import type { Rectangle, Line, Circle } from '../state';

export class ShapeRenderer {
    private lineColor = '#0080ff';
    private rectangleColor = '#f00';
    private circleColor = '#00ff80';
    private lineWidth = 2;

    renderLine(ctx: CanvasRenderingContext2D, line: Line) {
        ctx.strokeStyle = this.lineColor;
        ctx.lineWidth = this.lineWidth;
        ctx.beginPath();
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
        ctx.stroke();
    }

    renderRectangle(ctx: CanvasRenderingContext2D, rect: Rectangle) {
        ctx.fillStyle = this.rectangleColor;
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    }

    renderCircle(ctx: CanvasRenderingContext2D, circle: Circle) {
        ctx.strokeStyle = this.circleColor;
        ctx.fillStyle = 'transparent';
        ctx.lineWidth = this.lineWidth;
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
        ctx.stroke();
    }

    renderPreview(ctx: CanvasRenderingContext2D, shape: Rectangle | Line | Circle, type: string) {
        ctx.save();
        ctx.setLineDash([5, 5]);
        ctx.globalAlpha = 0.6;

        switch (type) {
            case 'line':
                this.renderLine(ctx, shape as Line);
                break;
            case 'rectangle':
                this.renderRectangle(ctx, shape as Rectangle);
                break;
            case 'circle':
                this.renderCircle(ctx, shape as Circle);
                break;
        }
        
        ctx.restore();
    }
}
