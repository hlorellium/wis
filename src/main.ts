import { initialState, type State } from './state';
import { createStateProxy } from './stateProxy';
import { CanvasSetup } from './canvas/setup';
import { BackgroundRenderer } from './rendering/background';
import { Path2DRenderer } from './rendering/path2DRenderer';
import { ToolManager } from './tools/toolManager';
import { MouseHandler } from './input/mouse';
import { HistoryManager } from './history';
import './style.css';

class DrawingApp {
    private state: State;
    private canvasSetup: CanvasSetup;
    private bgRenderer: BackgroundRenderer;
    private renderer: Path2DRenderer;
    private toolManager: ToolManager;
    private mouseHandler: MouseHandler;
    private history: HistoryManager;
    private lastRenderedVersion = -1;

    constructor() {
        this.state = createStateProxy(initialState, () => this.render(), {
            raf: true,
            versioning: true,
            shallow: false
        });

        // Get DOM elements
        const bgCanvas = document.querySelector<HTMLCanvasElement>('#bg-canvas')!;
        const canvas = document.querySelector<HTMLCanvasElement>('#canvas')!;
        const canvasContainer = document.querySelector<HTMLDivElement>('#canvas-container')!;

        // Initialize history
        this.history = new HistoryManager();

        // Initialize modules
        this.canvasSetup = new CanvasSetup(bgCanvas, canvas, canvasContainer);
        this.bgRenderer = new BackgroundRenderer();
        this.renderer = new Path2DRenderer();
        this.toolManager = new ToolManager(canvas, this.history);
        this.mouseHandler = new MouseHandler(canvas, this.toolManager, this.history);

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
                } else {
                    // Ctrl+Z or Cmd+Z for undo
                    this.history.undo(this.state);
                }
            }
            // Alternative redo shortcut: Ctrl+Y or Cmd+Y
            else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                this.history.redo(this.state);
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
