/**
 * Lite build: disabled nav item so AI Coach appears on every main screen (Dashboard, Workspace, Settings).
 */
export default function AiCoachNavButton() {
  return (
    <button
      type="button"
      disabled
      title="Preview only — AI Coach is not included in Ear2Finger Lite."
      className="px-2 py-2 md:px-4 text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-1.5 md:gap-2 text-sm md:text-base disabled:pointer-events-none disabled:opacity-45 disabled:hover:bg-transparent"
    >
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        />
      </svg>
      AI Coach
    </button>
  )
}
