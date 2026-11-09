export interface ApiProfile {
  id: string
  fullName: string
  email: string
  role: 'student' | 'teacher'
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
