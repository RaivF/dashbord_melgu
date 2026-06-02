import { formatNumber } from '../utils/analytics.js'

export default function StatCard({ title, value, caption, icon: Icon, tone = 'blue', suffix = '' }) {
  return (
    <article className={`stat-card stat-card--${tone}`}>
      <div className="stat-card__icon">{Icon && <Icon size={34} strokeWidth={2.2} />}</div>
      <div className="stat-card__body">
        <p className="stat-card__title">{title}</p>
        <div className="stat-card__value">
          {typeof value === 'number' ? formatNumber(value) : value}
          {suffix && <span>{suffix}</span>}
        </div>
        {caption && <p className="stat-card__caption">{caption}</p>}
      </div>
    </article>
  )
}
