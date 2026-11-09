import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { exportToCSV, exportToExcel } from '../lib/exportUtils';
import { useDialog } from '../context/DialogContext';
import PublicHeader from '../components/PublicHeader';
import Footer from '../components/Footer';

// Komponen Modular Publik
import PublicFilterPanel from '../components/public/PublicFilterPanel';
import PublicStatsCards from '../components/public/PublicStatsCards';
import PublicGenderChart from '../components/public/PublicGenderChart';
import PublicEducationChart from '../components/public/PublicEducationChart';
import PublicFeaturedCommodities from '../components/public/PublicFeaturedCommodities';
import PublicTrendChartAndSectors from '../components/public/PublicTrendChartAndSectors';
import PublicTrendTable from '../components/public/PublicTrendTable';

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

const NAMA_BULAN_PENDEK = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

export default function PublicDashboard() {
  const { showToast } = useDialog();
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

  // State Interaktif Diagram & Komoditas Unggulan
  const [genderMode, setGenderMode] = useState('penduduk');
  const [eduMode, setEduMode] = useState('murid');
  const [featuredSectorSlug, setFeaturedSectorSlug] = useState('ALL_PRODUKSI');

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
            'id, desa_id, periode_bulan, periode_tahun, konfirmasi_sektor, desa(id, nama_desa, kecamatan_id), laporan_detail(field_id, nilai_utama, nilai_sekunder, rincian_json)'
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

  const activeWilayahLabel = useMemo(() => {
    if (selectedDesaId !== 'ALL') {
      const d = desaList.find((item) => item.id === selectedDesaId);
      return `Desa ${d?.nama_desa || ''}`;
    }
    if (selectedKecId !== 'ALL') {
      const k = kecamatanList.find((item) => item.id === selectedKecId);
      return `Kecamatan ${k?.nama_kecamatan || ''}`;
    }
    return 'Seluruh Kabupaten (7 Kecamatan)';
  }, [selectedKecId, selectedDesaId, kecamatanList, desaList]);

  // Filter laporan berdasarkan Kecamatan, Desa, dan Rentang Waktu
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
  }, [
    laporanList,
    startMonth,
    startYear,
    endMonth,
    endYear,
    selectedKecId,
    selectedDesaId,
  ]);

  // 1. OLAH DATA DEMOGRAFI
  const { genderChartData, educationChartData } = useMemo(() => {
    const latestPerDesa = new Map();
    filteredLaporan.forEach((lap) => {
      const key = lap.periode_tahun * 100 + lap.periode_bulan;
      const existing = latestPerDesa.get(lap.desa_id);
      const existingKey = existing
        ? existing.periode_tahun * 100 + existing.periode_bulan
        : 0;
      if (key >= existingKey) {
        latestPerDesa.set(lap.desa_id, lap);
      }
    });

    const latestReports = Array.from(latestPerDesa.values());

    const fieldPendudukLP = fields.find(
      (f) => f.tipe_input === 'gender_l_p' && f.nama_item.toLowerCase().includes('penduduk')
    );
    const fieldPnsLP = fields.find(
      (f) => f.tipe_input === 'gender_l_p' && f.nama_item.toLowerCase().includes('pns')
    );
    const fieldSekolah = fields.find(
      (f) => f.tipe_input === 'tingkat_sekolah' && f.nama_item.toLowerCase().includes('sekolah')
    );
    const fieldGuru = fields.find(
      (f) => f.tipe_input === 'tingkat_sekolah' && f.nama_item.toLowerCase().includes('guru')
    );
    const fieldMurid = fields.find(
      (f) => f.tipe_input === 'tingkat_sekolah' && f.nama_item.toLowerCase().includes('murid')
    );
    const fieldPnsDidik = fields.find((f) => f.tipe_input === 'tingkat_pendidikan');

    let lakiPenduduk = 0;
    let perempuanPenduduk = 0;
    let lakiPns = 0;
    let perempuanPns = 0;

    const rekapSekolah = { tk_paud: 0, sd: 0, smp: 0, sma_smk: 0 };
    const rekapGuru = { tk_paud: 0, sd: 0, smp: 0, sma_smk: 0 };
    const rekapMurid = { tk_paud: 0, sd: 0, smp: 0, sma_smk: 0 };
    const rekapPnsDidik = { sd: 0, smp: 0, sma: 0, diploma: 0, sarjana: 0 };

    latestReports.forEach((lap) => {
      (lap.laporan_detail || []).forEach((det) => {
        const r = det.rincian_json || {};

        if (fieldPendudukLP && det.field_id === fieldPendudukLP.id) {
          lakiPenduduk += Number(r.laki_laki) || 0;
          perempuanPenduduk += Number(r.perempuan) || 0;
        }
        if (fieldPnsLP && det.field_id === fieldPnsLP.id) {
          lakiPns += Number(r.laki_laki) || 0;
          perempuanPns += Number(r.perempuan) || 0;
        }
        if (fieldSekolah && det.field_id === fieldSekolah.id) {
          rekapSekolah.tk_paud += Number(r.tk_paud) || 0;
          rekapSekolah.sd += Number(r.sd) || 0;
          rekapSekolah.smp += Number(r.smp) || 0;
          rekapSekolah.sma_smk += Number(r.sma_smk) || 0;
        }
        if (fieldGuru && det.field_id === fieldGuru.id) {
          rekapGuru.tk_paud += Number(r.tk_paud) || 0;
          rekapGuru.sd += Number(r.sd) || 0;
          rekapGuru.smp += Number(r.smp) || 0;
          rekapGuru.sma_smk += Number(r.sma_smk) || 0;
        }
        if (fieldMurid && det.field_id === fieldMurid.id) {
          rekapMurid.tk_paud += Number(r.tk_paud) || 0;
          rekapMurid.sd += Number(r.sd) || 0;
          rekapMurid.smp += Number(r.smp) || 0;
          rekapMurid.sma_smk += Number(r.sma_smk) || 0;
        }
        if (fieldPnsDidik && det.field_id === fieldPnsDidik.id) {
          rekapPnsDidik.sd += Number(r.sd) || 0;
          rekapPnsDidik.smp += Number(r.smp) || 0;
          rekapPnsDidik.sma += Number(r.sma) || 0;
          rekapPnsDidik.diploma += Number(r.diploma) || 0;
          rekapPnsDidik.sarjana += Number(r.sarjana) || 0;
        }
      });
    });

    const activeLaki = genderMode === 'penduduk' ? lakiPenduduk : lakiPns;
    const activePerempuan = genderMode === 'penduduk' ? perempuanPenduduk : perempuanPns;
    const totalGender = activeLaki + activePerempuan;

    const genderData = {
      total: totalGender,
      satuan: genderMode === 'penduduk' ? 'Jiwa' : 'Orang',
      items: [
        {
          name: 'Laki-Laki',
          value: activeLaki,
          persen: totalGender > 0 ? Number(((activeLaki / totalGender) * 100).toFixed(1)) : 0,
        },
        {
          name: 'Perempuan',
          value: activePerempuan,
          persen:
            totalGender > 0 ? Number(((activePerempuan / totalGender) * 100).toFixed(1)) : 0,
        },
      ],
    };

    let eduList = [];
    let eduUnit = 'Orang';

    if (eduMode === 'murid') {
      eduUnit = 'Murid';
      eduList = [
        { jenjang: 'TK / PAUD', jumlah: rekapMurid.tk_paud },
        { jenjang: 'SD / MI', jumlah: rekapMurid.sd },
        { jenjang: 'SMP / MTs', jumlah: rekapMurid.smp },
        { jenjang: 'SMA / SMK', jumlah: rekapMurid.sma_smk },
      ];
    } else if (eduMode === 'guru') {
      eduUnit = 'Guru';
      eduList = [
        { jenjang: 'TK / PAUD', jumlah: rekapGuru.tk_paud },
        { jenjang: 'SD / MI', jumlah: rekapGuru.sd },
        { jenjang: 'SMP / MTs', jumlah: rekapGuru.smp },
        { jenjang: 'SMA / SMK', jumlah: rekapGuru.sma_smk },
      ];
    } else if (eduMode === 'sekolah') {
      eduUnit = 'Unit Sekolah';
      eduList = [
        { jenjang: 'TK / PAUD', jumlah: rekapSekolah.tk_paud },
        { jenjang: 'SD / MI', jumlah: rekapSekolah.sd },
        { jenjang: 'SMP / MTs', jumlah: rekapSekolah.smp },
        { jenjang: 'SMA / SMK', jumlah: rekapSekolah.sma_smk },
      ];
    } else {
      eduUnit = 'PNS';
      eduList = [
        { jenjang: 'SD', jumlah: rekapPnsDidik.sd },
        { jenjang: 'SMP', jumlah: rekapPnsDidik.smp },
        { jenjang: 'SMA/SMK', jumlah: rekapPnsDidik.sma },
        { jenjang: 'D1 - D3', jumlah: rekapPnsDidik.diploma },
        { jenjang: 'S1/S2/S3', jumlah: rekapPnsDidik.sarjana },
      ];
    }

    return {
      genderChartData: genderData,
      educationChartData: {
        unit: eduUnit,
        total: eduList.reduce((acc, item) => acc + item.jumlah, 0),
        items: eduList,
      },
    };
  }, [filteredLaporan, fields, genderMode, eduMode]);

  // 2. OLAH DATA TREN & KOMODITAS PALING MENONJOL TIAP BULAN
  const {
    trendItems,
    chartSeries,
    monthlyTopCommodities,
    periodePembandingLabel,
    summaryStats,
  } = useMemo(() => {
    const periodMap = new Map();

    filteredLaporan.forEach((lap) => {
      const key = lap.periode_tahun * 100 + lap.periode_bulan;
      const namaBulanPendek = NAMA_BULAN_PENDEK[lap.periode_bulan - 1];
      const namaBulanLengkap = NAMA_BULAN[lap.periode_bulan - 1];
      const label = `${namaBulanPendek} ${lap.periode_tahun}`;
      const fullLabel = `${namaBulanLengkap} ${lap.periode_tahun}`;

      if (!periodMap.has(key)) {
        periodMap.set(key, {
          key,
          bulan: lap.periode_bulan,
          tahun: lap.periode_tahun,
          label,
          fullLabel,
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

    const eligibleCommodityFields = fields.filter((f) => {
      const cat = categories.find((c) => c.id === f.category_id);
      if (!cat || cat.slug === 'demografi_desa') return false;

      if (featuredSectorSlug === 'ALL_PRODUKSI') {
        return f.satuan_utama === 'Ton';
      }
      return cat.slug === featuredSectorSlug;
    });

    const monthlyFeatured = sortedPeriods.map((p) => {
      let totalSektorBulanIni = 0;

      const ranked = eligibleCommodityFields
        .map((f) => {
          const val = Number(p.totalsByField[f.id] || 0);
          const luas = Number(p.luasByField[f.id] || 0);
          totalSektorBulanIni += val;
          const cat = categories.find((c) => c.id === f.category_id);
          return {
            id: f.id,
            nama_item: f.nama_item,
            nama_kategori: cat?.nama_kategori || '-',
            nilai: Number(val.toFixed(2)),
            luas: Number(luas.toFixed(2)),
            satuan: f.satuan_utama,
            tipe_input: f.tipe_input,
          };
        })
        .filter((item) => item.nilai > 0)
        .sort((a, b) => b.nilai - a.nilai);

      const top3 = ranked.slice(0, 3).map((item) => ({
        ...item,
        kontribusiPersen:
          totalSektorBulanIni > 0
            ? Number(((item.nilai / totalSektorBulanIni) * 100).toFixed(1))
            : 0,
      }));

      return {
        key: p.key,
        label: p.label,
        fullLabel: p.fullLabel,
        winner: top3[0] || null,
        top3,
        totalSektorBulanIni: Number(totalSektorBulanIni.toFixed(2)),
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
      monthlyTopCommodities: monthlyFeatured,
      periodePembandingLabel: labelPembanding,
      summaryStats: {
        countNaik,
        countTurun,
        countStabil,
        jumlahPeriodeAktif: sortedPeriods.length,
      },
    };
  }, [
    filteredLaporan,
    fields,
    categories,
    selectedChartFieldId,
    featuredSectorSlug,
  ]);

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

  const handleExportPublicData = (format) => {
    const namaKec =
      selectedKecId === 'ALL'
        ? 'Semua_Kecamatan'
        : kecamatanList.find((k) => k.id === selectedKecId)?.nama_kecamatan || '';
    const namaDesa =
      selectedDesaId === 'ALL'
        ? 'Semua_Desa'
        : desaList.find((d) => d.id === selectedDesaId)?.nama_desa || '';

    const bulanAwalLabel = NAMA_BULAN_PENDEK[startMonth - 1];
    const bulanAkhirLabel = NAMA_BULAN_PENDEK[endMonth - 1];

    const filename = `Tren_Komoditas_${namaKec}_${namaDesa}_${bulanAwalLabel}${startYear}-${bulanAkhirLabel}${endYear}`;

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
        )}) | Rentang: ${bulanAwalLabel} ${startYear} s/d ${bulanAkhirLabel} ${endYear}`,
        headers,
        rows,
      });
      showToast('Laporan Excel (.xls) berhasil diunduh!', 'success');
    } else {
      exportToCSV({ filename, headers, rows });
      showToast('Laporan CSV berhasil diunduh!', 'success');
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800">
      <PublicHeader />

      <main className="w-full flex-1 space-y-5 px-3 py-4 sm:space-y-6 sm:px-6 sm:py-8">
        <PublicFilterPanel
          selectedKecId={selectedKecId}
          setSelectedKecId={setSelectedKecId}
          setSelectedDesaId={setSelectedDesaId}
          selectedDesaId={selectedDesaId}
          kecamatanList={kecamatanList}
          availableDesa={availableDesa}
          startMonth={startMonth}
          setStartMonth={setStartMonth}
          startYear={startYear}
          setStartYear={setStartYear}
          endMonth={endMonth}
          setEndMonth={setEndMonth}
          endYear={endYear}
          setEndYear={setEndYear}
          activeWilayahLabel={activeWilayahLabel}
          periodePembandingLabel={periodePembandingLabel}
        />

        <PublicStatsCards
          selectedDesaId={selectedDesaId}
          availableDesa={availableDesa}
          activeWilayahLabel={activeWilayahLabel}
          summaryStats={summaryStats}
          filteredLaporan={filteredLaporan}
        />

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <PublicGenderChart
            activeWilayahLabel={activeWilayahLabel}
            genderMode={genderMode}
            setGenderMode={setGenderMode}
            genderChartData={genderChartData}
          />
          <PublicEducationChart
            activeWilayahLabel={activeWilayahLabel}
            eduMode={eduMode}
            setEduMode={setEduMode}
            educationChartData={educationChartData}
          />
        </section>

        <PublicFeaturedCommodities
          activeWilayahLabel={activeWilayahLabel}
          featuredSectorSlug={featuredSectorSlug}
          setFeaturedSectorSlug={setFeaturedSectorSlug}
          monthlyTopCommodities={monthlyTopCommodities}
        />

        <PublicTrendChartAndSectors
          activeWilayahLabel={activeWilayahLabel}
          chartSeries={chartSeries}
          selectedChartFieldId={selectedChartFieldId}
          setSelectedChartFieldId={setSelectedChartFieldId}
          fields={fields}
          sectorAvailability={sectorAvailability}
        />

        <PublicTrendTable
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          handleExportPublicData={handleExportPublicData}
          selectedCatId={selectedCatId}
          setSelectedCatId={setSelectedCatId}
          categories={categories}
          trendItems={trendItems}
          loading={loading}
          displayedTrendItems={displayedTrendItems}
        />
      </main>

      <Footer />
    </div>
  );
}