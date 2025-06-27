import { initialState, type State, type Tool, type Rectangle, type Line, type Circle } from './state'
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

    // Draw lines
    ctx.strokeStyle = '#0080ff';
    ctx.lineWidth = 2;
    state.scene.lines.forEach(line => {
        ctx.beginPath();
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
        ctx.stroke();
    });

    // Draw rectangles
    ctx.fillStyle = '#f00';
    state.scene.rectangles.forEach(r => {
        ctx.fillRect(r.x, r.y, r.width, r.height);
    });

    // Draw circles
    ctx.strokeStyle = '#00ff80';
    ctx.fillStyle = 'transparent';
    ctx.lineWidth = 2;
    state.scene.circles.forEach(circle => {
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
        ctx.stroke();
    });

    // Draw current drawing preview
    if (state.currentDrawing.shape && state.currentDrawing.type) {
        ctx.save();
        ctx.setLineDash([5, 5]);
        ctx.globalAlpha = 0.6;

        switch (state.currentDrawing.type) {
            case 'line':
                const line = state.currentDrawing.shape as Line;
                ctx.strokeStyle = '#0080ff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(line.x1, line.y1);
                ctx.lineTo(line.x2, line.y2);
                ctx.stroke();
                break;
            case 'rectangle':
                const rect = state.currentDrawing.shape as Rectangle;
                ctx.fillStyle = '#f00';
                ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
                break;
            case 'circle':
                const circle = state.currentDrawing.shape as Circle;
                ctx.strokeStyle = '#00ff80';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
                ctx.stroke();
                break;
        }
        ctx.restore();
    }

    ctx.restore();
}

// Convert screen coordinates to world coordinates
function screenToWorld(screenX: number, screenY: number) {
    const rect = canvas.getBoundingClientRect();
    const x = screenX - rect.left;
    const y = screenY - rect.top;
    
    return {
        x: (x - state.view.panX) / state.view.zoom,
        y: (y - state.view.panY) / state.view.zoom
    };
}

// Tool selection
const toolButtons = document.querySelectorAll<HTMLButtonElement>('.tool-btn');
toolButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const tool = btn.dataset.tool as Tool;
        state.tool = tool;
        
        // Update active button
        toolButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update cursor
        canvas.style.cursor = tool === 'pan' ? 'grab' : 'crosshair';
    });
});

// Mouse handling
let isPanning = false;
let isDrawing = false;
let startX = 0;
let startY = 0;
let startWorldX = 0;
let startWorldY = 0;

canvas.addEventListener('mousedown', (e) => {
    if (state.tool === 'pan') {
        if (e.button === 0) { // Left click
            isPanning = true;
            startX = e.clientX - state.view.panX;
            startY = e.clientY - state.view.panY;
            canvas.style.cursor = 'grabbing';
        }
    } else {
        if (e.button === 0) { // Left click for drawing
            isDrawing = true;
            const worldPos = screenToWorld(e.clientX, e.clientY);
            startWorldX = worldPos.x;
            startWorldY = worldPos.y;
            
            // Initialize current drawing
            switch (state.tool) {
                case 'line':
                    state.currentDrawing.shape = {
                        x1: startWorldX,
                        y1: startWorldY,
                        x2: startWorldX,
                        y2: startWorldY
                    };
                    state.currentDrawing.type = 'line';
                    break;
                case 'rectangle':
                    state.currentDrawing.shape = {
                        x: startWorldX,
                        y: startWorldY,
                        width: 0,
                        height: 0
                    };
                    state.currentDrawing.type = 'rectangle';
                    break;
                case 'circle':
                    state.currentDrawing.shape = {
                        x: startWorldX,
                        y: startWorldY,
                        radius: 0
                    };
                    state.currentDrawing.type = 'circle';
                    break;
            }
        }
    }
});

window.addEventListener('mousemove', (e) => {
    if (isPanning) {
        state.view.panX = e.clientX - startX;
        state.view.panY = e.clientY - startY;
        renderBg(bgCtx);
        render(ctx, state);
    } else if (isDrawing && state.currentDrawing.shape) {
        const worldPos = screenToWorld(e.clientX, e.clientY);
        
        switch (state.tool) {
            case 'line':
                const line = state.currentDrawing.shape as Line;
                line.x2 = worldPos.x;
                line.y2 = worldPos.y;
                break;
            case 'rectangle':
                const rect = state.currentDrawing.shape as Rectangle;
                rect.x = Math.min(startWorldX, worldPos.x);
                rect.y = Math.min(startWorldY, worldPos.y);
                rect.width = Math.abs(worldPos.x - startWorldX);
                rect.height = Math.abs(worldPos.y - startWorldY);
                break;
            case 'circle':
                const circle = state.currentDrawing.shape as Circle;
                const dx = worldPos.x - startWorldX;
                const dy = worldPos.y - startWorldY;
                circle.radius = Math.sqrt(dx * dx + dy * dy);
                break;
        }
        
        render(ctx, state);
    }
});

window.addEventListener('mouseup', () => {
    if (isPanning) {
        isPanning = false;
        canvas.style.cursor = 'grab';
    } else if (isDrawing && state.currentDrawing.shape) {
        // Add the completed shape to the scene
        switch (state.currentDrawing.type) {
            case 'line':
                state.scene.lines.push(state.currentDrawing.shape as Line);
                break;
            case 'rectangle':
                const rect = state.currentDrawing.shape as Rectangle;
                // Only add if it has some size
                if (rect.width > 1 || rect.height > 1) {
                    state.scene.rectangles.push(rect);
                }
                break;
            case 'circle':
                const circle = state.currentDrawing.shape as Circle;
                // Only add if it has some radius
                if (circle.radius > 1) {
                    state.scene.circles.push(circle);
                }
                break;
        }
        
        // Clear current drawing
        state.currentDrawing.shape = null;
        state.currentDrawing.type = null;
        isDrawing = false;
        
        render(ctx, state);
    }
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
