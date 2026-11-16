/**
 * Core configuration, palette definitions, sector tables, and gameplay tuning
 * for Grid Prism: Polarity Protocol.
 */

export const ARENA_WIDTH = 1280;
export const ARENA_HEIGHT = 720;
export const ARENA_PADDING = 36;
export const FIXED_DT = 1 / 60;

export const POLARITY = {
  CYAN: 'cyan',
  AMBER: 'amber',
};

export const POLARITY_META = {
  cyan: {
    id: 'cyan',
    label: 'CYAN',
    freq: '440 THz',
    core: '#E8FFFF',
    primary: '#00F0FF',
    secondary: '#0088CC',
    glow: 'rgba(0, 240, 255, 0.45)',
    tint: 'rgba(0, 240, 255, 0.14)',
  },
  amber: {
    id: 'amber',
    label: 'AMBER',
    freq: '880 THz',
    core: '#FFF6DE',
    primary: '#FF9E1B',
    secondary: '#E05300',
    glow: 'rgba(255, 158, 27, 0.45)',
    tint: 'rgba(255, 158, 27, 0.14)',
  },
};

export const COLORS = {
  bgDeep: '#050711',
  bgMid: '#0A1024',
  gridLine: 'rgba(72, 130, 210, 0.16)',
  gridAccent: 'rgba(0, 240, 255, 0.24)',
  white: '#F4F8FF',
  muted: '#8DA3C7',
  danger: '#FF3B6B',
  dangerGlow: 'rgba(255, 59, 107, 0.45)',
  bossViolet: '#B44CFF',
  bossPink: '#FF2E93',
  success: '#32F5A8',
  panelBg: 'rgba(8, 13, 28, 0.84)',
  panelBorder: 'rgba(130, 185, 255, 0.30)',
};

export const PLAYER_CONFIG = {
  radius: 15,
  accel: 2450,
  maxSpeed: 390,
  drag: 8.5,
  dashSpeed: 980,
  dashDuration: 0.21,
  dashCooldown: 1.35,
  fireInterval: 0.145,
  bulletSpeed: 840,
  bulletDamage: 24,
  maxShield: 100,
  invulnOnHit: 0.65,
  pickupRadius: 28,
};

export const SECTORS = [
  {
    id: 1,
    name: 'CALIBRATION GRID',
    subtitle: 'HARMONIC SYNC INITIALIZED',
    duration: 24,
    targetKills: 12,
    spawnRate: 1.35,
    maxEnemies: 7,
    weights: { orb: 0.46, chaser: 0.40, gate: 0.14, bastion: 0.0 },
    boss: null,
  },
  {
    id: 2,
    name: 'RESONANCE BREACH',
    subtitle: 'CONVERGENCE HOSTILES DETECTED',
    duration: 28,
    targetKills: 18,
    spawnRate: 1.05,
    maxEnemies: 10,
    weights: { orb: 0.34, chaser: 0.38, gate: 0.16, bastion: 0.12 },
    boss: null,
  },
  {
    id: 3,
    name: 'NEXUS VANGUARD',
    subtitle: 'MINI-BOSS INTERCEPTOR INBOUND',
    duration: 32,
    targetKills: 1,
    spawnRate: 1.45,
    maxEnemies: 7,
    weights: { orb: 0.48, chaser: 0.32, gate: 0.12, bastion: 0.08 },
    boss: {
      name: 'NEXUS VANGUARD',
      subtitle: 'SECTOR 03 GUARDIAN',
      maxHp: 1150,
      radius: 44,
      phases: 2,
    },
  },
  {
    id: 4,
    name: 'CORE COLLAPSE',
    subtitle: 'SINGULARITY DREADNOUGHT AWAKENS',
    duration: 45,
    targetKills: 1,
    spawnRate: 1.35,
    maxEnemies: 8,
    weights: { orb: 0.46, chaser: 0.34, gate: 0.10, bastion: 0.10 },
    boss: {
      name: 'SINGULARITY NEXUS',
      subtitle: 'OMEGA DREADNOUGHT // SECTOR 04',
      maxHp: 2100,
      radius: 56,
      phases: 3,
    },
  },
];
