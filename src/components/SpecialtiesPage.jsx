import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { SPECIALTY_LEVEL_OPTIONS, parseSpecialtiesMxl } from '../utils/specialties.js'

export default function SpecialtiesPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [level, setLevel] = useState('Все уровни')

  useEffect(() => {
    const controller = new AbortController()

    async function loadSpecialties() {
      setLoading(true)
      setError('')

      try {
        const response = await fetch('/specialties.mxl', { signal: controller.signal })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)

        const buffer = await response.arrayBuffer()
        setRows(parseSpecialtiesMxl(buffer))
      } catch (loadError) {
        if (loadError.name !== 'AbortError') {
          setError(loadError.message || 'Не удалось загрузить таблицу')
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadSpecialties()

    return () => controller.abort()
  }, [])

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return rows.filter((item) => {
      const matchesLevel = level === 'Все уровни' || item.level === level
      const matchesQuery = !normalizedQuery
        || item.code.toLowerCase().includes(normalizedQuery)
        || item.name.toLowerCase().includes(normalizedQuery)

      return matchesLevel && matchesQuery
    })
  }, [level, query, rows])

  const levelCounts = useMemo(() => {
    return rows.reduce((map, item) => {
      map.set(item.level, (map.get(item.level) || 0) + 1)
      return map
    }, new Map())
  }, [rows])

  return (
    <section className="specialties-page">
      <div className="specialties-toolbar">
        <label className="specialties-search">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Найти по коду или названию"
            aria-label="Поиск специальности"
          />
        </label>

        <select className="specialties-select" value={level} onChange={(event) => setLevel(event.target.value)} aria-label="Фильтр по уровню">
          {SPECIALTY_LEVEL_OPTIONS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>

      <div className="specialties-summary" aria-label="Сводка по специальностям">
        <span>
          <strong>{rows.length}</strong>
          Всего
        </span>
        {SPECIALTY_LEVEL_OPTIONS.filter((option) => option !== 'Все уровни').map((option) => (
          <span key={option}>
            <strong>{levelCounts.get(option) || 0}</strong>
            {option}
          </span>
        ))}
      </div>

      <section className="panel specialties-panel">
        <div className="panel__header">
          <div>
            <h2>Справочник специальностей</h2>
            <p>Коды и расшифровки из таблицы 1С</p>
          </div>
        </div>

        {error && (
          <div className="table-list__empty">Ошибка загрузки: {error}</div>
        )}

        {!error && loading && (
          <div className="table-loading" aria-label="Загрузка таблицы специальностей">
            {Array.from({ length: 8 }).map((_, index) => (
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
        )}

        {!error && !loading && (
          <div className="specialties-table-wrap">
            <table className="specialties-table">
              <thead>
                <tr>
                  <th>Код</th>
                  <th>Наименование</th>
                  <th>Уровень</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((item) => (
                  <tr key={`${item.code}-${item.name}`}>
                    <td>{item.code}</td>
                    <td>{item.name}</td>
                    <td>{item.level}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredRows.length === 0 && (
              <div className="table-list__empty">Нет строк по выбранным фильтрам</div>
            )}
          </div>
        )}
      </section>
    </section>
  )
}
