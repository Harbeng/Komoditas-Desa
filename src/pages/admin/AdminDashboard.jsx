import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { exportToCSV, exportToExcel } from '../../lib/exportUtils';
import {
  MapPinned,
  Building2,
  FileCheck2,
  Users,
  Eye,
  X,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import { useDialog } from '../../context/DialogContext';

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function AdminDashboard() {
  const now = new Date();
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [tahun, setTahun] = useState(now.getFullYear());
  const [filterKecId, setFilterKecId] = useState('ALL');

  const [stats, setStats] = useState({
    totalKecamatan: 0,
    totalDesa: 0,
    totalUsers: 0,
    totalLaporanPeriode: 0,
  });

  const [kecamatanList, setKecamatanList] = useState([]);
  const [desaMonitoring, setDesaMonitoring] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportingFull, setExportingFull] = useState(false);

  // Modal Lihat Rincian Laporan Desa
  const [detailModal, setDetailModal] = useState(null);
  const [detailItems, setDetailItems] = useState([]);

  const fetchMonitoringData = async () => {
    setLoading(true);

    const [
      { data: kecData },
      { data: desaData },
      { count: userCount },
      { data: catData },
      { data: laporanData },
    ] = await Promise.all([
      supabase.from('kecamatan').select('id, nama_kecamatan').order('nama_kecamatan'),
      supabase
        .from('desa')
        .select('id, kecamatan_id, nama_desa, kecamatan(nama_kecamatan)')
        .order('nama_desa'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('form_categories').select('*').order('urutan'),
      supabase
        .from('laporan_desa')
        .select('*, profiles(nama)')
        .eq('periode_bulan', bulan)
        .eq('periode_tahun', tahun),
    ]);

    const kecs = kecData || [];
    const desas = desaData || [];
    const laporans = laporanData || [];

    setKecamatanList(kecs);
    setCategories(catData || []);

    setStats({
      totalKecamatan: kecs.length,
      totalDesa: desas.length,
      totalUsers: userCount || 0,
      totalLaporanPeriode: laporans.length,
    });

    const merged = desas.map((d) => {
      const lap = laporans.find((l) => l.desa_id === d.id);
      return {
        ...d,
        laporan: lap || null,
      };
    });

    setDesaMonitoring(merged);
    setLoading(false);
  };

  useEffect(() => {
    fetchMonitoringData();
  }, [bulan, tahun]);

  const handleOpenDetail = async (desaItem) => {
    if (!desaItem.laporan) return;
    setDetailModal(desaItem);

    const { data } = await supabase
      .from('laporan_detail')
      .select(
        '*, form_fields(nama_item, sub_kelompok, tipe_input, satuan_utama, satuan_sekunder, category_id)'
      )
      .eq('laporan_id', desaItem.laporan.id);

    setDetailItems(data || []);
  };

  const displayedDesa =
    filterKecId === 'ALL'
      ? desaMonitoring
      : desaMonitoring.filter((d) => d.kecamatan_id === filterKecId);

  // 1. Export Rekapitulasi Status Pelaporan & Konfirmasi Sektor Desa
  const handleExportRekapStatus = (format) => {
    const sectorCats = categories.filter((c) => c.butuh_konfirmasi_sektor);
    const headers = [
      'No',
      'Kecamatan',
      'Nama Desa',
      'Status Pelaporan',
      'Tanggal Input',
      ...sectorCats.map((c) => `Sektor ${c.nama_kategori}`),
    ];

    const rows = displayedDesa.map((d, idx) => {
      const sudahLapor = Boolean(d.laporan);
      const konfirmasi = d.laporan?.konfirmasi_sektor || {};

      return [
        idx + 1,
        d.kecamatan?.nama_kecamatan || '-',
        d.nama_desa,
        sudahLapor ? 'SUDAH INPUT' : 'BELUM INPUT',
        d.laporan?.tanggal_lapor || '-',
        ...sectorCats.map((c) => {
          if (!sudahLapor) return '-';
          return konfirmasi[c.slug]?.ada !== false ? 'ADA' : 'TIDAK ADA';
        }),
      ];
    });

    const filename = `Rekap_Monitoring_Desa_${NAMA_BULAN[bulan - 1]}_${tahun}`;

    if (format === 'excel') {
      exportToExcel({
        filename,
        title: `REKAPITULASI MONITORING DATA KOMODITAS DESA`,
        subtitle: `Periode: ${NAMA_BULAN[bulan - 1]} ${tahun}`,
        headers,
        rows,
      });
    } else {
      exportToCSV({ filename, headers, rows });
    }
  };

  // 2. Export Seluruh Rincian Angka Komoditas Semua Desa pada Periode Ini
  const handleExportFullKomoditasPeriode = async () => {
    const laporanIds = displayedDesa
      .filter((d) => d.laporan)
      .map((d) => d.laporan.id);

    if (laporanIds.length === 0) {
      showToast('Belum ada desa yang menginput laporan pada periode ini.', 'warning');
      return;
    }

    setExportingFull(true);
    const { data: allDetails } = await supabase
      .from('laporan_detail')
      .select(
        '*, form_fields(nama_item, sub_kelompok, tipe_input, satuan_utama, satuan_sekunder)'
      )
      .in('laporan_id', laporanIds);
    setExportingFull(false);

    const headers = [
      'No',
      'Kecamatan',
      'Nama Desa',
      'Sub-Kelompok',
      'Nama Komoditas / Indikator',
      'Nilai Utama / Produksi',
      'Satuan Utama',
      'Luas Lahan',
      'Satuan Lahan',
      'Rincian Tambahan',
    ];

    const rows = [];
    let no = 1;

    (allDetails || []).forEach((item) => {
      const desaObj = displayedDesa.find((d) => d.laporan?.id === item.laporan_id);
      const f = item.form_fields;
      const rincianText = Object.entries(item.rincian_json || {})
        .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
        .join(', ');

      rows.push([
        no++,
        desaObj?.kecamatan?.nama_kecamatan || '-',
        desaObj?.nama_desa || '-',
        f?.sub_kelompok || '-',
        f?.nama_item || '-',
        item.nilai_utama ?? 0,
        f?.satuan_utama || '-',
        f?.tipe_input === 'luas_dan_produksi' ? item.nilai_sekunder ?? 0 : '-',
        f?.tipe_input === 'luas_dan_produksi' ? f?.satuan_sekunder || 'Ha' : '-',
        rincianText || '-',
      ]);
    });

    exportToExcel({
      filename: `Data_Lengkap_Komoditas_Kabupaten_${NAMA_BULAN[bulan - 1]}_${tahun}`,
      title: `DATA RINCIAN KOMODITAS SELURUH DESA`,
      subtitle: `Periode: ${NAMA_BULAN[bulan - 1]} ${tahun}`,
      headers,
      rows,
    });
  };

  // 3. Export Rincian 1 Desa dari Modal
  const handleExportSingleDesa = (format) => {
    if (!detailModal) return;

    const headers = [
      'No',
      'Sub-Kelompok',
      'Item / Komoditas',
      'Nilai Utama / Produksi',
      'Satuan',
      'Luas Lahan',
      'Satuan Lahan',
      'Rincian',
    ];

    const rows = detailItems.map((item, idx) => {
      const f = item.form_fields;
      const rincianText = Object.entries(item.rincian_json || {})
        .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
        .join(', ');

      return [
        idx + 1,
        f?.sub_kelompok || '-',
        f?.nama_item || '-',
        item.nilai_utama ?? 0,
        f?.satuan_utama || '-',
        f?.tipe_input === 'luas_dan_produksi' ? item.nilai_sekunder ?? 0 : '-',
        f?.tipe_input === 'luas_dan_produksi' ? f?.satuan_sekunder || 'Ha' : '-',
        rincianText || '-',
      ];
    });

    const filename = `Rincian_Desa_${detailModal.nama_desa}_${NAMA_BULAN[bulan - 1]}_${tahun}`;

    if (format === 'excel') {
      exportToExcel({
        filename,
        title: `RINCIAN KOMODITAS DESA ${detailModal.nama_desa.toUpperCase()}`,
        subtitle: `Kecamatan ${detailModal.kecamatan?.nama_kecamatan} | Periode ${
          NAMA_BULAN[bulan - 1]
        } ${tahun}`,
        headers,
        rows,
      });
    } else {
      exportToCSV({ filename, headers, rows });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Dashboard Monitoring Kabupaten
          </h1>
          <p className="text-sm text-slate-500">
            Pantau kelengkapan dan unduh laporan komoditas dari seluruh desa di 7 kecamatan.
          </p>
        </div>

        {/* Filter Periode & Kecamatan */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterKecId}
            onChange={(e) => setFilterKecId(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
          >
            <option value="ALL">Semua Kecamatan (7)</option>
            {kecamatanList.map((k) => (
              <option key={k.id} value={k.id}>
                Kec. {k.nama_kecamatan}
              </option>
            ))}
          </select>

          <select
            value={bulan}
            onChange={(e) => setBulan(Number(e.target.value))}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
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
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Kartu Ringkasan Eksekutif */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Kecamatan</span>
            <MapPinned className="h-5 w-5 text-indigo-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats.totalKecamatan}</p>
          <p className="mt-1 text-xs text-slate-500">Wilayah Kecamatan Terdaftar</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Total Desa</span>
            <Building2 className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats.totalDesa}</p>
          <p className="mt-1 text-xs text-slate-500">Desa Aktif di Sistem</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Laporan Masuk ({NAMA_BULAN[bulan - 1]})
            </span>
            <FileCheck2 className="h-5 w-5 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {stats.totalLaporanPeriode} / {stats.totalDesa}
          </p>
          <p className="mt-1 text-xs text-slate-500">Desa Sudah Menginput Data</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Total Akun</span>
            <Users className="h-5 w-5 text-sky-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats.totalUsers}</p>
          <p className="mt-1 text-xs text-slate-500">Admin & Kepala Desa</p>
        </div>
      </div>

      {/* Tabel Status Pelaporan Desa + Tombol Export */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-bold text-slate-900">
            Monitoring Status Data Desa — Periode {NAMA_BULAN[bulan - 1]} {tahun}
          </h2>

          {/* Deretan Tombol Export Laporan Kabupaten */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportFullKomoditasPeriode}
              disabled={exportingFull}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700 disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4" />
              {exportingFull
                ? 'Mengunduh...'
                : 'Export Rincian Semua Desa (.xls)'}
            </button>

            <button
              type="button"
              onClick={() => handleExportRekapStatus('excel')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export Rekap Status (.xls)
            </button>

            <button
              type="button"
              onClick={() => handleExportRekapStatus('csv')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <Download className="h-4 w-4 text-slate-600" />
              CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600">
              <tr>
                <th className="px-5 py-3.5">Desa & Kecamatan</th>
                <th className="px-5 py-3.5 text-center">Status Input</th>
                <th className="px-5 py-3.5">Konfirmasi Sektor Komoditas</th>
                <th className="px-5 py-3.5 text-right">Rincian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan="4" className="py-10 text-center text-slate-400">
                    Memuat data monitoring...
                  </td>
                </tr>
              ) : displayedDesa.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-10 text-center text-slate-400">
                    Belum ada desa untuk ditampilkan.
                  </td>
                </tr>
              ) : (
                displayedDesa.map((d) => {
                  const sudahLapor = Boolean(d.laporan);
                  const konfirmasi = d.laporan?.konfirmasi_sektor || {};

                  return (
                    <tr key={d.id} className="hover:bg-slate-50/80">
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900">Desa {d.nama_desa}</div>
                        <div className="text-xs text-slate-500">
                          Kec. {d.kecamatan?.nama_kecamatan}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-center">
                        {sudahLapor ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Sudah Input
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                            <XCircle className="h-3.5 w-3.5" />
                            Belum Input
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {sudahLapor ? (
                          <div className="flex flex-wrap gap-1.5">
                            {categories
                              .filter((c) => c.butuh_konfirmasi_sektor)
                              .map((c) => {
                                const ada = konfirmasi[c.slug]?.ada !== false;
                                return (
                                  <span
                                    key={c.id}
                                    className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                                      ada
                                        ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                                        : 'border border-rose-200 bg-rose-50 text-rose-700'
                                    }`}
                                  >
                                    {c.nama_kategori}: {ada ? 'ADA' : 'TIDAK ADA'}
                                  </span>
                                );
                              })}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        {sudahLapor && (
                          <button
                            onClick={() => handleOpenDetail(d)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Lihat Rincian
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL RINCIAN LAPORAN DESA + TOMBOL EXPORT PER DESA */}
      {detailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Rincian Data Desa {detailModal.nama_desa}
                </h3>
                <p className="text-xs text-slate-500">
                  Kec. {detailModal.kecamatan?.nama_kecamatan} — Periode{' '}
                  {NAMA_BULAN[bulan - 1]} {tahun}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {detailItems.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleExportSingleDesa('excel')}
                      className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      Excel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportSingleDesa('csv')}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      <Download className="h-3.5 w-3.5" />
                      CSV
                    </button>
                  </>
                )}
                <button
                  onClick={() => setDetailModal(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {detailItems.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  Kepala Desa hanya mengonfirmasi ketersediaan sektor tanpa rincian angka spesifik.
                </p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                    <tr>
                      <th className="px-4 py-2.5">Item / Komoditas</th>
                      <th className="px-4 py-2.5">Nilai / Rincian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {detailItems.map((item) => {
                      const f = item.form_fields;
                      return (
                        <tr key={item.id}>
                          <td className="px-4 py-2.5 font-medium text-slate-800">
                            {f?.nama_item}
                          </td>
                          <td className="px-4 py-2.5 text-slate-700">
                            {f?.tipe_input === 'luas_dan_produksi' ? (
                              <span>
                                Produksi: <strong>{item.nilai_utama} {f.satuan_utama}</strong> | Luas Lahan:{' '}
                                <strong>{item.nilai_sekunder} {f.satuan_sekunder}</strong>
                              </span>
                            ) : f?.tipe_input === 'angka_tunggal' ? (
                              <strong>
                                {item.nilai_utama} {f?.satuan_utama}
                              </strong>
                            ) : (
                              <span className="text-xs">
                                {Object.entries(item.rincian_json || {})
                                  .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
                                  .join(' | ')}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}