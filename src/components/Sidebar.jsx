import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  FileSpreadsheet,
  MapPinned,
  Users,
  UserCircle,
  ClipboardEdit,
  LogOut,
  Repeat,
  Globe,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function Sidebar({
  isMobileOpen,
  setIsMobileOpen,
  isDesktopCollapsed,
  setIsDesktopCollapsed,
}) {
  const { profile, activeRole, selectRole, signOut } = useAuth();
  const navigate = useNavigate();

  const isMultiRole = profile?.roles?.length > 1;

  const adminMenus = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/form', label: 'Form Komoditas', icon: FileSpreadsheet },
    { to: '/admin/desa-kecamatan', label: 'Desa / Kecamatan', icon: MapPinned },
    { to: '/admin/users', label: 'Management User', icon: Users },
    { to: '/admin/profile', label: 'Profile', icon: UserCircle },
  ];

  const kadesMenus = [
    { to: '/kades/dashboard', label: 'Dashboard Desa', icon: LayoutDashboard },
    { to: '/kades/input-data', label: 'Input Data', icon: ClipboardEdit },
    { to: '/kades/profile', label: 'Profile', icon: UserCircle },
  ];

  const menus = activeRole === 'admin' ? adminMenus : kadesMenus;

  const handleSwitchRole = () => {
    const nextRole = activeRole === 'admin' ? 'kepala_desa' : 'admin';
    selectRole(nextRole);
    navigate(nextRole === 'admin' ? '/admin/dashboard' : '/kades/dashboard');
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <>
      {/* Backdrop Gelap Khusus Layar HP saat Sidebar Terbuka */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs transition-opacity lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white transition-all duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        } ${isDesktopCollapsed ? 'lg:w-20' : 'lg:w-64'} w-72 shrink-0`}
      >
        {/* Brand & Tombol Kontrol */}
        <div className="border-b border-slate-100 p-4">
          <div className="flex items-center justify-between gap-2">
            <div
              className={`flex items-center gap-2.5 ${
                isDesktopCollapsed ? 'lg:mx-auto' : ''
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-white shadow-xs ${
                  activeRole === 'admin' ? 'bg-indigo-600' : 'bg-emerald-600'
                }`}
              >
                {activeRole === 'admin' ? 'AD' : 'KD'}
              </div>

              <div className={`${isDesktopCollapsed ? 'lg:hidden' : 'block'}`}>
                <h2 className="text-sm font-bold text-slate-900">SI-Komoditas</h2>
                <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                  {activeRole === 'admin' ? 'Role Admin' : 'Kepala Desa'}
                </span>
              </div>
            </div>

            {/* Tombol Tutup di HP */}
            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Tombol Ciutkan/Lebarkan di Desktop */}
            <button
              type="button"
              onClick={() => setIsDesktopCollapsed((prev) => !prev)}
              title={isDesktopCollapsed ? 'Lebarkan Sidebar' : 'Ciutkan Sidebar'}
              className="hidden rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 lg:inline-flex"
            >
              {isDesktopCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          </div>

          {activeRole === 'kepala_desa' && (
            <div
              className={`mt-3 rounded-xl bg-emerald-50 p-2.5 text-xs text-emerald-800 ${
                isDesktopCollapsed ? 'lg:hidden' : 'block'
              }`}
            >
              <p className="font-bold truncate">
                Desa: {profile?.desa?.nama_desa || 'Belum Ditautkan'}
              </p>
              <p className="text-emerald-600 truncate">
                Kec. {profile?.kecamatan?.nama_kecamatan || '-'}
              </p>
            </div>
          )}
        </div>

        {/* Daftar Menu Navigasi */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto p-3">
          {menus.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={item.label}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition ${
                    isDesktopCollapsed ? 'lg:justify-center lg:px-0' : ''
                  } ${
                    isActive
                      ? activeRole === 'admin'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className={`${isDesktopCollapsed ? 'lg:hidden' : 'block'}`}>
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>

        {/* Aksi Bawah Sidebar */}
        <div className="space-y-2 border-t border-slate-100 p-3">
          <NavLink
            to="/"
            title="Lihat Dashboard Publik"
            className={`flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 ${
              isDesktopCollapsed ? 'lg:justify-center lg:px-0' : ''
            }`}
          >
            <Globe className="h-4 w-4 shrink-0" />
            <span className={`${isDesktopCollapsed ? 'lg:hidden' : 'block'}`}>
              Dashboard Publik
            </span>
          </NavLink>

          {isMultiRole && (
            <button
              onClick={handleSwitchRole}
              title={`Ganti ke ${activeRole === 'admin' ? 'Kepala Desa' : 'Admin'}`}
              className={`flex w-full items-center gap-2.5 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs font-bold text-amber-800 transition hover:bg-amber-100 ${
                isDesktopCollapsed ? 'lg:justify-center lg:px-0' : ''
              }`}
            >
              <Repeat className="h-4 w-4 shrink-0" />
              <span className={`${isDesktopCollapsed ? 'lg:hidden' : 'block'}`}>
                Ganti ke {activeRole === 'admin' ? 'Kepala Desa' : 'Admin'}
              </span>
            </button>
          )}

          <button
            onClick={handleLogout}
            title="Keluar (Logout)"
            className={`flex w-full items-center gap-2.5 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 ${
              isDesktopCollapsed ? 'lg:justify-center lg:px-0' : ''
            }`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className={`${isDesktopCollapsed ? 'lg:hidden' : 'block'}`}>
              Keluar (Logout)
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}