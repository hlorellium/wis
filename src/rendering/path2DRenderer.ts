import type { State, Shape, LineShape, RectangleShape, CircleShape, BezierCurveShape } from '../state';
import type { SelectTool } from '../tools/selectTool';
import type { EditTool } from '../tools/editTool';

export class Path2DRenderer {
    private pathCache = new Map<string, Path2D>();
    private colorMap = {
        'rectangle': '#f00',
        'line': '#0080ff',
        'circle': '#00ff80',
        'bezier': '#ff00ff'
    };

    render(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, state: State, selectTool?: SelectTool, editTool?: EditTool) {
        const dpr = window.devicePixelRatio || 1;
        const width = canvas.width / dpr;
        const height = canvas.height / dpr;

        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, width, height);

        // Apply view transformations
        ctx.translate(state.view.panX, state.view.panY);
        ctx.scale(state.view.zoom, state.view.zoom);

        // Render all shapes sorted by zIndex (lowest to highest)
        const sortedShapes = [...state.scene.shapes].sort((a, b) => a.zIndex - b.zIndex);
        sortedShapes.forEach(shape => {
            this.renderShape(ctx, shape, state);
        });

        // Draw current drawing preview
        if (state.currentDrawing.shape && state.currentDrawing.type) {
            this.renderPreview(ctx, state.currentDrawing.shape, state.currentDrawing.type);
        }

        // Draw selection rectangle preview (for drag selection)
        this.renderSelectionRectPreview(ctx, state, selectTool);

        // Draw handles when in edit mode
        if (state.tool === 'edit' && editTool && state.selection.length > 0) {
            this.renderHandles(ctx, state, editTool);
        }

        ctx.restore();
    }

    private renderShape(ctx: CanvasRenderingContext2D, shape: Shape, state: State) {
        // Get or create Path2D from cache
        let path = this.pathCache.get(shape.id);
        if (!path) {
            path = this.createPath2D(shape);
            this.pathCache.set(shape.id, path);
        }

        // Set style based on shape type and color
        this.setShapeStyle(ctx, shape);

        // Render based on fill mode (use new logic or fall back to legacy)
        const fillMode = shape.fillMode || (shape.type === 'rectangle' ? 'fill' : 'stroke');
        
        switch (fillMode) {
            case 'fill':
                ctx.fill(path);
                break;
            case 'stroke':
                ctx.stroke(path);
                break;
            case 'both':
                // Fill first, then stroke
                ctx.fill(path);
                ctx.stroke(path);
                break;
        }

        // Render selection highlight if this shape is selected
        if (Array.isArray(state.selection) && state.selection.includes(shape.id)) {
            this.renderSelectionHighlight(ctx, shape);
        }
    }

    private createPath2D(shape: Shape): Path2D {
        const path = new Path2D();

        switch (shape.type) {
            case 'line':
                path.moveTo(shape.x1, shape.y1);
                path.lineTo(shape.x2, shape.y2);
                break;
            case 'rectangle':
                path.rect(shape.x, shape.y, shape.width, shape.height);
                break;
            case 'circle':
                path.arc(shape.x, shape.y, shape.radius, 0, Math.PI * 2);
                break;
            case 'bezier':
                const [p0, cp1, cp2, p1] = shape.points;
                path.moveTo(p0.x, p0.y);
                path.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p1.x, p1.y);
                break;
        }

        return path;
    }

    private setShapeStyle(ctx: CanvasRenderingContext2D, shape: Shape) {
        // Use new style properties or fall back to legacy behavior
        const fillMode = shape.fillMode || (shape.type === 'rectangle' ? 'fill' : 'stroke');
        const strokeColor = shape.strokeColor || shape.color || this.colorMap[shape.type];
        const fillColor = shape.fillColor || shape.color || this.colorMap[shape.type];
        const strokeWidth = shape.strokeWidth || 2;
        const strokeStyle = shape.strokeStyle || 'solid';

        // Set line dash for dotted style
        if (strokeStyle === 'dotted') {
            ctx.setLineDash([5, 5]);
        } else {
            ctx.setLineDash([]);
        }

        // Set colors and line width
        ctx.strokeStyle = strokeColor;
        ctx.fillStyle = fillColor;
        ctx.lineWidth = strokeWidth;
    }

    private renderPreview(ctx: CanvasRenderingContext2D, shape: Shape, type: string) {
        ctx.save();
        ctx.setLineDash([5, 5]);
        ctx.globalAlpha = 0.6;

        // Set style using the same logic as regular rendering
        this.setShapeStyle(ctx, shape);

        const path = this.createPath2D(shape);
        
        // Render based on fill mode (use new logic or fall back to legacy)
        const fillMode = shape.fillMode || (shape.type === 'rectangle' ? 'fill' : 'stroke');
        
        switch (fillMode) {
            case 'fill':
                ctx.fill(path);
                break;
            case 'stroke':
                ctx.stroke(path);
                break;
            case 'both':
                // Fill first, then stroke
                ctx.fill(path);
                ctx.stroke(path);
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
            case 'bezier':
                const bezier = shape as BezierCurveShape;
                const [p0, cp1, cp2, p1] = bezier.points;
                
                // Draw thick outline of the curve
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(p0.x, p0.y);
                ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p1.x, p1.y);
                ctx.stroke();
                
                // Draw dotted helper lines showing control points
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(p0.x, p0.y);
                ctx.lineTo(cp1.x, cp1.y);
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(cp2.x, cp2.y);
                ctx.stroke();
                break;
        }

        ctx.restore();
    }

    private renderSelectionRectPreview(ctx: CanvasRenderingContext2D, state: State, selectTool?: SelectTool) {
        // Only render selection preview when the select tool is active and dragging
        if (state.tool !== 'select' || !state.ui.selectionDrag.isActive) {
            return;
        }

        const { start, current } = state.ui.selectionDrag;
        if (!start || !current) {
            return;
        }
        
        // Calculate rectangle bounds
        const x = Math.min(start.x, current.x);
        const y = Math.min(start.y, current.y);
        const width = Math.abs(current.x - start.x);
        const height = Math.abs(current.y - start.y);

        // Don't render if rectangle is too small
        if (width < 2 || height < 2) {
            return;
        }

        // Determine selection type based on drag direction
        const isWindow = start.x < current.x; // Left-to-right = window selection
        const isCrossing = start.x > current.x; // Right-to-left = crossing selection

        ctx.save();

        if (isWindow) {
            // Window selection: solid border, light blue fill
            ctx.strokeStyle = '#0066cc';
            ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(0, 102, 204, 0.1)';
            ctx.lineWidth = 1;
        } else if (isCrossing) {
            // Crossing selection: dashed border, light green fill
            ctx.strokeStyle = '#00cc66';
            ctx.setLineDash([5, 5]);
            ctx.fillStyle = 'rgba(0, 204, 102, 0.1)';
            ctx.lineWidth = 1;
        }

        // Draw filled rectangle
        ctx.fillRect(x, y, width, height);
        
        // Draw border
        ctx.strokeRect(x, y, width, height);

        ctx.restore();
    }

    private renderHandles(ctx: CanvasRenderingContext2D, state: State, editTool: EditTool) {
        const handles = editTool.getHandles(state);
        
        ctx.save();
        
        // Set handle style
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#0066cc';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        
        const handleSize = 6; // 6px handles
        
        handles.forEach(handle => {
            // Draw handle as a filled square with border
            ctx.fillRect(handle.x - handleSize/2, handle.y - handleSize/2, handleSize, handleSize);
            ctx.strokeRect(handle.x - handleSize/2, handle.y - handleSize/2, handleSize, handleSize);
        });
        
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
