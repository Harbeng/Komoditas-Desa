import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useDialog } from '../../context/DialogContext';
import {
  KeyRound,
  Lock,
  Unlock,
  Edit3,
  Search,
  ShieldCheck,
  Building2,
  X,
  CheckCircle2,
} from 'lucide-react';

export default function AdminUserManagement() {
  const { showToast, showConfirm } = useDialog();
  const [users, setUsers] = useState([]);
  const [kecamatanList, setKecamatanList] = useState([]);
  const [desaList, setDesaList] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [resetModalUser, setResetModalUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const [editModalUser, setEditModalUser] = useState(null);
  const [editNama, setEditNama] = useState('');
  const [editRoles, setEditRoles] = useState([]);
  const [editKecId, setEditKecId] = useState('');
  const [editDesaId, setEditDesaId] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const fetchUsersAndWilayah = async () => {
    setLoading(true);
    const { data: userData } = await supabase
      .from('profiles')
      .select('*, kecamatan(id, nama_kecamatan), desa(id, nama_desa)')
      .order('created_at', { ascending: false });

    const { data: kecData } = await supabase
      .from('kecamatan')
      .select('id, nama_kecamatan')
      .order('nama_kecamatan');

    const { data: dData } = await supabase
      .from('desa')
      .select('id, kecamatan_id, nama_desa')
      .order('nama_desa');

    setUsers(userData || []);
    setKecamatanList(kecData || []);
    setDesaList(dData || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsersAndWilayah();
  }, []);

  const handleToggleLockUser = async (u) => {
    const isLocking = u.is_active;
    const confirmed = await showConfirm({
      title: isLocking
        ? `Kunci Akun @${u.username}?`
        : `Aktifkan Kembali Akun @${u.username}?`,
      message: isLocking
        ? `Pengguna "${u.nama}" tidak akan bisa login atau mengakses sistem selama akunnya dikunci.`
        : `Pengguna "${u.nama}" akan dapat kembali login ke dalam sistem.`,
      confirmText: isLocking ? 'Ya, Kunci Akun' : 'Ya, Aktifkan Akun',
      cancelText: 'Batal',
      variant: isLocking ? 'danger' : 'primary',
    });

    if (!confirmed) return;

    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !u.is_active })
      .eq('id', u.id);

    if (error) {
      showToast('Gagal mengubah status akun: ' + error.message, 'error');
      return;
    }

    showToast(
      `Akun @${u.username} berhasil ${isLocking ? 'dikunci' : 'diaktifkan kembali'}.`,
      'success'
    );
    fetchUsersAndWilayah();
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast('Password baru minimal harus 6 karakter.', 'warning');
      return;
    }

    setResetLoading(true);
    const { error } = await supabase.rpc('admin_reset_user_password', {
      target_user_id: resetModalUser.id,
      new_password: newPassword,
    });
    setResetLoading(false);

    if (error) {
      showToast('Gagal mereset password: ' + error.message, 'error');
      return;
    }

    showToast(`Password untuk akun @${resetModalUser.username} berhasil diubah!`, 'success');
    setResetModalUser(null);
    setNewPassword('');
  };

  const openEditModal = (u) => {
    setEditModalUser(u);
    setEditNama(u.nama);
    setEditRoles(u.roles || ['kepala_desa']);
    setEditKecId(u.kecamatan_id || '');
    setEditDesaId(u.desa_id || '');
  };

  const handleToggleEditRole = (roleName) => {
    setEditRoles((prev) => {
      if (prev.includes(roleName)) {
        if (prev.length === 1) return prev;
        return prev.filter((r) => r !== roleName);
      }
      return [...prev, roleName];
    });
  };

  const handleSaveEditUser = async (e) => {
    e.preventDefault();
    setEditLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        nama: editNama.trim(),
        roles: editRoles,
        kecamatan_id: editKecId || null,
        desa_id: editDesaId || null,
      })
      .eq('id', editModalUser.id);

    setEditLoading(false);

    if (error) {
      showToast('Gagal menyimpan perubahan user: ' + error.message, 'error');
      return;
    }

    showToast(`Data akun @${editModalUser.username} berhasil diperbarui!`, 'success');
    setEditModalUser(null);
    fetchUsersAndWilayah();
  };

  const filteredUsers = users.filter(
    (u) =>
      u.nama.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase())
  );

  const availableDesaForEdit = desaList.filter((d) => d.kecamatan_id === editKecId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Management User</h1>
          <p className="text-sm text-slate-500">
            Kelola akun pengguna, ubah nama & role, kunci akun, atau ganti password tanpa password lama.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau username..."
            className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-indigo-600 focus:outline-none"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600">
              <tr>
                <th className="px-5 py-3.5">Nama & Username</th>
                <th className="px-5 py-3.5">Hak Akses (Role)</th>
                <th className="px-5 py-3.5">Wilayah Tugas (Desa/Kec)</th>
                <th className="px-5 py-3.5 text-center">Status Akun</th>
                <th className="px-5 py-3.5 text-right">Tindakan Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-slate-400">
                    Memuat data pengguna...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-slate-400">
                    Tidak ada akun yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900">{u.nama}</div>
                      <div className="text-xs text-slate-500">@{u.username}</div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {u.roles?.includes('admin') && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Admin
                          </span>
                        )}
                        {u.roles?.includes('kepala_desa') && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            <Building2 className="h-3.5 w-3.5" />
                            Kepala Desa
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-xs text-slate-600">
                      {u.desa?.nama_desa ? (
                        <div>
                          <span className="font-semibold text-slate-800">
                            Desa {u.desa.nama_desa}
                          </span>
                          <div className="text-slate-500">
                            Kec. {u.kecamatan?.nama_kecamatan}
                          </div>
                        </div>
                      ) : (
                        <span className="italic text-slate-400">Tidak terikat desa</span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-center">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800">
                          <Lock className="h-3.5 w-3.5" />
                          Terkunci
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(u)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-indigo-600" />
                          Edit
                        </button>

                        <button
                          onClick={() => {
                            setResetModalUser(u);
                            setNewPassword('');
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          Password
                        </button>

                        <button
                          onClick={() => handleToggleLockUser(u)}
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                            u.is_active
                              ? 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                              : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {u.is_active ? (
                            <>
                              <Lock className="h-3.5 w-3.5" />
                              Kunci
                            </>
                          ) : (
                            <>
                              <Unlock className="h-3.5 w-3.5" />
                              Aktifkan
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: UBAH PASSWORD TANPA PASSWORD LAMA */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <KeyRound className="h-5 w-5 text-amber-600" />
                Reset Password Pengguna
              </h3>
              <button
                onClick={() => setResetModalUser(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="mt-4 space-y-4">
              <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
                Anda akan mengubah password untuk akun{' '}
                <strong>{resetModalUser.nama}</strong> (@{resetModalUser.username}) secara
                langsung tanpa memerlukan password lama.
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                  Password Baru
                </label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Ketik password baru (min. 6 karakter)"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {resetLoading ? 'Menyimpan...' : 'Simpan Password Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT NAMA, ROLE & PENUGASAN DESA */}
      {editModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Edit Data Pengguna (@{editModalUser.username})
              </h3>
              <button
                onClick={() => setEditModalUser(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={editNama}
                  onChange={(e) => setEditNama(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase text-slate-600">
                  Hak Akses (Role)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={editRoles.includes('admin')}
                      onChange={() => handleToggleEditRole('admin')}
                      className="h-4 w-4 rounded text-indigo-600"
                    />
                    <span>Role Admin</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={editRoles.includes('kepala_desa')}
                      onChange={() => handleToggleEditRole('kepala_desa')}
                      className="h-4 w-4 rounded text-emerald-600"
                    />
                    <span>Kepala Desa</span>
                  </label>
                </div>
              </div>

              {editRoles.includes('kepala_desa') && (
                <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5">
                  <p className="text-xs font-semibold text-emerald-800">
                    Wilayah Tugas Kepala Desa:
                  </p>
                  <div>
                    <label className="mb-1 block text-xs text-slate-600">Kecamatan</label>
                    <select
                      value={editKecId}
                      onChange={(e) => {
                        setEditKecId(e.target.value);
                        setEditDesaId('');
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
                    <label className="mb-1 block text-xs text-slate-600">Desa</label>
                    <select
                      value={editDesaId}
                      onChange={(e) => setEditDesaId(e.target.value)}
                      disabled={!editKecId}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
                    >
                      <option value="">-- Pilih Desa --</option>
                      {availableDesaForEdit.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.nama_desa}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModalUser(null)}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {editLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}