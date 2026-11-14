/** Подписи типов заявок и этапов. Данные кабинетов загружаются из API. */
import type { IconName } from '../components/Icon'

type Item = { type: string; label: string; hint: string; icon: IconName }
const GROUPS = [
  {
    title: 'Справки и подтверждения',
    items: [
      { type: 'study', label: 'Справка об обучении', hint: 'С печатью, по месту требования', icon: 'doc' },
      { type: 'english', label: 'Справка на английском', hint: 'Стажировки, обмен, визы, конференции', icon: 'globe' },
      { type: 'military', label: 'Справка для военкомата', hint: 'Приложение № 4, для ВУС', icon: 'shield' },
      { type: 'social', label: 'Справка в налоговую, СФР, соцзащиту', hint: 'Вычет за обучение, продление выплат', icon: 'database' },
      { type: 'summons', label: 'Справка-вызов на сессию', hint: 'Учебный отпуск для работающих', icon: 'briefcase' },
      { type: 'transcript', label: 'Академическая справка', hint: 'Транскрипт: дисциплины, часы, оценки', icon: 'list' },
      { type: 'order', label: 'Копия приказа', hint: 'Копия приказа по обучению', icon: 'clipboard' },
    ],
  },
  {
    title: 'Учебный процесс',
    items: [
      { type: 'credit', label: 'Перезачёт дисциплин или сертификата', hint: 'Языковой сертификат или перевод из другого вуза', icon: 'refresh' },
      { type: 'iup', label: 'Индивидуальный учебный план', hint: 'Работа по специальности, стажировка', icon: 'route' },
      { type: 'transfer', label: 'Перевод на другую программу или форму', hint: 'Например, с платного на бюджет', icon: 'swap' },
      { type: 'extension', label: 'Продление сессии', hint: 'Нужна медицинская справка', icon: 'clock' },
      { type: 'retake', label: 'Пересдача экзамена', hint: 'Дисциплину укажите в цели', icon: 'refresh' },
      { type: 'leave', label: 'Академический отпуск', hint: 'Основание опишите в комментарии', icon: 'pause' },
    ],
  },
  {
    title: 'Кампус',
    items: [
      { type: 'card', label: 'Дубликат студенческого или карты', hint: 'Если потеряли или сломалась', icon: 'card' },
      { type: 'guest_pass', label: 'Разовый пропуск для гостя', hint: 'Гость или научный руководитель', icon: 'key' },
      { type: 'aid', label: 'Материальная помощь, повышенная стипендия', hint: 'Достижения опишите в комментарии', icon: 'gift' },
    ],
  },
] as const satisfies readonly { title: string; items: readonly Item[] }[]
const OTHER = { type: 'other', label: 'Иное обращение', hint: 'Опишите, что нужно, в комментарии', icon: 'pencil' } as const satisfies Item

export type RequestTypeId = (typeof GROUPS)[number]['items'][number]['type'] | typeof OTHER.type

/** Каталог для выпадающего списка заявок. Порядок типов должен совпадать с apps/api/src/request-types.ts. */
export const REQUEST_CATALOG = GROUPS
export const REQUEST_OTHER = OTHER
const ALL: readonly Item[] = [...GROUPS.flatMap((g) => g.items as readonly Item[]), OTHER]
export const REQUEST_TYPES = Object.fromEntries(ALL.map((i) => [i.type, i.label])) as Record<RequestTypeId, string>
export const REQUEST_ICONS = Object.fromEntries(ALL.map((i) => [i.type, i.icon])) as Record<RequestTypeId, IconName>
export const REQUEST_HINTS = Object.fromEntries(ALL.map((i) => [i.type, i.hint])) as Record<RequestTypeId, string>

export const REQUEST_STAGES = ['Принята', 'В работе', 'Готова', 'Выдана'] as const
