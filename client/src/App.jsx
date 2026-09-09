import FacultyMarks from './pages/FacultyMarks';
import FacultyMarksheets from './pages/FacultyMarksheets';
import FacultyAssignments from './pages/FacultyAssignments';
import FacultyAssignmentSubmissions from './pages/FacultyAssignmentSubmissions';
import FacultyMaterials from './pages/FacultyMaterials';
import Profile from './pages/profile';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import AppShell from './components/AppShell';
import StudentDashboard from './pages/StudentDashboard';
import Attendance from './pages/Attendance';
import StudentElectives from './pages/StudentElectives';
import FacultyAttendance from './pages/FacultyAttendance';
import Marksheet from './pages/Marksheet';
import Assignments from './pages/Assignments';
import StudyMaterials from './pages/StudyMaterials';
import Achievements from './pages/Achievements';
import AIChat from './pages/AIChat';
import FacultyDashboard from './pages/FacultyDashboard';
import AdminDashboard from './pages/AdminDashboard';

function Protected({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function RoleHome() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'faculty') return <Navigate to="/faculty" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RoleHome />} />

      <Route element={<Protected roles={['student']}><AppShell /></Protected>}>
        <Route path="/dashboard" element={<StudentDashboard />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/student/electives" element={<StudentElectives />} />
        <Route path="/marksheet" element={<Marksheet />} />
        <Route path="/assignments" element={<Assignments />} />
        <Route path="/materials" element={<StudyMaterials />} />
        <Route path="/achievements" element={<Achievements />} />
        <Route path="/ai" element={<AIChat />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route element={<Protected roles={['faculty']}><AppShell /></Protected>}>
        <Route path="/faculty" element={<FacultyDashboard />} />
        <Route path="/faculty/attendance" element={<FacultyAttendance />} />
        <Route path="/faculty/assignments" element={<FacultyAssignments />} />
        <Route path="/faculty/assignments/:assignmentId/submissions" element={<FacultyAssignmentSubmissions />} />
        <Route path="/faculty/materials" element={<FacultyMaterials />} />
        <Route path="/faculty/marks" element={<FacultyMarks />} />
        <Route path="/faculty/marksheets" element={<FacultyMarksheets />} />
      </Route>

      <Route element={<Protected roles={['admin']}><AppShell /></Protected>}>
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>
    </Routes>
  );
}
