import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { fetchHealth } from '../api'

export default function Register() {
  const navigate = useNavigate()
  const { register, tryDemo } = useAuth()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [demoTryEnabled, setDemoTryEnabled] = useState(false)

  useEffect(() => {
    fetchHealth()
      .then((h) => setDemoTryEnabled(Boolean(h.demo_try_enabled)))
      .catch(() => setDemoTryEnabled(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    try {
      await register(username.trim(), password, email.trim() || undefined)
      navigate('/workspace', { replace: true })
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { detail?: string | string[] } }; code?: string }
      let msg = 'Registration failed'
      if (ax.response?.data?.detail !== undefined) {
        const d = ax.response.data.detail
        msg = Array.isArray(d) ? d.map((x: unknown) => (typeof x === 'object' && x && 'msg' in x ? (x as { msg?: string }).msg : String(x))).join(', ') : String(d)
      } else if (ax.code === 'ECONNABORTED') {
        msg = 'Request timed out. Is the server running?'
      } else if (!ax.response) {
        msg = 'Network error. Is the server running?'
      }
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleTry = async () => {
    setError(null)
    setLoading(true)
    try {
      await tryDemo()
      navigate('/workspace', { replace: true })
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { detail?: string | string[] } }; code?: string }
      let msg = 'Could not start demo'
      if (ax.response?.data?.detail !== undefined) {
        const d = ax.response.data.detail
        msg = Array.isArray(d) ? d.map((x: unknown) => (typeof x === 'object' && x && 'msg' in x ? (x as { msg?: string }).msg : String(x))).join(', ') : String(d)
      } else if (ax.code === 'ECONNABORTED') {
        msg = 'Request timed out. Is the server running?'
      } else if (!ax.response) {
        msg = 'Network error. Is the server running?'
      }
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-6">
      <div className="w-full max-w-sm p-5 sm:p-6 bg-white rounded-xl shadow-md border border-gray-200">
        <div className="flex justify-center mb-6">
          <img src="/icon.png" alt="Ear2Finger" className="w-12 h-12" />
        </div>
        <h1 className="text-xl font-bold text-center text-gray-900 mb-6">Create account</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-800 focus:border-transparent"
              required
              minLength={2}
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-800 focus:border-transparent"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-800 focus:border-transparent"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-800 focus:border-transparent"
              required
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? 'Creating account…' : 'Sign up'}
          </button>
        </form>
        {demoTryEnabled && (
          <div className="mt-4">
            <button
              type="button"
              onClick={handleTry}
              disabled={loading}
              className="w-full py-2.5 border-2 border-gray-900 text-gray-900 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Try
            </button>
            <p className="mt-2 text-center text-xs text-gray-500">
              Temporary account with all lessons on this server. New imports are disabled.
            </p>
          </div>
        )}
        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-gray-900 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
