import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import { dispatchNotification } from '../../lib/notificationService';
import { NAMA_BULAN, evaluateSubmissionTimeline } from '../../lib/timelineUtils';
import TimelineBanner from '../../components/TimelineBanner';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Eye,
  X,
  Send,
  AlertTriangle,
  Filter,
} from 'lucide-react';

export default function ApproverDashboard() {
  const { user } = useAuth();
  const { showToast, showConfirm } = useDialog();

  const [laporanList, setLaporanList] = useState([]);
  const [kecamatanList, setKecamatanList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [kecFilter, setKecFilter] = useState('ALL');

  // Modal Pemeriksaan Rincian Laporan
  const [inspectModal, setInspectModal] = useState(null);
  const [inspectDetails, setInspectDetails] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modal Form Catatan Penolakan
  const [rejectModal, setRejectModal] = useState(null);
  const [catatanPenolakan, setCatatanPenolakan] = useState('');
  const [processing, setProcessing] = useState(false);

  const timelineInfo = evaluateSubmissionTimeline({
    periodeBulan: new Date().getMonth() + 1,
    periodeTahun: new Date().getFullYear(),
    existingLaporan: null,
    isUnlockedByAdmin: true,
  });

  const fetchApproverData = async () => {
    setLoading(true);
    const [{ data: kecs }, { data: cats }, { data: lapData }] = await Promise.all([
      supabase.from('kecamatan').select('id, nama_kecamatan').order('nama_kecamatan'),
      supabase.from('form_categories').select('*').order('urutan'),
      supabase
        .from('laporan_desa')
        .select(
          '*, desa(id, nama_desa, kecamatan_id, kecamatan(nama_kecamatan)), profiles!laporan_desa_created_by_fkey(nama, username)'
        )
        .order('updated_at', { ascending: false }),
    ]);

    setKecamatanList(kecs || []);
    setCategories(cats || []);
    setLaporanList(lapData || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchApproverData();
  }, []);

  // Buka Modal Rincian Angka yang Diinput Kepala Desa
  const handleOpenInspect = async (lap) => {
    setInspectModal(lap);
    setLoadingDetail(true);

    const { data } = await supabase
      .from('laporan_detail')
      .select(
        '*, form_fields(nama_item, sub_kelompok, tipe_input, satuan_utama, satuan_sekunder, category_id)'
      )
      .eq('laporan_id', lap.id);

    setInspectDetails(data || []);
    setLoadingDetail(false);
  };

  // 1. APPROVE & PUBLISH DATA KE DASHBOARD PUBLIK
  const handleApproveLaporan = async (lap) => {
    const namaBulan = NAMA_BULAN[lap.periode_bulan - 1];
    const confirmed = await showConfirm({
      title: `Approve & Publish Data Desa ${lap.desa?.nama_desa}?`,
      message: `Data komoditas Desa ${lap.desa?.nama_desa} periode ${namaBulan} ${lap.periode_tahun} akan disetujui dan langsung ditampilkan pada Dashboard Publik.`,
      confirmText: 'Ya, Approve & Publish',
      cancelText: 'Batal',
      variant: 'primary',
    });

    if (!confirmed) return;

    setProcessing(true);
    const { error } = await supabase
      .from('laporan_desa')
      .update({
        status: 'approved',
        catatan_approver: null,
        verified_by: user.id,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', lap.id);

    setProcessing(false);

    if (error) {
      showToast('Gagal menyetujui laporan: ' + error.message, 'error');
      return;
    }

    // Kirim Notifikasi & WhatsApp ke Kepala Desa terkait
    await dispatchNotification({
      targetRole: 'kepala_desa',
      desaId: lap.desa_id,
      judul: `Laporan Disetujui (Approved) - ${namaBulan} ${lap.periode_tahun}`,
      pesan: `Selamat! Laporan komoditas Desa ${lap.desa?.nama_desa} periode ${namaBulan} ${lap.periode_tahun} telah DISETUJUI oleh Approver dan kini tayang di Dashboard Publik.`,
      tipe: 'success',
      linkTujuan: '/kades/input-data',
    });

    showToast(
      `Data Desa ${lap.desa?.nama_desa} berhasil di-Approve dan dipublish!`,
      'success'
    );
    setInspectModal(null);
    fetchApproverData();
  };

  // 2. TOLAK DATA DENGAN FORM CATATAN ALASAN PENOLAKAN
  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!catatanPenolakan.trim()) {
      showToast('Wajib mengisi catatan alasan penolakan untuk Kepala Desa.', 'warning');
      return;
    }

    const lap = rejectModal;
    const namaBulan = NAMA_BULAN[lap.periode_bulan - 1];

    setProcessing(true);
    const { error } = await supabase
      .from('laporan_desa')
      .update({
        status: 'rejected',
        catatan_approver: catatanPenolakan.trim(),
        verified_by: user.id,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', lap.id);
    setProcessing(false);

    if (error) {
      showToast('Gagal menolak laporan: ' + error.message, 'error');
      return;
    }

    // Kirim Notifikasi & WhatsApp ke Kepala Desa beserta catatan penolakannya
    await dispatchNotification({
      targetRole: 'kepala_desa',
      desaId: lap.desa_id,
      judul: `Laporan Ditolak (Perlu Perbaikan) - ${namaBulan} ${lap.periode_tahun}`,
      pesan: `Laporan komoditas Desa ${lap.desa?.nama_desa} periode ${namaBulan} ${lap.periode_tahun} DITOLAK oleh Approver.\n\nCatatan Perbaikan: "${catatanPenolakan.trim()}"\n\nSilakan login untuk mengedit dan mengirim ulang data.`,
      tipe: 'error',
      linkTujuan: '/kades/input-data',
    });

    showToast(
      `Laporan Desa ${lap.desa?.nama_desa} ditolak beserta catatan perbaikan.`,
      'info'
    );
    setRejectModal(null);
    setInspectModal(null);
    setCatatanPenolakan('');
    fetchApproverData();
  };

  // 3. SETUJUI ATAU TOLAK PERMINTAAN HAPUS DATA YANG SUDAH APPROVED
  const handleProcessDeleteRequest = async (lap, approveDelete) => {
    const namaBulan = NAMA_BULAN[lap.periode_bulan - 1];

    if (approveDelete) {
      const confirmed = await showConfirm({
        title: `Setujui Hapus Data Desa ${lap.desa?.nama_desa}?`,
        message: `Data periode ${namaBulan} ${lap.periode_tahun} yang sebelumnya sudah di-approve akan dihapus permanen sesuai permintaan Kepala Desa.`,
        confirmText: 'Ya, Hapus Data',
        cancelText: 'Batal',
        variant: 'danger',
      });
      if (!confirmed) return;

      const { error } = await supabase
        .from('laporan_desa')
        .delete()
        .eq('id', lap.id);

      if (error) {
        showToast('Gagal menghapus data: ' + error.message, 'error');
        return;
      }

      await dispatchNotification({
        targetRole: 'kepala_desa',
        desaId: lap.desa_id,
        judul: `Permintaan Hapus Disetujui - ${namaBulan} ${lap.periode_tahun}`,
        pesan: `Permintaan penghapusan laporan Desa ${lap.desa?.nama_desa} periode ${namaBulan} ${lap.periode_tahun} telah DISETUJUI oleh Approver dan data telah dihapus.`,
        tipe: 'warning',
        linkTujuan: '/kades/input-data',
      });

      showToast('Permintaan hapus disetujui & data berhasil dihapus.', 'success');
    } else {
      // Kembalikan status menjadi 'approved' jika permintaan hapus ditolak
      const { error } = await supabase
        .from('laporan_desa')
        .update({
          status: 'approved',
          alasan_hapus: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lap.id);

      if (error) {
        showToast('Gagal membatalkan permintaan hapus: ' + error.message, 'error');
        return;
      }

      await dispatchNotification({
        targetRole: 'kepala_desa',
        desaId: lap.desa_id,
        judul: `Permintaan Hapus Ditolak - ${namaBulan} ${lap.periode_tahun}`,
        pesan: `Permintaan penghapusan laporan Desa ${lap.desa?.nama_desa} periode ${namaBulan} ${lap.periode_tahun} DITOLAK oleh Approver. Data tetap tayang di Dashboard.`,
        tipe: 'info',
        linkTujuan: '/kades/input-data',
      });

      showToast('Permintaan hapus ditolak, data tetap berstatus Approved.', 'info');
    }

    fetchApproverData();
  };

  const filteredLaporan = laporanList.filter((l) => {
    if (statusFilter !== 'ALL' && l.status !== statusFilter) return false;
    if (kecFilter !== 'ALL' && l.desa?.kecamatan_id !== kecFilter) return false;
    return true;
  });

  const countPending = laporanList.filter((l) => l.status === 'pending').length;
  const countApproved = laporanList.filter((l) => l.status === 'approved').length;
  const countRejected = laporanList.filter((l) => l.status === 'rejected').length;
  const countDeleteReq = laporanList.filter(
    (l) => l.status === 'delete_requested'
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Panel Verifikasi & Approval Data Desa
        </h1>
        <p className="text-sm text-slate-500">
          Periksa kelayakan data komoditas yang dikirim oleh Kepala Desa sebelum dipublikasikan ke Dashboard Utama.
        </p>
      </div>

      <TimelineBanner timelineInfo={timelineInfo} />

      {/* Ringkasan Antrean Approval */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-amber-800">
              Menunggu Verifikasi
            </span>
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-amber-900">
            {countPending} Laporan
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-emerald-800">
              Disetujui (Published)
            </span>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-emerald-900">
            {countApproved} Laporan
          </p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-rose-800">
              Ditolak (Perbaikan)
            </span>
            <XCircle className="h-5 w-5 text-rose-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-rose-900">
            {countRejected} Laporan
          </p>
        </div>

        <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-purple-800">
              Permintaan Hapus
            </span>
            <Trash2 className="h-5 w-5 text-purple-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-purple-900">
            {countDeleteReq} Pengajuan
          </p>
        </div>
      </div>

      {/* Filter & Tabel Daftar Pengiriman Kepala Desa */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2 text-base font-bold text-slate-900">
            <ClipboardCheck className="h-5 w-5 text-amber-600" />
            Daftar Pengiriman Laporan Kepala Desa
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700"
            >
              <option value="ALL">Semua Status ({laporanList.length})</option>
              <option value="pending">Menunggu Verifikasi ({countPending})</option>
              <option value="delete_requested">
                Permintaan Hapus ({countDeleteReq})
              </option>
              <option value="approved">Disetujui / Tayang ({countApproved})</option>
              <option value="rejected">Ditolak ({countRejected})</option>
            </select>

            <select
              value={kecFilter}
              onChange={(e) => setKecFilter(e.target.value)}
              className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700"
            >
              <option value="ALL">Semua Kecamatan</option>
              {kecamatanList.map((k) => (
                <option key={k.id} value={k.id}>
                  Kec. {k.nama_kecamatan}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3.5">Desa & Kecamatan</th>
                <th className="px-4 py-3.5">Periode Data</th>
                <th className="px-4 py-3.5">Tanggal Kirim</th>
                <th className="px-4 py-3.5 text-center">Status Verifikasi</th>
                <th className="px-4 py-3.5">Catatan / Keterangan</th>
                <th className="px-4 py-3.5 text-right">Aksi Approver</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-slate-400">
                    Memuat data pengiriman Kepala Desa...
                  </td>
                </tr>
              ) : filteredLaporan.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-slate-400">
                    Tidak ada laporan yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredLaporan.map((lap) => (
                  <tr key={lap.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900">
                        Desa {lap.desa?.nama_desa}
                      </div>
                      <div className="text-xs text-slate-500">
                        Kec. {lap.desa?.kecamatan?.nama_kecamatan}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 font-semibold text-slate-800">
                      {NAMA_BULAN[lap.periode_bulan - 1]} {lap.periode_tahun}
                    </td>

                    <td className="px-4 py-3.5 text-xs text-slate-500">
                      {lap.tanggal_lapor}
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      {lap.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                          <Clock className="h-3.5 w-3.5" />
                          Menunggu Approval
                        </span>
                      )}
                      {lap.status === 'approved' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Approved (Tayang)
                        </span>
                      )}
                      {lap.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">
                          <XCircle className="h-3.5 w-3.5" />
                          Ditolak
                        </span>
                      )}
                      {lap.status === 'delete_requested' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-800">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Minta Dihapus
                        </span>
                      )}
                    </td>

                    <td className="max-w-xs px-4 py-3.5 text-xs text-slate-600">
                      {lap.status === 'rejected' && lap.catatan_approver ? (
                        <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-800">
                          <strong>Catatan Penolakan:</strong> {lap.catatan_approver}
                        </div>
                      ) : lap.status === 'delete_requested' ? (
                        <div className="rounded-lg border border-purple-200 bg-purple-50 p-2 text-purple-800">
                          <strong>Alasan Hapus Kades:</strong>{' '}
                          {lap.alasan_hapus || 'Ingin menghapus laporan ini'}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex flex-wrap justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenInspect(lap)}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                        >
                          <Eye className="h-3.5 w-3.5 text-indigo-600" />
                          Periksa Data
                        </button>

                        {lap.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApproveLaporan(lap)}
                              className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectModal(lap);
                                setCatatanPenolakan(lap.catatan_approver || '');
                              }}
                              className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Tolak
                            </button>
                          </>
                        )}

                        {lap.status === 'delete_requested' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleProcessDeleteRequest(lap, true)}
                              className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Setujui Hapus
                            </button>
                            <button
                              type="button"
                              onClick={() => handleProcessDeleteRequest(lap, false)}
                              className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                            >
                              Tolak Hapus
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: PERIKSA RINCIAN DATA KOMODITAS DESA */}
      {inspectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Pemeriksaan Data Desa {inspectModal.desa?.nama_desa}
                </h3>
                <p className="text-xs text-slate-500">
                  Kec. {inspectModal.desa?.kecamatan?.nama_kecamatan} • Periode{' '}
                  {NAMA_BULAN[inspectModal.periode_bulan - 1]}{' '}
                  {inspectModal.periode_tahun}
                </p>
              </div>
              <button
                onClick={() => setInspectModal(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              {/* Status Konfirmasi Sektor */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-2 text-xs font-bold uppercase text-slate-600">
                  Konfirmasi Ketersediaan Sektor oleh Kepala Desa:
                </p>
                <div className="flex flex-wrap gap-2">
                  {categories
                    .filter((c) => c.butuh_konfirmasi_sektor)
                    .map((c) => {
                      const ada =
                        inspectModal.konfirmasi_sektor?.[c.slug]?.ada !== false;
                      return (
                        <span
                          key={c.id}
                          className={`rounded-lg px-3 py-1 text-xs font-bold ${
                            ada
                              ? 'border border-emerald-200 bg-emerald-100 text-emerald-800'
                              : 'border border-rose-200 bg-rose-100 text-rose-800'
                          }`}
                        >
                          {c.nama_kategori}: {ada ? 'ADA' : 'TIDAK ADA'}
                        </span>
                      );
                    })}
                </div>
              </div>

              {/* Tabel Rincian Item */}
              {loadingDetail ? (
                <p className="py-8 text-center text-sm text-slate-400">
                  Memuat rincian angka komoditas...
                </p>
              ) : inspectDetails.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  Tidak ada rincian angka yang diinput pada laporan ini.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                      <tr>
                        <th className="px-4 py-2.5">Sub-Kelompok</th>
                        <th className="px-4 py-2.5">Komoditas / Pertanyaan</th>
                        <th className="px-4 py-2.5">Nilai Diinput</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {inspectDetails.map((d) => {
                        const f = d.form_fields;
                        return (
                          <tr key={d.id}>
                            <td className="px-4 py-2.5 text-xs text-slate-500">
                              {f?.sub_kelompok}
                            </td>
                            <td className="px-4 py-2.5 font-bold text-slate-800">
                              {f?.nama_item}
                            </td>
                            <td className="px-4 py-2.5 text-slate-700">
                              {f?.tipe_input === 'luas_dan_produksi' ? (
                                <span>
                                  Produksi:{' '}
                                  <strong>
                                    {d.nilai_utama} {f.satuan_utama}
                                  </strong>{' '}
                                  | Luas Lahan:{' '}
                                  <strong>
                                    {d.nilai_sekunder} {f.satuan_sekunder}
                                  </strong>
                                </span>
                              ) : f?.tipe_input === 'angka_tunggal' ? (
                                <strong>
                                  {d.nilai_utama} {f?.satuan_utama}
                                </strong>
                              ) : (
                                <span className="text-xs">
                                  Total: <strong>{d.nilai_utama}</strong> (
                                  {Object.entries(d.rincian_json || {})
                                    .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
                                    .join(', ')}
                                  )
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer Aksi Approver */}
            <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setInspectModal(null)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Tutup
              </button>

              {inspectModal.status !== 'rejected' && (
                <button
                  type="button"
                  onClick={() => {
                    setRejectModal(inspectModal);
                    setCatatanPenolakan(inspectModal.catatan_approver || '');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
                >
                  <XCircle className="h-4 w-4" />
                  Tolak & Beri Catatan Perbaikan
                </button>
              )}

              {inspectModal.status !== 'approved' && (
                <button
                  type="button"
                  onClick={() => handleApproveLaporan(inspectModal)}
                  disabled={processing}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve & Publish ke Dashboard
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: FORM CATATAN PENOLAKAN OLEH APPROVER */}
      {rejectModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="flex items-center gap-2 text-base font-bold text-rose-700">
                <XCircle className="h-5 w-5" />
                Tolak Data Desa {rejectModal.desa?.nama_desa}
              </h3>
              <button
                onClick={() => setRejectModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="mt-4 space-y-4">
              <p className="text-xs text-slate-600">
                Tuliskan catatan alasan penolakan agar Role Kepala Desa mengetahui bagian mana yang tidak sesuai dan dapat segera memperbaikinya:
              </p>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-700">
                  Catatan Perbaikan untuk Kepala Desa
                </label>
                <textarea
                  rows="4"
                  required
                  value={catatanPenolakan}
                  onChange={(e) => setCatatanPenolakan(e.target.value)}
                  placeholder="Contoh: Angka produksi Cakalang dan Luas Lahan Cabai Rawit belum sesuai dengan bukti lapangan, mohon diperbaiki..."
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-800 focus:border-rose-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModal(null)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  {processing ? 'Mengirim...' : 'Kirim Penolakan & Catatan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}