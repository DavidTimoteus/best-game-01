/**
 * Keyboard and pointer input controller supporting movement, aiming, firing,
 * polarity shifting, dash, overdrive nova, draft choices, and restart.
 */

import { ARENA_HEIGHT, ARENA_WIDTH } from './config.js';

export class InputController {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();
    this.mouseX = ARENA_WIDTH * 0.72;
    this.mouseY = ARENA_HEIGHT * 0.5;
    this.mouseDown = false;
    this.rightClicked = false;
    this.clickPos = null;
    this.autoFire = false;

    this._onKeyDown = this._handleKeyDown.bind(this);
    this._onKeyUp = this._handleKeyUp.bind(this);
    this._onMouseMove = this._handleMouseMove.bind(this);
    this._onMouseDown = this._handleMouseDown.bind(this);
    this._onMouseUp = this._handleMouseUp.bind(this);
    this._onContextMenu = (e) => e.preventDefault();

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    canvas.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
    canvas.addEventListener('contextmenu', this._onContextMenu);
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this.canvas.removeEventListener('mousemove', this._onMouseMove);
    this.canvas.removeEventListener('mousedown', this._onMouseDown);
    window.removeEventListener('mouseup', this._onMouseUp);
    this.canvas.removeEventListener('contextmenu', this._onContextMenu);
  }

  _toArenaCoords(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return { x: this.mouseX, y: this.mouseY };
    return {
      x: ((clientX - rect.left) / rect.width) * ARENA_WIDTH,
      y: ((clientY - rect.top) / rect.height) * ARENA_HEIGHT,
    };
  }

  _handleKeyDown(e) {
    const code = e.code;
    if (
      code === 'Space' ||
      code === 'ArrowUp' ||
      code === 'ArrowDown' ||
      code === 'ArrowLeft' ||
      code === 'ArrowRight'
    ) {
      e.preventDefault();
    }
    if (!this.keys.has(code)) {
      this.pressed.add(code);
    }
    this.keys.add(code);
  }

  _handleKeyUp(e) {
    this.keys.delete(e.code);
  }

  _handleMouseMove(e) {
    const pt = this._toArenaCoords(e.clientX, e.clientY);
    this.mouseX = pt.x;
    this.mouseY = pt.y;
  }

  _handleMouseDown(e) {
    const pt = this._toArenaCoords(e.clientX, e.clientY);
    this.mouseX = pt.x;
    this.mouseY = pt.y;
    if (e.button === 0) {
      this.mouseDown = true;
      this.clickPos = pt;
    } else if (e.button === 2) {
      this.rightClicked = true;
    }
  }

  _handleMouseUp(e) {
    if (e.button === 0) {
      this.mouseDown = false;
    }
  }

  getMoveVector() {
    let x = 0;
    let y = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  consumePress(code) {
    if (!this.pressed.has(code)) return false;
    this.pressed.delete(code);
    return true;
  }

  consumeShift() {
    const viaKey =
      this.consumePress('KeyQ') ||
      this.consumePress('KeyE') ||
      this.consumePress('ShiftLeft') ||
      this.consumePress('ShiftRight');
    const viaMouse = this.rightClicked;
    this.rightClicked = false;
    return viaKey || viaMouse;
  }

  consumeClick() {
    const pt = this.clickPos;
    this.clickPos = null;
    return pt;
  }

  endFrame() {
    this.pressed.clear();
    this.rightClicked = false;
    this.clickPos = null;
  }
}
