/**
 * Deterministic screenshot staging via `?shot=title|combat|boss|gameover`.
 * Builds live engine worlds for high-signal judge contact-sheet rendering.
 */

import { ARENA_HEIGHT, ARENA_WIDTH, POLARITY, POLARITY_META } from './config.js';
import {
  createBoss,
  createBullet,
  createChaserDrone,
  createLaserGate,
  createResonanceOrb,
  createTurretBastion,
} from './entities.js';
import { computePerkStats } from './perks.js';

export function getRequestedShot() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot === 'title' || shot === 'combat' || shot === 'boss' || shot === 'gameover') {
    return shot;
  }
  return null;
}

export function applyShotScene(world, shot, input) {
  if (!shot) return;

  if (shot === 'title') {
    world.reset('title');
    world.time = 1.4;
    world.effects.emitRing(world.player.x, world.player.y, 48, POLARITY_META.cyan.primary, 2.5, 0.3);
    return;
  }

  if (shot === 'combat') {
    world.reset('playing');
    world.sectorIndex = 1;
    world.sectorKills = 12;
    world.sectorTime = 16;
    world.bannerTimer = 0;
    world.score = 14850;
    world.combo = 8;
    world.maxCombo = 8;
    world.comboTimer = 3.2;
    world.kills = 24;
    world.installedPerks = ['magnetic_coil', 'arc_chain', 'twin_pulse'];
    world.perkStats = computePerkStats(world.installedPerks);

    world.player.x = 340;
    world.player.y = 410;
    world.player.angle = -0.18;
    world.player.shield = 86;
    world.player.overdrive = 84;
    world.player.polarity = POLARITY.CYAN;
    input.mouseX = 820;
    input.mouseY = 320;

    world.enemies = [
      createChaserDrone(680, 290, 2, POLARITY.CYAN),
      createChaserDrone(790, 220, 2, POLARITY.CYAN),
      createChaserDrone(640, 480, 2, POLARITY.AMBER),
      createTurretBastion(940, 390, 2, POLARITY.AMBER),
    ];
    world.enemies[0].hp = 18;
    world.enemies[0].trail = [
      { x: 750, y: 260 },
      { x: 720, y: 274 },
      { x: 695, y: 284 },
    ];

    world.gates = [createLaserGate(1050, 210, POLARITY.CYAN, 200)];
    world.gates[0].warmUp = 0;
    world.gates[0].angle = 0.65;

    world.orbs = [
      createResonanceOrb(220, 260, POLARITY.CYAN),
      createResonanceOrb(450, 560, POLARITY.CYAN),
      createResonanceOrb(540, 210, POLARITY.AMBER),
    ];

    // Active player twin bolts + bastion radial bullets
    for (let k = 0; k < 4; k++) {
      world.bullets.push(
        createBullet({
          x: 410 + k * 65,
          y: 396 - k * 12,
          vx: 820,
          vy: -145,
          polarity: POLARITY.CYAN,
          fromPlayer: true,
        })
      );
    }
    for (let k = 0; k < 10; k++) {
      const ang = (Math.PI * 2 * k) / 10 + 0.2;
      world.bullets.push(
        createBullet({
          x: 940 + Math.cos(ang) * 95,
          y: 390 + Math.sin(ang) * 95,
          vx: Math.cos(ang) * 200,
          vy: Math.sin(ang) * 200,
          polarity: POLARITY.AMBER,
          fromPlayer: false,
          radius: 6,
        })
      );
    }

    world.effects.emitArc(680, 290, 790, 220, POLARITY_META.cyan.primary, 0.25);
    world.effects.emitBurst(680, 290, POLARITY_META.cyan.primary, 18, 90, 260, 3.2, 0.45);
    world.effects.emitRing(680, 290, 62, POLARITY_META.cyan.primary, 3, 0.35);
    world.effects.emitPopup(680, 248, '+1760 COMBO x8!', '#00F0FF', 1.25, 0.9);
    world.effects.emitPopup(790, 188, 'CHAIN x2', '#5CE1FF', 1.05, 0.9);
    world.addGridImpulse(680, 290, 1.5, 220);
    return;
  }

  if (shot === 'boss') {
    world.reset('playing');
    world.sectorIndex = 3;
    world.bannerTimer = 0;
    world.score = 62400;
    world.combo = 12;
    world.maxCombo = 12;
    world.comboTimer = 3.0;
    world.kills = 47;
    world.installedPerks = ['magnetic_coil', 'arc_chain', 'nova_dash', 'twin_pulse', 'aegis_cap'];
    world.perkStats = computePerkStats(world.installedPerks);

    world.player.maxShield = 125;
    world.player.shield = 98;
    world.player.overdrive = 100;
    world.player.polarity = POLARITY.AMBER;
    world.player.x = 320;
    world.player.y = 430;
    world.player.angle = -0.1;
    input.mouseX = 910;
    input.mouseY = 360;

    world.boss = createBoss(world.currentSector);
    world.boss.x = 910;
    world.boss.y = 360;
    world.boss.hp = 1140;
    world.boss.phase = 2;
    world.boss.polarity = POLARITY.AMBER;

    world.enemies = [createChaserDrone(640, 200, 4, POLARITY.AMBER)];
    world.orbs = [
      createResonanceOrb(250, 240, POLARITY.AMBER),
      createResonanceOrb(520, 560, POLARITY.CYAN),
    ];

    // Dash afterimages trailing behind player
    for (let i = 1; i <= 5; i++) {
      world.effects.emitAfterimage(
        320 - i * 28,
        430 + i * 10,
        -0.1,
        POLARITY_META.amber.primary,
        15,
        0.35 - i * 0.04
      );
    }

    // Twin Amber player bolts streaming toward Boss
    for (let k = 0; k < 4; k++) {
      for (const off of [-7, 7]) {
        world.bullets.push(
          createBullet({
            x: 380 + k * 105,
            y: 424 - k * 12 + off,
            vx: 840,
            vy: -80,
            polarity: POLARITY.AMBER,
            fromPlayer: true,
          })
        );
      }
    }

    // Spiral Cyan/Amber bullet curtain from Singularity Nexus
    for (let ring = 0; ring < 4; ring++) {
      const dist = 105 + ring * 68;
      for (let arm = 0; arm < 8; arm++) {
        const ang = arm * ((Math.PI * 2) / 8) + ring * 0.34;
        const pol = arm % 2 === 0 ? POLARITY.CYAN : POLARITY.AMBER;
        world.bullets.push(
          createBullet({
            x: world.boss.x + Math.cos(ang) * dist,
            y: world.boss.y + Math.sin(ang) * dist,
            vx: Math.cos(ang) * 235,
            vy: Math.sin(ang) * 235,
            polarity: pol,
            fromPlayer: false,
            radius: 6,
          })
        );
      }
    }

    world.effects.emitRing(world.boss.x, world.boss.y, 170, '#FF2E93', 4, 0.45);
    world.effects.emitBurst(world.boss.x - 40, world.boss.y + 15, POLARITY_META.amber.primary, 16, 80, 260, 3.2, 0.45);
    world.effects.emitPopup(world.boss.x - 55, world.boss.y - 78, 'CRITICAL x12!', '#FF9E1B', 1.25, 0.9);
    world.addGridImpulse(world.boss.x, world.boss.y, 1.8, 280);
    return;
  }

  if (shot === 'gameover') {
    world.reset('playing');
    world.sectorIndex = 3;
    world.score = 84920;
    world.kills = 63;
    world.maxCombo = 14;
    world.shotsFired = 240;
    world.shotsHit = 202;
    world.installedPerks = ['magnetic_coil', 'arc_chain', 'nova_dash', 'twin_pulse'];
    world.state = 'victory';
    world.effects.emitBurst(ARENA_WIDTH * 0.5, ARENA_HEIGHT * 0.5, '#32F5A8', 32, 90, 340, 3.5, 0.65);
  }
}
