import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { lazy, Suspense, useEffect, type ReactElement } from 'react'
import { AuthProvider, useAuth } from './context/auth'
import { DataProvider } from './context/data'
import { SettingsProvider } from './context/settings'
import { ClockProvider } from './context/clock'
import { ToastProvider } from './context/toast'
import { StaffProvider } from './context/staff'
import { MaterialsProvider } from './context/materials'
import type { Role } from './types'
import { AppLayout } from './components/Layout'
import { Snow, useNewYear } from './components/newyear'

const StudentInquiriesPage = lazy(() => import('./pages/student/Inquiries').then((m) => ({ default: m.StudentInquiriesPage })))
const LoginPage = lazy(() => import('./pages/Login').then((m) => ({ default: m.LoginPage })))
const ProfilePage = lazy(() => import('./pages/Profile').then((m) => ({ default: m.ProfilePage })))
const StudentHome = lazy(() => import('./pages/student/Home').then((m) => ({ default: m.StudentHome })))
const SchedulePage = lazy(() => import('./pages/student/Schedule').then((m) => ({ default: m.SchedulePage })))
const GradesPage = lazy(() => import('./pages/student/Grades').then((m) => ({ default: m.GradesPage })))
const RequestsPage = lazy(() => import('./pages/student/Requests').then((m) => ({ default: m.RequestsPage })))
const NotificationsPage = lazy(() => import('./pages/student/Notifications').then((m) => ({ default: m.NotificationsPage })))
const TeacherHome = lazy(() => import('./pages/teacher/Home').then((m) => ({ default: m.TeacherHome })))
const GradebookPage = lazy(() => import('./pages/teacher/Gradebook').then((m) => ({ default: m.GradebookPage })))
const InquiriesPage = lazy(() => import('./pages/teacher/Inquiries').then((m) => ({ default: m.InquiriesPage })))
const TeacherMaterialsPage = lazy(() => import('./pages/teacher/Materials').then((m) => ({ default: m.TeacherMaterialsPage })))
const TeacherDeadlinesPage = lazy(() => import('./pages/teacher/Deadlines').then((m) => ({ default: m.TeacherDeadlinesPage })))
const StaffTasksPage = lazy(() => import('./pages/staff/Tasks').then((m) => ({ default: m.StaffTasksPage })))
const StaffAnnouncementsPage = lazy(() => import('./pages/staff/Announcements').then((m) => ({ default: m.StaffAnnouncementsPage })))
const StaffSchedulePage = lazy(() => import('./pages/staff/Schedule').then((m) => ({ default: m.StaffSchedulePage })))

/* Страницы грузятся отдельными кусками. Когда браузер свободен, догружаем остальные,
   чтобы переходы между разделами оставались мгновенными. */
const PAGE_LOADERS = [
  () => import('./pages/student/Home'), () => import('./pages/student/Schedule'), () => import('./pages/student/Grades'),
  () => import('./pages/student/Requests'), () => import('./pages/student/Inquiries'), () => import('./pages/student/Notifications'),
  () => import('./pages/teacher/Home'), () => import('./pages/teacher/Gradebook'), () => import('./pages/teacher/Inquiries'),
  () => import('./pages/teacher/Materials'), () => import('./pages/teacher/Deadlines'),
  () => import('./pages/staff/Tasks'), () => import('./pages/staff/Announcements'), () => import('./pages/staff/Schedule'),
  () => import('./pages/Profile'),
]
function usePrefetchPages(role: Role | undefined) {
  useEffect(() => {
    if (!role) return
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback
    const run = () => {
      const pick = role === 'student' ? PAGE_LOADERS.slice(0, 6) : role === 'teacher' ? PAGE_LOADERS.slice(6, 11) : PAGE_LOADERS.slice(11, 14)
      for (const load of [...pick, PAGE_LOADERS[14]]) void load().catch(() => undefined)
    }
    const t = idle ? idle(run) : window.setTimeout(run, 1500)
    return () => { if (!idle) window.clearTimeout(t) }
  }, [role])
}

function NewYearBackdrop() {
  return useNewYear() ? <Snow /> : null
}

function AuthenticatedApp() {
  const { user, loading } = useAuth()
  if (loading) return <div className="login" role="status">Проверяем сессию…</div>
  return <MaterialsProvider><DataProvider key={user?.id ?? 'guest'}><AppRoutes /></DataProvider></MaterialsProvider>
}

function RequireRole({ role, children }: { role: Role; children: ReactElement }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) return <Navigate to={`/${user.role}`} replace />
  return children
}

function Home() {
  const { user } = useAuth()
  return <Navigate to={user ? `/${user.role}` : '/login'} replace />
}

function GuestOnly({ children }: { children: ReactElement }) {
  const { user } = useAuth()
  return user ? <Navigate to={`/${user.role}`} replace /> : children
}

function AppRoutes() {
  usePrefetchPages(useAuth().user?.role)
  return (
          <ToastProvider>
            <NewYearBackdrop />
            {/* HashRouter — чтобы сайт работал на любом статическом хостинге без настройки сервера */}
            <HashRouter>
              <Suspense fallback={null}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route
                  path="/login"
                  element={
                    <GuestOnly>
                      <LoginPage />
                    </GuestOnly>
                  }
                />
                <Route
                  path="/student"
                  element={
                    <RequireRole role="student">
                      <AppLayout />
                    </RequireRole>
                  }
                >
                  <Route index element={<StudentHome />} />
                  <Route path="schedule" element={<SchedulePage />} />
                  <Route path="grades" element={<GradesPage />} />
                  <Route path="requests" element={<RequestsPage />} />
                  <Route path="materials" element={<Navigate to="/student/grades" replace />} />
                  <Route path="inquiries" element={<StudentInquiriesPage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                </Route>
                <Route
                  path="/teacher"
                  element={
                    <RequireRole role="teacher">
                      <AppLayout />
                    </RequireRole>
                  }
                >
                  <Route index element={<TeacherHome />} />
                  <Route path="schedule" element={<SchedulePage />} />
                  <Route path="gradebook" element={<GradebookPage />} />
                  <Route path="materials" element={<TeacherMaterialsPage />} />
                  <Route path="deadlines" element={<TeacherDeadlinesPage />} />
                  <Route path="inquiries" element={<InquiriesPage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                </Route>
                <Route
                  path="/staff"
                  element={
                    <RequireRole role="staff">
                      <StaffProvider>
                        <AppLayout />
                      </StaffProvider>
                    </RequireRole>
                  }
                >
                  <Route index element={<StaffTasksPage />} />
                  <Route path="schedule" element={<StaffSchedulePage />} />
                  <Route path="announcements" element={<StaffAnnouncementsPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                </Route>
                <Route path="*" element={<Home />} />
              </Routes>
              </Suspense>
            </HashRouter>
          </ToastProvider>
  )
}

export default function App() {
  return <ClockProvider><SettingsProvider><AuthProvider><AuthenticatedApp /></AuthProvider></SettingsProvider></ClockProvider>
}
