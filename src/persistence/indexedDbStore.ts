import { logger } from '../utils/logger';

/**
 * Lightweight wrapper around IndexedDB for type-safe storage operations
 */
export class IndexedDbStore<T> {
    private dbPromise: Promise<IDBDatabase>;
    private dbName: string;
    private storeName: string;

    constructor(dbName: string, storeName: string) {
        this.dbName = dbName;
        this.storeName = storeName;
        this.dbPromise = this.initializeDatabase();
    }

    private initializeDatabase(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);
            
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName);
                }
            };
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                logger.error('Failed to open IndexedDB', 'IndexedDbStore', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Retrieve a value by key
     */
    async get(key: string): Promise<T | undefined> {
        try {
            const db = await this.dbPromise;
            return new Promise((resolve) => {
                const transaction = db.transaction(this.storeName, 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get(key);
                
                request.onsuccess = () => {
                    resolve(request.result as T | undefined);
                };
                
                request.onerror = () => {
                    logger.warn('Failed to get value from IndexedDB', 'IndexedDbStore', request.error);
                    resolve(undefined);
                };
            });
        } catch (error) {
            logger.warn('Error accessing IndexedDB', 'IndexedDbStore', error);
            return undefined;
        }
    }

    /**
     * Store a value by key
     */
    async put(key: string, value: T): Promise<void> {
        try {
            const db = await this.dbPromise;
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(this.storeName, 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.put(value, key);
                
                request.onsuccess = () => {
                    resolve();
                };
                
                request.onerror = () => {
                    logger.warn('Failed to put value to IndexedDB', 'IndexedDbStore', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            logger.warn('Error writing to IndexedDB', 'IndexedDbStore', error);
            throw error;
        }
    }

    /**
     * Synchronous best-effort put operation for beforeunload events
     * Note: This may not complete before the page unloads, but it's the best we can do
     */
    putSync(key: string, value: T): void {
        try {
            // Try to use an already open database connection
            const openRequest = indexedDB.open(this.dbName, 1);
            openRequest.onsuccess = () => {
                try {
                    const db = openRequest.result;
                    const transaction = db.transaction(this.storeName, 'readwrite');
                    const store = transaction.objectStore(this.storeName);
                    store.put(value, key);
                } catch (error) {
                    // Silently fail - we're in an unload event
                }
            };
        } catch (error) {
            // Silently fail - we're in an unload event
        }
    }

    /**
     * Delete a value by key
     */
    async delete(key: string): Promise<void> {
        try {
            const db = await this.dbPromise;
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(this.storeName, 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.delete(key);
                
                request.onsuccess = () => {
                    resolve();
                };
                
                request.onerror = () => {
                    logger.warn('Failed to delete value from IndexedDB', 'IndexedDbStore', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            logger.warn('Error deleting from IndexedDB', 'IndexedDbStore', error);
            throw error;
        }
    }
}
