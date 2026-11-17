import { ARENA_BOUNDS } from './constants.js';

export class Projectile {
  constructor(opts) {
    this.x = opts.x;
    this.y = opts.y;
    this.vx = Math.cos(opts.angle) * opts.speed;
    this.vy = Math.sin(opts.angle) * opts.speed;
    this.speed = opts.speed;
    this.angle = opts.angle;
    this.radius = opts.radius || 7;
    this.fromPlayer = Boolean(opts.fromPlayer);
    this.damage = opts.damage || 18;
    this.color = opts.color || '#f7c948';
    this.bouncesLeft = opts.bouncesLeft || 0;
    this.explosive = Boolean(opts.explosive);
    this.parried = Boolean(opts.parried);
    this.homing = Boolean(opts.homing);
    this.life = opts.life || 2.6;
    this.trail = [];
  }

  update(dt, enemies, pillars) {
    this.life -= dt;
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 6) this.trail.shift();

    if (this.homing && this.fromPlayer && enemies.length > 0) {
      let best = null;
      let bestDist = 360;
      for (const e of enemies) {
        const d = Math.hypot(e.x - this.x, e.y - this.y);
        if (d < bestDist) {
          bestDist = d;
          best = e;
        }
      }
      if (best) {
        const desired = Math.atan2(best.y - this.y, best.x - this.x);
        const current = Math.atan2(this.vy, this.vx);
        let diff = desired - current;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const turn = Math.max(-5.5 * dt, Math.min(5.5 * dt, diff));
        const nextAng = current + turn;
        this.vx = Math.cos(nextAng) * this.speed;
        this.vy = Math.sin(nextAng) * this.speed;
        this.angle = nextAng;
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Arena boundary bounce or expire
    let bounced = false;
    if (this.x - this.radius < ARENA_BOUNDS.left || this.x + this.radius > ARENA_BOUNDS.right) {
      if (this.bouncesLeft > 0) {
        this.vx *= -1;
        this.x = Math.max(ARENA_BOUNDS.left + this.radius, Math.min(ARENA_BOUNDS.right - this.radius, this.x));
        this.bouncesLeft--;
        bounced = true;
      } else {
        return { alive: false, hitWall: true };
      }
    }
    if (this.y - this.radius < ARENA_BOUNDS.top || this.y + this.radius > ARENA_BOUNDS.bottom) {
      if (this.bouncesLeft > 0) {
        this.vy *= -1;
        this.y = Math.max(ARENA_BOUNDS.top + this.radius, Math.min(ARENA_BOUNDS.bottom - this.radius, this.y));
        this.bouncesLeft--;
        bounced = true;
      } else {
        return { alive: false, hitWall: true };
      }
    }
    if (bounced) {
      this.angle = Math.atan2(this.vy, this.vx);
    }

    // Pillar collision
    for (const p of pillars) {
      const dx = this.x - p.x;
      const dy = this.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist < this.radius + p.radius) {
        if (this.parried || this.explosive) {
          p.ignite();
        }
        if (this.bouncesLeft > 0 && dist > 0) {
          const nx = dx / dist;
          const ny = dy / dist;
          const dot = this.vx * nx + this.vy * ny;
          this.vx -= 2 * dot * nx;
          this.vy -= 2 * dot * ny;
          this.x = p.x + nx * (p.radius + this.radius + 1);
          this.y = p.y + ny * (p.radius + this.radius + 1);
          this.angle = Math.atan2(this.vy, this.vx);
          this.bouncesLeft--;
        } else {
          return { alive: false, hitPillar: p };
        }
      }
    }

    return { alive: this.life > 0, hitWall: false };
  }
}

export class HazardFlask {
  constructor(startX, startY, targetX, targetY) {
    this.startX = startX;
    this.startY = startY;
    this.targetX = Math.max(ARENA_BOUNDS.left + 44, Math.min(ARENA_BOUNDS.right - 44, targetX));
    this.targetY = Math.max(ARENA_BOUNDS.top + 44, Math.min(ARENA_BOUNDS.bottom - 44, targetY));
    this.progress = 0;
    this.duration = 0.72;
    this.x = startX;
    this.y = startY;
    this.z = 0;
  }

  update(dt) {
    this.progress += dt / this.duration;
    const t = Math.min(1, this.progress);
    this.x = this.startX + (this.targetX - this.startX) * t;
    this.y = this.startY + (this.targetY - this.startY) * t;
    this.z = Math.sin(t * Math.PI) * 68;
    return this.progress >= 1;
  }
}

export class HazardPool {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 48;
    this.life = 4.2;
    this.maxLife = 4.2;
    this.tickTimer = 0;
  }

  update(dt) {
    this.life -= dt;
    this.tickTimer += dt;
    return this.life > 0;
  }
}

export class ShockwaveRing {
  constructor(x, y, maxRadius, color = '#f7c948', duration = 0.34, lineWidth = 5) {
    this.x = x;
    this.y = y;
    this.maxRadius = maxRadius;
    this.color = color;
    this.duration = duration;
    this.age = 0;
    this.lineWidth = lineWidth;
  }

  update(dt) {
    this.age += dt;
    return this.age < this.duration;
  }
}

export class LightningArc {
  constructor(points, color = '#76e8ff') {
    this.points = points;
    this.color = color;
    this.life = 0.16;
    this.maxLife = 0.16;
  }

  update(dt) {
    this.life -= dt;
    return this.life > 0;
  }
}

export class FloatingText {
  constructor(x, y, text, color = '#fff3cf', scale = 1) {
    this.x = x;
    this.y = y;
    this.vy = -46;
    this.text = text;
    this.color = color;
    this.scale = scale;
    this.life = 0.78;
    this.maxLife = 0.78;
  }

  update(dt) {
    this.y += this.vy * dt;
    this.vy *= 0.94;
    this.life -= dt;
    return this.life > 0;
  }
}

export class ParticleSystem {
  constructor() {
    this.items = [];
  }

  burst(x, y, color, count = 10, speedMin = 60, speedMax = 210, size = 4.5) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = speedMin + Math.random() * (speedMax - speedMin);
      this.items.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: size * (0.65 + Math.random() * 0.7),
        color,
        life: 0.28 + Math.random() * 0.28,
        maxLife: 0.56,
      });
    }
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.91;
      p.vy *= 0.91;
      p.life -= dt;
      if (p.life <= 0) {
        this.items.splice(i, 1);
      }
    }
  }
}
