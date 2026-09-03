import { useCallback, useEffect, useRef, useState } from 'react'
import PostsTable from './components/PostsTable'
import Pagination from './components/Pagination'
import DateRangeFilter from './components/DateRangeFilter'
import StatsBar from './components/StatsBar'
import BaselineDate from './components/BaselineDate'
import FetchNewPostsButton from './components/FetchNewPostsButton'
import BalbesDecor from './components/BalbesDecor'
import ThemeToggle from './components/ThemeToggle'
import { getPosts, getStats, getSettings, fetchNewPosts } from './api/posts'

const PAGE_SIZE = 50

function getInitialTheme() {
  return window.localStorage.getItem('theme') === 'light' ? 'light' : 'dark'
}

// Pagination is reflected in the URL (?page=N, 1-indexed for humans) so a specific
// page can be linked to directly and the browser's back/forward buttons work.
function getPageFromUrl() {
  const raw = parseInt(new URLSearchParams(window.location.search).get('page'), 10)
  return Number.isFinite(raw) && raw > 0 ? raw - 1 : 0
}

function syncUrlToPage(pageIndex) {
  const params = new URLSearchParams(window.location.search)
  const desired = pageIndex > 0 ? String(pageIndex + 1) : null
  if (params.get('page') === desired) return // already in sync (e.g. came from popstate)

  if (desired) params.set('page', desired)
  else params.delete('page')

  const query = params.toString()
  window.history.pushState({ page: pageIndex }, '', window.location.pathname + (query ? `?${query}` : ''))
}

export default function App() {
  const [theme, setTheme] = useState(getInitialTheme)
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [shown, setShown] = useState([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [pageLoading, setPageLoading] = useState(false)
  const [statsCount, setStatsCount] = useState(0)
  const [statsLoading, setStatsLoading] = useState(true)
  const [baselineDate, setBaselineDate] = useState('')
  const [filters, setFilters] = useState({ dateFrom: null, dateTo: null })
  const [loadError, setLoadError] = useState(null)
  const [filterError, setFilterError] = useState(null)

  const filtersRef = useRef(filters)

  useEffect(() => {
    filtersRef.current = filters
  }, [filters])

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
    window.localStorage.setItem('theme', theme)
  }, [theme])

  function handleThemeToggle() {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }

  const loadPage = useCallback(async (pageIndex, activeFilters) => {
    setStatsLoading(true)
    setPageLoading(true)
    try {
      const [postsData, statsData] = await Promise.all([
        getPosts({ ...activeFilters, limit: PAGE_SIZE, offset: pageIndex * PAGE_SIZE }),
        getStats(activeFilters),
      ])
      setShown(postsData.items)
      setHasMore(postsData.hasMore)
      setPage(pageIndex)
      setStatsCount(statsData.count)
      syncUrlToPage(pageIndex)
    } finally {
      setStatsLoading(false)
      setPageLoading(false)
    }
  }, [])

  const bootstrap = useCallback(async () => {
    setLoadError(null)
    try {
      const settings = await getSettings()
      setBaselineDate(settings.baseline_date)
      setStatus('ready')
      await loadPage(getPageFromUrl(), filtersRef.current)
    } catch (err) {
      setLoadError(err.message || 'Не удалось подключиться к серверу')
      setStatus('error')
    }
  }, [loadPage])

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  useEffect(() => {
    function onPopState() {
      loadPage(getPageFromUrl(), filtersRef.current)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [loadPage])

  async function handleFilterApply(newFilters) {
    setFilterError(null)
    setFilters(newFilters)
    filtersRef.current = newFilters
    try {
      await loadPage(0, newFilters)
    } catch (err) {
      setFilterError(err.message || 'Не удалось применить фильтр')
    }
  }

  async function handleFetchNew() {
    const result = await fetchNewPosts()
    if (result.count > 0) {
      await loadPage(0, filtersRef.current)
    }
    return result.count
  }

  function handlePrevPage() {
    if (page > 0) loadPage(page - 1, filtersRef.current)
  }

  function handleNextPage() {
    if (hasMore) loadPage(page + 1, filtersRef.current)
  }

  function handleGoToPage(pageIndex) {
    if (pageIndex !== page) loadPage(pageIndex, filtersRef.current)
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950 light:bg-paper-200 text-slate-400 light:text-slate-600">
        Загрузка...
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950 light:bg-paper-200">
        <div className="max-w-sm rounded-lg bg-ink-900 light:bg-paper-100 p-6 text-center shadow-sm">
          <p className="mb-4 text-slate-200 light:text-slate-800">{loadError}</p>
          <button
            onClick={bootstrap}
            className="rounded bg-ink-700 light:bg-paper-300 px-4 py-2 text-white hover:bg-ink-800 light:hover:opacity-90"
          >
            Повторить
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ink-950 light:bg-paper-200 p-3 sm:p-6">
      <BalbesDecor />
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-slate-100 light:text-slate-900 sm:text-xl">
            Посты со стены VK-группы
          </h1>
          <ThemeToggle theme={theme} onToggle={handleThemeToggle} />
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <BaselineDate value={baselineDate} />
          <FetchNewPostsButton onFetched={handleFetchNew} />
        </div>

        <DateRangeFilter onApply={handleFilterApply} />
        {filterError && <p className="mb-4 text-sm text-red-400 light:text-red-600">{filterError}</p>}
        <StatsBar
          count={statsCount}
          loading={statsLoading}
          isFiltered={Boolean(filters.dateFrom || filters.dateTo)}
        />
        {/* Posts can be long — pagination up here too, so you don't have to scroll
            all the way back down to switch pages. */}
        <div className="mt-4">
          <Pagination
            position="top"
            page={page}
            totalPages={Math.max(1, Math.ceil(statsCount / PAGE_SIZE))}
            hasMore={hasMore}
            loading={pageLoading}
            onPrev={handlePrevPage}
            onNext={handleNextPage}
            onGoTo={handleGoToPage}
          />
        </div>
        <div className="mt-4">
          <PostsTable posts={shown} />
        </div>
        <div className="mt-4">
          <Pagination
            position="bottom"
            page={page}
            totalPages={Math.max(1, Math.ceil(statsCount / PAGE_SIZE))}
            hasMore={hasMore}
            loading={pageLoading}
            onPrev={handlePrevPage}
            onNext={handleNextPage}
            onGoTo={handleGoToPage}
          />
        </div>
      </div>
    </div>
  )
}
