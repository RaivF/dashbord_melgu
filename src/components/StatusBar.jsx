import { RefreshCw, Wifi, WifiOff } from 'lucide-react'

export default function StatusBar({ loading, error, lastUpdated, source }) {
  const isDemo = source === 'mock'

  return (
    <div className={`status-bar ${error ? 'status-bar--error' : ''}`}>
      <div className="status-bar__item">
        {error ? <WifiOff size={20} /> : <Wifi size={20} />}
        <span>{error ? 'Нет связи с backend / 1С' : isDemo ? 'Демо-данные' : 'Подключено к 1С'}</span>
      </div>
      <div className="status-bar__item">
        <RefreshCw size={20} className={loading ? 'spin' : ''} />
        <span>{lastUpdated ? `Обновлено: ${lastUpdated}` : 'Ожидание данных'}</span>
      </div>
    </div>
  )
}
