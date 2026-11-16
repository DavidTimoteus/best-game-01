/**
 * Entity constructors for the player vessel, polarity bullets, and all 5 enemy
 * and hazard archetypes (Resonance Orbs, Chaser Drones, Laser Gates,
 * Turret Bastions, and the Singularity Nexus Boss).
 */

import { ARENA_HEIGHT, ARENA_WIDTH, PLAYER_CONFIG, POLARITY } from './config.js';

let nextEntityId = 1;

export function resetEntityIds() {
  nextEntityId = 1;
}

export function otherPolarity(polarity) {
  return polarity === POLARITY.CYAN ? POLARITY.AMBER : POLARITY.CYAN;
}

export function randomPolarity() {
  return Math.random() < 0.5 ? POLARITY.CYAN : POLARITY.AMBER;
}

export function createPlayer() {
  return {
    x: ARENA_WIDTH * 0.28,
    y: ARENA_HEIGHT * 0.52,
    vx: 0,
    vy: 0,
    angle: 0,
    radius: PLAYER_CONFIG.radius,
    polarity: POLARITY.CYAN,
    shield: PLAYER_CONFIG.maxShield,
    maxShield: PLAYER_CONFIG.maxShield,
    overdrive: 0,
    dashTimer: 0,
    dashCooldown: 0,
    dashTrailTick: 0,
    dashDirX: 1,
    dashDirY: 0,
    fireCooldown: 0,
    invulnTimer: 0,
    hitFlash: 0,
    shiftFlash: 0,
  };
}

export function createBullet({
  x,
  y,
  vx,
  vy,
  polarity,
  fromPlayer = true,
  damage = PLAYER_CONFIG.bulletDamage,
  radius = 5,
  pierce = 0,
  life = 1.6,
}) {
  return {
    id: nextEntityId++,
    x,
    y,
    vx,
    vy,
    polarity,
    fromPlayer,
    damage,
    radius,
    pierce,
    hitIds: new Set(),
    life,
    maxLife: life,
  };
}

export function createResonanceOrb(x, y, polarity = randomPolarity()) {
  const angle = Math.random() * Math.PI * 2;
  const speed = 38 + Math.random() * 44;
  return {
    id: nextEntityId++,
    kind: 'orb',
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: 14,
    polarity,
    pulse: Math.random() * Math.PI * 2,
    life: 16,
  };
}

export function createChaserDrone(x, y, sector = 1, polarity = randomPolarity()) {
  const hp = 38 + (sector - 1) * 14;
  return {
    id: nextEntityId++,
    kind: 'chaser',
    x,
    y,
    vx: 0,
    vy: 0,
    angle: 0,
    radius: 17,
    hp,
    maxHp: hp,
    speed: 142 + (sector - 1) * 18 + Math.random() * 22,
    polarity,
    hitFlash: 0,
    trail: [],
    score: 220,
  };
}

export function createLaserGate(x, y, polarity = randomPolarity(), length = 195) {
  return {
    id: nextEntityId++,
    kind: 'gate',
    x,
    y,
    angle: Math.random() * Math.PI,
    angularVel: (Math.random() < 0.5 ? 1 : -1) * (0.48 + Math.random() * 0.25),
    halfLength: length * 0.5,
    radius: 14,
    polarity,
    phaseCooldown: 0,
    life: 15,
    warmUp: 0.7,
    pulse: 0,
  };
}

export function createTurretBastion(x, y, sector = 2, polarity = randomPolarity()) {
  const hp = 125 + (sector - 1) * 28;
  return {
    id: nextEntityId++,
    kind: 'bastion',
    x,
    y,
    radius: 26,
    hp,
    maxHp: hp,
    polarity,
    rot: 0,
    fireTimer: 1.1 + Math.random() * 0.6,
    firePeriod: Math.max(1.55, 2.35 - sector * 0.16),
    chargeRatio: 0,
    hitFlash: 0,
    score: 480,
  };
}

export function createBoss(sectorSpec) {
  const cfg = sectorSpec.boss;
  return {
    id: nextEntityId++,
    kind: 'boss',
    name: cfg.name,
    subtitle: cfg.subtitle,
    x: ARENA_WIDTH * 0.76,
    y: ARENA_HEIGHT * 0.5,
    targetX: ARENA_WIDTH * 0.76,
    targetY: ARENA_HEIGHT * 0.5,
    radius: cfg.radius,
    hp: cfg.maxHp,
    maxHp: cfg.maxHp,
    phases: cfg.phases,
    phase: 1,
    polarity: POLARITY.CYAN,
    rot: 0,
    ringRot: 0,
    spiralAngle: 0,
    spiralTimer: 0.14,
    burstTimer: 2.2,
    shiftTimer: 5.5,
    minionTimer: 6.5,
    laserAngle: Math.PI,
    laserSweep: 0,
    hitFlash: 0,
    score: 2500 * cfg.phases,
  };
}
