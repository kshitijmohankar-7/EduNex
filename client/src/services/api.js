// Thin fetch wrapper around the EduNex REST API.

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

function getToken() {
  return localStorage.getItem('edunex_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  if (!isFormData) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export const api = {
  login: (email, password) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),

  getFacultyStudents: (subjectId, divisionId) =>
    request(`/faculty/students?subjectId=${subjectId}${divisionId ? `&divisionId=${divisionId}` : ''}`),

  getSubjectChoices: () => request('/faculty/subject-choices'),
  approveSubjectChoice: (choiceId) => request(`/faculty/subject-choices/${choiceId}/approve`, { method: 'POST' }),
  rejectSubjectChoice: (choiceId) => request(`/faculty/subject-choices/${choiceId}/reject`, { method: 'POST' }),

  getProfile: () => request('/students/profile'),
  getAttendance: () => request('/students/attendance'),
  getMarks: () => request('/students/marks'),
  getMarksheet: () => request('/students/marksheet'),
  getAchievements: () => request('/students/achievements'),

  getElectiveOptions: () => request('/students/electives'),
  getElectiveChoice: () => request('/students/electives/choice'),
  submitElectiveChoice: (data) => request('/students/electives', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  getSubjects: () => request('/subjects'),

  getAssignments: (subjectId) => request(`/assignments${subjectId ? `?subjectId=${subjectId}` : ''}`),
  getFacultyAssignments: () => request('/assignments/faculty'),
  createAssignment: (formData) => request('/assignments', { method: 'POST', body: formData }),

  submitAssignment: (assignmentId, formData) => request(`/assignments/${assignmentId}/submit`, {
    method: 'POST',
    body: formData,
  }),
  getStudentSubmission: (assignmentId) => request(`/assignment-submissions/student/${assignmentId}`),
  getAssignmentSubmissions: (assignmentId) => request(`/assignments/${assignmentId}/submissions`),
  approveAssignmentSubmission: (submissionId) => request(`/assignments/submissions/${submissionId}/approve`, { method: 'PUT' }),
  rejectAssignmentSubmission: (submissionId) => request(`/assignments/submissions/${submissionId}/reject`, { method: 'PUT' }),

  // FACULTY MARKS
  searchStudentsForMarks: (search = '') =>
    request(`/marks/students/search?search=${encodeURIComponent(search)}`),
  getStudentForMarks: (studentId) => request(`/marks/student/${studentId}`),
  getStudentSubjectsForMarks: (studentId) => request(`/marks/student/${studentId}/subjects`),
  getStudentMarksForExam: (studentId, examType) =>
    request(`/marks/student/${studentId}/marks?examType=${encodeURIComponent(examType)}`),
  saveBulkMarks: (data) => request('/marks/bulk', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  publishMark: (markId) => request(`/marks/${markId}/publish`, { method: 'PUT' }),
  getStudentPublishedMarks: () => request('/marks/student'),

  // FACULTY MARKSHEETS
  searchStudentsForMarksheet: (search = '') =>
    request(`/marksheets/faculty/students/search?search=${encodeURIComponent(search)}`),
  uploadMarksheet: (formData) => request('/marksheets/faculty/upload', {
    method: 'POST',
    body: formData,
  }),
  getPublishedMarksheets: () => request('/marksheets/student'),

  // ATTENDANCE
  getAttendanceStudents: (subjectId) => request(`/attendance/students?subjectId=${subjectId}`),
  markAttendance: (data) => request('/attendance', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getStudentAttendance: () => request('/attendance/student'),
  getAttendanceSummary: () => request('/attendance/summary'),

  // STUDY MATERIALS
  getMaterials: (subjectId) => request(`/materials${subjectId ? `?subjectId=${subjectId}` : ''}`),
  createMaterial: (formData) => request('/materials', { method: 'POST', body: formData }),

  // AI
  chat: (message) => request('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  }),

  // DASHBOARD
  getDashboard: async () => {
    const [profile, attendance, marks, assignments] = await Promise.all([
      request('/students/profile'),
      request('/students/attendance'),
      request('/students/marks'),
      request('/assignments'),
    ]);
    return { profile, attendance, marks, assignments };
  },
};

export { getToken };
