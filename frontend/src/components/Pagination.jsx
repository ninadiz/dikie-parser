export default function Pagination({ page, totalPages, hasMore, loading, onPrev, onNext }) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-white px-4 py-3 shadow-sm">
      <button
        onClick={onPrev}
        disabled={page === 0 || loading}
        className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        ← Назад
      </button>
      <span className="text-sm text-slate-500">
        Страница {page + 1} из {totalPages}
      </span>
      <button
        onClick={onNext}
        disabled={!hasMore || loading}
        className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Вперёд →
      </button>
    </div>
  )
}
