/** Подписи типов заявок и этапов. Данные кабинетов загружаются из API. */
export const REQUEST_TYPES = {
  study: 'Справка об обучении',
  order: 'Копия приказа',
  leave: 'Академический отпуск',
  retake: 'Пересдача экзамена',
} as const

export const DEAN_REQUEST_TYPES = ['study', 'order', 'leave', 'retake'] as const
export const REQUEST_STAGES = ['Принята', 'В работе', 'Готова', 'Выдана'] as const
