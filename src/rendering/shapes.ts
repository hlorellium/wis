import type { Shape, LineShape, RectangleShape, CircleShape, State } from '../state';

export class ShapeRenderer {
    private lineWidth = 2;

    renderShape(ctx: CanvasRenderingContext2D, shape: Shape, state?: State) {
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

        // Render selection highlight if this shape is selected
        if (state && state.selection.includes(shape.id)) {
            this.renderSelectionHighlight(ctx, shape);
        }
    }

    renderLine(ctx: CanvasRenderingContext2D, line: LineShape) {
        // Use new style properties or fall back to legacy color
        const strokeColor = line.strokeColor || line.color;
        const strokeWidth = line.strokeWidth || this.lineWidth;
        const strokeStyle = line.strokeStyle || 'solid';

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        
        // Set line dash for dotted style
        if (strokeStyle === 'dotted') {
            ctx.setLineDash([5, 5]);
        } else {
            ctx.setLineDash([]);
        }
        
        ctx.beginPath();
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
        ctx.stroke();
    }

    renderRectangle(ctx: CanvasRenderingContext2D, rect: RectangleShape) {
        // Use new style properties or fall back to legacy behavior
        const fillMode = rect.fillMode || 'fill'; // Legacy rectangles were filled
        const strokeColor = rect.strokeColor || rect.color;
        const fillColor = rect.fillColor || rect.color;
        const strokeWidth = rect.strokeWidth || this.lineWidth;
        const strokeStyle = rect.strokeStyle || 'solid';

        // Set line dash for dotted style
        if (strokeStyle === 'dotted') {
            ctx.setLineDash([5, 5]);
        } else {
            ctx.setLineDash([]);
        }

        // Render based on fill mode
        switch (fillMode) {
            case 'fill':
                ctx.fillStyle = fillColor;
                ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
                break;
            case 'stroke':
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = strokeWidth;
                ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
                break;
            case 'both':
                // Fill first, then stroke
                ctx.fillStyle = fillColor;
                ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = strokeWidth;
                ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
                break;
        }
    }

    renderCircle(ctx: CanvasRenderingContext2D, circle: CircleShape) {
        // Use new style properties or fall back to legacy behavior
        const fillMode = circle.fillMode || 'stroke'; // Legacy circles were stroked
        const strokeColor = circle.strokeColor || circle.color;
        const fillColor = circle.fillColor || circle.color;
        const strokeWidth = circle.strokeWidth || this.lineWidth;
        const strokeStyle = circle.strokeStyle || 'solid';

        // Set line dash for dotted style
        if (strokeStyle === 'dotted') {
            ctx.setLineDash([5, 5]);
        } else {
            ctx.setLineDash([]);
        }

        ctx.beginPath();
        ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);

        // Render based on fill mode
        switch (fillMode) {
            case 'fill':
                ctx.fillStyle = fillColor;
                ctx.fill();
                break;
            case 'stroke':
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = strokeWidth;
                ctx.stroke();
                break;
            case 'both':
                // Fill first, then stroke
                ctx.fillStyle = fillColor;
                ctx.fill();
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = strokeWidth;
                ctx.stroke();
                break;
        }
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

    private renderSelectionHighlight(ctx: CanvasRenderingContext2D, shape: Shape) {
        ctx.save();
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);

        switch (shape.type) {
            case 'rectangle':
                const rect = shape as RectangleShape;
                ctx.strokeRect(rect.x - 2, rect.y - 2, rect.width + 4, rect.height + 4);
                break;
            case 'circle':
                const circle = shape as CircleShape;
                ctx.beginPath();
                ctx.arc(circle.x, circle.y, circle.radius + 3, 0, Math.PI * 2);
                ctx.stroke();
                break;
            case 'line':
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
}
