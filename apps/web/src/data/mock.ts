// Все данные вымышлены. Концепт для конкурса «Вайб-кодинг».
import type {
  Deadline,
  Discipline,
  GradeSheet,
  Inquiry,
  Lesson,
  Notice,
  StudentRequest,
  User,
} from '../types'

/** Неделя, на которую подготовлены разовые переносы и отмены занятий. */
export const DEMO_WEEK_MONDAY = new Date(2026, 10, 9)

export const USERS: User[] = [
  {
    id: 'u-student',
    role: 'student',
    email: 'student@edu.mukpid.ru',
    firstName: 'Мария',
    lastName: 'Иванова',
    initials: 'ИМ',
    group: 'ИМО-21',
    department: 'Факультет цифровой экономики',
    title: 'Студентка · группа ИМО-21',
  },
  {
    id: 'u-teacher',
    role: 'teacher',
    email: 'teacher@mukpid.ru',
    firstName: 'Андрей',
    lastName: 'Орлов',
    patronymic: 'Викторович',
    initials: 'ОА',
    department: 'Кафедра прикладных систем',
    title: 'Преподаватель · кафедра прикладных систем',
  },
]

export const STUDENT_LESSONS: Lesson[] = [
  { id: 's1', day: 0, start: '09:00', end: '10:30', subject: 'Макроэкономика', kind: 'Лекция', room: 'ауд. 214', teacher: 'Орлов А. В.' },
  { id: 's2', day: 0, start: '10:45', end: '12:15', subject: 'Английский язык', kind: 'Практика', room: 'ауд. 108', teacher: 'Белова Е. Н.' },
  { id: 's3', day: 0, start: '13:00', end: '14:30', subject: 'Основы вайб-кодинга', kind: 'Семинар', room: 'ауд. 305', teacher: 'Смирнов Д. А.' },
  { id: 's4', day: 1, start: '09:00', end: '10:30', subject: 'Теория вероятностей', kind: 'Лекция', room: 'ауд. 201', teacher: 'Громова Т. И.' },
  { id: 's5', day: 1, start: '10:45', end: '12:15', subject: 'История России', kind: 'Семинар', room: 'ауд. 117', teacher: 'Крылов П. С.', status: 'cancelled' },
  { id: 's6', day: 2, start: '09:00', end: '10:30', subject: 'Макроэкономика', kind: 'Семинар', room: 'ауд. 214', teacher: 'Орлов А. В.' },
  { id: 's7', day: 2, start: '10:45', end: '12:15', subject: 'Проектирование интерфейсов', kind: 'Лекция', room: 'ауд. 305', teacher: 'Смирнов Д. А.', status: 'moved', movedFrom: '09:00 · ауд. 112' },
  { id: 's8', day: 2, start: '13:00', end: '14:30', subject: 'Физическая культура', kind: 'Практика', room: 'спортзал', teacher: 'Дымов И. Р.' },
  { id: 's9', day: 3, start: '10:45', end: '12:15', subject: 'Теория вероятностей', kind: 'Практика', room: 'ауд. 203', teacher: 'Громова Т. И.' },
  { id: 's10', day: 3, start: '13:00', end: '14:30', subject: 'Английский язык', kind: 'Практика', room: 'ауд. 108', teacher: 'Белова Е. Н.' },
  { id: 's11', day: 4, start: '09:00', end: '10:30', subject: 'Основы вайб-кодинга', kind: 'Лекция', room: 'ауд. 305', teacher: 'Смирнов Д. А.' },
  { id: 's12', day: 4, start: '10:45', end: '12:15', subject: 'История России', kind: 'Лекция', room: 'ауд. 117', teacher: 'Крылов П. С.' },
  { id: 's13', day: 5, start: '09:00', end: '10:30', subject: 'Проектирование интерфейсов', kind: 'Практика', room: 'ауд. 305', teacher: 'Смирнов Д. А.' },
]

export const TEACHER_LESSONS: Lesson[] = [
  { id: 't1', day: 0, start: '09:00', end: '10:30', subject: 'Макроэкономика', kind: 'Лекция', room: 'ауд. 214', group: 'ИМО-21' },
  { id: 't2', day: 0, start: '13:00', end: '14:30', subject: 'Макроэкономика', kind: 'Семинар', room: 'ауд. 214', group: 'ИМО-22' },
  { id: 't3', day: 1, start: '10:45', end: '12:15', subject: 'Экономика данных', kind: 'Лекция', room: 'ауд. 210', group: 'ИМО-31' },
  { id: 't4', day: 2, start: '09:00', end: '10:30', subject: 'Макроэкономика', kind: 'Семинар', room: 'ауд. 214', group: 'ИМО-21' },
  { id: 't5', day: 2, start: '13:00', end: '14:30', subject: 'Экономика данных', kind: 'Семинар', room: 'ауд. 210', group: 'ИМО-31', status: 'moved', movedFrom: '14:45 · ауд. 305' },
  { id: 't6', day: 3, start: '09:00', end: '10:30', subject: 'Макроэкономика', kind: 'Лекция', room: 'ауд. 214', group: 'ИМО-22' },
  { id: 't7', day: 4, start: '10:45', end: '12:15', subject: 'Экономика данных', kind: 'Практика', room: 'ауд. 210', group: 'ИМО-31', status: 'cancelled' },
]

export const DEADLINES: Deadline[] = [
  { id: 'd1', title: 'Проект по вайб-кодингу', date: '2026-11-12T23:59', dateLabel: '12 ноября, 23:59' },
  { id: 'd2', title: 'Контрольная по вероятностям', date: '2026-11-14T09:00', dateLabel: '14 ноября' },
  { id: 'd3', title: 'Эссе по истории', date: '2026-11-20T23:59', dateLabel: '20 ноября' },
]

export const DISCIPLINES_AUTUMN: Discipline[] = [
  { id: 'g1', name: 'Макроэкономика', form: 'Экзамен', score: 86 },
  { id: 'g2', name: 'Английский язык', form: 'Зачёт', score: 92 },
  { id: 'g3', name: 'Теория вероятностей', form: 'Экзамен', score: 74 },
  { id: 'g4', name: 'История России', form: 'Зачёт', score: 68 },
  { id: 'g5', name: 'Основы вайб-кодинга', form: 'Зачёт', score: 95 },
  { id: 'g6', name: 'Проектирование интерфейсов', form: 'Экзамен', score: 81 },
]

export const DISCIPLINES_SPRING: Discipline[] = [
  { id: 'p1', name: 'Микроэкономика', form: 'Экзамен', score: 88 },
  { id: 'p2', name: 'Английский язык', form: 'Зачёт', score: 90 },
  { id: 'p3', name: 'Линейная алгебра', form: 'Экзамен', score: 77 },
  { id: 'p4', name: 'Философия', form: 'Зачёт', score: 83 },
  { id: 'p5', name: 'Введение в программирование', form: 'Экзамен', score: 91 },
]

export const REQUEST_TYPES = {
  study: 'Справка об обучении',
  order: 'Копия приказа',
  leave: 'Академический отпуск',
  retake: 'Пересдача экзамена',
} as const

export const REQUEST_STAGES = ['Принята', 'В работе', 'Готова', 'Выдана'] as const

export const INITIAL_REQUESTS: StudentRequest[] = [
  { id: 'r1', type: 'study', purpose: 'По месту требования', comment: '', delivery: 'pdf', createdLabel: '3 ноября 2026', stage: 2 },
  { id: 'r2', type: 'retake', purpose: 'Теория вероятностей', comment: 'Болел в день экзамена, справка есть.', delivery: 'office', createdLabel: '4 ноября 2026', stage: 1 },
]

export const INITIAL_NOTICES: Notice[] = [
  { id: 'n1', icon: 'alert', title: 'Срок сдачи проекта по вайб-кодингу — 12 ноября', text: 'Загрузите ссылку на работу в систему до 23:59.', time: '11 ноября 2026, 08:30', unread: true, accent: true },
  { id: 'n2', icon: 'calendar', title: 'Изменение в расписании', text: 'Проектирование интерфейсов в среду перенесено на 10:45, ауд. 305.', time: '10 ноября 2026, 18:10', unread: true, accent: true },
  { id: 'n3', icon: 'doc', title: 'Заявка «Справка об обучении» готова', text: 'Электронную версию можно скачать в разделе «Заявки».', time: '5 ноября 2026, 12:05', unread: false },
  { id: 'n4', icon: 'bell', title: 'День открытых дверей деканата', text: '15 ноября с 11:00 до 15:00, ауд. 101.', time: '3 ноября 2026, 09:00', unread: false },
  { id: 'n5', icon: 'calendar', title: 'Отмена занятия', text: 'История России во вторник (семинар) не состоится.', time: '2 ноября 2026, 16:40', unread: false },
]

export const ANNOUNCEMENTS = [
  { id: 'a1', title: 'День открытых дверей', text: '15 ноября, 11:00–15:00, ауд. 101' },
  { id: 'a2', title: 'Приём заявок на справки', text: 'Ежедневно, срок исполнения до 3 рабочих дней' },
]

export const INITIAL_INQUIRIES: Inquiry[] = [
  {
    id: 'q1', student: 'Борисова Анна', initials: 'БА', group: 'ИМО-21', subject: 'Не вижу баллы за контрольную', status: 'new', replies: [],
    message: 'Здравствуйте! В личном кабинете не отображаются баллы за вторую контрольную по макроэкономике. Подскажите, пожалуйста, когда они появятся.',
  },
  {
    id: 'q2', student: 'Волков Денис', initials: 'ВД', group: 'ИМО-22', subject: 'Перенос консультации', status: 'progress', replies: [],
    message: 'Добрый день! Можно ли перенести консультацию с четверга на пятницу? В четверг у группы совпадает практика.',
  },
  {
    id: 'q3', student: 'Жуков Матвей', initials: 'ЖМ', group: 'ИМО-21', subject: 'Вопрос по курсовой работе', status: 'new', replies: [],
    message: 'Здравствуйте! Можно ли взять для курсовой тему про цифровые валюты центробанков? Или она слишком широкая?',
  },
  {
    id: 'q4', student: 'Егорова Полина', initials: 'ЕП', group: 'ИМО-31', subject: 'Благодарность за семинар', status: 'closed',
    replies: ['Спасибо, Полина! Рад, что было полезно.'],
    message: 'Спасибо за семинар по экономике данных — разбор кейса был очень полезным!',
  },
]

const names21 = ['Алексеев Никита', 'Борисова Анна', 'Волков Денис', 'Гаврилова София', 'Данилов Артём', 'Егорова Полина', 'Жуков Матвей', 'Иванова Мария']
const scores21 = [78, 91, 45, 88, 64, null, null, null]
const names22 = ['Абрамов Илья', 'Белоусова Ксения', 'Григорьев Олег', 'Дмитриева Вера', 'Зайцев Кирилл', 'Королёва Ника', 'Лебедев Марк']
const names31 = ['Антонова Ева', 'Баранов Глеб', 'Власова Дарья', 'Головин Тимур', 'Ефимова Алина', 'Карпов Лев']

export const INITIAL_SHEETS: GradeSheet[] = [
  {
    id: 'sh1', subject: 'Макроэкономика', group: 'ИМО-21', form: 'Экзамен', deadlineLabel: '20 ноября',
    students: names21.map((name, i) => ({ id: `21-${i}`, name, score: scores21[i] })),
  },
  {
    id: 'sh2', subject: 'Макроэкономика', group: 'ИМО-22', form: 'Экзамен', deadlineLabel: '20 ноября',
    students: names22.map((name, i) => ({ id: `22-${i}`, name, score: null })),
  },
  {
    id: 'sh3', subject: 'Экономика данных', group: 'ИМО-31', form: 'Зачёт', deadlineLabel: '27 ноября',
    students: names31.map((name, i) => ({ id: `31-${i}`, name, score: null })),
  },
]
