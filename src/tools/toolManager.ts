import type { State, Tool } from '../state';
import { CommandExecutor } from '../commandExecutor';
import { HistoryManager } from '../history';
import { getElements, getOptionalElement } from '../utils/dom';
import { UI_CONFIG } from '../constants';

export class ToolManager {
    private toolButtons: NodeListOf<HTMLButtonElement>;
    private undoButton: HTMLButtonElement | null;
    private redoButton: HTMLButtonElement | null;
    private canvas: HTMLCanvasElement;
    private executor: CommandExecutor;
    private history: HistoryManager;
    private selectTool?: import('./selectTool').SelectTool;
    private editTool?: import('./editTool').EditTool;

    constructor(canvas: HTMLCanvasElement, executor: CommandExecutor, history: HistoryManager) {
        this.canvas = canvas;
        this.executor = executor;
        this.history = history;
        this.toolButtons = getElements<HTMLButtonElement>('.tool-btn');
        this.undoButton = getOptionalElement<HTMLButtonElement>('[data-action="undo"]');
        this.redoButton = getOptionalElement<HTMLButtonElement>('[data-action="redo"]');
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

        // Initial button state update
        this.updateHistoryButtons();
    }

    private handleAction(action: string, state: State) {
        switch (action) {
            case 'undo':
                if (this.history.canUndo()) {
                    this.history.undo(state);
                    this.updateHistoryButtons();
                }
                break;
            case 'redo':
                if (this.history.canRedo()) {
                    this.history.redo(state);
                    this.updateHistoryButtons();
                }
                break;
        }
    }

    // Set tool references so we can clear their states
    setToolReferences(selectTool: import('./selectTool').SelectTool, editTool: import('./editTool').EditTool) {
        this.selectTool = selectTool;
        this.editTool = editTool;
    }

    setActiveTool(tool: Tool, state?: State) {
        // Clear previous tool state if we have state and are switching tools
        if (state && state.tool !== tool) {
            // Clear select tool drag state when switching away from select
            if (state.tool === 'select' && this.selectTool) {
                this.selectTool.cancelDrag();
            }
            // Clear edit tool state when switching away from edit
            if (state.tool === 'edit' && this.editTool) {
                this.editTool.reset(state);
            }
        }

        // Update UI and ARIA attributes
        this.toolButtons.forEach(btn => {
            if (btn.dataset.tool) {
                const isActive = btn.dataset.tool === tool;
                btn.classList.toggle('active', isActive);
                btn.setAttribute('aria-pressed', isActive.toString());
            }
        });

        // Update cursor
        this.updateCursor(tool);

        // Update state if provided
        if (state) {
            state.tool = tool;
        }
    }

    updateHistoryButtons(): void {
        if (this.undoButton) {
            this.undoButton.disabled = !this.history.canUndo();
        }
        if (this.redoButton) {
            this.redoButton.disabled = !this.history.canRedo();
        }
    }

    private updateCursor(tool: Tool) {
        switch (tool) {
            case 'pan':
                this.canvas.style.cursor = UI_CONFIG.PAN_CURSOR;
                break;
            case 'select':
                this.canvas.style.cursor = UI_CONFIG.DEFAULT_CURSOR;
                break;
            default:
                this.canvas.style.cursor = UI_CONFIG.DRAWING_CURSOR;
                break;
        }
    }

    updateCursorForPanning(isPanning: boolean) {
        if (isPanning) {
            this.canvas.style.cursor = UI_CONFIG.PANNING_CURSOR;
        } else {
            this.canvas.style.cursor = UI_CONFIG.PAN_CURSOR;
        }
    }
}
