import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { fetchHealth } from '../api'

const GITHUB_REPO_URL = 'https://github.com/stephenyin/Ear2Finger'
const LINKEDIN_URL = 'https://www.linkedin.com/in/hang-yin-stephen/'

export default function Login() {
  const navigate = useNavigate()
  const { tryDemo } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [demoTryEnabled, setDemoTryEnabled] = useState(false)

  useEffect(() => {
    fetchHealth()
      .then((h) => setDemoTryEnabled(Boolean(h.demo_try_enabled)))
      .catch(() => setDemoTryEnabled(false))
  }, [])

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
        msg = Array.isArray(d) ? d.join(', ') : String(d)
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
      <div className="w-full max-w-md p-5 sm:p-6 bg-white rounded-xl shadow-md border border-gray-200">
        <div className="flex justify-center items-center gap-4 mb-6">
          <img src="/icon.png" alt="" className="w-20 h-20 shrink-0" aria-hidden />
          <span className="text-3xl font-semibold text-gray-900 tracking-tight">Ear2Finger</span>
        </div>
        <p className="text-sm text-gray-600 text-center leading-relaxed mb-4">
          Turn YouTube videos with subtitles into sentence-by-sentence dictation practice—with hints,
          playlists, and progress you can track on a dashboard.
        </p>
        <h1 className="text-xl font-bold text-center text-gray-900 mb-6"></h1>
        {error && (
          <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</div>
        )}
        {demoTryEnabled ? (
          <div>
            <button
              type="button"
              onClick={handleTry}
              disabled={loading}
              className="w-full py-2.5 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? 'Starting…' : 'Try the demo'}
            </button>
          </div>
        ) : (
          <p className="text-center text-sm text-gray-600">
            Demo access is not enabled on this server.
          </p>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900 text-center mb-2">Install with pip, and run locally</h2>
          <p className="text-xs text-gray-600 text-center mb-3">
            <pre className="text-left text-xs font-mono text-gray-800 bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-x-auto leading-relaxed">
              <code>{`pip install ear2finger
ear2finger
# then open http://127.0.0.1:9528`}</code>
            </pre>
          </p>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 text-center mb-3">Links</p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-gray-800 hover:text-indigo-700 hover:underline"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                <path d="M12 0.5C5.373 0.5 0 5.872 0 12.5c0 5.297 3.438 9.787 8.205 11.387.6.111.82-.261.82-.58 0-.287-.011-1.243-.017-2.255-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.73.083-.73 1.205.085 1.84 1.237 1.84 1.237 1.07 1.834 2.809 1.304 3.495.997.108-.775.42-1.305.763-1.605-2.665-.304-5.467-1.332-5.467-5.93 0-1.31.469-2.381 1.236-3.221-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.301 1.23a11.42 11.42 0 0 1 3.003-.404c1.018.005 2.045.138 3.003.404 2.291-1.552 3.297-1.23 3.297-1.23.655 1.652.243 2.873.119 3.176.77.84 1.235 1.911 1.235 3.221 0 4.61-2.807 5.624-5.48 5.921.431.372.815 1.102.815 2.222 0 1.604-.015 2.896-.015 3.289 0 .321.216.697.825.579C20.565 22.283 24 17.793 24 12.5 24 5.872 18.627 0.5 12 0.5z" />
              </svg>
              GitHub
            </a>
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-gray-800 hover:text-indigo-700 hover:underline"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.852 0-2.136 1.445-2.136 2.938v5.668H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.602 0 4.266 2.37 4.266 5.455v6.286zM5.337 7.433c-1.084 0-1.959-.875-1.959-1.957 0-1.083.875-1.958 1.959-1.958 1.082 0 1.957.875 1.957 1.958 0 1.082-.875 1.957-1.957 1.957zM7.119 20.452H3.555V9h3.564v11.452z" />
              </svg>
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
