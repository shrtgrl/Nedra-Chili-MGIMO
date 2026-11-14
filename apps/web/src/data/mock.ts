/** Подписи типов заявок и этапов. Данные кабинетов загружаются из API. */
export const REQUEST_TYPES = {
  study: 'Справка об обучении',
  order: 'Копия приказа',
  leave: 'Академический отпуск',
  retake: 'Пересдача экзамена',
} as const

export const DEAN_REQUEST_TYPES = ['study', 'order', 'leave', 'retake'] as const
export const REQUEST_STAGES = ['Принята', 'В работе', 'Готова', 'Выдана'] as const

/** Каталог для выпадающего списка заявок: группы, пояснения. Новые виды заявок добавляются сюда и в API. */
export const REQUEST_CATALOG: { title: string; items: { type: keyof typeof REQUEST_TYPES; hint: string }[] }[] = [
  {
    title: 'Справки и документы',
    items: [
      { type: 'study', hint: 'С печатью, по месту требования' },
      { type: 'order', hint: 'Копия приказа по обучению' },
    ],
  },
  {
    title: 'Учебный процесс',
    items: [
      { type: 'retake', hint: 'Дисциплину укажите в цели' },
      { type: 'leave', hint: 'Основание опишите в комментарии' },
    ],
  },
]
