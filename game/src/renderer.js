import { ARENA_BOUNDS, CANVAS_HEIGHT, CANVAS_WIDTH, PALETTE } from './constants.js';
import { buildCourtyardLayer } from './textures.js';

export class CourtyardRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.courtyardCache = buildCourtyardLayer();
    this.dustMotes = Array.from({ length: 28 }, (_, i) => ({
      x: ARENA_BOUNDS.left + ((i * 197) % (ARENA_BOUNDS.right - ARENA_BOUNDS.left)),
      y: ARENA_BOUNDS.top + ((i * 131) % (ARENA_BOUNDS.bottom - ARENA_BOUNDS.top)),
      r: 1.5 + (i % 3) * 0.9,
      phase: i * 0.7,
    }));
  }

  render(state) {
    const ctx = this.ctx;
    ctx.save();

    if (state.shakeAmount > 0.2) {
      const sx = (Math.random() - 0.5) * state.shakeAmount;
      const sy = (Math.random() - 0.5) * state.shakeAmount;
      ctx.translate(sx, sy);
    }

    // 1. Cached sunlit courtyard flagstones + sundial + parapet
    ctx.drawImage(this.courtyardCache, 0, 0);

    // 2. Ground hazard pools (alchemical acid)
    for (const pool of state.hazardPools) {
      this.drawHazardPool(ctx, pool, state.elapsed);
    }

    // 3. Enemy windup telegraphs on ground
    for (const enemy of state.enemies) {
      this.drawEnemyTelegraph(ctx, enemy);
    }

    // 4. Cast shadows for pillars, pickups, player, enemies
    this.drawShadows(ctx, state);

    // 5. Pickups (Amber & Hearts)
    for (const item of state.pickups) {
      this.drawPickup(ctx, item, state.elapsed);
    }

    // 6. Player afterimages during Parry-Dash
    for (const ghost of state.player.afterimages) {
      this.drawWardenGhost(ctx, ghost);
    }

    // 7. Shockwave rings
    for (const ring of state.rings) {
      this.drawShockwaveRing(ctx, ring);
    }

    // 8. Y-sorted pillars, enemies, and player for clean 2.5D overlap
    const drawables = [];
    for (const p of state.pillars) {
      drawables.push({ y: p.y, kind: 'pillar', ref: p });
    }
    for (const e of state.enemies) {
      drawables.push({ y: e.y, kind: 'enemy', ref: e });
    }
    drawables.push({ y: state.player.y, kind: 'player', ref: state.player });
    drawables.sort((a, b) => a.y - b.y);

    for (const item of drawables) {
      if (item.kind === 'pillar') {
        this.drawPillar(ctx, item.ref, state.elapsed);
      } else if (item.kind === 'enemy') {
        this.drawEnemy(ctx, item.ref, state.elapsed);
      } else {
        this.drawWarden(ctx, item.ref, state.elapsed);
      }
    }

    // 9. Arcing alchemist flasks
    for (const flask of state.flasks) {
      this.drawHazardFlask(ctx, flask);
    }

    // 10. Projectiles & Lightning arcs
    for (const proj of state.projectiles) {
      this.drawProjectile(ctx, proj);
    }
    for (const arc of state.lightningArcs) {
      this.drawLightningArc(ctx, arc);
    }

    // 11. Particles & floating combat callouts
    this.drawParticles(ctx, state.particles.items);
    for (const ft of state.floatingTexts) {
      this.drawFloatingText(ctx, ft);
    }

    // 12. Volumetric diagonal sunbeams + floating gold dust motes + vignette
    this.drawSunbeamsAndMotes(ctx, state.elapsed);

    // 13. Crisp aim reticle when playing
    if (state.mode === 'PLAYING') {
      this.drawReticle(ctx, state.aimX, state.aimY, state.player.isParrying());
    }

    ctx.restore();
  }

  drawShadows(ctx, state) {
    ctx.fillStyle = PALETTE.shadow;
    for (const p of state.pillars) {
      ctx.beginPath();
      ctx.ellipse(p.x + 10, p.y + 13, p.radius * 1.12, p.radius * 0.72, 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const e of state.enemies) {
      ctx.beginPath();
      ctx.ellipse(e.x + 7, e.y + e.radius * 0.65, e.radius * 0.96, e.radius * 0.52, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.ellipse(state.player.x + 6, state.player.y + 13, 18, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawPillar(ctx, pillar, elapsed) {
    const x = pillar.x;
    const y = pillar.y;
    const r = pillar.radius;

    // Warm radial brazier light on stone around pillar
    const glow = ctx.createRadialGradient(x, y - 6, 8, x, y, r * 2.7);
    glow.addColorStop(0, `rgba(255, 188, 66, ${0.26 * pillar.brazierHeat})`);
    glow.addColorStop(1, 'rgba(255, 188, 66, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.7, 0, Math.PI * 2);
    ctx.fill();

    // Stone column base
    ctx.fillStyle = '#8b7355';
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Raised beveled top cap
    ctx.fillStyle = pillar.flashTimer > 0 ? '#ffe5a3' : '#b89b72';
    ctx.beginPath();
    ctx.arc(x, y - 7, r - 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Brass brazier bowl
    ctx.fillStyle = '#3b2b20';
    ctx.strokeStyle = PALETTE.brassMid;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y - 8, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Animated flame core
    const flicker = Math.sin(elapsed * 13 + x) * 2.2;
    ctx.fillStyle = '#ff7b29';
    ctx.beginPath();
    ctx.arc(x, y - 9, 9 + flicker * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe985';
    ctx.beginPath();
    ctx.arc(x + flicker * 0.25, y - 10, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  drawWarden(ctx, p, elapsed) {
    ctx.save();
    ctx.translate(p.x, p.y);

    // Parry-dash golden halo ring
    if (p.isParrying()) {
      ctx.strokeStyle = '#fff5ad';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius + 12, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(247, 201, 72, 0.24)';
      ctx.fill();
    }

    const bob = Math.sin(p.stridePhase) * 2.2;
    const hitFlash = p.hurtFlash > 0;

    // Golden sun-halo crest behind warden
    ctx.save();
    ctx.rotate(elapsed * 0.9);
    ctx.strokeStyle = PALETTE.brassBright;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, bob - 1, 21, -0.8, 0.8);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, bob - 1, 21, Math.PI - 0.8, Math.PI + 0.8);
    ctx.stroke();
    ctx.restore();

    // Teal articulated cloak body
    ctx.save();
    ctx.rotate(p.aimAngle);

    ctx.fillStyle = hitFlash ? '#ffffff' : PALETTE.wardenCloak;
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.ellipse(-2, bob * 0.3, 16, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Brass shoulder pauldrons
    ctx.fillStyle = hitFlash ? '#ffffff' : PALETTE.brassBright;
    ctx.beginPath();
    ctx.arc(2, -11, 6, 0, Math.PI * 2);
    ctx.arc(2, 11, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Solar Lance / Astrolabe Staff
    const thrust = p.lanceSwingTimer > 0 ? 7 : 0;
    ctx.fillStyle = '#5c3c1e';
    ctx.fillRect(6 + thrust, -2.5, 22, 5);
    ctx.strokeRect(6 + thrust, -2.5, 22, 5);

    ctx.fillStyle = '#ffe47a';
    ctx.beginPath();
    ctx.moveTo(26 + thrust, -6);
    ctx.lineTo(39 + thrust, 0);
    ctx.lineTo(26 + thrust, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Warden helm + glowing visor
    ctx.fillStyle = hitFlash ? '#ffffff' : PALETTE.wardenHighlight;
    ctx.beginPath();
    ctx.arc(1, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fff9d6';
    ctx.beginPath();
    ctx.arc(5, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.restore();
  }

  drawWardenGhost(ctx, ghost) {
    ctx.save();
    ctx.globalAlpha = ghost.alpha * 0.48;
    ctx.fillStyle = '#5ee6f5';
    ctx.beginPath();
    ctx.arc(ghost.x, ghost.y, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawEnemyTelegraph(ctx, e) {
    if (e.state !== 'windup') return;
    ctx.save();
    if (e.type === 'sentinel') {
      ctx.strokeStyle = 'rgba(255, 68, 78, 0.72)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.lineTo(e.x + Math.cos(e.chargeAngle) * 420, e.y + Math.sin(e.chargeAngle) * 420);
      ctx.stroke();
    } else if (e.type === 'knight') {
      ctx.translate(e.x, e.y);
      ctx.rotate(e.chargeAngle);
      ctx.fillStyle = 'rgba(232, 85, 50, 0.22)';
      ctx.strokeStyle = 'rgba(255, 110, 64, 0.85)';
      ctx.lineWidth = 2;
      ctx.fillRect(0, -18, 220, 36);
      ctx.strokeRect(0, -18, 220, 36);
    } else if (e.type === 'boss') {
      ctx.strokeStyle = 'rgba(255, 92, 64, 0.78)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius + 16 + Math.sin(e.stateTimer * 22) * 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawEnemy(ctx, e, elapsed) {
    ctx.save();
    ctx.translate(e.x, e.y);
    const flash = e.hitFlash > 0;

    if (e.type === 'scarab') {
      ctx.rotate(e.facing);
      // Animated brass legs
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 3;
      for (let i = -1; i <= 1; i++) {
        const wiggle = Math.sin(elapsed * 18 + i * 2) * 3.5;
        ctx.beginPath();
        ctx.moveTo(i * 6, -10);
        ctx.lineTo(i * 7 + wiggle, -18);
        ctx.moveTo(i * 6, 10);
        ctx.lineTo(i * 7 - wiggle, 18);
        ctx.stroke();
      }
      // Carapace
      ctx.fillStyle = flash ? '#ffffff' : PALETTE.scarabBody;
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.ellipse(0, 0, 17, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Gilded spine & mandibles
      ctx.fillStyle = flash ? '#ffffff' : PALETTE.scarabTrim;
      ctx.beginPath();
      ctx.ellipse(-2, 0, 9, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffe58f';
      ctx.beginPath();
      ctx.arc(11, -5, 3, 0, Math.PI * 2);
      ctx.arc(11, 5, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === 'sentinel') {
      // Octagonal obelisk body
      ctx.fillStyle = flash ? '#ffffff' : PALETTE.sentinelStone;
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        const px = Math.cos(a) * e.radius;
        const py = Math.sin(a) * e.radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Rotating brass collar
      ctx.save();
      ctx.rotate(elapsed * 1.4);
      ctx.strokeStyle = PALETTE.brassMid;
      ctx.lineWidth = 3;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Glowing eye crystal
      ctx.fillStyle = e.state === 'windup' ? '#fff3a1' : PALETTE.sentinelEye;
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(Math.cos(e.facing) * 4, Math.sin(e.facing) * 4, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (e.type === 'knight') {
      ctx.rotate(e.facing);
      ctx.fillStyle = flash ? '#ffffff' : PALETTE.knightSteel;
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-18, -17, 34, 34, 8);
      ctx.fill();
      ctx.stroke();

      // Brass crest & halberd blade
      ctx.fillStyle = flash ? '#ffffff' : PALETTE.brassBright;
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#e5edf7';
      ctx.beginPath();
      ctx.moveTo(14, -14);
      ctx.lineTo(31, -4);
      ctx.lineTo(14, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (e.type === 'alchemist') {
      // Hooded violet cloak
      ctx.fillStyle = flash ? '#ffffff' : PALETTE.alchemistCloak;
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Emerald bubbling flask
      const bob = Math.sin(elapsed * 6 + e.x) * 2;
      ctx.fillStyle = PALETTE.alchemistAcid;
      ctx.beginPath();
      ctx.arc(Math.cos(e.facing) * 12, Math.sin(e.facing) * 12 + bob, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#c8ff9e';
      ctx.beginPath();
      ctx.arc(0, -1, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === 'boss') {
      this.drawBoss(ctx, e, elapsed, flash);
    }

    // Mini HP bar for damaged non-boss elites
    if (e.type !== 'boss' && e.hp < e.maxHp) {
      ctx.rotate(0);
      ctx.restore();
      ctx.save();
      ctx.translate(e.x, e.y);
      const bw = e.radius * 1.9;
      const pct = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = '#1b1410';
      ctx.fillRect(-bw / 2, -e.radius - 13, bw, 6);
      ctx.fillStyle = '#ff6b4a';
      ctx.fillRect(-bw / 2 + 1, -e.radius - 12, (bw - 2) * pct, 4);
    }

    ctx.restore();
  }

  drawBoss(ctx, boss, elapsed, flash) {
    // Rotating clockwork gear ring
    ctx.save();
    ctx.rotate(boss.orbitAngle);
    ctx.fillStyle = flash ? '#ffffff' : PALETTE.brassMid;
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 3;
    const teeth = 12;
    for (let i = 0; i < teeth; i++) {
      const ang = (i / teeth) * Math.PI * 2;
      ctx.save();
      ctx.rotate(ang);
      ctx.fillRect(boss.radius - 8, -7, 16, 14);
      ctx.strokeRect(boss.radius - 8, -7, 16, 14);
      ctx.restore();
    }
    ctx.restore();

    // Main obsidian astrolabe hull
    ctx.fillStyle = flash ? '#ffffff' : PALETTE.bossObsidian;
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, boss.radius - 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner brass sundial bezel
    ctx.strokeStyle = PALETTE.brassBright;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, boss.radius * 0.66, 0, Math.PI * 2);
    ctx.stroke();

    // Orbiting shield pylons
    for (let i = 0; i < 3; i++) {
      const a = -boss.orbitAngle * 1.3 + (i / 3) * Math.PI * 2;
      const px = Math.cos(a) * (boss.radius + 14);
      const py = Math.sin(a) * (boss.radius + 14);
      ctx.fillStyle = boss.phase === 2 ? '#ff6147' : '#d49526';
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(px, py, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Pulsing Eclipse Core
    const pulse = 1 + Math.sin(elapsed * 7) * 0.12;
    ctx.fillStyle = boss.phase === 2 ? '#ff3d2e' : PALETTE.bossCrimson;
    ctx.strokeStyle = '#ffd86b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 17 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  drawHazardFlask(ctx, flask) {
    ctx.save();
    ctx.strokeStyle = 'rgba(93, 212, 119, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(flask.targetX, flask.targetY, 44 * flask.progress, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = PALETTE.shadow;
    ctx.beginPath();
    ctx.ellipse(flask.x, flask.y, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = PALETTE.alchemistAcid;
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(flask.x, flask.y - flask.z, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  drawHazardPool(ctx, pool, elapsed) {
    ctx.save();
    const fade = Math.min(1, pool.life / 0.8);
    ctx.globalAlpha = fade * 0.72;
    ctx.fillStyle = '#389e52';
    ctx.strokeStyle = '#92f79d';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(pool.x, pool.y, pool.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    for (let i = 0; i < 4; i++) {
      const a = elapsed * 1.4 + i * 1.5;
      const bx = pool.x + Math.cos(a) * (14 + (i % 2) * 14);
      const by = pool.y + Math.sin(a * 1.3) * 16;
      ctx.fillStyle = '#c4ff9e';
      ctx.beginPath();
      ctx.arc(bx, by, 3.5 + Math.sin(elapsed * 6 + i) * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawPickup(ctx, item, elapsed) {
    ctx.save();
    const bob = Math.sin(elapsed * 6 + item.x) * 2.5;
    ctx.translate(item.x, item.y + bob);
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2.2;
    if (item.heals) {
      ctx.fillStyle = '#ff5c5c';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-5, -1.8, 10, 3.6);
      ctx.fillRect(-1.8, -5, 3.6, 10);
    } else {
      ctx.fillStyle = '#ffb32e';
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(8, 0);
      ctx.lineTo(0, 10);
      ctx.lineTo(-8, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  drawProjectile(ctx, proj) {
    ctx.save();
    if (proj.trail.length > 1) {
      ctx.strokeStyle = proj.color;
      ctx.lineWidth = proj.radius * 1.1;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(proj.trail[0].x, proj.trail[0].y);
      for (const pt of proj.trail) {
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.translate(proj.x, proj.y);
    ctx.rotate(proj.angle);
    ctx.fillStyle = proj.color;
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2.2;

    if (proj.fromPlayer) {
      ctx.beginPath();
      ctx.moveTo(proj.radius * 1.7, 0);
      ctx.lineTo(-proj.radius * 0.9, -proj.radius * 0.85);
      ctx.lineTo(-proj.radius * 0.4, 0);
      ctx.lineTo(-proj.radius * 0.9, proj.radius * 0.85);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, proj.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff5d6';
      ctx.beginPath();
      ctx.arc(0, 0, proj.radius * 0.42, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawShockwaveRing(ctx, ring) {
    const t = ring.age / ring.duration;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - t);
    ctx.strokeStyle = ring.color;
    ctx.lineWidth = ring.lineWidth * (1 - t * 0.6);
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, 12 + ring.maxRadius * t, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawLightningArc(ctx, arc) {
    if (arc.points.length < 2) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, arc.life / arc.maxLife);
    ctx.strokeStyle = arc.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(arc.points[0].x, arc.points[0].y);
    for (let i = 1; i < arc.points.length; i++) {
      ctx.lineTo(arc.points[i].x, arc.points[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  drawParticles(ctx, items) {
    for (const p of items) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawFloatingText(ctx, ft) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, ft.life / 0.25);
    ctx.font = `900 ${Math.round(16 * ft.scale)}px "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 4;
    ctx.strokeText(ft.text, ft.x, ft.y);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }

  drawSunbeamsAndMotes(ctx, elapsed) {
    ctx.save();
    // Diagonal sunlit shafts from top-left
    const beamGrad = ctx.createLinearGradient(100, 60, 900, 660);
    beamGrad.addColorStop(0, 'rgba(255, 236, 175, 0.13)');
    beamGrad.addColorStop(1, 'rgba(255, 236, 175, 0)');
    ctx.fillStyle = beamGrad;
    for (let i = 0; i < 3; i++) {
      const bx = 140 + i * 320;
      ctx.beginPath();
      ctx.moveTo(bx, 0);
      ctx.lineTo(bx + 150, 0);
      ctx.lineTo(bx + 420, CANVAS_HEIGHT);
      ctx.lineTo(bx + 240, CANVAS_HEIGHT);
      ctx.closePath();
      ctx.fill();
    }

    // Floating gilded dust motes
    for (const m of this.dustMotes) {
      const mx = m.x + Math.sin(elapsed * 0.7 + m.phase) * 18;
      const my = m.y + Math.cos(elapsed * 0.55 + m.phase) * 14;
      ctx.fillStyle = 'rgba(255, 234, 160, 0.42)';
      ctx.beginPath();
      ctx.arc(mx, my, m.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Subtle warm vignette around frame edges
    const vig = ctx.createRadialGradient(
      CANVAS_WIDTH * 0.5,
      CANVAS_HEIGHT * 0.5,
      CANVAS_WIDTH * 0.36,
      CANVAS_WIDTH * 0.5,
      CANVAS_HEIGHT * 0.5,
      CANVAS_WIDTH * 0.68
    );
    vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vig.addColorStop(1, 'rgba(18, 12, 8, 0.36)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.restore();
  }

  drawReticle(ctx, x, y, parrying) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = parrying ? '#fff29c' : '#1a1410';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#ffd55a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.moveTo(-16, 0);
    ctx.lineTo(-7, 0);
    ctx.moveTo(7, 0);
    ctx.lineTo(16, 0);
    ctx.moveTo(0, -16);
    ctx.lineTo(0, -7);
    ctx.moveTo(0, 7);
    ctx.lineTo(0, 16);
    ctx.stroke();
    ctx.restore();
  }
}
