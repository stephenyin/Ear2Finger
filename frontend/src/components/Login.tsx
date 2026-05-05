import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { fetchHealth } from '../api'

const GITHUB_REPO_URL = 'https://github.com/stephenyin/Ear2Finger'
const GITHUB_RELEASES_URL = 'https://github.com/stephenyin/Ear2Finger/releases'
const PYPI_LITE_URL = 'https://pypi.org/project/ear2finger/'
const LINKEDIN_URL = 'https://www.linkedin.com/in/hang-yin-stephen/'

const VID_IMPORT = 'TEuXrHZ0VSE'
const VID_DICTATION = '5z7yxVxZC1I'

function VideoSpotlight({
  videoId,
  title,
  caption,
}: {
  videoId: string
  title: string
  caption: string
}) {
  const [playing, setPlaying] = useState(false)
  const thumb = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`

  return (
    <div
      className="group relative rounded-2xl transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/20"
      style={{
        background:
          'linear-gradient(135deg, rgba(79, 70, 229, 0.55), rgba(124, 58, 237, 0.45), rgba(236, 72, 153, 0.35))',
        padding: '2px',
        boxShadow:
          '0 4px 24px rgba(79, 70, 229, 0.12), inset 0 1px 0 rgba(255,255,255,0.15)',
      }}
    >
      <div
        className="relative overflow-hidden rounded-[14px] bg-slate-950 ring-1 ring-white/10"
        style={{
          boxShadow: 'inset 0 0 40px rgba(99, 102, 241, 0.15)',
        }}
      >
        {!playing ? (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="relative block aspect-video w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            aria-label={`Play ${title}`}
          >
            <img
              src={thumb}
              alt=""
              className="h-full w-full object-cover opacity-95 transition duration-700 group-hover:scale-105 group-hover:opacity-100"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-slate-900/40 transition duration-500 group-hover:from-slate-950/80" />
            <div className="absolute inset-0 flex flex-col justify-end p-4">
              <p className="text-sm font-semibold text-white drop-shadow-md">{caption}</p>
            </div>
            <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 shadow-lg ring-4 ring-white/30 transition-transform duration-300 group-hover:scale-110 group-hover:ring-indigo-300/60">
              <svg className="ml-1 h-6 w-6 text-indigo-600" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M8 5v14l11-7L8 5z" />
              </svg>
            </span>
            <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent_40%,rgba(255,255,255,0.12)_50%,transparent_60%)] bg-[length:200%_100%] opacity-0 transition-opacity duration-700 group-hover:opacity-100 group-hover:animate-[shimmer_2s_ease-in-out_infinite]" />
          </button>
        ) : (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="aspect-video min-h-[200px] w-full border-0"
          />
        )}
      </div>
    </div>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const { tryDemo } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [demoTryEnabled, setDemoTryEnabled] = useState(false)
  const [hintCopied, setHintCopied] = useState(false)

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

  const handleCopyMacHint = async () => {
    const text = `sudo spctl --master-disable\nsudo xattr -rd com.apple.quarantine /Applications/Ear2Finger.app`
    try {
      await navigator.clipboard.writeText(text)
      setHintCopied(true)
      setTimeout(() => setHintCopied(false), 1500)
    } catch {
      setHintCopied(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f7fb] text-slate-900">
      {/* subtle animated mesh background */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.35]"
        style={{
          backgroundImage:
            'radial-gradient(at 40% 20%, rgba(99,102,241,0.09) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(168,85,247,0.08) 0px, transparent 50%), radial-gradient(at 10% 50%, rgba(236,72,153,0.05) 0px, transparent 45%)',
        }}
      />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10 lg:py-14">
        <div className="space-y-8">
            <div className="rounded-[22px] border border-slate-200/80 bg-gradient-to-b from-indigo-500/[0.09] to-purple-600/[0.03] p-6 shadow-[0_12px_30px_rgba(2,6,23,0.08)] sm:p-8 lg:p-10">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img src="/icon.png" alt="" className="h-11 w-11 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm" aria-hidden />
                  <span className="text-xl font-semibold tracking-tight text-slate-900">Ear2Finger</span>
                </div>
                {demoTryEnabled ? (
                  <button
                    type="button"
                    onClick={handleTry}
                    disabled={loading}
                    className="inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:brightness-105 disabled:opacity-50"
                  >
                    {loading ? 'Starting…' : 'Try the online demo'}
                  </button>
                ) : (
                  <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900">
                    Demo disabled
                  </span>
                )}
              </div>
              <h1 className="mt-4 w-full text-3xl font-bold tracking-tight text-slate-900 sm:text-[2rem] lg:text-[2.3rem]">
                Turn listening into active dictation
              </h1>
              <p className="mt-3 w-full text-base leading-relaxed text-slate-600">
                <strong className="text-slate-800">Ear2Finger</strong> is a locally deployable desktop app that turns
                YouTube videos into sentence-by-sentence dictation practice: per-word typing, hints, playlists,
                and a dashboard for your practice history—running on your machine with SQLite, Qdrant, and LLM.
              </p>
              {error && (
                <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
              )}
              <div className="mt-6 flex w-full flex-wrap items-center gap-3">
                <div className="group relative inline-flex">
                  <a
                    href={GITHUB_RELEASES_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100"
                  >
                    <svg className="mr-1 h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                      <path d="M12 16a1 1 0 0 1-.707-.293l-4-4a1 1 0 1 1 1.414-1.414L11 12.586V4a1 1 0 1 1 2 0v8.586l2.293-2.293a1 1 0 1 1 1.414 1.414l-4 4A1 1 0 0 1 12 16z" />
                      <path d="M5 18a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1z" />
                    </svg>
                    Download Desktop App
                  </a>
                  <div className="invisible absolute left-1/2 top-full z-20 mt-2 w-[380px] max-w-[90vw] -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-600 opacity-0 shadow-xl transition duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                    <p className="mb-2 font-semibold text-slate-700">macOS install hint</p>
                    <p>
                      If blocked, run{' '}
                      <code className="rounded bg-slate-100 px-1 py-0.5">sudo spctl --master-disable</code> and{' '}
                      <code className="rounded bg-slate-100 px-1 py-0.5">sudo xattr -rd com.apple.quarantine /Applications/Ear2Finger.app</code>
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyMacHint}
                      className="mt-2 inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      {hintCopied ? 'Copied!' : 'Copy commands'}
                    </button>
                  </div>
                </div>
                <a
                  href={PYPI_LITE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-2.5 text-sm font-semibold text-amber-800 shadow-sm transition hover:bg-amber-100"
                >
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                    <path d="M6 3a3 3 0 0 0-3 3v5.5A2.5 2.5 0 0 0 5.5 14H11a2 2 0 1 1 0 4H7a1 1 0 1 0 0 2h4a4 4 0 0 0 0-8H5.5a.5.5 0 0 1-.5-.5V6a1 1 0 0 1 1-1h5a1 1 0 1 0 0-2H6z" />
                    <path d="M13 4a1 1 0 0 1 1-1h4a3 3 0 0 1 3 3v5.5a2.5 2.5 0 0 1-2.5 2.5H13a2 2 0 1 0 0 4h4a1 1 0 1 1 0 2h-4a4 4 0 0 1 0-8h5.5a.5.5 0 0 0 .5-.5V6a1 1 0 0 0-1-1h-4a1 1 0 0 1-1-1z" />
                  </svg>
                  Get the Lite version from PyPI
                </a>
                <a
                  href={GITHUB_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white/70 px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm backdrop-blur transition hover:bg-indigo-50"
                >
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                    <path d="M12 0.5C5.373 0.5 0 5.872 0 12.5c0 5.297 3.438 9.787 8.205 11.387.6.111.82-.261.82-.58 0-.287-.011-1.243-.017-2.255-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.73.083-.73 1.205.085 1.84 1.237 1.84 1.237 1.07 1.834 2.809 1.304 3.495.997.108-.775.42-1.305.763-1.605-2.665-.304-5.467-1.332-5.467-5.93 0-1.31.469-2.381 1.236-3.221-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.301 1.23a11.42 11.42 0 0 1 3.003-.404c1.018.005 2.045.138 3.003.404 2.291-1.552 3.297-1.23 3.297-1.23.655 1.652.243 2.873.119 3.176.77.84 1.235 1.911 1.235 3.221 0 4.61-2.807 5.624-5.48 5.921.431.372.815 1.102.815 2.222 0 1.604-.015 2.896-.015 3.289 0 .321.216.697.825.579C20.565 22.283 24 17.793 24 12.5 24 5.872 18.627 0.5 12 0.5z" />
                  </svg>
                  View Repository
                </a>
                <a
                  href={LINKEDIN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700 md:ml-auto"
                >
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.852 0-2.136 1.445-2.136 2.938v5.668H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.602 0 4.266 2.37 4.266 5.455v6.286zM5.337 7.433c-1.084 0-1.959-.875-1.959-1.957 0-1.083.875-1.958 1.959-1.958 1.082 0 1.957.875 1.957 1.958 0 1.082-.875 1.957-1.957 1.957zM7.119 20.452H3.555V9h3.564v11.452z" />
                  </svg>
                  Contact on LinkedIn
                </a>
              </div>
            </div>

            <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_10px_26px_rgba(2,6,23,0.05)] text-left">
              <h2 className="mt-3 text-lg font-bold tracking-tight text-slate-900">Overview</h2>
              <span className="mt-2 inline-flex items-center gap-2 rounded-full border border-indigo-200/70 bg-indigo-500/[0.07] px-3 py-1.5 text-xs font-semibold text-indigo-700">
                YouTube subtitles → Sentence dictation → Progress &amp; stats
              </span>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-600">
                <li>YouTube import and subtitle processing (yt-dlp + FFmpeg for audio)</li>
                <li>Dictation workspace with per-word typing and shortcuts</li>
                <li>Session progress tracking (correct, hints, incorrect)</li>
                <li>Playlists, lesson history, and aggregated stats on the dashboard</li>
                <li>
                  AI coach (optional full build): add a Gemini API key in Settings, then open Dashboard or
                  Workspace coach panels for feedback and recommended practice sentences.
                </li>
              </ul>
            </section>

            <section className="space-y-4 text-left">
              <h2 className="text-lg font-bold tracking-tight text-slate-900">Walkthrough videos</h2>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <VideoSpotlight
                    videoId={VID_IMPORT}
                    title="Import a YouTube lesson into Ear2Finger"
                    caption="Import a YouTube lesson"
                  />
                </div>
                <div>
                  <VideoSpotlight
                    videoId={VID_DICTATION}
                    title="Dictation practice in Ear2Finger"
                    caption="Dictation practice"
                  />
                </div>
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm text-left">
                <h2 className="text-lg font-bold tracking-tight text-slate-900">How to use</h2>
                < ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-600">
                  <li>
                    Install the desktop app or the lite version from PyPI.
                  </li>
                  <li>
                    Open the app and import a YouTube lesson (subtitles, audio, and sentence boundaries are prepared automatically).
                  </li>
                  <li>Type what you hear; use hints and keyboard shortcuts to move between words and sentences.</li>
                  <li>Review stats on the Dashboard and past sessions from Lesson history.</li>
                </ol>
              </section>

              <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm text-left">
                <h2 className="text-lg font-bold tracking-tight text-slate-900">Roadmap</h2>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-600">
                  <li>French and Spanish dictation support (with broader multi-language expansion)</li>
                  <li>Better UX for languages without spaces (Chinese, Japanese, Korean)</li>
                  <li>More configurable weak-word review schedules</li>
                  <li>AI smart mistake notebook (auto-organized error review workbook)</li>
                  <li>Optional AI coach / recommendations (full build)</li>
                </ul>
              </section>
            </div>

            <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm text-left">
              <h2 className="text-lg font-bold tracking-tight text-slate-900">FAQs</h2>
              <details className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3 open:bg-white" open>
                <summary className="cursor-pointer text-sm font-bold text-slate-900">
                  Do I need an AI API key?
                </summary>
                <p className="mt-3 text-sm text-slate-600">
                  Core dictation, playlists, and stats run without any LLM. Optional AI coach features use keys you
                  configure in Settings when enabled.
                </p>
              </details>
              <details className="mt-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3 open:bg-white">
                <summary className="cursor-pointer text-sm font-bold text-slate-900">What does “Import” do?</summary>
                <p className="mt-3 text-sm text-slate-600">
                  It fetches subtitles for the YouTube URL, segments them into sentences with timings, downloads
                  lesson audio where possible, and stores everything for dictation practice.
                </p>
              </details>
              <details className="mt-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3 open:bg-white">
                <summary className="cursor-pointer text-sm font-bold text-slate-900">
                  Is my practice data stored locally?
                </summary>
                <p className="mt-3 text-sm text-slate-600">
                  By default data lives in a local <strong className="text-slate-800">SQLite</strong> file (
                  <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs">DATABASE_URL</code>
                  ). For cloud deploys, point that at your database.
                </p>
              </details>
              <details className="mt-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3 open:bg-white">
                <summary className="cursor-pointer text-sm font-bold text-slate-900">
                  macOS says the app is blocked / cannot be opened
                </summary>
                <p className="mt-3 text-sm text-slate-600">
                  If macOS Gatekeeper blocks the app, you can run these commands in Terminal:
                </p>
                <pre className="mt-3 overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-xs leading-relaxed text-gray-800">
                  <code>{`sudo spctl --master-disable
sudo xattr -rd com.apple.quarantine /Applications/Ear2Finger.app`}</code>
                </pre>
                <p className="mt-3 text-sm text-slate-600">
                  Then open Ear2Finger again. For safety, only do this for apps you trust and downloaded from the
                  official Ear2Finger release page.
                </p>
              </details>
            </section>

            <p className="text-center text-xs text-slate-500 sm:text-left">
              © Ear2Finger — dictation practice from YouTube subtitles.{' '}
              <a href={`${GITHUB_REPO_URL}/blob/main/LICENSE`} className="text-indigo-600 hover:underline" target="_blank" rel="noopener noreferrer">
                MIT License
              </a>
              .
            </p>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}
