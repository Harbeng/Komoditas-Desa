import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import { dispatchNotification } from '../../lib/notificationService';
import {
  NAMA_BULAN,
  evaluateSubmissionTimeline,
} from '../../lib/timelineUtils';
import TimelineBanner from '../../components/TimelineBanner';
import {
  ClipboardEdit,
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Calendar,
  Eye,
  Layers,
  Clock,
  Trash2,
  Edit3,
  Lock,
} from 'lucide-react';

export default function KadesInputForm() {
  const { user, profile } = useAuth();
  const { showToast, showConfirm } = useDialog();
  const now = new Date();

  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [tahun, setTahun] = useState(now.getFullYear());

  const [categories, setCategories] = useState([]);
  const [fields, setFields] = useState([]);
  const [activeCatId, setActiveCatId] = useState('');
  const [searchItem, setSearchItem] = useState('');

  const [currentLaporan, setCurrentLaporan] = useState(null);
  const [isUnlockedByAdmin, setIsUnlockedByAdmin] = useState(false);
  const [konfirmasiSektor, setKonfirmasiSektor] = useState({});
  const [inputValues, setInputValues] = useState({});
  const [riwayatLaporan, setRiwayatLaporan] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Ambil struktur form
  useEffect(() => {
    const fetchMasterForm = async () => {
      const [{ data: catData }, { data: fieldData }] = await Promise.all([
        supabase.from('form_categories').select('*').order('urutan'),
        supabase
          .from('form_fields')
          .select('*')
          .eq('is_active', true)
          .order('urutan'),
      ]);

      const cats = catData || [];
      setCategories(cats);
      setFields(fieldData || []);
      if (cats.length > 0) setActiveCatId(cats[0].id);
    };
    fetchMasterForm();
  }, []);

  // Ambil laporan periode aktif, status unlock admin, dan histori pengiriman desa
  const fetchExistingLaporan = async () => {
    if (!profile?.desa_id || categories.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const [{ data: lap }, { data: unlockRow }, { data: historyData }] =
      await Promise.all([
        supabase
          .from('laporan_desa')
          .select('*')
          .eq('desa_id', profile.desa_id)
          .eq('periode_bulan', bulan)
          .eq('periode_tahun', tahun)
          .maybeSingle(),
        supabase
          .from('desa_unlocks')
          .select('*')
          .eq('desa_id', profile.desa_id)
          .eq('periode_bulan', bulan)
          .eq('periode_tahun', tahun)
          .maybeSingle(),
        supabase
          .from('laporan_desa')
          .select(
            '*, laporan_detail(id, field_id, nilai_utama, nilai_sekunder, rincian_json)'
          )
          .eq('desa_id', profile.desa_id)
          .order('periode_tahun', { ascending: false })
          .order('periode_bulan', { ascending: false }),
      ]);

    setCurrentLaporan(lap || null);
    setIsUnlockedByAdmin(Boolean(unlockRow));
    setRiwayatLaporan(historyData || []);

    const defaultKonfirmasi = {};
    categories.forEach((c) => {
      defaultKonfirmasi[c.slug] = {
        ada: lap?.konfirmasi_sektor?.[c.slug]?.ada ?? true,
      };
    });
    setKonfirmasiSektor(defaultKonfirmasi);

    if (lap) {
      const { data: details } = await supabase
        .from('laporan_detail')
        .select('*')
        .eq('laporan_id', lap.id);

      const mapped = {};
      (details || []).forEach((d) => {
        mapped[d.field_id] = {
          nilai_utama: d.nilai_utama ?? '',
          nilai_sekunder: d.nilai_sekunder ?? '',
          rincian_json: d.rincian_json || {},
        };
      });
      setInputValues(mapped);
    } else {
      setInputValues({});
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchExistingLaporan();
  }, [profile?.desa_id, bulan, tahun, categories.length]);

  // Evaluasi status kunci timeline
  const timelineInfo = evaluateSubmissionTimeline({
    periodeBulan: bulan,
    periodeTahun: tahun,
    existingLaporan: currentLaporan,
    isUnlockedByAdmin,
  });

  const handleToggleSektor = async (slug, statusAda, namaKategori) => {
    if (timelineInfo.isLocked) return;

    if (!statusAda) {
      const confirmed = await showConfirm({
        title: `Konfirmasi Sektor Tidak Ada?`,
        message: `Anda menyatakan sektor "${namaKategori}" TIDAK ADA di Desa ${profile?.desa?.nama_desa}. Rincian angka pada sektor ini akan diset menjadi 0 saat dikirim.`,
        confirmText: 'Ya, Konfirmasi Tidak Ada',
        cancelText: 'Batal',
        variant: 'warning',
      });
      if (!confirmed) return;
    }

    setKonfirmasiSektor((prev) => ({
      ...prev,
      [slug]: { ada: statusAda },
    }));
  };

  const handleValueChange = (fieldId, key, val) => {
    if (timelineInfo.isLocked) return;
    setInputValues((prev) => ({
      ...prev,
      [fieldId]: {
        ...prev[fieldId],
        [key]: val,
      },
    }));
  };

  const handleRincianChange = (fieldId, subKey, val) => {
    if (timelineInfo.isLocked) return;
    setInputValues((prev) => {
      const currentField = prev[fieldId] || {};
      const currentRincian = currentField.rincian_json || {};
      const updatedRincian = {
        ...currentRincian,
        [subKey]: val === '' ? '' : Number(val),
      };

      const total = Object.values(updatedRincian).reduce(
        (acc, num) => acc + (Number(num) || 0),
        0
      );

      return {
        ...prev,
        [fieldId]: {
          ...currentField,
          nilai_utama: total,
          rincian_json: updatedRincian,
        },
      };
    });
  };

  // KIRIM DATA KE ROLE APPROVER (STATUS = 'pending')
  const handleSaveData = async (e) => {
    e.preventDefault();
    if (!profile?.desa_id) return;

    if (timelineInfo.isLocked) {
      showToast(timelineInfo.lockReason, 'error');
      return;
    }

    const namaBulanAktif = NAMA_BULAN[bulan - 1];
    const isResubmitRejected = currentLaporan?.status === 'rejected';

    setSaving(true);
    try {
      const { data: savedLaporan, error: lapError } = await supabase
        .from('laporan_desa')
        .upsert(
          {
            desa_id: profile.desa_id,
            created_by: user.id,
            periode_bulan: bulan,
            periode_tahun: tahun,
            tanggal_lapor: new Date().toISOString().split('T')[0],
            konfirmasi_sektor: konfirmasiSektor,
            status: 'pending', // Masuk ke antrean Role Approver terlebih dahulu
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'desa_id,periode_bulan,periode_tahun' }
        )
        .select()
        .single();

      if (lapError) throw lapError;

      const detailPayloads = [];
      fields.forEach((f) => {
        const cat = categories.find((c) => c.id === f.category_id);
        const sektorAda = cat?.butuh_konfirmasi_sektor
          ? konfirmasiSektor[cat.slug]?.ada !== false
          : true;

        if (!sektorAda) {
          detailPayloads.push({
            laporan_id: savedLaporan.id,
            field_id: f.id,
            nilai_utama: 0,
            nilai_sekunder: 0,
            rincian_json: {},
          });
          return;
        }

        const valObj = inputValues[f.id];
        if (!valObj) return;

        const utama = Number(valObj.nilai_utama) || 0;
        const sekunder = Number(valObj.nilai_sekunder) || 0;
        const rincian = valObj.rincian_json || {};

        if (utama > 0 || sekunder > 0 || Object.keys(rincian).length > 0) {
          detailPayloads.push({
            laporan_id: savedLaporan.id,
            field_id: f.id,
            nilai_utama: utama,
            nilai_sekunder: sekunder,
            rincian_json: rincian,
          });
        }
      });

      if (detailPayloads.length > 0) {
        const { error: detailError } = await supabase
          .from('laporan_detail')
          .upsert(detailPayloads, { onConflict: 'laporan_id,field_id' });

        if (detailError) throw detailError;
      }

      // Kirim Notifikasi & WhatsApp ke Role Approver
      await dispatchNotification({
        targetRole: 'approver',
        judul: isResubmitRejected
          ? `Perbaikan Data Dikirim Ulang - Desa ${profile?.desa?.nama_desa}`
          : `Pengiriman Data Baru - Desa ${profile?.desa?.nama_desa}`,
        pesan: `Kepala Desa ${profile?.desa?.nama_desa} (Kec. ${
          profile?.kecamatan?.nama_kecamatan
        }) telah mengirimkan ${
          isResubmitRejected ? 'perbaikan ' : ''
        }data komoditas periode ${namaBulanAktif} ${tahun}. Mohon segera diperiksa pada panel Approver.`,
        tipe: 'info',
        linkTujuan: '/approver/dashboard',
      });

      showToast(
        `Data periode ${namaBulanAktif} ${tahun} berhasil dikirim ke Role Approver untuk diperiksa!`,
        'success'
      );
      fetchExistingLaporan();
    } catch (err) {
      showToast('Gagal mengirim data: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // HAPUS DATA (Langsung hapus jika masih 'pending' / 'rejected', atau Ajukan ke Approver jika sudah 'approved')
  const handleDeleteLaporan = async (lap) => {
    const namaBulanLap = NAMA_BULAN[lap.periode_bulan - 1];

    if (lap.status === 'pending' || lap.status === 'rejected') {
      const confirmed = await showConfirm({
        title: `Hapus Pengiriman ${namaBulanLap} ${lap.periode_tahun}?`,
        message: `Data periode ${namaBulanLap} ${lap.periode_tahun} belum disetujui oleh Approver sehingga dapat langsung Anda hapus.`,
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

      showToast('Data pengiriman berhasil dihapus.', 'success');
      fetchExistingLaporan();
    } else if (lap.status === 'approved') {
      const confirmed = await showConfirm({
        title: `Ajukan Penghapusan ke Role Approver?`,
        message: `Data periode ${namaBulanLap} ${lap.periode_tahun} sudah berstatus Approved (Tayang). Sesuai prosedur, penghapusan harus melalui persetujuan Role Approver terlebih dahulu.`,
        confirmText: 'Ya, Ajukan Hapus ke Approver',
        cancelText: 'Batal',
        variant: 'warning',
      });
      if (!confirmed) return;

      const { error } = await supabase
        .from('laporan_desa')
        .update({
          status: 'delete_requested',
          alasan_hapus: `Diajukan hapus oleh Kepala Desa ${profile?.nama}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lap.id);

      if (error) {
        showToast('Gagal mengajukan penghapusan: ' + error.message, 'error');
        return;
      }

      await dispatchNotification({
        targetRole: 'approver',
        judul: `Permintaan Hapus Data Approved - Desa ${profile?.desa?.nama_desa}`,
        pesan: `Kepala Desa ${profile?.desa?.nama_desa} mengajukan penghapusan untuk data periode ${namaBulanLap} ${lap.periode_tahun} yang sebelumnya telah di-Approve.`,
        tipe: 'warning',
        linkTujuan: '/approver/dashboard',
      });

      showToast(
        'Permintaan hapus berhasil dikirim ke Role Approver untuk diverifikasi.',
        'info'
      );
      fetchExistingLaporan();
    }
  };

  if (!profile?.desa_id) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" />
          <div>
            <h2 className="text-lg font-bold">Desa Tugas Belum Ditautkan</h2>
            <p className="mt-1 text-sm text-amber-800">
              Silakan pilih Kecamatan dan Desa Anda terlebih dahulu di halaman Profile agar dapat menginput data komoditas.
            </p>
            <Link
              to="/kades/profile"
              className="mt-4 inline-block rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700"
            >
              Atur Wilayah Desa di Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const activeCategory = categories.find((c) => c.id === activeCatId);
  const isSektorAda = activeCategory?.butuh_konfirmasi_sektor
    ? konfirmasiSektor[activeCategory.slug]?.ada !== false
    : true;

  const activeFields = fields.filter(
    (f) =>
      f.category_id === activeCatId &&
      f.nama_item.toLowerCase().includes(searchItem.toLowerCase())
  );

  const namaBulanTerpilih = NAMA_BULAN[bulan - 1];

  return (
    <div className="w-full space-y-6">
      {/* Header & Pilih Periode Laporan */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <ClipboardEdit className="h-3.5 w-3.5" />
            Desa {profile?.desa?.nama_desa} — Kec. {profile?.kecamatan?.nama_kecamatan}
          </span>
          <h1 className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
            Input Data & Histori Pengiriman Komoditas
          </h1>
          <p className="text-xs text-slate-500 sm:text-sm">
            Data yang dikirim akan diperiksa oleh Role Approver sebelum tayang di Dashboard Utama.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <Calendar className="h-4 w-4 text-emerald-600" />
            Periode:
          </div>
          <select
            value={bulan}
            onChange={(e) => setBulan(Number(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800"
          >
            {NAMA_BULAN.map((nama, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {nama}
              </option>
            ))}
          </select>

          <select
            value={tahun}
            onChange={(e) => setTahun(Number(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* BANNER TIMELINE MINGGU 1-2 VS MINGGU 3-4 */}
      <TimelineBanner timelineInfo={timelineInfo} />

      {/* PERINGATAN CATATAN PENOLAKAN DARI APPROVER (JIKA STATUS = 'rejected') */}
      {currentLaporan?.status === 'rejected' && (
        <div className="rounded-2xl border-2 border-rose-300 bg-rose-50 p-5 shadow-xs">
          <div className="flex items-start gap-3">
            <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-rose-600" />
            <div className="flex-1">
              <h3 className="text-base font-extrabold text-rose-900">
                Data Periode {namaBulanTerpilih} {tahun} Ditolak oleh Approver — Silakan Perbaiki
              </h3>
              <p className="mt-1 text-xs font-medium text-rose-800">
                Catatan dari Approver:
              </p>
              <div className="mt-1.5 rounded-xl border border-rose-200 bg-white p-3 text-sm font-semibold text-slate-800">
                "{currentLaporan.catatan_approver || 'Mohon periksa kembali kesesuaian angka komoditas.'}"
              </div>
              <p className="mt-2 text-xs text-rose-700">
                *Karena data ini sudah pernah dikirim sebelumnya, form Anda <strong>tidak terkunci</strong>. Silakan langsung edit angka pada form di bawah lalu klik <strong>Kirim Perbaikan Data ke Approver</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB KATEGORI SEKTOR */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => {
          const isSelected = cat.id === activeCatId;
          const statusAda = cat.butuh_konfirmasi_sektor
            ? konfirmasiSektor[cat.slug]?.ada !== false
            : true;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setActiveCatId(cat.id);
                setSearchItem('');
              }}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                isSelected
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>{cat.nama_kategori}</span>
              {cat.butuh_konfirmasi_sektor && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    isSelected
                      ? 'bg-emerald-800 text-emerald-100'
                      : statusAda
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {statusAda ? 'Ada' : 'Tidak Ada'}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* FORM INPUT KOMODITAS */}
      <form onSubmit={handleSaveData} className="space-y-6">
        <div
          className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6 ${
            timelineInfo.isLocked ? 'opacity-75' : ''
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Layers className="h-5 w-5 text-emerald-600" />
                {activeCategory?.nama_kategori}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Konfirmasi ketersediaan sektor dan isi rincian data komoditas desa.
              </p>
            </div>

            {activeCategory?.butuh_konfirmasi_sektor && (
              <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-1.5">
                <button
                  type="button"
                  disabled={timelineInfo.isLocked}
                  onClick={() =>
                    handleToggleSektor(
                      activeCategory.slug,
                      true,
                      activeCategory.nama_kategori
                    )
                  }
                  className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition ${
                    isSektorAda
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  ADA DI DESA INI
                </button>
                <button
                  type="button"
                  disabled={timelineInfo.isLocked}
                  onClick={() =>
                    handleToggleSektor(
                      activeCategory.slug,
                      false,
                      activeCategory.nama_kategori
                    )
                  }
                  className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition ${
                    !isSektorAda
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <XCircle className="h-4 w-4" />
                  TIDAK ADA
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">
              Memuat form komoditas...
            </div>
          ) : !isSektorAda ? (
            <div className="my-6 rounded-2xl border border-rose-200 bg-rose-50/50 p-8 text-center">
              <XCircle className="mx-auto h-10 w-10 text-rose-500" />
              <h3 className="mt-2 text-base font-bold text-slate-800">
                Sektor "{activeCategory?.nama_kategori}" Dikonfirmasi Tidak Ada
              </h3>
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs text-amber-800">
                  Belum menemukan pertanyaan/komoditas yang dicari?{' '}
                  <Link
                    to="/kades/request-pertanyaan"
                    className="font-bold underline hover:text-amber-950"
                  >
                    Ajukan Tambah Pertanyaan ke Admin
                  </Link>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchItem}
                    onChange={(e) => setSearchItem(e.target.value)}
                    placeholder={`Cari di ${activeCategory?.nama_kategori}...`}
                    className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {activeFields.map((field) => {
                  const val = inputValues[field.id] || {};
                  const rincian = val.rincian_json || {};

                  return (
                    <div
                      key={field.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition hover:border-emerald-300 hover:bg-white"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className="font-bold text-slate-800">
                          {field.nama_item}
                        </span>
                        <span className="rounded-md bg-slate-200/70 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                          {field.sub_kelompok}
                        </span>
                      </div>

                      {field.tipe_input === 'angka_tunggal' && (
                        <div>
                          <label className="mb-1 block text-xs text-slate-500">
                            Jumlah / Produksi ({field.satuan_utama})
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              disabled={timelineInfo.isLocked}
                              value={val.nilai_utama ?? ''}
                              onChange={(e) =>
                                handleValueChange(field.id, 'nilai_utama', e.target.value)
                              }
                              placeholder="0"
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
                            />
                            <span className="shrink-0 text-xs font-semibold text-slate-500">
                              {field.satuan_utama}
                            </span>
                          </div>
                        </div>
                      )}

                      {field.tipe_input === 'luas_dan_produksi' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="mb-1 block text-xs text-slate-500">
                              Produksi ({field.satuan_utama || 'Ton'})
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              disabled={timelineInfo.isLocked}
                              value={val.nilai_utama ?? ''}
                              onChange={(e) =>
                                handleValueChange(field.id, 'nilai_utama', e.target.value)
                              }
                              placeholder="0"
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-slate-500">
                              Luas Lahan ({field.satuan_sekunder || 'Ha'})
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              disabled={timelineInfo.isLocked}
                              value={val.nilai_sekunder ?? ''}
                              onChange={(e) =>
                                handleValueChange(
                                  field.id,
                                  'nilai_sekunder',
                                  e.target.value
                                )
                              }
                              placeholder="0"
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
                            />
                          </div>
                        </div>
                      )}

                      {field.tipe_input === 'gender_l_p' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="mb-1 block text-xs text-slate-500">
                              Laki-Laki ({field.satuan_utama})
                            </label>
                            <input
                              type="number"
                              min="0"
                              disabled={timelineInfo.isLocked}
                              value={rincian.laki_laki ?? ''}
                              onChange={(e) =>
                                handleRincianChange(field.id, 'laki_laki', e.target.value)
                              }
                              placeholder="0"
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-slate-500">
                              Perempuan ({field.satuan_utama})
                            </label>
                            <input
                              type="number"
                              min="0"
                              disabled={timelineInfo.isLocked}
                              value={rincian.perempuan ?? ''}
                              onChange={(e) =>
                                handleRincianChange(field.id, 'perempuan', e.target.value)
                              }
                              placeholder="0"
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
                            />
                          </div>
                        </div>
                      )}

                      {field.tipe_input === 'tingkat_pendidikan' && (
                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                          {[
                            { key: 'sd', label: 'SD' },
                            { key: 'smp', label: 'SMP' },
                            { key: 'sma', label: 'SMA/SMK' },
                            { key: 'diploma', label: 'D1-D3' },
                            { key: 'sarjana', label: 'S1/S2/S3' },
                          ].map((jenjang) => (
                            <div key={jenjang.key}>
                              <label className="mb-1 block text-[11px] font-medium text-slate-500">
                                {jenjang.label}
                              </label>
                              <input
                                type="number"
                                min="0"
                                disabled={timelineInfo.isLocked}
                                value={rincian[jenjang.key] ?? ''}
                                onChange={(e) =>
                                  handleRincianChange(
                                    field.id,
                                    jenjang.key,
                                    e.target.value
                                  )
                                }
                                placeholder="0"
                                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm disabled:bg-slate-100"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {field.tipe_input === 'tingkat_sekolah' && (
                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                          {[
                            { key: 'tk_paud', label: 'TK / PAUD' },
                            { key: 'sd', label: 'SD / MI' },
                            { key: 'smp', label: 'SMP / MTs' },
                            { key: 'sma_smk', label: 'SMA / SMK' },
                          ].map((tingkat) => (
                            <div key={tingkat.key}>
                              <label className="mb-1 block text-[11px] font-medium text-slate-500">
                                {tingkat.label}
                              </label>
                              <input
                                type="number"
                                min="0"
                                disabled={timelineInfo.isLocked}
                                value={rincian[tingkat.key] ?? ''}
                                onChange={(e) =>
                                  handleRincianChange(
                                    field.id,
                                    tingkat.key,
                                    e.target.value
                                  )
                                }
                                placeholder="0"
                                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm disabled:bg-slate-100"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tombol Kirim ke Approver */}
          <div className="mt-6 flex items-center justify-end border-t border-slate-100 pt-5">
            {timelineInfo.isLocked ? (
              <div className="inline-flex items-center gap-2 rounded-xl bg-slate-200 px-5 py-3 text-xs font-bold text-slate-600">
                <Lock className="h-4 w-4" />
                Pengiriman Terkunci untuk Periode Ini
              </div>
            ) : (
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {saving
                  ? 'Mengirim ke Approver...'
                  : currentLaporan?.status === 'rejected'
                  ? `Kirim Perbaikan Data (${namaBulanTerpilih} ${tahun})`
                  : `Kirim Data ke Approver (${namaBulanTerpilih} ${tahun})`}
              </button>
            )}
          </div>
        </div>
      </form>

      {/* TABEL HISTORI PENGIRIMAN LENGKAP DENGAN STATUS, CATATAN APPROVER, EDIT & HAPUS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Eye className="h-5 w-5 text-emerald-600" />
              Histori Pengiriman Data Desa {profile?.desa?.nama_desa}
            </h2>
            <p className="text-xs text-slate-500">
              Pantau status verifikasi Approver, catatan perbaikan jika ditolak, serta kelola penghapusan data.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3.5">Periode Laporan</th>
                <th className="px-4 py-3.5">Tanggal Kirim</th>
                <th className="px-4 py-3.5 text-center">Item Terisi</th>
                <th className="px-4 py-3.5 text-center">Status Pengiriman</th>
                <th className="px-4 py-3.5">Catatan Approver</th>
                <th className="px-4 py-3.5 text-right">Tindakan (Edit / Hapus)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {riwayatLaporan.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">
                    Belum ada histori pengiriman data untuk desa ini.
                  </td>
                </tr>
              ) : (
                riwayatLaporan.map((lap) => (
                  <tr key={lap.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3.5 font-bold text-slate-900">
                      {NAMA_BULAN[lap.periode_bulan - 1]} {lap.periode_tahun}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">
                      {lap.tanggal_lapor}
                    </td>
                    <td className="px-4 py-3.5 text-center font-semibold text-slate-700">
                      {lap.laporan_detail?.length || 0} Item
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {lap.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                          <Clock className="h-3.5 w-3.5" />
                          Menunggu Approver
                        </span>
                      )}
                      {lap.status === 'approved' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Disetujui (Published)
                        </span>
                      )}
                      {lap.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">
                          <XCircle className="h-3.5 w-3.5" />
                          Ditolak (Perlu Edit)
                        </span>
                      )}
                      {lap.status === 'delete_requested' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-800">
                          <Clock className="h-3.5 w-3.5" />
                          Menunggu Hapus Approver
                        </span>
                      )}
                    </td>
                    <td className="max-w-xs px-4 py-3.5 text-xs">
                      {lap.status === 'rejected' && lap.catatan_approver ? (
                        <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 font-medium text-rose-800">
                          {lap.catatan_approver}
                        </div>
                      ) : lap.status === 'approved' ? (
                        <span className="text-emerald-700 font-medium">
                          Data sesuai & tayang di Dashboard Publik
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {/* Tombol Edit (Tersedia untuk 'pending' dan 'rejected') */}
                        {(lap.status === 'pending' || lap.status === 'rejected') && (
                          <button
                            type="button"
                            onClick={() => {
                              setBulan(lap.periode_bulan);
                              setTahun(lap.periode_tahun);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            {lap.status === 'rejected' ? 'Perbaiki Data' : 'Edit'}
                          </button>
                        )}

                        {/* Tombol Hapus Langsung (Jika masih 'pending' atau 'rejected') */}
                        {(lap.status === 'pending' || lap.status === 'rejected') && (
                          <button
                            type="button"
                            onClick={() => handleDeleteLaporan(lap)}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Hapus
                          </button>
                        )}

                        {/* Tombol Ajukan Hapus ke Approver (Jika sudah 'approved') */}
                        {lap.status === 'approved' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteLaporan(lap)}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100"
                            title="Harus melalui persetujuan Role Approver"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Minta Hapus ke Approver
                          </button>
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
    </div>
  );
}