import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, formatUsernameToEmail } from '../lib/supabase';
import { useDialog } from '../context/DialogContext';
import {
  Building2,
  Lock,
  User,
  MapPin,
  ArrowLeft,
  AlertCircle,
  UserPlus,
  LogIn,
  Wheat,
  BadgeCheck,
} from 'lucide-react';

// Gambar fallback jika file /public/bg-auth.jpg belum dimasukkan
const FALLBACK_BG =
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1920&q=80';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { showToast } = useDialog();

  const [nama, setNama] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRoles, setSelectedRoles] = useState(['kepala_desa']);
  const [kecamatanId, setKecamatanId] = useState('');
  const [desaId, setDesaId] = useState('');

  const [kecamatanList, setKecamatanList] = useState([]);
  const [desaList, setDesaList] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // State untuk fallback gambar background & logo
  const [bgSrc, setBgSrc] = useState('/bg.jpeg');
  const [logoError, setLogoError] = useState(false);

  // Sesuai aturan: Pilihan Kecamatan & Desa hanya tampil jika memilih Role Kepala Desa saja
  const isOnlyKepalaDesa =
    selectedRoles.length === 1 && selectedRoles.includes('kepala_desa');

  // Ambil daftar Kecamatan
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
        if (prev.length === 1) return prev;
        return prev.filter((r) => r !== roleValue);
      }
      return [...prev, roleValue];
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');

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

      // Logout sesi sementara dan arahkan ke halaman Login
      await supabase.auth.signOut();
      showToast(
        'Registrasi berhasil! Silakan login menggunakan akun baru Anda.',
        'success'
      );
      navigate('/login');
    } catch (err) {
      const msg = err.message || 'Terjadi kesalahan saat mendaftarkan akun.';
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
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
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/85 via-emerald-950/75 to-slate-900/85 backdrop-blur-[2px]" />

      {/* LAYER 3: KONTEN FORM REGISTER */}
      <div className="relative z-10 mx-auto w-full max-w-lg">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/20"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Dashboard Publik
        </Link>

        <div className="overflow-hidden rounded-3xl border border-white/15 bg-white/95 shadow-2xl backdrop-blur-md">
          {/* Header Kartu Register */}
          <div className="bg-gradient-to-r from-indigo-600 to-emerald-600 px-6 py-6 text-center text-white">
            <div className="mx-auto mb-2.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 p-2 shadow-inner backdrop-blur-xs">
              {!logoError ? (
                <img
                  src="/logo.png"
                  alt="Logo"
                  onError={() => setLogoError(true)}
                  className="h-full w-full object-contain"
                />
              ) : (
                <Wheat className="h-7 w-7 text-white" />
              )}
            </div>
            <h1 className="text-xl font-bold tracking-tight">
              Registrasi Akun Baru
            </h1>
            <p className="mt-1 text-xs text-indigo-100">
              Daftarkan akun Admin atau Kepala Desa pada Sistem Komoditas
            </p>
          </div>

          <div className="p-6 sm:p-8">
            {errorMsg && (
              <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              {/* Pilihan Hak Akses (Bisa lebih dari 1 Role) */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Pilih Hak Akses (Bisa Pilih Lebih dari 1 Role)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 text-sm font-semibold transition ${
                      selectedRoles.includes('admin')
                        ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
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
                    className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 text-sm font-semibold transition ${
                      selectedRoles.includes('kepala_desa')
                        ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
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
                <div className="relative">
                  <BadgeCheck className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Input Username */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Tanpa spasi, contoh: kades_tutuyan"
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Input Kecamatan & Desa (HANYA MUNCUL JIKA ROLE KEPALA DESA SAJA) */}
              {isOnlyKepalaDesa && (
                <div className="grid grid-cols-1 gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 sm:grid-cols-2">
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
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700 disabled:opacity-50"
              >
                <UserPlus className="h-4 w-4" />
                {submitting ? 'Mendaftarkan Akun...' : 'Register Akun Sekarang'}
              </button>
            </form>

            {/* Navigasi Kembali ke Halaman Login */}
            <div className="mt-6 border-t border-slate-200/80 pt-5 text-center">
              <p className="text-xs text-slate-500">Sudah memiliki akun terdaftar?</p>
              <Link
                to="/login"
                className="mt-2.5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
              >
                <LogIn className="h-4 w-4 text-indigo-600" />
                Kembali ke Halaman Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}