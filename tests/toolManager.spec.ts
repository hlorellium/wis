import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ToolManager } from '../src/tools/toolManager';
import { HistoryManager } from '../src/history';
import { CommandExecutor } from '../src/commandExecutor';
import { SelectionManager } from '../src/utils/selectionManager';
import { createTestState } from './helpers';
import type { State, Tool } from '../src/state';

// Helper function to create a toolbar DOM structure
function createToolbarHTML(): HTMLElement {
  const toolbar = document.createElement('div');
  toolbar.innerHTML = `
    <button class="tool-btn" data-tool="pan" aria-pressed="false">Pan</button>
    <button class="tool-btn" data-tool="select" aria-pressed="false">Select</button>
    <button class="tool-btn" data-tool="rectangle" aria-pressed="false">Rectangle</button>
    <button class="tool-btn" data-tool="circle" aria-pressed="false">Circle</button>
    <button class="tool-btn" data-tool="line" aria-pressed="false">Line</button>
    <button class="tool-btn" data-action="undo">Undo</button>
    <button class="tool-btn" data-action="redo">Redo</button>
  `;
  return toolbar;
}

describe('ToolManager', () => {
  let toolManager: ToolManager;
  let historyManager: HistoryManager;
  let commandExecutor: CommandExecutor;
  let canvas: HTMLCanvasElement;
  let state: State;
  let toolbar: HTMLElement;

  beforeEach(() => {
    // Create DOM elements
    canvas = document.createElement('canvas');
    toolbar = createToolbarHTML();
    document.body.appendChild(toolbar);

    // Create mocked history manager
    historyManager = new HistoryManager();
    vi.spyOn(historyManager, 'canUndo');
    vi.spyOn(historyManager, 'canRedo');
    vi.spyOn(historyManager, 'undo');
    vi.spyOn(historyManager, 'redo');

    // Create command executor
    commandExecutor = new CommandExecutor();

    // Create tool manager
    toolManager = new ToolManager(canvas, commandExecutor, historyManager);
    state = createTestState();
  });

  afterEach(() => {
    document.body.removeChild(toolbar);
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with canvas, executor, and history manager', () => {
      expect(toolManager).toBeDefined();
    });

    it('should find tool buttons in the DOM', () => {
      const toolButtons = document.querySelectorAll('.tool-btn');
      expect(toolButtons.length).toBe(7); // 5 tools + 2 action buttons
    });
  });

  describe('setupToolButtons', () => {
    it('should setup click event listeners for tool buttons', () => {
      toolManager.setupToolButtons(state);

      const panButton = document.querySelector('[data-tool="pan"]') as HTMLButtonElement;
      const clickEvent = new MouseEvent('click', { bubbles: true });
      
      panButton.dispatchEvent(clickEvent);

      expect(state.tool).toBe('pan');
      expect(panButton.getAttribute('aria-pressed')).toBe('true');
      expect(panButton.classList.contains('active')).toBe(true);
    });

    it('should setup click event listeners for action buttons', () => {
      vi.mocked(historyManager.canUndo).mockReturnValue(true);
      
      toolManager.setupToolButtons(state);

      const undoButton = document.querySelector('[data-action="undo"]') as HTMLButtonElement;
      const clickEvent = new MouseEvent('click', { bubbles: true });
      
      undoButton.dispatchEvent(clickEvent);

      expect(historyManager.undo).toHaveBeenCalledWith(state);
    });

    it('should update history buttons on initial setup', () => {
      vi.mocked(historyManager.canUndo).mockReturnValue(false);
      vi.mocked(historyManager.canRedo).mockReturnValue(false);

      toolManager.setupToolButtons(state);

      const undoButton = document.querySelector('[data-action="undo"]') as HTMLButtonElement;
      const redoButton = document.querySelector('[data-action="redo"]') as HTMLButtonElement;

      expect(undoButton.disabled).toBe(true);
      expect(redoButton.disabled).toBe(true);
    });
  });

  describe('setActiveTool', () => {
    beforeEach(() => {
      toolManager.setupToolButtons(state);
    });

    it('should set the correct tool as active', () => {
      toolManager.setActiveTool('rectangle', state);

      expect(state.tool).toBe('rectangle');

      const rectangleButton = document.querySelector('[data-tool="rectangle"]') as HTMLButtonElement;
      expect(rectangleButton.getAttribute('aria-pressed')).toBe('true');
      expect(rectangleButton.classList.contains('active')).toBe(true);
    });

    it('should deactivate previously active tool', () => {
      toolManager.setActiveTool('pan', state);
      toolManager.setActiveTool('rectangle', state);

      const panButton = document.querySelector('[data-tool="pan"]') as HTMLButtonElement;
      const rectangleButton = document.querySelector('[data-tool="rectangle"]') as HTMLButtonElement;

      expect(panButton.getAttribute('aria-pressed')).toBe('false');
      expect(panButton.classList.contains('active')).toBe(false);
      expect(rectangleButton.getAttribute('aria-pressed')).toBe('true');
      expect(rectangleButton.classList.contains('active')).toBe(true);
    });

    it('should update canvas cursor based on tool type', () => {
      const testCases: Array<{ tool: Tool; expectedCursor: string }> = [
        { tool: 'pan', expectedCursor: 'grab' },
        { tool: 'select', expectedCursor: 'default' },
        { tool: 'rectangle', expectedCursor: 'crosshair' },
        { tool: 'circle', expectedCursor: 'crosshair' },
        { tool: 'line', expectedCursor: 'crosshair' },
      ];

      testCases.forEach(({ tool, expectedCursor }) => {
        toolManager.setActiveTool(tool, state);
        expect(canvas.style.cursor).toBe(expectedCursor);
      });
    });

    it('should work without state parameter', () => {
      toolManager.setActiveTool('circle');

      const circleButton = document.querySelector('[data-tool="circle"]') as HTMLButtonElement;
      expect(circleButton.getAttribute('aria-pressed')).toBe('true');
      expect(canvas.style.cursor).toBe('crosshair');
      // State should remain unchanged
      expect(state.tool).toBe('pan'); // default from createTestState
    });
  });

  describe('updateHistoryButtons', () => {
    beforeEach(() => {
      toolManager.setupToolButtons(state);
    });

    it('should enable undo button when history has undo actions', () => {
      vi.mocked(historyManager.canUndo).mockReturnValue(true);
      vi.mocked(historyManager.canRedo).mockReturnValue(false);

      toolManager.updateHistoryButtons();

      const undoButton = document.querySelector('[data-action="undo"]') as HTMLButtonElement;
      const redoButton = document.querySelector('[data-action="redo"]') as HTMLButtonElement;

      expect(undoButton.disabled).toBe(false);
      expect(redoButton.disabled).toBe(true);
    });

    it('should enable redo button when history has redo actions', () => {
      vi.mocked(historyManager.canUndo).mockReturnValue(false);
      vi.mocked(historyManager.canRedo).mockReturnValue(true);

      toolManager.updateHistoryButtons();

      const undoButton = document.querySelector('[data-action="undo"]') as HTMLButtonElement;
      const redoButton = document.querySelector('[data-action="redo"]') as HTMLButtonElement;

      expect(undoButton.disabled).toBe(true);
      expect(redoButton.disabled).toBe(false);
    });

    it('should enable both buttons when both actions are available', () => {
      vi.mocked(historyManager.canUndo).mockReturnValue(true);
      vi.mocked(historyManager.canRedo).mockReturnValue(true);

      toolManager.updateHistoryButtons();

      const undoButton = document.querySelector('[data-action="undo"]') as HTMLButtonElement;
      const redoButton = document.querySelector('[data-action="redo"]') as HTMLButtonElement;

      expect(undoButton.disabled).toBe(false);
      expect(redoButton.disabled).toBe(false);
    });

    it('should handle missing undo/redo buttons gracefully', () => {
      // Remove action buttons
      const undoButton = document.querySelector('[data-action="undo"]');
      const redoButton = document.querySelector('[data-action="redo"]');
      undoButton?.remove();
      redoButton?.remove();

      // Create new tool manager
      const newToolManager = new ToolManager(canvas, commandExecutor, historyManager);
      
      // Should not throw error
      expect(() => newToolManager.updateHistoryButtons()).not.toThrow();
    });
  });

  describe('history actions', () => {
    beforeEach(() => {
      // Reset mocks before each test
      vi.clearAllMocks();
    });

    it('should perform undo when undo button is clicked and undo is available', () => {
      vi.mocked(historyManager.canUndo).mockReturnValue(true);
      
      toolManager.setupToolButtons(state);

      const undoButton = document.querySelector('[data-action="undo"]') as HTMLButtonElement;
      const clickEvent = new MouseEvent('click', { bubbles: true });
      undoButton.dispatchEvent(clickEvent);

      expect(historyManager.undo).toHaveBeenCalledWith(state);
    });

    it('should not perform undo when undo is not available', () => {
      vi.mocked(historyManager.canUndo).mockReturnValue(false);
      
      toolManager.setupToolButtons(state);

      const undoButton = document.querySelector('[data-action="undo"]') as HTMLButtonElement;
      const clickEvent = new MouseEvent('click', { bubbles: true });
      undoButton.dispatchEvent(clickEvent);

      expect(historyManager.undo).not.toHaveBeenCalled();
    });

    it('should perform redo when redo button is clicked and redo is available', () => {
      vi.mocked(historyManager.canRedo).mockReturnValue(true);
      
      toolManager.setupToolButtons(state);

      const redoButton = document.querySelector('[data-action="redo"]') as HTMLButtonElement;
      const clickEvent = new MouseEvent('click', { bubbles: true });
      redoButton.dispatchEvent(clickEvent);

      expect(historyManager.redo).toHaveBeenCalledWith(state);
    });

    it('should not perform redo when redo is not available', () => {
      vi.mocked(historyManager.canRedo).mockReturnValue(false);
      
      toolManager.setupToolButtons(state);

      const redoButton = document.querySelector('[data-action="redo"]') as HTMLButtonElement;
      const clickEvent = new MouseEvent('click', { bubbles: true });
      redoButton.dispatchEvent(clickEvent);

      expect(historyManager.redo).not.toHaveBeenCalled();
    });

    it('should update history buttons after performing actions', () => {
      vi.mocked(historyManager.canUndo).mockReturnValue(true);
      const updateSpy = vi.spyOn(toolManager, 'updateHistoryButtons');
      
      toolManager.setupToolButtons(state);

      const undoButton = document.querySelector('[data-action="undo"]') as HTMLButtonElement;
      const clickEvent = new MouseEvent('click', { bubbles: true });
      undoButton.dispatchEvent(clickEvent);

      expect(updateSpy).toHaveBeenCalled();
    });
  });

  describe('updateCursorForPanning', () => {
    it('should change cursor to grabbing when panning', () => {
      toolManager.setActiveTool('pan', state);
      expect(canvas.style.cursor).toBe('grab');

      toolManager.updateCursorForPanning(true);
      expect(canvas.style.cursor).toBe('grabbing');
    });

    it('should change cursor back to grab when not panning', () => {
      toolManager.setActiveTool('pan', state);
      toolManager.updateCursorForPanning(true);
      expect(canvas.style.cursor).toBe('grabbing');

      toolManager.updateCursorForPanning(false);
      expect(canvas.style.cursor).toBe('grab');
    });
  });

  describe('selection clearing on tool change', () => {
    beforeEach(() => {
      toolManager.setupToolButtons(state);
    });

    it('should clear selection when switching from select tool to drawing tools', () => {
      // Set up initial state with selection
      state.tool = 'select';
      SelectionManager.setSelection(state, ['shape1', 'shape2']);
      expect(state.selection).toEqual(['shape1', 'shape2']);

      // Switch to rectangle tool
      toolManager.setActiveTool('rectangle', state);

      // Selection should be cleared
      expect(state.selection).toEqual([]);
      expect(state.tool).toBe('rectangle');
    });

    it('should clear selection when switching from edit tool to drawing tools', () => {
      // Set up initial state with selection and edit mode
      state.tool = 'edit';
      SelectionManager.setSelection(state, ['shape1']);
      expect(state.selection).toEqual(['shape1']);

      // Switch to circle tool
      toolManager.setActiveTool('circle', state);

      // Selection should be cleared and tool should switch to select first (via SelectionManager.clear)
      expect(state.selection).toEqual([]);
      expect(state.tool).toBe('circle');
    });

    it('should clear selection when switching from select tool to pan tool', () => {
      // Set up initial state with selection
      state.tool = 'select';
      SelectionManager.setSelection(state, ['shape1', 'shape2', 'shape3']);
      expect(state.selection).toEqual(['shape1', 'shape2', 'shape3']);

      // Switch to pan tool
      toolManager.setActiveTool('pan', state);

      // Selection should be cleared
      expect(state.selection).toEqual([]);
      expect(state.tool).toBe('pan');
    });

    it('should NOT clear selection when switching between select and edit tools', () => {
      // Set up initial state with selection
      state.tool = 'select';
      SelectionManager.setSelection(state, ['shape1']);
      expect(state.selection).toEqual(['shape1']);

      // Switch to edit tool
      toolManager.setActiveTool('edit', state);

      // Selection should be preserved
      expect(state.selection).toEqual(['shape1']);
      expect(state.tool).toBe('edit');

      // Switch back to select tool
      toolManager.setActiveTool('select', state);

      // Selection should still be preserved
      expect(state.selection).toEqual(['shape1']);
      expect(state.tool).toBe('select');
    });

    it('should NOT clear selection when switching between drawing tools', () => {
      // Set up initial state with rectangle tool and no selection
      state.tool = 'rectangle';
      SelectionManager.setSelection(state, []); // No selection initially
      expect(state.selection).toEqual([]);

      // Switch to circle tool
      toolManager.setActiveTool('circle', state);

      // No selection to clear, should just change tool
      expect(state.selection).toEqual([]);
      expect(state.tool).toBe('circle');
    });

    it('should NOT clear selection when tool does not change', () => {
      // Set up initial state with selection
      state.tool = 'select';
      SelectionManager.setSelection(state, ['shape1', 'shape2']);
      expect(state.selection).toEqual(['shape1', 'shape2']);

      // "Switch" to same tool
      toolManager.setActiveTool('select', state);

      // Selection should be preserved
      expect(state.selection).toEqual(['shape1', 'shape2']);
      expect(state.tool).toBe('select');
    });

    it('should handle missing state parameter gracefully', () => {
      // This should not throw an error even without state
      expect(() => toolManager.setActiveTool('rectangle')).not.toThrow();
    });

    it('should clear selection for all drawing tools when switching from select', () => {
      const drawingTools: Tool[] = ['rectangle', 'circle', 'line', 'curve'];
      
      drawingTools.forEach(tool => {
        // Reset state for each test
        state.tool = 'select';
        SelectionManager.setSelection(state, ['shape1', 'shape2']);
        expect(state.selection).toEqual(['shape1', 'shape2']);

        // Switch to drawing tool
        toolManager.setActiveTool(tool, state);

        // Selection should be cleared
        expect(state.selection).toEqual([]);
        expect(state.tool).toBe(tool);
      });
    });

    it('should clear selection for all drawing tools when switching from edit', () => {
      const drawingTools: Tool[] = ['rectangle', 'circle', 'line', 'curve'];
      
      drawingTools.forEach(tool => {
        // Reset state for each test
        state.tool = 'edit';
        SelectionManager.setSelection(state, ['shape1']);
        expect(state.selection).toEqual(['shape1']);

        // Switch to drawing tool
        toolManager.setActiveTool(tool, state);

        // Selection should be cleared
        expect(state.selection).toEqual([]);
        expect(state.tool).toBe(tool);
      });
    });
  });

  describe('ARIA accessibility', () => {
    beforeEach(() => {
      toolManager.setupToolButtons(state);
    });

    it('should maintain proper ARIA pressed state for tools', () => {
      const allToolButtons = document.querySelectorAll('[data-tool]') as NodeListOf<HTMLButtonElement>;
      
      // Initially, all should be false
      allToolButtons.forEach(btn => {
        expect(btn.getAttribute('aria-pressed')).toBe('false');
      });

      // Activate rectangle tool
      toolManager.setActiveTool('rectangle', state);

      // Only rectangle should be pressed
      allToolButtons.forEach(btn => {
        const expected = btn.dataset.tool === 'rectangle' ? 'true' : 'false';
        expect(btn.getAttribute('aria-pressed')).toBe(expected);
      });
    });

    it('should toggle active class correctly', () => {
      toolManager.setActiveTool('circle', state);

      const circleButton = document.querySelector('[data-tool="circle"]') as HTMLButtonElement;
      const panButton = document.querySelector('[data-tool="pan"]') as HTMLButtonElement;

      expect(circleButton.classList.contains('active')).toBe(true);
      expect(panButton.classList.contains('active')).toBe(false);

      toolManager.setActiveTool('pan', state);

      expect(circleButton.classList.contains('active')).toBe(false);
      expect(panButton.classList.contains('active')).toBe(true);
    });
  });
});
