import { useState } from 'react'

export default function BaselineDateInput({ value, onChange }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleChange(e) {
    const newValue = e.target.value
    if (!newValue) return
    setSaving(true)
    setError(null)
    try {
      await onChange(newValue)
    } catch (err) {
      setError(err.message || 'Не удалось сохранить дату')
    } finally {
      setSaving(false)
    }
  }

  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      Нулевая дата отсчёта:
      <input
        type="date"
        value={value}
        onChange={handleChange}
        disabled={saving}
        className="rounded border border-slate-300 px-2 py-1 focus:border-slate-500 focus:outline-none"
      />
      {saving && <span className="text-xs text-slate-400">сохранение…</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  )
}
