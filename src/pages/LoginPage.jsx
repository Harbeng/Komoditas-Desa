import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, formatUsernameToEmail } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import {
  ShieldCheck,
  Building2,
  Lock,
  User,
  ArrowLeft,
  AlertCircle,
  LogIn,
  UserPlus,
  Wheat,
} from 'lucide-react';

// Gambar fallback jika file /public/bg-auth.jpg belum dimasukkan
const FALLBACK_BG =
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1920&q=80';

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, profile, activeRole, selectRole, fetchProfile } = useAuth();
  const { showToast } = useDialog();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showRoleModal, setShowRoleModal] = useState(false);

  // State untuk fallback gambar background & logo
  const [bgSrc, setBgSrc] = useState('/bg.jpeg');
  const [logoError, setLogoError] = useState(false);

  // Jika user sudah login dan sudah punya activeRole, arahkan ke dashboardnya
  useEffect(() => {
    if (user && profile && activeRole && !showRoleModal) {
      navigate(activeRole === 'admin' ? '/admin/dashboard' : '/kades/dashboard', {
        replace: true,
      });
    } else if (user && profile && profile.roles?.length > 1 && !activeRole) {
      setShowRoleModal(true);
    }
  }, [user, profile, activeRole, showRoleModal, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    try {
      const internalEmail = formatUsernameToEmail(username);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: internalEmail,
        password,
      });

      if (error) {
        throw new Error('Username atau password yang Anda masukkan salah.');
      }

      const userProfile = await fetchProfile(data.user.id);
      if (!userProfile) {
        throw new Error('Profil pengguna tidak ditemukan di sistem.');
      }

      // Cek apakah akun memiliki Multi-Role
      if (userProfile.roles.length > 1) {
        setShowRoleModal(true);
      } else {
        const singleRole = userProfile.roles[0];
        selectRole(singleRole);
        showToast(`Selamat datang kembali, ${userProfile.nama}!`, 'success');
        navigate(singleRole === 'admin' ? '/admin/dashboard' : '/kades/dashboard');
      }
    } catch (err) {
      setErrorMsg(err.message);
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChooseModalRole = (chosenRole) => {
    selectRole(chosenRole);
    setShowRoleModal(false);
    showToast(
      `Masuk sebagai ${chosenRole === 'admin' ? 'Role Admin' : 'Kepala Desa'}`,
      'success'
    );
    navigate(chosenRole === 'admin' ? '/admin/dashboard' : '/kades/dashboard');
  };

  return (
    <div className="relative flex min-h-screen flex-col justify-center overflow-hidden px-4 py-12">
      {/* LAYER 1: GAMBAR BACKGROUND FULL SCREEN */}
      <img
        src={bgSrc}
        onError={() => setBgSrc(FALLBACK_BG)}
        alt="Background Sistem Komoditas"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />

      {/* LAYER 2: OVERLAY GELAP & BLUR AGAR FORM KONTRAS */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/85 via-indigo-950/75 to-slate-900/85 backdrop-blur-[2px]" />

      {/* LAYER 3: KONTEN FORM LOGIN */}
      <div className="relative z-10 mx-auto w-full max-w-md">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/20"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Dashboard Publik
        </Link>

        <div className="overflow-hidden rounded-3xl border border-white/15 bg-white/95 shadow-2xl backdrop-blur-md">
          {/* Header Kartu Login */}
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-7 text-center text-white">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 p-2 shadow-inner backdrop-blur-xs">
              {!logoError ? (
                <img
                  src="/logo.png"
                  alt="Logo"
                  onError={() => setLogoError(true)}
                  className="h-full w-full object-contain"
                />
              ) : (
                <Wheat className="h-8 w-8 text-white" />
              )}
            </div>
            <h1 className="text-xl font-bold tracking-tight">
              Login Sistem Komoditas
            </h1>
            <p className="mt-1 text-xs text-indigo-100">
              Masuk untuk mengelola dan menginput data komoditas desa
            </p>
          </div>

          <div className="p-6 sm:p-8">
            {errorMsg && (
              <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username Anda"
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password Anda"
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700 disabled:opacity-50"
              >
                <LogIn className="h-4 w-4" />
                {submitting ? 'Memverifikasi Akun...' : 'Masuk Sekarang'}
              </button>
            </form>

            {/* Navigasi ke Halaman Register */}
            <div className="mt-6 border-t border-slate-200/80 pt-5 text-center">
              <p className="text-xs text-slate-500">Belum memiliki akun terdaftar?</p>
              <Link
                to="/register"
                className="mt-2.5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/70 py-2.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100"
              >
                <UserPlus className="h-4 w-4" />
                Daftar Akun Baru (Register)
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* POPUP MODAL PEMILIHAN ROLE (JIKA AKUN MEMILIKI MULTI-ROLE) */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Pilih Role Akses Anda
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Halo <strong>{profile?.nama}</strong>, akun Anda memiliki hak akses
                Multi-Role. Pilih sesi yang ingin Anda buka:
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => handleChooseModalRole('admin')}
                className="flex flex-col items-center rounded-xl border-2 border-slate-200 p-4 text-center transition hover:border-indigo-600 hover:bg-indigo-50"
              >
                <ShieldCheck className="mb-2 h-8 w-8 text-indigo-600" />
                <span className="font-bold text-slate-800">Role Admin</span>
                <span className="mt-1 text-xs text-slate-500">
                  Kelola Form, Desa/Kec & User
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleChooseModalRole('kepala_desa')}
                className="flex flex-col items-center rounded-xl border-2 border-slate-200 p-4 text-center transition hover:border-emerald-600 hover:bg-emerald-50"
              >
                <Building2 className="mb-2 h-8 w-8 text-emerald-600" />
                <span className="font-bold text-slate-800">Kepala Desa</span>
                <span className="mt-1 text-xs text-slate-500">
                  Input & Monitoring Data Desa
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}