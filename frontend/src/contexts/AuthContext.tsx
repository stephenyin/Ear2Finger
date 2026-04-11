import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import type { UserInfo } from '../api'
import * as api from '../api'

type AuthContextType = {
  user: UserInfo | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string, email?: string) => Promise<void>
  tryDemo: () => Promise<void>
  logout: () => void
  setUser: (u: UserInfo | null) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

const STORAGE_USER = 'ear2finger_user'
const STORAGE_TOKEN = 'ear2finger_token'

function loadStoredUser(): UserInfo | null {
  try {
    const raw = localStorage.getItem(STORAGE_USER)
    if (!raw) return null
    return JSON.parse(raw) as UserInfo
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<UserInfo | null>(loadStoredUser)
  const [loading, setLoading] = useState(true)

  const setUser = useCallback((u: UserInfo | null) => {
    setUserState(u)
    if (u) localStorage.setItem(STORAGE_USER, JSON.stringify(u))
    else localStorage.removeItem(STORAGE_USER)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_TOKEN)
    setUser(null)
  }, [setUser])

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_TOKEN)
    if (!token) {
      setLoading(false)
      return
    }
    api.fetchMe()
      .then((u) => setUser(u))
      .catch(() => logout())
      .finally(() => setLoading(false))
  }, [logout])

  useEffect(() => {
    const onLogout = () => logout()
    window.addEventListener('auth:logout', onLogout)
    return () => window.removeEventListener('auth:logout', onLogout)
  }, [logout])

  const login = useCallback(
    async (username: string, password: string) => {
      const { access_token, user: u } = await api.login(username, password)
      localStorage.setItem(STORAGE_TOKEN, access_token)
      setUser(u)
    },
    [setUser]
  )

  const register = useCallback(
    async (username: string, password: string, email?: string) => {
      const { access_token, user: u } = await api.register(username, password, email)
      localStorage.setItem(STORAGE_TOKEN, access_token)
      setUser(u)
    },
    [setUser]
  )

  const tryDemo = useCallback(async () => {
    const { access_token, user: u } = await api.tryDemo()
    localStorage.setItem(STORAGE_TOKEN, access_token)
    setUser(u)
  }, [setUser])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        tryDemo,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
