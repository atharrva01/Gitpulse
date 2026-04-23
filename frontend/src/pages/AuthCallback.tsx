import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { setToken } from '../lib/auth'

export function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (!code) {
      navigate('/', { replace: true })
      return
    }
    fetch(`/auth/token?code=${code}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.token) {
          setToken(data.token)
          navigate('/dashboard', { replace: true })
        } else {
          navigate('/', { replace: true })
        }
      })
      .catch(() => navigate('/', { replace: true }))
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-cyan-400 text-4xl mb-4 animate-pulse">⚡</div>
        <p className="text-slate-400 text-sm">Signing you in...</p>
      </div>
    </div>
  )
}
