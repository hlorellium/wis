import { ShapeBuffer, ShapeType, FillMode, StrokeStyle, OFFSETS } from './shapeBuffer';

/**
 * Wrapper class that provides object-like access to binary shape data
 * while maintaining compatibility with StateProxy reactivity
 */
export class BinaryShapeWrapper {
    private buffer: ArrayBuffer;
    private view: DataView;
    public readonly id: string;

    constructor(buffer: ArrayBuffer, id: string) {
        this.buffer = buffer;
        this.view = new DataView(buffer);
        this.id = id;
        
        // Bind DataView methods to maintain proper context when accessed through Proxy
        this.getUint8 = DataView.prototype.getUint8.bind(this.view);
        this.setUint8 = DataView.prototype.setUint8.bind(this.view);
        this.getFloat32 = DataView.prototype.getFloat32.bind(this.view);
        this.setFloat32 = DataView.prototype.setFloat32.bind(this.view);
    }

    // Bound DataView methods
    private getUint8: (byteOffset: number) => number;
    private setUint8: (byteOffset: number, value: number) => void;
    private getFloat32: (byteOffset: number, littleEndian?: boolean) => number;
    private setFloat32: (byteOffset: number, value: number, littleEndian?: boolean) => void;

    /**
     * Get the underlying buffer for performance-critical operations
     */
    getBuffer(): ArrayBuffer {
        return this.buffer;
    }

    /**
     * Shape type (read-only)
     */
    get type(): string {
        const shapeType = this.getUint8(OFFSETS.TYPE);
        switch (shapeType) {
            case ShapeType.RECTANGLE: return 'rectangle';
            case ShapeType.LINE: return 'line';
            case ShapeType.CIRCLE: return 'circle';
            case ShapeType.BEZIER: return 'bezier';
            default: return 'rectangle';
        }
    }

    /**
     * Fill mode
     */
    get fillMode(): 'stroke' | 'fill' | 'both' {
        const flags = this.getUint8(OFFSETS.FLAGS);
        const fillMode = flags & 0x3;
        switch (fillMode) {
            case FillMode.STROKE: return 'stroke';
            case FillMode.FILL: return 'fill';
            case FillMode.BOTH: return 'both';
            default: return 'stroke';
        }
    }

    set fillMode(value: 'stroke' | 'fill' | 'both') {
        const flags = this.getUint8(OFFSETS.FLAGS);
        const strokeStyle = (flags >> 2) & 0x3;
        let fillModeValue: number;
        
        switch (value) {
            case 'stroke': fillModeValue = FillMode.STROKE; break;
            case 'fill': fillModeValue = FillMode.FILL; break;
            case 'both': fillModeValue = FillMode.BOTH; break;
            default: fillModeValue = FillMode.STROKE; break;
        }
        
        const newFlags = (fillModeValue & 0x3) | ((strokeStyle & 0x3) << 2);
        this.setUint8(OFFSETS.FLAGS, newFlags);
    }

    /**
     * Stroke style
     */
    get strokeStyle(): 'solid' | 'dotted' {
        const flags = this.view.getUint8(OFFSETS.FLAGS);
        const strokeStyle = (flags >> 2) & 0x3;
        return strokeStyle === StrokeStyle.DOTTED ? 'dotted' : 'solid';
    }

    set strokeStyle(value: 'solid' | 'dotted') {
        const flags = this.view.getUint8(OFFSETS.FLAGS);
        const fillMode = flags & 0x3;
        const strokeStyleValue = value === 'dotted' ? StrokeStyle.DOTTED : StrokeStyle.SOLID;
        
        const newFlags = (fillMode & 0x3) | ((strokeStyleValue & 0x3) << 2);
        this.view.setUint8(OFFSETS.FLAGS, newFlags);
    }

    /**
     * Stroke width
     */
    get strokeWidth(): number {
        return this.view.getFloat32(OFFSETS.STROKE_WIDTH, true);
    }

    set strokeWidth(value: number) {
        this.view.setFloat32(OFFSETS.STROKE_WIDTH, value, true);
    }

    /**
     * Stroke color
     */
    get strokeColor(): string {
        return ShapeBuffer.readColor(this.buffer, OFFSETS.STROKE_COLOR);
    }

    set strokeColor(value: string) {
        this.writeColor(OFFSETS.STROKE_COLOR, value);
    }

    /**
     * Fill color
     */
    get fillColor(): string {
        return ShapeBuffer.readColor(this.buffer, OFFSETS.FILL_COLOR);
    }

    set fillColor(value: string) {
        this.writeColor(OFFSETS.FILL_COLOR, value);
    }

    /**
     * Legacy color property (maps to strokeColor for compatibility)
     */
    get color(): string {
        return this.strokeColor;
    }

    set color(value: string) {
        this.strokeColor = value;
    }

    // Geometry properties (type-specific)

    /**
     * X coordinate (rectangle, circle) or X1 (line)
     */
    get x(): number {
        return this.view.getFloat32(OFFSETS.GEOMETRY, true);
    }

    set x(value: number) {
        this.view.setFloat32(OFFSETS.GEOMETRY, value, true);
    }

    /**
     * Y coordinate (rectangle, circle) or Y1 (line)
     */
    get y(): number {
        return this.view.getFloat32(OFFSETS.GEOMETRY + 4, true);
    }

    set y(value: number) {
        this.view.setFloat32(OFFSETS.GEOMETRY + 4, value, true);
    }

    /**
     * Width (rectangle only)
     */
    get width(): number {
        if (this.view.getUint8(OFFSETS.TYPE) === ShapeType.RECTANGLE) {
            return this.view.getFloat32(OFFSETS.GEOMETRY + 8, true);
        }
        return 0;
    }

    set width(value: number) {
        if (this.view.getUint8(OFFSETS.TYPE) === ShapeType.RECTANGLE) {
            this.view.setFloat32(OFFSETS.GEOMETRY + 8, value, true);
        }
    }

    /**
     * Height (rectangle only)
     */
    get height(): number {
        if (this.view.getUint8(OFFSETS.TYPE) === ShapeType.RECTANGLE) {
            return this.view.getFloat32(OFFSETS.GEOMETRY + 12, true);
        }
        return 0;
    }

    set height(value: number) {
        if (this.view.getUint8(OFFSETS.TYPE) === ShapeType.RECTANGLE) {
            this.view.setFloat32(OFFSETS.GEOMETRY + 12, value, true);
        }
    }

    /**
     * X1 coordinate (line only)
     */
    get x1(): number {
        if (this.view.getUint8(OFFSETS.TYPE) === ShapeType.LINE) {
            return this.view.getFloat32(OFFSETS.GEOMETRY, true);
        }
        return 0;
    }

    set x1(value: number) {
        if (this.view.getUint8(OFFSETS.TYPE) === ShapeType.LINE) {
            this.view.setFloat32(OFFSETS.GEOMETRY, value, true);
        }
    }

    /**
     * Y1 coordinate (line only)
     */
    get y1(): number {
        if (this.view.getUint8(OFFSETS.TYPE) === ShapeType.LINE) {
            return this.view.getFloat32(OFFSETS.GEOMETRY + 4, true);
        }
        return 0;
    }

    set y1(value: number) {
        if (this.view.getUint8(OFFSETS.TYPE) === ShapeType.LINE) {
            this.view.setFloat32(OFFSETS.GEOMETRY + 4, value, true);
        }
    }

    /**
     * X2 coordinate (line only)
     */
    get x2(): number {
        if (this.view.getUint8(OFFSETS.TYPE) === ShapeType.LINE) {
            return this.view.getFloat32(OFFSETS.GEOMETRY + 8, true);
        }
        return 0;
    }

    set x2(value: number) {
        if (this.view.getUint8(OFFSETS.TYPE) === ShapeType.LINE) {
            this.view.setFloat32(OFFSETS.GEOMETRY + 8, value, true);
        }
    }

    /**
     * Y2 coordinate (line only)
     */
    get y2(): number {
        if (this.view.getUint8(OFFSETS.TYPE) === ShapeType.LINE) {
            return this.view.getFloat32(OFFSETS.GEOMETRY + 12, true);
        }
        return 0;
    }

    set y2(value: number) {
        if (this.view.getUint8(OFFSETS.TYPE) === ShapeType.LINE) {
            this.view.setFloat32(OFFSETS.GEOMETRY + 12, value, true);
        }
    }

    /**
     * Radius (circle only)
     */
    get radius(): number {
        if (this.getUint8(OFFSETS.TYPE) === ShapeType.CIRCLE) {
            return this.getFloat32(OFFSETS.GEOMETRY + 8, true);
        }
        return 0;
    }

    set radius(value: number) {
        if (this.getUint8(OFFSETS.TYPE) === ShapeType.CIRCLE) {
            this.setFloat32(OFFSETS.GEOMETRY + 8, value, true);
        }
    }

    /**
     * Points (bezier only)
     */
    get points(): { x: number; y: number }[] {
        if (this.view.getUint8(OFFSETS.TYPE) === ShapeType.BEZIER) {
            const points = [];
            for (let i = 0; i < 4; i++) {
                const x = this.view.getFloat32(OFFSETS.GEOMETRY + i * 8, true);
                const y = this.view.getFloat32(OFFSETS.GEOMETRY + i * 8 + 4, true);
                points.push({ x, y });
            }
            return points;
        }
        return [];
    }

    set points(value: { x: number; y: number }[]) {
        if (this.view.getUint8(OFFSETS.TYPE) === ShapeType.BEZIER) {
            for (let i = 0; i < 4; i++) {
                const point = value[i] || { x: 0, y: 0 };
                this.view.setFloat32(OFFSETS.GEOMETRY + i * 8, point.x, true);
                this.view.setFloat32(OFFSETS.GEOMETRY + i * 8 + 4, point.y, true);
            }
        }
    }

    /**
     * Write color to buffer at given offset
     */
    private writeColor(offset: number, color: string): void {
        // Parse hex color (#rrggbb or #rgb)
        let hex = color.replace('#', '');
        if (hex.length === 3) {
            hex = hex.split('').map(c => c + c).join('');
        }
        
        const r = parseInt(hex.substr(0, 2), 16) || 0;
        const g = parseInt(hex.substr(2, 2), 16) || 0;
        const b = parseInt(hex.substr(4, 2), 16) || 0;
        const a = 255; // Full opacity
        
        this.view.setUint8(offset, r);
        this.view.setUint8(offset + 1, g);
        this.view.setUint8(offset + 2, b);
        this.view.setUint8(offset + 3, a);
    }
}
