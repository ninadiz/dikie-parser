import { useCallback, useEffect, useRef, useState } from 'react'
import PostsTable from './components/PostsTable'
import Pagination from './components/Pagination'
import DateRangeFilter from './components/DateRangeFilter'
import StatsBar from './components/StatsBar'
import BaselineDateInput from './components/BaselineDateInput'
import FetchNewPostsButton from './components/FetchNewPostsButton'
import { getPosts, getStats, getSettings, updateBaselineDate, fetchNewPosts } from './api/posts'

const PAGE_SIZE = 50

export default function App() {
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
      await loadPage(0, filtersRef.current)
    } catch (err) {
      setLoadError(err.message || 'Не удалось подключиться к серверу')
      setStatus('error')
    }
  }, [loadPage])

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

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

  async function handleBaselineChange(newDate) {
    await updateBaselineDate(newDate)
    setBaselineDate(newDate)
    if (!filters.dateFrom && !filters.dateTo) {
      const statsData = await getStats(filters)
      setStatsCount(statsData.count)
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

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        Загрузка...
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="max-w-sm rounded-lg bg-white p-6 text-center shadow-md">
          <p className="mb-4 text-slate-700">{loadError}</p>
          <button
            onClick={bootstrap}
            className="rounded bg-slate-800 px-4 py-2 text-white hover:bg-slate-700"
          >
            Повторить
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 p-3 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-800 sm:text-xl">Посты со стены VK-группы</h1>
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <BaselineDateInput value={baselineDate} onChange={handleBaselineChange} />
          <FetchNewPostsButton onFetched={handleFetchNew} />
        </div>

        <DateRangeFilter onApply={handleFilterApply} />
        {filterError && <p className="mb-4 text-sm text-red-600">{filterError}</p>}
        <StatsBar
          count={statsCount}
          loading={statsLoading}
          isFiltered={Boolean(filters.dateFrom || filters.dateTo)}
        />
        <PostsTable posts={shown} />
        <Pagination
          page={page}
          totalPages={Math.max(1, Math.ceil(statsCount / PAGE_SIZE))}
          hasMore={hasMore}
          loading={pageLoading}
          onPrev={handlePrevPage}
          onNext={handleNextPage}
        />
      </div>
    </div>
  )
}
