import { formatNumber } from '../utils/analytics.js'
import Panel from './Panel.jsx'

function TableSkeleton() {
  return (
    <div className="table-loading" aria-label="Загрузка таблицы">
      {Array.from({ length: 5 }).map((_, index) => (
        <div className="table-loading__row" key={index}>
          <span className="table-loading__rank" />
          <span className="table-loading__text">
            <span />
            <small />
          </span>
          <strong />
        </div>
      ))}
    </div>
  )
}

export default function DataTable({ title, subtitle, data, loading = false }) {
  const rows = Array.isArray(data) ? data : []

  return (
    <Panel title={title} subtitle={subtitle} className="panel--table">
      {loading ? (
        <TableSkeleton />
      ) : (
        <div className="table-list">
          {rows.length === 0 && <div className="table-list__empty">Нет данных для отображения</div>}

          {rows.map((item, index) => (
            <div className="table-list__row" key={`${item.name}-${item.caption || ''}`}>
              <span className="table-list__rank">{index + 1}</span>
              <span className="table-list__text">
                <span className="table-list__name">{item.name}</span>
                {item.caption && <span className="table-list__caption">{item.caption}</span>}
              </span>
              <strong>{formatNumber(item.quantity)}</strong>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}
