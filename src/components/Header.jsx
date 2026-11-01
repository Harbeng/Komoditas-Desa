import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserCircle } from 'lucide-react';

export default function Header() {
  const { profile, activeRole } = useAuth();
  const profileLink = activeRole === 'admin' ? '/admin/profile' : '/kades/profile';

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-2xs">
      {/* Bagian Kiri: Foto Kecil + Kalimat Selamat Datang */}
      <div className="flex items-center gap-3">
        <Link
          to={profileLink}
          title="Lihat Profile"
          className="group relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-indigo-100 bg-indigo-50 transition hover:border-indigo-500"
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

        <div className="text-sm text-slate-500">
          Selamat datang,{' '}
          <Link
            to={profileLink}
            className="font-bold text-slate-800 hover:text-indigo-600"
          >
            {profile?.nama || 'Pengguna'}
          </Link>{' '}
          <span className="text-slate-400">(@{profile?.username})</span>
        </div>
      </div>

      {/* Bagian Kanan: Badge Status Sesi */}
      <div className="hidden items-center gap-2 sm:flex">
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
            activeRole === 'admin'
              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}
        >
          Sesi: {activeRole === 'admin' ? 'Admin Kabupaten' : 'Kepala Desa'}
        </span>
      </div>
    </header>
  );
}