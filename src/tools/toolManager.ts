import type { State, Tool } from '../state';
import { HistoryManager } from '../history';

export class ToolManager {
    private toolButtons: NodeListOf<HTMLButtonElement>;
    private canvas: HTMLCanvasElement;
    private history: HistoryManager;

    constructor(canvas: HTMLCanvasElement, history: HistoryManager) {
        this.canvas = canvas;
        this.history = history;
        this.toolButtons = document.querySelectorAll<HTMLButtonElement>('.tool-btn');
    }

    setupToolButtons(state: State) {
        this.toolButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.dataset.tool) {
                    const tool = btn.dataset.tool as Tool;
                    this.setActiveTool(tool, state);
                } else if (btn.dataset.action) {
                    this.handleAction(btn.dataset.action, state);
                }
            });
        });
    }

    private handleAction(action: string, state: State) {
        switch (action) {
            case 'undo':
                this.history.undo(state);
                break;
            case 'redo':
                this.history.redo(state);
                break;
        }
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
        switch (tool) {
            case 'pan':
                this.canvas.style.cursor = 'grab';
                break;
            case 'select':
                this.canvas.style.cursor = 'default';
                break;
            default:
                this.canvas.style.cursor = 'crosshair';
                break;
        }
    }

    updateCursorForPanning(isPanning: boolean) {
        if (isPanning) {
            this.canvas.style.cursor = 'grabbing';
        } else {
            this.canvas.style.cursor = 'grab';
        }
    }
}
