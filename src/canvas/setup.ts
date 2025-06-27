export class CanvasSetup {
    private bgCanvas: HTMLCanvasElement;
    private canvas: HTMLCanvasElement;
    private container: HTMLDivElement;
    private resizeCallback?: () => void;

    constructor(
        bgCanvas: HTMLCanvasElement,
        canvas: HTMLCanvasElement,
        container: HTMLDivElement
    ) {
        this.bgCanvas = bgCanvas;
        this.canvas = canvas;
        this.container = container;
    }

    setupResizeObserver(onResize: () => void) {
        this.resizeCallback = onResize;
        
        const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                if (entry.target === this.container) {
                    this.resizeCanvases();
                    this.resizeCallback?.();
                }
            }
        });

        resizeObserver.observe(this.container);
    }

    resizeCanvases() {
        const containerWidth = this.container.clientWidth;
        const containerHeight = this.container.clientHeight;
        const dpr = window.devicePixelRatio || 1;

        [this.bgCanvas, this.canvas].forEach(cvs => {
            const width = Math.round(containerWidth * dpr);
            const height = Math.round(containerHeight * dpr);

            if (cvs.width !== width || cvs.height !== height) {
                cvs.width = width;
                cvs.height = height;
            }
        });
    }

    getCanvasContext() {
        return this.canvas.getContext('2d')!;
    }

    getBgCanvasContext() {
        return this.bgCanvas.getContext('2d')!;
    }

    getCanvas() {
        return this.canvas;
    }

    getBgCanvas() {
        return this.bgCanvas;
    }
}
