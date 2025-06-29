import type { State } from '../state';
import { initialState } from '../state';
import { IndexedDbStore } from './indexedDbStore';
import { logger } from '../utils/logger';

const DB_NAME = 'drawing-app';
const STORE_NAME = 'state';
const STATE_KEY = 'snapshot';

// Schema versioning
const CURRENT_SCHEMA_VERSION = 4;

type PersistedState = {
    schemaVersion: number;
    data: State;
};

type MigrationFunction = (oldState: any) => PersistedState;

/**
 * Manages persistence of application state to IndexedDB
 */
export class PersistenceManager {
    private store: IndexedDbStore<PersistedState | State>;

    constructor() {
        this.store = new IndexedDbStore<PersistedState | State>(DB_NAME, STORE_NAME);
    }

    /**
     * Load the persisted state from IndexedDB
     * Returns undefined if no state exists or if loading fails
     */
    async loadState(): Promise<State | undefined> {
        try {
            const rawData = await this.store.get(STATE_KEY);
            if (!rawData) {
                return undefined;
            }

            // Handle schema versioning
            const persistedState = this.handleSchemaVersion(rawData);
            if (!persistedState) {
                logger.warn('Could not migrate persisted state, using initial state', 'PersistenceManager');
                await this.store.delete(STATE_KEY);
                return undefined;
            }

            // Normalize the state to ensure runtime invariants
            const normalizedState = this.normalizeState(persistedState.data);

            // Validate that the loaded state has the expected structure
            if (this.isValidState(normalizedState)) {
                logger.info('State loaded from IndexedDB', 'PersistenceManager');
                return normalizedState;
            } else {
                logger.warn('Invalid state structure found, using initial state', 'PersistenceManager');
                await this.store.delete(STATE_KEY);
                return undefined;
            }
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
            const persistedState: PersistedState = {
                schemaVersion: CURRENT_SCHEMA_VERSION,
                data: cleanState
            };
            await this.store.put(STATE_KEY, persistedState);
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
            const persistedState: PersistedState = {
                schemaVersion: CURRENT_SCHEMA_VERSION,
                data: cleanState
            };
            this.store.putSync(STATE_KEY, persistedState);
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
     * Handle schema versioning and migrations
     */
    private handleSchemaVersion(rawData: any): PersistedState | null {
        // Check if this is already a versioned state
        if (rawData && typeof rawData === 'object' && typeof rawData.schemaVersion === 'number') {
            const persistedState = rawData as PersistedState;
            
            if (persistedState.schemaVersion === CURRENT_SCHEMA_VERSION) {
                // Current version, use as-is
                return persistedState;
            } else if (persistedState.schemaVersion < CURRENT_SCHEMA_VERSION) {
                // Older version, migrate
                return this.migrateState(persistedState);
            } else {
                // Future version we don't understand
                logger.warn(`Unknown schema version ${persistedState.schemaVersion}, expected ${CURRENT_SCHEMA_VERSION}`, 'PersistenceManager');
                return null;
            }
        }

        // Legacy state without version (assume version 1)
        return this.migrateLegacyState(rawData);
    }

    /**
     * Migrate state from older versions
     */
    private migrateState(persistedState: PersistedState): PersistedState | null {
        try {
            if (persistedState.schemaVersion === 1) {
                const v2State = this.migrateV1toV2(persistedState);
                const v3State = v2State ? this.migrateV2toV3(v2State) : null;
                return v3State ? this.migrateV3toV4(v3State) : null;
            } else if (persistedState.schemaVersion === 2) {
                const v3State = this.migrateV2toV3(persistedState);
                return v3State ? this.migrateV3toV4(v3State) : null;
            } else if (persistedState.schemaVersion === 3) {
                return this.migrateV3toV4(persistedState);
            }
            // Add more migrations here as needed
            logger.warn(`No migration path from version ${persistedState.schemaVersion} to ${CURRENT_SCHEMA_VERSION}`, 'PersistenceManager');
            return null;
        } catch (error) {
            logger.warn('Migration failed', 'PersistenceManager', error);
            return null;
        }
    }

    /**
     * Migrate legacy state (no version) to current version
     */
    private migrateLegacyState(legacyState: any): PersistedState | null {
        try {
            // Legacy state is assumed to be version 1
            const v1State: PersistedState = {
                schemaVersion: 1,
                data: legacyState
            };
            const v2State = this.migrateV1toV2(v1State);
            const v3State = v2State ? this.migrateV2toV3(v2State) : null;
            return v3State ? this.migrateV3toV4(v3State) : null;
        } catch (error) {
            logger.warn('Legacy state migration failed', 'PersistenceManager', error);
            return null;
        }
    }

    /**
     * Migrate from version 1 to version 2
     * Main change: selection from string|null to string[]
     */
    private migrateV1toV2(v1State: PersistedState): PersistedState {
        const state = JSON.parse(JSON.stringify(v1State.data));
        
        // Convert selection from string|null to string[]
        if (state.selection === null || state.selection === undefined) {
            state.selection = [];
        } else if (typeof state.selection === 'string') {
            state.selection = [state.selection];
        } else if (!Array.isArray(state.selection)) {
            state.selection = [];
        }

        logger.info('Migrated state from v1 to v2', 'PersistenceManager');
        return {
            schemaVersion: 2,
            data: state
        };
    }

    /**
     * Migrate from version 2 to version 3
     * Main change: add currentEditing field
     */
    private migrateV2toV3(v2State: PersistedState): PersistedState {
        const state = JSON.parse(JSON.stringify(v2State.data));
        
        // Add currentEditing field with defaults
        state.currentEditing = {
            shapeId: null,
            vertexIndex: null,
            isDragging: false,
            isGroupMove: false,
            dragStart: null
        };

        logger.info('Migrated state from v2 to v3', 'PersistenceManager');
        return {
            schemaVersion: 3,
            data: state
        };
    }

    /**
     * Migrate from version 3 to version 4
     * Main change: add ui field for unified rendering architecture
     */
    private migrateV3toV4(v3State: PersistedState): PersistedState {
        const state = JSON.parse(JSON.stringify(v3State.data));
        
        // Add ui field with defaults
        state.ui = {
            selectionDrag: {
                isActive: false,
                start: null,
                current: null
            }
        };

        logger.info('Migrated state from v3 to v4', 'PersistenceManager');
        return {
            schemaVersion: 4,
            data: state
        };
    }

    /**
     * Normalize state to ensure runtime invariants
     */
    private normalizeState(state: any): State {
        // Ensure selection is always an array
        if (!Array.isArray(state.selection)) {
            state.selection = state.selection ? [state.selection] : [];
        }

        // Ensure currentEditing exists with defaults
        if (!state.currentEditing || typeof state.currentEditing !== 'object') {
            state.currentEditing = {
                shapeId: null,
                vertexIndex: null,
                isDragging: false,
                isGroupMove: false,
                dragStart: null
            };
        }

        // Ensure ui field exists with defaults
        if (!state.ui || typeof state.ui !== 'object') {
            state.ui = {
                selectionDrag: {
                    isActive: false,
                    start: null,
                    current: null
                }
            };
        } else if (!state.ui.selectionDrag || typeof state.ui.selectionDrag !== 'object') {
            state.ui.selectionDrag = {
                isActive: false,
                start: null,
                current: null
            };
        }

        // Add more normalization rules here as needed
        // For example: ensure shapes have required properties, etc.

        return state;
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
            state.hasOwnProperty('selection') &&
            Array.isArray(state.selection) &&
            state.ui &&
            typeof state.ui === 'object' &&
            state.ui.selectionDrag &&
            typeof state.ui.selectionDrag === 'object'
        );
    }
}
