import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import {
  ClipboardEdit,
  Save,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Calendar,
  Eye,
  Layers,
} from 'lucide-react';

const NAMA_BULAN = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export default function KadesInputForm() {
  const { user, profile } = useAuth();
  const { showToast, showConfirm } = useDialog();
  const now = new Date();

  // State Periode Laporan
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [tahun, setTahun] = useState(now.getFullYear());

  // State Master Form dari Admin
  const [categories, setCategories] = useState([]);
  const [fields, setFields] = useState([]);
  const [activeCatId, setActiveCatId] = useState('');
  const [searchItem, setSearchItem] = useState('');

  // State Nilai Input & Konfirmasi Sektor
  const [konfirmasiSektor, setKonfirmasiSektor] = useState({});
  const [inputValues, setInputValues] = useState({});
  const [riwayatLaporan, setRiwayatLaporan] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // 1. Ambil struktur kategori dan pertanyaan aktif yang disiapkan Admin
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

      if (cats.length > 0) {
        setActiveCatId(cats[0].id);
      }
    };

    fetchMasterForm();
  }, []);

  // 2. Ambil data laporan desa jika pada bulan & tahun tersebut sudah pernah diinput
  const fetchExistingLaporan = async () => {
    if (!profile?.desa_id || categories.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Ambil laporan periode aktif
    const { data: lap } = await supabase
      .from('laporan_desa')
      .select('*')
      .eq('desa_id', profile.desa_id)
      .eq('periode_bulan', bulan)
      .eq('periode_tahun', tahun)
      .maybeSingle();

    // Default konfirmasi sektor
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

    // Ambil daftar riwayat laporan desa yang sudah pernah diinput
    const { data: historyData } = await supabase
      .from('laporan_desa')
      .select('*, laporan_detail(id, field_id, nilai_utama, nilai_sekunder, rincian_json)')
      .eq('desa_id', profile.desa_id)
      .order('periode_tahun', { ascending: false })
      .order('periode_bulan', { ascending: false });

    setRiwayatLaporan(historyData || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchExistingLaporan();
  }, [profile?.desa_id, bulan, tahun, categories.length]);

  // Handler Toggle Konfirmasi Sektor (Ada / Tidak Ada) dengan konfirmasi aplikasi
  const handleToggleSektor = async (slug, statusAda, namaKategori) => {
    if (!statusAda) {
      const confirmed = await showConfirm({
        title: `Konfirmasi Sektor Tidak Ada?`,
        message: `Anda menyatakan sektor "${namaKategori}" TIDAK ADA di Desa ${profile?.desa?.nama_desa}. Rincian angka pada sektor ini akan diset menjadi 0 saat disimpan.`,
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

    showToast(
      `Sektor "${namaKategori}" diatur menjadi ${statusAda ? 'ADA' : 'TIDAK ADA'}.`,
      'info'
    );
  };

  // Handler Perubahan Nilai Angka Tunggal & Luas/Produksi
  const handleValueChange = (fieldId, key, val) => {
    setInputValues((prev) => ({
      ...prev,
      [fieldId]: {
        ...prev[fieldId],
        [key]: val,
      },
    }));
  };

  // Handler Perubahan Rincian JSON (Laki/Perempuan, Tingkat Pendidikan, Tingkat Sekolah)
  const handleRincianChange = (fieldId, subKey, val) => {
    setInputValues((prev) => {
      const currentField = prev[fieldId] || {};
      const currentRincian = currentField.rincian_json || {};
      const updatedRincian = {
        ...currentRincian,
        [subKey]: val === '' ? '' : Number(val),
      };

      // Hitung otomatis total nilai_utama dari seluruh rincian
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

  // Simpan Seluruh Data Form & Konfirmasi Sektor ke Supabase
  const handleSaveData = async (e) => {
    e.preventDefault();
    if (!profile?.desa_id) return;

    const namaBulanAktif = NAMA_BULAN[bulan - 1];

    setSaving(true);
    setSaveMessage('');

    try {
      // 1. Upsert Header Laporan Desa (beserta JSON konfirmasi sektor Ada/Tidak Ada)
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
          },
          { onConflict: 'desa_id,periode_bulan,periode_tahun' }
        )
        .select()
        .single();

      if (lapError) throw lapError;

      // 2. Siapkan baris detail untuk item yang diisi
      const detailPayloads = [];

      fields.forEach((f) => {
        const cat = categories.find((c) => c.id === f.category_id);
        const sektorAda = cat?.butuh_konfirmasi_sektor
          ? konfirmasiSektor[cat.slug]?.ada !== false
          : true;

        // Jika sektor dikonfirmasi "Tidak Ada", set nilai menjadi 0
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

      const successText = `Data komoditas Desa ${profile?.desa?.nama_desa} periode ${namaBulanAktif} ${tahun} berhasil disimpan!`;
      setSaveMessage(successText);
      showToast(successText, 'success');
      fetchExistingLaporan();
    } catch (err) {
      showToast('Gagal menyimpan data: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Jika akun Multirole belum memilih desa di menu Profile
  if (!profile?.desa_id) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" />
          <div>
            <h2 className="text-lg font-bold">Desa Tugas Belum Ditautkan</h2>
            <p className="mt-1 text-sm text-amber-800">
              Akun Anda belum terhubung ke Desa tertentu. Silakan pilih Kecamatan dan Desa Anda terlebih dahulu di halaman Profile agar dapat menginput data komoditas.
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

  // Daftar item yang sudah memiliki nilai pada periode aktif (untuk ringkasan bawah)
  const filledItemsThisPeriod = fields.filter((f) => {
    const v = inputValues[f.id];
    if (!v) return false;
    return Number(v.nilai_utama) > 0 || Number(v.nilai_sekunder) > 0;
  });

  const namaBulanTerpilih = NAMA_BULAN[bulan - 1];

  return (
    <div className="w-full space-y-6">
      {/* Header & Pilih Periode Laporan */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <ClipboardEdit className="h-3.5 w-3.5" />
            Desa {profile?.desa?.nama_desa} — Kec. {profile?.kecamatan?.nama_kecamatan}
          </span>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            Form Input Data & Komoditas Desa
          </h1>
          <p className="text-sm text-slate-500">
            Konfirmasi ketersediaan sektor dan isi rincian data komoditas sesuai kondisi desa.
          </p>
        </div>

        {/* Pemilih Bulan & Tahun */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <Calendar className="h-4 w-4 text-emerald-600" />
            Periode Data:
          </div>
          <select
            value={bulan}
            onChange={(e) => setBulan(Number(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 focus:border-emerald-600 focus:outline-none"
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
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 focus:border-emerald-600 focus:outline-none"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {saveMessage && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 shadow-xs">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Tab Kategori Sektor */}
      <div className="flex flex-wrap gap-2">
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
              className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
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

      {/* Area Form Utama */}
      <form onSubmit={handleSaveData} className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          {/* Baris Atas: Judul Sektor & Tombol Konfirmasi ADA / TIDAK ADA */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Layers className="h-5 w-5 text-emerald-600" />
                {activeCategory?.nama_kategori}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {activeCategory?.butuh_konfirmasi_sektor
                  ? 'Pilih konfirmasi apakah sektor komoditas ini ADA atau TIDAK ADA di desa Anda. Rincian jumlah bersifat opsional.'
                  : 'Isi data demografi, pemerintahan, dan pendidikan desa Anda.'}
              </p>
            </div>

            {activeCategory?.butuh_konfirmasi_sektor && (
              <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-1.5">
                <button
                  type="button"
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

          {/* Konten Input Berdasarkan Konfirmasi Sektor */}
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
              <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
                Anda telah mengonfirmasi bahwa sektor ini tidak terdapat di Desa{' '}
                {profile?.desa?.nama_desa}. Anda tidak perlu mengisi rincian angka di
                bawah dan dapat langsung menyimpan atau berpindah ke sektor lain.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              {/* Bar Pencarian Komoditas di dalam Sektor */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs text-amber-800">
                  <strong>Info Pengisian:</strong> Tidak semua item wajib diisi. Cukup isi
                  komoditas yang datanya tersedia di desa Anda.
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

              {/* Grid Item Form */}
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

                      {/* TIPE 1: ANGKA TUNGGAL */}
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
                              value={val.nilai_utama ?? ''}
                              onChange={(e) =>
                                handleValueChange(field.id, 'nilai_utama', e.target.value)
                              }
                              placeholder="0"
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                            />
                            <span className="shrink-0 text-xs font-semibold text-slate-500">
                              {field.satuan_utama}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* TIPE 2: PRODUKSI & LUAS LAHAN */}
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
                              value={val.nilai_utama ?? ''}
                              onChange={(e) =>
                                handleValueChange(field.id, 'nilai_utama', e.target.value)
                              }
                              placeholder="0"
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
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
                              value={val.nilai_sekunder ?? ''}
                              onChange={(e) =>
                                handleValueChange(
                                  field.id,
                                  'nilai_sekunder',
                                  e.target.value
                                )
                              }
                              placeholder="0"
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                            />
                          </div>
                        </div>
                      )}

                      {/* TIPE 3: GENDER LAKI-LAKI / PEREMPUAN */}
                      {field.tipe_input === 'gender_l_p' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="mb-1 block text-xs text-slate-500">
                              Laki-Laki ({field.satuan_utama})
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={rincian.laki_laki ?? ''}
                              onChange={(e) =>
                                handleRincianChange(field.id, 'laki_laki', e.target.value)
                              }
                              placeholder="0"
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-slate-500">
                              Perempuan ({field.satuan_utama})
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={rincian.perempuan ?? ''}
                              onChange={(e) =>
                                handleRincianChange(field.id, 'perempuan', e.target.value)
                              }
                              placeholder="0"
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                            />
                          </div>
                        </div>
                      )}

                      {/* TIPE 4: TINGKAT PENDIDIKAN */}
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
                                value={rincian[jenjang.key] ?? ''}
                                onChange={(e) =>
                                  handleRincianChange(
                                    field.id,
                                    jenjang.key,
                                    e.target.value
                                  )
                                }
                                placeholder="0"
                                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm focus:border-emerald-600 focus:outline-none"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* TIPE 5: TINGKAT SEKOLAH (SEKOLAH / GURU / MURID) */}
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
                                value={rincian[tingkat.key] ?? ''}
                                onChange={(e) =>
                                  handleRincianChange(
                                    field.id,
                                    tingkat.key,
                                    e.target.value
                                  )
                                }
                                placeholder="0"
                                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm focus:border-emerald-600 focus:outline-none"
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

          {/* Tombol Simpan Permanen */}
          <div className="mt-6 flex items-center justify-end border-t border-slate-100 pt-5">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving
                ? 'Menyimpan Data Desa...'
                : `Simpan Data Periode ${namaBulanTerpilih} ${tahun}`}
            </button>
          </div>
        </div>
      </form>

      {/* BAGIAN BAWAH: MENAMPILKAN DATA YANG SUDAH DIINPUT */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Eye className="h-5 w-5 text-emerald-600" />
              Data yang Sudah Diinput ({namaBulanTerpilih} {tahun})
            </h2>
            <p className="text-xs text-slate-500">
              Ringkasan item komoditas dan demografi yang telah memiliki nilai pada periode ini.
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            {filledItemsThisPeriod.length} Item Terisi
          </span>
        </div>

        {filledItemsThisPeriod.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            Belum ada rincian angka yang diinput pada periode {namaBulanTerpilih} {tahun}.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">Kategori Sektor</th>
                  <th className="px-4 py-3">Nama Komoditas / Pertanyaan</th>
                  <th className="px-4 py-3">Data Tersimpan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filledItemsThisPeriod.map((f) => {
                  const cat = categories.find((c) => c.id === f.category_id);
                  const v = inputValues[f.id] || {};
                  return (
                    <tr key={f.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-xs font-semibold text-slate-500">
                        {cat?.nama_kategori}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800">{f.nama_item}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {f.tipe_input === 'luas_dan_produksi' ? (
                          <span>
                            Produksi: <strong>{v.nilai_utama || 0} {f.satuan_utama}</strong> | Luas
                            Lahan: <strong>{v.nilai_sekunder || 0} {f.satuan_sekunder}</strong>
                          </span>
                        ) : f.tipe_input === 'angka_tunggal' ? (
                          <strong>
                            {v.nilai_utama} {f.satuan_utama}
                          </strong>
                        ) : (
                          <span className="text-xs">
                            Total: <strong>{v.nilai_utama} {f.satuan_utama}</strong> (
                            {Object.entries(v.rincian_json || {})
                              .map(([k, valNum]) => `${k.toUpperCase()}: ${valNum || 0}`)
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

        {/* Riwayat Periode Pelaporan Desa */}
        {riwayatLaporan.length > 0 && (
          <div className="mt-6 border-t border-slate-100 pt-5">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
              Riwayat Periode yang Pernah Dilaporkan Desa {profile?.desa?.nama_desa}
            </h3>
            <div className="flex flex-wrap gap-2">
              {riwayatLaporan.map((lap) => (
                <button
                  key={lap.id}
                  type="button"
                  onClick={() => {
                    setBulan(lap.periode_bulan);
                    setTahun(lap.periode_tahun);
                  }}
                  className={`rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                    lap.periode_bulan === bulan && lap.periode_tahun === tahun
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {NAMA_BULAN[lap.periode_bulan - 1]} {lap.periode_tahun} (
                  {lap.laporan_detail?.length || 0} item)
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}