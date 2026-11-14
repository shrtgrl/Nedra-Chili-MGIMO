import type { RequestType } from '../types'
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
  type: RequestType
  purpose: string
  comment: string
  delivery: 'pdf' | 'office'
  status: ApiRequestStatus
  createdAt: string
  updatedAt: string
  rejectionReason: string | null
  draftId: string | null
  previewedAt: string | null
  faculty: string | null
  program: string | null
  year: number | null
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
  teacherId?: string | null
  cancelled?: boolean
  groupName?: string
  teacherName: string
  room: string
  startsAt: string
  endsAt: string
  changeNote: string | null
}
export interface LessonInput {
  subject: string
  kind: ApiLessonKind
  teacherId?: string | null
  cancelled?: boolean
  groupName?: string
  teacherName: string
  room: string
  startsAt: string
  endsAt: string
  changeNote?: string | null
}

export const staffApi = {
  teachers:()=>request<{id:string;name:string}[]>('/api/staff/teachers'),
  prepare:(id:string)=>request<ApiStaffRequest>(`/api/staff/requests/${id}/prepare`,'POST',{verified:true}),
  requests: () => request<ApiStaffRequest[]>('/api/staff/requests'),
  setStatus: (id: string, status: 'in_progress' | 'ready' | 'issued' | 'rejected', extra: {reason?:string;draftId?:string} = {}) => request<ApiStaffRequest>(`/api/staff/requests/${id}/status`, 'PATCH', { status, ...extra }),
  pdfUrl: (id: string) => `/api/staff/requests/${id}/pdf`,
  groups: (q: string) => request<ApiGroup[]>(`/api/staff/groups?q=${encodeURIComponent(q)}`),
  lessons: (groupId: string, from: Date, to: Date) =>
    request<{ group: ApiGroup; lessons: ApiLesson[] }>(`/api/staff/groups/${groupId}/lessons?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`),
  addLesson: (groupId: string, input: LessonInput) => request<ApiLesson>(`/api/staff/groups/${groupId}/lessons`, 'POST', input),
  updateLesson: (id: string, input: Partial<LessonInput>) => request<ApiLesson>(`/api/staff/lessons/${id}`, 'PATCH', input),
  deleteLesson: (id: string) => request<void>(`/api/staff/lessons/${id}`, 'DELETE'),
}

export interface ApiAssignment { id:string; teacherId:string; subjectId:string; groupId:string; subject:string; group:string; teacher:string; semester:number; form:'Экзамен'|'Зачёт'; deadline:string|null; version:number }
export interface ApiGrade {id:string;name:string;form:'Экзамен'|'Зачёт';semester:number;score:number|null}
export interface ApiDeadline {id:string;assignmentId:string;title:string;dueAt:string;subject:string;group:string}
export interface ApiAnnouncement {id:string;groupId:string|null;groupName:string|null;title:string;body:string;createdAt:string}
export interface ApiSheet extends ApiAssignment { students:{id:string;name:string;score:number|null}[] }
export interface ApiNotice {id:string;kind:string;title:string;body:string;readAt:string|null;createdAt:string}
export interface ApiInquiry {id:string;studentId:string;teacherId:string;assignmentId:string;student:string;group:string|null;subject:string;text:string;status:'new'|'progress'|'closed';createdAt:string;replies:{id:string;text:string;authorId:string;createdAt:string}[]}
export interface ApiMaterial {id:string;assignmentId:string;title:string;fileName:string;mimeType:string;size:number;createdAt:string;subject:string;group:string}
export interface ApiPrefs {deadlines:boolean;schedule:boolean;news:boolean}
export const dataApi = {
  requests:()=>request<ApiStaffRequest[]>('/api/requests'),
  addRequest:(input:object)=>request<ApiStaffRequest>('/api/requests','POST',input),
  cancelRequest:(id:string)=>request<ApiStaffRequest>(`/api/requests/${id}/cancel`,'PATCH'),
  notices:()=>request<ApiNotice[]>('/api/notifications'),
  read:(id:string)=>request(`/api/notifications/${id}/read`,'PATCH'),
  readAll:()=>request('/api/notifications/read-all','PATCH'),
  prefs:()=>request<ApiPrefs>('/api/user/prefs'),
  setPrefs:(values:Partial<ApiPrefs>)=>request<ApiPrefs>('/api/user/prefs','PATCH',values),
  sheets:()=>request<ApiSheet[]>('/api/gradebook/groups'),
  saveSheet:(id:string,version:number,scores:{studentId:string;score:number|null}[])=>request<{version:number}>(`/api/gradebook/${id}`,'PUT',{version,scores}),
  grades:()=>request<ApiGrade[]>('/api/grades'),
  deadlines:()=>request<ApiDeadline[]>('/api/deadlines'),
  announcements:()=>request<ApiAnnouncement[]>('/api/announcements'),
  addAnnouncement:(title:string,body:string,groupId:string|null)=>request<ApiAnnouncement>('/api/announcements','POST',{title,body,groupId}),
  deleteAnnouncement:(id:string)=>request<void>(`/api/announcements/${id}`,'DELETE'),
  addDeadline:(assignmentId:string,title:string,dueAt:string)=>request<ApiDeadline>('/api/deadlines','POST',{assignmentId,title,dueAt}),
  deleteDeadline:(id:string)=>request<void>(`/api/deadlines/${id}`,'DELETE'),
  inquiries:()=>request<ApiInquiry[]>('/api/inquiries'),
  inquiryTeachers:()=>request<ApiAssignment[]>('/api/inquiries/teachers'),
  addInquiry:(assignmentId:string,subject:string,text:string)=>request('/api/inquiries','POST',{assignmentId,subject,text}),
  inquiryStatus:(id:string,status:string)=>request(`/api/inquiries/${id}`,'PATCH',{status}),
  replyInquiry:(id:string,text:string)=>request(`/api/inquiries/${id}/replies`,'POST',{text}),
  schedule:(from:Date,to:Date)=>request<ApiLesson[]>(`/api/schedule?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`),
  materials:()=>request<ApiMaterial[]>('/api/materials'),
  assignments:()=>request<ApiAssignment[]>('/api/materials/assignments'),
  uploadMaterial:(input:object)=>request('/api/materials','POST',input),
  deleteMaterial:(id:string)=>request(`/api/materials/${id}`,'DELETE'),
}
export async function downloadFile(path:string,fileName:string,body?:object) {
  const response=await fetch(path,{credentials:'same-origin',method:body?'POST':'GET',headers:body?{'Content-Type':'application/json','X-CSRF-Protection':'1'}:undefined,body:body?JSON.stringify(body):undefined})
  if(!response.ok){const payload=await response.json().catch(()=>null);throw new ApiError(response.status,payload?.error?.message??'Не удалось скачать файл')}
  const url=URL.createObjectURL(await response.blob()),a=document.createElement('a');a.href=url;a.download=fileName;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
