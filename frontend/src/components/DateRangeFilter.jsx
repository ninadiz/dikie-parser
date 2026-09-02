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
    <div className="mb-4 flex flex-col gap-3 rounded-lg bg-white px-4 py-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
      <label className="flex w-full flex-col text-sm text-slate-600 sm:w-auto">
        С
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-full rounded border border-slate-300 px-2 py-1 focus:border-slate-500 focus:outline-none sm:w-auto"
        />
      </label>

      <label className="flex w-full flex-col text-sm text-slate-600 sm:w-auto">
        По
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-full rounded border border-slate-300 px-2 py-1 focus:border-slate-500 focus:outline-none sm:w-auto"
        />
      </label>

      <button
        onClick={handleApply}
        className="w-full rounded bg-slate-800 px-4 py-1.5 text-sm text-white hover:bg-slate-700 sm:w-auto"
      >
        Применить фильтр
      </button>

      {(dateFrom || dateTo) && (
        <button
          onClick={handleReset}
          className="w-full rounded border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50 sm:w-auto"
        >
          Сбросить
        </button>
      )}
    </div>
  )
}
