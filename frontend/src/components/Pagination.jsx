import { useState } from 'react'

// Always exactly `size` consecutive numbers (fewer only if there aren't that many
// pages total), sliding so the current page stays roughly centered — no first/last
// anchors, no ellipsis.
function getPageWindow(current, total, size = 5) {
  const windowSize = Math.min(size, total)
  const start = Math.min(Math.max(1, current - Math.floor(size / 2)), total - windowSize + 1)
  return Array.from({ length: windowSize }, (_, i) => start + i)
}

export default function Pagination({ page, totalPages, hasMore, loading, onPrev, onNext, onGoTo }) {
  const current = page + 1
  const [goToValue, setGoToValue] = useState('')

  function handleGoToKeyDown(e) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const n = parseInt(goToValue, 10)
    if (Number.isFinite(n) && n >= 1 && n <= totalPages) {
      onGoTo(n - 1)
    }
    setGoToValue('')
  }

  const buttonClass =
    'rounded border border-ink-700 light:border-paper-300 px-3 py-1.5 text-sm text-slate-300 light:text-slate-700 hover:bg-ink-800 light:hover:bg-paper-200 disabled:cursor-not-allowed disabled:opacity-50'
  const activeButtonClass = 'rounded bg-ink-700 light:bg-paper-300 px-3 py-1.5 text-sm text-white'

  return (
    <nav
      aria-label="Пагинация"
      className="flex flex-wrap items-center justify-center gap-2 rounded-lg bg-ink-900 light:bg-paper-100 px-4 py-3 shadow-sm"
    >
      <button onClick={onPrev} disabled={page === 0 || loading} className={buttonClass}>
        Назад
      </button>

      {getPageWindow(current, totalPages).map((n) => (
        <button
          key={n}
          onClick={() => onGoTo(n - 1)}
          disabled={loading}
          aria-current={n === current ? 'page' : undefined}
          className={n === current ? activeButtonClass : buttonClass}
        >
          {n}
        </button>
      ))}

      <button onClick={onNext} disabled={!hasMore || loading} className={buttonClass}>
        Вперёд
      </button>

      <div className="ml-2 flex items-center gap-1.5">
        <span className="text-sm text-slate-400 light:text-slate-600">Перейти на</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={goToValue}
          onChange={(e) => setGoToValue(e.target.value.replace(/\D/g, ''))}
          onKeyDown={handleGoToKeyDown}
          className="w-12 rounded border border-ink-700 light:border-paper-300 bg-ink-950 light:bg-paper-200 px-2 py-1 text-sm text-slate-100 light:text-slate-900 focus:border-slate-400 focus:outline-none"
        />
        <span className="text-sm text-slate-400 light:text-slate-600">стр.</span>
      </div>
    </nav>
  )
}
