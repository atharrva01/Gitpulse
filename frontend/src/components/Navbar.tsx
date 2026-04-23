import { Link, useNavigate } from 'react-router-dom'
import { clearToken } from '../lib/auth'
import type { User } from '../lib/api'

interface NavbarProps {
  user?: User | null
}

export function Navbar({ user }: NavbarProps) {
  const navigate = useNavigate()

  function logout() {
    clearToken()
    navigate('/')
  }

  return (
    <nav className="border-b border-gray-700 bg-gray-900/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2 font-bold text-white">
          <span className="text-purple-400">⚡</span> GitPulse
        </Link>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link to="/dashboard" className="text-sm text-gray-300 hover:text-white transition-colors">Dashboard</Link>
              <Link to="/repos" className="text-sm text-gray-300 hover:text-white transition-colors">Repos</Link>
              <Link to={`/u/${user.login}`} className="text-sm text-gray-300 hover:text-white transition-colors">Public Profile</Link>
              <Link to="/settings" className="text-sm text-gray-300 hover:text-white transition-colors">Settings</Link>
              <img src={user.avatar_url} alt={user.login} className="w-8 h-8 rounded-full border border-gray-600" />
              <button onClick={logout} className="text-sm text-gray-400 hover:text-white transition-colors">Logout</button>
            </>
          ) : (
            <a href="/auth/github" className="text-sm bg-purple-600 hover:bg-purple-500 text-white px-4 py-1.5 rounded-md transition-colors">
              Sign in with GitHub
            </a>
          )}
        </div>
      </div>
    </nav>
  )
}
