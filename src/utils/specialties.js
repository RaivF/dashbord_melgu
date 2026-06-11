const SPECIALTY_LEVELS = new Map([
  ['02', 'СПО филиалы'],
  ['03', 'Бакалавриат'],
  ['04', 'Магистратура'],
  ['05', 'Специалитет'],
  ['06', 'Аспирантура'],
])

function decodeMxlContent(input) {
  if (typeof input === 'string') return input

  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  const contentStart = bytes[0] === 0x4d && bytes[1] === 0x4f && bytes[2] === 0x58 ? 15 : 0
  return new TextDecoder('utf-8').decode(bytes.slice(contentStart))
}

function extractQuotedStrings(text) {
  return [...text.matchAll(/"((?:[^"\\]|\\.)*)"/g)]
    .map((match) => match[1].replace(/""/g, '"').replace(/\s+/g, ' ').trim())
    .filter((value) => value && value !== '#' && value !== 'Язык по умолчанию')
}

export function getSpecialtyLevel(code) {
  const levelCode = String(code || '').match(/^\d{2}\.(\d{2})\.\d{2}$/)?.[1] || ''
  return SPECIALTY_LEVELS.get(levelCode) || 'Не определено'
}

export function parseSpecialtiesMxl(input) {
  const strings = extractQuotedStrings(decodeMxlContent(input))
  const rows = []

  for (let index = 0; index < strings.length - 1; index += 1) {
    const code = strings[index]

    if (!/^\d{2}\.\d{2}\.\d{2}$/.test(code)) continue

    const name = strings[index + 1]
    if (!name || /^\d{2}\.\d{2}\.\d{2}$/.test(name)) continue

    rows.push({
      code,
      name,
      level: getSpecialtyLevel(code),
    })
  }

  return Array.from(new Map(rows.map((item) => [`${item.code}::${item.name}`, item])).values())
}

export const SPECIALTY_LEVEL_OPTIONS = [
  'Все уровни',
  ...SPECIALTY_LEVELS.values(),
  'Не определено',
]
