import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { exportToCSV, exportToExcel } from '../lib/exportUtils';
import {
  LogIn,
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  Minus,
  Filter,
  MapPin,
  Building2,
  Calendar,
  Search,
  BarChart3,
  Layers,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

const NAMA_BULAN_PENDEK = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

export default function PublicDashboard() {
  const { user, activeRole } = useAuth();
  const now = new Date();
  const currentYear = now.getFullYear();

  // State Master Data
  const [kecamatanList, setKecamatanList] = useState([]);
  const [desaList, setDesaList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [fields, setFields] = useState([]);
  const [laporanList, setLaporanList] = useState([]);
  const [loading, setLoading] = useState(true);

  // State Filter Wilayah & Kategori
  const [selectedKecId, setSelectedKecId] = useState('ALL');
  const [selectedDesaId, setSelectedDesaId] = useState('ALL');
  const [selectedCatId, setSelectedCatId] = useState('ALL');
  const [selectedChartFieldId, setSelectedChartFieldId] = useState('ALL_TON');
  const [searchQuery, setSearchQuery] = useState('');

  // State Filter Rentang Waktu
  const [startMonth, setStartMonth] = useState(1);
  const [startYear, setStartYear] = useState(currentYear);
  const [endMonth, setEndMonth] = useState(12);
  const [endYear, setEndYear] = useState(currentYear);

  useEffect(() => {
    const fetchPublicData = async () => {
      setLoading(true);
      const [
        { data: kecData },
        { data: dData },
        { data: catData },
        { data: fieldData },
        { data: lapData },
      ] = await Promise.all([
        supabase.from('kecamatan').select('id, nama_kecamatan').order('nama_kecamatan'),
        supabase.from('desa').select('id, kecamatan_id, nama_desa').order('nama_desa'),
        supabase.from('form_categories').select('*').order('urutan'),
        supabase.from('form_fields').select('*').eq('is_active', true).order('urutan'),
        supabase
          .from('laporan_desa')
          .select(
            'id, desa_id, periode_bulan, periode_tahun, konfirmasi_sektor, desa(id, nama_desa, kecamatan_id), laporan_detail(field_id, nilai_utama, nilai_sekunder)'
          )
          .order('periode_tahun', { ascending: true })
          .order('periode_bulan', { ascending: true }),
      ]);

      setKecamatanList(kecData || []);
      setDesaList(dData || []);
      setCategories(catData || []);
      setFields(fieldData || []);
      setLaporanList(lapData || []);
      setLoading(false);
    };

    fetchPublicData();
  }, []);

  const availableDesa = useMemo(() => {
    if (selectedKecId === 'ALL') return desaList;
    return desaList.filter((d) => d.kecamatan_id === selectedKecId);
  }, [desaList, selectedKecId]);

  const filteredLaporan = useMemo(() => {
    const startKey = startYear * 100 + startMonth;
    const endKey = endYear * 100 + endMonth;

    return laporanList.filter((lap) => {
      const lapKey = lap.periode_tahun * 100 + lap.periode_bulan;
      if (lapKey < startKey || lapKey > endKey) return false;
      if (selectedDesaId !== 'ALL' && lap.desa_id !== selectedDesaId) return false;
      if (selectedKecId !== 'ALL') {
        const kecIdDesa = lap.desa?.kecamatan_id;
        if (kecIdDesa !== selectedKecId) return false;
      }
      return true;
    });
  }, [laporanList, startMonth, startYear, endMonth, endYear, selectedKecId, selectedDesaId]);

  const {
    trendItems,
    chartSeries,
    periodePembandingLabel,
    summaryStats,
  } = useMemo(() => {
    const periodMap = new Map();

    filteredLaporan.forEach((lap) => {
      const key = lap.periode_tahun * 100 + lap.periode_bulan;
      const label = `${NAMA_BULAN_PENDEK[lap.periode_bulan - 1]} ${lap.periode_tahun}`;

      if (!periodMap.has(key)) {
        periodMap.set(key, {
          key,
          label,
          totalsByField: {},
          luasByField: {},
          totalTonAll: 0,
        });
      }

      const bucket = periodMap.get(key);
      (lap.laporan_detail || []).forEach((det) => {
        const valUtama = Number(det.nilai_utama) || 0;
        const valSekunder = Number(det.nilai_sekunder) || 0;

        bucket.totalsByField[det.field_id] =
          (bucket.totalsByField[det.field_id] || 0) + valUtama;
        bucket.luasByField[det.field_id] =
          (bucket.luasByField[det.field_id] || 0) + valSekunder;

        const fieldInfo = fields.find((f) => f.id === det.field_id);
        if (fieldInfo?.satuan_utama === 'Ton') {
          bucket.totalTonAll += valUtama;
        }
      });
    });

    const sortedPeriods = Array.from(periodMap.values()).sort((a, b) => a.key - b.key);
    const firstPeriod = sortedPeriods[0] || null;
    const lastPeriod = sortedPeriods[sortedPeriods.length - 1] || null;

    const series = sortedPeriods.map((p) => {
      const nilaiGrafik =
        selectedChartFieldId === 'ALL_TON'
          ? p.totalTonAll
          : p.totalsByField[selectedChartFieldId] || 0;

      return {
        periode: p.label,
        nilai: Number(nilaiGrafik.toFixed(2)),
      };
    });

    let countNaik = 0;
    let countTurun = 0;
    let countStabil = 0;

    const calculatedFields = fields.map((field) => {
      const cat = categories.find((c) => c.id === field.category_id);

      let totalRentangUtama = 0;
      let totalRentangSekunder = 0;
      sortedPeriods.forEach((p) => {
        totalRentangUtama += p.totalsByField[field.id] || 0;
        totalRentangSekunder += p.luasByField[field.id] || 0;
      });

      const nilaiAwal = firstPeriod ? firstPeriod.totalsByField[field.id] || 0 : 0;
      const nilaiAkhir = lastPeriod ? lastPeriod.totalsByField[field.id] || 0 : 0;

      let persenChange = 0;
      let statusTren = 'stabil';

      if (sortedPeriods.length >= 2) {
        if (nilaiAwal === 0 && nilaiAkhir > 0) {
          persenChange = 100;
          statusTren = 'naik';
        } else if (nilaiAwal === 0 && nilaiAkhir === 0) {
          persenChange = 0;
          statusTren = 'stabil';
        } else {
          persenChange = ((nilaiAkhir - nilaiAwal) / nilaiAwal) * 100;
          if (persenChange > 0.01) statusTren = 'naik';
          else if (persenChange < -0.01) statusTren = 'turun';
          else statusTren = 'stabil';
        }
      }

      if (statusTren === 'naik') countNaik++;
      else if (statusTren === 'turun') countTurun++;
      else countStabil++;

      return {
        ...field,
        nama_kategori: cat?.nama_kategori || '-',
        nilaiAwal,
        nilaiAkhir,
        totalRentangUtama,
        totalRentangSekunder,
        persenChange: Number(persenChange.toFixed(1)),
        statusTren,
      };
    });

    const labelPembanding =
      sortedPeriods.length >= 2
        ? `${firstPeriod.label} vs ${lastPeriod.label}`
        : sortedPeriods.length === 1
        ? `Data Tunggal (${firstPeriod.label})`
        : 'Belum ada laporan pada rentang ini';

    return {
      trendItems: calculatedFields,
      chartSeries: series,
      periodePembandingLabel: labelPembanding,
      summaryStats: {
        countNaik,
        countTurun,
        countStabil,
        jumlahPeriodeAktif: sortedPeriods.length,
      },
    };
  }, [filteredLaporan, fields, categories, selectedChartFieldId]);

  const displayedTrendItems = useMemo(() => {
    return trendItems.filter((item) => {
      if (selectedCatId !== 'ALL' && item.category_id !== selectedCatId) return false;
      if (
        searchQuery &&
        !item.nama_item.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [trendItems, selectedCatId, searchQuery]);

  const sectorAvailability = useMemo(() => {
    const latestPerDesa = new Map();
    filteredLaporan.forEach((lap) => {
      latestPerDesa.set(lap.desa_id, lap);
    });
    const latestList = Array.from(latestPerDesa.values());

    return categories
      .filter((c) => c.butuh_konfirmasi_sektor)
      .map((cat) => {
        let desaAda = 0;
        latestList.forEach((l) => {
          if (l.konfirmasi_sektor?.[cat.slug]?.ada !== false) {
            desaAda++;
          }
        });
        return {
          ...cat,
          desaAda,
          totalDesaLapor: latestList.length,
        };
      });
  }, [filteredLaporan, categories]);

  // Fungsi Export Data Tren Publik (Excel & CSV)
  const handleExportPublicData = (format) => {
    const namaKec =
      selectedKecId === 'ALL'
        ? 'Semua_Kecamatan'
        : kecamatanList.find((k) => k.id === selectedKecId)?.nama_kecamatan || '';
    const namaDesa =
      selectedDesaId === 'ALL'
        ? 'Semua_Desa'
        : desaList.find((d) => d.id === selectedDesaId)?.nama_desa || '';

    const filename = `Tren_Komoditas_${namaKec}_${namaDesa}_${NAMA_BULAN_PENDEK[startMonth - 1]}${startYear}-${NAMA_BULAN_PENDEK[endMonth - 1]}${endYear}`;

    const headers = [
      'No',
      'Komoditas / Indikator',
      'Kategori Sektor',
      'Sub-Kelompok',
      'Nilai Periode Awal',
      'Nilai Periode Akhir',
      'Total Akumulasi Rentang',
      'Satuan Utama',
      'Total Luas Lahan (Ha)',
      'Persentase Tren (%)',
      'Status Tren',
    ];

    const rows = displayedTrendItems.map((item, idx) => [
      idx + 1,
      item.nama_item,
      item.nama_kategori,
      item.sub_kelompok || '-',
      item.nilaiAwal,
      item.nilaiAkhir,
      item.totalRentangUtama,
      item.satuan_utama,
      item.tipe_input === 'luas_dan_produksi' ? item.totalRentangSekunder : '-',
      `${item.persenChange > 0 ? '+' : ''}${item.persenChange}%`,
      item.statusTren.toUpperCase(),
    ]);

    if (format === 'excel') {
      exportToExcel({
        filename,
        title: 'LAPORAN TREN KOMODITAS & DEMOGRAFI DESA',
        subtitle: `Wilayah: ${namaKec.replace(/_/g, ' ')} (${namaDesa.replace(
          /_/g,
          ' '
        )}) | Rentang: ${NAMA_BULAN_PENDEK[startMonth - 1]} ${startYear} s/d ${
          NAMA_BULAN_PENDEK[endMonth - 1]
        } ${endYear}`,
        headers,
        rows,
      });
    } else {
      exportToCSV({ filename, headers, rows });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* HEADER PUBLIK */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="flex w-full items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white shadow-sm shadow-indigo-600/30">
              SK
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                Dashboard Komoditas Desa Kabupaten
              </h1>
              <p className="text-xs text-slate-500">
                Pusat Data & Monitoring Tren Komoditas 7 Kecamatan
              </p>
            </div>
          </div>

          <div>
            {user && activeRole ? (
              <Link
                to={activeRole === 'admin' ? '/admin/dashboard' : '/kades/dashboard'}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700 sm:text-sm"
              >
                <LayoutDashboard className="h-4 w-4" />
                Panel {activeRole === 'admin' ? 'Admin' : 'Kepala Desa'}
              </Link>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-700 sm:text-sm"
              >
                <LogIn className="h-4 w-4" />
                Login
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6"> */}
      <main className="w-full space-y-6 px-6 py-8">
        {/* PANEL FILTER WILAYAH & RENTANG WAKTU */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <Filter className="h-4 w-4 text-indigo-600" />
              Filter Wilayah & Rentang Waktu Analisis Tren
            </div>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              Perbandingan: {periodePembandingLabel}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="md:col-span-3">
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <MapPin className="h-3.5 w-3.5 text-indigo-600" />
                Kecamatan
              </label>
              <select
                value={selectedKecId}
                onChange={(e) => {
                  setSelectedKecId(e.target.value);
                  setSelectedDesaId('ALL');
                }}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-none"
              >
                <option value="ALL">Seluruh Kabupaten (7 Kecamatan)</option>
                {kecamatanList.map((kec) => (
                  <option key={kec.id} value={kec.id}>
                    Kec. {kec.nama_kecamatan}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                Desa
              </label>
              <select
                value={selectedDesaId}
                onChange={(e) => setSelectedDesaId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-none"
              >
                <option value="ALL">Semua Desa ({availableDesa.length})</option>
                {availableDesa.map((d) => (
                  <option key={d.id} value={d.id}>
                    Desa {d.nama_desa}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <Calendar className="h-3.5 w-3.5 text-amber-600" />
                Dari Periode (Awal)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={startMonth}
                  onChange={(e) => setStartMonth(Number(e.target.value))}
                  className="rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-2 text-sm font-medium text-slate-800"
                >
                  {NAMA_BULAN_PENDEK.map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={startYear}
                  onChange={(e) => setStartYear(Number(e.target.value))}
                  className="rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-2 text-sm font-medium text-slate-800"
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="md:col-span-3">
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                Sampai Periode (Akhir)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={endMonth}
                  onChange={(e) => setEndMonth(Number(e.target.value))}
                  className="rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-2 text-sm font-medium text-slate-800"
                >
                  {NAMA_BULAN_PENDEK.map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={endYear}
                  onChange={(e) => setEndYear(Number(e.target.value))}
                  className="rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-2 text-sm font-medium text-slate-800"
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
        </section>

        {/* KARTU INDIKATOR TREN UTAMA */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Cakupan Wilayah
              </span>
              <MapPin className="h-5 w-5 text-indigo-600" />
            </div>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">
              {selectedDesaId !== 'ALL' ? '1 Desa' : `${availableDesa.length} Desa`}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {selectedKecId === 'ALL'
                ? `Dari ${kecamatanList.length} Kecamatan Kabupaten`
                : 'Pada Kecamatan Terpilih'}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Tren Komoditas Naik
              </span>
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-extrabold text-emerald-700">
              {summaryStats.countNaik} Item
            </p>
            <p className="mt-1 text-xs text-emerald-700/80">
              Mengalami kenaikan persentase
            </p>
          </div>

          <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
                Tren Komoditas Turun
              </span>
              <TrendingDown className="h-5 w-5 text-rose-600" />
            </div>
            <p className="mt-2 text-2xl font-extrabold text-rose-700">
              {summaryStats.countTurun} Item
            </p>
            <p className="mt-1 text-xs text-rose-700/80">
              Mengalami penurunan persentase
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Laporan Dianalisis
              </span>
              <BarChart3 className="h-5 w-5 text-amber-600" />
            </div>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">
              {filteredLaporan.length} Laporan
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Tersedia di {summaryStats.jumlahPeriodeAktif} periode bulan
            </p>
          </div>
        </section>

        {/* GRAFIK INTERAKTIF & KONFIRMASI SEKTOR */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Grafik Pergerakan Tren Komoditas
                </h2>
                <p className="text-xs text-slate-500">
                  Visualisasi fluktuasi produksi berdasarkan rentang waktu dan wilayah terpilih.
                </p>
              </div>

              <select
                value={selectedChartFieldId}
                onChange={(e) => setSelectedChartFieldId(e.target.value)}
                className="max-w-xs rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-600 focus:outline-none"
              >
                <option value="ALL_TON">Total Produksi Gabungan (Ton)</option>
                {fields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nama_item} ({f.satuan_utama})
                  </option>
                ))}
              </select>
            </div>

            {chartSeries.length === 0 ? (
              <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
                Belum ada data laporan pada filter wilayah dan rentang waktu ini.
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartSeries}>
                    <defs>
                      <linearGradient id="colorNilai" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="periode" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="nilai"
                      name="Volume / Jumlah"
                      stroke="#4f46e5"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorNilai)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-4">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Layers className="h-5 w-5 text-indigo-600" />
              Konfirmasi Sektor Desa
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Proporsi desa yang mengonfirmasi keberadaan sektor komoditas.
            </p>

            <div className="mt-5 space-y-4">
              {sectorAvailability.map((sec) => {
                const pct =
                  sec.totalDesaLapor > 0
                    ? Math.round((sec.desaAda / sec.totalDesaLapor) * 100)
                    : 0;
                return (
                  <div
                    key={sec.id}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-3.5"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span>{sec.nama_kategori}</span>
                      <span className="text-emerald-700">
                        {sec.desaAda} / {sec.totalDesaLapor} Desa Ada ({pct}%)
                      </span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* TABEL RINCIAN TREN KOMODITAS + TOMBOL EXPORT EXCEL & CSV */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Rincian Tren Komoditas & Demografi Desa
              </h2>
              <p className="text-xs text-slate-500">
                Menampilkan perubahan persentase (naik/turun) dari periode awal ke periode akhir.
              </p>
            </div>

            {/* Pencarian & Tombol Export Excel / CSV */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari komoditas..."
                  className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => handleExportPublicData('excel')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Export Excel (.xls)
              </button>

              <button
                type="button"
                onClick={() => handleExportPublicData('csv')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <Download className="h-4 w-4 text-indigo-600" />
                Export CSV
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCatId('ALL')}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                selectedCatId === 'ALL'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua Sektor ({trendItems.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCatId(cat.id)}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                  selectedCatId === cat.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.nama_kategori}
              </button>
            ))}
          </div>

          <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3.5">Komoditas / Indikator</th>
                  <th className="px-4 py-3.5">Kategori Sektor</th>
                  <th className="px-4 py-3.5 text-right">Periode Awal</th>
                  <th className="px-4 py-3.5 text-right">Periode Akhir</th>
                  <th className="px-4 py-3.5 text-right">Akumulasi Rentang</th>
                  <th className="px-4 py-3.5 text-center">Tren Persentase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-10 text-center text-slate-400">
                      Memuat data komoditas kabupaten...
                    </td>
                  </tr>
                ) : displayedTrendItems.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-10 text-center text-slate-400">
                      Tidak ada komoditas yang sesuai pencarian.
                    </td>
                  </tr>
                ) : (
                  displayedTrendItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        {item.nama_item}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">
                        {item.nama_kategori}
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-slate-600">
                        {item.nilaiAwal.toLocaleString('id-ID')} {item.satuan_utama}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                        {item.nilaiAkhir.toLocaleString('id-ID')} {item.satuan_utama}
                      </td>
                      <td className="px-4 py-3.5 text-right text-xs text-slate-600">
                        <div>
                          <strong>
                            {item.totalRentangUtama.toLocaleString('id-ID')}{' '}
                            {item.satuan_utama}
                          </strong>
                        </div>
                        {item.tipe_input === 'luas_dan_produksi' && (
                          <div className="text-[11px] text-slate-400">
                            Lahan: {item.totalRentangSekunder.toLocaleString('id-ID')}{' '}
                            {item.satuan_sekunder}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {item.statusTren === 'naik' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                            <TrendingUp className="h-3.5 w-3.5" />+{item.persenChange}%
                          </span>
                        ) : item.statusTren === 'turun' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">
                            <TrendingDown className="h-3.5 w-3.5" />
                            {item.persenChange}%
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                            <Minus className="h-3.5 w-3.5" />
                            0% (Stabil)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}