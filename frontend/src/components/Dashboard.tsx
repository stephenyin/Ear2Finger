import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getUserStats, type DailyUserStats, type UserStats, type WordStat } from '../api'
import AiCoachNavButton from './AiCoachNavButton'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  /** Lite build: AI Coach + suggestions are UI preview only (no backend). */
  const aiCoachPreviewDisabled = true
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getUserStats()
      .then(setStats)
      .catch((e) => {
        const err = e as { response?: { data?: { detail?: string } } }
        setError(err.response?.data?.detail || 'Failed to load stats')
      })
      .finally(() => setLoading(false))
  }, [])

  const recentDaily = useMemo<DailyUserStats[]>(() => {
    if (!stats?.daily) return []
    const days = stats.daily.slice(-14) // last 14 days
    return days
  }, [stats])

  const topIncorrect = useMemo<WordStat[]>(() => {
    if (!stats?.top_incorrect_words) return []
    return [...stats.top_incorrect_words]
      .filter((w) => (w.latest_spell_retry_times ?? 1) > 1)
      .sort((a, b) => (b.latest_spell_retry_times ?? 0) - (a.latest_spell_retry_times ?? 0))
  }, [stats])

  const [trickyPage, setTrickyPage] = useState(0)
  const TRICKY_PAGE_SIZE = 30
  const trickyPageCount = Math.max(1, Math.ceil((topIncorrect.length || 1) / TRICKY_PAGE_SIZE))
  const trickyPageWords = useMemo(
    () =>
      topIncorrect.slice(
        trickyPage * TRICKY_PAGE_SIZE,
        trickyPage * TRICKY_PAGE_SIZE + TRICKY_PAGE_SIZE
      ),
    [topIncorrect, trickyPage]
  )

  const maxDailySentences = useMemo(
    () => Math.max(1, ...recentDaily.map((d) => d.total_sentences_practiced || 0)),
    [recentDaily]
  )

  const maxDailyErrorHintPct = useMemo(
    () =>
      Math.max(
        1,
        ...recentDaily.map((d) => {
          const words = d.total_words_seen || 0
          if (!words) return 0
          const incorrectPct = ((d.total_incorrect_words || 0) / words) * 100
          const hintPct = ((d.total_hints_used || 0) / words) * 100
          return Math.max(incorrectPct, hintPct)
        })
      ),
    [recentDaily]
  )

  return (
    <div className="h-screen min-h-0 flex flex-col bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-3 py-2 md:px-4 md:py-3 flex flex-wrap items-center justify-between gap-y-2 gap-x-2 md:flex-nowrap md:gap-0">
        <div className="flex items-center gap-2 order-1 shrink-0">
          <img src="/icon.png" alt="Ear2Finger" className="w-8 h-8" />
          <span className="text-lg font-semibold text-gray-900">Ear2Finger</span>
        </div>

        <nav className="order-3 basis-full flex flex-wrap items-center gap-1 md:order-2 md:basis-auto md:flex-nowrap">
          <button
            onClick={() => navigate('/workspace')}
            className="px-2 py-2 md:px-4 text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-1.5 md:gap-2 text-sm md:text-base"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 511.999 511.999">
              <path d="M480.276,62.526H156.574c-17.493,0-31.725,14.231-31.725,31.725v28.232l-30.679-30.68l-51.975,51.975l23.592,23.592
                L0,270.705l66.804,104.419H41.579c-19.579,0-35.507,15.928-35.507,35.507v38.84h177.005v-38.84
                c0-19.579-15.928-35.507-35.507-35.507h-44.674l-66.83-104.459l44.077-69.235c-1.482,21.531,5.967,43.567,22.39,59.99
                l12.616,12.617l9.7-9.7v67.609c0,17.493,14.231,31.724,31.725,31.724h90.733l-5.361,55.401h-25.091v30.402h22.149h158.839h22.149
                v-30.402h-25.091l-5.36-55.401h90.732c17.493,0,31.725-14.231,31.725-31.724V94.252C512,76.758,497.768,62.526,480.276,62.526z
                 M147.569,405.526c2.815,0,5.105,2.29,5.105,5.105v8.439H36.474v-8.439c0-2.815,2.29-5.105,5.105-5.105H147.569z M105.999,148.902
                c-0.277,0.245-0.556,0.485-0.83,0.735c-0.878,0.8-1.743,1.616-2.587,2.46c-0.016,0.016-0.032,0.03-0.049,0.046
                s-0.03,0.032-0.046,0.049c-0.842,0.844-1.658,1.708-2.457,2.585c-0.253,0.278-0.498,0.561-0.746,0.842
                c-0.353,0.398-0.714,0.79-1.058,1.196l-13.035-13.035l8.979-8.98l13.035,13.035C106.796,148.181,106.4,148.545,105.999,148.902z
                 M116.365,229.831c-7.548-13.358-8.017-29.656-1.423-43.384c0.046-0.095,0.092-0.19,0.138-0.284
                c0.231-0.473,0.471-0.943,0.719-1.411c0.066-0.125,0.135-0.248,0.203-0.372c0.239-0.441,0.484-0.88,0.74-1.313
                c0.085-0.145,0.173-0.288,0.26-0.433c0.247-0.412,0.499-0.823,0.76-1.228c0.106-0.164,0.217-0.326,0.325-0.489
                c0.252-0.382,0.507-0.763,0.772-1.138c0.135-0.19,0.277-0.378,0.414-0.566c0.25-0.344,0.5-0.687,0.76-1.026
                c0.178-0.231,0.365-0.456,0.548-0.684c0.233-0.291,0.462-0.584,0.703-0.87c0.254-0.303,0.52-0.597,0.783-0.894
                c0.183-0.207,0.361-0.418,0.548-0.622c0.46-0.502,0.931-0.994,1.415-1.478c0.539-0.539,1.09-1.06,1.65-1.568
                c0.161-0.147,0.327-0.286,0.49-0.431c0.408-0.361,0.82-0.719,1.238-1.062c0.18-0.149,0.365-0.292,0.547-0.438
                c0.418-0.333,0.838-0.662,1.265-0.979c0.173-0.13,0.349-0.256,0.525-0.383c0.455-0.329,0.915-0.65,1.379-0.961
                c0.149-0.1,0.298-0.2,0.449-0.298c0.52-0.339,1.046-0.667,1.576-0.984c0.099-0.06,0.198-0.121,0.297-0.179
                c3.916-2.297,8.095-3.977,12.398-5.042c0.069-0.017,0.138-0.036,0.207-0.054c0.676-0.164,1.356-0.311,2.038-0.445
                c0.057-0.011,0.113-0.024,0.171-0.036c0.696-0.134,1.394-0.25,2.095-0.353c0.041-0.006,0.082-0.013,0.123-0.019
                c0.708-0.101,1.42-0.186,2.131-0.255c0.035-0.003,0.07-0.007,0.105-0.011c0.709-0.067,1.419-0.118,2.13-0.152
                c0.044-0.002,0.086-0.005,0.13-0.007c0.692-0.032,1.385-0.048,2.078-0.05c0.064,0,0.128-0.001,0.193-0.001
                c1.958,0.003,3.915,0.127,5.86,0.372c0.043,0.005,0.085,0.013,0.128,0.018c0.845,0.109,1.687,0.248,2.526,0.403
                c0.246,0.046,0.492,0.095,0.738,0.145c0.649,0.131,1.294,0.279,1.938,0.437c0.285,0.071,0.572,0.136,0.855,0.212
                c0.764,0.204,1.524,0.428,2.28,0.67c0.395,0.128,0.786,0.269,1.179,0.407c0.497,0.174,0.992,0.351,1.484,0.542
                c0.428,0.167,0.852,0.345,1.276,0.524c0.394,0.167,0.785,0.341,1.176,0.518c0.435,0.199,0.87,0.397,1.298,0.61
                c0.41,0.203,0.815,0.421,1.22,0.636c0.341,0.181,0.685,0.354,1.021,0.543l-31.927,31.927L116.365,229.831z M272.491,419.07
                l5.361-55.401h81.147l5.36,55.401H272.491z M481.598,331.945c0,0.729-0.594,1.323-1.323,1.323h-93.674H250.249h-93.675
                c-0.73,0-1.323-0.593-1.323-1.323v-28.309h326.348V331.945z M481.598,273.234H155.251v-39.3l69.176-69.176l-12.617-12.616
                c-7.677-7.677-16.585-13.387-26.091-17.152c-0.082-0.032-0.165-0.061-0.248-0.093c-1.079-0.424-2.166-0.826-3.26-1.199
                c-0.32-0.109-0.646-0.206-0.967-0.311c-0.85-0.278-1.701-0.55-2.56-0.798c-0.547-0.158-1.099-0.298-1.649-0.444
                c-0.63-0.166-1.26-0.337-1.893-0.487c-0.749-0.179-1.502-0.335-2.256-0.493c-0.434-0.089-0.865-0.184-1.3-0.266
                c-0.918-0.174-1.841-0.324-2.767-0.466c-0.269-0.041-0.535-0.085-0.804-0.123c-1.053-0.15-2.11-0.274-3.17-0.379
                c-0.14-0.014-0.279-0.029-0.418-0.043c-1.154-0.109-2.312-0.191-3.472-0.248c-0.045-0.002-0.089-0.005-0.134-0.007
                c-1.854-0.088-3.711-0.135-5.574-0.089V94.252c0-0.73,0.594-1.323,1.323-1.323h323.702c0.73,0,1.323,0.594,1.323,1.323V273.234z"/>
            </svg>
            Workspace
          </button>
          <button className="px-2 py-2 md:px-4 bg-gray-900 text-white rounded-lg flex items-center gap-1.5 md:gap-2 text-sm md:text-base">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 32 32">
              <polygon points="4 20 4 22 8.586 22 2 28.586 3.414 30 10 23.414 10 28 12 28 12 20 4 20"/>
              <rect x="24.0001" y="21" width="2" height="5"/>
              <rect x="20.0001" y="16" width="2" height="10"/>
              <rect x="16" y="18" width="2" height="8"/>
              <path d="M28,2H4A2.002,2.002,0,0,0,2,4V16H4V13H28.001l.001,15H16v2H28a2.0027,2.0027,0,0,0,2-2V4A2.0023,2.0023,0,0,0,28,2ZM12,11H4V4h8Zm2,0V4H28l.0007,7Z"/>
            </svg>
            Dashboard
          </button>
          <AiCoachNavButton />
          <button
            onClick={() => navigate('/settings')}
            className="px-2 py-2 md:px-4 text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-1.5 md:gap-2 text-sm md:text-base"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </button>
        </nav>

        <div className="flex items-center gap-2 md:gap-3 text-gray-700 order-2 md:order-3 shrink-0 ml-auto md:ml-0">
          <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-gray-50 border border-gray-200">
            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5.121 17.804A9 9 0 1118.88 17.804M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <span className="font-medium text-sm max-w-[8rem] md:max-w-none truncate">{user?.username ?? 'User'}</span>
          </div>
          <button
            onClick={() => logout()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-full border border-gray-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l3-3m0 0l3 3m-3-3v12"
              />
            </svg>
            Sign out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 bg-gray-50 overflow-y-auto min-h-0">
        <div className="max-w-6xl mx-auto px-3 py-4 md:px-4 md:py-6 space-y-6">

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading && !stats && (
            <div className="flex items-center justify-center py-16 text-gray-500 text-sm">
              Loading your stats…
            </div>
          )}

          {stats && (
            <>
              {/* Summary cards */}
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Videos practiced"
                  value={stats.total_videos_practiced}
                  sublabel="Unique videos"
                />
                <StatCard
                  label="Sentences practiced"
                  value={stats.total_sentences_practiced}
                  sublabel="Total across all sessions"
                />
                <StatCard
                  label="Words seen"
                  value={stats.total_words_seen}
                  sublabel={`${stats.unique_words_seen} unique`}
                />
                <StatCard
                  label="Hints"
                  value={stats.total_hints_used}
                  sublabel={`${stats.total_incorrect_words} mistakes`}
                />
              </section>

              {/* Daily stats + AI suggestions (side by side on large screens) */}
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
                <div className="bg-white rounded-xl border border-gray-200 p-4 min-h-0 flex flex-col">
                  <h2 className="text-sm font-semibold text-gray-900 mb-1">
                    Daily stats
                  </h2>
                  <p className="text-xs text-gray-500 mb-4">
                    Last {recentDaily.length} days
                  </p>
                  {recentDaily.length === 0 ? (
                    <p className="text-xs text-gray-500">No practice data yet.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1 items-stretch">
                      <div className="min-w-0 min-h-0 flex h-full flex-col">
                        <div className="mb-2 flex shrink-0 items-center justify-between">
                          <h3 className="text-xs font-semibold text-gray-900">
                            Sentences practiced per day
                          </h3>
                        </div>
                        <div className="flex min-h-0 flex-1 flex-col justify-end">
                          <div className="flex h-40 items-end gap-1">
                          {recentDaily.map((d) => {
                            const sentences = d.total_sentences_practiced || 0
                            const barHeight = (sentences / maxDailySentences) * 100
                            const h = Math.max(barHeight, sentences > 0 ? 2 : 0)
                            return (
                              <div
                                key={d.date}
                                className="flex-1 flex flex-col items-center justify-end gap-1"
                              >
                                <div className="relative w-full h-24">
                                  <div
                                    className="absolute bottom-0 left-0 right-0 w-full bg-indigo-100 rounded-t-md min-h-[2px]"
                                    style={{ height: `${h}%` }}
                                  />
                                  <span
                                    className="absolute left-1/2 -translate-x-1/2 text-[10px] font-semibold text-gray-800 tabular-nums whitespace-nowrap leading-none"
                                    style={{ bottom: `calc(${h}% + 4px)` }}
                                  >
                                    {sentences}
                                  </span>
                                </div>
                                <span className="mt-1 text-[10px] text-gray-500 text-center leading-tight">
                                  {d.date.slice(5)}
                                </span>
                              </div>
                            )
                          })}
                          </div>
                        </div>
                      </div>

                      <div className="min-w-0 min-h-0 flex h-full flex-col">
                        <div className="mb-2 flex shrink-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <h3 className="text-xs font-semibold text-gray-900">
                            Daily retries % and hints %
                          </h3>
                          <div className="flex shrink-0 items-center gap-3 text-[10px] text-gray-500">
                            <span className="flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-rose-400" />
                              Retries %
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-amber-400" />
                              Hints %
                            </span>
                          </div>
                        </div>
                        <div className="flex min-h-0 flex-1 flex-col justify-end">
                          <div className="flex h-40 items-end gap-1">
                          {recentDaily.map((d) => {
                            const words = d.total_words_seen || 0
                            const incorrectPct = words
                              ? ((d.total_incorrect_words || 0) / words) * 100
                              : 0
                            const hintPct = words
                              ? ((d.total_hints_used || 0) / words) * 100
                              : 0
                            const incorrectHeight =
                              (incorrectPct / (maxDailyErrorHintPct || 1)) * 100
                            const hintHeight =
                              (hintPct / (maxDailyErrorHintPct || 1)) * 100
                            const ih = Math.max(incorrectHeight, incorrectPct > 0 ? 1 : 0)
                            const hh = Math.max(hintHeight, hintPct > 0 ? 1 : 0)
                            return (
                              <div
                                key={d.date + '-pct'}
                                className="flex-1 flex flex-col items-center justify-end gap-1"
                              >
                                <div className="w-full h-24 flex gap-[2px]">
                                  <div className="relative flex-1 h-full">
                                    <div
                                      className="absolute bottom-0 left-0 right-0 bg-rose-200 rounded-t-sm min-h-[1px]"
                                      style={{ height: `${ih}%` }}
                                      title={`Retries: ${incorrectPct.toFixed(1)}%`}
                                    />
                                    <span
                                      className="absolute left-1/2 -translate-x-1/2 text-[8px] font-semibold text-rose-800 tabular-nums whitespace-nowrap leading-none"
                                      style={{ bottom: `calc(${ih}% + 2px)` }}
                                    >
                                      {incorrectPct.toFixed(0)}%
                                    </span>
                                  </div>
                                  <div className="relative flex-1 h-full">
                                    <div
                                      className="absolute bottom-0 left-0 right-0 bg-amber-200 rounded-t-sm min-h-[1px]"
                                      style={{ height: `${hh}%` }}
                                      title={`Hints: ${hintPct.toFixed(1)}%`}
                                    />
                                    <span
                                      className="absolute left-1/2 -translate-x-1/2 text-[8px] font-semibold text-amber-900 tabular-nums whitespace-nowrap leading-none"
                                      style={{ bottom: `calc(${hh}% + 2px)` }}
                                    >
                                      {hintPct.toFixed(0)}%
                                    </span>
                                  </div>
                                </div>
                                <span className="mt-1 text-[9px] text-gray-500 text-center leading-tight">
                                  {d.date.slice(5)}
                                </span>
                              </div>
                            )
                          })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-5 pt-4 border-t border-gray-100">
                    <h3 className="text-[11px] font-semibold text-gray-900 mb-1">
                      Recommended YouTube channels
                    </h3>
                    <p className="text-[11px] text-gray-500 mb-2">
                      Clear English audio and good subtitles, great for importing into Ear2Finger.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { name: 'TED-Ed', href: 'https://www.youtube.com/@TEDEd' },
                        { name: 'TED', href: 'https://www.youtube.com/@TED' },
                        { name: 'BBC Learning English', href: 'https://www.youtube.com/bbclearningenglish' },
                        { name: 'Kurzgesagt – In a Nutshell', href: 'https://www.youtube.com/kurzgesagt' },
                        { name: 'Veritasium', href: 'https://www.youtube.com/veritasium' },
                        { name: 'Pick Up Limes', href: 'https://www.youtube.com/pickuplimes' },
                        { name: "Rachel's English", href: 'https://www.youtube.com/rachelsenglish' },
                      ].map((ch) => (
                        <a
                          key={ch.href}
                          href={ch.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full border border-violet-300/40 bg-violet-50 px-2.5 py-0.5 text-[10px] font-medium text-violet-800 hover:bg-violet-100"
                        >
                          <svg className="w-3 h-3" viewBox="0 0 24 24" aria-hidden="true">
                            <path
                              fill="currentColor"
                              d="M21.8 8.001a3.002 3.002 0 0 0-2.113-2.123C17.938 5.25 12 5.25 12 5.25s-5.938 0-7.687.628A3.002 3.002 0 0 0 2.2 8.001C1.575 9.757 1.575 12.75 1.575 12.75s0 2.993.625 4.749a3.002 3.002 0 0 0 2.113 2.123C6.062 20.25 12 20.25 12 20.25s5.938 0 7.687-.628a3.002 3.002 0 0 0 2.113-2.123c.625-1.756.625-4.749.625-4.749s0-2.993-.625-4.749ZM10.25 15.5v-5l4.5 2.5-4.5 2.5Z"
                            />
                          </svg>
                          <span className="truncate max-w-[7rem]">{ch.name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>

                {/* AI suggestions — preview only in Lite */}
                <section
                  id="ai-suggestions"
                  className={`relative rounded-xl border border-violet-200/80 bg-gradient-to-br from-violet-50 to-white p-4 md:p-5 scroll-mt-4 min-h-0 flex flex-col h-full ${
                    aiCoachPreviewDisabled ? 'opacity-60' : ''
                  }`}
                  aria-disabled={aiCoachPreviewDisabled}
                  title={
                    aiCoachPreviewDisabled
                      ? 'Preview only — AI suggestions are not included in Ear2Finger Lite.'
                      : undefined
                  }
                >
                  {aiCoachPreviewDisabled && (
                    <div
                      className="absolute inset-0 z-[1] cursor-not-allowed rounded-xl bg-white/20"
                      aria-hidden
                    />
                  )}
                  <div className="relative z-0 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3 shrink-0">
                    <div>
                      <h2 className="text-sm font-semibold text-violet-950 flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-violet-600 shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                        AI suggestions
                      </h2>
                      <p className="text-xs text-violet-800/80 mt-1">
                        Personalized next steps based on your mistakes, pace, and vocabulary — powered by an AI coach in
                        the full product.
                      </p>
                    </div>
                    <span className="shrink-0 self-start rounded-full border border-violet-300/60 bg-white/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                      Preview
                    </span>
                  </div>
                  <ul className="relative z-0 space-y-2 text-sm text-gray-700 flex-1 min-h-0">
                    <li className="flex gap-2 rounded-lg border border-violet-100/80 bg-white/70 px-3 py-2">
                      <span className="text-violet-500 font-medium shrink-0">1.</span>
                      <span>
                        Drill short sentences with your highest retry words — sample: connect practice to real clips you
                        import.
                      </span>
                    </li>
                    <li className="flex gap-2 rounded-lg border border-violet-100/80 bg-white/70 px-3 py-2">
                      <span className="text-violet-500 font-medium shrink-0">2.</span>
                      <span>
                        Balance hint usage vs. blind retries on recent lessons to build listening confidence.
                      </span>
                    </li>
                    <li className="flex gap-2 rounded-lg border border-violet-100/80 bg-white/70 px-3 py-2">
                      <span className="text-violet-500 font-medium shrink-0">3.</span>
                      <span>
                        Try one level-up video per week from channels with clear subtitles (see channel links in Daily
                        stats).
                      </span>
                    </li>
                  </ul>
                </section>
              </section>

              {/* Top tricky words — compact list with retry counts and pagination */}
              <section className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="flex-1 text-sm font-semibold text-gray-900 text-center">
                    Top tricky words
                  </h2>
                  {topIncorrect.length > 0 && (
                    <div className="flex items-center gap-2 text-[11px] text-gray-500">
                      <button
                        type="button"
                        disabled={trickyPage === 0}
                        onClick={() => setTrickyPage((p) => Math.max(0, p - 1))}
                        className="px-1.5 py-0.5 rounded border border-gray-200 disabled:opacity-40"
                      >
                        ‹
                      </button>
                      <span>
                        Page {trickyPage + 1} / {trickyPageCount}
                      </span>
                      <button
                        type="button"
                        disabled={trickyPage + 1 >= trickyPageCount}
                        onClick={() =>
                          setTrickyPage((p) => Math.min(trickyPageCount - 1, p + 1))
                        }
                        className="px-1.5 py-0.5 rounded border border-gray-200 disabled:opacity-40"
                      >
                        ›
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  Words where your most recent attempt required more than one try. Higher retry counts
                  mean they are trickier for you right now.
                </p>
                {topIncorrect.length === 0 ? (
                  <p className="text-xs text-gray-500">No word-level data yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {trickyPageWords.map((w) => {
                      const rawRetry = w.latest_spell_retry_times ?? 0
                      const retry = Math.max(1, Math.round(rawRetry))
                      const displayWord = (w.word || '').replace(/^[^\w]+|[^\w]+$/g, '')
                      const intensity =
                        retry >= 9 ? 'bg-rose-900' :
                        retry >= 8 ? 'bg-rose-800' :
                        retry >= 7 ? 'bg-rose-700' :
                        retry >= 6 ? 'bg-rose-600' :
                        retry >= 5 ? 'bg-rose-500' :
                        retry >= 4 ? 'bg-rose-400' :
                        retry >= 3 ? 'bg-rose-300' :
                        retry >= 2 ? 'bg-rose-200' :
                        'bg-rose-100'
                      return (
                        <div
                          key={w.word}
                          className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                        >
                          <div className="text-xs font-mono text-gray-800 truncate">
                            {displayWord || w.word}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`inline-block w-3 h-3 rounded-sm ${intensity}`}
                              title={`${retry} tries`}
                            />
                            <span className="text-[11px] text-gray-600 tabular-nums">
                              {retry}×
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

type StatCardProps = {
  label: string
  value: number
  sublabel?: string
}

function StatCard({ label, value, sublabel }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </span>
      <span className="text-2xl font-semibold text-gray-900">
        {value.toLocaleString()}
      </span>
      {sublabel && <span className="mt-1 text-xs text-gray-500">{sublabel}</span>}
    </div>
  )
}

// DifficultyBar previously visualized difficulty distributions, but is currently unused.
