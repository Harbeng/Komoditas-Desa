import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import { dispatchNotification } from '../../lib/notificationService';
import {
  MessageSquarePlus,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  Trash2,
} from 'lucide-react';

export default function KadesRequestForm() {
  const { user, profile } = useAuth();
  const { showToast, showConfirm } = useDialog();

  const [categories, setCategories] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // State Form Usulan Pertanyaan
  const [categoryId, setCategoryId] = useState('');
  const [namaItem, setNamaItem] = useState('');
  const [subKelompok, setSubKelompok] = useState('Umum');
  const [tipeInput, setTipeInput] = useState('angka_tunggal');
  const [satuanUtama, setSatuanUtama] = useState('Ton');
  const [satuanSekunder, setSatuanSekunder] = useState('Ha');
  const [alasan, setAlasan] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const [{ data: cats }, { data: reqData }] = await Promise.all([
      supabase.from('form_categories').select('*').order('urutan'),
      supabase
        .from('question_requests')
        .select('*, form_categories(nama_kategori)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ]);

    const catList = cats || [];
    setCategories(catList);
    if (catList.length > 0 && !categoryId) setCategoryId(catList[0].id);
    setRequests(reqData || []);
    setLoading(false);
  };

  useEffect(() => {
    if (user?.id) fetchData();
  }, [user?.id]);

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!namaItem.trim() || !categoryId) return;

    setSubmitting(true);
    const { error } = await supabase.from('question_requests').insert({
      user_id: user.id,
      desa_id: profile?.desa_id || null,
      kecamatan_id: profile?.kecamatan_id || null,
      category_id: categoryId,
      nama_item: namaItem.trim(),
      sub_kelompok: subKelompok.trim() || 'Umum',
      tipe_input: tipeInput,
      satuan_utama: satuanUtama.trim() || 'Ton',
      satuan_sekunder: tipeInput === 'luas_dan_produksi' ? satuanSekunder.trim() : null,
      alasan_permintaan: alasan.trim(),
      status: 'pending',
    });

    setSubmitting(false);

    if (error) {
      showToast('Gagal mengirim usulan pertanyaan: ' + error.message, 'error');
      return;
    }

    // Kirim Notifikasi & WhatsApp ke Role Admin
    await dispatchNotification({
      targetRole: 'admin',
      judul: `Usulan Pertanyaan Baru dari Desa ${profile?.desa?.nama_desa || '-'}`,
      pesan: `Pengirim: ${profile?.nama} (Desa ${
        profile?.desa?.nama_desa || '-'
      }, Kec. ${
        profile?.kecamatan?.nama_kecamatan || '-'
      }) mengajukan penambahan item form baru: "${namaItem.trim()}".`,
      tipe: 'info',
      linkTujuan: '/admin/request-pertanyaan',
    });

    showToast('Usulan penambahan pertanyaan berhasil dikirim ke Admin!', 'success');
    setNamaItem('');
    setAlasan('');
    fetchData();
  };

  const handleDeletePending = async (reqItem) => {
    const confirmed = await showConfirm({
      title: `Batalkan Usulan "${reqItem.nama_item}"?`,
      message: 'Usulan yang masih berstatus menunggu dapat dihapus.',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      variant: 'danger',
    });
    if (!confirmed) return;

    await supabase.from('question_requests').delete().eq('id', reqItem.id);
    showToast('Usulan berhasil dihapus.', 'info');
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Usulan Penambahan Pertanyaan / Komoditas Baru
        </h1>
        <p className="text-sm text-slate-500">
          Ajukan penambahan komoditas atau indikator yang belum tersedia pada form kepada Role Admin.
        </p>
      </div>

      {/* Form Pengajuan ke Admin */}
      <form
        onSubmit={handleSubmitRequest}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
      >
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
          <MessageSquarePlus className="h-5 w-5 text-emerald-600" />
          Form Permintaan Pertanyaan Baru
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
          <div className="sm:col-span-4">
            <label className="mb-1 block text-xs font-bold uppercase text-slate-600">
              Kategori Sektor
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nama_kategori}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-4">
            <label className="mb-1 block text-xs font-bold uppercase text-slate-600">
              Nama Pertanyaan / Komoditas Baru
            </label>
            <input
              type="text"
              required
              value={namaItem}
              onChange={(e) => setNamaItem(e.target.value)}
              placeholder="Contoh: Vanili / Rumput Laut / Jumlah Poskesdes"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="mb-1 block text-xs font-bold uppercase text-slate-600">
              Tipe Input yang Diinginkan
            </label>
            <select
              value={tipeInput}
              onChange={(e) => setTipeInput(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
            >
              <option value="angka_tunggal">Angka Tunggal (Jumlah / Ton / Ekor)</option>
              <option value="luas_dan_produksi">Produksi & Luas Lahan (2 Kolom)</option>
              <option value="gender_l_p">Rincian Laki-Laki & Perempuan</option>
              <option value="tingkat_pendidikan">Tingkat Pendidikan</option>
              <option value="tingkat_sekolah">Tingkat Sekolah</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <label className="mb-1 block text-xs font-bold uppercase text-slate-600">
              Satuan Utama
            </label>
            <input
              type="text"
              value={satuanUtama}
              onChange={(e) => setSatuanUtama(e.target.value)}
              placeholder="Ton / Ekor / Unit"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="mb-1 block text-xs font-bold uppercase text-slate-600">
              Sub-Kelompok
            </label>
            <input
              type="text"
              value={subKelompok}
              onChange={(e) => setSubKelompok(e.target.value)}
              placeholder="Contoh: Perkebunan"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
            />
          </div>

          <div className="sm:col-span-6">
            <label className="mb-1 block text-xs font-bold uppercase text-slate-600">
              Alasan / Keterangan Pengajuan
            </label>
            <input
              type="text"
              required
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              placeholder="Contoh: Komoditas ini mulai banyak dibudidayakan warga desa kami..."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {submitting ? 'Mengirim Usulan...' : 'Kirim Permintaan ke Admin'}
          </button>
        </div>
      </form>

      {/* Tabel Riwayat Status Usulan Pertanyaan & Catatan Admin */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h2 className="mb-4 text-base font-bold text-slate-900">
          Riwayat & Status Permintaan Pertanyaan Anda
        </h2>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">Nama Pertanyaan / Komoditas</th>
                <th className="px-4 py-3">Kategori Sektor</th>
                <th className="px-4 py-3">Alasan Pengajuan</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3">Catatan dari Admin</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">
                    Memuat riwayat permintaan...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">
                    Belum ada permintaan penambahan pertanyaan yang dikirim.
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3.5 font-bold text-slate-900">
                      {r.nama_item}
                      <div className="text-xs font-normal text-slate-500">
                        Satuan: {r.satuan_utama}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">
                      {r.form_categories?.nama_kategori}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">
                      {r.alasan_permintaan || '-'}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {r.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                          <Clock className="h-3.5 w-3.5" />
                          Menunggu Admin
                        </span>
                      )}
                      {r.status === 'approved' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Disetujui
                        </span>
                      )}
                      {r.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">
                          <XCircle className="h-3.5 w-3.5" />
                          Ditolak
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-700">
                      {r.catatan_admin ? (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 font-medium">
                          {r.catatan_admin}
                        </div>
                      ) : (
                        <span className="text-slate-400">Belum ada catatan</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {r.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => handleDeletePending(r)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          title="Batalkan Usulan"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}