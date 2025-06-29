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
import { PersistenceManager } from './persistence/persistenceManager';
import { RenderingEventHandler } from './rendering/renderingEventHandler';
import { getRequiredElement } from './utils/dom';
import { logger } from './utils/logger';
import { eventBus } from './utils/eventBus';
// Import CommandRegistry to ensure command factories are registered
import './sync/commandRegistry';
import './style.css';

class DrawingApp {
    private state!: State;
    private canvasSetup!: CanvasSetup;
    private bgRenderer!: BackgroundRenderer;
    private renderer!: Path2DRenderer;
    private toolManager!: ToolManager;
    private mouseHandler!: MouseHandler;
    private history!: HistoryManager;
    private executor!: CommandExecutor;
    private syncManager!: SyncManager;
    private persistence: PersistenceManager;
    private renderingEventHandler!: RenderingEventHandler;
    private lastRenderedVersion = -1;

    constructor() {
        this.persistence = new PersistenceManager();
        this.initializeAsync();
    }

    private async initializeAsync() {
        // Try to load persisted state
        const persistedState = await this.persistence.loadState();
        const stateToUse = persistedState || initialState;
        
        logger.info(persistedState ? 'Restored state from IndexedDB' : 'Using initial state', 'DrawingApp');

        this.state = createStateProxy(stateToUse, () => this.render(), {
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
        // Record ALL commands (local and remote) for global history
        this.executor.subscribe((command, source) => {
            this.history.record(command, source);
        });

        // Connect history manager to executor for undo/redo handling
        this.executor.setHistoryManager(this.history);

        // Setup history to broadcast undo/redo operations
        this.history.setUndoRedoCallback((undoRedoCommand) => {
            this.executor.execute(undoRedoCommand, this.state, 'local');
        });

        // Initialize modules
        this.canvasSetup = new CanvasSetup(bgCanvas, canvas, canvasContainer);
        this.bgRenderer = new BackgroundRenderer();
        this.renderer = new Path2DRenderer();
        
        // Initialize EventBus-based rendering handler
        this.renderingEventHandler = new RenderingEventHandler(this.renderer);
        this.renderingEventHandler.start();
        
        this.toolManager = new ToolManager(canvas, this.executor, this.history);
        this.mouseHandler = new MouseHandler(canvas, this.toolManager, this.executor, this.renderer);

        this.initialize();
    }

    private initialize() {
        // Setup canvas resizing - trigger state change to cause re-render
        this.canvasSetup.setupResizeObserver(() => {
            // Trigger a state change to force re-render via StateProxy
            this.state.view = { ...this.state.view };
        });
        this.canvasSetup.resizeCanvases();

        // Setup tool management
        this.toolManager.setupToolButtons(this.state);
        this.toolManager.setActiveTool('pan', this.state);

        // Set tool references so ToolManager can clear their states
        this.toolManager.setToolReferences(
            this.mouseHandler.getSelectTool(),
            this.mouseHandler.getEditTool()
        );

        // Setup input handling
        this.mouseHandler.setupEventListeners(this.canvasSetup.getCanvas(), this.state);
        
        // MouseHandler will update state.ui.selectionDrag for preview rendering
        // No direct render callback needed - StateProxy handles all rendering

        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();

        // Setup persistence
        this.setupPersistence();

        // Subscribe to state change events for UI updates (history buttons only)
        // Note: StateProxy handles all rendering automatically
        eventBus.subscribe('stateChanged', () => {
            this.toolManager.updateHistoryButtons();
        });

        // Initial render
        this.render();
    }

    private setupPersistence() {
        // Periodic saving every 30 seconds
        setInterval(() => {
            this.persistence.saveState(this.state);
        }, 30000);

        // Save on tab close/refresh
        window.addEventListener('beforeunload', () => {
            this.persistence.saveStateSync(this.state);
        });

        // Save on visibility change (when tab becomes hidden)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.persistence.saveState(this.state);
            }
        });
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

    private render(force: boolean = false) {
        const currentVersion = (this.state as any).__v;
        
        // Skip render if version hasn't changed (unless forced)
        if (!force && currentVersion === this.lastRenderedVersion) {
            return;
        }
        
        if (!force) {
            this.lastRenderedVersion = currentVersion;
        }

        const bgCtx = this.canvasSetup.getBgCanvasContext();
        const ctx = this.canvasSetup.getCanvasContext();
        const bgCanvas = this.canvasSetup.getBgCanvas();
        const canvas = this.canvasSetup.getCanvas();

        this.bgRenderer.render(bgCtx, bgCanvas, this.state);
        this.renderer.render(ctx, canvas, this.state, this.mouseHandler?.getSelectTool(), this.mouseHandler?.getEditTool());
    }
}

// Initialize the application
new DrawingApp();
