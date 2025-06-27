import { initialState, type State } from './state';
import { createStateProxy } from './stateProxy';
import { CanvasSetup } from './canvas/setup';
import { BackgroundRenderer } from './rendering/background';
import { Path2DRenderer } from './rendering/path2DRenderer';
import { ToolManager } from './tools/toolManager';
import { MouseHandler } from './input/mouse';
import './style.css';

class DrawingApp {
    private state: State;
    private canvasSetup: CanvasSetup;
    private bgRenderer: BackgroundRenderer;
    private renderer: Path2DRenderer;
    private toolManager: ToolManager;
    private mouseHandler: MouseHandler;

    constructor() {
        this.state = createStateProxy(initialState, () => this.render(), {
            raf: true,
            versioning: true
        });

        // Get DOM elements
        const bgCanvas = document.querySelector<HTMLCanvasElement>('#bg-canvas')!;
        const canvas = document.querySelector<HTMLCanvasElement>('#canvas')!;
        const canvasContainer = document.querySelector<HTMLDivElement>('#canvas-container')!;

        // Initialize modules
        this.canvasSetup = new CanvasSetup(bgCanvas, canvas, canvasContainer);
        this.bgRenderer = new BackgroundRenderer();
        this.renderer = new Path2DRenderer();
        this.toolManager = new ToolManager(canvas);
        this.mouseHandler = new MouseHandler(canvas, this.toolManager);

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

        // Initial render
        this.render();
    }

    private render() {
        const bgCtx = this.canvasSetup.getBgCanvasContext();
        const ctx = this.canvasSetup.getCanvasContext();
        const bgCanvas = this.canvasSetup.getBgCanvas();
        const canvas = this.canvasSetup.getCanvas();

        // Log version for demonstration (remove in production)
        console.log('Rendering with state version:', (this.state as any).__v);

        this.bgRenderer.render(bgCtx, bgCanvas, this.state);
        this.renderer.render(ctx, canvas, this.state);
    }
}

// Initialize the application
new DrawingApp();
