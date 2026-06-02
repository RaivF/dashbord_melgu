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
          application_method: 'Веб',
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
    assert.equal(analytics.web, 5)
    assert.equal(analytics.online, 0)
  })
})
