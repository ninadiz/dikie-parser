const OPTIONS = [25, 50, 100]

export default function PageSizeSelect({ value, onChange }) {
  return (
    <label className="mb-4 flex items-center gap-2 text-sm text-slate-400 light:text-slate-600">
      Показывать по
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded border border-ink-700 light:border-paper-300 bg-ink-900 light:bg-paper-100 px-2 py-1 text-slate-100 light:text-slate-900 focus:border-slate-400 focus:outline-none"
      >
        {OPTIONS.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      постов
    </label>
  )
}
