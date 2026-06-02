import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { createApp, isMockModeEnabled, normalizePeriod } from '../server/index.js'

function requestJson(baseUrl, path, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}

describe('server', () => {
  let server
  let baseUrl

  before(async () => {
    const app = createApp({
      ONE_C_USE_MOCK: 'true',
      CORS_ORIGIN: '*',
    })

    server = await new Promise((resolve) => {
      const instance = app.listen(0, () => resolve(instance))
    })

    const { port } = server.address()
    baseUrl = `http://127.0.0.1:${port}`
  })

  after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error)
        else resolve()
      })
    })
  })

  it('normalizes valid periods and rejects invalid months', () => {
    assert.equal(normalizePeriod('2025'), '2025-01')
    assert.equal(normalizePeriod('2025-07'), '2025-07')
    assert.equal(normalizePeriod(' 2025-12 '), '2025-12')
    assert.equal(normalizePeriod('2025-00'), null)
    assert.equal(normalizePeriod('2025-13'), null)
    assert.equal(normalizePeriod('2025-1'), null)
    assert.equal(normalizePeriod('abc'), null)
  })

  it('detects mock mode when 1C credentials are missing or placeholders', () => {
    assert.equal(isMockModeEnabled({ ONE_C_USE_MOCK: 'true' }), true)
    assert.equal(isMockModeEnabled({ ONE_C_URL: 'http://1c', ONE_C_USER: 'user', ONE_C_PASSWORD: 'PUT_PASSWORD_HERE' }), true)
    assert.equal(isMockModeEnabled({ ONE_C_URL: 'http://1c', ONE_C_USER: 'user', ONE_C_PASSWORD: 'secret' }), false)
  })

  it('returns health state and mock statistics', async () => {
    const healthResponse = await requestJson(baseUrl, '/api/health')
    assert.equal(healthResponse.status, 200)

    const health = await healthResponse.json()
    assert.equal(health.ok, true)
    assert.equal(health.mock, true)

    const statisticsResponse = await requestJson(baseUrl, '/api/applicants-statistics', {
      method: 'POST',
      body: JSON.stringify({ period: '2025-01' }),
    })
    assert.equal(statisticsResponse.status, 200)

    const statistics = await statisticsResponse.json()
    assert.equal(statistics.meta.source, 'mock')
    assert.equal(statistics.meta.period, '2025-01')
    assert.ok(statistics.applicants_statistics.length > 3000)
    assert.ok(statistics.previous_year_statistics.length > 3000)
  })

  it('rejects malformed statistics period', async () => {
    const response = await requestJson(baseUrl, '/api/applicants-statistics', {
      method: 'POST',
      body: JSON.stringify({ period: '2025-13' }),
    })

    assert.equal(response.status, 400)
    const body = await response.json()
    assert.equal(body.error, 'Некорректный period')
  })
})
