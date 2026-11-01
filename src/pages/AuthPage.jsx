import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, formatUsernameToEmail } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Building2,
  Lock,
  User,
  MapPin,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export default function AuthPage() {
  const navigate = useNavigate();
  const { user, profile, activeRole, selectRole, fetchProfile } = useAuth();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // State Popup Pemilihan Role (untuk akun Multi-Role)
  const [showRoleModal, setShowRoleModal] = useState(false);

  // State Form Login & Register
  const [nama, setNama] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRoles, setSelectedRoles] = useState(['kepala_desa']);
  const [kecamatanId, setKecamatanId] = useState('');
  const [desaId, setDesaId] = useState('');

  // Master Data Kecamatan & Desa untuk form Register Kepala Desa
  const [kecamatanList, setKecamatanList] = useState([]);
  const [desaList, setDesaList] = useState([]);

  // Cek apakah form harus menampilkan pilihan Kecamatan & Desa
  // Sesuai aturan: Hanya tampil jika memilih Role Kepala Desa saja (bukan Admin / Multirole)
  const isOnlyKepalaDesa =
    selectedRoles.length === 1 && selectedRoles.includes('kepala_desa');

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

  // Ambil daftar Kecamatan saat membuka tab Register
  useEffect(() => {
    const loadMasterWilayah = async () => {
      const { data: kecData } = await supabase
        .from('kecamatan')
        .select('id, nama_kecamatan')
        .order('nama_kecamatan');
      if (kecData) setKecamatanList(kecData);
    };
    loadMasterWilayah();
  }, []);

  // Ambil daftar Desa sesuai Kecamatan yang dipilih
  useEffect(() => {
    const loadDesaByKecamatan = async () => {
      if (!kecamatanId) {
        setDesaList([]);
        setDesaId('');
        return;
      }
      const { data } = await supabase
        .from('desa')
        .select('id, nama_desa')
        .eq('kecamatan_id', kecamatanId)
        .order('nama_desa');
      setDesaList(data || []);
      setDesaId('');
    };
    loadDesaByKecamatan();
  }, [kecamatanId]);

  // Toggle Checkbox Pemilihan Role saat Register
  const handleToggleRole = (roleValue) => {
    setSelectedRoles((prev) => {
      if (prev.includes(roleValue)) {
        // Jangan biarkan kosong sama sekali
        if (prev.length === 1) return prev;
        return prev.filter((r) => r !== roleValue);
      }
      return [...prev, roleValue];
    });
  };

  // Proses Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
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
        navigate(singleRole === 'admin' ? '/admin/dashboard' : '/kades/dashboard');
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Proses Register
  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (selectedRoles.length === 0) {
      setErrorMsg('Pilih minimal 1 hak akses (Role).');
      return;
    }

    if (isOnlyKepalaDesa && (!kecamatanId || !desaId)) {
      setErrorMsg('Untuk Role Kepala Desa, wajib memilih Kecamatan dan Desa.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password minimal harus terdiri dari 6 karakter.');
      return;
    }

    setSubmitting(true);
    try {
      const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '');

      // 1. Cek apakah username sudah dipakai
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', cleanUsername)
        .maybeSingle();

      if (existingUser) {
        throw new Error('Username tersebut sudah terdaftar. Gunakan username lain.');
      }

      // 2. Daftarkan ke Supabase Auth
      const internalEmail = formatUsernameToEmail(cleanUsername);
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: internalEmail,
        password,
      });

      if (signUpError) throw signUpError;

      // 3. Simpan ke tabel profiles
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        nama: nama.trim(),
        username: cleanUsername,
        roles: selectedRoles,
        kecamatan_id: isOnlyKepalaDesa ? kecamatanId : null,
        desa_id: isOnlyKepalaDesa ? desaId : null,
        is_active: true,
      });

      if (profileError) throw profileError;

      // Logout sementara agar user login secara normal atau langsung arahkan
      await supabase.auth.signOut();
      setSuccessMsg('Registrasi berhasil! Silakan login menggunakan username dan password Anda.');
      setMode('login');
      setPassword('');
    } catch (err) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat mendaftarkan akun.');
    } finally {
      setSubmitting(false);
    }
  };

  // Saat memilih Role dari Popup Modal
  const handleChooseModalRole = (chosenRole) => {
    selectRole(chosenRole);
    setShowRoleModal(false);
    navigate(chosenRole === 'admin' ? '/admin/dashboard' : '/kades/dashboard');
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4 py-12">
      <div className="mx-auto w-full max-w-md">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-indigo-200 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Dashboard Publik
        </Link>

        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
          {/* Header Kartu */}
          <div className="bg-indigo-600 px-6 py-6 text-center text-white">
            <h1 className="text-xl font-bold tracking-tight">
              Sistem Informasi Komoditas Desa
            </h1>
            <p className="mt-1 text-xs text-indigo-100">
              Portal Manajemen Data & Monitoring Komoditas Kabupaten
            </p>
          </div>

          {/* Tab Switcher Login / Register */}
          <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg('');
              }}
              className={`rounded-xl py-2.5 text-sm font-semibold transition ${
                mode === 'login'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Masuk (Login)
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`rounded-xl py-2.5 text-sm font-semibold transition ${
                mode === 'register'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Daftar Akun Baru
            </button>
          </div>

          <div className="p-6 sm:p-8">
            {errorMsg && (
              <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* FORM LOGIN */}
            {mode === 'login' ? (
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
                      placeholder="Masukkan username"
                      className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm text-slate-800 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
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
                      placeholder="Masukkan password"
                      className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm text-slate-800 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-2 w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? 'Memproses...' : 'Login Sekarang'}
                </button>
              </form>
            ) : (
              /* FORM REGISTER DINAMIS */
              <form onSubmit={handleRegister} className="space-y-4">
                {/* Pilihan Hak Akses (Bisa lebih dari 1 Role) */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Pilih Hak Akses (Bisa Pilih Lebih dari 1 Role)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label
                      className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 text-sm font-medium transition ${
                        selectedRoles.includes('admin')
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedRoles.includes('admin')}
                        onChange={() => handleToggleRole('admin')}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Role Admin</span>
                    </label>

                    <label
                      className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 text-sm font-medium transition ${
                        selectedRoles.includes('kepala_desa')
                          ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedRoles.includes('kepala_desa')}
                        onChange={() => handleToggleRole('kepala_desa')}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Kepala Desa</span>
                    </label>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">
                    {isOnlyKepalaDesa
                      ? 'Mode Kepala Desa: Wajib melengkapi Kecamatan & Desa.'
                      : 'Mode Admin / Multirole: Hanya memerlukan Nama, Username, & Password.'}
                  </p>
                </div>

                {/* Input Nama Lengkap */}
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    required
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                {/* Input Username */}
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Tanpa spasi, contoh: kades_tutuyan"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                {/* Input Kecamatan & Desa (HANYA MUNCUL JIKA ROLE KEPALA DESA SAJA) */}
                {isOnlyKepalaDesa && (
                  <div className="grid grid-cols-1 gap-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-700">
                        <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                        Kecamatan
                      </label>
                      <select
                        required
                        value={kecamatanId}
                        onChange={(e) => setKecamatanId(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-600 focus:outline-none"
                      >
                        <option value="">-- Pilih Kecamatan --</option>
                        {kecamatanList.map((kec) => (
                          <option key={kec.id} value={kec.id}>
                            {kec.nama_kecamatan}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-700">
                        <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                        Desa
                      </label>
                      <select
                        required
                        disabled={!kecamatanId}
                        value={desaId}
                        onChange={(e) => setDesaId(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-600 focus:outline-none disabled:bg-slate-100"
                      >
                        <option value="">-- Pilih Desa --</option>
                        {desaList.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.nama_desa}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Input Password */}
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-2 w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? 'Mendaftarkan Akun...' : 'Register Akun'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* POPUP MODAL PEMILIHAN ROLE (JIKA AKUN MEMILIKI MULTI-ROLE) */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
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