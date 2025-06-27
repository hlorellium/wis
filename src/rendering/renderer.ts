import type { State } from '../state';
import { ShapeRenderer } from './shapes';

export class Renderer {
    private shapeRenderer: ShapeRenderer;

    constructor() {
        this.shapeRenderer = new ShapeRenderer();
    }

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

        // Draw all shapes
        state.scene.lines.forEach(line => {
            this.shapeRenderer.renderLine(ctx, line);
        });

        state.scene.rectangles.forEach(rect => {
            this.shapeRenderer.renderRectangle(ctx, rect);
        });

        state.scene.circles.forEach(circle => {
            this.shapeRenderer.renderCircle(ctx, circle);
        });

        // Draw current drawing preview
        if (state.currentDrawing.shape && state.currentDrawing.type) {
            this.shapeRenderer.renderPreview(
                ctx,
                state.currentDrawing.shape,
                state.currentDrawing.type
            );
        }

        ctx.restore();
    }
}
