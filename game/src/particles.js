// Lauren Tan Zero-Allocation Particle & Entity Pools
export class ObjectPool {
  constructor(factory, initialSize = 100) {
    this.factory = factory;
    this.pool = [];
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.factory());
    }
  }

  get() {
    return this.pool.length > 0 ? this.pool.pop() : this.factory();
  }

  release(obj) {
    this.pool.push(obj);
  }
}

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.pool = new ObjectPool(() => ({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 2,
      color: '#fff',
      life: 0,
      maxLife: 1,
      alpha: 1,
    }), 300);
  }

  emit(x, y, count, color, speed = 120, life = 0.5, size = 3) {
    for (let i = 0; i < count; i++) {
      const p = this.pool.get();
      const angle = Math.random() * Math.PI * 2;
      const spd = (0.3 + Math.random() * 0.7) * speed;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * spd;
      p.vy = Math.sin(angle) * spd;
      p.color = color;
      p.life = life;
      p.maxLife = life;
      p.size = size;
      p.alpha = 1;
      this.particles.push(p);
    }
  }

  emitShockwave(x, y, color) {
    this.emit(x, y, 28, color, 240, 0.4, 4);
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.pool.release(p);
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = p.life / p.maxLife;
    }
  }

  render(ctx) {
    ctx.save();
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  reset() {
    for (let i = 0; i < this.particles.length; i++) {
      this.pool.release(this.particles[i]);
    }
    this.particles.length = 0;
  }
}
