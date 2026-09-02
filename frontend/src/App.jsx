import { useCallback, useEffect, useRef, useState } from 'react'
import PostsTable from './components/PostsTable'
import DateRangeFilter from './components/DateRangeFilter'
import StatsBar from './components/StatsBar'
import BaselineDateInput from './components/BaselineDateInput'
import FetchNewPostsButton from './components/FetchNewPostsButton'
import { getPosts, getStats, getSettings, updateBaselineDate, fetchNewPosts } from './api/posts'

const INITIAL_LIMIT = 150
const PAGE_SIZE = 50
const BACKGROUND_LIMIT = 100
const REFILL_THRESHOLD = 50

export default function App() {
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [shown, setShown] = useState([])
  const [loadingMore, setLoadingMore] = useState(false)
  const [statsCount, setStatsCount] = useState(0)
  const [statsLoading, setStatsLoading] = useState(true)
  const [baselineDate, setBaselineDate] = useState('')
  const [filters, setFilters] = useState({ dateFrom: null, dateTo: null })
  const [loadError, setLoadError] = useState(null)
  const [filterError, setFilterError] = useState(null)

  // Buffered posts, fetch offset/cursor and in-flight state live in refs so the
  // scroll handler always reads the latest values without recreating callbacks.
  const bufferRef = useRef([])
  const offsetRef = useRef(0)
  const hasMoreRef = useRef(true)
  const loadingMoreRef = useRef(false)
  const filtersRef = useRef(filters)

  useEffect(() => {
    filtersRef.current = filters
  }, [filters])

  const loadInitial = useCallback(async (activeFilters) => {
    setShown([])
    bufferRef.current = []
    offsetRef.current = 0
    hasMoreRef.current = true

    setStatsLoading(true)
    const [postsData, statsData] = await Promise.all([
      getPosts({ ...activeFilters, limit: INITIAL_LIMIT, offset: 0 }),
      getStats(activeFilters),
    ])

    setShown(postsData.items.slice(0, PAGE_SIZE))
    bufferRef.current = postsData.items.slice(PAGE_SIZE)
    offsetRef.current = postsData.items.length
    hasMoreRef.current = postsData.hasMore

    setStatsCount(statsData.count)
    setStatsLoading(false)
  }, [])

  const fetchMoreFromServer = useCallback(async () => {
    if (loadingMoreRef.current || !hasMoreRef.current) return
    loadingMoreRef.current = true
    setLoadingMore(true)
    try {
      const data = await getPosts({
        ...filtersRef.current,
        limit: BACKGROUND_LIMIT,
        offset: offsetRef.current,
      })
      bufferRef.current = bufferRef.current.concat(data.items)
      offsetRef.current += data.items.length
      hasMoreRef.current = data.hasMore
    } finally {
      loadingMoreRef.current = false
      setLoadingMore(false)
    }
  }, [])

  const handleNearEnd = useCallback(() => {
    if (bufferRef.current.length > 0) {
      const next = bufferRef.current.slice(0, PAGE_SIZE)
      bufferRef.current = bufferRef.current.slice(PAGE_SIZE)
      setShown((prev) => prev.concat(next))
    }
    if (bufferRef.current.length < REFILL_THRESHOLD && hasMoreRef.current) {
      fetchMoreFromServer()
    }
  }, [fetchMoreFromServer])

  const bootstrap = useCallback(async () => {
    setLoadError(null)
    try {
      const settings = await getSettings()
      setBaselineDate(settings.baseline_date)
      setStatus('ready')
      await loadInitial(filtersRef.current)
    } catch (err) {
      setLoadError(err.message || 'Не удалось подключиться к серверу')
      setStatus('error')
    }
  }, [loadInitial])

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  async function handleFilterApply(newFilters) {
    setFilterError(null)
    setFilters(newFilters)
    filtersRef.current = newFilters
    try {
      await loadInitial(newFilters)
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
      await loadInitial(filtersRef.current)
    }
    return result.count
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
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-800">Посты со стены VK-группы</h1>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
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
        <PostsTable posts={shown} onNearEnd={handleNearEnd} loadingMore={loadingMore} />
      </div>
    </div>
  )
}
