export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;

export const ARENA_BOUNDS = {
  left: 74,
  right: 1206,
  top: 86,
  bottom: 678,
  centerX: 640,
  centerY: 382,
};

export const PALETTE = {
  ink: '#1a1410',
  stoneLight: '#ead6b3',
  stoneMid: '#d9be90',
  stoneDark: '#c4a471',
  mortar: '#8f744d',
  parapetTop: '#56493d',
  parapetSide: '#332a23',
  moss: '#587d44',
  mossDeep: '#3d592e',
  brassBright: '#f7c948',
  brassMid: '#d49526',
  brassDark: '#7d5010',
  wardenCloak: '#1d7585',
  wardenHighlight: '#3cc4d8',
  scarabBody: '#c93c2b',
  scarabTrim: '#f08643',
  sentinelStone: '#3c3442',
  sentinelEye: '#ff5263',
  knightSteel: '#526072',
  alchemistCloak: '#563c78',
  alchemistAcid: '#5dd477',
  bossObsidian: '#2a2233',
  bossCrimson: '#e24436',
  shadow: 'rgba(22, 16, 11, 0.34)',
};

export const PILLAR_LAYOUT = [
  { x: 404, y: 256, radius: 28 },
  { x: 876, y: 256, radius: 28 },
  { x: 404, y: 508, radius: 28 },
  { x: 876, y: 508, radius: 28 },
];

export const ENEMY_ARCHETYPES = {
  scarab: {
    name: 'Cinder Scarab',
    hp: 38,
    speed: 138,
    radius: 17,
    score: 100,
    amber: 2,
  },
  sentinel: {
    name: 'Prism Sentinel',
    hp: 64,
    speed: 64,
    radius: 21,
    score: 175,
    amber: 4,
  },
  knight: {
    name: 'Pendulum Knight',
    hp: 108,
    speed: 92,
    radius: 23,
    score: 240,
    amber: 5,
  },
  alchemist: {
    name: 'Blight Alchemist',
    hp: 76,
    speed: 78,
    radius: 20,
    score: 210,
    amber: 4,
  },
  boss: {
    name: 'Archon Kronos',
    hp: 920,
    speed: 74,
    radius: 48,
    score: 1800,
    amber: 25,
  },
};

export const WAVE_DEFINITIONS = [
  {
    wave: 1,
    label: 'COURTYARD BREACH',
    groups: [
      { type: 'scarab', count: 5 },
      { type: 'sentinel', count: 2 },
    ],
  },
  {
    wave: 2,
    label: 'CLOCKWORK PHALANX',
    groups: [
      { type: 'scarab', count: 5 },
      { type: 'sentinel', count: 3 },
      { type: 'knight', count: 2 },
    ],
  },
  {
    wave: 3,
    label: 'ECLIPSE WARDEN',
    bossTitle: 'ARCHON KRONOS · VANGUARD',
    groups: [
      { type: 'boss', count: 1, hpScale: 0.72 },
      { type: 'scarab', count: 3 },
      { type: 'sentinel', count: 2 },
    ],
  },
  {
    wave: 4,
    label: 'ALCHEMICAL SIEGE',
    groups: [
      { type: 'scarab', count: 6 },
      { type: 'knight', count: 3 },
      { type: 'alchemist', count: 3 },
      { type: 'sentinel', count: 2 },
    ],
  },
  {
    wave: 5,
    label: 'CROWN OF THE SUNDIAL',
    bossTitle: 'ARCHON KRONOS, THE ECLIPSE ENGINE',
    groups: [
      { type: 'boss', count: 1, hpScale: 1.15 },
      { type: 'knight', count: 2 },
      { type: 'alchemist', count: 2 },
      { type: 'sentinel', count: 2 },
    ],
  },
];

export const RELIC_CATALOG = [
  {
    id: 'twin_astrolabe',
    name: 'Twin Astrolabe',
    tag: 'SOLAR',
    stat: '+1 Split Bolt · +15% Damage',
    desc: 'Fires an additional gilded lance bolt in a tight fan and sharpens impact power.',
    glyph: 'astrolabe',
  },
  {
    id: 'mirrored_escapement',
    name: 'Mirrored Escapement',
    tag: 'AEGIS',
    stat: '3-Way Deflect · -25% Dash CD',
    desc: 'Parry-Dashing an enemy bolt scatters three seeking golden counter-bolts.',
    glyph: 'mirror',
  },
  {
    id: 'ignis_pendulum',
    name: 'Ignis Pendulum',
    tag: 'SOLAR',
    stat: 'Every 3rd Shot Explodes',
    desc: 'Your 3rd Solar Lance unleashes a sunfire orb that blasts clustered constructs.',
    glyph: 'pendulum',
  },
  {
    id: 'chrono_mainspring',
    name: 'Chrono Mainspring',
    tag: 'CLOCKWORK',
    stat: '+26% Fire Rate · +14% Speed',
    desc: 'Winds your astrolabe spring tighter for brisker footwork and rapid volleys.',
    glyph: 'gear',
  },
  {
    id: 'voltaic_gearwheel',
    name: 'Voltaic Gearwheel',
    tag: 'CLOCKWORK',
    stat: 'Bolts Arc Lightning (2 Foes)',
    desc: 'Each Solar Lance strike arcs crackling brass lightning to nearby enemies.',
    glyph: 'spark',
  },
  {
    id: 'gilded_carapace',
    name: 'Gilded Carapace',
    tag: 'AEGIS',
    stat: '+2 Max HP · Heal +2 · Shockwave',
    desc: 'Reinforces your cloak with brass plates and emits a repelling pulse if struck.',
    glyph: 'shield',
  },
  {
    id: 'brazier_conduit',
    name: 'Brazier Conduit',
    tag: 'ALCHEMIST',
    stat: '-35% Sunburst CD · +45% Radius',
    desc: 'Supercharges your Sunburst Nova and ignites courtyard embers on impact.',
    glyph: 'flame',
  },
  {
    id: 'ricochet_prism',
    name: 'Ricochet Prism',
    tag: 'CLOCKWORK',
    stat: '+1 Wall Bounce · +20% Bolt Speed',
    desc: 'Solar bolts carom off stone walls and pillars once to strike from behind.',
    glyph: 'prism',
  },
  {
    id: 'vampiric_sundial',
    name: 'Vampiric Sundial',
    tag: 'ALCHEMIST',
    stat: 'Heal 1 HP / 8 Kills · +25% Score',
    desc: 'Absorbs shattered construct amber to mend your vitals and boost Radiance.',
    glyph: 'chalice',
  },
];
