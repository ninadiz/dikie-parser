import { useState } from 'react'

export default function LoginForm({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await onLogin(username, password)
    } catch (err) {
      setError(err.message || 'Не удалось войти')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md"
      >
        <h1 className="mb-6 text-xl font-semibold text-slate-800">Вход в админ-панель</h1>

        <label className="mb-3 block">
          <span className="mb-1 block text-sm text-slate-600">Логин</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
            autoFocus
          />
        </label>

        <label className="mb-5 block">
          <span className="mb-1 block text-sm text-slate-600">Пароль</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
          />
        </label>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-slate-800 px-4 py-2 text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {submitting ? 'Вход...' : 'Войти'}
        </button>
      </form>
    </div>
  )
}
