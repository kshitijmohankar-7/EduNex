// Mock data lets the UI run standalone (npm run dev) before the backend/DB is wired up.
// Swap services/api.js calls from mock imports to real fetch calls once the server is running.

export const mockUser = {
  student: { id: 1, fullName: 'Asha Patel', role: 'student', studentCode: 'CSE2025001' },
  faculty: { id: 2, fullName: 'Dr. Rohan Mehta', role: 'faculty', facultyCode: 'FAC001' },
  admin: { id: 3, fullName: 'College Admin', role: 'admin' },
};

export const mockProfile = {
  studentCode: 'CSE2025001',
  fullName: 'Asha Patel',
  department: 'Computer Science',
  course: 'B.Tech Computer Science',
  semester: 3,
  division: 'A',
  academicYear: '2025-2026',
};

export const mockDashboardStats = {
  attendance: 87,
  sgpa: 8.4,
  ct1Average: 78,
  ct2Average: 82,
  assignmentsCompleted: 8,
  assignmentsTotal: 10,
};

export const mockMarks = [
  { subject: 'Mathematics III', code: 'MATH301', ct1: 78, ct2: 82, endSem: 84 },
  { subject: 'Database Management Systems', code: 'DBMS301', ct1: 75, ct2: 80, endSem: 86 },
  { subject: 'Physics', code: 'PHY301', ct1: 70, ct2: 74, endSem: 79 },
  { subject: 'Programming Fundamentals', code: 'PROG301', ct1: 88, ct2: 91, endSem: 94 },
];

export const mockAttendance = [
  { subject: 'Mathematics III', code: 'MATH301', percentage: 92 },
  { subject: 'Database Management Systems', code: 'DBMS301', percentage: 85 },
  { subject: 'Physics', code: 'PHY301', percentage: 74 },
  { subject: 'Programming Fundamentals', code: 'PROG301', percentage: 96 },
];

export const mockPerformanceTrend = [
  { term: 'Sem 1', sgpa: 7.6 },
  { term: 'Sem 2', sgpa: 7.9 },
  { term: 'Sem 3 (CT-1)', sgpa: 8.1 },
  { term: 'Sem 3 (CT-2)', sgpa: 8.4 },
];

export const mockAssignments = [
  { id: 1, subject: 'DBMS301', title: 'SQL Queries Assignment', deadline: '2026-08-28', status: 'pending' },
  { id: 2, subject: 'MATH301', title: 'Differential Equations Set 4', deadline: '2026-08-25', status: 'submitted' },
  { id: 3, subject: 'PROG301', title: 'Linked List Implementation', deadline: '2026-08-30', status: 'pending' },
];

export const mockMaterials = [
  { subject: 'DBMS301', unit: 'Unit 1', title: 'Relational Model Notes', type: 'pdf' },
  { subject: 'DBMS301', unit: 'Unit 2', title: 'Normalization Notes', type: 'pdf' },
  { subject: 'MATH301', unit: 'Unit 1', title: 'Laplace Transforms', type: 'pdf' },
  { subject: 'MATH301', unit: 'Formulas', title: 'Important Formulas Sheet', type: 'pdf' },
];

export const mockAchievements = [
  { title: 'Winner — Inter-College Hackathon', organization: 'TechFest 2026', date: '2026-03-14' },
  { title: 'AWS Cloud Practitioner Certification', organization: 'Amazon Web Services', date: '2026-01-20' },
];

export const mockFacultyClassOverview = [
  { studentCode: 'CSE2025001', name: 'Asha Patel', attendance: 87, ct2: 82, trend: 'improving' },
  { studentCode: 'CSE2025002', name: 'Vikram Rao', attendance: 64, ct2: 47, trend: 'declining' },
  { studentCode: 'CSE2025003', name: 'Meera Shah', attendance: 91, ct2: 88, trend: 'stable' },
  { studentCode: 'CSE2025004', name: 'Kabir Singh', attendance: 58, ct2: 52, trend: 'declining' },
];

export const mockAnnouncements = [
  { title: 'Mid-semester examination schedule released', date: '2026-08-20' },
  { title: 'DBMS assignment deadline extended to Aug 28', date: '2026-08-19' },
];
