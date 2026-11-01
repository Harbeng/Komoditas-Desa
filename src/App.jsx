import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DialogProvider } from './context/DialogContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';

// Halaman Publik & Auth
import PublicDashboard from './pages/PublicDashboard';
import AuthPage from './pages/AuthPage';
import ProfilePage from './pages/ProfilePage';

// Halaman Role Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminFormBuilder from './pages/admin/AdminFormBuilder';
import AdminDesaKecamatan from './pages/admin/AdminDesaKecamatan';
import AdminUserManagement from './pages/admin/AdminUserManagement';

// Halaman Role Kepala Desa
import KadesDashboard from './pages/kades/KadesDashboard';
import KadesInputForm from './pages/kades/KadesInputForm';

export default function App() {
  return (
    <DialogProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* RUTE PUBLIK */}
            <Route path="/" element={<PublicDashboard />} />
            <Route path="/login" element={<AuthPage />} />

            {/* RUTE TERPROTEKSI: ROLE ADMIN */}
            <Route path="/admin" element={<ProtectedRoute allowedRole="admin" />}>
              <Route element={<DashboardLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="form" element={<AdminFormBuilder />} />
                <Route path="desa-kecamatan" element={<AdminDesaKecamatan />} />
                <Route path="users" element={<AdminUserManagement />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>
            </Route>

            {/* RUTE TERPROTEKSI: ROLE KEPALA DESA */}
            <Route path="/kades" element={<ProtectedRoute allowedRole="kepala_desa" />}>
              <Route element={<DashboardLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<KadesDashboard />} />
                <Route path="input-data" element={<KadesInputForm />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </DialogProvider>
  );
}