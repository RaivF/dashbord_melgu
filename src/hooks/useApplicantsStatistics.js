import { useCallback, useEffect, useRef, useState } from 'react'
import { getApplicantsStatistics } from '../api/client.js'
import { AUTO_REFRESH_MS } from '../config/dashboard.js'
import { formatTime } from '../utils/date.js'

export function useApplicantsStatistics(period) {
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const abortRef = useRef(null)

  const fetchData = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const isCurrentRequest = () => abortRef.current === controller && !controller.signal.aborted

    setLoading(true)
    setError(null)

    try {
      const data = await getApplicantsStatistics(period, controller.signal)
      if (!isCurrentRequest()) return

      setResponse(data)
      setLastUpdated(formatTime(new Date()))
      localStorage.setItem('dashboard-period', period)
    } catch (requestError) {
      if (isCurrentRequest() && requestError.name !== 'CanceledError') {
        setError({
          message: requestError.response?.data?.message || requestError.message || 'Ошибка загрузки данных',
          status: requestError.response?.status,
        })
      }
    } finally {
      if (isCurrentRequest()) {
        setLoading(false)
      }
    }
  }, [period])

  useEffect(() => {
    fetchData()

    const interval = window.setInterval(fetchData, AUTO_REFRESH_MS)
    return () => {
      window.clearInterval(interval)
      abortRef.current?.abort()
    }
  }, [fetchData])

  return {
    response,
    loading,
    error,
    lastUpdated,
    refresh: fetchData,
  }
}
