import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../contexts/AuthContext'

interface Video {
  id: number
  youtube_url: string
  title: string | null
  duration: number | null
  created_at: string
  sentence_count: number
}

interface Sentence {
  id: number
  sentence_text: string
  start_time: number
  end_time: number
  sentence_index: number
}

interface ProcessResult {
  video_id: number
  title: string
  duration: number
  sentence_count: number
  message: string
}

export default function YouTubeProcessor() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [processing, setProcessing] = useState(false)
  const [processResult, setProcessResult] = useState<ProcessResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [videos, setVideos] = useState<Video[]>([])
  const [loadingVideos, setLoadingVideos] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [sentences, setSentences] = useState<Sentence[]>([])
  const [loadingSentences, setLoadingSentences] = useState(false)

  useEffect(() => {
    if (user?.is_demo) navigate('/workspace', { replace: true })
  }, [user?.is_demo, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!youtubeUrl.trim()) {
      setError('Please enter a YouTube URL')
      return
    }

    setProcessing(true)
    setError(null)
    setProcessResult(null)

    try {
      const response = await api.post('/api/youtube/process', {
        url: youtubeUrl.trim()
      })
      setProcessResult(response.data)
      setYoutubeUrl('')
      // Refresh videos list
      fetchVideos()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to process video. Make sure the video has subtitles available.')
      console.error('Error processing video:', err)
    } finally {
      setProcessing(false)
    }
  }

  const fetchVideos = async () => {
    setLoadingVideos(true)
    try {
      const response = await api.get('/api/youtube/videos')
      setVideos(response.data)
    } catch (err) {
      console.error('Error fetching videos:', err)
    } finally {
      setLoadingVideos(false)
    }
  }

  const fetchSentences = async (videoId: number) => {
    setLoadingSentences(true)
    try {
      const response = await api.get(`/api/youtube/videos/${videoId}/sentences`)
      setSentences(response.data)
    } catch (err) {
      console.error('Error fetching sentences:', err)
    } finally {
      setLoadingSentences(false)
    }
  }

  const handleVideoSelect = (video: Video) => {
    setSelectedVideo(video)
    fetchSentences(video.id)
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Load videos on component mount
  useEffect(() => {
    fetchVideos()
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 text-left">
      <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 space-y-6 pb-12">
      {/* YouTube URL Input Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white mb-4">
          Process YouTube Video
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Enter a YouTube video URL to extract subtitles and segment them into sentences for dictation practice.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="youtube-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              YouTube URL
            </label>
            <input
              id="youtube-url"
              type="text"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              disabled={processing}
            />
          </div>

          <button
            type="submit"
            disabled={processing || !youtubeUrl.trim()}
            className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
          >
            {processing ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              'Process Video'
            )}
          </button>
        </form>

        {error && (
          <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {processResult && (
          <div className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-green-800 dark:text-green-200 font-semibold mb-2">
              {processResult.message}
            </p>
            <div className="text-sm text-green-700 dark:text-green-300">
              <p><strong>Title:</strong> {processResult.title}</p>
              <p><strong>Duration:</strong> {formatDuration(processResult.duration)}</p>
              <p><strong>Sentences:</strong> {processResult.sentence_count}</p>
            </div>
          </div>
        )}
      </div>

      {/* Processed Videos List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-white">
            Processed Videos
          </h2>
          <button
            onClick={fetchVideos}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg transition-colors text-sm"
          >
            Refresh
          </button>
        </div>

        {loadingVideos ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading videos...</p>
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">
              No videos processed yet. Process a YouTube video to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {videos.map((video) => (
              <div
                key={video.id}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedVideo?.id === video.id
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600'
                }`}
                onClick={() => handleVideoSelect(video)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 dark:text-white mb-1">
                      {video.title || 'Untitled Video'}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 break-all">
                      {video.youtube_url}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>Duration: {formatDuration(video.duration)}</span>
                      <span>Sentences: {video.sentence_count}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sentences Display */}
      {selectedVideo && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white mb-4 break-words">
            Sentences from: {selectedVideo.title || 'Untitled Video'}
          </h2>

          {loadingSentences ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading sentences...</p>
            </div>
          ) : sentences.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">No sentences found.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {sentences.map((sentence) => (
                <div
                  key={sentence.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      {formatTime(sentence.start_time)} - {formatTime(sentence.end_time)}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      #{sentence.sentence_index + 1}
                    </span>
                  </div>
                  <p className="text-gray-800 dark:text-white">
                    {sentence.sentence_text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  )
}
