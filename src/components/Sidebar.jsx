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
} from 'lucide-react';

export default function Sidebar() {
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
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      {/* Brand & Role Info */}
      <div className="border-b border-slate-100 p-5">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl font-bold text-white ${
              activeRole === 'admin' ? 'bg-indigo-600' : 'bg-emerald-600'
            }`}
          >
            {activeRole === 'admin' ? 'AD' : 'KD'}
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">SI-Komoditas</h2>
            <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-slate-600">
              {activeRole === 'admin' ? 'Role Admin' : 'Role Kepala Desa'}
            </span>
          </div>
        </div>

        {activeRole === 'kepala_desa' && (
          <div className="mt-3 rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-800">
            <p className="font-semibold">
              Desa: {profile?.desa?.nama_desa || 'Belum Ditautkan'}
            </p>
            <p className="text-emerald-600">
              Kec. {profile?.kecamatan?.nama_kecamatan || '-'}
            </p>
          </div>
        )}
      </div>

      {/* Daftar Menu Navigasi */}
      <nav className="flex-1 space-y-1 p-3">
        {menus.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? activeRole === 'admin'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Aksi Bawah Sidebar */}
      <div className="space-y-2 border-t border-slate-100 p-3">
        <NavLink
          to="/"
          className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
        >
          <Globe className="h-4 w-4" />
          Lihat Dashboard Publik
        </NavLink>

        {isMultiRole && (
          <button
            onClick={handleSwitchRole}
            className="flex w-full items-center gap-2.5 rounded-xl bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
          >
            <Repeat className="h-4 w-4" />
            Ganti ke {activeRole === 'admin' ? 'Kepala Desa' : 'Admin'}
          </button>
        )}

        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
        >
          <LogOut className="h-4 w-4" />
          Keluar (Logout)
        </button>
      </div>
    </aside>
  );
}