import { initialState, type State, migrateState } from './state';
import { createStateProxy } from './stateProxy';
import { CanvasSetup } from './canvas/setup';
import { BackgroundRenderer } from './rendering/background';
import { Path2DRenderer } from './rendering/path2DRenderer';
import { ToolManager } from './tools/toolManager';
import { MouseHandler } from './input/mouse';
import { HistoryManager, UndoCommand, RedoCommand } from './history';
import { CommandExecutor } from './commandExecutor';
import { SyncManager } from './sync/syncManager';
import { PersistenceManager } from './persistence/persistenceManager';
import { RenderingEventHandler } from './rendering/renderingEventHandler';
import { PropertyInspector } from './ui/propertyInspector';
import { LayerOperations } from './commands/layerCommands';
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
    private propertyInspector!: PropertyInspector;
    private lastRenderedVersion = -1;

    // Getter for debugging
    get debugState() {
        return this.state;
    }

    constructor() {
        this.persistence = new PersistenceManager();
        this.initializeAsync();
    }

    private async initializeAsync() {
        // Check if persistence is available and log status
        if (!this.persistence.available) {
            logger.warn('IndexedDB is not available - app will work without persistence', 'DrawingApp');
            this.showPersistenceWarning();
        }

        // Try to load persisted state
        const persistedState = await this.persistence.loadState();
        const stateToUse = persistedState ? migrateState(persistedState) : initialState;
        
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
        this.syncManager = new SyncManager(this.executor, this.state, this.history);

        // Setup history to listen to command executor
        // Record ALL commands (local and remote) for global history
        this.executor.subscribe((command, source) => {
            logger.info(`Main.ts listener received command: ${command.constructor.name} (${command.id}) from ${source}`, 'Main');
            // For regular commands that have been executed, use record()
            // For undo/redo commands, they handle themselves
            if (!(command instanceof UndoCommand) && !(command instanceof RedoCommand)) {
                this.history.record(command, source);
                logger.info(`Command recorded in history`, 'Main');
            } else {
                logger.info(`Skipping undo/redo command recording`, 'Main');
            }
            logger.info(`About to update history buttons`, 'Main');
            // Update UI buttons immediately after recording commands
            this.toolManager.updateHistoryButtons();
            logger.info(`History buttons updated`, 'Main');
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

        // Initialize property inspector
        this.propertyInspector = new PropertyInspector(this.executor);

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

        // Initialize property inspector with state
        this.propertyInspector.initialize(this.state);

        // Setup selection change monitoring
        this.setupSelectionMonitoring();

        // Subscribe to state change events for UI updates (history buttons only)
        // Note: StateProxy handles all rendering automatically
        eventBus.subscribe('stateChanged', () => {
            this.toolManager.updateHistoryButtons();
        });

        // Initial render
        this.render();
        
        // Update history buttons after initialization (important for persistence scenarios)
        this.toolManager.updateHistoryButtons();
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
            // Layer shortcuts
            else if ((e.ctrlKey || e.metaKey) && e.key === ']') {
                e.preventDefault();
                this.handleLayerShortcut(e.shiftKey ? 'bring-to-front' : 'bring-forward');
            }
            else if ((e.ctrlKey || e.metaKey) && e.key === '[') {
                e.preventDefault();
                this.handleLayerShortcut(e.shiftKey ? 'send-to-back' : 'send-backward');
            }
        });
    }

    private setupSelectionMonitoring() {
        let previousSelection = [...this.state.selection];

        // Monitor selection changes using state proxy's change callback
        const originalRender = this.render.bind(this);
        this.render = (force: boolean = false) => {
            // Check if selection has changed
            const currentSelection = this.state.selection;
            if (JSON.stringify(currentSelection) !== JSON.stringify(previousSelection)) {
                this.propertyInspector.updateSelection(currentSelection);
                previousSelection = [...currentSelection];
            }
            
            return originalRender(force);
        };
    }

    private showPersistenceWarning() {
        // Show a non-intrusive console warning and optionally a UI notification
        console.warn(
            '%c⚠️ Drawing App - Persistence Unavailable',
            'color: orange; font-weight: bold; font-size: 14px;',
            '\nYour work will not be saved between sessions because IndexedDB is not available.',
            '\nThis can happen in private browsing mode or if storage is disabled.',
            '\nThe app will work normally otherwise.'
        );

        // Optionally show a temporary toast notification
        this.showToast('⚠️ Work will not be saved - storage unavailable', 'warning');
    }

    private showToast(message: string, type: 'info' | 'warning' | 'error' = 'info') {
        // Create a simple toast notification
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'warning' ? '#ff9800' : type === 'error' ? '#f44336' : '#2196f3'};
            color: white;
            padding: 12px 16px;
            border-radius: 4px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 14px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 10000;
            max-width: 400px;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Animate in
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        });
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 5000);
    }

    private handleLayerShortcut(action: 'bring-to-front' | 'bring-forward' | 'send-backward' | 'send-to-back') {
        if (this.state.selection.length === 0) return;

        let command = null;

        switch (action) {
            case 'bring-to-front':
                command = LayerOperations.bringToFront(this.state, this.state.selection);
                break;
            case 'bring-forward':
                command = LayerOperations.bringForward(this.state, this.state.selection);
                break;
            case 'send-backward':
                command = LayerOperations.sendBackward(this.state, this.state.selection);
                break;
            case 'send-to-back':
                command = LayerOperations.sendToBack(this.state, this.state.selection);
                break;
        }

        if (command) {
            this.executor.execute(command, this.state, 'local');
        }
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
const app = new DrawingApp();

// Expose app for debugging in tests
if (typeof window !== 'undefined') {
    (window as any).app = app;
}
