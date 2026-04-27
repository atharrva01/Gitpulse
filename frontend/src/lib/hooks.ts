import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from './api'
import { isAuthenticated } from './auth'
import type { DashboardStats, HeatmapDay, MonthlyCount, PlatformStats, RepoStats, ReviewLatency, User } from './api'

export function useMe() {
  return useQuery<User>({
    queryKey: ['me'],
    queryFn: () => api.get('/me').then((r) => r.data),
    retry: false,
    enabled: isAuthenticated(),
  })
}

export function useDashboard() {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then((r) => r.data),
  })
}

export function useRepos() {
  return useQuery<RepoStats[]>({
    queryKey: ['repos'],
    queryFn: () => api.get('/repos').then((r) => r.data),
  })
}

export function useReviewLatency() {
  return useQuery<ReviewLatency>({
    queryKey: ['review-latency'],
    queryFn: () => api.get('/review-latency').then((r) => r.data),
  })
}

export function usePublicProfile(login: string) {
  return useQuery<DashboardStats>({
    queryKey: ['profile', login],
    queryFn: () => api.get(`/u/${login}`).then((r) => r.data),
    enabled: !!login,
  })
}

export function useSync(full = false) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post(full ? '/sync?full=true' : '/sync'),
    onSuccess: () => {
      const delay = full ? 15000 : 3000
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ['dashboard'] })
        qc.invalidateQueries({ queryKey: ['repos'] })
        qc.invalidateQueries({ queryKey: ['review-latency'] })
        qc.invalidateQueries({ queryKey: ['me'] })
        qc.invalidateQueries({ queryKey: ['heatmap'] })
        qc.invalidateQueries({ queryKey: ['velocity'] })
        qc.invalidateQueries({ queryKey: ['wrapped'] })
      }, delay)
    },
  })
}

export function useHeatmap() {
  return useQuery<HeatmapDay[]>({
    queryKey: ['heatmap'],
    queryFn: () => api.get('/heatmap').then((r) => r.data),
  })
}

export function useVelocity() {
  return useQuery<MonthlyCount[]>({
    queryKey: ['velocity'],
    queryFn: () => api.get('/velocity').then((r) => r.data),
  })
}

export function usePublicVelocity(login: string) {
  return useQuery<MonthlyCount[]>({
    queryKey: ['velocity', login],
    queryFn: () => api.get(`/u/${login}/velocity`).then((r) => r.data),
    enabled: !!login,
  })
}

export function usePlatformStats() {
  return useQuery<PlatformStats>({
    queryKey: ['platform-stats'],
    queryFn: () => api.get('/stats').then((r) => r.data),
    staleTime: 60 * 60 * 1000,
    retry: false,
  })
}

export function usePublicHeatmap(login: string) {
  return useQuery<HeatmapDay[]>({
    queryKey: ['heatmap', login],
    queryFn: () => api.get(`/u/${login}/heatmap`).then((r) => r.data),
    enabled: !!login,
  })
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { email_digest_opt?: boolean; is_public?: boolean }) =>
      api.patch('/settings', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  })
}
