import type { State } from '../state';
import { PanTool } from '../tools/panTool';
import { DrawingTools } from '../tools/drawingTools';
import { SelectTool } from '../tools/selectTool';
import { EditTool } from '../tools/editTool';
import { ToolManager } from '../tools/toolManager';
import { CommandExecutor } from '../commandExecutor';
import { DeleteShapeCommand } from '../commands';
import { getBoundingBox } from '../utils/geometry';
import { SelectionManager } from '../utils/selectionManager';
import type { Path2DRenderer } from '../rendering/path2DRenderer';

export class MouseHandler {
    private panTool: PanTool;
    private drawingTools: DrawingTools;
    private selectTool: SelectTool;
    private editTool: EditTool;
    private toolManager: ToolManager;
    private executor: CommandExecutor;
    private forceRenderCallback?: () => void;

    constructor(
        canvas: HTMLCanvasElement,
        toolManager: ToolManager,
        executor: CommandExecutor,
        renderer: Path2DRenderer
    ) {
        const onHistoryChange = () => toolManager.updateHistoryButtons();
        this.panTool = new PanTool(executor, onHistoryChange);
        this.drawingTools = new DrawingTools(canvas, executor, onHistoryChange);
        this.selectTool = new SelectTool(canvas);
        this.editTool = new EditTool(canvas, executor, renderer, onHistoryChange);
        this.toolManager = toolManager;
        this.executor = executor;
    }

    // Set callback to force re-renders during drag operations
    setForceRenderCallback(callback: () => void) {
        this.forceRenderCallback = callback;
    }

    setupEventListeners(canvas: HTMLCanvasElement, state: State) {
        canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e, state));
        canvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e, state));
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e, state));
        window.addEventListener('mouseup', () => this.handleMouseUp(state));
        canvas.addEventListener('wheel', (e) => this.handleWheel(e, state));
        window.addEventListener('keydown', (e) => this.handleKeyDown(e, state));
    }

    private handleMouseDown(e: MouseEvent, state: State) {
        const { detail } = e;

        // Double-click mousedown: enter edit mode and start editing immediately
        if (detail === 2 && state.tool === 'select' && state.selection.length > 0) {
            // Check if click is inside any selected shape
            const canvas = e.currentTarget as HTMLCanvasElement;
            const rect = canvas.getBoundingClientRect();
            const wx = (e.clientX - rect.left - state.view.panX) / state.view.zoom;
            const wy = (e.clientY - rect.top - state.view.panY) / state.view.zoom;
            const hit = state.scene.shapes
                .filter(s => state.selection.includes(s.id))
                .some(s => {
                    const b = getBoundingBox(s);
                    return wx >= b.x && wx <= b.x + b.width && wy >= b.y && wy <= b.y + b.height;
                });
            if (hit) {
                this.toolManager.setActiveTool('edit', state);
                // Clear any active selection drag state when entering edit mode
                this.selectTool.cancelDrag();
                // fall through to edit handler
            }
        }

        // Edit-mode drag handling
        if (state.tool === 'edit') {
            const editHandled = this.editTool.handleMouseDown(e, state);
            if (editHandled) {
                return;
            }
            // If edit tool didn't handle the click, allow selection changes in edit mode
            this.selectTool.handleMouseDown(e, state);
            
            // If we're in edit mode and selection is now empty (cleared by SelectTool),
            // automatically switch back to select mode to enable drag-select
            if (!SelectionManager.hasSelection(state) && !this.selectTool.getDragState()) {
                this.toolManager.setActiveTool('select', state);
            }
            return;
        }

        // Selection / pan / draw
        this.selectTool.handleMouseDown(e, state);
        const panHandled = this.panTool.handleMouseDown(e, state);
        this.drawingTools.handleMouseDown(e, state);
        if (panHandled) {
            this.toolManager.updateCursorForPanning(true);
        }
    }

    private handleDoubleClick(e: MouseEvent, state: State) {
        // Double-click on a selected shape to enter edit mode
        if (state.tool === 'select' && state.selection.length > 0) {
            // Check if double-click is on a selected shape
            const canvas = e.target as HTMLCanvasElement;
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Transform to world coordinates
            const worldX = (x - state.view.panX) / state.view.zoom;
            const worldY = (y - state.view.panY) / state.view.zoom;
            
            // Check if click is on any selected shape
            const selectedShapes = state.scene.shapes.filter(s => state.selection.includes(s.id));
            for (const shape of selectedShapes) {
                if (this.isPointInsideShape(shape, worldX, worldY)) {
                    // Switch to edit mode
                    this.toolManager.setActiveTool('edit', state);
                    // Clear any active selection drag state when entering edit mode
                    this.selectTool.cancelDrag();
                    console.log('Entered edit mode for shape:', shape.id);
                    return;
                }
            }
        }
    }

    private handleMouseMove(e: MouseEvent, state: State) {
        let shouldForceRender = false;
        
        // Handle edit tool first when in edit mode
        if (state.tool === 'edit') {
            const editHandled = this.editTool.handleMouseMove(e, state);
            if (editHandled) {
                shouldForceRender = true;
            }
        }
        
        const selectToolHandled = this.selectTool.handleMouseMove(e, state);
        this.panTool.handleMouseMove(e, state);
        this.drawingTools.handleMouseMove(e, state);
        
        // Force re-render if SelectTool or EditTool is dragging
        if ((selectToolHandled || shouldForceRender) && this.forceRenderCallback) {
            this.forceRenderCallback();
        }
    }

    private handleMouseUp(state: State) {
        // Handle edit tool first when in edit mode
        if (state.tool === 'edit') {
            this.editTool.handleMouseUp(state);
        }
        
        this.selectTool.handleMouseUp(state);
        const panHandled = this.panTool.handleMouseUp(state);
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

    private handleKeyDown(e: KeyboardEvent, state: State) {
        // Handle delete/backspace for selected shapes
        if ((e.key === 'Delete' || e.key === 'Backspace') && SelectionManager.hasSelection(state)) {
            // Prevent default browser behavior (like going back in history for Backspace)
            e.preventDefault();
            
            // Create and execute delete command
            const deleteCommand = new DeleteShapeCommand([...state.selection]);
            this.executor.execute(deleteCommand, state);
            
            console.log('Deleted shapes:', state.selection);
        }
    }

    // Getter for SelectTool to access drag state
    getSelectTool(): SelectTool {
        return this.selectTool;
    }

    // Getter for EditTool to access from main renderer
    getEditTool(): EditTool {
        return this.editTool;
    }

    private isPointInsideShape(shape: any, x: number, y: number): boolean {
        const bounds = getBoundingBox(shape);
        return x >= bounds.x && 
               x <= bounds.x + bounds.width && 
               y >= bounds.y && 
               y <= bounds.y + bounds.height;
    }
}
