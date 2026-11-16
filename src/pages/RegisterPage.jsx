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
  Phone,
} from 'lucide-react';

const FALLBACK_BG =
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1920&q=80';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { showToast } = useDialog();

  const [nama, setNama] = useState('');
  const [username, setUsername] = useState('');
  const [noHp, setNoHp] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRoles, setSelectedRoles] = useState(['kepala_desa']);
  const [kecamatanId, setKecamatanId] = useState('');
  const [desaId, setDesaId] = useState('');

  const [kecamatanList, setKecamatanList] = useState([]);
  const [desaList, setDesaList] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [bgSrc, setBgSrc] = useState('/bg-auth.jpg');
  const [logoError, setLogoError] = useState(false);

  const isOnlyKepalaDesa =
    selectedRoles.length === 1 && selectedRoles.includes('kepala_desa');

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

      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', cleanUsername)
        .maybeSingle();

      if (existingUser) {
        throw new Error('Username tersebut sudah terdaftar. Gunakan username lain.');
      }

      const internalEmail = formatUsernameToEmail(cleanUsername);
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: internalEmail,
        password,
      });

      if (signUpError) throw signUpError;

      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        nama: nama.trim(),
        username: cleanUsername,
        no_hp: noHp.trim() || null,
        roles: selectedRoles,
        kecamatan_id: isOnlyKepalaDesa ? kecamatanId : null,
        desa_id: isOnlyKepalaDesa ? desaId : null,
        is_active: true,
      });

      if (profileError) throw profileError;

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
      <img
        src={bgSrc}
        onError={() => setBgSrc(FALLBACK_BG)}
        alt="Background Sistem Komoditas"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/85 via-emerald-950/75 to-slate-900/85 backdrop-blur-[2px]" />

      <div className="relative z-10 mx-auto w-full max-w-lg">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/20"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Dashboard Publik
        </Link>

        <div className="overflow-hidden rounded-3xl border border-white/15 bg-white/95 shadow-2xl backdrop-blur-md">
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
              Daftarkan akun Admin, Approver, atau Kepala Desa
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
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Pilih Hak Akses (Bisa Pilih Lebih dari 1 Role)
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <label
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition ${
                      selectedRoles.includes('admin')
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes('admin')}
                      onChange={() => handleToggleRole('admin')}
                      className="h-4 w-4 rounded text-indigo-600"
                    />
                    <span>Admin</span>
                  </label>

                  <label
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition ${
                      selectedRoles.includes('approver')
                        ? 'border-amber-600 bg-amber-50 text-amber-900'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes('approver')}
                      onChange={() => handleToggleRole('approver')}
                      className="h-4 w-4 rounded text-amber-600"
                    />
                    <span>Approver</span>
                  </label>

                  <label
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition ${
                      selectedRoles.includes('kepala_desa')
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes('kepala_desa')}
                      onChange={() => handleToggleRole('kepala_desa')}
                      className="h-4 w-4 rounded text-emerald-600"
                    />
                    <span>Kepala Desa</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                      placeholder="Nama Lengkap"
                      className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    No. WhatsApp (Aktif)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="tel"
                      value={noHp}
                      onChange={(e) => setNoHp(e.target.value)}
                      placeholder="081234567890"
                      className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm"
                    />
                  </div>
                </div>
              </div>

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
                    placeholder="Tanpa spasi, contoh: approver_kab"
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm"
                  />
                </div>
              </div>

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
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
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
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
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
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-indigo-700 disabled:opacity-50"
              >
                <UserPlus className="h-4 w-4" />
                {submitting ? 'Mendaftarkan Akun...' : 'Register Akun Sekarang'}
              </button>
            </form>

            <div className="mt-6 border-t border-slate-200/80 pt-5 text-center">
              <Link
                to="/login"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
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