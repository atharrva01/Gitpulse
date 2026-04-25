import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { User } from '../lib/api'

const FEATURES = [
  {
    icon: '📊',
    name: 'Impact Score',
    desc: 'A single 0–1000 number that weighs your merged PRs, code reviews, and streaks. Updated every sync.',
    where: 'Dashboard',
    to: '/dashboard',
    accent: '#10b981',
  },
  {
    icon: '🗓️',
    name: 'Contribution Heatmap',
    desc: 'A 52-week GitHub-style grid that shows which days you had commits, PRs, or reviews.',
    where: 'Dashboard',
    to: '/dashboard',
    accent: '#10b981',
  },
  {
    icon: '📈',
    name: 'PR Velocity Chart',
    desc: 'A 13-month bar chart of how many PRs you merged each month — spot your peak months.',
    where: 'Dashboard',
    to: '/dashboard',
    accent: '#06b6d4',
  },
  {
    icon: '🔥',
    name: 'Streak Tracking',
    desc: 'Your current consecutive-day commit streak and your all-time longest. Automatically tracked.',
    where: 'Dashboard',
    to: '/dashboard',
    accent: '#f59e0b',
  },
  {
    icon: '🌐',
    name: 'Public Profile',
    desc: 'A shareable profile page with your score, stats, heatmap, and recent PRs. Enable it in Settings.',
    where: '/u/yourname',
    to: '/settings',
    accent: '#8b5cf6',
  },
  {
    icon: '🛡️',
    name: 'README Badge',
    desc: 'A dynamic SVG badge showing your score live. Paste the Markdown snippet into any GitHub README.',
    where: 'Your public profile',
    to: '/settings',
    accent: '#ec4899',
  },
  {
    icon: '🏆',
    name: 'Leaderboard',
    desc: 'See how you rank against all GitPulse contributors. Sort by Impact Score, PRs, or streak.',
    where: 'Leaderboard',
    to: '/leaderboard',
    accent: '#fde047',
  },
  {
    icon: '📧',
    name: 'Weekly Digest',
    desc: 'An opt-in email every Monday with your latest score, streak, and PR highlights.',
    where: 'Settings → Email',
    to: '/settings',
    accent: '#34d399',
  },
  {
    icon: '🎁',
    name: 'OSS Wrapped',
    desc: 'Your year in open source as a beautiful shareable card. Download and post it anywhere.',
    where: 'Wrapped',
    to: '/wrapped',
    accent: '#06b6d4',
  },
]

interface Props {
  user: User | undefined
}

export function WelcomeGuide({ user }: Props) {
  const [visible, setVisible] = useState(() => !localStorage.getItem('gp_welcomed'))

  function dismiss() {
    localStorage.setItem('gp_welcomed', '1')
    setVisible(false)
  }

  if (!visible || !user) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto"
      style={{ background: 'rgba(6,10,6,0.92)', backdropFilter: 'blur(8px)' }}
    >
      <div className="w-full max-w-3xl mx-auto px-4 py-12 sm:py-16">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 font-black text-xl mb-6">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-black text-sm font-black">G</div>
            <span className="text-white">Git<span className="text-emerald-400">Pulse</span></span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">
            Welcome, <span className="text-emerald-400">@{user.login}</span> 👋
          </h1>
          <p className="text-white/40 text-sm max-w-md mx-auto">
            Here's everything GitPulse can do for you. You can come back to this guide anytime from Settings.
          </p>
        </div>

        {/* Safety pill */}
        <div className="flex items-center justify-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Read-only GitHub access · Your account cannot be suspended for using GitPulse
          </div>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
          {FEATURES.map((f) => (
            <Link
              key={f.name}
              to={f.to}
              onClick={dismiss}
              className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-200 overflow-hidden text-left"
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
                style={{ background: `radial-gradient(circle at 80% 20%, ${f.accent}10 0%, transparent 60%)` }}
              />
              <div className="text-2xl mb-3">{f.icon}</div>
              <p className="text-white font-bold text-sm mb-1">{f.name}</p>
              <p className="text-white/35 text-xs leading-relaxed mb-3">{f.desc}</p>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: f.accent + 'aa' }}>
                  {f.where} →
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* How it works */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 mb-6">
          <p className="text-[10px] text-white/30 uppercase tracking-[0.3em] font-semibold mb-4 text-center">How it works</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { step: '1', title: 'Sync your data', desc: 'Hit "Sync" on the dashboard. GitPulse reads your public GitHub activity via the API.' },
              { step: '2', title: 'Explore your stats', desc: 'Your Impact Score, heatmap, velocity chart, and top repos update immediately.' },
              { step: '3', title: 'Share your profile', desc: 'Make your profile public in Settings, then share the link or drop the badge in your README.' },
            ].map((s) => (
              <div key={s.step} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                  {s.step}
                </div>
                <div>
                  <p className="text-white text-sm font-bold mb-0.5">{s.title}</p>
                  <p className="text-white/30 text-xs leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <button
            onClick={dismiss}
            className="inline-flex items-center gap-2 bg-emerald-400 hover:bg-emerald-300 text-black font-bold px-8 py-3.5 rounded-xl text-sm transition-colors"
            style={{ boxShadow: '0 0 40px rgba(52,211,153,0.2)' }}
          >
            Let's go
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
          <p className="text-white/20 text-xs mt-3">You can always re-read this guide from Settings.</p>
        </div>

      </div>
    </div>
  )
}
