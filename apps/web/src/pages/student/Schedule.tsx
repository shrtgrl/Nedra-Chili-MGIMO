import { useUser } from '../../context/auth'
import { useData } from '../../context/data'
import { STUDENT_LESSONS, TEACHER_LESSONS } from '../../data/mock'
import { WeekSchedule } from '../../components/schedule'
import { Disclaimer, IconButton, PageHeader, ThemeButton } from '../../components/ui'

/** Общая страница расписания для студента и преподавателя. */
export function SchedulePage() {
  const user = useUser()
  const { unreadCount, newInquiries } = useData()
  const isStudent = user.role === 'student'
  return (
    <>
      <PageHeader
        eyebrow={isStudent ? `Группа ${user.group} · осенний семестр` : 'Кафедра прикладных систем · осенний семестр'}
        title="Расписание"
        actions={
          <>
            <ThemeButton />
            <IconButton
              icon={isStudent ? 'bell' : 'inbox'}
              label={isStudent ? 'Уведомления' : 'Обращения'}
              to={isStudent ? '/student/notifications' : '/teacher/inquiries'}
              dot={isStudent ? unreadCount > 0 : newInquiries > 0}
            />
          </>
        }
      />
      <WeekSchedule lessons={isStudent ? STUDENT_LESSONS : TEACHER_LESSONS} who={isStudent ? 'teacher' : 'group'} />
      <Disclaimer />
    </>
  )
}
