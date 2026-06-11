import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { getSpecialtyLevel, parseSpecialtiesMxl } from '../src/utils/specialties.js'

describe('specialties mxl parser', () => {
  it('extracts specialty codes, names and levels from the public mxl file', () => {
    const rows = parseSpecialtiesMxl(readFileSync('public/specialties.mxl'))

    assert.equal(rows.length, 151)
    assert.deepEqual(rows[0], {
      code: '02.03.02',
      name: 'Фундаментальная информатика и информационные технологии',
      level: 'Бакалавриат',
    })
    assert.ok(rows.some((item) => item.code === '09.02.12' && item.level === 'СПО филиалы'))
    assert.ok(rows.some((item) => item.code === '06.06.01' && item.level === 'Аспирантура'))
  })

  it('maps specialty level from the middle code segment', () => {
    assert.equal(getSpecialtyLevel('35.03.04'), 'Бакалавриат')
    assert.equal(getSpecialtyLevel('35.04.04'), 'Магистратура')
    assert.equal(getSpecialtyLevel('38.05.01'), 'Специалитет')
  })
})
