import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildMockResponse } from '../server/mockData.js'
import { buildAnalytics } from '../src/utils/analytics.js'

describe('analytics', () => {
  it('builds full-year mock analytics with previous-year comparison', () => {
    const response = buildMockResponse('2025-01')
    const analytics = buildAnalytics(response, 'year', null)

    assert.equal(analytics.source, 'mock')
    assert.equal(analytics.rangeText, '01 января 2025 г. — 31 декабря 2025 г.')
    assert.equal(analytics.byDate.length, 365)
    assert.ok(analytics.total > 0)
    assert.ok(analytics.previousYearComparison.previous > 0)
    assert.ok(response.admission_control_numbers.total > 0)
    assert.equal(analytics.kcp.plan, response.admission_control_numbers.total)
    assert.equal(analytics.kcp.current, analytics.total)
    assert.ok(analytics.kcp.percent > 0)
    assert.equal(
      response.admission_control_numbers.directions.reduce((sum, item) => sum + item.quantity, 0),
      response.admission_control_numbers.total,
    )
    assert.equal(response.admission_control_numbers.directions.length, 151)
    assert.equal(analytics.kcp.directions.length, response.admission_control_numbers.directions.length)
    assert.ok(analytics.byFunding.some((item) => item.name === 'Отдельная квота'))
    assert.ok(analytics.byFunding.some((item) => item.name === 'Особая квота'))
    assert.equal(analytics.topSpecialties.length, 5)
    assert.equal(analytics.bottomSpecialties.length, 5)
  })

  it('creates half-hour slots for a selected day', () => {
    const response = buildMockResponse('2025-01')
    const analytics = buildAnalytics(response, 'day', new Date(2025, 6, 15))

    assert.equal(analytics.rangeText, '15 июля 2025 г.')
    assert.equal(analytics.byDate.length, 48)
    assert.equal(analytics.byDate[0].date, '2025-07-15T00:00')
    assert.equal(analytics.byDate.at(-1).date, '2025-07-15T23:30')
  })

  it('builds KCP progress from admission control numbers', () => {
    const response = {
      applicants_statistics: [
        { date: '2025-01-01T10:00:00', specialty: { code: '09.03.01', name: 'Информатика' }, quantity: 120 },
        { date: '2025-01-02T10:00:00', specialty: { code: '09.03.01', name: 'Информатика' }, quantity: 30 },
      ],
      previous_year_statistics: [],
      admission_control_numbers: {
        total: 100,
        directions: [
          { code: '09.03.01', name: 'Информатика', quantity: 70 },
          { code: '38.03.01', name: 'Экономика', quantity: 30 },
        ],
      },
      meta: { source: 'test' },
    }

    const analytics = buildAnalytics(response, 'day', new Date(2025, 0, 1))

    assert.equal(analytics.total, 120)
    assert.equal(analytics.kcp.plan, 100)
    assert.equal(analytics.kcp.current, 150)
    assert.equal(analytics.kcp.percent, 150)
    assert.equal(analytics.kcp.fillPercent, 100)
    assert.equal(analytics.kcp.remaining, 0)
    assert.equal(analytics.kcp.overflow, 50)
    assert.equal(analytics.kcp.hasPlan, true)
    assert.deepEqual(analytics.kcp.directions, [
      {
        code: '09.03.01',
        name: 'Информатика',
        plan: 70,
        current: 150,
        percent: 150 / 70 * 100,
        fillPercent: 100,
        remaining: 0,
        overflow: 80,
      },
      {
        code: '38.03.01',
        name: 'Экономика',
        plan: 30,
        current: 0,
        percent: 0,
        fillPercent: 0,
        remaining: 30,
        overflow: 0,
      },
    ])
  })

  it('does not duplicate KCP direction facts through ambiguous code or name fallback', () => {
    const response = {
      applicants_statistics: [
        { date: '2025-01-01T10:00:00', specialty: { code: '10.03.01', name: 'Точное направление' }, quantity: 40 },
        { date: '2025-01-01T10:30:00', specialty: { code: '10.03.02', name: 'Неоднозначное название' }, quantity: 20 },
      ],
      previous_year_statistics: [],
      admission_control_numbers: {
        total: 400,
        directions: [
          { code: '10.03.01', name: 'Точное направление', quantity: 100 },
          { code: '10.03.01', name: 'Другое направление с тем же кодом', quantity: 100 },
          { code: '10.03.02', name: 'Неоднозначное название', quantity: 100 },
          { code: '10.03.03', name: 'Неоднозначное название', quantity: 100 },
        ],
      },
      meta: { source: 'test' },
    }

    const analytics = buildAnalytics(response, 'day', new Date(2025, 0, 1))
    const directionByKey = new Map(analytics.kcp.directions.map((item) => [`${item.code}::${item.name}`, item]))

    assert.equal(directionByKey.get('10.03.01::Точное направление').current, 40)
    assert.equal(directionByKey.get('10.03.01::Другое направление с тем же кодом').current, 0)
    assert.equal(directionByKey.get('10.03.02::Неоднозначное название').current, 20)
    assert.equal(directionByKey.get('10.03.03::Неоднозначное название').current, 0)
  })

  it('ignores object-not-found markers in grouped dimensions', () => {
    const response = {
      applicants_statistics: [
        {
          date: '2025-01-01T10:00:00',
          funding_type: '<Объект не найден>',
          form_of_education: 'Очная',
          priority: 1,
          degree_type: 'Бакалавриат',
          application_method: '<Объект не найден>',
          specialty: { code: '09.03.01', name: 'Информатика' },
          quantity: 10,
        },
        {
          date: '2025-01-01T10:30:00',
          funding_type: 'Бюджетная основа',
          form_of_education: 'Очная',
          priority: 1,
          degree_type: 'Бакалавриат',
          application_method: 'Лично',
          specialty: { code: '09.03.01', name: 'Информатика' },
          quantity: 5,
        },
      ],
      previous_year_statistics: [],
      meta: { source: 'test' },
    }

    const analytics = buildAnalytics(response, 'day', new Date(2025, 0, 1))

    assert.equal(analytics.total, 15)
    assert.deepEqual(analytics.byFunding.map((item) => item.name), ['Бюджетная основа'])
    assert.equal(analytics.personal, 5)
    assert.equal(analytics.web, 0)
    assert.equal(analytics.online, 0)
  })

  it('excludes master and postgraduate specialty codes from direction rankings', () => {
    const response = {
      applicants_statistics: [
        { date: '2025-01-01T10:00:00', specialty: { code: '09.04.01', name: 'Master direction' }, quantity: 1000 },
        { date: '2025-01-01T10:30:00', specialty: { code: '44.06.01', name: 'Postgraduate direction' }, quantity: 900 },
        { date: '2025-01-01T11:00:00', specialty: { code: '09.03.01', name: 'Bachelor direction' }, quantity: 50 },
        { date: '2025-01-01T11:30:00', specialty: { code: '31.05.01', name: 'Specialist direction' }, quantity: 30 },
        { date: '2025-01-01T12:00:00', specialty: { code: '35.02.01', name: 'College direction' }, quantity: 10 },
      ],
      previous_year_statistics: [],
      meta: { source: 'test' },
    }

    const analytics = buildAnalytics(response, 'day', new Date(2025, 0, 1))
    const rankedCaptions = [...analytics.topSpecialties, ...analytics.bottomSpecialties].map((item) => item.caption)

    assert.ok(rankedCaptions.every((caption) => !caption.includes('.04.') && !caption.includes('.06.')))
    assert.deepEqual(analytics.topSpecialties.map((item) => item.caption), ['Код: 09.03.01', 'Код: 31.05.01', 'Код: 35.02.01'])
  })

  it('groups first-priority applications by specialty', () => {
    const response = {
      applicants_statistics: [
        { date: '2025-01-01T10:00:00', priority: 1, specialty: { code: '09.03.01', name: 'Информатика' }, quantity: 10 },
        { date: '2025-01-01T10:30:00', priority: '1', specialty: { code: '09.03.01', name: 'Информатика' }, quantity: 5 },
        { date: '2025-01-01T11:00:00', priority: 2, specialty: { code: '09.03.01', name: 'Информатика' }, quantity: 100 },
        { date: '2025-01-01T11:30:00', priority: 1, specialty: { code: '38.03.01', name: 'Экономика' }, quantity: 7 },
        { date: '2025-01-01T12:00:00', priority: 1, specialty: { code: '44.04.01', name: 'Магистратура' }, quantity: 500 },
      ],
      previous_year_statistics: [],
      meta: { source: 'test' },
    }

    const analytics = buildAnalytics(response, 'day', new Date(2025, 0, 1))

    assert.deepEqual(analytics.firstPrioritySpecialties, [
      { name: 'Информатика', code: '09.03.01', caption: 'Код: 09.03.01', quantity: 15 },
      { name: 'Экономика', code: '38.03.01', caption: 'Код: 38.03.01', quantity: 7 },
    ])
  })

  it('combines web, epgu and superservice application methods', () => {
    const response = {
      applicants_statistics: [
        {
          date: '2025-01-01T10:00:00',
          application_method: 'Веб',
          quantity: 5,
        },
        {
          date: '2025-01-01T10:30:00',
          application_method: 'Суперсервис "Поступление в вуз онлайн"',
          quantity: 7,
        },
        {
          date: '2025-01-01T11:00:00',
          application_method: 'ЕПГУ',
          quantity: 3,
        },
      ],
      previous_year_statistics: [],
      meta: { source: 'test' },
    }

    const analytics = buildAnalytics(response, 'day', new Date(2025, 0, 1))

    assert.deepEqual(analytics.byMethod, [
      { name: 'Лично', quantity: 0 },
      { name: 'Почта', quantity: 0 },
      { name: 'Суперсервис', quantity: 15 },
    ])
    assert.equal(analytics.web, 0)
    assert.equal(analytics.online, 15)
  })

  it('builds a synchronized previous-year chart series', () => {
    const response = {
      applicants_statistics: [
        { date: '2025-01-01T00:00:00', quantity: 10 },
        { date: '2025-01-02T00:30:00', quantity: 20 },
      ],
      previous_year_statistics: [
        { date: '2024-01-01T00:00:00', quantity: 3 },
        { date: '2024-01-01T00:30:00', quantity: 5 },
        { date: '2024-01-02T00:30:00', quantity: 7 },
      ],
      meta: { source: 'test' },
    }

    const analytics = buildAnalytics(response, 'twoDays', new Date(2025, 0, 2))

    assert.equal(analytics.byDate.length, 96)
    assert.equal(analytics.previousYearByDate.length, 96)
    assert.equal(analytics.previousYearComparison.previous, 15)
    assert.deepEqual(analytics.previousYearByDate[0], {
      date: '2025-01-01T00:00',
      previousDate: '2024-01-01T00:00',
      label: '01.01 00:00',
      fullLabel: '01 января 2025 г., 00:00',
      previousFullLabel: '01 января 2024 г., 00:00',
      quantity: 3,
      isMissing: false,
    })
    assert.equal(analytics.previousYearByDate[1].quantity, 5)
    assert.equal(analytics.previousYearByDate[49].quantity, 7)
  })

  it('groups funding data for the matching previous-year period', () => {
    const response = {
      applicants_statistics: [
        { date: '2025-07-01T10:00:00', funding_type: 'Бюджетная основа', quantity: 10 },
      ],
      previous_year_statistics: [
        { date: '2024-06-30T10:00:00', funding_type: 'Бюджетная основа', quantity: 99 },
        { date: '2024-07-01T10:00:00', funding_type: 'Бюджетная основа', quantity: 4 },
        { date: '2024-07-01T11:00:00', funding_type: 'Платное обучение', quantity: 6 },
      ],
      meta: { source: 'test' },
    }

    const analytics = buildAnalytics(response, 'day', new Date(2025, 6, 1))

    assert.deepEqual(analytics.previousYearByFunding, [
      { name: 'Платное обучение', quantity: 6 },
      { name: 'Бюджетная основа', quantity: 4 },
    ])
    assert.equal(analytics.previousYearComparison.previous, 10)
  })

  it('groups form and method data for the matching previous-year period', () => {
    const response = {
      applicants_statistics: [
        { date: '2025-07-01T10:00:00', form_of_education: 'Очная', application_method: 'Лично', quantity: 10 },
      ],
      previous_year_statistics: [
        { date: '2024-06-30T10:00:00', form_of_education: 'Очная', application_method: 'Лично', quantity: 99 },
        { date: '2024-07-01T10:00:00', form_of_education: 'Очная', application_method: 'Веб', quantity: 4 },
        { date: '2024-07-01T11:00:00', form_of_education: 'Заочная', application_method: 'ЕПГУ', quantity: 6 },
        { date: '2024-07-01T12:00:00', form_of_education: 'Очная', application_method: 'Суперсервис', quantity: 8 },
      ],
      meta: { source: 'test' },
    }

    const analytics = buildAnalytics(response, 'day', new Date(2025, 6, 1))

    assert.deepEqual(analytics.previousYearByForm, [
      { name: 'Очная', quantity: 12 },
      { name: 'Заочная', quantity: 6 },
    ])
    assert.deepEqual(analytics.previousYearByMethod, [
      { name: 'Лично', quantity: 0 },
      { name: 'Почта', quantity: 0 },
      { name: 'Суперсервис', quantity: 18 },
    ])
  })
})
