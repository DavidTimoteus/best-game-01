export class EffectsManager {
  constructor() {
    this.particles = [];
    this.rings = [];
    this.popups = [];
    this.scorchMarks = [];
    this.shakeTime = 0;
    this.shakeIntensity = 0;
    this.hitstop = 0;
  }

  clear() {
    this.particles.length = 0;
    this.rings.length = 0;
    this.popups.length = 0;
    this.scorchMarks.length = 0;
    this.shakeTime = 0;
    this.shakeIntensity = 0;
    this.hitstop = 0;
  }

  addShake(intensity, duration = 0.16) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeTime = Math.max(this.shakeTime, duration);
  }

  addHitstop(duration) {
    this.hitstop = Math.max(this.hitstop, duration);
  }

  spawnRing(x, y, maxRadius, color = '#57f2ff', lineWidth = 4, duration = 0.42) {
    this.rings.push({
      x,
      y,
      radius: 10,
      maxRadius,
      color,
      lineWidth,
      life: duration,
      maxLife: duration,
    });
  }

  spawnBurst(x, y, color, count = 10, speedMin = 40, speedMax = 180, size = 3.2) {
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const spd = speedMin + Math.random() * (speedMax - speedMin);
      const life = 0.25 + Math.random() * 0.35;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: size * (0.7 + Math.random() * 0.6),
        color,
        life,
        maxLife: life,
      });
    }
  }

  spawnBeamSpark(x, y, color) {
    if (this.particles.length > 260) return;
    const ang = Math.random() * Math.PI * 2;
    const spd = 35 + Math.random() * 90;
    const life = 0.16 + Math.random() * 0.18;
    this.particles.push({
      x,
      y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      size: 2.3,
      color,
      life,
      maxLife: life,
    });
  }

  spawnPopup(x, y, text, color = '#fff2b2', scale = 1) {
    if (this.popups.length > 40) this.popups.shift();
    this.popups.push({
      x,
      y,
      vy: -36,
      text,
      color,
      scale,
      life: 0.72,
      maxLife: 0.72,
    });
  }

  spawnScorch(x, y, radius = 16, color = 'rgba(28, 22, 34, 0.32)') {
    if (this.scorchMarks.length > 36) this.scorchMarks.shift();
    this.scorchMarks.push({
      x,
      y,
      radius,
      color,
      life: 5.5,
      maxLife: 5.5,
    });
  }

  update(dt) {
    if (this.shakeTime > 0) {
      this.shakeTime = Math.max(0, this.shakeTime - dt);
      if (this.shakeTime === 0) this.shakeIntensity = 0;
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.93;
      p.vy *= 0.93;
    }

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      if (r.life <= 0) {
        this.rings.splice(i, 1);
        continue;
      }
      const progress = 1 - r.life / r.maxLife;
      r.radius = 12 + (r.maxRadius - 12) * (1 - Math.pow(1 - progress, 2.2));
    }

    for (let i = this.popups.length - 1; i >= 0; i--) {
      const pop = this.popups[i];
      pop.life -= dt;
      if (pop.life <= 0) {
        this.popups.splice(i, 1);
        continue;
      }
      pop.y += pop.vy * dt;
      pop.vy *= 0.96;
    }

    for (let i = this.scorchMarks.length - 1; i >= 0; i--) {
      const s = this.scorchMarks[i];
      s.life -= dt;
      if (s.life <= 0) this.scorchMarks.splice(i, 1);
    }
  }
}
