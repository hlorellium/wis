import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IndexedDbStore } from '../src/persistence/indexedDbStore';
import { PersistenceManager } from '../src/persistence/persistenceManager';
import { initialState, type State } from '../src/state';
import 'fake-indexeddb/auto';

describe('Persistence', () => {
    describe('IndexedDbStore', () => {
        let store: IndexedDbStore<{ test: string }>;

        beforeEach(() => {
            store = new IndexedDbStore('test-db', 'test-store');
        });

        afterEach(() => {
            // Clean up IndexedDB after each test
            indexedDB.deleteDatabase('test-db');
        });

        it('should store and retrieve data', async () => {
            const testData = { test: 'hello world' };
            
            await store.put('key1', testData);
            const retrieved = await store.get('key1');
            
            expect(retrieved).toEqual(testData);
        });

        it('should return undefined for non-existent keys', async () => {
            const result = await store.get('non-existent');
            expect(result).toBeUndefined();
        });

        it('should overwrite existing data', async () => {
            const data1 = { test: 'first' };
            const data2 = { test: 'second' };
            
            await store.put('key1', data1);
            await store.put('key1', data2);
            
            const result = await store.get('key1');
            expect(result).toEqual(data2);
        });

        it('should delete data', async () => {
            const testData = { test: 'to be deleted' };
            
            await store.put('key1', testData);
            await store.delete('key1');
            
            const result = await store.get('key1');
            expect(result).toBeUndefined();
        });

        it('should handle putSync without throwing', () => {
            const testData = { test: 'sync test' };
            
            // putSync is best-effort and shouldn't throw
            expect(() => {
                store.putSync('sync-key', testData);
            }).not.toThrow();
        });
    });

    describe('PersistenceManager', () => {
        let persistence: PersistenceManager;

        beforeEach(() => {
            persistence = new PersistenceManager();
        });

        afterEach(async () => {
            // Clean up IndexedDB after each test
            await persistence.clearState();
            // Also delete the database to ensure clean state
            indexedDB.deleteDatabase('drawing-app');
        });

        it('should save and load state', async () => {
            const testState: State = {
                ...initialState,
                view: { panX: 100, panY: 200, zoom: 1.5 },
                tool: 'rectangle'
            };

            await persistence.saveState(testState);
            const loadedState = await persistence.loadState();

            expect(loadedState).toEqual(testState);
        });

        it('should return undefined when no state exists', async () => {
            const loadedState = await persistence.loadState();
            expect(loadedState).toBeUndefined();
        });

        it('should handle state with shapes', async () => {
            const testState: State = {
                ...initialState,
                scene: {
                    shapes: [
                        { id: '1', type: 'rectangle', color: '#ff0000', x: 10, y: 20, width: 30, height: 40 },
                        { id: '2', type: 'circle', color: '#00ff00', x: 50, y: 60, radius: 25 }
                    ]
                }
            };

            await persistence.saveState(testState);
            const loadedState = await persistence.loadState();

            expect(loadedState).toEqual(testState);
            expect(loadedState?.scene.shapes).toHaveLength(2);
        });

        it('should clear state', async () => {
            const testState: State = {
                ...initialState,
                tool: 'line'
            };

            await persistence.saveState(testState);
            await persistence.clearState();
            
            const loadedState = await persistence.loadState();
            expect(loadedState).toBeUndefined();
        });

        it('should handle saveStateSync without throwing', () => {
            const testState: State = {
                ...initialState,
                tool: 'circle'
            };

            expect(() => {
                persistence.saveStateSync(testState);
            }).not.toThrow();
        });

        it('should validate state structure and reject invalid data', async () => {
            // Manually put invalid data into the store
            const store = new IndexedDbStore<any>('drawing-app', 'state');
            await store.put('snapshot', { invalid: 'data' });

            const loadedState = await persistence.loadState();
            expect(loadedState).toBeUndefined();
        });

        it('should clean proxy wrappers from state', async () => {
            // Create a state object with a proxy-like structure
            const stateWithProxy = new Proxy(initialState, {
                get(target, prop) {
                    return target[prop as keyof State];
                }
            });

            await persistence.saveState(stateWithProxy);
            const loadedState = await persistence.loadState();

            // The loaded state should be a plain object, not a proxy
            expect(loadedState).toEqual(initialState);
            expect(Object.getPrototypeOf(loadedState)).toBe(Object.prototype);
        });
    });
});
