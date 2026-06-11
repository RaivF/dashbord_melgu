import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import DatePickerModule, { registerLocale } from 'react-datepicker'
import { ru } from 'date-fns/locale/ru'
import { CalendarDays, ChevronDown, RotateCcw } from 'lucide-react'
import {
  CALENDAR_HINTS,
  CALENDAR_LABELS,
  RANGE_OPTIONS,
  getDatePickerFormat,
} from '../config/dashboard.js'
import { isDateWithinRange, isSameCalendarDay, toPickerDate } from '../utils/date.js'

const DatePicker = DatePickerModule.default || DatePickerModule

registerLocale('ru', ru)

const CalendarInput = forwardRef(function CalendarInput({ value, onClick, disabled }, ref) {
  return (
    <button className="calendar-button" type="button" onClick={onClick} ref={ref} disabled={disabled}>
      <CalendarDays size={22} />
      <span>{value || 'Выберите дату'}</span>
      <ChevronDown size={20} />
    </button>
  )
})

export default function PeriodControls({
  analytics,
  campaignYear,
  loading,
  range,
  selectedDate,
  selectedRange,
  setCampaignYear,
  setRange,
  setSelectedDate,
}) {
  const periodMenuRef = useRef(null)
  const [periodMenuOpen, setPeriodMenuOpen] = useState(false)
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

  const handleCampaignYearChange = (nextYear) => {
    if (loading) return
    setCampaignYear(nextYear)
  }

  return (
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
  )
}
