import { isAuthenticated } from '../lib/auth'
import { Navigate } from 'react-router-dom'

export function Landing() {
  if (isAuthenticated()) return <Navigate to="/dashboard" replace />

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <nav className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-bold text-white flex items-center gap-2">
            <span className="text-purple-400">⚡</span> GitPulse
          </span>
          <a
            href="/auth/github"
            className="text-sm bg-purple-600 hover:bg-purple-500 text-white px-4 py-1.5 rounded-md transition-colors"
          >
            Sign in with GitHub
          </a>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 text-purple-400 text-sm font-medium bg-purple-500/10 border border-purple-500/30 rounded-full px-4 py-1.5 mb-8">
            <span>⚡</span> Open Source Contribution Intelligence
          </div>
          <h1 className="text-5xl sm:text-6xl font-black text-white mb-6 leading-tight">
            Your open source impact,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
              finally visible
            </span>
          </h1>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            GitPulse transforms raw GitHub activity into a weighted impact score, contribution streaks,
            and a shareable profile that proves your work — for job applications, scholarships, and beyond.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <a
              href="/auth/github"
              className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-8 py-3 rounded-lg transition-colors text-lg"
            >
              Get your Impact Score →
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
            {[
              {
                icon: '📊',
                title: 'Impact Score',
                desc: 'A single 0-1000 score that weighs PRs, reviews, lines changed, and streaks.',
              },
              {
                icon: '🔥',
                title: 'Contribution Streaks',
                desc: 'Track your daily streak across merged PRs and code reviews — not just commits.',
              },
              {
                icon: '🎁',
                title: 'OSS Wrapped',
                desc: 'A shareable annual report of your open source year. Built for LinkedIn and Twitter.',
              },
            ].map((f) => (
              <div key={f.title} className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-white mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-800 py-6 text-center text-gray-600 text-sm">
        GitPulse — free, open source, built for contributors
      </footer>
    </div>
  )
}
