import { CANVAS_HEIGHT, CANVAS_WIDTH } from './constants.js';

export class InputController {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.mouseX = CANVAS_WIDTH * 0.62;
    this.mouseY = CANVAS_HEIGHT * 0.5;
    this.mouseDown = false;
    this.dashQueued = false;
    this.novaQueued = false;

    this._onKeyDown = (e) => this.handleKeyDown(e);
    this._onKeyUp = (e) => this.handleKeyUp(e);
    this._onMouseMove = (e) => this.handleMouseMove(e);
    this._onMouseDown = (e) => this.handleMouseDown(e);
    this._onMouseUp = (e) => this.handleMouseUp(e);
    this._onContextMenu = (e) => e.preventDefault();

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    canvas.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
    canvas.addEventListener('contextmenu', this._onContextMenu);
  }

  handleKeyDown(e) {
    const code = e.code;
    this.keys.add(code);
    if (code === 'Space') {
      this.dashQueued = true;
      e.preventDefault();
    } else if (code === 'KeyE' || code === 'KeyQ') {
      this.novaQueued = true;
    }
  }

  handleKeyUp(e) {
    this.keys.delete(e.code);
  }

  handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    this.mouseX = ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
    this.mouseY = ((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
  }

  handleMouseDown(e) {
    this.handleMouseMove(e);
    if (e.button === 0) {
      this.mouseDown = true;
    } else if (e.button === 2) {
      this.dashQueued = true;
    }
  }

  handleMouseUp(e) {
    if (e.button === 0) {
      this.mouseDown = false;
    }
  }

  getMoveVector() {
    let dx = 0;
    let dy = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) dy -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) dy += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) dx -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) dx += 1;
    const mag = Math.hypot(dx, dy);
    if (mag > 0) {
      dx /= mag;
      dy /= mag;
    }
    return { x: dx, y: dy };
  }

  consumeDash() {
    const queued = this.dashQueued;
    this.dashQueued = false;
    return queued;
  }

  consumeNova() {
    const queued = this.novaQueued;
    this.novaQueued = false;
    return queued;
  }

  resetActionQueues() {
    this.dashQueued = false;
    this.novaQueued = false;
    this.mouseDown = false;
  }
}
