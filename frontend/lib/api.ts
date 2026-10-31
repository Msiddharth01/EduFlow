/**
 * Centralized API client for the Learning Assistant backend.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Resolve relative or absolute avatar URL to a full loadable URL
 */
export function getAvatarUrl(url?: string | null): string {
  if (!url) return '';
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    return url;
  }
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
  const backendOrigin = apiBase.replace(/\/api\/?$/, '');
  return `${backendOrigin}${url.startsWith('/') ? '' : '/'}${url}`;
}

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('token') || sessionStorage.getItem('token')
      : null;

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const incomingHeaders = (options.headers as Record<string, string>) || {};

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...incomingHeaders,
  };

  const authVal =
    incomingHeaders['Authorization'] ||
    (token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : undefined);

  if (authVal) {
    headers['Authorization'] = authVal;
  }

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error || 'An unknown error occurred.' };
    return { success: true, data: json as T };
  } catch {
    return { success: false, error: 'Network error. Is the backend server running?' };
  }
}

export const authApi = {
  register: (body: { name: string; email: string; password: string; role: string }) =>
    apiFetch<{ token: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    apiFetch<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  getMe: (token?: string) =>
    apiFetch<{ user: UserWithEnrollments }>('/auth/me', {
      headers: token ? { Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}` } : {},
    }),
};

export const profileApi = {
  getProfile: (token?: string) =>
    apiFetch<ProfileData>('/auth/profile', {
      headers: token ? { Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}` } : {},
    }),
  updateProfile: (body: { name: string; profileImage?: string | null }, token?: string) =>
    apiFetch<{ message: string; user: User }>('/auth/profile', {
      method: 'PUT',
      headers: token ? { Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}` } : {},
      body: JSON.stringify(body),
    }),
  uploadAvatar: (formData: FormData, token?: string) =>
    apiFetch<{ message: string; avatarUrl: string; user: User }>('/auth/profile/avatar', {
      method: 'POST',
      headers: token ? { Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}` } : {},
      body: formData,
    }),
};

export const notificationApi = {
  list: () => apiFetch<{ notifications: AppNotification[]; unreadCount: number }>('/notifications'),
  markAsRead: (id: string) =>
    apiFetch<{ message: string; notification: AppNotification }>(`/notifications/${id}/read`, {
      method: 'PATCH',
    }),
  markAllAsRead: () =>
    apiFetch<{ message: string }>('/notifications/read-all', {
      method: 'PATCH',
    }),
};

export const courseApi = {
  list: () => apiFetch<{ courses: CourseWithMeta[] }>('/courses'),
  get: (courseId: string) =>
    apiFetch<{ course: CourseDetails; userRole: string }>(`/courses/${courseId}`),
  create: (body: { code: string; title: string; description?: string }) =>
    apiFetch<{ course: Course }>('/courses', { method: 'POST', body: JSON.stringify(body) }),
  enroll: (courseCode: string) =>
    apiFetch<{ message: string }>('/courses/enroll', { method: 'POST', body: JSON.stringify({ courseCode }) }),
};

export const materialApi = {
  upload: (courseId: string, formData: FormData) =>
    apiFetch<{ message: string; material: MaterialSummary }>(`/courses/${courseId}/materials`, {
      method: 'POST',
      body: formData,
    }),
  fetchPdfBlob: async (
    materialId: string
  ): Promise<{ success: true; blobUrl: string } | { success: false; error: string; status?: number }> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      return { success: false, error: 'Access denied. No authentication token provided.', status: 401 };
    }

    try {
      const res = await fetch(`${BASE_URL}/materials/${materialId}/file`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        let errMsg = `Failed to load PDF (HTTP ${res.status})`;
        try {
          const errData = await res.json();
          if (errData.error) errMsg = errData.error;
        } catch {
          // ignore json parse error
        }
        return { success: false, error: errMsg, status: res.status };
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/pdf')) {
        return { success: false, error: 'Server did not return a valid PDF document.' };
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      return { success: true, blobUrl };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error fetching PDF document.' };
    }
  },
  getFileUrl: (materialId: string) => `${BASE_URL}/materials/${materialId}/file`,
  getFileUrlWithToken: (materialId: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return token
      ? `${BASE_URL}/materials/${materialId}/file?token=${encodeURIComponent(token)}`
      : `${BASE_URL}/materials/${materialId}/file`;
  },
  retry: (materialId: string) =>
    apiFetch<{ message: string; material: MaterialSummary }>(`/materials/${materialId}/retry`, {
      method: 'POST',
    }),
};

export const tutorApi = {
  ask: (courseId: string, body: { question: string; materialId?: string }) =>
    apiFetch<{ answer: string; citations: Citation[]; ollamaActive: boolean }>(`/courses/${courseId}/tutor`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  generateSummary: (courseId: string, body: { materialId: string; summaryType: 'concise' | 'detailed' | 'revision-notes' }) =>
    apiFetch<{ summary: string; materialTitle: string; summaryType: string }>(`/courses/${courseId}/summaries`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

export const quizApi = {
  list: (courseId: string) =>
    apiFetch<{ quizzes: QuizWithMeta[] }>(`/courses/${courseId}/quizzes`),
  get: (quizId: string) =>
    apiFetch<{ quiz: QuizWithQuestions }>(`/quizzes/${quizId}`),
  submit: (quizId: string, answers: Array<{ questionId: string; selectedOption: number }>) =>
    apiFetch<{
      message: string;
      attempt: { id: string; score: number; maxScore: number; percentage: number; createdAt: string };
      results: EvaluatedAnswer[];
    }>(`/quizzes/${quizId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    }),
  create: (courseId: string, body: CreateQuizPayload) =>
    apiFetch<{ message: string; quiz: any }>(`/courses/${courseId}/quizzes`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  generate: (courseId: string, body: { materialId?: string; topic?: string; questionCount?: number; force?: boolean }) =>
    apiFetch<{ message: string; quiz?: any; quizzes?: any[] }>(`/courses/${courseId}/quizzes/generate`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  generateMissing: (courseId: string) =>
    apiFetch<{ message: string; processedCount: number; quizzes: any[] }>(`/courses/${courseId}/quizzes/generate-missing`, {
      method: 'POST',
    }),
  retry: (quizId: string) =>
    apiFetch<{ message: string; success: boolean }>(`/quizzes/${quizId}/retry`, {
      method: 'POST',
    }),
};

export const analyticsApi = {
  getStudentAnalytics: () =>
    apiFetch<{ analytics: StudentAnalytics }>('/analytics/me'),
};

export const teacherApi = {
  getDashboard: () =>
    apiFetch<TeacherDashboardData>('/teacher/dashboard'),
  getStudents: (params?: { courseId?: string; courseCode?: string }) => {
    const query = new URLSearchParams();
    if (params?.courseId && params.courseId !== 'ALL') query.append('courseId', params.courseId);
    if (params?.courseCode && params.courseCode !== 'ALL') query.append('courseCode', params.courseCode);
    const queryString = query.toString();
    return apiFetch<{ students: TeacherStudentItem[] }>(
      queryString ? `/teacher/students?${queryString}` : '/teacher/students'
    );
  },
  getQuizzes: () =>
    apiFetch<{ quizzes: TeacherQuizItem[] }>('/teacher/quizzes'),
  getMaterials: () =>
    apiFetch<{ materials: TeacherMaterialItem[] }>('/teacher/materials'),
  getCourseAnalytics: (courseId: string) =>
    apiFetch<TeacherCourseAnalytics>(`/courses/${courseId}/teacher-analytics`),
};

// Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'STUDENT' | 'PROFESSOR' | 'ADMIN';
  profileImage?: string | null;
  createdAt?: string;
}

export interface LoginActivityData {
  firstAccessAt: string;
  lastAccessAt: string;
}

export interface StudentProfileCourse {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  professorName: string;
  enrollmentDate?: string;
  materialsCount: number;
  quizzesCount: number;
  courseStatus: string;
  progress: number;
}

export interface ProfessorProfileCourse {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  totalEnrolledStudents: number;
  totalUploadedMaterials: number;
  totalQuizzes: number;
  createdAt: string;
  courseStatus: string;
}

export interface ProfessorTeachingOverview {
  totalCoursesCreated: number;
  totalEnrolledStudents: number;
  totalMaterialsUploaded: number;
  totalQuizzesCreated: number;
}

export interface ProfileData {
  user: User;
  loginActivity: LoginActivityData;
  enrolledCourses?: StudentProfileCourse[];
  coursesCreated?: ProfessorProfileCourse[];
  teachingOverview?: ProfessorTeachingOverview;
}

export interface AppNotification {
  id: string;
  recipientUserId: string;
  courseId?: string | null;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  relatedResourceId?: string | null;
  linkUrl?: string | null;
  createdAt: string;
  course?: {
    id: string;
    code: string;
    title: string;
  } | null;
}

export interface UserWithEnrollments extends User {
  enrollments: Enrollment[];
}

export interface Course {
  id: string;
  code: string;
  title: string;
  description?: string;
  createdAt: string;
}

export interface CourseWithMeta extends Course {
  myRoleInCourse: 'STUDENT' | 'PROFESSOR' | 'ADMIN';
  professor?: string;
  progress?: number;
  materials?: Array<{ id: string; title: string; fileName: string; status: string }>;
  _count?: {
    materials: number;
    quizzes: number;
    enrollments: number;
  };
}

export interface CourseDetails extends Course {
  professor?: string;
  materials: MaterialSummary[];
  quizzes: QuizSummary[];
}

export interface MaterialSummary {
  id: string;
  title: string;
  fileName: string;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
  errorMessage?: string;
  createdAt: string;
  uploader?: { name: string; email: string };
}

export interface QuizSummary {
  id: string;
  title: string;
  topic: string;
  createdAt: string;
  _count: { questions: number };
}

export interface QuizWithMeta {
  id: string;
  courseId?: string;
  materialId?: string | null;
  title: string;
  topic: string;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
  errorMessage?: string | null;
  material?: { id: string; title: string; fileName: string; status: string } | null;
  createdAt: string;
  questionCount: number;
  totalAttempts: number;
  myLatestAttempt: { id: string; score: number; maxScore: number; createdAt: string } | null;
}

export interface QuestionForStudent {
  id: string;
  questionText: string;
  options: string[];
  pageReference?: number | null;
}

export interface QuizWithQuestions {
  id: string;
  title: string;
  topic: string;
  course: Course;
  questions: QuestionForStudent[];
}

export interface EvaluatedAnswer {
  questionId: string;
  selectedOption: number;
  isCorrect: boolean;
  correctOption: number;
  explanation: string;
  questionText: string;
}

export interface CreateQuizPayload {
  title: string;
  topic: string;
  materialId?: string;
  questions: Array<{
    questionText: string;
    options: string[];
    correctIndex: number;
    explanation?: string;
    pageReference?: number;
  }>;
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  role: string;
  course?: Course;
}

export interface Citation {
  documentTitle: string;
  fileName: string;
  pageNumber: number;
  snippet: string;
}

export interface StudentAnalytics {
  quizzesAttempted: number;
  averageScore: number;
  topicsPerformance: Array<{
    topic: string;
    accuracy: number;
    totalQuestions: number;
    correctQuestions: number;
    attempts: number;
    courseCode: string;
    courseTitle: string;
  }>;
  weakTopics: Array<{
    topic: string;
    accuracy: number;
    totalQuestions: number;
    correctQuestions: number;
    attempts: number;
    courseCode: string;
    courseTitle: string;
  }>;
  recommendations: Array<{
    topic: string;
    courseCode: string;
    courseTitle: string;
    accuracy: number;
    advice: string;
  }>;
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    topic: string;
    courseCode: string;
    score: number;
    maxScore: number;
    percentage: number;
    createdAt: string;
  }>;
}

export interface TeacherDashboardData {
  summary: {
    totalStudents: number;
    averageQuizScore: number;
    studentsNeedingSupportCount: number;
    totalMaterials: number;
    totalQuizzes: number;
    totalCourses: number;
    totalAttempts: number;
  };
  courses: TeacherCourseOverviewItem[];
  students: TeacherStudentItem[];
  weakTopics: TeacherWeakTopicItem[];
  quizzes: TeacherQuizItem[];
}

export interface TeacherStudentItem {
  id: string;
  name: string;
  email: string;
  profileImage?: string | null;
  courseCount?: number;
  courses?: Array<{ courseId: string; courseCode: string; courseTitle: string; enrolledAt: string }>;
  enrolledCourses?: Array<{ courseId: string; courseCode: string; courseTitle: string; enrolledAt: string }>;
  totalAttempts: number;
  averageScore: number | null;
  status: 'NEEDS_SUPPORT' | 'GOOD' | 'NO_ATTEMPTS';
  lastActivity: string | null;
  attempts?: Array<{
    attemptId?: string;
    id?: string;
    quizId: string;
    quizTitle: string;
    courseCode?: string;
    score: number;
    maxScore: number;
    percentage: number;
    createdAt: string;
  }>;
}

export interface TeacherWeakTopicItem {
  topic: string;
  materialTitle: string;
  materialFileName: string;
  materialId: string | null;
  quizId: string;
  quizTitle: string;
  totalAnswers: number;
  accuracyRate: number;
  incorrectCount: number;
  affectedStudentsCount: number;
  isWeak: boolean;
  sampleQuestions: Array<{
    id: string;
    text: string;
    pageReference: number | null;
    incorrectCount: number;
  }>;
}

export interface TeacherCourseOverviewItem {
  id: string;
  code: string;
  title: string;
  description: string | null;
  enrollmentCount: number;
  materialCount: number;
  quizCount: number;
  totalAttempts: number;
  classAverage: number | null;
  createdAt: string;
}

export interface TeacherQuizItem {
  id: string;
  courseId?: string;
  courseCode?: string;
  materialId?: string | null;
  materialTitle?: string | null;
  materialFileName?: string | null;
  title: string;
  topic: string;
  status: string;
  errorMessage?: string | null;
  course?: { id: string; code: string; title: string };
  material?: { id: string; title: string; fileName: string; status: string } | null;
  questionCount: number;
  attemptsCount: number;
  averageScore: number | null;
  scoreDistribution?: { below50: number; from50to70: number; from70to90: number; above90: number };
  questions?: Array<{
    id: string;
    questionText: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    pageReference: number | null;
    totalResponses: number;
    correctResponses: number;
    incorrectResponses: number;
    successRate: number;
  }>;
  attempts?: Array<{
    id: string;
    studentId: string;
    studentName: string;
    studentEmail: string;
    score: number;
    maxScore: number;
    percentage: number;
    createdAt: string;
  }>;
  latestAttemptDate?: string | null;
}

export interface TeacherCourseAnalytics {
  course: {
    id: string;
    code: string;
    title: string;
    description: string | null;
  };
  stats: {
    enrollmentCount: number;
    materialCount: number;
    quizCount: number;
    totalAttempts: number;
    classAverage: number | null;
    studentsNeedingSupport: number;
  };
  students: Array<{
    id: string;
    name: string;
    email: string;
    enrolledAt: string;
    totalAttempts: number;
    averageScore: number | null;
    status: 'NEEDS_SUPPORT' | 'GOOD' | 'NO_ATTEMPTS';
    attempts: Array<{
      id: string;
      score: number;
      maxScore: number;
      percentage: number;
      createdAt: string;
    }>;
  }>;
  materials: MaterialSummary[];
  quizzes: Array<{
    id: string;
    title: string;
    topic: string;
    status: string;
    questionCount: number;
    attemptsCount: number;
    materialTitle: string | null;
    materialFileName: string | null;
  }>;
  questionAnalytics: Array<{
    id: string;
    quizId: string;
    quizTitle: string;
    topic: string;
    questionText: string;
    pageReference: number | null;
    totalResponses: number;
    correctResponses: number;
    incorrectResponses: number;
    successRate: number;
  }>;
}

export interface TeacherMaterialItem {
  id: string;
  title: string;
  fileName: string;
  filePath?: string;
  fileSize?: number | null;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
  errorMessage?: string | null;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  chunksCount: number;
  quizzes: Array<{
    id: string;
    title: string;
    status: string;
    _count: { questions: number };
  }>;
  createdAt: string;
}


