import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate 
} from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { EmployeeList } from './pages/EmployeeList';
import { InstitutionList } from './pages/InstitutionList';
import { Reports } from './pages/Reports';
import { AuditLogs } from './pages/AuditLogs';
import { UserManagement } from './pages/UserManagement';
import { DashboardLayout } from './layouts/DashboardLayout';

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <DashboardLayout>
              <Dashboard />
            </DashboardLayout>
          } />
          
          <Route path="/employees" element={
            <DashboardLayout>
              <EmployeeList />
            </DashboardLayout>
          } />

          <Route path="/institutions" element={
            <DashboardLayout allowedRoles={['SUPER_ADMIN', 'CTE_ADMIN']}>
              <InstitutionList />
            </DashboardLayout>
          } />

          <Route path="/reports" element={
            <DashboardLayout allowedRoles={['SUPER_ADMIN', 'CTE_ADMIN', 'PRINCIPAL', 'AUDITOR']}>
              <Reports />
            </DashboardLayout>
          } />

          <Route path="/logs" element={
            <DashboardLayout allowedRoles={['SUPER_ADMIN', 'CTE_ADMIN']}>
              <AuditLogs />
            </DashboardLayout>
          } />

          <Route path="/users" element={
            <DashboardLayout allowedRoles={['SUPER_ADMIN', 'CTE_ADMIN']}>
              <UserManagement />
            </DashboardLayout>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}
