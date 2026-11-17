import { BEAM_PALETTES, BEACON_POS, GAME_HEIGHT, GAME_WIDTH, PALETTE } from './constants.js';

export class GameRenderer {
  constructor(canvas, env) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.env = env;
  }

  render(state) {
    const ctx = this.ctx;
    const {
      time,
      keeper,
      nodes,
      enemies,
      flareBolts,
      enemyProjectiles,
      telegraphs,
      optics,
      effects,
      beaconAngle,
      hoveredNodeId,
    } = state;

    ctx.save();
    if (effects.shakeTime > 0) {
      const mag = effects.shakeIntensity * (effects.shakeTime / 0.2);
      const sx = (Math.random() - 0.5) * mag * 2;
      const sy = (Math.random() - 0.5) * mag * 2;
      ctx.translate(sx, sy);
    }

    // 1. Sea & Sandstone Bastion Backdrop
    this.env.drawBackdrop(ctx, time);

    // 2. Scorch Decals & Enemy Telegraphs
    this.drawScorches(ctx, effects.scorchMarks);
    this.drawTelegraphs(ctx, telegraphs, time);

    // 3. Void Siren Eclipse Auras
    for (const enemy of enemies) {
      if (enemy.type === 'siren') {
        const auraGrad = ctx.createRadialGradient(enemy.x, enemy.y, 12, enemy.x, enemy.y, 112);
        auraGrad.addColorStop(0, 'rgba(84, 28, 120, 0.36)');
        auraGrad.addColorStop(1, 'rgba(30, 10, 52, 0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, 112, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4. Cast Shadows
    this.drawCastShadows(ctx, keeper, nodes, enemies);

    // 5. Volumetric Sunbeams (drawn cleanly behind node caps & lighthouse turret)
    this.drawBeams(ctx, optics, time);

    // 6. Optical Nodes (Brass Mirrors & Tri-Prism Splitters)
    for (const node of nodes) {
      if (node.carried) continue;
      this.drawOpticalNode(ctx, node, time, node.id === hoveredNodeId);
    }

    // 7. Sea Terrors & Bosses
    for (const enemy of enemies) {
      this.drawEnemy(ctx, enemy, time);
    }

    // 8. Beacon Keeper
    if (keeper) {
      this.drawKeeper(ctx, keeper, time);
    }

    // 9. Central Solar Beacon Turret
    this.drawLighthouse(ctx, beaconAngle, time);

    // 10. Projectiles, Shockwave Rings, Particles, Popups
    this.drawProjectiles(ctx, flareBolts, enemyProjectiles);
    this.drawRingsAndParticles(ctx, effects);
    this.drawPopups(ctx, effects.popups);

    // 11. Subtle Atmospheric Edge Vignette
    const vig = ctx.createRadialGradient(
      BEACON_POS.x,
      BEACON_POS.y,
      310,
      BEACON_POS.x,
      BEACON_POS.y,
      790
    );
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(3, 8, 20, 0.42)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.restore();
  }

  drawScorches(ctx, scorches) {
    for (const s of scorches) {
      const alpha = Math.min(1, s.life / s.maxLife) * 0.4;
      ctx.fillStyle = `rgba(28, 20, 32, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, s.radius, s.radius * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawTelegraphs(ctx, telegraphs, time) {
    for (const tel of telegraphs) {
      const p = 1 - Math.max(0, tel.timer / tel.duration);
      ctx.save();
      ctx.beginPath();
      ctx.arc(tel.x, tel.y, tel.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 72, 118, ${(0.08 + p * 0.18).toFixed(3)})`;
      ctx.fill();
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = `rgba(255, 110, 145, ${(0.5 + 0.4 * Math.sin(time * 12)).toFixed(3)})`;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(tel.x, tel.y, Math.max(4, tel.radius * p), 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 224, 150, 0.72)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }

  drawCastShadows(ctx, keeper, nodes, enemies) {
    ctx.save();
    ctx.fillStyle = 'rgba(18, 22, 36, 0.34)';

    for (const node of nodes) {
      if (node.carried) continue;
      ctx.beginPath();
      ctx.ellipse(node.x + 5, node.y + 8, 20, 11, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const e of enemies) {
      ctx.beginPath();
      ctx.ellipse(e.x + 6, e.y + e.radius * 0.65, e.radius * 0.95, e.radius * 0.48, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (keeper) {
      ctx.beginPath();
      ctx.ellipse(keeper.x + 5, keeper.y + 12, 15, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawOpticalNode(ctx, node, time, isHovered) {
    ctx.save();
    ctx.translate(node.x, node.y);

    // Hover / active aim ring
    if (isHovered || node.overchargeTimer > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, 32, 0, Math.PI * 2);
      ctx.strokeStyle =
        node.overchargeTimer > 0
          ? 'rgba(255, 224, 115, 0.85)'
          : 'rgba(87, 242, 255, 0.65)';
      ctx.lineWidth = node.overchargeTimer > 0 ? 2.8 : 2;
      ctx.setLineDash([6, 5]);
      ctx.lineDashOffset = -time * 24;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Pedestal Socket
    ctx.beginPath();
    ctx.arc(0, 0, 17, 0, Math.PI * 2);
    ctx.fillStyle = node.portable ? '#2a3d5f' : '#3a2d1b';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = node.portable ? '#7fe8ff' : PALETTE.brass;
    ctx.stroke();

    ctx.rotate(node.angle);

    if (node.kind === 'splitter') {
      const tint = node.prismTint === 'crimson' ? '#ff587a' : '#57f2ff';
      const glow = node.lit ? 1 : 0.45;
      ctx.beginPath();
      ctx.moveTo(22, 0);
      ctx.lineTo(-14, -18);
      ctx.lineTo(-14, 18);
      ctx.closePath();
      ctx.fillStyle = node.lit ? 'rgba(220, 252, 255, 0.88)' : 'rgba(130, 210, 245, 0.55)';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = tint;
      ctx.stroke();

      // Inner crystal facet
      ctx.beginPath();
      ctx.moveTo(13, 0);
      ctx.lineTo(-8, -10);
      ctx.lineTo(-8, 10);
      ctx.closePath();
      ctx.fillStyle = `rgba(255, 255, 255, ${(0.45 * glow).toFixed(2)})`;
      ctx.fill();
    } else {
      const half = 30 * (node.scale || 1);
      // Brass backing bar
      ctx.fillStyle = '#5c4118';
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-7, -half, 12, half * 2, 4);
      ctx.fill();
      ctx.stroke();

      // Mirror glass strip
      ctx.fillStyle = node.lit ? '#f6ffff' : '#8ed9eb';
      ctx.beginPath();
      ctx.roundRect(0, -half + 3, 6, half * 2 - 6, 2);
      ctx.fill();

      // Brass end-caps
      ctx.fillStyle = PALETTE.brassBright;
      ctx.beginPath();
      ctx.arc(0, -half + 2, 4.5, 0, Math.PI * 2);
      ctx.arc(0, half - 2, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Subtle normal indicator arrow
      ctx.strokeStyle = node.lit ? '#ffd571' : 'rgba(255, 213, 113, 0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(16, 0);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawEnemy(ctx, e, time) {
    ctx.save();
    ctx.translate(e.x, e.y);

    const pulse = Math.sin(time * 7 + e.wobble) * 0.08 + 1;
    const isStealthed = e.type === 'stalker' && !e.litThisFrame;
    ctx.globalAlpha = isStealthed ? 0.46 : 1.0;

    // Lit solar sear rim
    if (e.litThisFrame) {
      ctx.beginPath();
      ctx.arc(0, 0, e.radius + 7, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 224, 120, 0.25)';
      ctx.fill();
    }

    const bodyFill = e.color;
    const faceAngle =
      Math.hypot(e.vx, e.vy) > 4
        ? Math.atan2(e.vy, e.vx)
        : Math.atan2(BEACON_POS.y - e.y, BEACON_POS.x - e.x);

    if (e.isBoss) {
      this.drawBossBody(ctx, e, bodyFill, time, pulse, faceAngle);
    } else if (e.type === 'crawler') {
      ctx.rotate(faceAngle);
      ctx.scale(pulse, 2 - pulse);
      // 6 animated chitin crab legs
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        for (let leg = -1; leg <= 1; leg++) {
          const swing = Math.sin(time * 12 + leg * 1.4 + e.wobble) * 3.5;
          const bx = leg * 6;
          const by = side * (e.radius * 0.72);
          ctx.beginPath();
          ctx.moveTo(bx, by * 0.6);
          ctx.lineTo(bx + swing, by + side * 8);
          ctx.lineTo(bx - 3 + swing * 0.7, by + side * 12);
          ctx.stroke();
        }
      }
      // Snapping pincers
      const snap = Math.abs(Math.sin(time * 7 + e.wobble)) * 0.35;
      ctx.fillStyle = e.accent;
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 2.4;
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(e.radius * 0.8, side * e.radius * 0.55);
        ctx.rotate(side * snap);
        ctx.beginPath();
        ctx.ellipse(5, 0, 7.5, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      // Spiked carapace
      ctx.beginPath();
      ctx.ellipse(0, 0, e.radius, e.radius * 0.86, 0, 0, Math.PI * 2);
      ctx.fillStyle = bodyFill;
      ctx.fill();
      ctx.stroke();
      // Barnacle crown ridges & glowing eyes
      ctx.fillStyle = '#d8e7cf';
      ctx.beginPath();
      ctx.arc(-4, -4, 3.4, 0, Math.PI * 2);
      ctx.arc(-6, 3, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffe478';
      ctx.beginPath();
      ctx.arc(e.radius * 0.52, -4, 2.3, 0, Math.PI * 2);
      ctx.arc(e.radius * 0.52, 4, 2.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === 'stalker') {
      ctx.rotate(faceAngle);
      // Trailing Abyssal Wraith tendrils
      for (let t = -1; t <= 1; t++) {
        ctx.strokeStyle = isStealthed ? 'rgba(104, 154, 232, 0.75)' : '#9be8ff';
        ctx.lineWidth = t === 0 ? 3.4 : 2.2;
        ctx.beginPath();
        ctx.moveTo(-4, t * 4);
        const w1 = Math.sin(time * 13 + t + e.wobble) * 5;
        const w2 = Math.cos(time * 11 + t + e.wobble) * 6;
        ctx.quadraticCurveTo(-e.radius * 0.9, t * 6 + w1, -e.radius * 1.65, t * 4 + w2);
        ctx.stroke();
      }
      // Sinuous hooded wraith body & dorsal fins
      ctx.beginPath();
      ctx.moveTo(e.radius + 5, 0);
      ctx.quadraticCurveTo(2, -e.radius * 0.9, -e.radius - 4, -5);
      ctx.lineTo(-e.radius * 0.55, 0);
      ctx.lineTo(-e.radius - 4, 5);
      ctx.quadraticCurveTo(2, e.radius * 0.9, e.radius + 5, 0);
      ctx.closePath();
      ctx.fillStyle = bodyFill;
      ctx.fill();
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = isStealthed ? '#6798e6' : '#e0f6ff';
      ctx.stroke();
      ctx.fillStyle = '#57f2ff';
      ctx.beginPath();
      ctx.arc(6, -3.2, 2.6, 0, Math.PI * 2);
      ctx.arc(6, 3.2, 2.6, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === 'mortar') {
      ctx.rotate(faceAngle);
      // Nautilus tentacles at front
      ctx.strokeStyle = '#d98c5f';
      ctx.lineWidth = 2.6;
      for (let i = -2; i <= 2; i++) {
        const wave = Math.sin(time * 7 + i + e.wobble) * 3;
        ctx.beginPath();
        ctx.moveTo(e.radius * 0.6, i * 3.5);
        ctx.quadraticCurveTo(e.radius + 4, i * 4.5 + wave, e.radius + 9, i * 4);
        ctx.stroke();
      }
      // Armored ribbed Nautilus spiral shell
      ctx.beginPath();
      ctx.arc(-2, 0, e.radius, 0, Math.PI * 2);
      ctx.fillStyle = bodyFill;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = PALETTE.ink;
      ctx.stroke();
      // Spiral ribs
      ctx.strokeStyle = '#a9795c';
      ctx.lineWidth = 2;
      for (let r = 0; r < 5; r++) {
        const a = (r * Math.PI * 2) / 5 + 0.4;
        ctx.beginPath();
        ctx.moveTo(-2, 0);
        ctx.quadraticCurveTo(
          -2 + Math.cos(a + 0.5) * e.radius * 0.55,
          Math.sin(a + 0.5) * e.radius * 0.55,
          -2 + Math.cos(a) * (e.radius - 2),
          Math.sin(a) * (e.radius - 2)
        );
        ctx.stroke();
      }
      // Mortar glowing vent core
      ctx.beginPath();
      ctx.arc(-2, 0, 7.5, 0, Math.PI * 2);
      ctx.fillStyle = e.accent;
      ctx.fill();
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 1.8;
      ctx.stroke();
    } else if (e.type === 'siren') {
      // 6 flowing Void Medusa tentacles
      ctx.strokeStyle = e.accent;
      ctx.lineWidth = 2.4;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 4.5, 5);
        ctx.quadraticCurveTo(
          i * 6 + Math.sin(time * 6 + i) * 6,
          16,
          i * 5 + Math.cos(time * 5 + i) * 4,
          e.radius + 10
        );
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 0.95, Math.PI, 0);
      ctx.quadraticCurveTo(e.radius * 0.95, 9, 0, 7);
      ctx.quadraticCurveTo(-e.radius * 0.95, 9, -e.radius * 0.95, 0);
      ctx.fillStyle = bodyFill;
      ctx.fill();
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = PALETTE.ink;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -3, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffe1ff';
      ctx.fill();
    }

    // Enemy HP Bar when damaged (non-boss)
    if (!e.isBoss && e.hp < e.maxHp) {
      ctx.rotate(0);
      const bw = Math.max(28, e.radius * 1.7);
      const bh = 4.5;
      const pct = Math.max(0, e.hp / e.maxHp);
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = 'rgba(10, 14, 26, 0.85)';
      ctx.fillRect(-bw * 0.5, -e.radius - 14, bw, bh);
      ctx.fillStyle = e.litThisFrame ? '#ffd571' : '#ff6a88';
      ctx.fillRect(-bw * 0.5, -e.radius - 14, bw * pct, bh);
    }

    ctx.restore();
  }

  drawBossBody(ctx, e, bodyFill, time, pulse, faceAngle = 0) {
    // Rotating abyssal rune ring
    ctx.save();
    ctx.rotate(time * (e.phase > 1 ? 1.6 : 0.85));
    ctx.strokeStyle = e.accent;
    ctx.lineWidth = 3.2;
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius + 12, a, a + 0.52);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.rotate(faceAngle);

    // 6 sweeping articulated Kraken tentacles
    ctx.lineCap = 'round';
    for (let t = 0; t < 6; t++) {
      const baseAng = (t * Math.PI * 2) / 6 + 0.4;
      const wave = Math.sin(time * 5 + t * 1.2) * 0.28;
      const sx = Math.cos(baseAng) * (e.radius * 0.68);
      const sy = Math.sin(baseAng) * (e.radius * 0.68);
      const mx = Math.cos(baseAng + wave) * (e.radius * 1.22);
      const my = Math.sin(baseAng + wave) * (e.radius * 1.22);
      const ex = Math.cos(baseAng - wave * 0.8) * (e.radius * 1.56);
      const ey = Math.sin(baseAng - wave * 0.8) * (e.radius * 1.56);

      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(mx, my, ex, ey);
      ctx.stroke();

      ctx.strokeStyle = e.accent;
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(mx, my, ex, ey);
      ctx.stroke();
    }

    ctx.scale(pulse, 2 - pulse);
    // Spiked Dreadnought Carapace
    ctx.beginPath();
    const spikes = e.type === 'sovereign' ? 14 : 10;
    for (let i = 0; i < spikes; i++) {
      const a = (i * Math.PI * 2) / spikes;
      const r = i % 2 === 0 ? e.radius * 1.04 : e.radius * 0.78;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = bodyFill;
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = PALETTE.ink;
    ctx.stroke();

    // Inner armored plates & crown crest
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 0.56, 0, Math.PI * 2);
    ctx.strokeStyle = e.accent;
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // Abyssal Crown Core & Dual Glowing Eyes
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 0.34, 0, Math.PI * 2);
    ctx.fillStyle = e.phase >= 2 ? '#ffe39f' : e.accent;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 0.16, 0, Math.PI * 2);
    ctx.fillStyle = '#19081f';
    ctx.fill();

    ctx.fillStyle = '#fff5a8';
    ctx.beginPath();
    ctx.arc(e.radius * 0.45, -10, 4.2, 0, Math.PI * 2);
    ctx.arc(e.radius * 0.45, 10, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawKeeper(ctx, keeper, time) {
    ctx.save();
    ctx.translate(keeper.x, keeper.y);

    if (keeper.invulnTimer > 0 && Math.floor(time * 18) % 2 === 0) {
      ctx.globalAlpha = 0.55;
    }

    // Warm personal lantern glow
    const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 44);
    glow.addColorStop(0, 'rgba(255, 224, 130, 0.38)');
    glow.addColorStop(1, 'rgba(255, 200, 80, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 44, 0, Math.PI * 2);
    ctx.fill();

    // Billowing cloak
    const bob = Math.sin(keeper.walkPhase * 9) * 2.5;
    ctx.rotate(keeper.aimAngle);
    ctx.fillStyle = '#1b3863';
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.quadraticCurveTo(-8, -15 + bob, -18, -10);
    ctx.lineTo(-15, 0);
    ctx.lineTo(-18, 10);
    ctx.quadraticCurveTo(-8, 15 - bob, 8, 0);
    ctx.fill();
    ctx.stroke();

    // Brass shoulders & hood
    ctx.beginPath();
    ctx.arc(0, 0, 10.5, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.brass;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(2, 0, 6.5, 0, Math.PI * 2);
    ctx.fillStyle = '#f5e7c4';
    ctx.fill();

    // Lantern Staff
    ctx.strokeStyle = '#ffd571';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(4, 7);
    ctx.lineTo(22, 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(24, 5, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#fff9d6';
    ctx.fill();

    ctx.restore();

    // Orbiting carried portable mirror badge
    if (keeper.carryingNodeId) {
      const ox = keeper.x + Math.cos(time * 3.5) * 22;
      const oy = keeper.y + Math.sin(time * 3.5) * 16 - 16;
      ctx.save();
      ctx.fillStyle = '#57f2ff';
      ctx.strokeStyle = '#ffd571';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(ox - 5, oy - 9, 10, 18, 3);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  drawLighthouse(ctx, beaconAngle, time) {
    const { x, y, radius } = BEACON_POS;
    ctx.save();
    ctx.translate(x, y);

    // Outer ambient solar halo
    const halo = ctx.createRadialGradient(0, 0, 10, 0, 0, 92);
    halo.addColorStop(0, 'rgba(255, 232, 150, 0.55)');
    halo.addColorStop(0.55, 'rgba(255, 188, 66, 0.16)');
    halo.addColorStop(1, 'rgba(255, 188, 66, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, 92, 0, Math.PI * 2);
    ctx.fill();

    // Stone & Brass Plinth
    ctx.beginPath();
    ctx.arc(0, 0, radius + 6, 0, Math.PI * 2);
    ctx.fillStyle = '#4c3b23';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = PALETTE.brass;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, radius - 3, 0, Math.PI * 2);
    ctx.fillStyle = '#252f46';
    ctx.fill();
    ctx.strokeStyle = PALETTE.brassBright;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Rotating Fresnel Aperture
    ctx.save();
    ctx.rotate(beaconAngle);
    ctx.fillStyle = PALETTE.brass;
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-12, -16, 38, 32, 8);
    ctx.fill();
    ctx.stroke();

    // Glowing Emitter Lens
    ctx.fillStyle = '#fff9d9';
    ctx.beginPath();
    ctx.ellipse(24, 0, 7, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Top Solar Core Jewel
    const corePulse = 11 + Math.sin(time * 5) * 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, corePulse, 0, Math.PI * 2);
    ctx.fillStyle = '#fffbe8';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#ffb838';
    ctx.stroke();

    ctx.restore();
  }

  drawBeams(ctx, optics, time) {
    if (!optics || optics.segments.length === 0) return;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';

    for (const seg of optics.segments) {
      const pal = BEAM_PALETTES[seg.color] || BEAM_PALETTES.gold;
      const w = seg.widthScale || 1;
      const shimmer = 1 + Math.sin(time * 16 + seg.bounce * 2) * 0.08;

      // Pass 1: Wide atmospheric bloom
      ctx.strokeStyle = pal.bloom;
      ctx.lineWidth = 24 * w * shimmer;
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.stroke();

      // Pass 2: Outer chromatic halo
      ctx.strokeStyle = pal.outer;
      ctx.lineWidth = 12 * w * shimmer;
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.stroke();

      // Pass 3: Saturated sheath
      ctx.strokeStyle = pal.sheath;
      ctx.lineWidth = 5.4 * w;
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.stroke();

      // Pass 4: Blazing ivory-white hot core
      ctx.strokeStyle = pal.core;
      ctx.lineWidth = 2.1 * w;
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.stroke();

      // Traveling caustic light pulse along the ray
      const len = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1);
      if (len > 40) {
        const t = ((time * 2.4 + seg.bounce * 0.27) % 1);
        const px = seg.x1 + (seg.x2 - seg.x1) * t;
        const py = seg.y1 + (seg.y2 - seg.y1) * t;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px, py, 3.6 * w, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Mirror & Splitter Hit Starbursts
    for (const flare of optics.flares) {
      const pal = BEAM_PALETTES[flare.color] || BEAM_PALETTES.gold;
      const r = 18 * (flare.scale || 1);
      const grad = ctx.createRadialGradient(flare.x, flare.y, 1, flare.x, flare.y, r);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.45, pal.sheath);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(flare.x, flare.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Crossfire Beam Intersection Flares
    for (const pt of optics.intersections) {
      const pulse = 14 + Math.sin(time * 18) * 3;
      const grad = ctx.createRadialGradient(pt.x, pt.y, 2, pt.x, pt.y, pulse * 1.4);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.4, 'rgba(87, 242, 255, 0.78)');
      grad.addColorStop(1, 'rgba(255, 213, 113, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pulse * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawProjectiles(ctx, flareBolts, enemyProjectiles) {
    ctx.save();
    for (const b of flareBolts) {
      ctx.fillStyle = 'rgba(255, 224, 118, 0.36)';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff9db';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const ep of enemyProjectiles) {
      ctx.fillStyle = 'rgba(255, 72, 130, 0.35)';
      ctx.beginPath();
      ctx.arc(ep.x, ep.y, ep.radius + 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff6b98';
      ctx.strokeStyle = '#fff0f5';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ep.x, ep.y, ep.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  drawRingsAndParticles(ctx, effects) {
    ctx.save();
    for (const r of effects.rings) {
      const alpha = Math.max(0, r.life / r.maxLife);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.lineWidth * alpha + 1;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (const p of effects.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha + 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawPopups(ctx, popups) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const pop of popups) {
      const alpha = Math.min(1, (pop.life / pop.maxLife) * 1.4);
      ctx.globalAlpha = alpha;
      ctx.font = `800 ${Math.round(14 * pop.scale)}px ui-monospace, Consolas, monospace`;
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = 'rgba(8, 13, 28, 0.9)';
      ctx.strokeText(pop.text, pop.x, pop.y);
      ctx.fillStyle = pop.color;
      ctx.fillText(pop.text, pop.x, pop.y);
    }
    ctx.restore();
  }
}
