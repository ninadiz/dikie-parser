import { useState } from 'react'

function formatDate(datetime) {
  return datetime.replace('T', ' ').slice(0, 16)
}

function handlePostTextClick(onToggle) {
  const selection = window.getSelection()
  if (selection && selection.toString().length > 0) {
    return
  }
  onToggle()
}

function PostText({ post, isExpanded, onToggle, className }) {
  return (
    <div
      onClick={() => handlePostTextClick(onToggle)}
      data-expanded={isExpanded}
      className="cursor-pointer"
    >
      <p className={`${className} ${isExpanded ? '' : 'line-clamp-3'}`}>{post.text}</p>
      <span className="text-xs text-blue-400 light:text-blue-600">
        {isExpanded ? 'свернуть' : 'показать полностью'}
      </span>
    </div>
  )
}

function AuthorLink({ authorLink, className }) {
  if (!authorLink) {
    return <span className="text-slate-500">—</span>
  }
  return (
    <a href={authorLink} target="_blank" rel="noreferrer" className={className}>
      {authorLink}
    </a>
  )
}

function RegionCell({ post }) {
  if (post.extraction_pending) {
    return <span className="italic text-slate-500">…</span>
  }
  if (post.region) {
    return <span className="text-slate-100 light:text-slate-900">{post.region}</span>
  }
  if (post.region_raw) {
    return <span className="italic text-slate-400 light:text-slate-600">{post.region_raw}</span>
  }
  return <span className="text-slate-500">—</span>
}

function PostLink({ postLink, className }) {
  if (!postLink) {
    return <span className="text-slate-500">—</span>
  }
  return (
    <a href={postLink} target="_blank" rel="noreferrer" className={className}>
      {postLink}
    </a>
  )
}

export default function PostsTable({ posts }) {
  const [expanded, setExpanded] = useState(() => new Set())

  function toggleExpanded(id) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="rounded-lg bg-ink-900 light:bg-paper-100 shadow-sm">
      <div className="overflow-x-auto">
        <table className="hidden w-full border-collapse text-left text-sm md:table">
          <thead className="bg-ink-800 light:bg-paper-300/20 text-slate-300 light:text-slate-700">
            <tr>
              <th className="px-4 py-2 font-medium">Дата</th>
              <th className="px-4 py-2 font-medium">Текст</th>
              <th className="px-4 py-2 font-medium">Автор</th>
              <th className="px-4 py-2 font-medium">Направление</th>
              <th className="px-4 py-2 font-medium">Ссылки</th>
              <th className="px-4 py-2 font-medium">Ссылка на пост</th>
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
                <td className="max-w-md px-4 py-2 align-top">
                  <PostText
                    post={post}
                    isExpanded={expanded.has(post.id)}
                    onToggle={() => toggleExpanded(post.id)}
                    className="whitespace-pre-wrap text-slate-100 light:text-slate-900"
                  />
                </td>
                <td className="px-4 py-2 align-top">
                  <AuthorLink
                    authorLink={post.author_link}
                    className="text-blue-400 light:text-blue-600 hover:underline"
                  />
                </td>
                <td className="whitespace-nowrap px-4 py-2 align-top">
                  <RegionCell post={post} />
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
                <td className="px-4 py-2 align-top">
                  <PostLink
                    postLink={post.post_link}
                    className="text-blue-400 light:text-blue-600 hover:underline"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-ink-800 light:divide-paper-200 md:hidden">
        {posts.map((post) => (
          <li key={post.id} className="space-y-2 p-4">
            <p className="text-xs text-slate-400 light:text-slate-600">{formatDate(post.published_at)}</p>
            <PostText
              post={post}
              isExpanded={expanded.has(post.id)}
              onToggle={() => toggleExpanded(post.id)}
              className="whitespace-pre-wrap text-sm text-slate-100 light:text-slate-900"
            />
            <p className="text-sm">
              <span className="text-slate-400 light:text-slate-600">Автор: </span>
              <AuthorLink
                authorLink={post.author_link}
                className="break-all text-blue-400 light:text-blue-600 hover:underline"
              />
            </p>
            <p className="text-sm">
              <span className="text-slate-400 light:text-slate-600">Направление: </span>
              <RegionCell post={post} />
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
            <p className="text-sm">
              <span className="text-slate-400 light:text-slate-600">Пост: </span>
              <PostLink
                postLink={post.post_link}
                className="break-all text-blue-400 light:text-blue-600 hover:underline"
              />
            </p>
          </li>
        ))}
      </ul>

      {posts.length === 0 && (
        <p className="px-4 py-6 text-center text-slate-500">Постов не найдено</p>
      )}
    </div>
  )
}
