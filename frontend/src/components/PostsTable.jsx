function formatDate(datetime) {
  return datetime.replace('T', ' ').slice(0, 16)
}

export default function PostsTable({ posts }) {
  return (
    <div className="rounded-lg bg-ink-900 light:bg-paper-100 shadow-sm">
      <table className="hidden w-full border-collapse text-left text-sm md:table">
        <thead className="bg-ink-800 light:bg-paper-300/20 text-slate-300 light:text-slate-700">
          <tr>
            <th className="px-4 py-2 font-medium">Дата</th>
            <th className="px-4 py-2 font-medium">Текст</th>
            <th className="px-4 py-2 font-medium">Автор</th>
            <th className="px-4 py-2 font-medium">Ссылки</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post, i) => (
            <tr
              key={post.id}
              className={
                i % 2 === 0
                  ? 'bg-ink-900 light:bg-paper-100'
                  : 'bg-ink-800/40 light:bg-paper-200/40'
              }
            >
              <td className="whitespace-nowrap px-4 py-2 align-top text-slate-400 light:text-slate-600">
                {formatDate(post.published_at)}
              </td>
              <td className="px-4 py-2 align-top whitespace-pre-wrap text-slate-100 light:text-slate-900">
                {post.text}
              </td>
              <td className="px-4 py-2 align-top">
                <a
                  href={post.author_link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 light:text-blue-600 hover:underline"
                >
                  {post.author_link}
                </a>
              </td>
              <td className="px-4 py-2 align-top">
                {post.links.length === 0 ? (
                  <span className="text-slate-500">—</span>
                ) : (
                  <ul className="space-y-1">
                    {post.links.map((link) => (
                      <li key={link}>
                        <a
                          href={link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-400 light:text-blue-600 hover:underline"
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

      <ul className="divide-y divide-ink-800 light:divide-paper-200 md:hidden">
        {posts.map((post) => (
          <li key={post.id} className="space-y-2 p-4">
            <p className="text-xs text-slate-400 light:text-slate-600">{formatDate(post.published_at)}</p>
            <p className="whitespace-pre-wrap text-sm text-slate-100 light:text-slate-900">{post.text}</p>
            <p className="text-sm">
              <span className="text-slate-400 light:text-slate-600">Автор: </span>
              <a
                href={post.author_link}
                target="_blank"
                rel="noreferrer"
                className="break-all text-blue-400 light:text-blue-600 hover:underline"
              >
                {post.author_link}
              </a>
            </p>
            <div className="text-sm">
              <span className="text-slate-400 light:text-slate-600">Ссылки: </span>
              {post.links.length === 0 ? (
                <span className="text-slate-500">—</span>
              ) : (
                <ul className="mt-1 space-y-1">
                  {post.links.map((link) => (
                    <li key={link}>
                      <a
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="break-all text-blue-400 light:text-blue-600 hover:underline"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ul>

      {posts.length === 0 && (
        <p className="px-4 py-6 text-center text-slate-500">Постов не найдено</p>
      )}
    </div>
  )
}
