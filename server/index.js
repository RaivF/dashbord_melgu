import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import express from 'express'
import axios from 'axios'
import cors from 'cors'
import dotenv from 'dotenv'
import { buildMockResponse } from './mockData.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const distDir = path.join(rootDir, 'dist')

const PORT = Number(process.env.PORT || 3001)
const DEFAULT_TIMEOUT = 30000
const ALLOWED_ONE_C_METHODS = new Set(['GET', 'POST'])
const LOCAL_ORIGIN_PATTERN = /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i

export function normalizePeriod(period) {
  if (!period) return null
  const value = String(period).trim()
  const match = value.match(/^(\d{4})(?:-(\d{2}))?$/)
  if (!match) return null

  const year = match[1]
  const month = match[2] || '01'
  const monthNumber = Number(month)

  if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) {
    return null
  }

  return `${year}-${month}`
}

export function isMockModeEnabled(env = process.env) {
  return (
    env.ONE_C_USE_MOCK === 'true' ||
    !env.ONE_C_URL ||
    !env.ONE_C_USER ||
    !env.ONE_C_PASSWORD ||
    env.ONE_C_PASSWORD === 'PUT_PASSWORD_HERE'
  )
}

export function isCorsOriginAllowed(origin, env = process.env) {
  if (!origin) return true
  if (env.CORS_ORIGIN === '*') return true

  if (env.CORS_ORIGIN) {
    return env.CORS_ORIGIN
      .split(',')
      .map((allowedOrigin) => allowedOrigin.trim())
      .filter(Boolean)
      .includes(origin)
  }

  return LOCAL_ORIGIN_PATTERN.test(origin)
}

function getOneCMethod(env = process.env) {
  const method = String(env.ONE_C_METHOD || 'GET').toUpperCase()
  return ALLOWED_ONE_C_METHODS.has(method) ? method : 'GET'
}

function getOneCTimeout(env = process.env) {
  const timeout = Number(env.ONE_C_TIMEOUT || DEFAULT_TIMEOUT)
  return Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_TIMEOUT
}

function getSafeOneCErrorMessage(error) {
  if (error.code === 'ECONNABORTED') return 'Истекло время ожидания ответа 1С'
  if (error.response?.status) return `1С вернула ошибку HTTP ${error.response.status}`
  return 'Не удалось получить данные из 1С'
}

export function createApp(env = process.env) {
  const app = express()

  app.use(express.json({ limit: '1mb' }))

  app.use(
    cors({
      origin(origin, callback) {
        callback(null, isCorsOriginAllowed(origin, env))
      },
    }),
  )

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'dashboard-1c-university',
      mock: isMockModeEnabled(env),
    })
  })

  app.post('/api/applicants-statistics', async (req, res) => {
    const period = normalizePeriod(req.body?.period)

    if (!period) {
      return res.status(400).json({
        error: 'Некорректный period',
        message: 'Передайте период в формате YYYY-MM, например 2025-01.',
      })
    }

    if (isMockModeEnabled(env)) {
      return res.json(buildMockResponse(period))
    }

    try {
      const method = getOneCMethod(env)
      const timeout = getOneCTimeout(env)

      const response = await axios.request({
        method,
        url: env.ONE_C_URL,
        auth: {
          username: env.ONE_C_USER,
          password: env.ONE_C_PASSWORD,
        },
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        data: { period },
        timeout,
      })

      res.json(response.data)
    } catch (error) {
      const status = error.response?.status || 500
      const safeMessage = getSafeOneCErrorMessage(error)

      console.error('Ошибка запроса к 1С:', {
        status,
        message: error.message,
        responseType: error.response?.data ? typeof error.response.data : null,
      })

      res.status(status).json({
        error: 'Ошибка при обращении к 1С',
        message: safeMessage,
        status,
      })
    }
  })

  if (env.NODE_ENV === 'production') {
    app.use(express.static(distDir))

    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'))
    })
  }

  return app
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const app = createApp()

  app.listen(PORT, () => {
    console.log(`Backend proxy запущен: http://localhost:${PORT}`)
    console.log(`Режим данных: ${isMockModeEnabled() ? 'mock/demo' : '1C proxy'}`)
  })
}
