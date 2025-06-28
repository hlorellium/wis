import type { State } from '../state';
import { initialState } from '../state';
import { IndexedDbStore } from './indexedDbStore';
import { logger } from '../utils/logger';

const DB_NAME = 'drawing-app';
const STORE_NAME = 'state';
const STATE_KEY = 'snapshot';

/**
 * Manages persistence of application state to IndexedDB
 */
export class PersistenceManager {
    private store: IndexedDbStore<State>;

    constructor() {
        this.store = new IndexedDbStore<State>(DB_NAME, STORE_NAME);
    }

    /**
     * Load the persisted state from IndexedDB
     * Returns undefined if no state exists or if loading fails
     */
    async loadState(): Promise<State | undefined> {
        try {
            const state = await this.store.get(STATE_KEY);
            if (state) {
                // Validate that the loaded state has the expected structure
                if (this.isValidState(state)) {
                    logger.info('State loaded from IndexedDB', 'PersistenceManager');
                    return state;
                } else {
                    logger.warn('Invalid state structure found, using initial state', 'PersistenceManager');
                    // Clean up invalid data
                    await this.store.delete(STATE_KEY);
                    return undefined;
                }
            }
            return undefined;
        } catch (error) {
            logger.warn('Failed to load state from IndexedDB', 'PersistenceManager', error);
            return undefined;
        }
    }

    /**
     * Save the current state to IndexedDB
     */
    async saveState(state: State): Promise<void> {
        try {
            // Create a deep clone to remove any proxy wrappers and ensure serialization
            const cleanState = this.cleanState(state);
            await this.store.put(STATE_KEY, cleanState);
            logger.debug('State saved to IndexedDB', 'PersistenceManager');
        } catch (error) {
            logger.warn('Failed to save state to IndexedDB', 'PersistenceManager', error);
        }
    }

    /**
     * Synchronous save operation for beforeunload events
     * This is a best-effort operation and may not complete before page unload
     */
    saveStateSync(state: State): void {
        try {
            const cleanState = this.cleanState(state);
            this.store.putSync(STATE_KEY, cleanState);
        } catch (error) {
            // Silently fail during unload events
        }
    }

    /**
     * Clear all persisted state
     */
    async clearState(): Promise<void> {
        try {
            await this.store.delete(STATE_KEY);
            logger.info('Persisted state cleared', 'PersistenceManager');
        } catch (error) {
            logger.warn('Failed to clear persisted state', 'PersistenceManager', error);
        }
    }

    /**
     * Create a clean copy of the state for serialization
     * Removes proxy wrappers and ensures the object can be stored in IndexedDB
     */
    private cleanState(state: State): State {
        return JSON.parse(JSON.stringify(state));
    }

    /**
     * Validate that a loaded state has the expected structure
     */
    private isValidState(state: any): state is State {
        return (
            state &&
            typeof state === 'object' &&
            state.scene &&
            Array.isArray(state.scene.shapes) &&
            state.view &&
            typeof state.view.panX === 'number' &&
            typeof state.view.panY === 'number' &&
            typeof state.view.zoom === 'number' &&
            typeof state.tool === 'string' &&
            state.currentDrawing &&
            state.hasOwnProperty('selection')
        );
    }
}
