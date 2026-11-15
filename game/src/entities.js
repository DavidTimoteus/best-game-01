// Game Entities for Grid Prism: Polarity Protocol
import {
  POLARITY_CYAN,
  POLARITY_AMBER,
  COLOR_CYAN,
  COLOR_AMBER,
  COLOR_MAGENTA,
  PLAYER_SPEED,
  PLAYER_DASH_SPEED,
  PLAYER_DASH_DURATION,
  PLAYER_DASH_COOLDOWN,
  PLAYER_MAX_SHIELD,
  VIEW_WIDTH,
  VIEW_HEIGHT,
} from './config.js';

export class Player {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = VIEW_WIDTH / 2;
    this.y = VIEW_HEIGHT / 2;
    this.vx = 0;
    this.vy = 0;
    this.radius = 18;
    this.angle = 0;
    this.polarity = POLARITY_CYAN;
    this.shield = PLAYER_MAX_SHIELD;
    this.energy = 0;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.combo = 0;
    this.score = 0;
    this.absorbedCount = 0;
    this.isDashing = false;
    this.trail = [];
  }

  togglePolarity() {
    this.polarity = this.polarity === POLARITY_CYAN ? POLARITY_AMBER : POLARITY_CYAN;
  }

  triggerDash() {
    if (this.dashCooldown <= 0) {
      this.dashTimer = PLAYER_DASH_DURATION;
      this.dashCooldown = PLAYER_DASH_COOLDOWN;
      this.isDashing = true;
      return true;
    }
    return false;
  }

  update(dt, input) {
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      if (this.dashTimer <= 0) this.isDashing = false;
    }

    let mx = 0;
    let my = 0;
    if (input.isDown('KeyW') || input.isDown('ArrowUp')) my -= 1;
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) my += 1;
    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) mx -= 1;
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) mx += 1;

    const len = Math.hypot(mx, my);
    if (len > 0) {
      mx /= len;
      my /= len;
      this.angle = Math.atan2(my, mx);
    }

    const currentSpeed = this.isDashing ? PLAYER_DASH_SPEED : PLAYER_SPEED;
    this.vx = mx * currentSpeed;
    this.vy = my * currentSpeed;

    this.x = Math.max(this.radius, Math.min(VIEW_WIDTH - this.radius, this.x + this.vx * dt));
    this.y = Math.max(this.radius, Math.min(VIEW_HEIGHT - this.radius, this.y + this.vy * dt));

    // Record trail
    this.trail.unshift({ x: this.x, y: this.y, alpha: 1, polarity: this.polarity });
    if (this.trail.length > 8) this.trail.pop();
    for (let i = 0; i < this.trail.length; i++) {
      this.trail[i].alpha *= 0.85;
    }
  }

  render(ctx) {
    const color = this.polarity === POLARITY_CYAN ? COLOR_CYAN : COLOR_AMBER;

    // Draw trail
    ctx.save();
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const t = this.trail[i];
      const trailColor = t.polarity === POLARITY_CYAN ? COLOR_CYAN : COLOR_AMBER;
      ctx.globalAlpha = t.alpha * 0.4;
      ctx.strokeStyle = trailColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(t.x, t.y, this.radius * (0.4 + (1 - i / this.trail.length) * 0.6), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // Draw player prism ship
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    ctx.shadowColor = color;
    ctx.shadowBlur = this.isDashing ? 25 : 12;

    // Triangular aerodynamic prism
    ctx.beginPath();
    ctx.moveTo(this.radius * 1.3, 0);
    ctx.lineTo(-this.radius * 0.9, -this.radius * 0.8);
    ctx.lineTo(-this.radius * 0.5, 0);
    ctx.lineTo(-this.radius * 0.9, this.radius * 0.8);
    ctx.closePath();

    ctx.fillStyle = this.isDashing ? '#ffffff' : color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Center core
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();
  }
}

export class EnergyNode {
  constructor(x, y, polarity, vx, vy) {
    this.x = x;
    this.y = y;
    this.polarity = polarity;
    this.vx = vx;
    this.vy = vy;
    this.radius = 12;
    this.pulse = Math.random() * Math.PI * 2;
    this.active = true;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.pulse += dt * 5;
  }

  render(ctx) {
    const color = this.polarity === POLARITY_CYAN ? COLOR_CYAN : COLOR_AMBER;
    const r = this.radius + Math.sin(this.pulse) * 2.5;

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }
}

export class HazardBarrier {
  constructor(x, y, angle, length, polarity, rotSpeed = 1) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.length = length;
    this.polarity = polarity; // POLARITY_CYAN, POLARITY_AMBER, or 2 (neutral magenta hazard)
    this.rotSpeed = rotSpeed;
    this.active = true;
  }

  update(dt) {
    this.angle += this.rotSpeed * dt;
  }

  render(ctx) {
    const color =
      this.polarity === POLARITY_CYAN
        ? COLOR_CYAN
        : this.polarity === POLARITY_AMBER
        ? COLOR_AMBER
        : COLOR_MAGENTA;

    const hx = Math.cos(this.angle) * (this.length / 2);
    const hy = Math.sin(this.angle) * (this.length / 2);

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(this.x - hx, this.y - hy);
    ctx.lineTo(this.x + hx, this.y + hy);
    ctx.stroke();

    // Node caps
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.x - hx, this.y - hy, 4, 0, Math.PI * 2);
    ctx.arc(this.x + hx, this.y + hy, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export class SingularityNexusBoss {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 48;
    this.shield = 100;
    this.maxShield = 100;
    this.rotInner = 0;
    this.rotOuter = 0;
    this.pulse = 0;
    this.active = true;
  }

  update(dt) {
    this.rotInner += dt * 1.5;
    this.rotOuter -= dt * 0.9;
    this.pulse += dt * 4;
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Outer rotating amber ring
    ctx.save();
    ctx.rotate(this.rotOuter);
    ctx.strokeStyle = COLOR_AMBER;
    ctx.shadowColor = COLOR_AMBER;
    ctx.shadowBlur = 20;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const r = this.radius * 1.5 + Math.sin(this.pulse + i) * 4;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // Inner rotating cyan octagon
    ctx.save();
    ctx.rotate(this.rotInner);
    ctx.strokeStyle = COLOR_CYAN;
    ctx.shadowColor = COLOR_CYAN;
    ctx.shadowBlur = 18;
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const r = this.radius;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // Core pulsing singularity
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = COLOR_MAGENTA;
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(0, 0, 16 + Math.sin(this.pulse * 2) * 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
