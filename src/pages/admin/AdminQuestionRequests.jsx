import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import { dispatchNotification } from '../../lib/notificationService';
import { NAMA_BULAN } from '../../lib/timelineUtils';
import {
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  Unlock,
  Lock,
  X,
  Send,
  Search,
  MapPin,
  Building2,
  Calendar,
} from 'lucide-react';

export default function AdminQuestionRequests() {
  const { user } = useAuth();
  const { showToast, showConfirm } = useDialog();
  const now = new Date();

  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'unlocks'
  const [requests, setRequests] = useState([]);
  const [kecamatanList, setKecamatanList] = useState([]);
  const [desaList, setDesaList] = useState([]);
  const [unlocks, setUnlocks] = useState([]);
  const [laporanBulanIni, setLaporanBulanIni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Filter Periode untuk Buka Kunci Timeline Desa
  const [bulanUnlock, setBulanUnlock] = useState(now.getMonth() + 1);
  const [tahunUnlock, setTahunUnlock] = useState(now.getFullYear());

  // State Filter Kecamatan, Desa & Pencarian Nama Desa
  const [filterKecId, setFilterKecId] = useState('ALL');
  const [filterDesaId, setFilterDesaId] = useState('ALL');
  const [searchDesa, setSearchDesa] = useState('');

  // Modal Keputusan Admin (Approve / Tolak Pertanyaan Baru + Catatan)
  const [decisionModal, setDecisionModal] = useState(null);
  const [catatanAdmin, setCatatanAdmin] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchAllData = async () => {
    setLoading(true);
    const [
      { data: reqData },
      { data: kecData },
      { data: dData },
      { data: uData },
      { data: lapData },
    ] = await Promise.all([
      supabase
        .from('question_requests')
        .select(
          '*, profiles(nama, username), desa(nama_desa), kecamatan(nama_kecamatan), form_categories(nama_kategori)'
        )
        .order('created_at', { ascending: false }),
      supabase
        .from('kecamatan')
        .select('id, nama_kecamatan')
        .order('nama_kecamatan'),
      supabase
        .from('desa')
        .select('id, nama_desa, kecamatan_id, kecamatan(nama_kecamatan)')
        .order('nama_desa'),
      supabase
        .from('desa_unlocks')
        .select('*')
        .eq('periode_bulan', bulanUnlock)
        .eq('periode_tahun', tahunUnlock),
      supabase
        .from('laporan_desa')
        .select('id, desa_id, status')
        .eq('periode_bulan', bulanUnlock)
        .eq('periode_tahun', tahunUnlock),
    ]);

    setRequests(reqData || []);
    setKecamatanList(kecData || []);
    setDesaList(dData || []);
    setUnlocks(uData || []);
    setLaporanBulanIni(lapData || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAllData();
  }, [bulanUnlock, tahunUnlock]);

  // Daftar opsi desa untuk dropdown Filter Desa (menyesuaikan Kecamatan yang dipilih)
  const availableDesaOptions = useMemo(() => {
    if (filterKecId === 'ALL') return desaList;
    return desaList.filter((d) => d.kecamatan_id === filterKecId);
  }, [desaList, filterKecId]);

  // Daftar desa yang ditampilkan pada tabel setelah difilter Kecamatan, Desa, dan Search
  const filteredDesaList = useMemo(() => {
    return desaList.filter((d) => {
      if (filterKecId !== 'ALL' && d.kecamatan_id !== filterKecId) return false;
      if (filterDesaId !== 'ALL' && d.id !== filterDesaId) return false;
      if (searchDesa.trim()) {
        const q = searchDesa.trim().toLowerCase();
        const matchDesa = d.nama_desa?.toLowerCase().includes(q);
        const matchKec = d.kecamatan?.nama_kecamatan?.toLowerCase().includes(q);
        if (!matchDesa && !matchKec) return false;
      }
      return true;
    });
  }, [desaList, filterKecId, filterDesaId, searchDesa]);

  // Proses Approve atau Reject Permintaan Pertanyaan Kepala Desa
  const handleProcessQuestionRequest = async (e) => {
    e.preventDefault();
    if (!decisionModal) return;

    const { req, action } = decisionModal;
    if (!catatanAdmin.trim()) {
      showToast('Berikan catatan konfirmasi untuk Kepala Desa.', 'warning');
      return;
    }

    setProcessing(true);
    try {
      if (action === 'approved') {
        const { error: fieldErr } = await supabase.from('form_fields').insert({
          category_id: req.category_id,
          sub_kelompok: req.sub_kelompok || 'Umum',
          nama_item: req.nama_item,
          tipe_input: req.tipe_input,
          satuan_utama: req.satuan_utama || 'Ton',
          satuan_sekunder:
            req.tipe_input === 'luas_dan_produksi'
              ? req.satuan_sekunder || 'Ha'
              : null,
          is_active: true,
        });

        if (fieldErr) throw fieldErr;
      }

      const { error: updErr } = await supabase
        .from('question_requests')
        .update({
          status: action,
          catatan_admin: catatanAdmin.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', req.id);

      if (updErr) throw updErr;

      await dispatchNotification({
        targetUserId: req.user_id,
        targetRole: 'kepala_desa',
        desaId: req.desa_id,
        judul: `Usulan Pertanyaan "${req.nama_item}" ${
          action === 'approved' ? 'Disetujui' : 'Ditolak'
        }`,
        pesan: `Usulan penambahan pertanyaan "${req.nama_item}" oleh ${
          req.profiles?.nama || 'Kepala Desa'
        } telah ${
          action === 'approved'
            ? 'DISETUJUI dan ditambahkan ke Form Input'
            : 'DITOLAK'
        } oleh Admin.\n\nCatatan Admin: "${catatanAdmin.trim()}"`,
        tipe: action === 'approved' ? 'success' : 'error',
        linkTujuan: '/kades/request-pertanyaan',
      });

      showToast(
        `Usulan pertanyaan "${req.nama_item}" berhasil ${
          action === 'approved' ? 'disetujui & ditambahkan ke form!' : 'ditolak.'
        }`,
        'success'
      );
      setDecisionModal(null);
      setCatatanAdmin('');
      fetchAllData();
    } catch (err) {
      showToast('Gagal memproses permintaan: ' + err.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Fitur Buka / Kunci Kembali Timeline Input untuk 1 Desa
  const handleToggleUnlockDesa = async (desaObj, currentlyUnlocked) => {
    const namaBulan = NAMA_BULAN[bulanUnlock - 1];

    if (currentlyUnlocked) {
      const confirmed = await showConfirm({
        title: `Kunci Kembali Akses Input Desa ${desaObj.nama_desa}?`,
        message: `Akses khusus luar jadwal untuk Desa ${desaObj.nama_desa} periode ${namaBulan} ${tahunUnlock} akan ditutup kembali.`,
        confirmText: 'Ya, Kunci Kembali',
        cancelText: 'Batal',
        variant: 'warning',
      });
      if (!confirmed) return;

      await supabase
        .from('desa_unlocks')
        .delete()
        .eq('desa_id', desaObj.id)
        .eq('periode_bulan', bulanUnlock)
        .eq('periode_tahun', tahunUnlock);

      showToast(`Akses Desa ${desaObj.nama_desa} dikembalikan ke aturan jadwal.`, 'info');
    } else {
      const { error } = await supabase.from('desa_unlocks').upsert(
        {
          desa_id: desaObj.id,
          periode_bulan: bulanUnlock,
          periode_tahun: tahunUnlock,
          unlocked_by: user.id,
          keterangan: 'Dibuka oleh Admin karena melewati batas waktu 2 minggu awal',
        },
        { onConflict: 'desa_id,periode_bulan,periode_tahun' }
      );

      if (error) {
        showToast('Gagal membuka kunci desa: ' + error.message, 'error');
        return;
      }

      await dispatchNotification({
        targetRole: 'kepala_desa',
        desaId: desaObj.id,
        judul: `Akses Input Dibuka Admin - ${namaBulan} ${tahunUnlock}`,
        pesan: `Admin telah membuka kunci akses input data komoditas Desa ${desaObj.nama_desa} untuk periode ${namaBulan} ${tahunUnlock}. Silakan segera menginput dan mengirimkan data Anda.`,
        tipe: 'success',
        linkTujuan: '/kades/input-data',
      });

      showToast(
        `Kunci input Desa ${desaObj.nama_desa} periode ${namaBulan} ${tahunUnlock} berhasil dibuka!`,
        'success'
      );
    }

    fetchAllData();
  };

  // FITUR BARU 1: BUKA KUNCI SEMUA DESA SEKALIGUS
  const handleUnlockAllDesa = async () => {
    if (filteredDesaList.length === 0) {
      showToast('Tidak ada desa pada daftar untuk dibuka kuncinya.', 'warning');
      return;
    }

    const namaBulan = NAMA_BULAN[bulanUnlock - 1];
    const isFiltered =
      filterKecId !== 'ALL' || filterDesaId !== 'ALL' || searchDesa.trim() !== '';

    const confirmed = await showConfirm({
      title: `Buka Kunci Input untuk ${filteredDesaList.length} Desa Sekaligus?`,
      message: `Seluruh ${filteredDesaList.length} desa ${
        isFiltered ? 'yang tampil pada filter saat ini' : 'di Kabupaten'
      } akan dibuka kunci akses inputnya untuk periode ${namaBulan} ${tahunUnlock}.`,
      confirmText: `Ya, Buka Kunci (${filteredDesaList.length} Desa)`,
      cancelText: 'Batal',
      variant: 'primary',
    });

    if (!confirmed) return;

    setBulkProcessing(true);
    try {
      const payloads = filteredDesaList.map((d) => ({
        desa_id: d.id,
        periode_bulan: bulanUnlock,
        periode_tahun: tahunUnlock,
        unlocked_by: user.id,
        keterangan: 'Dibuka serentak oleh Admin',
      }));

      const { error } = await supabase
        .from('desa_unlocks')
        .upsert(payloads, { onConflict: 'desa_id,periode_bulan,periode_tahun' });

      if (error) throw error;

      // Kirim notifikasi pengumuman ke Kepala Desa
      await dispatchNotification({
        targetRole: 'kepala_desa',
        judul: `Akses Input Dibuka Serentak - ${namaBulan} ${tahunUnlock}`,
        pesan: `Admin telah membuka kunci akses input data komoditas periode ${namaBulan} ${tahunUnlock} untuk ${filteredDesaList.length} desa. Silakan segera melengkapi laporan desa Anda.`,
        tipe: 'success',
        linkTujuan: '/kades/input-data',
      });

      showToast(
        `Berhasil membuka kunci input untuk ${filteredDesaList.length} desa sekaligus!`,
        'success'
      );
      fetchAllData();
    } catch (err) {
      showToast('Gagal membuka kunci semua desa: ' + err.message, 'error');
    } finally {
      setBulkProcessing(false);
    }
  };

  // FITUR BARU 2: KUNCI SEMUA DESA SEKALIGUS
  const handleLockAllDesa = async () => {
    if (filteredDesaList.length === 0) {
      showToast('Tidak ada desa pada daftar untuk dikunci.', 'warning');
      return;
    }

    const namaBulan = NAMA_BULAN[bulanUnlock - 1];
    const targetIds = filteredDesaList.map((d) => d.id);

    const confirmed = await showConfirm({
      title: `Kunci Kembali Akses Input untuk ${filteredDesaList.length} Desa?`,
      message: `Akses buka kunci manual untuk ${filteredDesaList.length} desa pada periode ${namaBulan} ${tahunUnlock} akan dicabut dan dikembalikan ke aturan kunci otomatis.`,
      confirmText: `Ya, Kunci Semua (${filteredDesaList.length} Desa)`,
      cancelText: 'Batal',
      variant: 'danger',
    });

    if (!confirmed) return;

    setBulkProcessing(true);
    try {
      const { error } = await supabase
        .from('desa_unlocks')
        .delete()
        .eq('periode_bulan', bulanUnlock)
        .eq('periode_tahun', tahunUnlock)
        .in('desa_id', targetIds);

      if (error) throw error;

      showToast(
        `Berhasil mengunci kembali akses input untuk ${filteredDesaList.length} desa!`,
        'info'
      );
      fetchAllData();
    } catch (err) {
      showToast('Gagal mengunci semua desa: ' + err.message, 'error');
    } finally {
      setBulkProcessing(false);
    }
  };

  const unlockedCountInFilter = filteredDesaList.filter((d) =>
    unlocks.some((u) => u.desa_id === d.id)
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Permintaan Pertanyaan Kades & Kunci Timeline Desa
          </h1>
          <p className="text-sm text-slate-500">
            Kelola usulan pertanyaan baru dari Kepala Desa serta buka/kunci pengiriman data desa.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
              activeTab === 'requests'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Permintaan Pertanyaan (
            {requests.filter((r) => r.status === 'pending').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('unlocks')}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
              activeTab === 'unlocks'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Buka Kunci Timeline Desa
          </button>
        </div>
      </div>

      {/* TAB 1: DAFTAR PERMINTAAN PERTANYAAN DARI KEPALA DESA */}
      {activeTab === 'requests' ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
            <Inbox className="h-5 w-5 text-indigo-600" />
            Daftar Laporan Permintaan Tambah Pertanyaan dari Kepala Desa
          </h2>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3.5">Pengirim (Kades, Desa, Kec)</th>
                  <th className="px-4 py-3.5">Usulan Pertanyaan / Komoditas</th>
                  <th className="px-4 py-3.5">Sektor & Tipe Input</th>
                  <th className="px-4 py-3.5">Alasan & Catatan</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-right">Aksi Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-10 text-center text-slate-400">
                      Memuat daftar laporan permintaan...
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-10 text-center text-slate-400">
                      Belum ada laporan permintaan pertanyaan dari Kepala Desa.
                    </td>
                  </tr>
                ) : (
                  requests.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">
                          {r.profiles?.nama || '-'}
                        </div>
                        <div className="text-xs font-semibold text-indigo-600">
                          Desa {r.desa?.nama_desa || '-'}
                        </div>
                        <div className="text-xs text-slate-500">
                          Kec. {r.kecamatan?.nama_kecamatan || '-'}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{r.nama_item}</div>
                        <div className="text-xs text-slate-500">
                          Satuan: {r.satuan_utama} | Sub: {r.sub_kelompok}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        <div className="font-semibold text-slate-800">
                          {r.form_categories?.nama_kategori}
                        </div>
                        <div>Tipe: {r.tipe_input}</div>
                      </td>

                      <td className="max-w-xs px-4 py-3.5 text-xs text-slate-600">
                        <div>
                          <strong>Alasan Kades:</strong> {r.alasan_permintaan || '-'}
                        </div>
                        {r.catatan_admin && (
                          <div className="mt-1 rounded-md bg-slate-100 p-1.5 text-slate-800">
                            <strong>Catatan Admin:</strong> {r.catatan_admin}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        {r.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                            <Clock className="h-3.5 w-3.5" />
                            Pending
                          </span>
                        )}
                        {r.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Approved
                          </span>
                        )}
                        {r.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">
                            <XCircle className="h-3.5 w-3.5" />
                            Ditolak
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        {r.status === 'pending' && (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setDecisionModal({ req: r, action: 'approved' });
                                setCatatanAdmin(
                                  'Pertanyaan disetujui dan telah ditambahkan ke Form Komoditas.'
                                );
                              }}
                              className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDecisionModal({ req: r, action: 'rejected' });
                                setCatatanAdmin('');
                              }}
                              className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
                            >
                              Tolak
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* TAB 2: FITUR BUKA KUNCI TIMELINE INPUT DESA (DENGAN TOMBOL MASSAL & FILTER) */
        <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
          {/* Header & Tombol Buka Kunci Semua / Kunci Semua */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                Manajemen Kunci Timeline Pengiriman Data Desa
              </h2>
              <p className="text-xs text-slate-500">
                Terbuka: <strong>{unlockedCountInFilter}</strong> dari{' '}
                <strong>{filteredDesaList.length}</strong> desa yang ditampilkan pada periode{' '}
                <strong>
                  {NAMA_BULAN[bulanUnlock - 1]} {tahunUnlock}
                </strong>
                .
              </p>
            </div>

            {/* Tombol Aksi Massal: Buka Kunci Semua & Kunci Semua */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={bulkProcessing || filteredDesaList.length === 0}
                onClick={handleUnlockAllDesa}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-50"
              >
                <Unlock className="h-4 w-4" />
                Buka Kunci Semua ({filteredDesaList.length})
              </button>

              <button
                type="button"
                disabled={bulkProcessing || filteredDesaList.length === 0}
                onClick={handleLockAllDesa}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-rose-700 disabled:opacity-50"
              >
                <Lock className="h-4 w-4" />
                Kunci Input Semua ({filteredDesaList.length})
              </button>
            </div>
          </div>

          {/* Panel Filter Kecamatan, Desa, Pencarian Nama Desa & Periode */}
          <div className="grid grid-cols-1 gap-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2 lg:grid-cols-12">
            {/* Filter Kecamatan */}
            <div className="lg:col-span-3">
              <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <MapPin className="h-3.5 w-3.5 text-indigo-600" />
                Filter Kecamatan
              </label>
              <select
                value={filterKecId}
                onChange={(e) => {
                  setFilterKecId(e.target.value);
                  setFilterDesaId('ALL');
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-600 focus:outline-none"
              >
                <option value="ALL">Semua Kecamatan ({kecamatanList.length})</option>
                {kecamatanList.map((k) => (
                  <option key={k.id} value={k.id}>
                    Kec. {k.nama_kecamatan}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Desa */}
            <div className="lg:col-span-3">
              <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                Filter Desa
              </label>
              <select
                value={filterDesaId}
                onChange={(e) => setFilterDesaId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-600 focus:outline-none"
              >
                <option value="ALL">
                  Semua Desa ({availableDesaOptions.length})
                </option>
                {availableDesaOptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    Desa {d.nama_desa}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Cari Nama Desa */}
            <div className="lg:col-span-3">
              <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <Search className="h-3.5 w-3.5 text-slate-500" />
                Cari Nama Desa
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchDesa}
                  onChange={(e) => setSearchDesa(e.target.value)}
                  placeholder="Ketik nama desa..."
                  className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-8 pr-8 text-xs font-medium text-slate-800 focus:border-indigo-600 focus:outline-none"
                />
                {searchDesa && (
                  <button
                    type="button"
                    onClick={() => setSearchDesa('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Pilih Periode Bulan & Tahun */}
            <div className="lg:col-span-3">
              <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <Calendar className="h-3.5 w-3.5 text-amber-600" />
                Periode Kunci Input
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={bulanUnlock}
                  onChange={(e) => setBulanUnlock(Number(e.target.value))}
                  className="rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-bold text-slate-800"
                >
                  {NAMA_BULAN.map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={tahunUnlock}
                  onChange={(e) => setTahunUnlock(Number(e.target.value))}
                  className="rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-bold text-slate-800"
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tabel Daftar Desa */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                <tr>
                  <th className="w-12 px-4 py-3">No</th>
                  <th className="px-4 py-3">Desa & Kecamatan</th>
                  <th className="px-4 py-3 text-center">Status Laporan Periode Ini</th>
                  <th className="px-4 py-3 text-center">Status Akses Timeline</th>
                  <th className="px-4 py-3 text-right">Kontrol Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="py-10 text-center text-slate-400">
                      Memuat data desa...
                    </td>
                  </tr>
                ) : filteredDesaList.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-10 text-center text-slate-400">
                      Tidak ada desa yang sesuai dengan filter atau pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredDesaList.map((d, index) => {
                    const isUnlocked = unlocks.some((u) => u.desa_id === d.id);
                    const lap = laporanBulanIni.find((l) => l.desa_id === d.id);

                    return (
                      <tr key={d.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3.5 text-xs text-slate-500">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-900">
                            Desa {d.nama_desa}
                          </div>
                          <div className="text-xs text-slate-500">
                            Kec. {d.kecamatan?.nama_kecamatan}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-center text-xs font-bold">
                          {lap ? (
                            <span className="rounded-full bg-emerald-100 px-3 py-1 uppercase text-emerald-800">
                              Sudah Kirim ({lap.status})
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                              Belum Mengirim Data
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          {isUnlocked ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                              <Unlock className="h-3.5 w-3.5" />
                              Dibuka oleh Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                              <Lock className="h-3.5 w-3.5" />
                              Mengikuti Jadwal Otomatis
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleToggleUnlockDesa(d, isUnlocked)}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                              isUnlocked
                                ? 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                            }`}
                          >
                            {isUnlocked ? (
                              <>
                                <Lock className="h-3.5 w-3.5" />
                                Kunci Kembali
                              </>
                            ) : (
                              <>
                                <Unlock className="h-3.5 w-3.5" />
                                Buka Kunci Input
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL KEPUTUSAN ADMIN + CATATAN UNTUK KEPALA DESA */}
      {decisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {decisionModal.action === 'approved'
                  ? `Setujui Pertanyaan "${decisionModal.req.nama_item}"`
                  : `Tolak Pertanyaan "${decisionModal.req.nama_item}"`}
              </h3>
              <button
                onClick={() => setDecisionModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleProcessQuestionRequest} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-600">
                  Catatan Admin untuk Kepala Desa
                </label>
                <textarea
                  rows="3"
                  required
                  value={catatanAdmin}
                  onChange={(e) => setCatatanAdmin(e.target.value)}
                  placeholder="Tuliskan catatan untuk Kepala Desa..."
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDecisionModal(null)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-bold text-white ${
                    decisionModal.action === 'approved'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  <Send className="h-3.5 w-3.5" />
                  {processing ? 'Memproses...' : 'Simpan & Kirim Notifikasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}