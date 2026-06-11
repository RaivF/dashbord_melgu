import { useEffect, useMemo, useState } from 'react'
import 'react-datepicker/dist/react-datepicker.css'
import { Palette, RefreshCw } from 'lucide-react'
import DashboardContent from './components/DashboardContent.jsx'
import PeriodControls from './components/PeriodControls.jsx'
import SpecialtiesPage from './components/SpecialtiesPage.jsx'
import StatusBar from './components/StatusBar.jsx'
import { THEME_OPTIONS, getRangeLabel } from './config/dashboard.js'
import { useApplicantsStatistics } from './hooks/useApplicantsStatistics.js'
import { useDashboardSettings } from './hooks/useDashboardSettings.js'
import { buildAnalytics } from './utils/analytics.js'

export default function App() {
  const [pagePath, setPagePath] = useState(() => window.location.pathname)
  const {
    period,
    range,
    setRange,
    theme,
    setTheme,
    selectedDate,
    setSelectedDate,
    showPreviousYearOverlay,
    setShowPreviousYearOverlay,
    showPreviousYearFunding,
    setShowPreviousYearFunding,
    showPreviousYearForm,
    setShowPreviousYearForm,
    showPreviousYearMethod,
    setShowPreviousYearMethod,
    campaignYear,
    setCampaignYear,
  } = useDashboardSettings()
  const {
    response,
    loading,
    error,
    lastUpdated,
    refresh,
  } = useApplicantsStatistics(period)
  const analytics = useMemo(() => buildAnalytics(response, range, selectedDate), [response, range, selectedDate])
  const selectedRange = getRangeLabel(range)
  const isSpecialtiesPage = pagePath === '/specialties'

  useEffect(() => {
    const handlePopState = () => setPagePath(window.location.pathname)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  function navigate(path) {
    window.history.pushState({}, '', path)
    setPagePath(path)
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div className="hero__content">
          <h1>{isSpecialtiesPage ? 'Справочник специальностей' : 'Мониторинг приёмной кампании'}</h1>
        </div>

        <div className="hero__controls">
          <nav className="page-tabs" aria-label="Разделы">
            <button className={`page-tab${!isSpecialtiesPage ? ' page-tab--active' : ''}`} type="button" onClick={() => navigate('/')}>
              Дашборд
            </button>
            <button className={`page-tab${isSpecialtiesPage ? ' page-tab--active' : ''}`} type="button" onClick={() => navigate('/specialties')}>
              Специальности
            </button>
          </nav>

          {!isSpecialtiesPage && (
            <button className="refresh-button" type="button" onClick={refresh} disabled={loading}>
              <RefreshCw size={24} className={loading ? 'spin' : ''} />
              {loading ? 'Загрузка' : 'Обновить'}
            </button>
          )}
        </div>
      </header>

      {isSpecialtiesPage ? (
        <SpecialtiesPage />
      ) : (
        <>
          <PeriodControls
            analytics={analytics}
            campaignYear={campaignYear}
            loading={loading}
            range={range}
            selectedDate={selectedDate}
            selectedRange={selectedRange}
            setCampaignYear={setCampaignYear}
            setRange={setRange}
            setSelectedDate={setSelectedDate}
          />

          <StatusBar loading={loading} error={error} lastUpdated={lastUpdated} source={analytics.source} />

          {error && (
            <section className="error-box">
              <strong>Ошибка загрузки данных</strong>
              <span>{error.status ? `HTTP ${error.status}: ` : ''}{error.message}</span>
            </section>
          )}

          <DashboardContent
            analytics={analytics}
            loading={loading}
            selectedRange={selectedRange}
            showPreviousYearOverlay={showPreviousYearOverlay}
            setShowPreviousYearOverlay={setShowPreviousYearOverlay}
            showPreviousYearFunding={showPreviousYearFunding}
            setShowPreviousYearFunding={setShowPreviousYearFunding}
            showPreviousYearForm={showPreviousYearForm}
            setShowPreviousYearForm={setShowPreviousYearForm}
            showPreviousYearMethod={showPreviousYearMethod}
            setShowPreviousYearMethod={setShowPreviousYearMethod}
          />
        </>
      )}

      <footer className="dashboard-footer">
        <label className="theme-switcher">
          <Palette size={14} aria-hidden="true" />
          <select value={theme} onChange={(event) => setTheme(event.target.value)} aria-label="Выбор темы оформления">
            {THEME_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </footer>
    </main>
  )
}
