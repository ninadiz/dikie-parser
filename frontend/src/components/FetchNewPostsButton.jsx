import { useState } from 'react'

export default function FetchNewPostsButton({ onFetched }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  async function handleClick() {
    setLoading(true)
    setMessage(null)
    try {
      const count = await onFetched()
      setMessage(`Загружено ${count} новых постов`)
    } catch (err) {
      setMessage(err.message || 'Не удалось догрузить посты')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full rounded bg-emerald-600 px-4 py-1.5 text-sm text-white hover:bg-emerald-500 disabled:opacity-50 sm:w-auto"
      >
        {loading ? 'Загрузка...' : 'Догрузить новые посты'}
      </button>
      {message && <span className="text-sm text-slate-400 light:text-slate-600">{message}</span>}
    </div>
  )
}
