/**
 * Lightweight event bus for decoupling system components
 * Enables publish-subscribe pattern for cross-cutting concerns
 */

export type EventListener<T = any> = (event: T) => void;

export interface CommandExecutedEvent {
  command: any;
  affectedShapeIds: string[];
  sideEffects: SideEffect[];
  source: 'local' | 'remote';
  timestamp: number;
}

export interface CommandFailedEvent {
  command: any;
  error: Error;
  source: 'local' | 'remote';
  timestamp: number;
}

export interface SideEffect {
  type: 'cacheInvalidation' | 'rendering' | 'persistence' | 'sync';
  target?: string; // optional target identifier (e.g., shapeId)
  metadata?: Record<string, any>;
}

export type EventType = 
  | 'commandExecuted'
  | 'commandFailed'
  | 'undoExecuted'
  | 'redoExecuted'
  | 'stateChanged'
  | 'renderingRequired';

export class EventBus {
  private listeners = new Map<EventType, Set<EventListener>>();

  /**
   * Subscribe to an event type
   * @param eventType The type of event to listen for
   * @param listener The callback function to execute
   * @returns Unsubscribe function
   */
  subscribe<T>(eventType: EventType, listener: EventListener<T>): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    this.listeners.get(eventType)!.add(listener);
    
    return () => {
      const eventListeners = this.listeners.get(eventType);
      if (eventListeners) {
        eventListeners.delete(listener);
        if (eventListeners.size === 0) {
          this.listeners.delete(eventType);
        }
      }
    };
  }

  /**
   * Emit an event to all subscribers
   * @param eventType The type of event to emit
   * @param event The event data
   */
  emit<T>(eventType: EventType, event: T): void {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error(`EventBus: Error in listener for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Get the number of listeners for an event type (useful for testing)
   */
  getListenerCount(eventType: EventType): number {
    return this.listeners.get(eventType)?.size ?? 0;
  }

  /**
   * Clear all listeners (useful for testing)
   */
  clear(): void {
    this.listeners.clear();
  }
}

// Export singleton instance
export const eventBus = new EventBus();
