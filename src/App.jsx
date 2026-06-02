import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import DatePickerModule, { registerLocale } from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { ru } from 'date-fns/locale/ru'
import {
  Award,
  Banknote,
  CalendarDays,
  ChevronDown,
  MousePointerClick,
  Palette,
  RefreshCw,
  RotateCcw,
  Target,
  Users,
} from 'lucide-react'
import { getApplicantsStatistics } from './api/client.js'
import { buildAnalytics } from './utils/analytics.js'
import StatCard from './components/StatCard.jsx'
import StatusBar from './components/StatusBar.jsx'
import { DateAreaChart, DonutChart, VerticalBarChart } from './components/ChartCard.jsx'
import DataTable from './components/DataTable.jsx'

const DatePicker = DatePickerModule.default || DatePickerModule

registerLocale('ru', ru)

const AUTO_REFRESH_MS = 30 * 60 * 1000
const THEME_VERSION = 'light-primary-v1'

const THEME_OPTIONS = [
  { value: 'light', label: 'Светлая' },
  { value: 'night', label: 'Ночь' },
  { value: 'dark', label: 'Тёмная' },
]

const RANGE_OPTIONS = [
  { value: 'day', label: 'День' },
  { value: 'twoDays', label: '2 дня' },
  { value: 'week', label: 'Неделя' },
  { value: 'twoWeeks', label: '2 недели' },
  { value: 'month', label: 'Месяц' },
  { value: 'year', label: 'Год' },
]

const CALENDAR_LABELS = {
  day: 'Выбрать день',
  twoDays: 'Дата окончания',
  week: 'Выбрать неделю',
  twoWeeks: 'Дата окончания',
  month: 'Выбрать месяц',
  year: 'Выбрать год',
}

const CALENDAR_HINTS = {
  day: 'Показываются заявки только за выбранный день. График строится с шагом 30 минут.',
  twoDays: 'Показываются 2 дня, включая выбранную дату. График строится с шагом 30 минут.',
  week: 'Показывается календарная неделя с понедельника по воскресенье.',
  twoWeeks: 'Показываются 14 дней, включая выбранную дату.',
  month: 'Показывается выбранный календарный месяц.',
  year: 'Показывается выбранный календарный год.',
}

function getDefaultPeriod() {
  return localStorage.getItem('dashboard-period') || '2025-01'
}

function getCampaignYear(periodValue) {
  const fallbackYear = new Date().getFullYear()
  const year = Number.parseInt(String(periodValue || '').slice(0, 4), 10)
  return Number.isFinite(year) ? year : fallbackYear
}

function toCampaignPeriod(year) {
  return `${year}-01`
}

function getDefaultRange() {
  const savedRange = localStorage.getItem('dashboard-range')
  return RANGE_OPTIONS.some((option) => option.value === savedRange) ? savedRange : 'year'
}

function getDefaultTheme() {
  const savedTheme = localStorage.getItem('dashboard-theme')
  const savedThemeVersion = localStorage.getItem('dashboard-theme-version')
  const legacyPrefix = ['app', 'le'].join('')
  if (savedTheme === `${legacyPrefix}-light`) return 'light'
  if (savedTheme === `${legacyPrefix}-dark`) return 'dark'
  if (savedTheme === 'night' && savedThemeVersion !== THEME_VERSION) {
    localStorage.setItem('dashboard-theme-version', THEME_VERSION)
    return 'light'
  }
  return THEME_OPTIONS.some((option) => option.value === savedTheme) ? savedTheme : 'light'
}

function getDefaultSelectedDate() {
  return null
}

function formatTime(date) {
  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function getDatePickerFormat(range) {
  if (range === 'month') return 'MM.yyyy'
  if (range === 'year') return 'yyyy'
  return 'dd.MM.yyyy'
}

function toPickerDate(date) {
  if (!date || Number.isNaN(date.getTime?.())) return null
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

function isSameCalendarDay(left, right) {
  if (!left || !right) return false
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
}

function isDateWithinRange(date, start, end) {
  if (!date || !start || !end) return false
  const current = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const from = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()
  const to = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime()
  return current >= from && current <= to
}

const CalendarInput = forwardRef(function CalendarInput({ value, onClick, disabled }, ref) {
  return (
    <button className="calendar-button" type="button" onClick={onClick} ref={ref} disabled={disabled}>
      <CalendarDays size={22} />
      <span>{value || 'Выберите дату'}</span>
      <ChevronDown size={20} />
    </button>
  )
})

export default function App() {
  const [period, setPeriod] = useState(getDefaultPeriod)
  const [range, setRange] = useState(getDefaultRange)
  const [theme, setTheme] = useState(getDefaultTheme)
  const [selectedDate, setSelectedDate] = useState(getDefaultSelectedDate)
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const abortRef = useRef(null)
  const periodMenuRef = useRef(null)
  const [periodMenuOpen, setPeriodMenuOpen] = useState(false)

  const analytics = useMemo(() => buildAnalytics(response, range, selectedDate), [response, range, selectedDate])
  const activeCalendarDate = selectedDate || toPickerDate(analytics.rangeEnd) || null
  const calendarRangeStart = useMemo(() => toPickerDate(analytics.rangeStart), [analytics.rangeStart])
  const calendarRangeEnd = useMemo(() => toPickerDate(analytics.rangeEnd), [analytics.rangeEnd])

  const getCalendarDayClassName = useCallback((date) => {
    if (!calendarRangeStart || !calendarRangeEnd) return undefined
    if (!isDateWithinRange(date, calendarRangeStart, calendarRangeEnd)) return undefined

    const isStart = isSameCalendarDay(date, calendarRangeStart)
    const isEnd = isSameCalendarDay(date, calendarRangeEnd)

    if (isStart && isEnd) return 'dashboard-calendar__day--range-single'
    if (isStart) return 'dashboard-calendar__day--range-start'
    if (isEnd) return 'dashboard-calendar__day--range-end'
    return 'dashboard-calendar__day--in-range'
  }, [calendarRangeStart, calendarRangeEnd])

  const fetchData = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)

    try {
      const data = await getApplicantsStatistics(period, controller.signal)
      setResponse(data)
      setLastUpdated(formatTime(new Date()))
      localStorage.setItem('dashboard-period', period)
    } catch (requestError) {
      if (requestError.name !== 'CanceledError') {
        setError({
          message: requestError.response?.data?.message || requestError.message || 'Ошибка загрузки данных',
          status: requestError.response?.status,
        })
      }
    } finally {
      setLoading(false)
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

  useEffect(() => {
    localStorage.setItem('dashboard-range', range)
  }, [range])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('dashboard-theme', theme)
    localStorage.setItem('dashboard-theme-version', THEME_VERSION)
  }, [theme])

  useEffect(() => {
    localStorage.removeItem('dashboard-selected-date')
  }, [])

  useEffect(() => {
    if (!periodMenuOpen) return undefined

    function handlePointerDown(event) {
      const target = event.target
      if (target.closest?.('.dashboard-calendar-popper')) return
      if (!periodMenuRef.current?.contains(target)) setPeriodMenuOpen(false)
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') setPeriodMenuOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [periodMenuOpen])

  const selectedRange = RANGE_OPTIONS.find((option) => option.value === range)?.label || 'Всё'
  const campaignYear = getCampaignYear(period)

  const handleCampaignYearChange = (nextYear) => {
    if (loading) return
    const safeYear = Math.min(2099, Math.max(2000, nextYear))
    setPeriod(toCampaignPeriod(safeYear))
    setSelectedDate(null)
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div className="hero__content">
          <h1>Мониторинг приёмной кампании</h1>
        </div>

        <div className="hero__controls">
          <button className="refresh-button" type="button" onClick={fetchData} disabled={loading}>
            <RefreshCw size={24} className={loading ? 'spin' : ''} />
            {loading ? 'Загрузка' : 'Обновить'}
          </button>
        </div>
      </header>

      <section className="range-panel" aria-label="Настройки периода отображения">
        <div className="range-panel__summary">
          <div>
            <span>Отображение данных</span>
            <strong>{selectedRange}</strong>
          </div>
          <div className="range-panel__dates">
            <span>Период выборки</span>
            <strong>{analytics.rangeText}</strong>
          </div>
        </div>

        <div className="period-menu" ref={periodMenuRef}>
          <button
            className={periodMenuOpen ? 'period-menu__button period-menu__button--open' : 'period-menu__button'}
            type="button"
            onClick={() => setPeriodMenuOpen((isOpen) => !isOpen)}
            aria-expanded={periodMenuOpen}
            aria-controls="period-settings-panel"
            disabled={loading}
          >
            <CalendarDays size={24} />
            <span>Отображение периода</span>
            <ChevronDown size={22} />
          </button>

          {periodMenuOpen && (
            <div className="period-menu__panel" id="period-settings-panel">
              <div className="period-menu__header">
                <div>
                  <span>Настройки периода</span>
                  <strong>{selectedRange}</strong>
                </div>
                <button className="period-menu__close" type="button" onClick={() => setPeriodMenuOpen(false)}>
                  Закрыть
                </button>
              </div>

              <div className="campaign-year-control">
                <div className="campaign-year-control__text">
                  <span>Год приёмной кампании</span>
                  <strong>{campaignYear}</strong>
                </div>
                <div className="campaign-year-control__actions">
                  <button
                    className="campaign-year-control__button"
                    type="button"
                    onClick={() => handleCampaignYearChange(campaignYear - 1)}
                    disabled={loading || campaignYear <= 2000}
                    aria-label="Предыдущий год приёмной кампании"
                  >
                    -
                  </button>
                  <button
                    className="campaign-year-control__button"
                    type="button"
                    onClick={() => handleCampaignYearChange(campaignYear + 1)}
                    disabled={loading || campaignYear >= 2099}
                    aria-label="Следующий год приёмной кампании"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="range-tabs range-tabs--in-menu">
                {RANGE_OPTIONS.map((option) => (
                  <button
                    className={option.value === range ? 'range-tab range-tab--active' : 'range-tab'}
                    key={option.value}
                    type="button"
                    disabled={loading}
                    onClick={() => setRange(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="period-menu__current">
                <span>Период выборки</span>
                <strong>{analytics.rangeText}</strong>
              </div>

              <div className="calendar-control">
                <div className="calendar-control__topline">
                  <span>{CALENDAR_LABELS[range] || 'Выбрать дату'}</span>
                  <button className="calendar-reset" type="button" onClick={() => setSelectedDate(null)} disabled={loading}>
                    <RotateCcw size={16} />
                    к последней дате
                  </button>
                </div>
                <DatePicker
                  selected={activeCalendarDate}
                  onChange={(date) => setSelectedDate(date)}
                  dateFormat={getDatePickerFormat(range)}
                  showMonthYearPicker={range === 'month'}
                  showYearPicker={range === 'year'}
                  showWeekNumbers={range === 'week'}
                  locale="ru"
                  calendarStartDay={1}
                  weekLabel="№"
                  dayClassName={getCalendarDayClassName}
                  showPopperArrow={false}
                  popperPlacement="bottom-end"
                  popperModifiers={[
                    { name: 'offset', options: { offset: [0, 14] } },
                    { name: 'preventOverflow', options: { rootBoundary: 'viewport', padding: 24 } },
                    { name: 'flip', options: { fallbackPlacements: ['top-end', 'bottom-start', 'top-start'] } },
                  ]}
                  customInput={<CalendarInput disabled={loading} />}
                  calendarClassName="dashboard-calendar"
                  popperClassName="dashboard-calendar-popper"
                  wrapperClassName="dashboard-calendar-wrapper"
                  disabled={loading}
                />
                <small>{CALENDAR_HINTS[range]}</small>
              </div>
            </div>
          )}
        </div>
      </section>

      <StatusBar loading={loading} error={error} lastUpdated={lastUpdated} source={analytics.source} />

      {error && (
        <section className="error-box">
          <strong>Ошибка загрузки данных</strong>
          <span>{error.status ? `HTTP ${error.status}: ` : ''}{error.message}</span>
        </section>
      )}

      <section className="stats-grid">
        <StatCard title="Всего заявок" value={analytics.total} caption={`Суммарное количество · ${selectedRange.toLowerCase()}`} icon={Users} tone="blue" />
        <StatCard title="К прошлому году" value={analytics.previousYearComparison.value} caption={analytics.previousYearComparison.caption} icon={CalendarDays} tone="purple" />
        <StatCard title="Бюджетная основа" value={analytics.budget} caption="Заявки на бюджет" icon={Award} tone="green" />
        <StatCard title="Договор на платное обучение" value={analytics.paid} caption="Платное обучение" icon={Banknote} tone="amber" />
        <StatCard title="Целевой приём" value={analytics.target} caption="Заявки по целевой квоте" icon={Target} tone="pink" />
        <StatCard title="Онлайн-каналы" value={analytics.web + analytics.online} caption="Веб + суперсервис" icon={MousePointerClick} tone="cyan" />
      </section>

      <section className="dashboard-grid dashboard-grid--top">
        <DateAreaChart data={analytics.byDate} loading={loading} />
        <DonutChart title="Основание обучения" subtitle="Бюджет, платное обучение и целевой приём" data={analytics.byFunding} loading={loading} />
      </section>

      <section className="dashboard-grid dashboard-grid--middle">
        <VerticalBarChart title="Форма обучения" subtitle="Очная, заочная, очно-заочная" data={analytics.byForm} loading={loading} />
        <VerticalBarChart title="Способ подачи" subtitle="Лично, веб, почта, суперсервис" data={analytics.byMethod} loading={loading} />
        <DataTable title="Уровни образования" subtitle="Количество заявок по уровням" data={analytics.byDegree.slice(0, 7)} loading={loading} />
      </section>

      <section className="dashboard-grid dashboard-grid--bottom">
        <DataTable title="Приоритеты" subtitle="Первые 5 приоритетов по порядку" data={analytics.byPriority} loading={loading} />
        <DataTable title="Топ 5 самых популярных направлений" subtitle="Специальности с наибольшим количеством заявок" data={analytics.topSpecialties} loading={loading} />
        <DataTable title="Топ 5 самых невостребованных направлений" subtitle="Специальности с наименьшим количеством заявок" data={analytics.bottomSpecialties} loading={loading} />
      </section>

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
