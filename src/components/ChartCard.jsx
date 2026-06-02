import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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

  return (
    <div className="chart-tooltip">
      {tooltipLabel && <div className="chart-tooltip__label">{tooltipLabel}</div>}
      {tooltipPayload?.isMissing ? (
        <div className="chart-tooltip__item chart-tooltip__item--muted">
          <span>Нет данных за дату</span>
          <strong>0</strong>
        </div>
      ) : (
        payload.map((item) => (
          <div className="chart-tooltip__item" key={`${item.name}-${item.value}`}>
            <span>{item.name || item.payload?.name || 'Заявок'}</span>
            <strong>{formatNumber(item.value)}</strong>
          </div>
        ))
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

export function DateAreaChart({ data, loading = false }) {
  return (
    <Panel title="Динамика заявок по датам" subtitle="Сумма всех актуальных заявок за выбранный диапазон. Серые точки — даты без данных." className="panel--wide">
      <div className="chart chart--large" aria-busy={loading}>
        {loading ? (
          <ChartLoading variant="area" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 14, right: 24, left: 0, bottom: 8 }}>
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

export function VerticalBarChart({ title, subtitle, data, loading = false }) {
  return (
    <Panel title={title} subtitle={subtitle}>
      <div className="chart chart--medium" aria-busy={loading}>
        {loading ? (
          <ChartLoading variant="bar" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--chart-tick)', fontSize: 13 }} tickLine={false} axisLine={false} interval={0} />
              <YAxis tick={{ fill: 'var(--chart-tick)', fontSize: 14 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={cursorProps} />
              <Bar dataKey="quantity" name="Заявок" radius={[12, 12, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Panel>
  )
}

export function DonutChart({ title, subtitle, data, loading = false }) {
  const total = data.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <Panel title={title} subtitle={subtitle}>
      <div className="donut-layout" aria-busy={loading}>
        {loading ? (
          <ChartLoading variant="donut" />
        ) : (
          <>
            <div className="chart chart--donut">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data} dataKey="quantity" nameKey="name" innerRadius="58%" outerRadius="84%" paddingAngle={3}>
                    {data.map((entry, index) => (
                      <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="legend-list">
              {data.map((item, index) => (
                <div className="legend-list__item" key={item.name}>
                  <span className="legend-list__dot" style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} />
                  <span>{item.name}</span>
                  <strong>{formatPercentDecimal(total ? (item.quantity / total) * 100 : 0)}</strong>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Panel>
  )
}
