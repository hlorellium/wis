import type { State, Tool } from '../state';

export class ToolManager {
    private toolButtons: NodeListOf<HTMLButtonElement>;
    private canvas: HTMLCanvasElement;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.toolButtons = document.querySelectorAll<HTMLButtonElement>('.tool-btn');
    }

    setupToolButtons(state: State) {
        this.toolButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tool = btn.dataset.tool as Tool;
                this.setActiveTool(tool, state);
            });
        });
    }

    setActiveTool(tool: Tool, state?: State) {
        // Update UI
        this.toolButtons.forEach(btn => {
            if (btn.dataset.tool === tool) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Update cursor
        this.updateCursor(tool);

        // Update state if provided
        if (state) {
            state.tool = tool;
        }
    }

    private updateCursor(tool: Tool) {
        this.canvas.style.cursor = tool === 'pan' ? 'grab' : 'crosshair';
    }

    updateCursorForPanning(isPanning: boolean) {
        if (isPanning) {
            this.canvas.style.cursor = 'grabbing';
        } else {
            this.canvas.style.cursor = 'grab';
        }
    }
}
