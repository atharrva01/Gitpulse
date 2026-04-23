import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/'
    }
    return Promise.reject(err)
  }
)

export default api

export interface User {
  id: number
  login: string
  name: string
  avatar_url: string
  bio: string
  impact_score: number
  current_streak: number
  longest_streak: number
  last_synced_at: string | null
  email: string
  email_digest_opt: boolean
  is_public: boolean
}

export interface PullRequest {
  id: number
  github_pr_id: number
  repo_full_name: string
  title: string
  number: number
  additions: number
  deletions: number
  review_count: number
  merged_at: string | null
  html_url: string
}

export interface RepoStats {
  repo_full_name: string
  pr_count: number
  review_count: number
  total_additions: number
  total_deletions: number
  first_contrib: string | null
  last_contrib: string | null
}

export interface DashboardStats {
  user: User
  total_merged_prs: number
  total_additions: number
  total_deletions: number
  unique_repos: number
  recent_prs: PullRequest[]
  top_repos: RepoStats[]
  impact_score: number
  current_streak: number
  longest_streak: number
  sync_status: string
}

export interface ReviewLatency {
  median: number
  p75: number
  p95: number
  count: number
}
