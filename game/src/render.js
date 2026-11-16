/**
 * 2D Canvas vector renderer: parallax starfield, nebula wash, deforming warp-grid,
 * distinct silhouettes for all 5 enemy archetypes, player prism craft, and FX.
 */

import {
  ARENA_HEIGHT,
  ARENA_PADDING,
  ARENA_WIDTH,
  COLORS,
  POLARITY,
  POLARITY_META,
} from './config.js';

export class GameRenderer {
  constructor(ctx) {
    this.ctx = ctx;
  }

  render(world, input) {
    const ctx = this.ctx;
    ctx.save();

    if (world.shake > 0.2) {
      const sx = (Math.random() - 0.5) * world.shake * 1.4;
      const sy = (Math.random() - 0.5) * world.shake * 1.4;
      ctx.translate(sx, sy);
    }

    this._drawBackground(world);
    this._drawWarpGrid(world);
    this._drawArenaFrame(world);
    this._drawAfterimages(world);
    this._drawGates(world);
    this._drawOrbs(world);
    this._drawEnemies(world);
    this._drawBoss(world);
    this._drawBullets(world);
    this._drawPlayer(world, input);
    this._drawEffects(world);

    ctx.restore();
  }

  _drawBackground(world) {
    const ctx = this.ctx;
    const grad = ctx.createRadialGradient(
      ARENA_WIDTH * 0.55,
      ARENA_HEIGHT * 0.48,
      60,
      ARENA_WIDTH * 0.5,
      ARENA_HEIGHT * 0.5,
      ARENA_WIDTH * 0.72
    );
    grad.addColorStop(0, '#0D1736');
    grad.addColorStop(0.55, '#070C1D');
    grad.addColorStop(1, COLORS.bgDeep);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

    // Ambient nebula clouds
    const polColor =
      world.player.polarity === POLARITY.CYAN
        ? 'rgba(0, 210, 255, 0.08)'
        : 'rgba(255, 145, 25, 0.08)';
    const n1 = ctx.createRadialGradient(260, 220, 20, 260, 220, 320);
    n1.addColorStop(0, polColor);
    n1.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = n1;
    ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

    const n2 = ctx.createRadialGradient(980, 460, 30, 980, 460, 360);
    n2.addColorStop(0, world.boss ? 'rgba(255, 46, 147, 0.13)' : 'rgba(140, 70, 255, 0.09)');
    n2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = n2;
    ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

    for (const s of world.stars) {
      const alpha = 0.35 + 0.45 * Math.sin(world.time * 2.2 + s.twinkle);
      ctx.fillStyle = `rgba(210, 232, 255, ${alpha.toFixed(2)})`;
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }
  }

  _displacePoint(x, y, world) {
    let dx = 0;
    let dy = 0;
    for (const imp of world.gridImpulses) {
      const rx = x - imp.x;
      const ry = y - imp.y;
      const dist = Math.hypot(rx, ry);
      if (dist > 1 && dist < imp.radius) {
        const falloff = 1 - dist / imp.radius;
        const fade = imp.life / imp.maxLife;
        const push = falloff * falloff * fade * imp.strength * 18;
        dx += (rx / dist) * push;
        dy += (ry / dist) * push;
      }
    }
    if (world.boss) {
      const rx = world.boss.x - x;
      const ry = world.boss.y - y;
      const dist = Math.hypot(rx, ry);
      if (dist > 8 && dist < 210) {
        const pull = (1 - dist / 210) * 10;
        dx += (rx / dist) * pull;
        dy += (ry / dist) * pull;
      }
    }
    return { x: x + dx, y: y + dy };
  }

  _drawWarpGrid(world) {
    const ctx = this.ctx;
    const step = 48;
    ctx.lineWidth = 1;
    ctx.strokeStyle = COLORS.gridLine;

    for (let x = 0; x <= ARENA_WIDTH; x += step) {
      ctx.beginPath();
      for (let y = 0; y <= ARENA_HEIGHT; y += step) {
        const pt = this._displacePoint(x, y, world);
        if (y === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    }

    for (let y = 0; y <= ARENA_HEIGHT; y += step) {
      ctx.beginPath();
      for (let x = 0; x <= ARENA_WIDTH; x += step) {
        const pt = this._displacePoint(x, y, world);
        if (x === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    }
  }

  _drawArenaFrame(world) {
    const ctx = this.ctx;
    const meta = POLARITY_META[world.player.polarity];
    ctx.save();
    ctx.strokeStyle = meta.primary;
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = 2;
    ctx.strokeRect(
      ARENA_PADDING - 12,
      ARENA_PADDING + 22,
      ARENA_WIDTH - (ARENA_PADDING - 12) * 2,
      ARENA_HEIGHT - (ARENA_PADDING + 22) - (ARENA_PADDING + 14)
    );
    ctx.restore();
  }

  _drawAfterimages(world) {
    const ctx = this.ctx;
    for (const g of world.effects.afterimages) {
      const alpha = (g.life / g.maxLife) * 0.55;
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(g.angle);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = g.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(g.radius + 4, 0);
      ctx.lineTo(-g.radius, -g.radius * 0.78);
      ctx.lineTo(-g.radius * 0.5, 0);
      ctx.lineTo(-g.radius, g.radius * 0.78);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  }

  _drawOrbs(world) {
    const ctx = this.ctx;
    const playerPol = world.player.polarity;
    for (const o of world.orbs) {
      const meta = POLARITY_META[o.polarity];
      const matched = o.polarity === playerPol;
      const pulse = 1 + Math.sin(o.pulse) * 0.14;

      if (matched && Math.hypot(world.player.x - o.x, world.player.y - o.y) < 165) {
        ctx.save();
        ctx.strokeStyle = meta.primary;
        ctx.globalAlpha = 0.26;
        ctx.setLineDash([4, 5]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(o.x, o.y);
        ctx.lineTo(world.player.x, world.player.y);
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.translate(o.x, o.y);
      ctx.shadowColor = meta.primary;
      ctx.shadowBlur = matched ? 18 : 10;

      ctx.strokeStyle = meta.primary;
      ctx.lineWidth = matched ? 2.5 : 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, o.radius * pulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = meta.tint;
      ctx.fill();

      // Inner glyph: diamond for Cyan, triangle for Amber
      ctx.fillStyle = meta.core;
      ctx.beginPath();
      if (o.polarity === POLARITY.CYAN) {
        ctx.moveTo(0, -7);
        ctx.lineTo(7, 0);
        ctx.lineTo(0, 7);
        ctx.lineTo(-7, 0);
      } else {
        ctx.moveTo(0, -7);
        ctx.lineTo(7, 6);
        ctx.lineTo(-7, 6);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  _drawGates(world) {
    const ctx = this.ctx;
    for (const g of world.gates) {
      const meta = POLARITY_META[g.polarity];
      const matched = g.polarity === world.player.polarity;
      const cos = Math.cos(g.angle);
      const sin = Math.sin(g.angle);
      const x1 = g.x - cos * g.halfLength;
      const y1 = g.y - sin * g.halfLength;
      const x2 = g.x + cos * g.halfLength;
      const y2 = g.y + sin * g.halfLength;

      ctx.save();
      ctx.shadowColor = meta.primary;
      ctx.shadowBlur = g.warmUp > 0 ? 6 : 18;
      ctx.strokeStyle = meta.primary;
      if (g.warmUp > 0) {
        ctx.globalAlpha = 0.4;
        ctx.setLineDash([8, 8]);
        ctx.lineWidth = 2;
      } else if (matched) {
        ctx.globalAlpha = 0.72;
        ctx.setLineDash([12, 6]);
        ctx.lineWidth = 5;
      } else {
        ctx.lineWidth = 6 + Math.sin(g.pulse) * 1.4;
      }
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      if (g.warmUp <= 0) {
        ctx.setLineDash([]);
        ctx.strokeStyle = meta.core;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      for (const [px, py] of [
        [x1, y1],
        [x2, y2],
      ]) {
        ctx.fillStyle = '#0D1730';
        ctx.strokeStyle = meta.primary;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(px, py, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  _drawEnemies(world) {
    const ctx = this.ctx;
    for (const e of world.enemies) {
      const meta = POLARITY_META[e.polarity];
      if (e.kind === 'chaser') {
        if (e.trail.length > 1) {
          ctx.save();
          ctx.strokeStyle = meta.primary;
          ctx.lineWidth = 3;
          ctx.globalAlpha = 0.32;
          ctx.beginPath();
          e.trail.forEach((pt, idx) => {
            if (idx === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.stroke();
          ctx.restore();
        }

        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.angle);
        ctx.shadowColor = meta.primary;
        ctx.shadowBlur = 14;
        ctx.fillStyle = e.hitFlash > 0 ? COLORS.white : '#101A36';
        ctx.strokeStyle = meta.primary;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(e.radius + 3, 0);
        ctx.lineTo(-e.radius, -e.radius * 0.78);
        ctx.lineTo(-e.radius * 0.45, 0);
        ctx.lineTo(-e.radius, e.radius * 0.78);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = meta.core;
        ctx.beginPath();
        ctx.arc(2, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (e.kind === 'bastion') {
        ctx.save();
        ctx.translate(e.x, e.y);

        if (e.chargeRatio > 0.4) {
          ctx.strokeStyle = meta.primary;
          ctx.globalAlpha = (e.chargeRatio - 0.4) * 0.9;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, e.radius + 14 * (1 - e.chargeRatio), 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        ctx.rotate(e.rot);
        ctx.shadowColor = meta.primary;
        ctx.shadowBlur = 16;
        ctx.fillStyle = e.hitFlash > 0 ? COLORS.white : '#141B38';
        ctx.strokeStyle = meta.primary;
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        for (let k = 0; k < 8; k++) {
          const ang = (Math.PI * 2 * k) / 8;
          const px = Math.cos(ang) * e.radius;
          const py = Math.sin(ang) * e.radius;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = meta.primary;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  _drawBoss(world) {
    const b = world.boss;
    if (!b) return;
    const ctx = this.ctx;
    const meta = POLARITY_META[b.polarity];

    ctx.save();
    ctx.translate(b.x, b.y);

    // Outer hazard aura
    const aura = ctx.createRadialGradient(0, 0, b.radius * 0.5, 0, 0, b.radius * 2.2);
    aura.addColorStop(0, meta.glow);
    aura.addColorStop(0.55, 'rgba(255, 46, 147, 0.16)');
    aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, b.radius * 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Rotating outer armor segments
    ctx.save();
    ctx.rotate(b.ringRot);
    ctx.strokeStyle = COLORS.bossPink;
    ctx.lineWidth = 4;
    ctx.shadowColor = COLORS.bossPink;
    ctx.shadowBlur = 18;
    for (let s = 0; s < 4; s++) {
      const a0 = (Math.PI * 2 * s) / 4 + 0.18;
      const a1 = a0 + Math.PI * 0.34;
      ctx.beginPath();
      ctx.arc(0, 0, b.radius + 14, a0, a1);
      ctx.stroke();
    }
    ctx.restore();

    // Orbiting shield pylons
    for (let k = 0; k < 4; k++) {
      const ang = b.rot * 1.4 + (Math.PI * 2 * k) / 4;
      const px = Math.cos(ang) * (b.radius + 24);
      const py = Math.sin(ang) * (b.radius + 24);
      ctx.fillStyle = k % 2 === 0 ? meta.primary : COLORS.bossPink;
      ctx.beginPath();
      ctx.arc(px, py, 6.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Core hexagon chassis
    ctx.rotate(b.rot);
    ctx.shadowColor = meta.primary;
    ctx.shadowBlur = 24;
    ctx.fillStyle = b.hitFlash > 0 ? COLORS.white : '#180E33';
    ctx.strokeStyle = meta.primary;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const ang = (Math.PI * 2 * k) / 6;
      const px = Math.cos(ang) * b.radius;
      const py = Math.sin(ang) * b.radius;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner prism star
    ctx.fillStyle = meta.core;
    ctx.beginPath();
    ctx.arc(0, 0, b.radius * 0.36, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COLORS.bossViolet;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.restore();
  }

  _drawBullets(world) {
    const ctx = this.ctx;
    for (const b of world.bullets) {
      const meta = POLARITY_META[b.polarity];
      ctx.save();
      ctx.shadowColor = meta.primary;
      ctx.shadowBlur = b.fromPlayer ? 12 : 10;
      if (b.fromPlayer) {
        const ang = Math.atan2(b.vy, b.vx);
        ctx.translate(b.x, b.y);
        ctx.rotate(ang);
        ctx.fillStyle = meta.core;
        ctx.strokeStyle = meta.primary;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-10, -3.2, 18, 6.4, 3);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillStyle = meta.core;
        ctx.strokeStyle = meta.primary;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  _drawPlayer(world, input) {
    const p = world.player;
    const ctx = this.ctx;
    const meta = POLARITY_META[p.polarity];

    // Aim reticle & faint laser sight during play
    if (world.state === 'playing' && input) {
      ctx.save();
      ctx.strokeStyle = meta.primary;
      ctx.globalAlpha = 0.22;
      ctx.setLineDash([5, 7]);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(input.mouseX, input.mouseY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(input.mouseX, input.mouseY, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(input.mouseX, input.mouseY, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = meta.core;
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(p.x, p.y);

    // Polarity field aura ring
    ctx.strokeStyle = meta.primary;
    ctx.globalAlpha = p.invulnTimer > 0 ? 0.85 : 0.35;
    ctx.lineWidth = p.shiftFlash > 0 ? 3.8 : 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius + 9 + p.shiftFlash * 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.rotate(p.angle);
    ctx.shadowColor = meta.primary;
    ctx.shadowBlur = 18;
    ctx.fillStyle = p.hitFlash > 0 ? COLORS.danger : '#0E1B38';
    ctx.strokeStyle = p.hitFlash > 0 ? COLORS.white : meta.primary;
    ctx.lineWidth = 2.8;

    ctx.beginPath();
    ctx.moveTo(p.radius + 7, 0);
    ctx.lineTo(-p.radius * 0.9, -p.radius * 0.88);
    ctx.lineTo(-p.radius * 0.42, 0);
    ctx.lineTo(-p.radius * 0.9, p.radius * 0.88);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner glowing prism core
    ctx.fillStyle = meta.core;
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(-4, -4.5);
    ctx.lineTo(-4, 4.5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  _drawEffects(world) {
    const ctx = this.ctx;
    const fx = world.effects;

    for (const r of fx.rings) {
      const alpha = r.life / r.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width * alpha + 0.6;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (const arc of fx.arcs) {
      const alpha = arc.life / arc.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = arc.color;
      ctx.shadowColor = arc.color;
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      arc.points.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
      ctx.restore();
    }

    for (const p of fx.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.4 + alpha * 0.6), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const pop of fx.popups) {
      const alpha = Math.min(1, (pop.life / pop.maxLife) * 1.4);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `800 ${Math.round(16 * pop.scale)}px "Segoe UI", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(4, 7, 17, 0.9)';
      ctx.strokeText(pop.text, pop.x, pop.y);
      ctx.fillStyle = pop.color;
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.restore();
    }
  }
}
