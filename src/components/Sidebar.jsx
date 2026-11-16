import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
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
  ClipboardCheck,
  MessageSquarePlus,
  Inbox,
  ShieldCheck,
  Building2,
  CheckCircle2,
} from 'lucide-react';

// Konfigurasi tampilan untuk masing-masing Role di dalam Popup Modal
const ROLE_CONFIG = {
  admin: {
    key: 'admin',
    title: 'Role Admin',
    desc: 'Kelola Sistem, Form, Desa/Kec & User',
    path: '/admin/dashboard',
    icon: ShieldCheck,
    iconColor: 'text-indigo-600',
    activeBorder: 'border-indigo-600 bg-indigo-50/70',
    hoverBorder: 'hover:border-indigo-600 hover:bg-indigo-50/40',
    badgeClass: 'bg-indigo-600 text-white',
  },
  approver: {
    key: 'approver',
    title: 'Role Approver',
    desc: 'Verifikasi, Tolak & Publish Data Desa',
    path: '/approver/dashboard',
    icon: ClipboardCheck,
    iconColor: 'text-amber-600',
    activeBorder: 'border-amber-600 bg-amber-50/70',
    hoverBorder: 'hover:border-amber-600 hover:bg-amber-50/40',
    badgeClass: 'bg-amber-600 text-white',
  },
  kepala_desa: {
    key: 'kepala_desa',
    title: 'Kepala Desa',
    desc: 'Input Komoditas & Histori Data Desa',
    path: '/kades/dashboard',
    icon: Building2,
    iconColor: 'text-emerald-600',
    activeBorder: 'border-emerald-600 bg-emerald-50/70',
    hoverBorder: 'hover:border-emerald-600 hover:bg-emerald-50/40',
    badgeClass: 'bg-emerald-600 text-white',
  },
};

export default function Sidebar({
  isMobileOpen,
  setIsMobileOpen,
  isDesktopCollapsed,
  setIsDesktopCollapsed,
}) {
  const { profile, activeRole, selectRole, signOut } = useAuth();
  const { showToast } = useDialog();
  const navigate = useNavigate();

  // State untuk membuka/menutup Popup Modal Pindah Role
  const [showRoleModal, setShowRoleModal] = useState(false);

  const availableRoles = profile?.roles || [];
  const isMultiRole = availableRoles.length > 1;

  const adminMenus = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/form', label: 'Form Komoditas', icon: FileSpreadsheet },
    {
      to: '/admin/request-pertanyaan',
      label: 'Permintaan & Kunci',
      icon: Inbox,
    },
    { to: '/admin/desa-kecamatan', label: 'Desa / Kecamatan', icon: MapPinned },
    { to: '/admin/users', label: 'Management User', icon: Users },
    { to: '/admin/profile', label: 'Profile', icon: UserCircle },
  ];

  const approverMenus = [
    {
      to: '/approver/dashboard',
      label: 'Verifikasi & Approval',
      icon: ClipboardCheck,
    },
    { to: '/approver/profile', label: 'Profile', icon: UserCircle },
  ];

  const kadesMenus = [
    { to: '/kades/dashboard', label: 'Dashboard Desa', icon: LayoutDashboard },
    { to: '/kades/input-data', label: 'Input & Histori Data', icon: ClipboardEdit },
    {
      to: '/kades/request-pertanyaan',
      label: 'Usulan Pertanyaan',
      icon: MessageSquarePlus,
    },
    { to: '/kades/profile', label: 'Profile', icon: UserCircle },
  ];

  const menus =
    activeRole === 'admin'
      ? adminMenus
      : activeRole === 'approver'
      ? approverMenus
      : kadesMenus;

  // Eksekusi ketika pengguna memilih salah satu Role di dalam Popup Modal
  const handleSelectRoleFromModal = (targetRoleKey) => {
    const roleMeta = ROLE_CONFIG[targetRoleKey];
    if (!roleMeta) return;

    setShowRoleModal(false);
    setIsMobileOpen(false);

    if (targetRoleKey === activeRole) {
      return;
    }

    selectRole(targetRoleKey);
    showToast(`Berpindah akses ke ${roleMeta.title}`, 'success');
    navigate(roleMeta.path, { replace: true });
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const roleCode =
    activeRole === 'admin' ? 'AD' : activeRole === 'approver' ? 'AP' : 'KD';
  const roleColor =
    activeRole === 'admin'
      ? 'bg-indigo-600'
      : activeRole === 'approver'
      ? 'bg-amber-600'
      : 'bg-emerald-600';

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
        <div className="border-b border-slate-100 p-4">
          <div className="flex items-center justify-between gap-2">
            <div
              className={`flex items-center gap-2.5 ${
                isDesktopCollapsed ? 'lg:mx-auto' : ''
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-white shadow-xs ${roleColor}`}
              >
                {roleCode}
              </div>

              <div className={`${isDesktopCollapsed ? 'lg:hidden' : 'block'}`}>
                <h2 className="text-sm font-bold text-slate-900">SI-Komoditas</h2>
                <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                  {activeRole === 'admin'
                    ? 'Role Admin'
                    : activeRole === 'approver'
                    ? 'Role Approver'
                    : 'Kepala Desa'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>

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
              <p className="truncate font-bold">
                Desa: {profile?.desa?.nama_desa || 'Belum Ditautkan'}
              </p>
              <p className="truncate text-emerald-600">
                Kec. {profile?.kecamatan?.nama_kecamatan || '-'}
              </p>
            </div>
          )}
        </div>

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
                      ? `${roleColor} text-white shadow-sm`
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
              type="button"
              onClick={() => setShowRoleModal(true)}
              title="Pilih & Pindah Role Akses"
              className={`flex w-full items-center gap-2.5 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs font-bold text-amber-800 transition hover:bg-amber-100 ${
                isDesktopCollapsed ? 'lg:justify-center lg:px-0' : ''
              }`}
            >
              <Repeat className="h-4 w-4 shrink-0" />
              <span className={`${isDesktopCollapsed ? 'lg:hidden' : 'block'}`}>
                Pindah Role Akses ({availableRoles.length})
              </span>
            </button>
          )}

          <button
            type="button"
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

      {/* POPUP MODAL PILIHAN ROLE (Ditempatkan di luar <aside> agar tampil penuh di tengah layar) */}
      {showRoleModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <Repeat className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Pilih Role Akses Anda
                  </h3>
                  <p className="text-xs text-slate-500">
                    Akun <strong>@{profile?.username}</strong> memiliki{' '}
                    {availableRoles.length} hak akses terdaftar
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowRoleModal(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div
                className={`grid grid-cols-1 gap-3 ${
                  availableRoles.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'
                }`}
              >
                {availableRoles.map((roleKey) => {
                  const meta = ROLE_CONFIG[roleKey];
                  if (!meta) return null;

                  const IconComponent = meta.icon;
                  const isCurrent = activeRole === roleKey;

                  return (
                    <button
                      key={roleKey}
                      type="button"
                      onClick={() => handleSelectRoleFromModal(roleKey)}
                      className={`relative flex flex-col items-center rounded-2xl border-2 p-4 text-center transition ${
                        isCurrent
                          ? meta.activeBorder
                          : `border-slate-200 bg-white ${meta.hoverBorder}`
                      }`}
                    >
                      {isCurrent && (
                        <span
                          className={`mb-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${meta.badgeClass}`}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Sedang Aktif
                        </span>
                      )}

                      <IconComponent className={`mb-2 h-8 w-8 ${meta.iconColor}`} />
                      <span className="text-sm font-bold text-slate-900">
                        {meta.title}
                      </span>
                      <span className="mt-1 text-[11px] leading-snug text-slate-500">
                        {meta.desc}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}