/**
 * Binary shape buffer factory and utilities
 * 
 * Memory layout:
 * byte 0: ShapeType (uint8)
 * byte 1: Flags (uint8) - fillMode, strokeStyle bits
 * bytes 4-7: strokeWidth (float32)
 * bytes 8-23: RGBA stroke + fill (8×uint8)
 * bytes 24-N: Geometry (float32[])
 */

export const ShapeType = {
    RECTANGLE: 0,
    LINE: 1,
    CIRCLE: 2,
    BEZIER: 3
} as const;

export type ShapeType = typeof ShapeType[keyof typeof ShapeType];

export const FillMode = {
    STROKE: 0,
    FILL: 1,
    BOTH: 2
} as const;

export type FillMode = typeof FillMode[keyof typeof FillMode];

export const StrokeStyle = {
    SOLID: 0,
    DOTTED: 1
} as const;

export type StrokeStyle = typeof StrokeStyle[keyof typeof StrokeStyle];

// Buffer sizes for each shape type
export const BUFFER_SIZES = {
    [ShapeType.RECTANGLE]: 40, // 24 + 16 (x, y, width, height)
    [ShapeType.LINE]: 40,      // 24 + 16 (x1, y1, x2, y2)
    [ShapeType.CIRCLE]: 36,    // 24 + 12 (x, y, radius)
    [ShapeType.BEZIER]: 56     // 24 + 32 (4 points × 2 coords)
} as const;

// Common offsets
export const OFFSETS = {
    TYPE: 0,
    FLAGS: 1,
    STROKE_WIDTH: 4,
    STROKE_COLOR: 8,    // 4 bytes RGBA
    FILL_COLOR: 12,     // 4 bytes RGBA
    GEOMETRY: 24
} as const;

export interface StyleData {
    fillMode: 'stroke' | 'fill' | 'both';
    strokeColor: string;
    fillColor: string;
    strokeStyle: 'solid' | 'dotted';
    strokeWidth: number;
}

/**
 * Utility functions for working with shape buffers
 */
export class ShapeBuffer {
    /**
     * Create a rectangle buffer
     */
    static createRectangle(
        id: string,
        x: number,
        y: number,
        width: number,
        height: number,
        styles: StyleData
    ): ArrayBuffer {
        const buffer = new ArrayBuffer(BUFFER_SIZES[ShapeType.RECTANGLE]);
        const view = new DataView(buffer);
        
        this.writeCommonData(view, ShapeType.RECTANGLE, styles);
        
        // Geometry: x, y, width, height
        view.setFloat32(OFFSETS.GEOMETRY, x, true);
        view.setFloat32(OFFSETS.GEOMETRY + 4, y, true);
        view.setFloat32(OFFSETS.GEOMETRY + 8, width, true);
        view.setFloat32(OFFSETS.GEOMETRY + 12, height, true);
        
        return buffer;
    }

    /**
     * Create a line buffer
     */
    static createLine(
        id: string,
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        styles: StyleData
    ): ArrayBuffer {
        const buffer = new ArrayBuffer(BUFFER_SIZES[ShapeType.LINE]);
        const view = new DataView(buffer);
        
        this.writeCommonData(view, ShapeType.LINE, styles);
        
        // Geometry: x1, y1, x2, y2
        view.setFloat32(OFFSETS.GEOMETRY, x1, true);
        view.setFloat32(OFFSETS.GEOMETRY + 4, y1, true);
        view.setFloat32(OFFSETS.GEOMETRY + 8, x2, true);
        view.setFloat32(OFFSETS.GEOMETRY + 12, y2, true);
        
        return buffer;
    }

    /**
     * Create a circle buffer
     */
    static createCircle(
        id: string,
        x: number,
        y: number,
        radius: number,
        styles: StyleData
    ): ArrayBuffer {
        const buffer = new ArrayBuffer(BUFFER_SIZES[ShapeType.CIRCLE]);
        const view = new DataView(buffer);
        
        this.writeCommonData(view, ShapeType.CIRCLE, styles);
        
        // Geometry: x, y, radius
        view.setFloat32(OFFSETS.GEOMETRY, x, true);
        view.setFloat32(OFFSETS.GEOMETRY + 4, y, true);
        view.setFloat32(OFFSETS.GEOMETRY + 8, radius, true);
        
        return buffer;
    }

    /**
     * Create a bezier curve buffer
     */
    static createBezier(
        id: string,
        points: { x: number; y: number }[],
        styles: StyleData
    ): ArrayBuffer {
        const buffer = new ArrayBuffer(BUFFER_SIZES[ShapeType.BEZIER]);
        const view = new DataView(buffer);
        
        this.writeCommonData(view, ShapeType.BEZIER, styles);
        
        // Geometry: 4 points (p0, cp1, cp2, p1)
        for (let i = 0; i < 4; i++) {
            const point = points[i] || { x: 0, y: 0 };
            view.setFloat32(OFFSETS.GEOMETRY + i * 8, point.x, true);
            view.setFloat32(OFFSETS.GEOMETRY + i * 8 + 4, point.y, true);
        }
        
        return buffer;
    }

    /**
     * Write common shape data (type, flags, colors, stroke width)
     */
    private static writeCommonData(view: DataView, type: ShapeType, styles: StyleData): void {
        // Type
        view.setUint8(OFFSETS.TYPE, type);
        
        // Flags (pack fillMode and strokeStyle into single byte)
        const fillModeValue = this.getFillModeValue(styles.fillMode);
        const strokeStyleValue = this.getStrokeStyleValue(styles.strokeStyle);
        const flags = (fillModeValue & 0x3) | ((strokeStyleValue & 0x3) << 2);
        view.setUint8(OFFSETS.FLAGS, flags);
        
        // Stroke width
        view.setFloat32(OFFSETS.STROKE_WIDTH, styles.strokeWidth, true);
        
        // Colors (convert hex to RGBA bytes)
        this.writeColor(view, OFFSETS.STROKE_COLOR, styles.strokeColor);
        this.writeColor(view, OFFSETS.FILL_COLOR, styles.fillColor);
    }

    /**
     * Convert fillMode string to enum value
     */
    private static getFillModeValue(fillMode: string): number {
        switch (fillMode) {
            case 'stroke': return FillMode.STROKE;
            case 'fill': return FillMode.FILL;
            case 'both': return FillMode.BOTH;
            default: return FillMode.STROKE;
        }
    }

    /**
     * Convert strokeStyle string to enum value
     */
    private static getStrokeStyleValue(strokeStyle: string): number {
        switch (strokeStyle) {
            case 'solid': return StrokeStyle.SOLID;
            case 'dotted': return StrokeStyle.DOTTED;
            default: return StrokeStyle.SOLID;
        }
    }

    /**
     * Write color as RGBA bytes
     */
    private static writeColor(view: DataView, offset: number, color: string): void {
        // Parse hex color (#rrggbb or #rgb)
        let hex = color.replace('#', '');
        if (hex.length === 3) {
            hex = hex.split('').map(c => c + c).join('');
        }
        
        const r = parseInt(hex.substr(0, 2), 16) || 0;
        const g = parseInt(hex.substr(2, 2), 16) || 0;
        const b = parseInt(hex.substr(4, 2), 16) || 0;
        const a = 255; // Full opacity
        
        view.setUint8(offset, r);
        view.setUint8(offset + 1, g);
        view.setUint8(offset + 2, b);
        view.setUint8(offset + 3, a);
    }

    /**
     * Read common data from buffer
     */
    static readType(buffer: ArrayBuffer): ShapeType {
        const view = new DataView(buffer);
        return view.getUint8(OFFSETS.TYPE) as ShapeType;
    }

    static readFlags(buffer: ArrayBuffer): { fillMode: FillMode; strokeStyle: StrokeStyle } {
        const view = new DataView(buffer);
        const flags = view.getUint8(OFFSETS.FLAGS);
        return {
            fillMode: (flags & 0x3) as FillMode,
            strokeStyle: ((flags >> 2) & 0x3) as StrokeStyle
        };
    }

    static readStrokeWidth(buffer: ArrayBuffer): number {
        const view = new DataView(buffer);
        return view.getFloat32(OFFSETS.STROKE_WIDTH, true);
    }

    static readColor(buffer: ArrayBuffer, offset: number): string {
        const view = new DataView(buffer);
        const r = view.getUint8(offset);
        const g = view.getUint8(offset + 1);
        const b = view.getUint8(offset + 2);
        
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
}
