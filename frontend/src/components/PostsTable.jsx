import { useRef } from 'react'

function formatDate(datetime) {
  return datetime.replace('T', ' ').slice(0, 16)
}

export default function PostsTable({ posts, onNearEnd, loadingMore }) {
  const containerRef = useRef(null)

  function handleScroll() {
    const el = containerRef.current
    if (!el) return
    const nearEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 200
    if (nearEnd) onNearEnd()
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="max-h-[70vh] overflow-y-auto rounded-lg bg-white shadow-sm"
    >
      <table className="w-full border-collapse text-left text-sm">
        <thead className="sticky top-0 bg-slate-100 text-slate-600">
          <tr>
            <th className="px-4 py-2 font-medium">Дата</th>
            <th className="px-4 py-2 font-medium">Текст</th>
            <th className="px-4 py-2 font-medium">Автор</th>
            <th className="px-4 py-2 font-medium">Ссылки</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post, i) => (
            <tr key={post.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
              <td className="whitespace-nowrap px-4 py-2 align-top text-slate-500">
                {formatDate(post.published_at)}
              </td>
              <td className="px-4 py-2 align-top whitespace-pre-wrap text-slate-800">{post.text}</td>
              <td className="px-4 py-2 align-top">
                <a
                  href={post.author_link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {post.author_link}
                </a>
              </td>
              <td className="px-4 py-2 align-top">
                {post.links.length === 0 ? (
                  <span className="text-slate-400">—</span>
                ) : (
                  <ul className="space-y-1">
                    {post.links.map((link) => (
                      <li key={link}>
                        <a
                          href={link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {posts.length === 0 && (
        <p className="px-4 py-6 text-center text-slate-400">Постов не найдено</p>
      )}
      {loadingMore && (
        <p className="px-4 py-3 text-center text-sm text-slate-400">Загрузка…</p>
      )}
    </div>
  )
}
