import { useState } from 'react'

export default function DateRangeFilter({ onApply }) {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  function handleApply() {
    onApply({ dateFrom: dateFrom || null, dateTo: dateTo || null })
  }

  function handleReset() {
    setDateFrom('')
    setDateTo('')
    onApply({ dateFrom: null, dateTo: null })
  }

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg bg-ink-900 light:bg-paper-100 px-4 py-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
      <label className="flex w-full flex-col text-sm text-slate-400 light:text-slate-600 sm:w-auto">
        С
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-full rounded border border-ink-700 light:border-paper-300 bg-ink-950 light:bg-paper-200 px-2 py-1 text-slate-100 light:text-slate-900 focus:border-slate-400 focus:outline-none sm:w-auto"
        />
      </label>

      <label className="flex w-full flex-col text-sm text-slate-400 light:text-slate-600 sm:w-auto">
        По
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-full rounded border border-ink-700 light:border-paper-300 bg-ink-950 light:bg-paper-200 px-2 py-1 text-slate-100 light:text-slate-900 focus:border-slate-400 focus:outline-none sm:w-auto"
        />
      </label>

      <button
        onClick={handleApply}
        className="w-full rounded bg-ink-700 light:bg-paper-300 px-4 py-1.5 text-sm text-white hover:bg-ink-800 light:hover:opacity-90 sm:w-auto"
      >
        Применить фильтр
      </button>

      {(dateFrom || dateTo) && (
        <button
          onClick={handleReset}
          className="w-full rounded border border-ink-700 light:border-paper-300 px-4 py-1.5 text-sm text-slate-300 light:text-slate-700 hover:bg-ink-800 light:hover:bg-paper-200 sm:w-auto"
        >
          Сбросить
        </button>
      )}
    </div>
  )
}
