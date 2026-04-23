export interface BadgeTier {
  id: string
  name: string
  emoji: string
  tagline: string
  minScore: number
  colors: {
    gradient: string
    glow: string
    accent: string
    bg: string
    text: string
  }
}

export const BADGE_TIERS: BadgeTier[] = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    emoji: '🌱',
    tagline: 'Every legend starts somewhere',
    minScore: 0,
    colors: {
      gradient: 'linear-gradient(135deg, #1e2d1e 0%, #0d170d 100%)',
      glow: 'rgba(34,197,94,0.3)',
      accent: '#86efac',
      bg: '#0a160a',
      text: '#bbf7d0',
    },
  },
  {
    id: 'newcomer',
    name: 'Newcomer',
    emoji: '⚡',
    tagline: 'First commits, real impact',
    minScore: 100,
    colors: {
      gradient: 'linear-gradient(135deg, #1a2d1a 0%, #0b1f10 100%)',
      glow: 'rgba(16,185,129,0.35)',
      accent: '#34d399',
      bg: '#061408',
      text: '#6ee7b7',
    },
  },
  {
    id: 'contributor',
    name: 'Contributor',
    emoji: '🔨',
    tagline: 'Shipping code that matters',
    minScore: 250,
    colors: {
      gradient: 'linear-gradient(135deg, #0d2222 0%, #071616 100%)',
      glow: 'rgba(6,182,212,0.35)',
      accent: '#22d3ee',
      bg: '#041212',
      text: '#67e8f9',
    },
  },
  {
    id: 'builder',
    name: 'Builder',
    emoji: '🚀',
    tagline: 'Seriously building in public',
    minScore: 450,
    colors: {
      gradient: 'linear-gradient(135deg, #0d1a30 0%, #080f20 100%)',
      glow: 'rgba(59,130,246,0.35)',
      accent: '#60a5fa',
      bg: '#040814',
      text: '#93c5fd',
    },
  },
  {
    id: 'core-dev',
    name: 'Core Dev',
    emoji: '🧠',
    tagline: 'A backbone of open source',
    minScore: 600,
    colors: {
      gradient: 'linear-gradient(135deg, #1a0d30 0%, #100820 100%)',
      glow: 'rgba(139,92,246,0.35)',
      accent: '#a78bfa',
      bg: '#08040e',
      text: '#c4b5fd',
    },
  },
  {
    id: 'oss-champion',
    name: 'OSS Champion',
    emoji: '🏆',
    tagline: 'Among the elite contributors',
    minScore: 800,
    colors: {
      gradient: 'linear-gradient(135deg, #2d1a08 0%, #1a0e04 100%)',
      glow: 'rgba(245,158,11,0.4)',
      accent: '#fbbf24',
      bg: '#0e0604',
      text: '#fde68a',
    },
  },
  {
    id: 'oss-legend',
    name: 'OSS Legend',
    emoji: '👑',
    tagline: 'Hall of fame territory',
    minScore: 950,
    colors: {
      gradient: 'linear-gradient(135deg, #2d2008 0%, #1a1204 100%)',
      glow: 'rgba(253,224,71,0.5)',
      accent: '#fde047',
      bg: '#0e0a02',
      text: '#fef08a',
    },
  },
]

export function getBadge(score: number): BadgeTier {
  let result = BADGE_TIERS[0]
  for (const tier of BADGE_TIERS) {
    if (score >= tier.minScore) result = tier
  }
  return result
}

export function getNextBadge(score: number): BadgeTier | null {
  for (const tier of BADGE_TIERS) {
    if (score < tier.minScore) return tier
  }
  return null
}
