import { BinaryShapeWrapper } from './binaryShapeWrapper';

/**
 * Array subclass that holds BinaryShapeWrapper instances
 * and maintains compatibility with StateProxy deep reactivity
 */
export class BinaryShapeArray extends Array<BinaryShapeWrapper> {
    private bufferStore: Map<string, ArrayBuffer>;

    constructor() {
        super();
        this.bufferStore = new Map();
        
        // Bind Map methods to maintain proper context when accessed through Proxy
        this.mapSet = Map.prototype.set.bind(this.bufferStore);
        this.mapDelete = Map.prototype.delete.bind(this.bufferStore);
        this.mapClear = Map.prototype.clear.bind(this.bufferStore);
        
        // Ensure the array maintains its prototype
        Object.setPrototypeOf(this, BinaryShapeArray.prototype);
    }

    // Bound Map methods
    private mapSet: (key: string, value: ArrayBuffer) => Map<string, ArrayBuffer>;
    private mapDelete: (key: string) => boolean;
    private mapClear: () => void;

    /**
     * Override push to trigger StateProxy reactivity
     */
    push(...items: BinaryShapeWrapper[]): number {
        // Store buffers for efficient access
        items.forEach(item => {
            // Check if item has getBuffer method (is a BinaryShapeWrapper)
            if (item && typeof item.getBuffer === 'function') {
                this.mapSet(item.id, item.getBuffer());
            }
        });
        
        // Call parent method which will trigger StateProxy
        return super.push(...items);
    }

    /**
     * Override splice to trigger StateProxy reactivity
     */
    splice(start: number, deleteCount?: number, ...items: BinaryShapeWrapper[]): BinaryShapeWrapper[] {
        // Remove buffers for deleted items
        if (deleteCount !== undefined) {
            for (let i = start; i < start + deleteCount && i < this.length; i++) {
                const item = this[i];
                if (item) {
                    this.mapDelete(item.id);
                }
            }
        }
        
        // Store buffers for new items
        items.forEach(item => {
            // Check if item has getBuffer method (is a BinaryShapeWrapper)
            if (item && typeof item.getBuffer === 'function') {
                this.mapSet(item.id, item.getBuffer());
            }
        });
        
        // Call parent method which will trigger StateProxy
        return super.splice(start, deleteCount ?? 0, ...items);
    }

    /**
     * Override pop to trigger StateProxy reactivity
     */
    pop(): BinaryShapeWrapper | undefined {
        const item = super.pop();
        if (item) {
            this.mapDelete(item.id);
        }
        return item;
    }

    /**
     * Override shift to trigger StateProxy reactivity
     */
    shift(): BinaryShapeWrapper | undefined {
        const item = super.shift();
        if (item) {
            this.mapDelete(item.id);
        }
        return item;
    }

    /**
     * Override unshift to trigger StateProxy reactivity
     */
    unshift(...items: BinaryShapeWrapper[]): number {
        items.forEach(item => {
            // Check if item has getBuffer method (is a BinaryShapeWrapper)
            if (item && typeof item.getBuffer === 'function') {
                this.mapSet(item.id, item.getBuffer());
            }
        });
        return super.unshift(...items);
    }

    /**
     * Get shape by ID
     */
    getById(id: string): BinaryShapeWrapper | undefined {
        return this.find(shape => shape.id === id);
    }

    /**
     * Remove shape by ID
     */
    removeById(id: string): boolean {
        const index = this.findIndex(shape => shape.id === id);
        if (index !== -1) {
            this.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Get all buffers for efficient rendering
     */
    getAllBuffers(): ArrayBuffer[] {
        return this.map(shape => {
            if (shape && typeof shape.getBuffer === 'function') {
                return shape.getBuffer();
            }
            return null;
        }).filter(buffer => buffer !== null) as ArrayBuffer[];
    }

    /**
     * Get shapes in a region (for spatial queries)
     */
    getInRegion(x: number, y: number, width: number, height: number): BinaryShapeWrapper[] {
        const filtered = this.filter(shape => {
            // Simple bounding box intersection
            const shapeX = shape.x;
            const shapeY = shape.y;
            
            switch (shape.type) {
                case 'rectangle':
                    return !(shapeX > x + width || 
                           shapeX + shape.width < x ||
                           shapeY > y + height ||
                           shapeY + shape.height < y);
                
                case 'circle':
                    const centerX = shapeX;
                    const centerY = shapeY;
                    const radius = shape.radius;
                    
                    // Check if circle intersects with rectangle
                    const closestX = Math.max(x, Math.min(centerX, x + width));
                    const closestY = Math.max(y, Math.min(centerY, y + height));
                    const distSq = (centerX - closestX) ** 2 + (centerY - closestY) ** 2;
                    return distSq <= radius ** 2;
                
                case 'line':
                    // Simple check if either endpoint is in region
                    const x1 = shape.x1;
                    const y1 = shape.y1;
                    const x2 = shape.x2;
                    const y2 = shape.y2;
                    
                    return (x1 >= x && x1 <= x + width && y1 >= y && y1 <= y + height) ||
                           (x2 >= x && x2 <= x + width && y2 >= y && y2 <= y + height);
                
                default:
                    return true; // Include unknown types
            }
        });
        
        // Return as plain array to avoid inheriting extra properties
        return Array.from(filtered);
    }

    /**
     * Clear all shapes
     */
    clear(): void {
        this.mapClear();
        this.length = 0;
    }

    /**
     * Get memory usage statistics
     */
    getMemoryStats(): { totalBytes: number; shapeCount: number; averageSize: number } {
        const totalBytes = Array.from(this.bufferStore.values())
            .reduce((total, buffer) => total + buffer.byteLength, 0);
        
        return {
            totalBytes,
            shapeCount: this.length,
            averageSize: this.length > 0 ? totalBytes / this.length : 0
        };
    }
}
