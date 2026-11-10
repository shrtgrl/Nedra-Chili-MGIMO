export interface ApiProfile {
  id: string
  fullName: string
  email: string
  role: 'student' | 'teacher' | 'staff'
  faculty: string | null
  department: string | null
  program: string | null
  year: number | null
  groupName: string | null
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, method = 'GET', body?: object): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: method === 'GET' ? undefined : {
        'X-CSRF-Protection': '1',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Сервер недоступен. Проверьте, что API запущен.')
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null
    throw new ApiError(response.status, payload?.error?.message ?? 'Не удалось выполнить запрос')
  }
  if (response.status === 204) return undefined as T
  return (await response.json() as { data: T }).data
}

export const authApi = {
  login: (email: string, password: string) => request<{ authenticated: boolean }>('/api/auth/login', 'POST', { email, password }),
  me: () => request<ApiProfile>('/api/auth/me'),
  logout: () => request<void>('/api/auth/logout', 'POST'),
}

/* ── Кабинет сотрудника деканата ─────────────────────────── */
export type ApiRequestStatus = 'submitted' | 'in_progress' | 'ready' | 'rejected' | 'issued' | 'cancelled'
export interface ApiStaffRequest {
  id: string
  studentId: string
  type: 'study' | 'order' | 'leave' | 'retake'
  purpose: string
  comment: string
  delivery: 'pdf' | 'office'
  status: ApiRequestStatus
  createdAt: string
  updatedAt: string
  readyAt: string | null
  fullName: string
  groupName: string | null
}
export interface ApiGroup { id: string; name: string; faculty: string; program: string; year: number }
export type ApiLessonKind = 'lecture' | 'seminar' | 'practice'
export interface ApiLesson {
  id: string
  groupId: string
  subject: string
  kind: ApiLessonKind
  teacherName: string
  room: string
  startsAt: string
  endsAt: string
  changeNote: string | null
}
export interface LessonInput {
  subject: string
  kind: ApiLessonKind
  teacherName: string
  room: string
  startsAt: string
  endsAt: string
  changeNote?: string | null
}

export const staffApi = {
  requests: () => request<ApiStaffRequest[]>('/api/staff/requests'),
  setStatus: (id: string, status: 'in_progress' | 'ready' | 'issued') => request<ApiStaffRequest>(`/api/staff/requests/${id}/status`, 'PATCH', { status }),
  pdfUrl: (id: string) => `/api/staff/requests/${id}/pdf`,
  groups: (q: string) => request<ApiGroup[]>(`/api/staff/groups?q=${encodeURIComponent(q)}`),
  lessons: (groupId: string, from: Date, to: Date) =>
    request<{ group: ApiGroup; lessons: ApiLesson[] }>(`/api/staff/groups/${groupId}/lessons?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`),
  addLesson: (groupId: string, input: LessonInput) => request<ApiLesson>(`/api/staff/groups/${groupId}/lessons`, 'POST', input),
  updateLesson: (id: string, input: Partial<LessonInput>) => request<ApiLesson>(`/api/staff/lessons/${id}`, 'PATCH', input),
  deleteLesson: (id: string) => request<void>(`/api/staff/lessons/${id}`, 'DELETE'),
}
