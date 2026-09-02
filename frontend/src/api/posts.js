import { apiFetch } from './client'

// The API compares date_to as a plain DATETIME string (per spec's WHERE published_at <= :dateTo),
// so a date-only value like "2024-02-01" excludes same-day posts published after midnight.
// Expand date-only inputs to the full day here so UI date pickers behave inclusively.
function expandRange(dateFrom, dateTo) {
  const from = dateFrom && /^\d{4}-\d{2}-\d{2}$/.test(dateFrom) ? `${dateFrom} 00:00:00` : dateFrom
  const to = dateTo && /^\d{4}-\d{2}-\d{2}$/.test(dateTo) ? `${dateTo} 23:59:59` : dateTo
  return { from, to }
}

export function getPosts({ dateFrom, dateTo, limit = 150, offset = 0 } = {}) {
  const { from, to } = expandRange(dateFrom, dateTo)
  const params = new URLSearchParams()
  if (from) params.set('date_from', from)
  if (to) params.set('date_to', to)
  params.set('limit', String(limit))
  params.set('offset', String(offset))
  return apiFetch(`/api/posts.php?${params.toString()}`)
}

export function getStats({ dateFrom, dateTo } = {}) {
  const { from, to } = expandRange(dateFrom, dateTo)
  const params = new URLSearchParams()
  if (from) params.set('date_from', from)
  if (to) params.set('date_to', to)
  return apiFetch(`/api/stats.php?${params.toString()}`)
}

export function getSettings() {
  return apiFetch('/api/settings.php')
}

export function updateBaselineDate(baselineDate) {
  return apiFetch('/api/settings.php', {
    method: 'POST',
    body: JSON.stringify({ baseline_date: baselineDate }),
  })
}

export function fetchNewPosts() {
  return apiFetch('/fetch.php', { method: 'POST' })
}
