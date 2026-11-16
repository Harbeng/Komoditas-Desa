import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ allowedRole }) {
  const { user, profile, activeRole, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
        <p className="mt-3 text-sm font-medium text-slate-600">Memverifikasi akses...</p>
      </div>
    );
  }

  // 1. Jika belum login, tidak punya profil, atau akun dikunci -> arahkan ke /login
  if (!user || !profile || !profile.is_active) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Jika akun Multi-Role tetapi belum memilih role aktif -> arahkan ke /login
  if (!activeRole) {
    return <Navigate to="/login" replace />;
  }

  // 3. Jika mencoba mengakses URL milik role lain -> arahkan ke dashboard role aktif yang benar
  if (allowedRole && activeRole !== allowedRole) {
    const fallbackUrl =
      activeRole === 'admin'
        ? '/admin/dashboard'
        : activeRole === 'approver'
        ? '/approver/dashboard'
        : '/kades/dashboard';

    return <Navigate to={fallbackUrl} replace />;
  }

  return <Outlet />;
}