import { useAuth } from '../contexts/AuthContext';
import SuperAdminDashboard from './superadmin/Dashboard';
import AdminDashboard from './admin/Dashboard';
import TeacherDashboard from './teacher/Dashboard';
import StudentDashboard from './student/Dashboard';
import ParentDashboard from './parent/Dashboard';

export default function Dashboard() {
  const { user } = useAuth();
  if (user?.role === 'superadmin') return <SuperAdminDashboard />;
  if (user?.role === 'admin')      return <AdminDashboard />;
  if (user?.role === 'teacher')    return <TeacherDashboard />;
  if (user?.role === 'parent')     return <ParentDashboard />;
  return <StudentDashboard />;
}
