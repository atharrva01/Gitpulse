import { isAuthenticated } from '../lib/auth'
import { Navigate } from 'react-router-dom'
import { HeroCanvas } from '../components/HeroCanvas'
import { usePlatformStats } from '../lib/hooks'

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

const ALL_FEATURES = [
  {
    icon: '📊',
    title: 'Impact Score',
    tag: '0 – 1000',
    desc: 'One number that captures every merged PR, code review, and active streak. Weighted, calibrated, honest.',
    accent: '#10b981',
  },
  {
    icon: '🗓️',
    title: 'Contribution Heatmap',
    tag: '52-week grid',
    desc: 'A GitHub-style activity grid showing which days you had commits, PRs, or reviews — all in one view.',
    accent: '#06b6d4',
  },
  {
    icon: '📈',
    title: 'PR Velocity Chart',
    tag: '13-month history',
    desc: 'A bar chart of merged PRs per month so you can spot trends, peak periods, and output growth over time.',
    accent: '#8b5cf6',
  },
  {
    icon: '🔥',
    title: 'Streak Tracking',
    tag: 'daily commits',
    desc: 'Every day you push code counts. Your current and longest-ever streak tracked straight from GitHub.',
    accent: '#f59e0b',
  },
  {
    icon: '🌐',
    title: 'Public Profile',
    tag: 'shareable page',
    desc: 'A clean public page at /u/yourname with your score, heatmap, top repos, and recent PRs. Opt-in.',
    accent: '#ec4899',
  },
  {
    icon: '🛡️',
    title: 'README Badge',
    tag: 'dynamic SVG',
    desc: 'A live badge that updates with your score. Drop the Markdown snippet into any GitHub README.',
    accent: '#a78bfa',
  },
  {
    icon: '🏆',
    title: 'Leaderboard',
    tag: 'all contributors',
    desc: 'See how you rank against the entire GitPulse community. Sort by Impact Score, PRs merged, or streak.',
    accent: '#fde047',
  },
  {
    icon: '📧',
    title: 'Weekly Digest',
    tag: 'every Monday',
    desc: 'An opt-in email with your latest score, streak, and PR highlights. One-click unsubscribe anytime.',
    accent: '#34d399',
  },
  {
    icon: '🎁',
    title: 'OSS Wrapped',
    tag: 'shareable card',
    desc: 'Your year in open source packaged into a card worth posting. Download it and let the numbers speak.',
    accent: '#06b6d4',
  },
]

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Connect GitHub',
    desc: 'Sign in with GitHub OAuth. GitPulse only ever requests read-only access to your public activity.',
  },
  {
    step: '02',
    title: 'We crunch the numbers',
    desc: 'Your PRs, reviews, and contribution calendar are fetched and turned into an Impact Score automatically.',
  },
  {
    step: '03',
    title: 'Share your impact',
    desc: 'Make your profile public, drop the badge in your README, and climb the leaderboard.',
  },
]

const TRUST = [
  { icon: '🔒', title: 'Read-only OAuth', desc: "We only request GitHub's read:user and read:org scopes. We cannot write anything on your behalf." },
  { icon: '🚫', title: 'No risk of suspension', desc: 'GitHub will not suspend your account for using a read-only OAuth app. This is standard practice.' },
  { icon: '🌱', title: 'Open source', desc: 'The full codebase is public. You can audit exactly what we fetch and how scores are calculated.' },
  { icon: '🙈', title: 'No data sold', desc: 'We store only what you make public on GitHub. We never sell, share, or monetise your data.' },
]

export function Landing() {
  if (isAuthenticated()) return <Navigate to="/dashboard" replace />
  const { data: platformStats } = usePlatformStats()

  return (
    <div className="min-h-screen bg-[#060a06] text-white overflow-x-hidden">

      {/* ── Nav ── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.04] bg-[#060a06]/70 backdrop-blur-2xl">
        <div className="w-full px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-black tracking-tight text-lg">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-black text-xs font-black">G</div>
            <span className="text-white">Git<span className="text-emerald-400">Pulse</span></span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/leaderboard" className="hidden sm:inline text-white/40 hover:text-white text-sm font-medium transition-colors">
              Leaderboard
            </a>
            <a
              href="/auth/github"
              className="flex items-center gap-2 text-sm font-semibold text-black bg-emerald-400 hover:bg-emerald-300 px-4 py-2 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              Sign in
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-6 text-center pt-16">
        <HeroCanvas />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/[0.06] rounded-full blur-[100px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 mb-8 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Built for open source contributors
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-[5.5rem] font-black leading-[0.95] tracking-tight mb-6">
            <span className="text-white">Your commits.</span>
            <br />
            <span className="text-white">Finally{' '}</span>
            <span
              style={{
                backgroundImage: 'linear-gradient(90deg, #34d399, #06b6d4)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              quantified.
            </span>
          </h1>

          <p className="text-lg text-white/40 max-w-xl mx-auto leading-relaxed mb-10">
            GitPulse turns your GitHub activity into an{' '}
            <span className="text-white/70 font-medium">Impact Score</span>,
            live streaks, a shareable profile, and a README badge — proof that reads better than a resume.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/auth/github"
              className="flex items-center gap-2.5 bg-emerald-400 hover:bg-emerald-300 text-black font-bold px-7 py-3.5 rounded-xl text-sm transition-colors"
              style={{ boxShadow: '0 0 40px rgba(52,211,153,0.25)' }}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              See my Impact Score
            </a>
            <a href="/leaderboard" className="text-white/35 hover:text-white text-sm transition-colors">
              Browse leaderboard →
            </a>
          </div>
        </div>

        {/* Fake dashboard preview */}
        <div className="relative mt-20 w-full max-w-lg mx-auto">
          <div className="absolute inset-0 bg-emerald-500/10 blur-3xl rounded-3xl" />
          <div className="relative rounded-2xl border border-white/[0.07] bg-[#0b120b] overflow-hidden shadow-2xl">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.05] bg-white/[0.02]">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
              <span className="ml-3 text-[11px] text-white/20 font-mono">gitpulse — dashboard</span>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-baseline justify-between">
                <span className="text-white/30 text-xs font-mono">impact_score</span>
                <span className="text-emerald-400 font-black text-3xl tracking-tight">847</span>
              </div>
              <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                <div className="h-full w-[85%] rounded-full" style={{ background: 'linear-gradient(90deg, #10b981, #06b6d4)' }} />
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[
                  { k: 'prs_tracked', v: platformStats ? fmt(platformStats.total_prs) : '—' },
                  { k: 'top_streak',  v: platformStats ? `${platformStats.highest_streak}d 🔥` : '—' },
                  { k: 'contributors', v: platformStats ? String(platformStats.total_users) : '—' },
                ].map((s) => (
                  <div key={s.k} className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04]">
                    <p className="text-[10px] text-white/25 mb-1.5 font-mono">{s.k}</p>
                    <p className="text-white font-bold text-sm">{s.v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="px-6 py-24 max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[10px] text-emerald-400/50 uppercase tracking-[0.4em] font-semibold mb-4">Simple by design</p>
          <h2 className="text-3xl sm:text-4xl font-black text-white">Up and running in 30 seconds</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {HOW_IT_WORKS.map((s) => (
            <div key={s.step} className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7">
              <p className="font-black text-4xl text-emerald-400/20 mb-4 font-mono">{s.step}</p>
              <p className="text-white font-bold text-base mb-2">{s.title}</p>
              <p className="text-white/35 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── All features ── */}
      <section className="px-6 pb-24 max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[10px] text-emerald-400/50 uppercase tracking-[0.4em] font-semibold mb-4">What you get</p>
          <h2 className="text-3xl sm:text-4xl font-black text-white">Everything GitHub doesn't show you</h2>
          <p className="text-white/30 text-sm mt-3 max-w-md mx-auto">
            Nine features, one dashboard. All updated automatically when you sync.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ALL_FEATURES.map((f) => (
            <div
              key={f.title}
              className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7 hover:border-white/[0.1] hover:bg-white/[0.04] transition-all duration-300 overflow-hidden cursor-default"
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
                style={{ background: `radial-gradient(circle at 80% 20%, ${f.accent}08 0%, transparent 60%)` }}
              />
              <div className="text-3xl mb-5">{f.icon}</div>
              <p className="text-white font-bold text-base mb-0.5">{f.title}</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: f.accent + 'aa' }}>{f.tag}</p>
              <p className="text-white/35 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Trust & Safety ── */}
      <section className="px-6 pb-24 max-w-5xl mx-auto">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-8 sm:p-10">
          <div className="text-center mb-10">
            <p className="text-[10px] text-emerald-400/50 uppercase tracking-[0.4em] font-semibold mb-3">Your account is safe</p>
            <h2 className="text-2xl sm:text-3xl font-black text-white">Built on trust</h2>
            <p className="text-white/30 text-sm mt-2 max-w-sm mx-auto">
              GitPulse uses the same read-only OAuth flow as thousands of developer tools.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {TRUST.map((t) => (
              <div key={t.title} className="flex gap-4">
                <div className="text-2xl shrink-0 mt-0.5">{t.icon}</div>
                <div>
                  <p className="text-white font-bold text-sm mb-1">{t.title}</p>
                  <p className="text-white/35 text-sm leading-relaxed">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Numbers strip ── */}
      <div className="border-y border-white/[0.04] py-10 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { n: platformStats ? fmt(platformStats.total_prs) : '—', l: 'PRs tracked' },
            { n: platformStats ? String(platformStats.total_users) : '—', l: 'Contributors' },
            { n: 'Free', l: 'Forever' },
            { n: 'Open', l: 'Source' },
          ].map((s) => (
            <div key={s.l}>
              <p className="text-xl font-black text-emerald-400">{s.n}</p>
              <p className="text-[10px] text-white/25 mt-1 uppercase tracking-widest font-medium">{s.l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Final CTA ── */}
      <section className="px-6 py-32 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-3 leading-tight">
            Stop guessing how much you've shipped.
          </h2>
          <p className="text-white/35 text-sm mb-10">
            Connect GitHub in 10 seconds. Read-only. No data sold. No tricks.
          </p>
          <a
            href="/auth/github"
            className="inline-flex items-center gap-2.5 bg-emerald-400 hover:bg-emerald-300 text-black font-bold px-8 py-4 rounded-xl text-sm transition-colors"
            style={{ boxShadow: '0 0 50px rgba(52,211,153,0.2)' }}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Get your free Impact Score
          </a>
        </div>
      </section>

      <footer className="border-t border-white/[0.04] py-8">
        <div className="w-full px-4 sm:px-6 lg:px-10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-black text-sm">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-black text-[9px] font-black">G</div>
            <span className="text-white/30">GitPulse</span>
          </div>
          <div className="flex items-center gap-4 text-white/20 text-xs">
            <a href="/leaderboard" className="hover:text-white/50 transition-colors">Leaderboard</a>
            <span>·</span>
            <span>Free · open source · built by contributors</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
