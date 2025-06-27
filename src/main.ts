import { initialState, type State } from './state'
import './style.css'

const bgCanvas = document.querySelector<HTMLCanvasElement>('#bg-canvas')!
const bgCtx = bgCanvas.getContext('2d')!

const canvas = document.querySelector<HTMLCanvasElement>('#canvas')!
const ctx = canvas.getContext('2d')!

const canvasContainer = document.querySelector<HTMLDivElement>('#canvas-container')!

const state: State = initialState;

// Setup ResizeObserver for proper canvas resizing
const resizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
        if (entry.target === canvasContainer) {
            resizeCanvases();
            renderBg(bgCtx);
            render(ctx, state);
        }
    }
});

resizeObserver.observe(canvasContainer);

// Initial setup
resizeCanvases();
renderBg(bgCtx);
render(ctx, state);

function resizeCanvases() {
    // Get container dimensions (source of truth)
    const containerWidth = canvasContainer.clientWidth;
    const containerHeight = canvasContainer.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    // Resize both canvases based on container
    [bgCanvas, canvas].forEach(cvs => {
        const width = Math.round(containerWidth * dpr);
        const height = Math.round(containerHeight * dpr);

        if (cvs.width !== width || cvs.height !== height) {
            cvs.width = width;
            cvs.height = height;
        }
    });
}

function renderBg(ctx: CanvasRenderingContext2D) {
    const dpr = window.devicePixelRatio || 1;
    const width = bgCanvas.width / dpr;
    const height = bgCanvas.height / dpr;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Apply view transformations (same as main canvas)
    ctx.translate(state.view.panX, state.view.panY);
    ctx.scale(state.view.zoom, state.view.zoom);

    const gridColor = "#444";
    const gridGap = 50;

    // Calculate visible area to optimize grid rendering
    const startX = Math.floor(-state.view.panX / state.view.zoom / gridGap) * gridGap;
    const startY = Math.floor(-state.view.panY / state.view.zoom / gridGap) * gridGap;
    const endX = startX + (width / state.view.zoom) + gridGap * 2;
    const endY = startY + (height / state.view.zoom) + gridGap * 2;

    ctx.beginPath();
    for (let x = startX; x <= endX; x += gridGap) {
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
    }
    for (let y = startY; y <= endY; y += gridGap) {
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
    }
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1 / state.view.zoom; // Keep line width consistent
    ctx.stroke();
    ctx.restore();
}

function render(ctx: CanvasRenderingContext2D, state: State) {
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Apply view transformations
    ctx.translate(state.view.panX, state.view.panY);
    ctx.scale(state.view.zoom, state.view.zoom);

    // Draw rectangles
    state.scene.rectangles.forEach(r => {
        ctx.fillStyle = '#f00';
        ctx.fillRect(r.x, r.y, r.width, r.height);
    });

    ctx.restore();
}


// Add basic pan and zoom controls
let isPanning = false;
let startX = 0;
let startY = 0;

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) { // Left click
        isPanning = true;
        startX = e.clientX - state.view.panX;
        startY = e.clientY - state.view.panY;
        canvas.style.cursor = 'grabbing';
    }
});

window.addEventListener('mousemove', (e) => {
    if (isPanning) {
        state.view.panX = e.clientX - startX;
        state.view.panY = e.clientY - startY;
        renderBg(bgCtx);
        render(ctx, state);
    }
});

window.addEventListener('mouseup', () => {
    isPanning = false;
    canvas.style.cursor = 'grab';
});

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    
    const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = state.view.zoom * scaleFactor;
    
    // Limit zoom range
    if (newZoom >= 0.1 && newZoom <= 10) {
        // Get mouse position relative to canvas
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Adjust pan to zoom towards mouse position
        state.view.panX = x - (x - state.view.panX) * scaleFactor;
        state.view.panY = y - (y - state.view.panY) * scaleFactor;
        state.view.zoom = newZoom;
        
        renderBg(bgCtx);
        render(ctx, state);
    }
});

// Set initial cursor
canvas.style.cursor = 'grab';
