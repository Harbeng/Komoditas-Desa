import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import {
  UserCircle,
  Shield,
  MapPin,
  KeyRound,
  Save,
  Camera,
  Trash2,
  Upload,
} from 'lucide-react';

export default function ProfilePage() {
  const { user, profile, activeRole, fetchProfile } = useAuth();
  const { showToast } = useDialog();
  const fileInputRef = useRef(null);

  const [nama, setNama] = useState(profile?.nama || '');
  const [kecamatanId, setKecamatanId] = useState(profile?.kecamatan_id || '');
  const [desaId, setDesaId] = useState(profile?.desa_id || '');
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || '');
  const [selectedFile, setSelectedFile] = useState(null);

  const [kecamatanList, setKecamatanList] = useState([]);
  const [desaList, setDesaList] = useState([]);

  const [newPassword, setNewPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (profile) {
      setNama(profile.nama || '');
      setKecamatanId(profile.kecamatan_id || '');
      setDesaId(profile.desa_id || '');
      setAvatarPreview(profile.avatar_url || '');
    }
  }, [profile]);

  useEffect(() => {
    const loadWilayah = async () => {
      const { data: kecs } = await supabase
        .from('kecamatan')
        .select('id, nama_kecamatan')
        .order('nama_kecamatan');
      const { data: desas } = await supabase
        .from('desa')
        .select('id, kecamatan_id, nama_desa')
        .order('nama_desa');
      setKecamatanList(kecs || []);
      setDesaList(desas || []);
    };
    loadWilayah();
  }, []);

  const compressImage = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 300;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          canvas.toBlob(
            (blob) => resolve({ blob, dataUrl }),
            'image/jpeg',
            0.85
          );
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });

  const handleSelectPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Harap pilih file gambar (JPG, PNG, atau WEBP).', 'warning');
      return;
    }

    try {
      const compressed = await compressImage(file);
      setSelectedFile(compressed);
      setAvatarPreview(compressed.dataUrl);
      showToast('Foto dipilih. Klik "Simpan Profil" untuk menerapkan.', 'info');
    } catch {
      showToast('Gagal memproses file gambar.', 'error');
    }
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    setAvatarPreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    showToast('Foto dihapus dari pratinjau. Klik "Simpan Profil" untuk menyimpan.', 'info');
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);

    try {
      let finalAvatarUrl = avatarPreview || null;

      if (selectedFile?.blob) {
        const fileName = `${user.id}-${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, selectedFile.blob, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);
          finalAvatarUrl = publicUrlData.publicUrl;
        } else {
          finalAvatarUrl = selectedFile.dataUrl;
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          nama: nama.trim(),
          kecamatan_id: kecamatanId || null,
          desa_id: desaId || null,
          avatar_url: finalAvatarUrl,
        })
        .eq('id', user.id);

      if (error) throw error;

      await fetchProfile(user.id);
      setSelectedFile(null);
      showToast('Profil dan foto berhasil diperbarui!', 'success');
    } catch (err) {
      showToast('Gagal memperbarui profil: ' + err.message, 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast('Password baru minimal harus 6 karakter.', 'warning');
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);

    if (error) {
      showToast('Gagal mengubah password: ' + error.message, 'error');
    } else {
      setNewPassword('');
      showToast('Password akun Anda berhasil diperbarui!', 'success');
    }
  };

  const filteredDesa = desaList.filter((d) => d.kecamatan_id === kecamatanId);

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Profile Pengguna</h1>
        <p className="text-sm text-slate-500">
          Informasi identitas akun, foto profil, dan hak akses Anda di dalam sistem.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xs lg:col-span-4">
          <div className="relative mx-auto h-28 w-28">
            <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-4 border-indigo-50 bg-indigo-100 text-indigo-600 shadow-inner">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt={nama}
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserCircle className="h-16 w-16" />
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Ubah Foto Profil"
              className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-indigo-600 text-white shadow-md transition hover:bg-indigo-700"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>

          <h2 className="mt-4 text-lg font-bold text-slate-900">{profile?.nama}</h2>
          <p className="text-sm text-slate-500">@{profile?.username}</p>

          <div className="mt-4 flex flex-wrap justify-center gap-1.5">
            {profile?.roles?.map((r) => (
              <span
                key={r}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase text-slate-700"
              >
                <Shield className="h-3 w-3 text-indigo-600" />
                {r === 'admin' ? 'Admin' : 'Kepala Desa'}
              </span>
            ))}
          </div>

          <div className="mt-6 space-y-2 border-t border-slate-100 pt-4 text-left text-sm text-slate-600">
            <p className="flex items-center justify-between py-1">
              <span>Role Sesi Aktif:</span>
              <strong className="uppercase text-indigo-600">{activeRole}</strong>
            </p>
            <p className="flex items-center justify-between py-1">
              <span>Desa:</span>
              <strong className="text-slate-900">{profile?.desa?.nama_desa || '-'}</strong>
            </p>
            <p className="flex items-center justify-between py-1">
              <span>Kecamatan:</span>
              <strong className="text-slate-900">
                {profile?.kecamatan?.nama_kecamatan || '-'}
              </strong>
            </p>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-8">
          <form
            onSubmit={handleUpdateProfile}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
          >
            <h3 className="mb-4 text-base font-bold text-slate-900">
              Ubah Informasi Profil & Foto
            </h3>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase text-slate-600">
                  Foto Profil
                </label>
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-300 bg-white">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserCircle className="h-7 w-7 text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-700">
                      Unggah foto formal atau gambar identitas Anda
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Format JPG, PNG, atau WEBP. Otomatis disesuaikan untuk tampilan Profile & Header.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleSelectPhoto}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3.5 py-2 text-xs font-semibold text-indigo-600 shadow-2xs transition hover:bg-indigo-50"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Pilih Foto
                    </button>

                    {avatarPreview && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Hapus
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-indigo-600 focus:outline-none"
                />
              </div>

              {profile?.roles?.includes('kepala_desa') && (
                <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-700">
                      <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                      Kecamatan
                    </label>
                    <select
                      value={kecamatanId}
                      onChange={(e) => {
                        setKecamatanId(e.target.value);
                        setDesaId('');
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">-- Pilih Kecamatan --</option>
                      {kecamatanList.map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.nama_kecamatan}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Desa
                    </label>
                    <select
                      value={desaId}
                      onChange={(e) => setDesaId(e.target.value)}
                      disabled={!kecamatanId}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
                    >
                      <option value="">-- Pilih Desa --</option>
                      {filteredDesa.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.nama_desa}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {savingProfile ? 'Menyimpan...' : 'Simpan Profil'}
              </button>
            </div>
          </form>

          <form
            onSubmit={handleUpdatePassword}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
          >
            <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
              <KeyRound className="h-4 w-4 text-amber-600" />
              Ganti Password Pribadi
            </h3>
            <div className="flex flex-wrap gap-3">
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Masukkan password baru (min. 6 karakter)"
                className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-600 focus:outline-none"
              />
              <button
                type="submit"
                disabled={savingPassword}
                className="rounded-xl bg-slate-800 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
              >
                {savingPassword ? 'Memproses...' : 'Ubah Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}