import { initialState, type State } from './state'
import './style.css'

const bgCanvas = document.querySelector<HTMLCanvasElement>('#bg-canvas')!
const bgCtx = bgCanvas.getContext('2d')!

const canvas = document.querySelector<HTMLCanvasElement>('#canvas')!
const ctx = bgCanvas.getContext('2d')!

// const canvasContainer = document.querySelector<HTMLDivElement>('#canvas-container')!

const state: State = initialState;

// const { updateTransform } = setupView(canvasContainer)


// resizeCanvas(bgCanvas)
renderBg(bgCtx)
render(ctx, state)
// updateTransform(state)

setInterval(() => {
    // resizeCanvas(bgCanvas)
    renderBg(bgCtx)
    render(ctx, state)
    // updateTransform(state)
}, 1000)

// function resizeCanvas(canvas: HTMLCanvasElement) {
//     // get display size in CSS pixels
//     const rect = canvas.getBoundingClientRect();
//     const dpr = window.devicePixelRatio || 1;
//
//     // calculate the size in actual device pixels
//     const width = Math.round(rect.width * dpr);
//     const height = Math.round(rect.height * dpr);
//
//     // only resize if changed
//     if (canvas.width !== width || canvas.height !== height) {
//         canvas.width = width;
//         canvas.height = height;
//     }
//
//     // scale the drawing context so your draw calls use CSS px units
//     const ctx = canvas.getContext('2d')!;
//     ctx.resetTransform();           // clear any old scale
//     ctx.scale(dpr, dpr);
// }


function renderBg(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = Math.random() < 0.5 ? '#f00' : '#0f0'
    ctx.fillRect(100, 100, 200, 200)
}

function render(ctx: CanvasRenderingContext2D, state: State) {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    state.scene.rectangles.forEach(r => {
        ctx.fillStyle = '#f00'
        ctx.fillRect(r.x, r.y, r.width, r.height)
    })
}
