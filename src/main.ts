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
updateTransform(state);

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

    const gridColor = "#444";
    const gridGap = 50;

    ctx.beginPath();
    for (let x = 0; x <= width; x += gridGap) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += gridGap) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
    }
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
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

function updateTransform(state: State) {
    canvas.style.setProperty('--pan-x', `${state.view.panX}px`);
    canvas.style.setProperty('--pan-y', `${state.view.panY}px`);
    canvas.style.setProperty('--zoom', `${state.view.zoom}`);
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
        updateTransform(state);
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
        
        updateTransform(state);
        render(ctx, state);
    }
});

// Set initial cursor
canvas.style.cursor = 'grab';
