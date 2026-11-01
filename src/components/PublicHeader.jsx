import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, LayoutDashboard, Wheat } from 'lucide-react';

export default function PublicHeader() {
  const { user, profile, activeRole } = useAuth();
  const [imgError, setImgError] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="flex w-full items-center justify-between px-6 py-4">
        {/* Bagian Kiri: Logo & Judul Sistem */}
        <Link to="/" className="flex items-center gap-3.5 group">
          {!imgError ? (
            <img
              src="/logo.png"
              alt="Logo Kabupaten"
              onError={() => setImgError(true)}
              className="h-11 w-11 shrink-0 object-contain transition-transform duration-200 group-hover:scale-105"
            />
          ) : (
            /* Fallback Logo Vektor Modern jika /public/logo.png belum dipasang */
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-emerald-600 text-white shadow-md shadow-indigo-600/20">
              <Wheat className="h-6 w-6" />
            </div>
          )}

          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
              Dashboard Komoditas Desa Kabupaten
            </h1>
            <p className="text-xs text-slate-500">
              Pusat Data & Monitoring Tren Komoditas 7 Kecamatan
            </p>
          </div>
        </Link>

        {/* Bagian Kanan: Tombol Panel / Login */}
        <div className="flex items-center gap-3">
          {user && activeRole ? (
            <div className="flex items-center gap-3">
              {profile?.avatar_url && (
                <img
                  src={profile.avatar_url}
                  alt={profile?.nama}
                  className="hidden h-9 w-9 rounded-full border border-slate-200 object-cover sm:block"
                />
              )}
              <Link
                to={activeRole === 'admin' ? '/admin/dashboard' : '/kades/dashboard'}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700 sm:text-sm"
              >
                <LayoutDashboard className="h-4 w-4" />
                Panel {activeRole === 'admin' ? 'Admin' : 'Kepala Desa'}
              </Link>
            </div>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-700 sm:text-sm"
            >
              <LogIn className="h-4 w-4" />
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}