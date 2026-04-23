import { Link, useNavigate, useLocation } from 'react-router-dom'
import { clearToken } from '../lib/auth'
import type { User } from '../lib/api'

interface NavbarProps {
  user?: User | null
}

export function Navbar({ user }: NavbarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  function logout() {
    clearToken()
    navigate('/')
  }

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/repos', label: 'Repos' },
    { to: '/wrapped', label: 'Wrapped' },
    { to: '/maintainer', label: 'Maintainer' },
  ]

  return (
    <nav className="sticky top-0 z-50 border-b border-white/[0.05] bg-[#060a06]/80 backdrop-blur-xl">
      <div className="w-full px-4 sm:px-6 lg:px-10 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2 font-black text-white tracking-tight">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-black text-[10px] font-black">G</div>
          <span>Git<span className="text-emerald-400">Pulse</span></span>
        </Link>

        {user ? (
          <div className="flex items-center gap-1">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === l.to
                    ? 'text-white bg-white/[0.08]'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {l.label}
              </Link>
            ))}

            <div className="w-px h-5 bg-white/[0.08] mx-2" />

            <Link to={`/u/${user.login}`} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/[0.04] transition-colors group">
              <img src={user.avatar_url} alt={user.login} className="w-7 h-7 rounded-full ring-1 ring-white/10 group-hover:ring-emerald-500/40 transition-all" />
              <span className="text-sm text-slate-400 group-hover:text-white transition-colors hidden sm:block">{user.login}</span>
            </Link>

            <Link to="/settings" className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.04] transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>

            <button
              onClick={logout}
              className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/[0.08] transition-colors"
              title="Sign out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        ) : (
          <a
            href="/auth/github"
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Sign in with GitHub
          </a>
        )}
      </div>
    </nav>
  )
}
