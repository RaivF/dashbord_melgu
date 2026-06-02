const FUNDING_TYPES = ['Бюджетная основа', 'Полное возмещение затрат', 'Целевой прием']
const FORMS = ['Очная', 'Заочная', 'Очно-Заочная']
const DEGREES = [
  'Среднее профессиональное образование',
  'Бакалавриат',
  'Магистратура',
  'Специалитет',
  'Аспирантура',
]
const METHODS = ['Веб', 'Лично', 'Почта', 'Суперсервис "Поступление в вуз онлайн"', '<Объект не найден>']
const SPECIALTIES = [
  { code: '09.03.01', name: 'Информатика и вычислительная техника' },
  { code: '38.03.01', name: 'Экономика' },
  { code: '44.03.01', name: 'Педагогическое образование' },
  { code: '40.03.01', name: 'Юриспруденция' },
  { code: '35.03.04', name: 'Агрономия' },
  { code: '08.03.01', name: 'Строительство' },
  { code: '23.03.03', name: 'Эксплуатация транспортно-технологических машин и комплексов' },
  { code: '19.03.04', name: 'Технология продукции и организация общественного питания' },
]

function getDaysInYear(year) {
  return new Date(Date.UTC(Number(year), 1, 29)).getUTCMonth() === 1 ? 366 : 365
}

function getDateByDayOffset(year, dayOffset) {
  const date = new Date(Date.UTC(Number(year), 0, 1))
  date.setUTCDate(date.getUTCDate() + dayOffset)
  return date
}

function makeDate(year, dayOffset, itemIndex = 0) {
  const date = getDateByDayOffset(year, dayOffset)
  const hour = 8 + ((dayOffset * 3 + itemIndex * 5) % 11)
  const minute = ((dayOffset + itemIndex) % 2) * 30
  date.setUTCHours(hour, minute, 0, 0)
  return date.toISOString().replace('.000Z', '')
}

function seededRandom(...parts) {
  const seed = parts.reduce((acc, value, index) => acc + Number(value) * (9973 + index * 7919), 0)
  const raw = Math.sin(seed) * 10000
  return raw - Math.floor(raw)
}

function getSeasonFactor(year, dayOffset) {
  const date = getDateByDayOffset(year, dayOffset)
  const month = date.getUTCMonth()
  const dayOfYear = dayOffset + 1

  const monthBase = [0.07, 0.08, 0.11, 0.20, 0.38, 0.90, 1.42, 1.08, 0.46, 0.20, 0.11, 0.08][month]
  const mainPeak = Math.exp(-((dayOfYear - 194) ** 2) / (2 * 28 ** 2))
  const augustPeak = Math.exp(-((dayOfYear - 232) ** 2) / (2 * 18 ** 2))
  const weeklyWave = 0.92 + Math.sin((dayOffset + Number(year) % 17) / 4.7) * 0.10

  return Math.max(0.03, (monthBase + mainPeak * 0.80 + augustPeak * 0.35) * weeklyWave)
}

function buildMockItems(year, previousYearMode = false) {
  const items = []
  const daysInYear = getDaysInYear(year)
  const numericYear = Number(year)
  const yearFactor = 0.88 + seededRandom(numericYear, 41) * 0.34
  const previousYearFactor = previousYearMode ? 0.78 + seededRandom(numericYear, 97) * 0.30 : 1

  for (let day = 0; day < daysInYear; day += 1) {
    const seasonFactor = getSeasonFactor(year, day)

    FUNDING_TYPES.forEach((fundingType, fundingIndex) => {
      FORMS.forEach((form, formIndex) => {
        const degree = DEGREES[(day + fundingIndex + formIndex) % DEGREES.length]
        const method = METHODS[(day + formIndex + fundingIndex) % METHODS.length]
        const specialty = SPECIALTIES[(day + fundingIndex * 2 + formIndex) % SPECIALTIES.length]
        const random = seededRandom(year, day, fundingIndex, formIndex)
        const dayNoise = 0.72 + random * 0.70
        const base = 2 + fundingIndex * 5 + formIndex * 3 + Math.round(random * 11)
        const fundingMultiplier = fundingType === 'Бюджетная основа'
          ? 1.55
          : fundingType === 'Целевой прием'
            ? 0.48
            : 1.02
        const formMultiplier = form === 'Очная' ? 1.18 : form === 'Заочная' ? 0.78 : 0.62
        const methodMultiplier = method.includes('Суперсервис') ? 1.12 : method === 'Веб' ? 1.22 : method === 'Почта' ? 0.28 : 1
        const rawQuantity = base * seasonFactor * fundingMultiplier * formMultiplier * methodMultiplier * yearFactor * previousYearFactor * dayNoise
        const quantity = method === '<Объект не найден>' ? 0 : Math.max(0, Math.round(rawQuantity))

        items.push({
          date: makeDate(year, day, fundingIndex * FORMS.length + formIndex),
          funding_type: fundingType,
          form_of_education: form,
          priority: (day % 6) + 1,
          degree_type: degree,
          application_method: method,
          specialty,
          quantity,
        })
      })
    })
  }

  return items
}

export function buildMockResponse(period = '2025-01') {
  const year = Number(String(period).slice(0, 4)) || 2025
  const applicants_statistics = buildMockItems(year)
  const previous_year_statistics = buildMockItems(year - 1, true)

  return {
    applicants_statistics,
    previous_year_statistics,
    meta: {
      source: 'mock',
      note: 'Демо-данные за полный календарный год. Заполните .env для подключения к 1С.',
      period,
    },
  }
}
