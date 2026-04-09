import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Organization from './pages/Organization';
import Achievements from './pages/Achievements';
import Validations from './pages/Validations';
import Analytics from './pages/Analytics';
import OrgChart from './pages/OrgChart';

const MANAGER_ROLES = ['admin', 'org_leader', 'manager'];
const REVIEWER_ROLES = ['admin', 'org_leader', 'manager', 'team_lead'];

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="employees" element={<Employees />} />
            <Route
              path="organization"
              element={
                <ProtectedRoute allowedRoles={MANAGER_ROLES}>
                  <Organization />
                </ProtectedRoute>
              }
            />
            <Route path="achievements" element={<Achievements />} />
            <Route
              path="validations"
              element={
                <ProtectedRoute allowedRoles={REVIEWER_ROLES}>
                  <Validations />
                </ProtectedRoute>
              }
            />
            <Route path="analytics" element={<Analytics />} />
            <Route path="org-chart" element={<OrgChart />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
