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
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg bg-white px-4 py-3 shadow-sm">
      <label className="flex flex-col text-sm text-slate-600">
        С
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1 focus:border-slate-500 focus:outline-none"
        />
      </label>

      <label className="flex flex-col text-sm text-slate-600">
        По
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1 focus:border-slate-500 focus:outline-none"
        />
      </label>

      <button
        onClick={handleApply}
        className="rounded bg-slate-800 px-4 py-1.5 text-sm text-white hover:bg-slate-700"
      >
        Применить фильтр
      </button>

      {(dateFrom || dateTo) && (
        <button
          onClick={handleReset}
          className="rounded border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          Сбросить
        </button>
      )}
    </div>
  )
}
