import { useState } from 'react'

// Windowed page numbers with ellipsis: 1 … cur-1 cur cur+1 … total
function getPageNumbers(current, total, delta = 1) {
  const range = []
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      range.push(i)
    }
  }

  const withDots = []
  let last = 0
  for (const i of range) {
    if (last) {
      if (i - last === 2) withDots.push(last + 1)
      else if (i - last > 2) withDots.push('…')
    }
    withDots.push(i)
    last = i
  }
  return withDots
}

export default function Pagination({ page, totalPages, hasMore, loading, onPrev, onNext, onGoTo, position }) {
  const current = page + 1
  const [goToValue, setGoToValue] = useState('')

  function handleGoTo(e) {
    e.preventDefault()
    const n = parseInt(goToValue, 10)
    if (Number.isFinite(n) && n >= 1 && n <= totalPages) {
      onGoTo(n - 1)
      setGoToValue('')
    }
  }

  const buttonClass =
    'rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'
  const activeButtonClass = 'rounded bg-slate-800 px-3 py-1.5 text-sm text-white'

  return (
    <nav
      aria-label={`Пагинация — ${position === 'top' ? 'сверху' : 'снизу'}`}
      className="flex flex-wrap items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 shadow-sm"
    >
      <button onClick={onPrev} disabled={page === 0 || loading} className={buttonClass}>
        ← Назад
      </button>

      {getPageNumbers(current, totalPages).map((n, i) =>
        n === '…' ? (
          <span key={`dots-${i}`} className="px-1 text-slate-400">
            …
          </span>
        ) : (
          <button
            key={n}
            onClick={() => onGoTo(n - 1)}
            disabled={loading}
            aria-current={n === current ? 'page' : undefined}
            className={n === current ? activeButtonClass : buttonClass}
          >
            {n}
          </button>
        )
      )}

      <button onClick={onNext} disabled={!hasMore || loading} className={buttonClass}>
        Вперёд →
      </button>

      <form onSubmit={handleGoTo} className="ml-2 flex items-center gap-1.5">
        <span className="text-sm text-slate-500">Перейти на</span>
        <input
          type="number"
          min="1"
          max={totalPages}
          value={goToValue}
          onChange={(e) => setGoToValue(e.target.value)}
          className="w-16 rounded border border-slate-300 px-2 py-1 text-sm focus:border-slate-500 focus:outline-none"
        />
        <span className="text-sm text-slate-500">стр.</span>
      </form>
    </nav>
  )
}
