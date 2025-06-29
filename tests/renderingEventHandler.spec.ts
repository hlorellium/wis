import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest';
import { RenderingEventHandler } from '../src/rendering/renderingEventHandler';
import { eventBus, type EventType, type EventListener } from '../src/utils/eventBus';
import { logger } from '../src/utils/logger';
import type { Path2DRenderer } from '../src/rendering/path2DRenderer';
import type { CommandExecutedEvent } from '../src/utils/eventBus';

// Mock dependencies
vi.mock('../src/utils/eventBus', () => ({
  eventBus: {
    subscribe: vi.fn(),
    publish: vi.fn()
  }
}));

vi.mock('../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn()
  }
}));

describe('RenderingEventHandler', () => {
  let handler: RenderingEventHandler;
  let mockRenderer: {
    clearCache: MockedFunction<any>;
  };
  let mockEventBusSubscribe: MockedFunction<any>;
  let mockLoggerInfo: MockedFunction<any>;
  let mockLoggerDebug: MockedFunction<any>;
  let mockLoggerWarn: MockedFunction<any>;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock renderer
    mockRenderer = {
      clearCache: vi.fn()
    };

    // Get mocked functions
    mockEventBusSubscribe = eventBus.subscribe as MockedFunction<any>;
    mockLoggerInfo = logger.info as MockedFunction<any>;
    mockLoggerDebug = logger.debug as MockedFunction<any>;
    mockLoggerWarn = logger.warn as MockedFunction<any>;

    // Create handler instance
    handler = new RenderingEventHandler(mockRenderer as any as Path2DRenderer);
  });

  afterEach(() => {
    // Ensure handler is stopped after each test
    handler.stop();
  });

  describe('constructor', () => {
    it('should store the renderer reference', () => {
      expect((handler as any).renderer).toBe(mockRenderer);
    });

    it('should not subscribe to events until start() is called', () => {
      expect(mockEventBusSubscribe).not.toHaveBeenCalled();
    });
  });

  describe('start', () => {
    it('should subscribe to commandExecuted events', () => {
      const mockUnsubscribe = vi.fn();
      mockEventBusSubscribe.mockReturnValue(mockUnsubscribe);

      handler.start();

      expect(mockEventBusSubscribe).toHaveBeenCalledWith('commandExecuted', expect.any(Function));
    });

    it('should subscribe to stateChanged events', () => {
      const mockUnsubscribe = vi.fn();
      mockEventBusSubscribe.mockReturnValue(mockUnsubscribe);

      handler.start();

      expect(mockEventBusSubscribe).toHaveBeenCalledWith('stateChanged', expect.any(Function));
      expect(mockEventBusSubscribe).toHaveBeenCalledTimes(2);
    });

    it('should log start message', () => {
      const mockUnsubscribe = vi.fn();
      mockEventBusSubscribe.mockReturnValue(mockUnsubscribe);

      handler.start();

      expect(mockLoggerInfo).toHaveBeenCalledWith('RenderingEventHandler started', 'RenderingEventHandler');
    });

    it('should store combined unsubscribe function', () => {
      const mockUnsubscribe1 = vi.fn();
      const mockUnsubscribe2 = vi.fn();
      mockEventBusSubscribe
        .mockReturnValueOnce(mockUnsubscribe1)
        .mockReturnValueOnce(mockUnsubscribe2);

      handler.start();

      // Test that calling stop() calls both unsubscribe functions
      handler.stop();
      expect(mockUnsubscribe1).toHaveBeenCalledOnce();
      expect(mockUnsubscribe2).toHaveBeenCalledOnce();
    });
  });

  describe('stop', () => {
    it('should call unsubscribe functions when started', () => {
      const mockUnsubscribe1 = vi.fn();
      const mockUnsubscribe2 = vi.fn();
      mockEventBusSubscribe
        .mockReturnValueOnce(mockUnsubscribe1)
        .mockReturnValueOnce(mockUnsubscribe2);

      handler.start();
      handler.stop();

      expect(mockUnsubscribe1).toHaveBeenCalledOnce();
      expect(mockUnsubscribe2).toHaveBeenCalledOnce();
    });

    it('should clear unsubscribe reference after stopping', () => {
      const mockUnsubscribe = vi.fn();
      mockEventBusSubscribe.mockReturnValue(mockUnsubscribe);

      handler.start();
      handler.stop();
      
      // Clear the mock call count to isolate the test
      mockUnsubscribe.mockClear();

      // Calling stop again should not call unsubscribe
      handler.stop();
      expect(mockUnsubscribe).not.toHaveBeenCalled();
    });

    it('should log stop message', () => {
      const mockUnsubscribe = vi.fn();
      mockEventBusSubscribe.mockReturnValue(mockUnsubscribe);

      handler.start();
      handler.stop();

      expect(mockLoggerInfo).toHaveBeenCalledWith('RenderingEventHandler stopped', 'RenderingEventHandler');
    });

    it('should handle stop() being called without start()', () => {
      expect(() => handler.stop()).not.toThrow();
      expect(mockLoggerInfo).toHaveBeenCalledWith('RenderingEventHandler stopped', 'RenderingEventHandler');
    });
  });

  describe('command execution handling', () => {
    let commandExecutedCallback: (event: CommandExecutedEvent) => void;

    beforeEach(() => {
      mockEventBusSubscribe.mockImplementation((eventType: any, callback: any) => {
        if (eventType === 'commandExecuted') {
          commandExecutedCallback = callback;
        }
        return vi.fn();
      });
      handler.start();
    });

    it('should handle cache invalidation side effect with specific target', () => {
      const mockEvent: CommandExecutedEvent = {
        command: { constructor: { name: 'TestCommand' } } as any,
        affectedShapeIds: ['shape1'],
        sideEffects: [{ type: 'cacheInvalidation', target: 'shape1' }],
        source: 'local',
        timestamp: Date.now()
      };

      commandExecutedCallback(mockEvent);

      expect(mockRenderer.clearCache).toHaveBeenCalledWith('shape1');
      expect(mockLoggerDebug).toHaveBeenCalledWith(
        'Cleared cache for shape: shape1',
        'RenderingEventHandler'
      );
    });

    it('should handle cache invalidation side effect with affected shape IDs', () => {
      const mockEvent: CommandExecutedEvent = {
        command: { constructor: { name: 'TestCommand' } } as any,
        affectedShapeIds: ['shape1', 'shape2'],
        sideEffects: [{ type: 'cacheInvalidation' }],
        source: 'local',
        timestamp: Date.now()
      };

      commandExecutedCallback(mockEvent);

      expect(mockRenderer.clearCache).toHaveBeenCalledWith('shape1');
      expect(mockRenderer.clearCache).toHaveBeenCalledWith('shape2');
      expect(mockRenderer.clearCache).toHaveBeenCalledTimes(2);
    });

    it('should handle cache invalidation side effect with no target (clear all)', () => {
      const mockEvent: CommandExecutedEvent = {
        command: { constructor: { name: 'TestCommand' } } as any,
        affectedShapeIds: [],
        sideEffects: [{ type: 'cacheInvalidation' }],
        source: 'local',
        timestamp: Date.now()
      };

      commandExecutedCallback(mockEvent);

      expect(mockRenderer.clearCache).toHaveBeenCalledWith();
      expect(mockLoggerDebug).toHaveBeenCalledWith('Cleared all cache', 'RenderingEventHandler');
    });

    it('should handle rendering side effect', () => {
      const mockEvent: CommandExecutedEvent = {
        command: { constructor: { name: 'TestCommand' } } as any,
        affectedShapeIds: ['shape1'],
        sideEffects: [{ type: 'rendering' }],
        source: 'local',
        timestamp: Date.now()
      };

      commandExecutedCallback(mockEvent);

      expect(mockLoggerDebug).toHaveBeenCalledWith('Rendering invalidated', 'RenderingEventHandler');
    });

    it('should handle persistence side effect', () => {
      const mockEvent: CommandExecutedEvent = {
        command: { constructor: { name: 'TestCommand' } } as any,
        affectedShapeIds: ['shape1'],
        sideEffects: [{ type: 'persistence' }],
        source: 'local',
        timestamp: Date.now()
      };

      commandExecutedCallback(mockEvent);

      expect(mockLoggerDebug).toHaveBeenCalledWith('Persistence side effect detected', 'RenderingEventHandler');
    });

    it('should handle sync side effect', () => {
      const mockEvent: CommandExecutedEvent = {
        command: { constructor: { name: 'TestCommand' } } as any,
        affectedShapeIds: ['shape1'],
        sideEffects: [{ type: 'sync' }],
        source: 'local',
        timestamp: Date.now()
      };

      commandExecutedCallback(mockEvent);

      expect(mockLoggerDebug).toHaveBeenCalledWith('Sync side effect detected', 'RenderingEventHandler');
    });

    it('should handle unknown side effect type', () => {
      const mockEvent: CommandExecutedEvent = {
        command: { constructor: { name: 'TestCommand' } } as any,
        affectedShapeIds: ['shape1'],
        sideEffects: [{ type: 'unknown' as any }],
        source: 'local',
        timestamp: Date.now()
      };

      commandExecutedCallback(mockEvent);

      expect(mockLoggerWarn).toHaveBeenCalledWith('Unknown side effect type: unknown', 'RenderingEventHandler');
    });

    it('should handle multiple side effects', () => {
      const mockEvent: CommandExecutedEvent = {
        command: { constructor: { name: 'TestCommand' } } as any,
        affectedShapeIds: ['shape1'],
        sideEffects: [
          { type: 'cacheInvalidation', target: 'shape1' },
          { type: 'rendering' },
          { type: 'persistence' }
        ],
        source: 'local',
        timestamp: Date.now()
      };

      commandExecutedCallback(mockEvent);

      expect(mockRenderer.clearCache).toHaveBeenCalledWith('shape1');
      expect(mockLoggerDebug).toHaveBeenCalledWith('Rendering invalidated', 'RenderingEventHandler');
      expect(mockLoggerDebug).toHaveBeenCalledWith('Persistence side effect detected', 'RenderingEventHandler');
    });

    it('should log command execution details', () => {
      const mockEvent: CommandExecutedEvent = {
        command: { constructor: { name: 'TestCommand' } } as any,
        affectedShapeIds: ['shape1', 'shape2'],
        sideEffects: [{ type: 'cacheInvalidation' }, { type: 'rendering' }],
        source: 'remote',
        timestamp: Date.now()
      };

      commandExecutedCallback(mockEvent);

      expect(mockLoggerDebug).toHaveBeenCalledWith(
        'Handling side effects for remote command: TestCommand',
        'RenderingEventHandler',
        {
          affectedShapeIds: ['shape1', 'shape2'],
          sideEffects: ['cacheInvalidation', 'rendering']
        }
      );
    });
  });

  describe('state change handling', () => {
    let stateChangedCallback: (event: { source: string }) => void;

    beforeEach(() => {
      mockEventBusSubscribe.mockImplementation((eventType: any, callback: any) => {
        if (eventType === 'stateChanged') {
          stateChangedCallback = callback;
        }
        return vi.fn();
      });
      handler.start();
    });

    it('should clear all cache for undo operation', () => {
      const mockEvent = { source: 'undo' };

      stateChangedCallback(mockEvent);

      expect(mockRenderer.clearCache).toHaveBeenCalledWith();
      expect(mockLoggerDebug).toHaveBeenCalledWith(
        'Cleared all cache due to undo operation',
        'RenderingEventHandler'
      );
    });

    it('should clear all cache for redo operation', () => {
      const mockEvent = { source: 'redo' };

      stateChangedCallback(mockEvent);

      expect(mockRenderer.clearCache).toHaveBeenCalledWith();
      expect(mockLoggerDebug).toHaveBeenCalledWith(
        'Cleared all cache due to redo operation',
        'RenderingEventHandler'
      );
    });

    it('should not clear cache for other state change sources', () => {
      const mockEvent = { source: 'userInput' };

      stateChangedCallback(mockEvent);

      expect(mockRenderer.clearCache).not.toHaveBeenCalled();
      expect(mockLoggerDebug).toHaveBeenCalledWith(
        'Handling state change from: userInput',
        'RenderingEventHandler'
      );
    });

    it('should log state change handling', () => {
      const mockEvent = { source: 'test' };

      stateChangedCallback(mockEvent);

      expect(mockLoggerDebug).toHaveBeenCalledWith(
        'Handling state change from: test',
        'RenderingEventHandler'
      );
    });
  });

  describe('edge cases and error handling', () => {
    let commandExecutedCallback: (event: CommandExecutedEvent) => void;

    beforeEach(() => {
      mockEventBusSubscribe.mockImplementation((eventType: any, callback: any) => {
        if (eventType === 'commandExecuted') {
          commandExecutedCallback = callback;
        }
        return vi.fn();
      });
      handler.start();
    });

    it('should handle event with no side effects', () => {
      const mockEvent: CommandExecutedEvent = {
        command: { constructor: { name: 'TestCommand' } } as any,
        affectedShapeIds: ['shape1'],
        sideEffects: [],
        source: 'local',
        timestamp: Date.now()
      };

      expect(() => commandExecutedCallback(mockEvent)).not.toThrow();
    });

    it('should handle event with undefined affected shape IDs', () => {
      const mockEvent: CommandExecutedEvent = {
        command: { constructor: { name: 'TestCommand' } } as any,
        affectedShapeIds: undefined as any,
        sideEffects: [{ type: 'cacheInvalidation' }],
        source: 'local',
        timestamp: Date.now()
      };

      commandExecutedCallback(mockEvent);

      expect(mockRenderer.clearCache).toHaveBeenCalledWith();
    });

    it('should handle multiple start/stop cycles', () => {
      // Create a fresh handler instance to avoid afterEach interference
      const freshHandler = new RenderingEventHandler(mockRenderer as any as Path2DRenderer);
      const mockUnsubscribe1 = vi.fn();
      const mockUnsubscribe2 = vi.fn();

      // Reset and setup first cycle
      mockEventBusSubscribe.mockReset();
      mockEventBusSubscribe.mockReturnValue(mockUnsubscribe1);
      freshHandler.start();
      freshHandler.stop();

      // Reset and setup second cycle
      mockEventBusSubscribe.mockReset();
      mockEventBusSubscribe.mockReturnValue(mockUnsubscribe2);
      freshHandler.start();
      freshHandler.stop();

      // Verify both unsubscribe functions were called (exact count less important than behavior)
      expect(mockUnsubscribe1).toHaveBeenCalled();
      expect(mockUnsubscribe2).toHaveBeenCalled();
    });

    it('should handle cache invalidation with empty affected shape IDs array', () => {
      const mockEvent: CommandExecutedEvent = {
        command: { constructor: { name: 'TestCommand' } } as any,
        affectedShapeIds: [],
        sideEffects: [{ type: 'cacheInvalidation' }],
        source: 'local',
        timestamp: Date.now()
      };

      commandExecutedCallback(mockEvent);

      expect(mockRenderer.clearCache).toHaveBeenCalledWith();
    });
  });
});
