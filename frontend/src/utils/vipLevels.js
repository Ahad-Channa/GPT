/** Shared VIP level definitions for the frontend — mirrors backend vipUtils.js */

export const VIP_LEVELS = [
  { key: 'bronze_1',   tier: 'Bronze',   rank: 'I',   threshold: 0,         tierOrder: 1 },
  { key: 'bronze_2',   tier: 'Bronze',   rank: 'II',  threshold: 5000,      tierOrder: 1 },
  { key: 'bronze_3',   tier: 'Bronze',   rank: 'III', threshold: 15000,     tierOrder: 1 },
  { key: 'silver_1',   tier: 'Silver',   rank: 'I',   threshold: 30000,     tierOrder: 2 },
  { key: 'silver_2',   tier: 'Silver',   rank: 'II',  threshold: 60000,     tierOrder: 2 },
  { key: 'silver_3',   tier: 'Silver',   rank: 'III', threshold: 100000,    tierOrder: 2 },
  { key: 'gold_1',     tier: 'Gold',     rank: 'I',   threshold: 200000,    tierOrder: 3 },
  { key: 'gold_2',     tier: 'Gold',     rank: 'II',  threshold: 400000,    tierOrder: 3 },
  { key: 'gold_3',     tier: 'Gold',     rank: 'III', threshold: 700000,    tierOrder: 3 },
  { key: 'platinum_1', tier: 'Platinum', rank: 'I',   threshold: 1000000,   tierOrder: 4 },
  { key: 'platinum_2', tier: 'Platinum', rank: 'II',  threshold: 1500000,   tierOrder: 4 },
  { key: 'platinum_3', tier: 'Platinum', rank: 'III', threshold: 2500000,   tierOrder: 4 },
  { key: 'diamond_1',  tier: 'Diamond',  rank: 'I',   threshold: 4000000,   tierOrder: 5 },
  { key: 'diamond_2',  tier: 'Diamond',  rank: 'II',  threshold: 6000000,   tierOrder: 5 },
  { key: 'diamond_3',  tier: 'Diamond',  rank: 'III', threshold: 8000000,   tierOrder: 5 },
  { key: 'opal',       tier: 'Opal',     rank: '',    threshold: 10000000,  tierOrder: 6 },
];

export const TIER_STYLES = {
  Bronze:   {
    gradient: 'linear-gradient(135deg, #b45309, #d97706, #92400e)',
    border: '#b45309',
    glow: 'rgba(180,83,9,0.5)',
    text: '#fde68a',
    bg: 'rgba(180,83,9,0.12)',
  },
  Silver:   {
    gradient: 'linear-gradient(135deg, #64748b, #94a3b8, #475569)',
    border: '#94a3b8',
    glow: 'rgba(148,163,184,0.4)',
    text: '#e2e8f0',
    bg: 'rgba(148,163,184,0.10)',
  },
  Gold:     {
    gradient: 'linear-gradient(135deg, #b45309, #fbbf24, #f59e0b)',
    border: '#fbbf24',
    glow: 'rgba(251,191,36,0.5)',
    text: '#fef08a',
    bg: 'rgba(251,191,36,0.10)',
  },
  Platinum: {
    gradient: 'linear-gradient(135deg, #0891b2, #22d3ee, #0e7490)',
    border: '#22d3ee',
    glow: 'rgba(34,211,238,0.45)',
    text: '#cffafe',
    bg: 'rgba(34,211,238,0.10)',
  },
  Diamond:  {
    gradient: 'linear-gradient(135deg, #4f46e5, #818cf8, #6366f1)',
    border: '#818cf8',
    glow: 'rgba(129,140,248,0.5)',
    text: '#c7d2fe',
    bg: 'rgba(99,102,241,0.12)',
  },
  Opal:     {
    gradient: 'linear-gradient(135deg, #7c3aed, #ec4899, #06b6d4, #10b981)',
    border: '#a78bfa',
    glow: 'rgba(167,139,250,0.55)',
    text: '#f0abfc',
    bg: 'rgba(167,139,250,0.12)',
  },
};

export function getLevelFromEarned(totalEarned = 0) {
  let current = null;
  for (const lvl of VIP_LEVELS) {
    if (totalEarned >= lvl.threshold) current = lvl;
    else break;
  }
  return current;
}

export function getLevelLabel(level) {
  if (!level) return 'Unranked';
  return level.rank ? `${level.tier} ${level.rank}` : level.tier;
}
