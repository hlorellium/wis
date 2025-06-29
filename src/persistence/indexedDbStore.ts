import { logger } from '../utils/logger';

/**
 * Lightweight wrapper around IndexedDB for type-safe storage operations
 */
export class IndexedDbStore<T> {
    private dbPromise: Promise<IDBDatabase> | null;
    private dbName: string;
    private storeName: string;
    private isAvailable: boolean = true;

    constructor(dbName: string, storeName: string) {
        this.dbName = dbName;
        this.storeName = storeName;
        this.dbPromise = this.initializeDatabase();
    }

    /**
     * Check if IndexedDB is available for operations
     */
    get available(): boolean {
        return this.isAvailable;
    }

    private initializeDatabase(): Promise<IDBDatabase> | null {
        // Check if IndexedDB is available
        if (typeof indexedDB === 'undefined') {
            logger.warn('IndexedDB is not available in this environment', 'IndexedDbStore');
            this.isAvailable = false;
            return null;
        }

        const promise = new Promise<IDBDatabase>((resolve, reject) => {
            try {
                const request = indexedDB.open(this.dbName, 1);
                
                request.onupgradeneeded = () => {
                    try {
                        const db = request.result;
                        if (!db.objectStoreNames.contains(this.storeName)) {
                            db.createObjectStore(this.storeName);
                        }
                    } catch (error) {
                        logger.error('Failed to create object store', 'IndexedDbStore', error);
                        this.isAvailable = false;
                        reject(error);
                    }
                };
                
                request.onsuccess = () => {
                    try {
                        const db = request.result;
                        resolve(db);
                    } catch (error) {
                        logger.error('Failed to open IndexedDB connection', 'IndexedDbStore', error);
                        this.isAvailable = false;
                        reject(error);
                    }
                };
                
                request.onerror = () => {
                    logger.error('Failed to open IndexedDB', 'IndexedDbStore', request.error);
                    this.isAvailable = false;
                    reject(request.error);
                };

                request.onblocked = () => {
                    logger.warn('IndexedDB connection blocked', 'IndexedDbStore');
                    // Don't mark as unavailable - just retry later
                };
            } catch (error) {
                logger.error('IndexedDB initialization failed', 'IndexedDbStore', error);
                this.isAvailable = false;
                reject(error);
            }
        });

        promise.catch((error) => {
            this.isAvailable = false;
        });

        return promise;
    }

    /**
     * Retrieve a value by key
     */
    async get(key: string): Promise<T | undefined> {
        if (!this.isAvailable || !this.dbPromise) {
            return undefined;
        }

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
            this.isAvailable = false;
            return undefined;
        }
    }

    /**
     * Store a value by key
     */
    async put(key: string, value: T): Promise<void> {
        if (!this.isAvailable || !this.dbPromise) {
            throw new Error('IndexedDB is not available');
        }

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
            this.isAvailable = false;
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
        if (!this.isAvailable || !this.dbPromise) {
            throw new Error('IndexedDB is not available');
        }

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
            this.isAvailable = false;
            throw error;
        }
    }
}
