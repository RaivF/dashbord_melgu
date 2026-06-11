export const AUTO_REFRESH_MS = 30 * 60 * 1000
export const THEME_VERSION = 'light-primary-v1'

export const THEME_OPTIONS = [
  { value: 'light', label: 'Светлая' },
  { value: 'night', label: 'Ночь' },
  { value: 'dark', label: 'Тёмная' },
]

export const RANGE_OPTIONS = [
  { value: 'day', label: 'День' },
  { value: 'twoDays', label: '2 дня' },
  { value: 'week', label: 'Неделя' },
  { value: 'twoWeeks', label: '2 недели' },
  { value: 'month', label: 'Месяц' },
  { value: 'year', label: 'Год' },
]

export const CALENDAR_LABELS = {
  day: 'Выбрать день',
  twoDays: 'Дата окончания',
  week: 'Выбрать неделю',
  twoWeeks: 'Дата окончания',
  month: 'Выбрать месяц',
  year: 'Выбрать год',
}

export const CALENDAR_HINTS = {
  day: 'Показываются заявки только за выбранный день. График строится с шагом 30 минут.',
  twoDays: 'Показываются 2 дня, включая выбранную дату. График строится с шагом 30 минут.',
  week: 'Показывается календарная неделя с понедельника по воскресенье.',
  twoWeeks: 'Показываются 14 дней, включая выбранную дату.',
  month: 'Показывается выбранный календарный месяц.',
  year: 'Показывается выбранный календарный год.',
}

export function getDatePickerFormat(range) {
  if (range === 'month') return 'MM.yyyy'
  if (range === 'year') return 'yyyy'
  return 'dd.MM.yyyy'
}

export function getRangeLabel(range) {
  return RANGE_OPTIONS.find((option) => option.value === range)?.label || 'Всё'
}
