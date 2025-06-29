import type { State, Tool } from '../state';
import { CommandExecutor } from '../commandExecutor';
import { HistoryManager } from '../history';
import { getElements, getOptionalElement } from '../utils/dom';
import { UI_CONFIG } from '../constants';

export class ToolManager {
    private toolButtons: NodeListOf<HTMLButtonElement>;
    private undoButton: HTMLButtonElement | null;
    private redoButton: HTMLButtonElement | null;
    private colorPicker: HTMLInputElement | null;
    private stylePanel: HTMLElement | null;
    private strokeColorPicker: HTMLInputElement | null;
    private fillColorPicker: HTMLInputElement | null;
    private modeButtons: NodeListOf<HTMLButtonElement>;
    private lineButtons: NodeListOf<HTMLButtonElement>;
    private strokeWidthSelect: HTMLSelectElement | null;
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
        this.colorPicker = getOptionalElement<HTMLInputElement>('#color-picker');
        this.stylePanel = getOptionalElement<HTMLElement>('#style-panel');
        this.strokeColorPicker = getOptionalElement<HTMLInputElement>('#stroke-color');
        this.fillColorPicker = getOptionalElement<HTMLInputElement>('#fill-color');
        this.modeButtons = getElements<HTMLButtonElement>('.style-mode-btn');
        this.lineButtons = getElements<HTMLButtonElement>('.style-line-btn');
        this.strokeWidthSelect = getOptionalElement<HTMLSelectElement>('#stroke-width');
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

        // Setup color picker
        if (this.colorPicker) {
            this.colorPicker.addEventListener('change', (e) => {
                const target = e.target as HTMLInputElement;
                state.currentColor = target.value;
                this.updateColorPickerUI(target.value);
            });
            
            // Initialize color picker with current state
            this.colorPicker.value = state.currentColor;
            this.updateColorPickerUI(state.currentColor);
        }

        // Setup style panel
        this.setupStylePanel(state);

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
                this.selectTool.cancelDrag(state);
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

        // Update style panel visibility
        this.updateStylePanelVisibility(tool);

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

    private updateColorPickerUI(color: string) {
        // Update the color picker label's inner circle to show the selected color
        const label = getOptionalElement<HTMLElement>('.color-picker-label');
        if (label) {
            const circle = label.querySelector('svg circle:last-child');
            if (circle) {
                circle.setAttribute('fill', color);
            }
        }
    }

    private setupStylePanel(state: State) {
        // Setup stroke color picker
        if (this.strokeColorPicker) {
            this.strokeColorPicker.addEventListener('change', (e) => {
                const target = e.target as HTMLInputElement;
                state.strokeColor = target.value;
            });
            this.strokeColorPicker.value = state.strokeColor;
        }

        // Setup fill color picker
        if (this.fillColorPicker) {
            this.fillColorPicker.addEventListener('change', (e) => {
                const target = e.target as HTMLInputElement;
                state.fillColor = target.value;
            });
            this.fillColorPicker.value = state.fillColor;
        }

        // Setup fill mode buttons
        this.modeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.dataset.mode) {
                    state.fillMode = btn.dataset.mode as 'stroke' | 'fill' | 'both';
                    this.updateModeButtons(state.fillMode);
                }
            });
        });

        // Setup line style buttons
        this.lineButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.dataset.style) {
                    state.strokeStyle = btn.dataset.style as 'solid' | 'dotted';
                    this.updateLineButtons(state.strokeStyle);
                }
            });
        });

        // Setup stroke width select
        if (this.strokeWidthSelect) {
            this.strokeWidthSelect.addEventListener('change', (e) => {
                const target = e.target as HTMLSelectElement;
                state.strokeWidth = parseInt(target.value);
            });
            this.strokeWidthSelect.value = state.strokeWidth.toString();
        }

        // Initialize UI state
        this.updateModeButtons(state.fillMode);
        this.updateLineButtons(state.strokeStyle);
    }

    private updateModeButtons(mode: 'stroke' | 'fill' | 'both') {
        this.modeButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
    }

    private updateLineButtons(style: 'solid' | 'dotted') {
        this.lineButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.style === style);
        });
    }

    private updateStylePanelVisibility(tool: Tool) {
        if (!this.stylePanel) return;

        // Show style panel for drawing tools, hide for others
        const showPanel = ['rectangle', 'circle', 'line', 'curve'].includes(tool);
        this.stylePanel.style.display = showPanel ? 'flex' : 'none';

        // For line and curve tools, hide fill-related controls
        if (showPanel) {
            const fillSection = this.stylePanel.querySelector('.style-section:nth-child(2)') as HTMLElement;
            const fillModeButton = this.stylePanel.querySelector('[data-mode="fill"]') as HTMLElement;
            const bothModeButton = this.stylePanel.querySelector('[data-mode="both"]') as HTMLElement;
            
            if (tool === 'line' || tool === 'curve') {
                // Hide fill color picker and fill/both mode buttons for line/curve tools
                if (fillSection) fillSection.style.display = 'none';
                if (fillModeButton) fillModeButton.style.display = 'none';
                if (bothModeButton) bothModeButton.style.display = 'none';
            } else {
                // Show all controls for rectangle/circle tools
                if (fillSection) fillSection.style.display = 'flex';
                if (fillModeButton) fillModeButton.style.display = 'flex';
                if (bothModeButton) bothModeButton.style.display = 'flex';
            }
        }
    }
}
