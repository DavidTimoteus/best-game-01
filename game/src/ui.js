/**
 * High-contrast HUD and modal interface renderer (Title screen, active combat HUD,
 * Boss HP bar, 3-card Core Upgrade Draft, and Victory / Game Over results card).
 */

import { ARENA_HEIGHT, ARENA_WIDTH, COLORS, POLARITY_META, SECTORS } from './config.js';
import { getPerkDef } from './perks.js';

export class HudOverlay {
  constructor() {
    this.hitboxes = {
      startBtn: null,
      restartBtn: null,
      draftCards: [],
    };
  }

  _pill(ctx, x, y, w, h, radius, fill, stroke, lineWidth = 1.5) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
  }

  render(ctx, world, soundMuted = false) {
    this.hitboxes.startBtn = null;
    this.hitboxes.restartBtn = null;
    this.hitboxes.draftCards = [];

    if (world.state === 'title') {
      this._drawTitleScreen(ctx, world);
      return;
    }

    this._drawTopHud(ctx, world, soundMuted);
    this._drawBottomHud(ctx, world);

    if (world.state === 'playing' && world.bannerTimer > 0 && !world.boss) {
      this._drawSectorBanner(ctx, world);
    }
    if (world.state === 'draft') {
      this._drawDraftOverlay(ctx, world);
    } else if (world.state === 'gameover' || world.state === 'victory') {
      this._drawEndScreen(ctx, world);
    }
  }

  _drawTopHud(ctx, world, soundMuted) {
    const sector = world.currentSector;
    // Left: Sector + Wave Progress
    this._pill(ctx, 22, 14, 340, 44, 10, COLORS.panelBg, COLORS.panelBorder, 1.5);
    ctx.fillStyle = '#00F0FF';
    ctx.font = '800 13px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SECTOR 0${sector.id} // ${sector.name}`, 36, 33);

    const progress = world.boss
      ? 1 - world.boss.hp / world.boss.maxHp
      : Math.min(1, Math.max(world.sectorKills / sector.targetKills, world.sectorTime / sector.duration));
    this._pill(ctx, 36, 41, 312, 8, 4, 'rgba(255,255,255,0.1)', null);
    if (progress > 0) {
      this._pill(ctx, 36, 41, Math.max(8, 312 * progress), 8, 4, world.boss ? COLORS.bossPink : '#00F0FF', null);
    }

    // Center: Boss HP Bar or Sector Goal
    if (world.boss) {
      const b = world.boss;
      const bw = 460;
      const bx = ARENA_WIDTH * 0.5 - bw * 0.5;
      this._pill(ctx, bx, 12, bw, 48, 10, 'rgba(20, 8, 34, 0.9)', COLORS.bossPink, 2);
      ctx.textAlign = 'center';
      ctx.fillStyle = COLORS.white;
      ctx.font = '800 14px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(`${b.name}  ·  PHASE ${b.phase}/${b.phases}`, ARENA_WIDTH * 0.5, 31);

      const barW = bw - 28;
      const hpRatio = Math.max(0, b.hp / b.maxHp);
      this._pill(ctx, bx + 14, 38, barW, 12, 5, 'rgba(255,255,255,0.12)', null);
      if (hpRatio > 0) {
        const barGrad = ctx.createLinearGradient(bx + 14, 0, bx + 14 + barW, 0);
        barGrad.addColorStop(0, '#FF2E93');
        barGrad.addColorStop(0.55, '#B44CFF');
        barGrad.addColorStop(1, '#00F0FF');
        this._pill(ctx, bx + 14, 38, Math.max(10, barW * hpRatio), 12, 5, barGrad, null);
      }
      // Phase notch ticks
      ctx.strokeStyle = 'rgba(8, 12, 24, 0.85)';
      ctx.lineWidth = 2;
      for (let p = 1; p < b.phases; p++) {
        const tx = bx + 14 + (barW * p) / b.phases;
        ctx.beginPath();
        ctx.moveTo(tx, 38);
        ctx.lineTo(tx, 50);
        ctx.stroke();
      }
    }

    // Right: Score + Combo Multiplier
    this._pill(ctx, ARENA_WIDTH - 342, 14, 320, 44, 10, COLORS.panelBg, COLORS.panelBorder, 1.5);
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.muted;
    ctx.font = '700 11px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('SCORE', ARENA_WIDTH - 326, 30);
    ctx.fillStyle = COLORS.white;
    ctx.font = '900 22px "Consolas", monospace';
    ctx.fillText(String(world.score).padStart(7, '0'), ARENA_WIDTH - 326, 50);

    const comboColor = world.combo >= 8 ? '#FF9E1B' : world.combo >= 4 ? '#00F0FF' : COLORS.muted;
    this._pill(ctx, ARENA_WIDTH - 156, 20, 122, 32, 8, 'rgba(255,255,255,0.06)', comboColor, 1.5);
    ctx.textAlign = 'center';
    ctx.fillStyle = comboColor;
    ctx.font = '900 16px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`COMBO x${world.combo}`, ARENA_WIDTH - 95, 41);

    if (soundMuted) {
      ctx.fillStyle = COLORS.muted;
      ctx.font = '700 11px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('MUTED [M]', ARENA_WIDTH - 24, 72);
    }
  }

  _drawBottomHud(ctx, world) {
    const p = world.player;
    const meta = POLARITY_META[p.polarity];

    // Bottom-left: Shield + Overdrive + Installed Perks
    this._pill(ctx, 22, ARENA_HEIGHT - 86, 405, 72, 12, COLORS.panelBg, COLORS.panelBorder, 1.5);

    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.white;
    ctx.font = '800 13px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`SHIELD  ${Math.ceil(p.shield)} / ${p.maxShield}`, 38, ARENA_HEIGHT - 64);

    const shieldRatio = Math.max(0, p.shield / p.maxShield);
    const shieldColor = shieldRatio > 0.35 ? '#32F5A8' : COLORS.danger;
    this._pill(ctx, 178, ARENA_HEIGHT - 74, 230, 12, 6, 'rgba(255,255,255,0.1)', null);
    if (shieldRatio > 0) {
      this._pill(ctx, 178, ARENA_HEIGHT - 74, Math.max(10, 230 * shieldRatio), 12, 6, shieldColor, null);
    }

    const novaReady = p.overdrive >= 100;
    ctx.fillStyle = novaReady ? '#FF9E1B' : '#00F0FF';
    ctx.font = '800 13px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(novaReady ? 'OVERDRIVE READY [F]' : `OVERDRIVE  ${Math.floor(p.overdrive)}%`, 38, ARENA_HEIGHT - 42);
    this._pill(ctx, 212, ARENA_HEIGHT - 52, 196, 11, 5, 'rgba(255,255,255,0.1)', null);
    if (p.overdrive > 0) {
      this._pill(
        ctx,
        212,
        ARENA_HEIGHT - 52,
        Math.max(8, 196 * (p.overdrive / 100)),
        11,
        5,
        novaReady ? '#FF9E1B' : '#00F0FF',
        null
      );
    }

    // Active Perks badges
    let px = 38;
    const py = ARENA_HEIGHT - 34;
    if (world.installedPerks.length === 0) {
      ctx.fillStyle = COLORS.muted;
      ctx.font = '600 11px "Segoe UI", system-ui, sans-serif';
      ctx.fillText('CORES: STANDARD CHASSIS (CLEAR SECTOR TO DRAFT)', px, py + 11);
    } else {
      const grouped = new Map();
      for (const id of world.installedPerks) grouped.set(id, (grouped.get(id) || 0) + 1);
      for (const [id, lvl] of grouped.entries()) {
        const def = getPerkDef(id);
        const label = lvl > 1 ? `${def.code} x${lvl}` : def.code;
        const w = label.length * 7.8 + 16;
        this._pill(ctx, px, py - 2, w, 17, 5, 'rgba(255,255,255,0.08)', def.color, 1.2);
        ctx.fillStyle = def.color;
        ctx.font = '800 10.5px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, px + w * 0.5, py + 10);
        px += w + 6;
      }
    }

    // Bottom-right: Polarity + Ability Pills
    this._pill(ctx, ARENA_WIDTH - 418, ARENA_HEIGHT - 78, 396, 64, 12, COLORS.panelBg, meta.primary, 1.8);

    // Polarity Badge
    this._pill(ctx, ARENA_WIDTH - 404, ARENA_HEIGHT - 68, 152, 44, 8, meta.tint, meta.primary, 1.5);
    ctx.textAlign = 'center';
    ctx.fillStyle = meta.primary;
    ctx.font = '900 16px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`${meta.label} PHASE`, ARENA_WIDTH - 328, ARENA_HEIGHT - 46);
    ctx.fillStyle = COLORS.white;
    ctx.font = '700 11px "Consolas", monospace';
    ctx.fillText(meta.freq, ARENA_WIDTH - 328, ARENA_HEIGHT - 30);

    // Ability Pills
    const dashReady = p.dashCooldown <= 0;
    this._pill(
      ctx,
      ARENA_WIDTH - 240,
      ARENA_HEIGHT - 66,
      102,
      40,
      8,
      dashReady ? 'rgba(50, 245, 168, 0.14)' : 'rgba(255,255,255,0.05)',
      dashReady ? '#32F5A8' : COLORS.muted,
      1.3
    );
    ctx.fillStyle = dashReady ? '#32F5A8' : COLORS.muted;
    ctx.font = '800 12px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('[SPACE] DASH', ARENA_WIDTH - 189, ARENA_HEIGHT - 47);
    ctx.font = '700 11px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(dashReady ? 'READY' : `${p.dashCooldown.toFixed(1)}s`, ARENA_WIDTH - 189, ARENA_HEIGHT - 32);

    this._pill(
      ctx,
      ARENA_WIDTH - 128,
      ARENA_HEIGHT - 66,
      94,
      40,
      8,
      novaReady ? 'rgba(255, 158, 27, 0.22)' : 'rgba(255,255,255,0.05)',
      novaReady ? '#FF9E1B' : COLORS.muted,
      1.3
    );
    ctx.fillStyle = novaReady ? '#FF9E1B' : COLORS.muted;
    ctx.font = '800 12px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('[F] NOVA', ARENA_WIDTH - 81, ARENA_HEIGHT - 47);
    ctx.font = '700 11px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(novaReady ? 'ARMED!' : '[Q] SHIFT', ARENA_WIDTH - 81, ARENA_HEIGHT - 32);
  }

  _drawSectorBanner(ctx, world) {
    const alpha = Math.min(1, world.bannerTimer);
    const s = world.currentSector;
    ctx.save();
    ctx.globalAlpha = alpha;
    this._pill(ctx, ARENA_WIDTH * 0.5 - 230, 88, 460, 58, 12, 'rgba(6, 12, 26, 0.88)', '#00F0FF', 1.8);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#00F0FF';
    ctx.font = '900 20px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`SECTOR 0${s.id} : ${s.name}`, ARENA_WIDTH * 0.5, 114);
    ctx.fillStyle = COLORS.muted;
    ctx.font = '700 12px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(s.subtitle, ARENA_WIDTH * 0.5, 134);
    ctx.restore();
  }

  _drawTitleScreen(ctx, world) {
    ctx.save();
    ctx.fillStyle = 'rgba(4, 7, 17, 0.46)';
    ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

    const cardW = 680;
    const cardH = 448;
    const cx = ARENA_WIDTH * 0.5 - cardW * 0.5;
    const cy = ARENA_HEIGHT * 0.5 - cardH * 0.5;

    this._pill(ctx, cx, cy, cardW, cardH, 18, 'rgba(7, 12, 28, 0.90)', '#00F0FF', 2.2);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#00F0FF';
    ctx.font = '800 14px "Consolas", monospace';
    ctx.fillText('DUAL-FREQUENCY VECTOR ARENA ROGUELIKE', ARENA_WIDTH * 0.5, cy + 44);

    ctx.shadowColor = 'rgba(0, 240, 255, 0.5)';
    ctx.shadowBlur = 22;
    ctx.fillStyle = COLORS.white;
    ctx.font = '900 54px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('GRID PRISM', ARENA_WIDTH * 0.5, cy + 104);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#FF9E1B';
    ctx.font = '800 22px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('POLARITY PROTOCOL', ARENA_WIDTH * 0.5, cy + 136);

    // 3 Core Rules Row
    const rules = [
      {
        title: 'MATCH TO ABSORB',
        line1: 'Cyan / Amber orbs & beams',
        line2: 'charge Overdrive meter',
        color: '#00F0FF',
      },
      {
        title: 'CRITICAL TARGETING',
        line1: 'Matched bolts deal 2x dmg',
        line2: '& chain lightning arcs',
        color: '#32F5A8',
      },
      {
        title: '4 SECTORS + BOSS',
        line1: 'Draft core upgrades &',
        line2: 'shatter Singularity Nexus',
        color: '#FF9E1B',
      },
    ];
    rules.forEach((r, idx) => {
      const rw = 196;
      const rx = cx + 32 + idx * (rw + 14);
      const ry = cy + 162;
      this._pill(ctx, rx, ry, rw, 70, 10, 'rgba(255,255,255,0.05)', r.color, 1.4);
      ctx.fillStyle = r.color;
      ctx.font = '800 12px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(r.title, rx + rw * 0.5, ry + 26);
      ctx.fillStyle = COLORS.muted;
      ctx.font = '600 11.5px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(r.line1, rx + rw * 0.5, ry + 45);
      ctx.fillText(r.line2, rx + rw * 0.5, ry + 60);
    });

    // Controls Strip
    this._pill(ctx, cx + 32, cy + 250, cardW - 64, 86, 10, 'rgba(15, 25, 52, 0.85)', COLORS.panelBorder, 1.2);
    const controls = [
      ['WASD / ARROWS', 'Move'],
      ['MOUSE / L-CLICK', 'Aim & Fire'],
      ['Q / R-CLICK', 'Shift Polarity'],
      ['SPACE', 'Chrono-Dash'],
      ['F', 'Overdrive Nova'],
    ];
    controls.forEach(([key, act], i) => {
      const kx = cx + 96 + i * 122;
      ctx.fillStyle = '#00F0FF';
      ctx.font = '800 12px "Consolas", monospace';
      ctx.fillText(key, kx, cy + 284);
      ctx.fillStyle = COLORS.white;
      ctx.font = '700 13px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(act, kx, cy + 308);
    });

    // CTA Button
    const btnW = 280;
    const btnH = 54;
    const bx = ARENA_WIDTH * 0.5 - btnW * 0.5;
    const by = cy + 362;
    const pulseGlow = 14 + Math.sin(world.time * 5) * 6;
    ctx.shadowColor = '#00F0FF';
    ctx.shadowBlur = pulseGlow;
    this._pill(ctx, bx, by, btnW, btnH, 12, '#00D8EC', '#E8FFFF', 2);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#04101E';
    ctx.font = '900 20px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('INITIALIZE RUN [ENTER]', ARENA_WIDTH * 0.5, by + 34);

    this.hitboxes.startBtn = { x: bx, y: by, w: btnW, h: btnH };
    ctx.restore();
  }

  _drawDraftOverlay(ctx, world) {
    ctx.save();
    ctx.fillStyle = 'rgba(4, 7, 17, 0.78)';
    ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#32F5A8';
    ctx.font = '800 15px "Consolas", monospace';
    ctx.fillText(`SECTOR 0${world.sectorIndex + 1} CLEARED // SELECT HARDWARE MODULE`, ARENA_WIDTH * 0.5, 146);

    ctx.fillStyle = COLORS.white;
    ctx.font = '900 38px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('CORE UPGRADE DRAFT', ARENA_WIDTH * 0.5, 192);

    const cardW = 280;
    const cardH = 260;
    const gap = 26;
    const startX = ARENA_WIDTH * 0.5 - (cardW * 3 + gap * 2) * 0.5;
    const cy = 236;

    world.draftChoices.forEach((perk, idx) => {
      const x = startX + idx * (cardW + gap);
      this._pill(ctx, x, cy, cardW, cardH, 14, 'rgba(9, 16, 36, 0.94)', perk.color, 2.2);

      this._pill(ctx, x + 22, cy + 20, 56, 28, 7, 'rgba(255,255,255,0.08)', perk.color, 1.2);
      ctx.fillStyle = perk.color;
      ctx.font = '900 14px "Consolas", monospace';
      ctx.fillText(`[${idx + 1}]`, x + 50, cy + 39);

      ctx.fillStyle = perk.color;
      ctx.font = '900 21px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(perk.name, x + cardW * 0.5, cy + 92);

      ctx.fillStyle = COLORS.white;
      ctx.font = '600 15px "Segoe UI", system-ui, sans-serif';
      const words = perk.summary.split(' ');
      let line = '';
      let ly = cy + 132;
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (test.length > 26) {
          ctx.fillText(line, x + cardW * 0.5, ly);
          line = word;
          ly += 24;
        } else {
          line = test;
        }
      }
      if (line) ctx.fillText(line, x + cardW * 0.5, ly);

      this._pill(ctx, x + 36, cy + cardH - 54, cardW - 72, 36, 8, perk.color, null);
      ctx.fillStyle = '#050914';
      ctx.font = '900 14px "Segoe UI", system-ui, sans-serif';
      ctx.fillText('INSTALL MODULE', x + cardW * 0.5, cy + cardH - 31);

      this.hitboxes.draftCards.push({ index: idx, x, y: cy, w: cardW, h: cardH });
    });

    ctx.restore();
  }

  _drawEndScreen(ctx, world) {
    const win = world.state === 'victory';
    const accent = win ? '#32F5A8' : COLORS.danger;

    ctx.save();
    ctx.fillStyle = 'rgba(4, 7, 17, 0.72)';
    ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

    const w = 640;
    const h = 446;
    const x = ARENA_WIDTH * 0.5 - w * 0.5;
    const y = ARENA_HEIGHT * 0.5 - h * 0.5;
    this._pill(ctx, x, y, w, h, 18, 'rgba(8, 13, 30, 0.94)', accent, 2.5);

    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.font = '800 14px "Consolas", monospace';
    ctx.fillText(win ? 'SINGULARITY NEXUS SHATTERED' : 'SHIELD INTEGRITY DEPLETED', ARENA_WIDTH * 0.5, y + 46);

    ctx.fillStyle = COLORS.white;
    ctx.font = '900 44px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(win ? 'PROTOCOL COMPLETE' : 'NEURAL LINK SEVERED', ARENA_WIDTH * 0.5, y + 96);

    // Score highlight
    this._pill(ctx, x + 52, y + 120, w - 104, 76, 12, 'rgba(255,255,255,0.05)', accent, 1.5);
    ctx.fillStyle = COLORS.muted;
    ctx.font = '700 12px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('FINAL SCORE', ARENA_WIDTH * 0.5, y + 144);
    ctx.fillStyle = '#00F0FF';
    ctx.font = '900 38px "Consolas", monospace';
    ctx.fillText(world.score.toLocaleString('en-US'), ARENA_WIDTH * 0.5, y + 182);

    // 4 Stat Tiles
    const stats = [
      { label: 'SECTOR REACHED', val: `0${Math.min(SECTORS.length, world.sectorIndex + 1)} / 04` },
      { label: 'HOSTILES CLEARED', val: String(world.kills) },
      { label: 'PEAK COMBO', val: `x${world.maxCombo}` },
      { label: 'ACCURACY', val: `${world.accuracyPct}%` },
    ];
    stats.forEach((st, idx) => {
      const tw = 126;
      const tx = x + 44 + idx * (tw + 16);
      const ty = y + 214;
      this._pill(ctx, tx, ty, tw, 68, 10, 'rgba(255,255,255,0.04)', COLORS.panelBorder, 1.2);
      ctx.fillStyle = COLORS.muted;
      ctx.font = '700 10.5px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(st.label, tx + tw * 0.5, ty + 23);
      ctx.fillStyle = COLORS.white;
      ctx.font = '900 22px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(st.val, tx + tw * 0.5, ty + 51);
    });

    // Installed Perks Summary
    ctx.fillStyle = COLORS.muted;
    ctx.font = '700 12px "Segoe UI", system-ui, sans-serif';
    const perkNames =
      world.installedPerks.length > 0
        ? world.installedPerks.map((id) => getPerkDef(id).code).join(' · ')
        : 'NONE';
    ctx.fillText(`CORES INSTALLED: ${perkNames}`, ARENA_WIDTH * 0.5, y + 314);

    // Restart Button
    const btnW = 280;
    const btnH = 54;
    const bx = ARENA_WIDTH * 0.5 - btnW * 0.5;
    const by = y + 350;
    this._pill(ctx, bx, by, btnW, btnH, 12, accent, COLORS.white, 2);
    ctx.fillStyle = '#050814';
    ctx.font = '900 20px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('PLAY AGAIN [R]', ARENA_WIDTH * 0.5, by + 34);
    this.hitboxes.restartBtn = { x: bx, y: by, w: btnW, h: btnH };

    ctx.restore();
  }
}
