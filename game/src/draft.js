import { BLUEPRINT_CATALOG } from './constants.js';

const EMBLEM_SVGS = {
  prism: `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <polygon points="32,8 56,50 8,50" fill="rgba(255,88,122,0.22)" stroke="#ff587a" stroke-width="3"/>
      <line x1="6" y1="34" x2="26" y2="32" stroke="#ffd571" stroke-width="3" stroke-linecap="round"/>
      <line x1="38" y1="30" x2="58" y2="18" stroke="#ff587a" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="40" y1="34" x2="59" y2="34" stroke="#ffd571" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="38" y1="38" x2="58" y2="50" stroke="#57f2ff" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`,
  mirror: `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <rect x="25" y="10" width="14" height="44" rx="4" transform="rotate(-24 32 32)" fill="#2a436e" stroke="#ffd571" stroke-width="3"/>
      <line x1="10" y1="48" x2="31" y2="33" stroke="#ffd571" stroke-width="3" stroke-linecap="round"/>
      <line x1="31" y1="33" x2="52" y2="16" stroke="#57f2ff" stroke-width="3" stroke-linecap="round"/>
      <circle cx="31" cy="33" r="4" fill="#fff6e0"/>
    </svg>`,
  spectrum: `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="21" fill="none" stroke="#57f2ff" stroke-width="2.5" stroke-dasharray="6 4"/>
      <path d="M12 42 L26 22 L38 40 L52 18" fill="none" stroke="#ffd571" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="26" cy="22" r="4" fill="#fff6e0"/>
      <circle cx="38" cy="40" r="4" fill="#57f2ff"/>
    </svg>`,
  sun: `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="13" fill="#ffd571" stroke="#fff6e0" stroke-width="2.5"/>
      <g stroke="#ffb84d" stroke-width="3" stroke-linecap="round">
        <line x1="32" y1="6" x2="32" y2="14"/><line x1="32" y1="50" x2="32" y2="58"/>
        <line x1="6" y1="32" x2="14" y2="32"/><line x1="50" y1="32" x2="58" y2="32"/>
        <line x1="14" y1="14" x2="20" y2="20"/><line x1="44" y1="44" x2="50" y2="50"/>
        <line x1="50" y1="14" x2="44" y2="20"/><line x1="20" y1="44" x2="14" y2="50"/>
      </g>
    </svg>`,
  bolt: `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <polygon points="36,8 16,35 30,35 26,56 48,27 34,27" fill="#ffe885" stroke="#fff6e0" stroke-width="2.2" stroke-linejoin="round"/>
    </svg>`,
  bell: `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M20 42 C20 24, 24 14, 32 14 C40 14, 44 24, 44 42 L49 47 L15 47 Z" fill="rgba(87,242,255,0.22)" stroke="#57f2ff" stroke-width="3"/>
      <circle cx="32" cy="51" r="4" fill="#ffd571"/>
      <path d="M10 30 A24 24 0 0 1 16 14" fill="none" stroke="#ffd571" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M54 30 A24 24 0 0 0 48 14" fill="none" stroke="#ffd571" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`,
  capacitor: `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <polygon points="32,8 52,20 52,44 32,56 12,44 12,20" fill="rgba(198,120,255,0.18)" stroke="#c678ff" stroke-width="2.8"/>
      <circle cx="32" cy="32" r="9" fill="#fff6e0" stroke="#57f2ff" stroke-width="3"/>
    </svg>`,
  shield: `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 8 L50 16 V31 C50 43 41 51 32 56 C23 51 14 43 14 31 V16 Z" fill="rgba(103,232,165,0.2)" stroke="#67e8a5" stroke-width="3"/>
      <circle cx="32" cy="31" r="7" fill="none" stroke="#ffd571" stroke-width="2.5"/>
    </svg>`,
  gyro: `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <ellipse cx="32" cy="32" rx="22" ry="10" transform="rotate(28 32 32)" fill="none" stroke="#ffd571" stroke-width="2.6"/>
      <ellipse cx="32" cy="32" rx="22" ry="10" transform="rotate(-28 32 32)" fill="none" stroke="#57f2ff" stroke-width="2.6"/>
      <circle cx="32" cy="32" r="6" fill="#fff6e0"/>
    </svg>`,
  lens: `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="19" fill="rgba(127,232,255,0.2)" stroke="#7fe8ff" stroke-width="3"/>
      <path d="M22 24 Q32 16 42 24" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="32" cy="32" r="5" fill="#ffd571"/>
    </svg>`,
};

export function getBlueprintEmblemSvg(key) {
  return EMBLEM_SVGS[key] || EMBLEM_SVGS.prism;
}

export function rollDraftChoices(rng, ownedCounts) {
  const pool = BLUEPRINT_CATALOG.filter((bp) => {
    const count = ownedCounts[bp.id] || 0;
    if (bp.id === 'gyro_tracking' || bp.id === 'tidebreaker_lens') return count < 1;
    if (bp.id === 'ruby_splitter' || bp.id === 'portable_mirror') return count < 2;
    return count < 3;
  });

  const source = pool.length >= 3 ? [...pool] : [...BLUEPRINT_CATALOG];
  const chosen = [];
  while (chosen.length < 3 && source.length > 0) {
    const idx = Math.floor(rng.next() * source.length);
    chosen.push(source.splice(idx, 1)[0]);
  }
  return chosen;
}
