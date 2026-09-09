// EduNex API client - clean module rewrite

const BASE_URL = 'http://localhost:5000/api';
const API_ORIGIN = BASE_URL.replace(/\/api\/?$/, '');

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

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

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
  searchFacultyStudents: (search = '') => request(`/faculty/student-details/search?search=${encodeURIComponent(search)}`),
  getFacultyStudentDetails: (studentId) => request(`/faculty/student-details/${studentId}`),

  getProfile: () => request('/students/profile'),
  getAttendance: () => request('/students/attendance'),
  getMarks: () => request('/students/marks'),
  getMarksheet: () => request('/students/marksheet'),
  getAchievements: () => request('/students/achievements'),
  addAchievement: (formData) => request('/students/achievements', { method: 'POST', body: formData }),
  getElectiveOptions: () => request('/students/electives'),
  getElectiveChoice: () => request('/students/electives/choice'),
  submitElectiveChoice: (data) => request('/students/electives', { method: 'POST', body: JSON.stringify(data) }),
  getSubjects: () => request('/subjects'),

  getAssignments: (subjectId) => request(`/assignments${subjectId ? `?subjectId=${subjectId}` : ''}`),
  getFacultyAssignments: () => request('/assignments/faculty'),
  createAssignment: (formData) => request('/assignments', { method: 'POST', body: formData }),
  submitAssignment: (assignmentId, formData) => request(`/assignments/${assignmentId}/submit`, { method: 'POST', body: formData }),
  getStudentSubmission: (assignmentId) => request(`/assignment-submissions/student/${assignmentId}`),
  getAssignmentSubmissions: (assignmentId) => request(`/assignments/${assignmentId}/submissions`),
  approveAssignmentSubmission: (submissionId) => request(`/assignments/submissions/${submissionId}/approve`, { method: 'PUT' }),
  rejectAssignmentSubmission: (submissionId) => request(`/assignments/submissions/${submissionId}/reject`, { method: 'PUT' }),

  searchStudentsForMarks: (search = '') => request(`/marks/students/search?search=${encodeURIComponent(search)}`),
  getStudentForMarks: (studentId) => request(`/marks/student/${studentId}`),
  getStudentSubjectsForMarks: (studentId) => request(`/marks/student/${studentId}/subjects`),
  getStudentMarksForExam: (studentId, examType) => request(`/marks/student/${studentId}/marks?examType=${encodeURIComponent(examType)}`),
  saveBulkMarks: (data) => request('/marks/bulk', { method: 'POST', body: JSON.stringify(data) }),
  publishMark: (markId) => request(`/marks/${markId}/publish`, { method: 'PUT' }),
  getStudentPublishedMarks: () => request('/marks/student'),

  searchStudentsForMarksheet: (search = '') => request(`/marksheets/faculty/students/search?search=${encodeURIComponent(search)}`),
  getFacultyMarksheets: () => request('/marksheets/faculty'),
  uploadMarksheet: (formData) => request('/marksheets/faculty/upload', { method: 'POST', body: formData }),
  deleteMarksheet: (marksheetId) => request(`/marksheets/faculty/${marksheetId}`, { method: 'DELETE' }),
  getPublishedMarksheets: () => request('/marksheets/student'),

  getAttendanceStudents: (subjectId) => request(`/attendance/students?subjectId=${subjectId}`),
  markAttendance: (data) => request('/attendance', { method: 'POST', body: JSON.stringify(data) }),
  getStudentAttendance: () => request('/attendance/student'),
  getAttendanceSummary: () => request('/attendance/summary'),

  getMaterials: (subjectId) => request(`/materials${subjectId ? `?subjectId=${subjectId}` : ''}`),
  createMaterial: (formData) => request('/materials', { method: 'POST', body: formData }),

  chat: (message) => request('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  }),

  getDashboard: async () => {
    const [profile, attendance, marks, assignments] = await Promise.all([
      request('/students/profile'),
      request('/students/attendance'),
      request('/students/marks'),
      request('/assignments'),
    ]);
    return { profile, attendance, marks, assignments };
  },

  getFileUrl: (filePath) => {
    if (!filePath) return '#';
    if (/^https?:\/\//i.test(filePath)) return filePath;
    return `${API_ORIGIN}${filePath.startsWith('/') ? filePath : `/${filePath}`}`;
  },
};

export { getToken };
