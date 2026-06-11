import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Award,
  Banknote,
  CalendarDays,
  ChevronDown,
  MousePointerClick,
  Target,
  Users,
} from 'lucide-react'
import DataTable from './DataTable.jsx'
import StatCard from './StatCard.jsx'
import { DateAreaChart, DonutChart, VerticalBarChart } from './ChartCard.jsx'
import { formatNumber, formatPercentDecimal } from '../utils/analytics.js'

const STAT_CARDS = [
  {
    title: 'Всего заявлений',
    getValue: (analytics) => analytics.total,
    getCaption: (_analytics, selectedRange) => `Суммарное количество · ${selectedRange.toLowerCase()}`,
    icon: Users,
    tone: 'blue',
  },
  {
    title: 'К прошлому году',
    getValue: (analytics) => analytics.previousYearComparison.value,
    getCaption: (analytics) => analytics.previousYearComparison.caption,
    icon: CalendarDays,
    tone: 'purple',
  },
  {
    title: 'Бюджетная основа',
    getValue: (analytics) => analytics.budget,
    getCaption: () => 'Заявки на бюджет',
    icon: Award,
    tone: 'green',
  },
  {
    title: 'Договор на платное обучение',
    getValue: (analytics) => analytics.paid,
    getCaption: () => 'Платное обучение',
    icon: Banknote,
    tone: 'amber',
  },
  {
    title: 'Целевой приём',
    getValue: (analytics) => analytics.target,
    getCaption: () => 'Заявки по целевой квоте',
    icon: Target,
    tone: 'pink',
  },
  {
    title: 'Онлайн-каналы',
    getValue: (analytics) => analytics.web + analytics.online,
    getCaption: () => 'Суперсервис',
    icon: MousePointerClick,
    tone: 'cyan',
  },
]

const KCP_SORT_OPTIONS = [
  { value: 'fillAsc', label: 'Заполненность ↑' },
  { value: 'fillDesc', label: 'Заполненность ↓' },
  { value: 'nameAsc', label: 'А-Я' },
  { value: 'planDesc', label: 'КЦП ↓' },
]

function sortKcpDirections(directions, sortMode) {
  const sorted = [...directions]

  if (sortMode === 'fillDesc') {
    return sorted.sort((a, b) => b.percent - a.percent || a.name.localeCompare(b.name, 'ru'))
  }

  if (sortMode === 'nameAsc') {
    return sorted.sort((a, b) => a.name.localeCompare(b.name, 'ru') || String(a.code || '').localeCompare(String(b.code || ''), 'ru'))
  }

  if (sortMode === 'planDesc') {
    return sorted.sort((a, b) => b.plan - a.plan || a.name.localeCompare(b.name, 'ru'))
  }

  return sorted.sort((a, b) => a.percent - b.percent || a.name.localeCompare(b.name, 'ru'))
}

function KcpProgress({ data, loading }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [sortMode, setSortMode] = useState('fillAsc')
  const [searchValue, setSearchValue] = useState('')
  const listRef = useRef(null)
  const hasPlan = data?.hasPlan
  const fillPercent = hasPlan ? data.fillPercent : 0
  const directions = data?.directions || []
  const hasDirections = directions.length > 0
  const searchQuery = searchValue.trim().toLowerCase()
  const filteredDirections = useMemo(() => {
    if (!searchQuery) return directions

    return directions.filter((item) => {
      const code = String(item.code || '').toLowerCase()
      const name = String(item.name || '').toLowerCase()

      return code.includes(searchQuery) || name.includes(searchQuery)
    })
  }, [directions, searchQuery])
  const sortedDirections = useMemo(() => sortKcpDirections(filteredDirections, sortMode), [filteredDirections, sortMode])
  const deltaLabel = data?.overflow > 0
    ? `превышение на ${formatNumber(data.overflow)}`
    : `осталось ${formatNumber(data?.remaining || 0)}`

  useEffect(() => {
    if (isExpanded) {
      listRef.current?.scrollTo({ top: 0 })
    }
  }, [isExpanded, sortMode, searchQuery])

  return (
    <section className={`kcp-panel${isExpanded ? ' kcp-panel--expanded' : ''}`} aria-busy={loading}>
      <div className="kcp-panel__header">
        <div>
          <h2>КЦП</h2>
          <p>Контрольные цифры приёма</p>
        </div>
        <div className="kcp-panel__header-actions">
          <button
            className="kcp-panel__toggle"
            type="button"
            aria-expanded={isExpanded}
            disabled={!hasDirections}
            onClick={() => setIsExpanded((value) => !value)}
          >
            <ChevronDown size={18} aria-hidden="true" />
            Детализация
          </button>
          <strong>{hasPlan ? formatPercentDecimal(data.percent) : 'Нет данных'}</strong>
        </div>
      </div>

      <div className="kcp-panel__track" aria-label="Заполнение контрольных цифр приёма">
        <span className="kcp-panel__fill" style={{ width: `${fillPercent}%` }} />
      </div>

      <div className="kcp-panel__meta">
        <span>
          <strong>{formatNumber(data?.current || 0)}</strong>
          подано
        </span>
        <span>
          <strong>{hasPlan ? formatNumber(data.plan) : '—'}</strong>
          КЦП
        </span>
        <span>
          <strong>{hasPlan ? deltaLabel : 'нет плана'}</strong>
          баланс
        </span>
      </div>

      {isExpanded && hasDirections ? (
        <div className="kcp-panel__details">
          <div className="kcp-panel__details-toolbar">
            <span>{formatNumber(sortedDirections.length)} из {formatNumber(directions.length)} направлений</span>
            <label className="kcp-panel__search">
              <input
                type="search"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Поиск по коду или названию"
                aria-label="Поиск направления по коду или названию"
              />
            </label>
            <div className="kcp-panel__sort" role="group" aria-label="Сортировка направлений КЦП">
              {KCP_SORT_OPTIONS.map((option) => (
                <button
                  className={`kcp-panel__sort-button${sortMode === option.value ? ' kcp-panel__sort-button--active' : ''}`}
                  key={option.value}
                  type="button"
                  onClick={() => setSortMode(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="kcp-panel__direction-list" ref={listRef}>
            {sortedDirections.length ? sortedDirections.map((item) => {
              const itemDeltaLabel = item.overflow > 0
                ? `+${formatNumber(item.overflow)}`
                : formatNumber(item.remaining)

              return (
                <article className="kcp-panel__direction" key={`${item.code || ''}::${item.name}`}>
                  <div className="kcp-panel__direction-main">
                    <span>{item.name}</span>
                    <small>{item.code ? `Код: ${item.code}` : 'Направление'}</small>
                  </div>
                  <div className="kcp-panel__direction-progress">
                    <div className="kcp-panel__direction-track">
                      <span style={{ width: `${item.fillPercent}%` }} />
                    </div>
                    <strong>{formatPercentDecimal(item.percent)}</strong>
                  </div>
                  <div className="kcp-panel__direction-numbers">
                    <span>
                      <strong>{formatNumber(item.current)}</strong>
                      подано
                    </span>
                    <span>
                      <strong>{formatNumber(item.plan)}</strong>
                      КЦП
                    </span>
                    <span>
                      <strong>{itemDeltaLabel}</strong>
                      {item.overflow > 0 ? 'сверх' : 'осталось'}
                    </span>
                  </div>
                </article>
              )
            }) : (
              <div className="kcp-panel__empty">
                Направления не найдены
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default function DashboardContent({
  analytics,
  loading,
  selectedRange,
  showPreviousYearOverlay,
  setShowPreviousYearOverlay,
  showPreviousYearFunding,
  setShowPreviousYearFunding,
  showPreviousYearForm,
  setShowPreviousYearForm,
  showPreviousYearMethod,
  setShowPreviousYearMethod,
}) {
  return (
    <>
      <section className="stats-grid">
        {STAT_CARDS.map((card) => (
          <StatCard
            key={card.title}
            title={card.title}
            value={card.getValue(analytics)}
            caption={card.getCaption(analytics, selectedRange)}
            icon={card.icon}
            tone={card.tone}
          />
        ))}
      </section>

      {/* КЦП показывает итог по всей приёмной кампании и намеренно не синхронизируется с выбранным периодом. */}
      <KcpProgress data={analytics.kcp} loading={loading} />

      <section className="dashboard-grid dashboard-grid--top">
        <DateAreaChart
          data={analytics.byDate}
          loading={loading}
          previousYearData={analytics.previousYearByDate}
          showPreviousYear={showPreviousYearOverlay}
          onTogglePreviousYear={setShowPreviousYearOverlay}
        />
        <DonutChart
          title="Основание обучения"
          subtitle="Бюджет, платное обучение и целевой приём"
          data={analytics.byFunding}
          loading={loading}
          previousYearData={analytics.previousYearByFunding}
          showPreviousYear={showPreviousYearFunding}
          onTogglePreviousYear={setShowPreviousYearFunding}
        />
      </section>

      <section className="dashboard-grid dashboard-grid--middle">
        <VerticalBarChart
          title="Форма обучения"
          subtitle="Очная, заочная, очно-заочная"
          data={analytics.byForm}
          loading={loading}
          previousYearData={analytics.previousYearByForm}
          showPreviousYear={showPreviousYearForm}
          onTogglePreviousYear={setShowPreviousYearForm}
        />
        <VerticalBarChart
          title="Способ подачи"
          subtitle="Лично, почта, суперсервис"
          data={analytics.byMethod}
          loading={loading}
          previousYearData={analytics.previousYearByMethod}
          showPreviousYear={showPreviousYearMethod}
          onTogglePreviousYear={setShowPreviousYearMethod}
        />
        <DataTable title="Уровни образования" subtitle="Количество заявок по уровням" data={analytics.byDegree.slice(0, 7)} loading={loading} />
      </section>

      <section className="dashboard-grid dashboard-grid--bottom">
        <DataTable title="Приоритеты" subtitle="Первые 5 приоритетов по порядку" data={analytics.byPriority} loading={loading} />
        <DataTable title="Первый приоритет по направлениям" subtitle="Количество заявлений на специальность" data={analytics.firstPrioritySpecialties} loading={loading} />
        <DataTable title="Топ 5 самых популярных направлений" subtitle="Специальности с наибольшим количеством заявок" data={analytics.topSpecialties} loading={loading} />
        <DataTable title="Топ 5 самых невостребованных направлений" subtitle="Специальности с наименьшим количеством заявок" data={analytics.bottomSpecialties} loading={loading} />
      </section>
    </>
  )
}
