/**
 * API client with auth. Uses relative /api so Vite proxy forwards to backend.
 * Attaches Bearer token from localStorage when present.
 */
import axios from 'axios'

const getToken = () => localStorage.getItem('ear2finger_token')

export const api = axios.create({
  baseURL: '',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ear2finger_token')
      localStorage.removeItem('ear2finger_user')
      // Let the app (AuthContext) handle redirect; avoid redirecting on every 401 if we're already on login
      const path = window.location.pathname || ''
      if (!path.startsWith('/login') && !path.startsWith('/register')) {
        window.dispatchEvent(new CustomEvent('auth:logout'))
      }
    }
    return Promise.reject(err)
  }
)

export interface UserInfo {
  id: number
  username: string
  email: string | null
  is_superuser?: boolean
  created_at: string | null
}

export interface AdminUser {
  id: number
  username: string
  email: string | null
  is_superuser: boolean
  created_at: string | null
}

export interface DistributionStats {
  mean: number
  variance: number
  p25: number
  p50: number
  p75: number
}

export interface WordStat {
  word: string
  total_count: number
  incorrect_count: number
  hint_count: number
  incorrect_rate: number
  hint_rate: number
  error_char_count: number
  error_char_rate: number
  average_spell_retry_times: number
  latest_spell_retry_times: number
}

export interface DailyUserStats {
  date: string
  total_videos_practiced: number
  total_sentences_practiced: number
  total_attempts: number
  total_words_seen: number
  unique_words_seen: number
  total_incorrect_words: number
  total_hints_used: number
  sentence_error_rate?: DistributionStats | null
  sentence_hint_usage?: DistributionStats | null
  sentence_length_words?: DistributionStats | null
  word_length_chars?: DistributionStats | null
}

export interface UserStats {
  total_videos_practiced: number
  total_sentences_practiced: number
  total_attempts: number
  total_words_seen: number
  unique_words_seen: number
  total_incorrect_words: number
  total_hints_used: number
  sentence_error_rate?: DistributionStats | null
  sentence_hint_usage?: DistributionStats | null
  sentence_length_words?: DistributionStats | null
  word_length_chars?: DistributionStats | null
  top_incorrect_words: WordStat[]
  top_hint_words: WordStat[]
  daily: DailyUserStats[]
}

export async function listUsers(): Promise<AdminUser[]> {
  const { data } = await api.get<AdminUser[]>('/api/users')
  return data
}

export async function createUser(body: { username: string; password: string; email?: string; is_superuser?: boolean }): Promise<AdminUser> {
  const { data } = await api.post<AdminUser>('/api/users', body)
  return data
}

export async function updateUser(
  userId: number,
  body: { username?: string; email?: string; password?: string; is_superuser?: boolean }
): Promise<AdminUser> {
  const { data } = await api.put<AdminUser>(`/api/users/${userId}`, body)
  return data
}

export async function deleteUser(userId: number): Promise<void> {
  await api.delete(`/api/users/${userId}`)
}

const AUTH_TIMEOUT_MS = 15_000

export async function getUserStats(): Promise<UserStats> {
  const { data } = await api.get<UserStats>('/api/user/stats')
  return data
}

export async function login(username: string, password: string): Promise<{ access_token: string; user: UserInfo }> {
  const { data } = await api.post<{ access_token: string; user: UserInfo }>(
    '/api/auth/login',
    { username, password },
    { timeout: AUTH_TIMEOUT_MS }
  )
  return data
}

export async function register(
  username: string,
  password: string,
  email?: string
): Promise<{ access_token: string; user: UserInfo }> {
  const { data } = await api.post<{ access_token: string; user: UserInfo }>(
    '/api/auth/register',
    { username, password, email: email || null },
    { timeout: AUTH_TIMEOUT_MS }
  )
  return data
}

export async function fetchMe(): Promise<UserInfo> {
  const { data } = await api.get<UserInfo>('/api/auth/me')
  return data
}

export interface LessonSessionRecord {
  id: number
  video_id: number
  started_at: string
  ended_at: string | null
  sentences_practiced: number
  correct_chars: number
  hint_count: number
  incorrect_chars: number
}

export async function getLessonSessions(videoId: number): Promise<LessonSessionRecord[]> {
  const { data } = await api.get<LessonSessionRecord[]>(`/api/lessons/${videoId}/sessions`)
  return data
}

export async function saveLessonSession(body: {
  video_id: number
  started_at: string
  ended_at?: string | null
  sentences_practiced: number
  correct_chars: number
  hint_count: number
  incorrect_chars: number
}): Promise<LessonSessionRecord> {
  const { data } = await api.post<LessonSessionRecord>('/api/user/lesson-sessions', body)
  return data
}

export async function upsertCurrentLessonSession(body: {
  video_id: number
  started_at: string
  ended_at?: string | null
  sentences_practiced: number
  correct_chars: number
  hint_count: number
  incorrect_chars: number
}): Promise<LessonSessionRecord> {
  const { data } = await api.put<LessonSessionRecord>('/api/user/lesson-sessions/current', body)
  return data
}

export async function createPlaylist(name: string): Promise<{ id: number; name: string; created_at: string; video_count: number }> {
  const { data } = await api.post('/api/playlists', { name })
  return data
}

export async function updatePlaylist(playlistId: number, name: string): Promise<{ id: number; name: string; created_at: string; video_count: number }> {
  const { data } = await api.patch(`/api/playlists/${playlistId}`, { name })
  return data
}

export async function deletePlaylist(playlistId: number): Promise<void> {
  await api.delete(`/api/playlists/${playlistId}`)
}

export async function removeVideoFromPlaylist(playlistId: number, videoId: number): Promise<void> {
  await api.delete(`/api/playlists/${playlistId}/videos/${videoId}`)
}

export async function deleteVideo(videoId: number): Promise<void> {
  await api.delete(`/api/youtube/videos/${videoId}`)
}
