import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import Panel from './Panel.jsx'
import { formatNumber, formatPercentDecimal } from '../utils/analytics.js'

const CHART_COLORS = ['var(--blue)', 'var(--purple)', 'var(--green)', 'var(--amber)', 'var(--pink)', '#60a5fa', '#f472b6']

const cursorProps = {
  fill: 'var(--chart-cursor)',
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  const tooltipPayload = payload[0]?.payload
  const tooltipLabel = tooltipPayload?.fullLabel || label
  const isMissingPayload = (item) => {
    if (item.dataKey === 'previousYearQuantity') return item.payload?.previousYearIsMissing
    return item.payload?.isMissing
  }

  return (
    <div className="chart-tooltip">
      {tooltipLabel && <div className="chart-tooltip__label">{tooltipLabel}</div>}
      {payload.map((item) => {
        const isMissing = isMissingPayload(item)

        return (
          <div className={`chart-tooltip__item${isMissing ? ' chart-tooltip__item--muted' : ''}`} key={`${item.dataKey}-${item.name}`}>
            <span>{item.name || item.payload?.name || 'Заявок'}</span>
            <strong>{isMissing ? 'Нет данных' : formatNumber(item.value)}</strong>
          </div>
        )
      })}
      {tooltipPayload?.previousFullLabel && (
        <div className="chart-tooltip__note">Прошлый год: {tooltipPayload.previousFullLabel}</div>
      )}
    </div>
  )
}

function MissingDateDot({ cx, cy, payload }) {
  if (!payload?.isMissing || cx === undefined || cy === undefined) return null

  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill="var(--chart-missing-fill)" stroke="var(--chart-missing-stroke)" strokeWidth={2} />
      <circle cx={cx} cy={cy} r={2} fill="var(--chart-missing-stroke)" />
    </g>
  )
}

function ActiveDateDot({ cx, cy, payload }) {
  if (cx === undefined || cy === undefined) return null

  if (payload?.isMissing) {
    return <circle cx={cx} cy={cy} r={8} fill="var(--chart-missing-fill)" stroke="var(--chart-active-stroke)" strokeWidth={3} />
  }

  return <circle cx={cx} cy={cy} r={7} fill="var(--blue)" stroke="var(--chart-active-stroke)" strokeWidth={3} />
}

function PreviousYearMissingDot({ cx, cy, payload }) {
  if (!payload?.previousYearIsMissing || cx === undefined || cy === undefined) return null

  return (
    <g>
      <circle cx={cx} cy={cy} r={4} fill="var(--chart-missing-fill)" stroke="var(--chart-previous-year)" strokeWidth={2} />
      <circle cx={cx} cy={cy} r={1.8} fill="var(--chart-previous-year)" />
    </g>
  )
}

function ActivePreviousYearDot({ cx, cy, payload }) {
  if (cx === undefined || cy === undefined) return null

  if (payload?.previousYearIsMissing) {
    return <circle cx={cx} cy={cy} r={7} fill="var(--chart-missing-fill)" stroke="var(--chart-previous-year)" strokeWidth={3} />
  }

  return <circle cx={cx} cy={cy} r={6} fill="var(--chart-previous-year)" stroke="var(--chart-active-stroke)" strokeWidth={3} />
}

function ChartLoading({ variant = 'bar' }) {
  const bars = [68, 38, 82, 54, 44, 72, 58]

  if (variant === 'donut') {
    return (
      <div className="chart-loading chart-loading--donut" aria-label="Загрузка диаграммы">
        <div className="chart-loading__ring" />
        <div className="chart-loading__legend">
          <span />
          <span />
          <span />
        </div>
      </div>
    )
  }

  if (variant === 'area') {
    return (
      <div className="chart-loading chart-loading--area" aria-label="Загрузка графика">
        <div className="chart-loading__grid" />
        <div className="chart-loading__line" />
        <div className="chart-loading__glow" />
      </div>
    )
  }

  return (
    <div className="chart-loading chart-loading--bar" aria-label="Загрузка графика">
      <div className="chart-loading__grid" />
      <div className="chart-loading__bars">
        {bars.map((height, index) => (
          <span key={index} style={{ height: `${height}%` }} />
        ))}
      </div>
    </div>
  )
}

export function DateAreaChart({
  data,
  loading = false,
  previousYearData = [],
  showPreviousYear = true,
  onTogglePreviousYear,
}) {
  const hasPreviousYearData = previousYearData.some((item) => !item.isMissing)
  const previousYearEnabled = showPreviousYear && hasPreviousYearData
  const chartData = data.map((item, index) => {
    const previous = previousYearData[index]

    return {
      ...item,
      previousYearQuantity: previousYearEnabled ? previous?.quantity || 0 : undefined,
      previousYearIsMissing: previousYearEnabled ? previous?.isMissing ?? true : false,
      previousFullLabel: previousYearEnabled ? previous?.previousFullLabel : '',
    }
  })

  const action = (
    <label className={`chart-switch${!hasPreviousYearData ? ' chart-switch--disabled' : ''}`} title="Показать данные за тот же период прошлого года">
      <span>Сравнение с прошлым годом</span>
      <input
        type="checkbox"
        role="switch"
        checked={showPreviousYear && hasPreviousYearData}
        disabled={!hasPreviousYearData || loading}
        onChange={(event) => onTogglePreviousYear?.(event.target.checked)}
      />
      <span className="chart-switch__track" aria-hidden="true" />
    </label>
  )

  return (
    <Panel title="Динамика заявок по датам" subtitle="Сумма всех актуальных заявок за выбранный диапазон. Серые точки — даты без данных." className="panel--wide" action={action}>
      <div className="chart chart--large" aria-busy={loading}>
        {loading ? (
          <ChartLoading variant="area" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 14, right: 24, left: 0, bottom: 8 }}>
              <defs>
                <linearGradient id="quantityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--blue)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--blue)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="label" tick={{ fill: 'var(--chart-tick)', fontSize: 16 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: 'var(--chart-tick)', fontSize: 16 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={cursorProps} />
              {previousYearEnabled && (
                <Area
                  type="monotone"
                  dataKey="previousYearQuantity"
                  name="Прошлый год"
                  stroke="var(--chart-previous-year)"
                  strokeWidth={3}
                  strokeDasharray="8 8"
                  fill="transparent"
                  dot={<PreviousYearMissingDot />}
                  activeDot={<ActivePreviousYearDot />}
                />
              )}
              <Area
                type="monotone"
                dataKey="quantity"
                name="Заявок"
                stroke="var(--blue)"
                strokeWidth={4}
                fill="url(#quantityGradient)"
                dot={<MissingDateDot />}
                activeDot={<ActiveDateDot />}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Panel>
  )
}

function buildBarComparisonData(data, previousYearData) {
  const currentByName = new Map(data.map((item) => [item.name, item.quantity]))
  const previousByName = new Map(previousYearData.map((item) => [item.name, item.quantity]))
  const names = [
    ...data.map((item) => item.name),
    ...previousYearData.map((item) => item.name).filter((name) => !currentByName.has(name)),
  ]

  return names.map((name) => ({
    name,
    quantity: currentByName.get(name) || 0,
    previousYearQuantity: previousByName.get(name) || 0,
  }))
}

export function VerticalBarChart({
  title,
  subtitle,
  data,
  loading = false,
  previousYearData = [],
  showPreviousYear = false,
  onTogglePreviousYear,
}) {
  const hasPreviousYearData = previousYearData.some((item) => item.quantity > 0)
  const previousYearEnabled = showPreviousYear && hasPreviousYearData
  const chartData = previousYearEnabled ? buildBarComparisonData(data, previousYearData) : data
  const action = onTogglePreviousYear ? (
    <label className={`chart-switch${!hasPreviousYearData ? ' chart-switch--disabled' : ''}`} title="Показать данные за тот же период прошлого года">
      <span>Сравнение с прошлым годом</span>
      <input
        type="checkbox"
        role="switch"
        checked={showPreviousYear && hasPreviousYearData}
        disabled={!hasPreviousYearData || loading}
        onChange={(event) => onTogglePreviousYear?.(event.target.checked)}
      />
      <span className="chart-switch__track" aria-hidden="true" />
    </label>
  ) : null

  return (
    <Panel title={title} subtitle={subtitle} action={action}>
      <div className="chart chart--medium" aria-busy={loading}>
        {loading ? (
          <ChartLoading variant="bar" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 28, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--chart-tick)', fontSize: 13 }} tickLine={false} axisLine={false} interval={0} />
              <YAxis tick={{ fill: 'var(--chart-tick)', fontSize: 14 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={cursorProps} />
              <Bar dataKey="quantity" name={previousYearEnabled ? 'Текущий период' : 'Заявок'} fill={previousYearEnabled ? 'var(--green)' : undefined} radius={[12, 12, 0, 0]}>
                <LabelList dataKey="quantity" position="top" formatter={formatNumber} className="bar-value-label" />
                {!previousYearEnabled && chartData.map((entry, index) => (
                  <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Bar>
              {previousYearEnabled && (
                <Bar dataKey="previousYearQuantity" name="Прошлый год" fill="var(--chart-previous-year)" radius={[12, 12, 0, 0]}>
                  <LabelList dataKey="previousYearQuantity" position="top" formatter={formatNumber} className="bar-value-label bar-value-label--previous" />
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Panel>
  )
}

function buildDonutRows(data, previousYearData, includePreviousYear) {
  const currentByName = new Map(data.map((item) => [item.name, item.quantity]))
  const previousByName = new Map(previousYearData.map((item) => [item.name, item.quantity]))
  const categoryNames = [
    ...data.map((item) => item.name),
    ...previousYearData.map((item) => item.name).filter((name) => !currentByName.has(name)),
  ]
  const currentTotal = data.reduce((sum, item) => sum + item.quantity, 0)
  const previousTotal = previousYearData.reduce((sum, item) => sum + item.quantity, 0)

  return categoryNames.map((name, index) => {
    const currentQuantity = currentByName.get(name) || 0
    const previousQuantity = includePreviousYear ? previousByName.get(name) || 0 : 0

    return {
      name,
      color: CHART_COLORS[index % CHART_COLORS.length],
      currentQuantity,
      currentPercent: currentTotal ? (currentQuantity / currentTotal) * 100 : 0,
      previousQuantity,
      previousPercent: previousTotal ? (previousQuantity / previousTotal) * 100 : 0,
    }
  })
}

function DonutSection({ data, label = '' }) {
  return (
    <div className="donut-section">
      {label && <div className="donut-section__label">{label}</div>}
      <div className="chart chart--donut">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="quantity" nameKey="name" innerRadius="58%" outerRadius="84%" paddingAngle={3} minAngle={3}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function DonutComparisonLegend({ rows, showPreviousYear }) {
  return (
    <div className={`donut-legend${showPreviousYear ? ' donut-legend--compare' : ''}`} aria-label="Расшифровка диаграммы">
      <div className="donut-legend__header">
        <span>Категория</span>
        <span>Текущий</span>
        {showPreviousYear && <span>Прошлый год</span>}
      </div>
      {rows.map((item) => (
        <div className="donut-legend__row" key={item.name} style={{ '--donut-color': item.color }}>
          <div className="donut-legend__name">
            <span className="legend-list__dot" style={{ background: item.color }} />
            <span>{item.name}</span>
          </div>
          <div className="donut-legend__metric">
            <strong>{formatPercentDecimal(item.currentPercent)}</strong>
            <span>{formatNumber(item.currentQuantity)}</span>
          </div>
          {showPreviousYear && (
            <div className="donut-legend__metric">
              <strong>{formatPercentDecimal(item.previousPercent)}</strong>
              <span>{formatNumber(item.previousQuantity)}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export function DonutChart({
  title,
  subtitle,
  data,
  loading = false,
  previousYearData = [],
  showPreviousYear = false,
  onTogglePreviousYear,
}) {
  const hasPreviousYearData = previousYearData.some((item) => item.quantity > 0)
  const previousYearEnabled = showPreviousYear && hasPreviousYearData
  const rows = buildDonutRows(data, previousYearData, previousYearEnabled)
  const currentChartData = rows.map((item) => ({
    name: item.name,
    quantity: item.currentQuantity,
    color: item.color,
  }))
  const previousChartData = rows.map((item) => ({
    name: item.name,
    quantity: item.previousQuantity,
    color: item.color,
  }))
  const action = onTogglePreviousYear ? (
    <label className={`chart-switch${!hasPreviousYearData ? ' chart-switch--disabled' : ''}`} title="Показать данные за тот же период прошлого года">
      <span>Сравнение с прошлым годом</span>
      <input
        type="checkbox"
        role="switch"
        checked={showPreviousYear && hasPreviousYearData}
        disabled={!hasPreviousYearData || loading}
        onChange={(event) => onTogglePreviousYear?.(event.target.checked)}
      />
      <span className="chart-switch__track" aria-hidden="true" />
    </label>
  ) : null

  return (
    <Panel title={title} subtitle={subtitle} action={action}>
      <div className="donut-stack" aria-busy={loading}>
        {loading ? (
          <ChartLoading variant="donut" />
        ) : (
          <>
            <div className="donut-visuals">
              <DonutSection data={currentChartData} label={previousYearEnabled ? 'Текущий период' : ''} />
              {previousYearEnabled && <DonutSection data={previousChartData} label="Прошлый год" />}
            </div>
            <DonutComparisonLegend rows={rows} showPreviousYear={previousYearEnabled} />
          </>
        )}
      </div>
    </Panel>
  )
}
