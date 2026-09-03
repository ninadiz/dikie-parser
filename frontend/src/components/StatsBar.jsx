export default function StatsBar({ count, loading, isFiltered }) {
  return (
    <div className="mb-4 rounded-lg bg-ink-900 light:bg-paper-100 px-4 py-3 shadow-sm">
      <span className="text-sm text-slate-400 light:text-slate-600">
        {isFiltered ? 'Постов в выбранном диапазоне: ' : 'Постов за весь период: '}
      </span>
      <span className="text-lg font-semibold text-slate-100 light:text-slate-900">{loading ? '…' : count}</span>
    </div>
  )
}
