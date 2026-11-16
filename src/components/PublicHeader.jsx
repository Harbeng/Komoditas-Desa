import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, LayoutDashboard, Wheat } from 'lucide-react';

export default function PublicHeader() {
  const { user, profile, activeRole } = useAuth();
  const [imgError, setImgError] = useState(false);

  const panelUrl =
    activeRole === 'admin'
      ? '/admin/dashboard'
      : activeRole === 'approver'
      ? '/approver/dashboard'
      : '/kades/dashboard';

  const panelLabel =
    activeRole === 'admin'
      ? 'Admin'
      : activeRole === 'approver'
      ? 'Approver'
      : 'Kades';

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="flex w-full items-center justify-between gap-2 px-3 py-3 sm:px-6 sm:py-4">
        <Link to="/" className="group flex min-w-0 items-center gap-2.5 sm:gap-3.5">
          {!imgError ? (
            <img
              src="/logo.png"
              alt="Logo Kabupaten"
              onError={() => setImgError(true)}
              className="h-9 w-9 shrink-0 object-contain transition-transform duration-200 group-hover:scale-105 sm:h-11 sm:w-11"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-emerald-600 text-white shadow-md shadow-indigo-600/20 sm:h-11 sm:w-11">
              <Wheat className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
          )}

          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold tracking-tight text-slate-900 sm:text-lg">
              Dashboard Komoditas Desa
            </h1>
            <p className="truncate text-[11px] text-slate-500 sm:text-xs">
              Monitoring Tren & Demografi 7 Kecamatan (Data Terverifikasi)
            </p>
          </div>
        </Link>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {user && activeRole ? (
            <div className="flex items-center gap-2.5">
              {profile?.avatar_url && (
                <img
                  src={profile.avatar_url}
                  alt={profile?.nama}
                  className="hidden h-9 w-9 rounded-full border border-slate-200 object-cover sm:block"
                />
              )}
              <Link
                to={panelUrl}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700 sm:px-4 sm:py-2.5 sm:text-sm"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Panel {panelLabel}</span>
              </Link>
            </div>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-700 sm:px-5 sm:py-2.5 sm:text-sm"
            >
              <LogIn className="h-4 w-4" />
              <span>Login</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}