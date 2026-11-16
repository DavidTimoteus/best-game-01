/**
 * Visual feedback system: particles, radial shockwaves, chain-lightning arcs,
 * dash afterimage trails, and crisp floating world-space damage/combo popups.
 */

export class EffectsManager {
  constructor() {
    this.particles = [];
    this.rings = [];
    this.arcs = [];
    this.popups = [];
    this.afterimages = [];
  }

  clear() {
    this.particles.length = 0;
    this.rings.length = 0;
    this.arcs.length = 0;
    this.popups.length = 0;
    this.afterimages.length = 0;
  }

  emitBurst(x, y, color, count = 14, speedMin = 70, speedMax = 280, size = 3.2, life = 0.45) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.45;
      const speed = speedMin + Math.random() * (speedMax - speedMin);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: size * (0.65 + Math.random() * 0.7),
        life: life * (0.75 + Math.random() * 0.5),
        maxLife: life,
        drag: 3.4,
      });
    }
    if (this.particles.length > 420) {
      this.particles.splice(0, this.particles.length - 420);
    }
  }

  emitSpark(x, y, vx, vy, color, size = 2.6, life = 0.28) {
    this.particles.push({
      x,
      y,
      vx,
      vy,
      color,
      size,
      life,
      maxLife: life,
      drag: 2.2,
    });
  }

  emitRing(x, y, maxRadius, color, width = 3.5, life = 0.42) {
    this.rings.push({
      x,
      y,
      radius: 8,
      maxRadius,
      color,
      width,
      life,
      maxLife: life,
    });
  }

  emitArc(x1, y1, x2, y2, color, life = 0.18) {
    const segments = 6;
    const points = [{ x: x1, y: y1 }];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const jitter = (Math.random() - 0.5) * 24;
      points.push({
        x: x1 + dx * t + nx * jitter,
        y: y1 + dy * t + ny * jitter,
      });
    }
    points.push({ x: x2, y: y2 });
    this.arcs.push({ points, color, life, maxLife: life });
  }

  emitPopup(x, y, text, color = '#FFFFFF', scale = 1.0, life = 0.85) {
    this.popups.push({
      x,
      y,
      vy: -42,
      text,
      color,
      scale,
      life,
      maxLife: life,
    });
    if (this.popups.length > 28) {
      this.popups.shift();
    }
  }

  emitAfterimage(x, y, angle, color, radius = 15, life = 0.28) {
    this.afterimages.push({
      x,
      y,
      angle,
      color,
      radius,
      life,
      maxLife: life,
    });
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      const damp = Math.exp(-p.drag * dt);
      p.vx *= damp;
      p.vy *= damp;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      if (r.life <= 0) {
        this.rings.splice(i, 1);
        continue;
      }
      const progress = 1 - r.life / r.maxLife;
      const eased = 1 - Math.pow(1 - progress, 2.4);
      r.radius = 8 + (r.maxRadius - 8) * eased;
    }

    for (let i = this.arcs.length - 1; i >= 0; i--) {
      this.arcs[i].life -= dt;
      if (this.arcs[i].life <= 0) this.arcs.splice(i, 1);
    }

    for (let i = this.popups.length - 1; i >= 0; i--) {
      const pop = this.popups[i];
      pop.life -= dt;
      if (pop.life <= 0) {
        this.popups.splice(i, 1);
        continue;
      }
      pop.y += pop.vy * dt;
      pop.vy *= Math.exp(-2.8 * dt);
    }

    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      this.afterimages[i].life -= dt;
      if (this.afterimages[i].life <= 0) this.afterimages.splice(i, 1);
    }
  }
}
