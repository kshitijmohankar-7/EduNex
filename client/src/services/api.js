// Thin fetch wrapper around the EduNex REST API.

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';


// ======================================================
// TOKEN
// ======================================================

function getToken() {
  return localStorage.getItem('edunex_token');
}


// ======================================================
// REQUEST HELPER
// ======================================================

async function request(path, options = {}) {
  const token = getToken();

  const isFormData =
    options.body instanceof FormData;

  const headers = {
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
    ...options.headers,
  };

  // Do NOT manually set Content-Type for FormData.
  // Browser automatically adds multipart boundary.
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(
    `${BASE_URL}${path}`,
    {
      ...options,
      headers,
    }
  );

  if (!response.ok) {
    const body =
      await response
        .json()
        .catch(() => ({}));

    throw new Error(
      body.error ||
        `Request failed with status ${response.status}`
    );
  }

  return response.json();
}


// ======================================================
// API
// ======================================================

export const api = {

  // ====================================================
  // AUTHENTICATION
  // ====================================================

  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
      }),
    }),


  // ====================================================
  // FACULTY
  // ====================================================

  getFacultyStudents: (
    subjectId,
    divisionId
  ) =>
    request(
      `/faculty/students?subjectId=${subjectId}${
        divisionId
          ? `&divisionId=${divisionId}`
          : ''
      }`
    ),


  // ====================================================
  // FACULTY SUBJECT CHOICES
  // ====================================================

  getSubjectChoices: () =>
    request('/faculty/subject-choices'),

  approveSubjectChoice: (
    choiceId
  ) =>
    request(
      `/faculty/subject-choices/${choiceId}/approve`,
      {
        method: 'POST',
      }
    ),

  rejectSubjectChoice: (
    choiceId
  ) =>
    request(
      `/faculty/subject-choices/${choiceId}/reject`,
      {
        method: 'POST',
      }
    ),


  // ====================================================
  // STUDENT
  // ====================================================

  getProfile: () =>
    request('/students/profile'),

  getAttendance: () =>
    request('/students/attendance'),

  getMarks: () =>
    request('/students/marks'),

  getMarksheet: () =>
    request('/students/marksheet'),

  getAchievements: () =>
    request('/students/achievements'),


  // ====================================================
  // STUDENT ELECTIVES
  // ====================================================

  getElectiveOptions: () =>
    request('/students/electives'),

  getElectiveChoice: () =>
    request(
      '/students/electives/choice'
    ),

  submitElectiveChoice: (
    data
  ) =>
    request(
      '/students/electives',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),


  // ====================================================
  // SUBJECTS
  // ====================================================

  getSubjects: () =>
    request('/subjects'),


  // ====================================================
  // ASSIGNMENTS
  // ====================================================

  // Student - view assignments
  getAssignments: (
    subjectId
  ) =>
    request(
      `/assignments${
        subjectId
          ? `?subjectId=${subjectId}`
          : ''
      }`
    ),

  // Faculty - view assignments
  getFacultyAssignments: () =>
    request(
      '/assignments/faculty'
    ),

  // Faculty - create assignment
  createAssignment: (
    formData
  ) =>
    request(
      '/assignments',
      {
        method: 'POST',
        body: formData,
      }
    ),


  // ====================================================
  // ASSIGNMENT SUBMISSIONS
  // ====================================================

  // Student - submit assignment
  submitAssignment: (
    assignmentId,
    formData
  ) =>
    request(
      `/assignments/${assignmentId}/submit`,
      {
        method: 'POST',
        body: formData,
      }
    ),

  // Student - get own submission
  getStudentSubmission: (
    assignmentId
  ) =>
    request(
      `/assignment-submissions/student/${assignmentId}`
    ),

  // Faculty - view submissions
  getAssignmentSubmissions: (
    assignmentId
  ) =>
    request(
      `/assignments/${assignmentId}/submissions`
    ),

  // Faculty - approve submission
  approveAssignmentSubmission: (
    submissionId
  ) =>
    request(
      `/assignments/submissions/${submissionId}/approve`,
      {
        method: 'PUT',
      }
    ),

  // Faculty - reject submission
  rejectAssignmentSubmission: (
    submissionId
  ) =>
    request(
      `/assignments/submissions/${submissionId}/reject`,
      {
        method: 'PUT',
      }
    ),


  // ====================================================
  // MARKS
  // ====================================================
  //
  // These functions match the current marksRoutes.js
  //
  // ====================================================


  // ----------------------------------------------------
  // FACULTY - SEARCH STUDENTS
  // ----------------------------------------------------
  //
  // GET
  // /api/marks/students/search?search=kshitij
  //

  searchStudentsForMarks: (
    search = ''
  ) =>
    request(
      `/marks/students/search?search=${encodeURIComponent(
        search
      )}`
    ),


  // ----------------------------------------------------
  // FACULTY - GET SELECTED STUDENT
  // ----------------------------------------------------
  //
  // GET
  // /api/marks/student/:studentId
  //

  getStudentForMarks: (
    studentId
  ) =>
    request(
      `/marks/student/${studentId}`
    ),


  // ----------------------------------------------------
  // FACULTY - GET ENROLLED SUBJECTS
  // ----------------------------------------------------
  //
  // GET
  // /api/marks/student/:studentId/subjects
  //

  getStudentSubjects: (
    studentId
  ) =>
    request(
      `/marks/student/${studentId}/subjects`
    ),


  // Alias in case FacultyMarks.jsx
  // uses the longer function name.
  getStudentSubjectsForMarks: (
    studentId
  ) =>
    request(
      `/marks/student/${studentId}/subjects`
    ),


  // ----------------------------------------------------
  // FACULTY - GET EXISTING MARKS
  // ----------------------------------------------------
  //
  // GET
  // /api/marks/student/:studentId/marks?examType=CT1
  //

  getStudentMarksForExam: (
    studentId,
    examType
  ) =>
    request(
      `/marks/student/${studentId}/marks?examType=${encodeURIComponent(
        examType
      )}`
    ),


  // ----------------------------------------------------
  // FACULTY - SAVE BULK MARKS
  // ----------------------------------------------------
  //
  // POST
  // /api/marks/bulk
  //

  saveBulkMarks: (
    data
  ) =>
    request(
      '/marks/bulk',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),


  // Alias in case FacultyMarks.jsx
  // uses saveMarks().
  saveMarks: (
    data
  ) =>
    request(
      '/marks/bulk',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),


  // ----------------------------------------------------
  // FACULTY - PUBLISH MARK
  // ----------------------------------------------------
  //
  // PUT
  // /api/marks/:markId/publish
  //

  publishMarks: (
    markId
  ) =>
    request(
      `/marks/${markId}/publish`,
      {
        method: 'PUT',
      }
    ),


  // ----------------------------------------------------
  // STUDENT - GET OWN PUBLISHED MARKS
  // ----------------------------------------------------
  //
  // GET
  // /api/marks/student
  //

  getStudentMarks: () =>
    request('/marks/student'),


  // ----------------------------------------------------
  // OLD COMPATIBILITY FUNCTION
  // ----------------------------------------------------
  //
  // If another existing page calls this function,
  // keep it working.
  //
  // GET
  // /api/marks/students?subjectId=1
  //

  getMarksStudents: (
    subjectId
  ) =>
    request(
      `/marks/students?subjectId=${subjectId}`
    ),


  // ====================================================
  // ATTENDANCE
  // ====================================================

  getAttendanceStudents: (
    subjectId
  ) =>
    request(
      `/attendance/students?subjectId=${subjectId}`
    ),

  markAttendance: (
    data
  ) =>
    request(
      '/attendance',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),

  getStudentAttendance: () =>
    request(
      '/attendance/student'
    ),

  getAttendanceSummary: () =>
    request(
      '/attendance/summary'
    ),


  // ====================================================
  // STUDY MATERIALS
  // ====================================================

  getMaterials: (
    subjectId
  ) =>
    request(
      `/materials${
        subjectId
          ? `?subjectId=${subjectId}`
          : ''
      }`
    ),

  createMaterial: (
    formData
  ) =>
    request(
      '/materials',
      {
        method: 'POST',
        body: formData,
      }
    ),


  // ====================================================
  // AI ASSISTANT
  // ====================================================

  chat: (
    message
  ) =>
    request(
      '/ai/chat',
      {
        method: 'POST',
        body: JSON.stringify({
          message,
        }),
      }
    ),


  // ====================================================
  // DASHBOARD
  // ====================================================

  getDashboard: async () => {

    const [
      profile,
      attendance,
      marks,
      assignments,
    ] = await Promise.all([

      request(
        '/students/profile'
      ),

      request(
        '/students/attendance'
      ),

      request(
        '/students/marks'
      ),

      request(
        '/assignments'
      ),

    ]);

    return {
      profile,
      attendance,
      marks,
      assignments,
    };
  },

};


// ======================================================
// EXPORT TOKEN HELPER
// ======================================================

export {
  getToken,
};