import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { ReactElement } from 'react'
import { AuthProvider, useAuth } from './context/auth'
import { DataProvider } from './context/data'
import { SettingsProvider } from './context/settings'
import { ToastProvider } from './context/toast'
import type { Role } from './types'
import { AppLayout } from './components/Layout'
import { LoginPage } from './pages/Login'
import { ProfilePage } from './pages/Profile'
import { StudentHome } from './pages/student/Home'
import { SchedulePage } from './pages/student/Schedule'
import { GradesPage } from './pages/student/Grades'
import { RequestsPage } from './pages/student/Requests'
import { NotificationsPage } from './pages/student/Notifications'
import { TeacherHome } from './pages/teacher/Home'
import { GradebookPage } from './pages/teacher/Gradebook'
import { InquiriesPage } from './pages/teacher/Inquiries'

function RequireRole({ role, children }: { role: Role; children: ReactElement }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) return <Navigate to={user.role === 'student' ? '/student' : '/teacher'} replace />
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

export default function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <DataProvider>
          <ToastProvider>
            {/* HashRouter — чтобы сайт работал на любом статическом хостинге без настройки сервера */}
            <HashRouter>
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
                  <Route path="inquiries" element={<InquiriesPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                </Route>
                <Route path="*" element={<Home />} />
              </Routes>
            </HashRouter>
          </ToastProvider>
        </DataProvider>
      </AuthProvider>
    </SettingsProvider>
  )
}
