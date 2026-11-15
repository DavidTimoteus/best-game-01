// Unified Keyboard & Mouse Input Engine
export class InputManager {
  constructor() {
    this.keys = new Set();
    this.pressed = new Set();
    this.mouse = { x: 640, y: 360, down: false, clicked: false };

    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
  }

  attach(canvas) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
  }

  detach(canvas) {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    if (canvas) {
      canvas.removeEventListener('mousemove', this.onMouseMove);
      canvas.removeEventListener('mousedown', this.onMouseDown);
    }
    window.removeEventListener('mouseup', this.onMouseUp);
  }

  onKeyDown(e) {
    if (!this.keys.has(e.code)) {
      this.pressed.add(e.code);
    }
    this.keys.add(e.code);
  }

  onKeyUp(e) {
    this.keys.delete(e.code);
  }

  onMouseMove(e) {
    const rect = e.target.getBoundingClientRect();
    const scaleX = 1280 / rect.width;
    const scaleY = 720 / rect.height;
    this.mouse.x = (e.clientX - rect.left) * scaleX;
    this.mouse.y = (e.clientY - rect.top) * scaleY;
  }

  onMouseDown() {
    this.mouse.down = true;
    this.mouse.clicked = true;
  }

  onMouseUp() {
    this.mouse.down = false;
  }

  isDown(code) {
    return this.keys.has(code);
  }

  justPressed(code) {
    return this.pressed.has(code);
  }

  clearFrame() {
    this.pressed.clear();
    this.mouse.clicked = false;
  }
}
