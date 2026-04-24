import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { isAuthenticated } from './lib/auth'
import { Landing } from './pages/Landing'
import { AuthCallback } from './pages/AuthCallback'
import { Dashboard } from './pages/Dashboard'
import { Repos } from './pages/Repos'
import { PublicProfile } from './pages/PublicProfile'
import { Settings } from './pages/Settings'
import { Wrapped, PublicWrapped } from './pages/Wrapped'
import { Maintainer } from './pages/Maintainer'
import { Leaderboard } from './pages/Leaderboard'
import { AppCanvas } from './components/AppCanvas'

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) return <Navigate to="/" replace />
  return <>{children}</>
}

function GlobalCanvas() {
  const loc = useLocation()
  if (loc.pathname === '/') return null
  return <AppCanvas />
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <GlobalCanvas />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/u/:login" element={<PublicProfile />} />
          <Route
            path="/dashboard"
            element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
          />
          <Route
            path="/repos"
            element={<ProtectedRoute><Repos /></ProtectedRoute>}
          />
          <Route
            path="/settings"
            element={<ProtectedRoute><Settings /></ProtectedRoute>}
          />
          <Route
            path="/wrapped"
            element={<ProtectedRoute><Wrapped /></ProtectedRoute>}
          />
          <Route
            path="/maintainer"
            element={<ProtectedRoute><Maintainer /></ProtectedRoute>}
          />
          <Route path="/u/:login/wrapped" element={<PublicWrapped />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
