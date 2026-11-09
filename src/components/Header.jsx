import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserCircle, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

export default function Header({ onToggleSidebar, isDesktopCollapsed }) {
  const { profile, activeRole } = useAuth();
  const profileLink = activeRole === 'admin' ? '/admin/profile' : '/kades/profile';

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-3 shadow-2xs sm:px-6">
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3.5">
        {/* Tombol Hamburger di HP & Tombol Panel di Desktop */}
        <button
          type="button"
          onClick={onToggleSidebar}
          title="Buka / Tutup Menu Sidebar"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100 active:scale-95"
        >
          <Menu className="h-5 w-5 lg:hidden" />
          {isDesktopCollapsed ? (
            <PanelLeftOpen className="hidden h-5 w-5 lg:block" />
          ) : (
            <PanelLeftClose className="hidden h-5 w-5 lg:block" />
          )}
        </button>

        <Link
          to={profileLink}
          title="Lihat Profile"
          className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-indigo-100 bg-indigo-50 transition hover:border-indigo-500 sm:h-10 sm:w-10"
        >
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile?.nama || 'User'}
              className="h-full w-full object-cover"
            />
          ) : (
            <UserCircle className="h-6 w-6 text-indigo-600" />
          )}
        </Link>

        <div className="min-w-0 text-xs text-slate-500 sm:text-sm">
          <span className="hidden sm:inline">Selamat datang, </span>
          <Link
            to={profileLink}
            className="truncate font-bold text-slate-800 hover:text-indigo-600"
          >
            {profile?.nama || 'Pengguna'}
          </Link>{' '}
          <span className="hidden text-slate-400 md:inline">
            (@{profile?.username})
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase sm:px-3 sm:text-xs ${
            activeRole === 'admin'
              ? 'border border-indigo-200 bg-indigo-50 text-indigo-700'
              : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {activeRole === 'admin' ? 'Admin' : 'Kepala Desa'}
        </span>
      </div>
    </header>
  );
}