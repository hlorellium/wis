import type { State } from '../state';
import { PanTool } from '../tools/panTool';
import { DrawingTools } from '../tools/drawingTools';
import { SelectTool } from '../tools/selectTool';
import { ToolManager } from '../tools/toolManager';

export class MouseHandler {
    private panTool: PanTool;
    private drawingTools: DrawingTools;
    private selectTool: SelectTool;
    private toolManager: ToolManager;

    constructor(
        canvas: HTMLCanvasElement,
        toolManager: ToolManager
    ) {
        this.panTool = new PanTool();
        this.drawingTools = new DrawingTools(canvas);
        this.selectTool = new SelectTool(canvas);
        this.toolManager = toolManager;
    }

    setupEventListeners(canvas: HTMLCanvasElement, state: State) {
        canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e, state));
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e, state));
        window.addEventListener('mouseup', () => this.handleMouseUp(state));
        canvas.addEventListener('wheel', (e) => this.handleWheel(e, state));
    }

    private handleMouseDown(e: MouseEvent, state: State) {
        // Handle select tool first to allow selection before other tools
        this.selectTool.handleMouseDown(e, state);
        
        const panHandled = this.panTool.handleMouseDown(e, state);
        this.drawingTools.handleMouseDown(e, state);
        
        if (panHandled) {
            this.toolManager.updateCursorForPanning(true);
        }
    }

    private handleMouseMove(e: MouseEvent, state: State) {
        this.panTool.handleMouseMove(e, state);
        this.drawingTools.handleMouseMove(e, state);
    }

    private handleMouseUp(state: State) {
        const panHandled = this.panTool.handleMouseUp();
        this.drawingTools.handleMouseUp(state);
        
        if (panHandled) {
            this.toolManager.updateCursorForPanning(false);
        }
    }

    private handleWheel(e: WheelEvent, state: State) {
        e.preventDefault();
        
        const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = state.view.zoom * scaleFactor;
        
        // Limit zoom range
        if (newZoom >= 0.1 && newZoom <= 10) {
            // Get mouse position relative to canvas
            const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Adjust pan to zoom towards mouse position
            state.view.panX = x - (x - state.view.panX) * scaleFactor;
            state.view.panY = y - (y - state.view.panY) * scaleFactor;
            state.view.zoom = newZoom;
        }
    }
}
