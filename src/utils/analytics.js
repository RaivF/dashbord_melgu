const EMPTY_MARKERS = [
  '<объект не найден>',
  'объект не найден',
  '<object not found>',
  'object not found',
  'null',
  'undefined',
]

const METHOD_ORDER = ['Лично', 'Почта', 'Суперсервис']
const HALF_HOUR_CHART_RANGES = new Set(['day', 'twoDays'])
const CHART_INTERVAL_MINUTES = 30
const EXCLUDED_SPECIALTY_LEVEL_CODES = new Set(['04', '06'])

function normalizeText(value) {
  return String(value).replace(/\u00a0/g, ' ').trim()
}

function containsEmptyMarker(value) {
  const normalized = normalizeText(value).toLowerCase()
  return EMPTY_MARKERS.some((marker) => normalized === marker || normalized.includes(marker))
}

function readObjectValue(value, keys) {
  if (!value || typeof value !== 'object') return undefined

  for (const key of keys) {
    if (value[key] !== null && value[key] !== undefined && value[key] !== '') {
      return value[key]
    }
  }

  return undefined
}

function flattenObjectText(value) {
  if (!value || typeof value !== 'object') return ''

  try {
    return Object.values(value)
      .flatMap((item) => {
        if (item === null || item === undefined) return []
        if (typeof item === 'object') return Object.values(item).filter((nested) => typeof nested !== 'object')
        return [item]
      })
      .map((item) => normalizeText(item))
      .filter(Boolean)
      .join(' ')
  } catch {
    return ''
  }
}

function cleanValue(value) {
  if (value === null || value === undefined || value === '') return 'Не указано'

  if (typeof value === 'object') {
    const objectValue = readObjectValue(value, [
      'name',
      'title',
      'description',
      'presentation',
      'value',
      'Наименование',
      'Представление',
      'Описание',
    ])

    if (objectValue !== undefined) {
      return cleanValue(objectValue)
    }

    const flattened = flattenObjectText(value)
    if (!flattened || containsEmptyMarker(flattened)) return 'Не указано'

    return flattened
  }

  const cleaned = normalizeText(value)
  if (!cleaned || containsEmptyMarker(cleaned)) return 'Не указано'

  return cleaned
}

const DISPLAY_VALUE_MAP = new Map([
  ['Полное возмещение затрат', 'Платное обучение'],
  ['Платная основа', 'Договор на платное обучение'],
  ['Суперсервис "Поступление в вуз онлайн"', 'Суперсервис'],
  ['Суперсервис «Поступление в вуз онлайн»', 'Суперсервис'],
])

function displayValue(value) {
  const cleaned = cleanValue(value)
  return DISPLAY_VALUE_MAP.get(cleaned) || cleaned
}

function numberValue(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function toUtcDateOnly(date) {
  if (!date || Number.isNaN(date.getTime?.())) return null
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
}

function dateKey(value) {
  if (!value) return 'Без даты'

  if (value instanceof Date) {
    const utc = toUtcDateOnly(value)
    return utc ? utc.toISOString().slice(0, 10) : 'Без даты'
  }

  const raw = String(value)
  const directMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  if (directMatch) return directMatch[1]

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return cleanValue(value)
  return parsed.toISOString().slice(0, 10)
}

function parseDateOnly(value) {
  const key = dateKey(value)
  if (!key || key === 'Без даты') return null

  const parsed = new Date(`${key}T00:00:00Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function addUtcDays(date, days) {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + days)
  return result
}

function startOfUtcWeek(date) {
  const day = date.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  return addUtcDays(date, diff)
}

function endOfUtcWeek(date) {
  return addUtcDays(startOfUtcWeek(date), 6)
}

function startOfUtcMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

function endOfUtcMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0))
}

function startOfUtcYear(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
}

function endOfUtcYear(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), 11, 31))
}

function collectDatedItems(items) {
  return items
    .map((item) => ({ item, date: parseDateOnly(item.date) }))
    .filter(({ date }) => date)
}

function getDateBounds(items) {
  const datedItems = collectDatedItems(items)

  if (datedItems.length === 0) {
    return { startDate: null, endDate: null, hasDates: false }
  }

  return datedItems.reduce((bounds, current) => ({
    startDate: current.date < bounds.startDate ? current.date : bounds.startDate,
    endDate: current.date > bounds.endDate ? current.date : bounds.endDate,
    hasDates: true,
  }), {
    startDate: datedItems[0].date,
    endDate: datedItems[0].date,
    hasDates: true,
  })
}

function getAnchorDate(bounds, selectedDate) {
  return toUtcDateOnly(selectedDate) || bounds.endDate || null
}

function getRangeWindow(items, range = 'all', selectedDate = null) {
  const bounds = getDateBounds(items)

  if (!bounds.hasDates) return bounds
  if (range === 'all') return bounds

  const anchor = getAnchorDate(bounds, selectedDate)
  if (!anchor) return bounds

  if (range === 'day') {
    return { startDate: anchor, endDate: anchor, hasDates: true }
  }

  if (range === 'twoDays') {
    return { startDate: addUtcDays(anchor, -1), endDate: anchor, hasDates: true }
  }

  if (range === 'week') {
    return { startDate: startOfUtcWeek(anchor), endDate: endOfUtcWeek(anchor), hasDates: true }
  }

  if (range === 'twoWeeks') {
    return { startDate: addUtcDays(anchor, -13), endDate: anchor, hasDates: true }
  }

  if (range === 'month') {
    return { startDate: startOfUtcMonth(anchor), endDate: endOfUtcMonth(anchor), hasDates: true }
  }

  if (range === 'year') {
    return { startDate: startOfUtcYear(anchor), endDate: endOfUtcYear(anchor), hasDates: true }
  }

  return bounds
}

function filterItemsByRange(items, range = 'all', selectedDate = null) {
  if (range === 'all') return items

  const window = getRangeWindow(items, range, selectedDate)
  if (!window.startDate || !window.endDate) return items

  return items.filter((item) => {
    const itemDate = parseDateOnly(item.date)
    if (!itemDate) return false
    return itemDate >= window.startDate && itemDate <= window.endDate
  })
}

function shortDate(value) {
  if (!value || value === 'Без даты') return value
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return parsed.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  })
}

function fullDate(value) {
  if (!value || value === 'Без даты') return value
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return parsed.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function formatRangeDate(value) {
  if (!value) return ''

  return value.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function formatDateRange(startDate, endDate) {
  if (!startDate || !endDate) return 'Нет данных за выбранный период'

  if (startDate.getTime() === endDate.getTime()) {
    return formatRangeDate(endDate)
  }

  return `${formatRangeDate(startDate)} — ${formatRangeDate(endDate)}`
}

function sortByQuantityDesc(a, b) {
  return b.quantity - a.quantity
}

function groupBy(items, field) {
  const map = new Map()

  items.forEach((item) => {
    const key = displayValue(item[field])
    if (key === 'Не указано') return

    const current = map.get(key) || 0
    map.set(key, current + numberValue(item.quantity))
  })

  return Array.from(map, ([name, quantity]) => ({ name, quantity })).sort(sortByQuantityDesc)
}

function groupByDate(items) {
  const map = new Map()

  items.forEach((item) => {
    const key = dateKey(item.date)
    const current = map.get(key) || 0
    map.set(key, current + numberValue(item.quantity))
  })

  return Array.from(map, ([date, quantity]) => ({
    date,
    label: shortDate(date),
    fullLabel: fullDate(date),
    quantity,
    isMissing: false,
  })).sort((a, b) => a.date.localeCompare(b.date))
}


function parseDateTime(value) {
  if (!value) return null

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  const raw = String(value).trim()
  if (!raw) return null

  const hasExplicitTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw)

  if (!hasExplicitTimezone) {
    const parts = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/)

    if (parts) {
      const [, year, month, day, hour = '0', minute = '0', second = '0'] = parts
      return new Date(Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
      ))
    }
  }

  const parsed = new Date(raw.replace(' ', 'T'))

  return Number.isNaN(parsed.getTime()) ? parseDateOnly(value) : parsed
}

function floorUtcToInterval(date, intervalMinutes = CHART_INTERVAL_MINUTES) {
  const result = new Date(date)
  result.setUTCSeconds(0, 0)
  const minutes = result.getUTCMinutes()
  result.setUTCMinutes(Math.floor(minutes / intervalMinutes) * intervalMinutes)
  return result
}

function addUtcMinutes(date, minutes) {
  const result = new Date(date)
  result.setUTCMinutes(result.getUTCMinutes() + minutes)
  return result
}

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0))
}

function endOfUtcDayForChart(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 30, 0))
}

function utcDateTimeKey(date) {
  if (!date || Number.isNaN(date.getTime?.())) return ''
  return date.toISOString().slice(0, 16)
}

function shortDateTime(value, showDate = false) {
  if (!value) return ''
  const parsed = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''

  const time = parsed.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  })

  if (!showDate) return time

  const date = parsed.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  })

  return `${date} ${time}`
}

function fullDateTime(value) {
  if (!value) return ''
  const parsed = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''

  const date = parsed.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
  const time = parsed.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  })

  return `${date}, ${time}`
}

function groupByHalfHour(items) {
  const map = new Map()

  items.forEach((item) => {
    const parsed = parseDateTime(item.date)
    if (!parsed) return

    const slot = floorUtcToInterval(parsed)
    const key = utcDateTimeKey(slot)
    const current = map.get(key) || 0
    map.set(key, current + numberValue(item.quantity))
  })

  return Array.from(map, ([key, quantity]) => ({
    date: key,
    label: shortDateTime(`${key}:00Z`),
    fullLabel: fullDateTime(`${key}:00Z`),
    quantity,
    isMissing: false,
  })).sort((a, b) => a.date.localeCompare(b.date))
}

function buildHalfHourSeries(items, startDate, endDate) {
  if (!startDate || !endDate) return groupByHalfHour(items)

  const showDateInLabel = startDate.toISOString().slice(0, 10) !== endDate.toISOString().slice(0, 10)
  const actualBySlot = new Map(groupByHalfHour(items).map((item) => [item.date, item.quantity]))
  const series = []
  let cursor = startOfUtcDay(startDate)
  const end = endOfUtcDayForChart(endDate)

  while (cursor <= end) {
    const key = utcDateTimeKey(cursor)
    const hasData = actualBySlot.has(key)

    series.push({
      date: key,
      label: shortDateTime(cursor, showDateInLabel),
      fullLabel: fullDateTime(cursor),
      quantity: hasData ? actualBySlot.get(key) : 0,
      isMissing: !hasData,
    })

    cursor = addUtcMinutes(cursor, CHART_INTERVAL_MINUTES)
  }

  return series
}

function buildChartSeries(items, startDate, endDate, range) {
  if (HALF_HOUR_CHART_RANGES.has(range)) {
    return buildHalfHourSeries(items, startDate, endDate)
  }

  return buildDateSeries(items, startDate, endDate)
}

function buildPreviousYearChartSeries(response, currentSeries, range) {
  const previousYearItems = Array.isArray(response?.previous_year_statistics)
    ? response.previous_year_statistics
    : []

  if (!currentSeries.length || previousYearItems.length === 0) return []

  if (HALF_HOUR_CHART_RANGES.has(range)) {
    const previousBySlot = new Map(groupByHalfHour(previousYearItems).map((item) => [item.date, item.quantity]))

    return currentSeries.map((point) => {
      const currentDate = parseDateTime(point.date)
      const previousDate = shiftUtcDateYears(currentDate, -1)
      const previousKey = utcDateTimeKey(previousDate)
      const hasData = previousBySlot.has(previousKey)

      return {
        date: point.date,
        previousDate: previousKey,
        label: point.label,
        fullLabel: point.fullLabel,
        previousFullLabel: fullDateTime(previousDate),
        quantity: hasData ? previousBySlot.get(previousKey) : 0,
        isMissing: !hasData,
      }
    })
  }

  const previousByDate = new Map(groupByDate(previousYearItems).map((item) => [item.date, item.quantity]))

  return currentSeries.map((point) => {
    const currentDate = parseDateOnly(point.date)
    const previousDate = shiftUtcDateYears(currentDate, -1)
    const previousKey = utcDateKey(previousDate)
    const hasData = previousByDate.has(previousKey)

    return {
      date: point.date,
      previousDate: previousKey,
      label: point.label,
      fullLabel: point.fullLabel,
      previousFullLabel: fullDate(previousKey),
      quantity: hasData ? previousByDate.get(previousKey) : 0,
      isMissing: !hasData,
    }
  })
}

function utcDateKey(date) {
  if (!date || Number.isNaN(date.getTime?.())) return ''
  return date.toISOString().slice(0, 10)
}

function buildDateSeries(items, startDate, endDate) {
  if (!startDate || !endDate) return groupByDate(items)

  const actualByDate = new Map(groupByDate(items).map((item) => [item.date, item.quantity]))
  const series = []
  let cursor = new Date(startDate)

  while (cursor <= endDate) {
    const key = utcDateKey(cursor)
    const hasData = actualByDate.has(key)

    series.push({
      date: key,
      label: shortDate(key),
      fullLabel: fullDate(key),
      quantity: hasData ? actualByDate.get(key) : 0,
      isMissing: !hasData,
    })

    cursor = addUtcDays(cursor, 1)
  }

  return series
}


function shiftUtcDateYears(date, years) {
  if (!date || Number.isNaN(date.getTime?.())) return null
  return new Date(Date.UTC(
    date.getUTCFullYear() + years,
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
  ))
}

function filterItemsByWindow(items, startDate, endDate) {
  if (!startDate || !endDate) return []

  return items.filter((item) => {
    const itemDate = parseDateOnly(item.date)
    if (!itemDate) return false
    return itemDate >= startDate && itemDate <= endDate
  })
}

function getPreviousYearWindow(response, rangeWindow) {
  const previousYearItems = Array.isArray(response?.previous_year_statistics)
    ? response.previous_year_statistics
    : []

  if (!rangeWindow.startDate || !rangeWindow.endDate || previousYearItems.length === 0) {
    return {
      items: [],
      startDate: null,
      endDate: null,
    }
  }

  const startDate = shiftUtcDateYears(rangeWindow.startDate, -1)
  const endDate = shiftUtcDateYears(rangeWindow.endDate, -1)

  return {
    items: filterItemsByWindow(previousYearItems, startDate, endDate),
    startDate,
    endDate,
  }
}

function buildPreviousYearComparison(response, rangeWindow) {
  const previousYearWindow = getPreviousYearWindow(response, rangeWindow)

  if (!previousYearWindow.startDate || !previousYearWindow.endDate) {
    return {
      current: 0,
      previous: 0,
      delta: 0,
      deltaPercent: 0,
      caption: 'Нет данных за прошлый год',
    }
  }

  const previous = previousYearWindow.items.reduce((sum, item) => sum + numberValue(item.quantity), 0)

  return {
    current: 0,
    previous,
    delta: 0,
    deltaPercent: previous ? 0 : 0,
    previousPeriodText: formatDateRange(previousYearWindow.startDate, previousYearWindow.endDate),
    previousYear: previousYearWindow.startDate?.getUTCFullYear?.() || '',
    caption: previous ? '' : 'Нет данных за прошлый год',
  }
}

function normalizeMethod(value) {
  const cleaned = displayValue(value)
  if (cleaned === 'Не указано') return null

  const normalized = cleaned.toLowerCase()
  if (containsEmptyMarker(cleaned)) return null
  if (normalized.includes('епгу')) return 'Суперсервис'
  if (normalized.includes('суперсервис')) return 'Суперсервис'
  if (normalized.includes('веб')) return 'Суперсервис'
  if (normalized.includes('лич')) return 'Лично'
  if (normalized.includes('почт')) return 'Почта'

  return cleaned
}

function groupByMethod(items) {
  const known = new Map(METHOD_ORDER.map((method) => [method, 0]))
  const extra = new Map()

  items.forEach((item) => {
    const method = normalizeMethod(item.application_method)
    const quantity = numberValue(item.quantity)

    if (!method) return

    if (known.has(method)) {
      known.set(method, (known.get(method) || 0) + quantity)
      return
    }

    if (quantity > 0) {
      extra.set(method, (extra.get(method) || 0) + quantity)
    }
  })

  return [
    ...METHOD_ORDER.map((name) => ({ name, quantity: known.get(name) || 0 })),
    ...Array.from(extra, ([name, quantity]) => ({ name, quantity })).sort(sortByQuantityDesc),
  ]
}

function parsePriority(value) {
  const cleaned = cleanValue(value)
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY
}

function groupPriority(items) {
  const map = new Map()

  items.forEach((item) => {
    const cleanedPriority = cleanValue(item.priority)
    if (cleanedPriority === 'Не указано') return

    const current = map.get(cleanedPriority) || 0
    map.set(cleanedPriority, current + numberValue(item.quantity))
  })

  return Array.from(map, ([priority, quantity]) => ({
    name: `Приоритет ${priority}`,
    priority: parsePriority(priority),
    quantity,
  }))
    .sort((a, b) => a.priority - b.priority || b.quantity - a.quantity)
    .slice(0, 5)
}

function normalizeSpecialty(item) {
  const specialty = item.specialty

  if (specialty && typeof specialty === 'object') {
    const name = cleanValue(readObjectValue(specialty, [
      'name',
      'title',
      'description',
      'presentation',
      'Наименование',
      'Представление',
      'Описание',
    ]))
    const code = cleanValue(readObjectValue(specialty, [
      'code',
      'specialty_code',
      'okso',
      'OKSO',
      'Код',
      'КодСпециальности',
    ]))

    return {
      name,
      code: code === 'Не указано' ? '' : code,
    }
  }

  const itemCode = cleanValue(item.specialty_code)

  return {
    name: cleanValue(specialty),
    code: itemCode === 'Не указано' ? '' : itemCode,
  }
}

function specialtyLevelCode(code) {
  const match = String(code || '').match(/^\s*\d+\.(\d{2})\./)
  return match?.[1] || ''
}

function isRankedSpecialty(item) {
  return !EXCLUDED_SPECIALTY_LEVEL_CODES.has(specialtyLevelCode(item.code))
}

function isFirstPriority(item) {
  return parsePriority(item.priority) === 1
}

function groupBySpecialty(items) {
  const map = new Map()

  items.forEach((item) => {
    const { name, code } = normalizeSpecialty(item)
    if (name === 'Не указано') return

    const key = `${name}::${code}`
    const current = map.get(key) || { name, code, quantity: 0 }
    current.quantity += numberValue(item.quantity)
    map.set(key, current)
  })

  return Array.from(map.values()).map((item) => ({
    name: item.name,
    code: item.code,
    caption: item.code ? `Код: ${item.code}` : '',
    quantity: item.quantity,
  }))
}

export function formatNumber(value) {
  return new Intl.NumberFormat('ru-RU').format(numberValue(value))
}

export function formatPercent(value) {
  return `${Math.round(numberValue(value))}%`
}

export function formatPercentDecimal(value) {
  const numeric = numberValue(value)

  if (numeric > 0 && numeric < 0.1) {
    return '<0,1%'
  }

  return `${new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(numeric)}%`
}

export function formatStorageDate(date) {
  const utc = toUtcDateOnly(date)
  return utc ? utc.toISOString().slice(0, 10) : ''
}

export function parseStorageDate(value) {
  if (!value) return null
  const parsed = new Date(`${String(value).slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return null
  return new Date(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate())
}

function normalizeAdmissionDirectionPlans(source) {
  const directions = source?.directions || source?.specialties || source?.programs || source?.items || []

  return Array.isArray(directions)
    ? directions.map((item) => ({
      code: displayValue(readObjectValue(item, ['code', 'specialty_code', 'Код'])),
      name: displayValue(readObjectValue(item, ['name', 'title', 'specialty_name', 'Наименование'])),
      plan: numberValue(readObjectValue(item, ['quantity', 'total', 'plan', 'kcp', 'value', 'Количество'])),
    })).filter((item) => item.name && item.plan > 0)
    : []
}

function buildAdmissionDirectionStats(directionPlans, allItems) {
  if (!directionPlans.length) return []

  const actualBySpecialty = new Map()
  const actualByCode = new Map()
  const actualByName = new Map()
  const directionCodeCounts = new Map()
  const directionNameCounts = new Map()

  directionPlans.forEach((item) => {
    if (item.code) directionCodeCounts.set(item.code, (directionCodeCounts.get(item.code) || 0) + 1)
    if (item.name) directionNameCounts.set(item.name, (directionNameCounts.get(item.name) || 0) + 1)
  })

  allItems.forEach((item) => {
    const specialty = normalizeSpecialty(item)
    const quantity = numberValue(item.quantity)

    if (!specialty.name || quantity <= 0) return

    const key = `${specialty.code}::${specialty.name}`
    actualBySpecialty.set(key, (actualBySpecialty.get(key) || 0) + quantity)
    actualByCode.set(specialty.code, (actualByCode.get(specialty.code) || 0) + quantity)
    actualByName.set(specialty.name, (actualByName.get(specialty.name) || 0) + quantity)
  })

  return directionPlans.map((item) => {
    const exactCurrent = actualBySpecialty.get(`${item.code}::${item.name}`)
    const codeCurrent = item.code && directionCodeCounts.get(item.code) === 1
      ? actualByCode.get(item.code)
      : undefined
    const nameCurrent = item.name && directionNameCounts.get(item.name) === 1
      ? actualByName.get(item.name)
      : undefined
    const current = exactCurrent ?? codeCurrent ?? nameCurrent ?? 0
    const percent = item.plan ? (current / item.plan) * 100 : 0

    return {
      ...item,
      current,
      percent,
      fillPercent: Math.min(100, percent),
      remaining: Math.max(0, item.plan - current),
      overflow: Math.max(0, current - item.plan),
    }
  }).sort((a, b) => b.current - a.current || a.name.localeCompare(b.name, 'ru'))
}

function normalizeAdmissionControlNumbers(response, current, allItems = []) {
  const source = response?.admission_control_numbers || response?.kcp || response?.control_admission_numbers || {}
  const total = numberValue(readObjectValue(source, [
    'total',
    'quantity',
    'plan',
    'kcp',
    'КЦП',
    'КонтрольныеЦифрыПриема',
  ]))
  const categories = Array.isArray(source?.categories)
    ? source.categories.map((item) => ({
      name: displayValue(readObjectValue(item, ['name', 'title', 'funding_type', 'Наименование'])),
      quantity: numberValue(readObjectValue(item, ['quantity', 'total', 'plan', 'value', 'Количество'])),
    })).filter((item) => item.quantity > 0)
    : []
  const directionPlans = normalizeAdmissionDirectionPlans(source)
  const directions = buildAdmissionDirectionStats(directionPlans, allItems)
  const plan = total || directionPlans.reduce((sum, item) => sum + item.plan, 0) || categories.reduce((sum, item) => sum + item.quantity, 0)
  const percent = plan ? (current / plan) * 100 : 0
  const delta = current - plan

  return {
    plan,
    current,
    percent,
    fillPercent: Math.min(100, percent),
    remaining: Math.max(0, plan - current),
    overflow: Math.max(0, delta),
    hasPlan: plan > 0,
    categories,
    directions,
  }
}

export function buildAnalytics(response, range = 'all', selectedDate = null) {
  const allItems = Array.isArray(response?.applicants_statistics) ? response.applicants_statistics : []
  const rangeWindow = getRangeWindow(allItems, range, selectedDate)
  const items = filterItemsByRange(allItems, range, selectedDate)
  const total = items.reduce((sum, item) => sum + numberValue(item.quantity), 0)
  const admissionCampaignTotal = allItems.reduce((sum, item) => sum + numberValue(item.quantity), 0)
  // КЦП относится ко всей приёмной кампании, поэтому этот блок не должен зависеть от выбранного периода.
  const kcp = normalizeAdmissionControlNumbers(response, admissionCampaignTotal, allItems)
  const previousYearComparison = buildPreviousYearComparison(response, rangeWindow)
  previousYearComparison.current = total
  previousYearComparison.delta = total - previousYearComparison.previous
  previousYearComparison.deltaPercent = previousYearComparison.previous
    ? (previousYearComparison.delta / previousYearComparison.previous) * 100
    : 0
  previousYearComparison.value = previousYearComparison.previous
    ? `${previousYearComparison.deltaPercent > 0 ? '+' : ''}${formatPercent(previousYearComparison.deltaPercent)}`
    : 'Нет данных'
  previousYearComparison.caption = previousYearComparison.previous
    ? `${previousYearComparison.delta > 0 ? 'на ' + formatNumber(previousYearComparison.delta) + ' заявок больше' : previousYearComparison.delta < 0 ? 'на ' + formatNumber(Math.abs(previousYearComparison.delta)) + ' заявок меньше' : 'столько же заявок'}, чем за тот же период за прошлый год`
    : 'Нет данных за прошлый год'
  const actualByDate = groupByDate(items)
  const byDate = buildChartSeries(items, rangeWindow.startDate, rangeWindow.endDate, range)
  const previousYearByDate = buildPreviousYearChartSeries(response, byDate, range)
  const previousYearWindowItems = getPreviousYearWindow(response, rangeWindow).items
  const byFunding = groupBy(items, 'funding_type')
  const previousYearByFunding = groupBy(previousYearWindowItems, 'funding_type')
  const byForm = groupBy(items, 'form_of_education')
  const previousYearByForm = groupBy(previousYearWindowItems, 'form_of_education')
  const byDegree = groupBy(items, 'degree_type')
  const byMethod = groupByMethod(items)
  const previousYearByMethod = groupByMethod(previousYearWindowItems)
  const byPriority = groupPriority(items)
  const bySpecialty = groupBySpecialty(items)
  const rankedSpecialties = bySpecialty.filter(isRankedSpecialty)
  const topSpecialties = [...rankedSpecialties].sort(sortByQuantityDesc).slice(0, 5)
  const firstPrioritySpecialties = groupBySpecialty(items.filter(isFirstPriority))
    .filter(isRankedSpecialty)
    .filter((item) => item.quantity > 0)
    .sort(sortByQuantityDesc)
    .slice(0, 5)
  const bottomSpecialties = [...rankedSpecialties]
    .filter((item) => item.quantity > 0)
    .sort((a, b) => a.quantity - b.quantity || a.name.localeCompare(b.name, 'ru'))
    .slice(0, 5)
  const latest = actualByDate.at(-1)
  const previous = actualByDate.at(-2)
  const latestDelta = latest && previous ? latest.quantity - previous.quantity : 0
  const latestDeltaPercent = previous?.quantity ? (latestDelta / previous.quantity) * 100 : 0
  const budget = byFunding.find((item) => item.name === 'Бюджетная основа')?.quantity || 0
  const paid = byFunding.find((item) => item.name === 'Платное обучение' || item.name === 'Договор на платное обучение')?.quantity || 0
  const target = byFunding.find((item) => item.name === 'Целевой прием' || item.name === 'Целевой приём')?.quantity || 0
  const web = byMethod.find((item) => item.name === 'Веб')?.quantity || 0
  const online = byMethod.find((item) => item.name === 'Суперсервис')?.quantity || 0
  const personal = byMethod.find((item) => item.name === 'Лично')?.quantity || 0

  return {
    items,
    allItems,
    rangeStart: rangeWindow.startDate,
    rangeEnd: rangeWindow.endDate,
    rangeText: formatDateRange(rangeWindow.startDate, rangeWindow.endDate),
    total,
    kcp,
    latestDate: latest ? fullDate(latest.date) : 'Нет данных',
    latestQuantity: latest?.quantity || 0,
    latestDelta,
    latestDeltaPercent,
    previousYearComparison,
    budget,
    paid,
    target,
    web,
    online,
    personal,
    byDate,
    previousYearByDate,
    byFunding,
    previousYearByFunding,
    byForm,
    previousYearByForm,
    byDegree,
    byMethod,
    previousYearByMethod,
    byPriority,
    firstPrioritySpecialties,
    topSpecialties,
    bottomSpecialties,
    source: response?.meta?.source || '1c',
    sourceNote: response?.meta?.note || '',
  }
}
