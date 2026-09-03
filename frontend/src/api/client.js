export async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })

  let data
  try {
    data = await res.json()
  } catch {
    // A non-JSON body (e.g. a PHP fatal error page, which PHP's built-in dev
    // server still serves with a 200 status) must surface as an error, not
    // silently become {} — callers rely on the response shape (postsData.items
    // etc.) and would crash on undefined instead of showing a message.
    throw new Error(`Сервер вернул некорректный ответ (${res.status})`)
  }

  if (!res.ok) {
    const err = new Error(data.error || `Request failed: ${res.status}`)
    err.status = res.status
    throw err
  }

  return data
}
