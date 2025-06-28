import { initialState, type State } from './state';
import { createStateProxy } from './stateProxy';
import { CanvasSetup } from './canvas/setup';
import { BackgroundRenderer } from './rendering/background';
import { Path2DRenderer } from './rendering/path2DRenderer';
import { ToolManager } from './tools/toolManager';
import { MouseHandler } from './input/mouse';
import { HistoryManager } from './history';
import { CommandExecutor } from './commandExecutor';
import { SyncManager } from './sync/syncManager';
import { getRequiredElement } from './utils/dom';
// Import CommandRegistry to ensure command factories are registered
import './sync/commandRegistry';
import './style.css';

class DrawingApp {
    private state: State;
    private canvasSetup: CanvasSetup;
    private bgRenderer: BackgroundRenderer;
    private renderer: Path2DRenderer;
    private toolManager: ToolManager;
    private mouseHandler: MouseHandler;
    private history: HistoryManager;
    private executor: CommandExecutor;
    private syncManager: SyncManager;
    private lastRenderedVersion = -1;

    constructor() {
        this.state = createStateProxy(initialState, () => this.render(), {
            raf: true,
            versioning: true,
            shallow: false
        });

        // Get DOM elements
        const bgCanvas = getRequiredElement<HTMLCanvasElement>('#bg-canvas');
        const canvas = getRequiredElement<HTMLCanvasElement>('#canvas');
        const canvasContainer = getRequiredElement<HTMLDivElement>('#canvas-container');

        // Initialize command system
        this.executor = new CommandExecutor();
        this.history = new HistoryManager();
        this.syncManager = new SyncManager(this.executor, this.state);

        // Setup history to listen to command executor
        // Only record local commands to prevent cross-tab undo interference
        this.executor.subscribe((command, source) => {
            if (source === 'local') {
                this.history.record(command);
            }
        });

        // Initialize modules
        this.canvasSetup = new CanvasSetup(bgCanvas, canvas, canvasContainer);
        this.bgRenderer = new BackgroundRenderer();
        this.renderer = new Path2DRenderer();
        this.toolManager = new ToolManager(canvas, this.executor, this.history);
        this.mouseHandler = new MouseHandler(canvas, this.toolManager, this.executor);

        this.initialize();
    }

    private initialize() {
        // Setup canvas resizing
        this.canvasSetup.setupResizeObserver(() => this.render());
        this.canvasSetup.resizeCanvases();

        // Setup tool management
        this.toolManager.setupToolButtons(this.state);
        this.toolManager.setActiveTool('pan', this.state);

        // Setup input handling
        this.mouseHandler.setupEventListeners(this.canvasSetup.getCanvas(), this.state);

        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();

        // Initial render
        this.render();
    }

    private setupKeyboardShortcuts() {
        window.addEventListener('keydown', (e) => {
            // Check for Ctrl+Z (Windows/Linux) or Cmd+Z (Mac)
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    // Ctrl+Shift+Z or Cmd+Shift+Z for redo
                    this.history.redo(this.state);
                    this.toolManager.updateHistoryButtons();
                } else {
                    // Ctrl+Z or Cmd+Z for undo
                    this.history.undo(this.state);
                    this.toolManager.updateHistoryButtons();
                }
            }
            // Alternative redo shortcut: Ctrl+Y or Cmd+Y
            else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                this.history.redo(this.state);
                this.toolManager.updateHistoryButtons();
            }
        });
    }

    private render() {
        const currentVersion = (this.state as any).__v;
        
        // Skip render if version hasn't changed
        if (currentVersion === this.lastRenderedVersion) {
            return;
        }
        
        this.lastRenderedVersion = currentVersion;

        const bgCtx = this.canvasSetup.getBgCanvasContext();
        const ctx = this.canvasSetup.getCanvasContext();
        const bgCanvas = this.canvasSetup.getBgCanvas();
        const canvas = this.canvasSetup.getCanvas();

        this.bgRenderer.render(bgCtx, bgCanvas, this.state);
        this.renderer.render(ctx, canvas, this.state);
    }
}

// Initialize the application
new DrawingApp();
