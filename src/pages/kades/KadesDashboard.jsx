import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import {
  Building2,
  ClipboardEdit,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

const NAMA_BULAN_PENDEK = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

export default function KadesDashboard() {
  const { profile } = useAuth();
  const [laporanList, setLaporanList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [summary, setSummary] = useState({
    totalPeriode: 0,
    totalProduksiTon: 0,
    totalLuasLahanHa: 0,
    totalPopulasiTernak: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDesaDashboard = async () => {
      if (!profile?.desa_id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const [{ data: cats }, { data: lapData }] = await Promise.all([
        supabase.from('form_categories').select('*').order('urutan'),
        supabase
          .from('laporan_desa')
          .select(
            '*, laporan_detail(nilai_utama, nilai_sekunder, form_fields(nama_item, satuan_utama, tipe_input, category_id))'
          )
          .eq('desa_id', profile.desa_id)
          .order('periode_tahun', { ascending: true })
          .order('periode_bulan', { ascending: true }),
      ]);

      setCategories(cats || []);
      const laporans = lapData || [];
      setLaporanList([...laporans].reverse());

      // Hitung agregat dari laporan periode terbaru
      const latest = laporans[laporans.length - 1];
      let ton = 0;
      let ha = 0;
      let ternak = 0;

      if (latest?.laporan_detail) {
        latest.laporan_detail.forEach((d) => {
          const satuan = d.form_fields?.satuan_utama;
          if (satuan === 'Ton') ton += Number(d.nilai_utama) || 0;
          if (d.form_fields?.tipe_input === 'luas_dan_produksi') {
            ha += Number(d.nilai_sekunder) || 0;
          }
          if (satuan === 'Ekor') ternak += Number(d.nilai_utama) || 0;
        });
      }

      setSummary({
        totalPeriode: laporans.length,
        totalProduksiTon: ton,
        totalLuasLahanHa: ha,
        totalPopulasiTernak: ternak,
      });

      // Siapkan data grafik per periode
      const formattedChart = laporans.map((l) => {
        let totalProd = 0;
        (l.laporan_detail || []).forEach((d) => {
          if (d.form_fields?.satuan_utama === 'Ton') {
            totalProd += Number(d.nilai_utama) || 0;
          }
        });
        return {
          periode: `${NAMA_BULAN_PENDEK[l.periode_bulan - 1]} ${l.periode_tahun}`,
          produksi_ton: Number(totalProd.toFixed(2)),
        };
      });

      setChartData(formattedChart);
      setLoading(false);
    };

    fetchDesaDashboard();
  }, [profile?.desa_id]);

  if (!profile?.desa_id) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <Building2 className="mx-auto h-10 w-10 text-emerald-600" />
        <h2 className="mt-3 text-lg font-bold text-slate-900">
          Wilayah Desa Belum Dipilih
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Silakan pilih Kecamatan dan Desa Anda pada menu Profile terlebih dahulu.
        </p>
        <Link
          to="/kades/profile"
          className="mt-4 inline-block rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Buka Pengaturan Profile
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Dashboard Komoditas Desa {profile?.desa?.nama_desa}
          </h1>
          <p className="text-sm text-slate-500">
            Kecamatan {profile?.kecamatan?.nama_kecamatan} — Ringkasan dan Monitoring Data Desa
          </p>
        </div>

        <Link
          to="/kades/input-data"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-emerald-700"
        >
          <ClipboardEdit className="h-4 w-4" />
          + Input / Update Data Desa
        </Link>
      </div>

      {/* Kartu Ringkasan Data Desa (Periode Terakhir) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Periode Terlapor
            </span>
            <Calendar className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{summary.totalPeriode}</p>
          <p className="mt-1 text-xs text-slate-500">Total Bulan Data Tersimpan</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Total Produksi (Terbaru)
            </span>
            <TrendingUp className="h-5 w-5 text-indigo-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {summary.totalProduksiTon.toLocaleString('id-ID')} Ton
          </p>
          <p className="mt-1 text-xs text-slate-500">Gabungan Lahan & Perikanan</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Total Luas Lahan
            </span>
            <Layers className="h-5 w-5 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {summary.totalLuasLahanHa.toLocaleString('id-ID')} Ha
          </p>
          <p className="mt-1 text-xs text-slate-500">Pertanian & Perkebunan Desa</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Populasi Ternak
            </span>
            <Building2 className="h-5 w-5 text-sky-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {summary.totalPopulasiTernak.toLocaleString('id-ID')} Ekor
          </p>
          <p className="mt-1 text-xs text-slate-500">Total Ternak Terdata</p>
        </div>
      </div>

      {/* Grafik Tren Produksi Desa */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h2 className="text-base font-bold text-slate-900">
          Tren Total Produksi Komoditas Desa {profile?.desa?.nama_desa} (Ton)
        </h2>
        <p className="mb-6 text-xs text-slate-500">
          Perkembangan volume produksi komoditas desa dari periode ke periode.
        </p>

        {chartData.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            Belum ada data laporan untuk ditampilkan dalam grafik.
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="periode" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar
                  dataKey="produksi_ton"
                  name="Total Produksi (Ton)"
                  fill="#059669"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Tabel Riwayat Konfirmasi Sektor per Periode */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-bold text-slate-900">
            Status Konfirmasi Sektor per Periode Laporan
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600">
              <tr>
                <th className="px-5 py-3.5">Periode</th>
                <th className="px-5 py-3.5">Tanggal Simpan</th>
                <th className="px-5 py-3.5">Status Konfirmasi Sektor</th>
                <th className="px-5 py-3.5 text-center">Item Rincian Terisi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-slate-400">
                    Memuat data desa...
                  </td>
                </tr>
              ) : laporanList.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-slate-400">
                    Desa Anda belum memiliki riwayat laporan. Klik tombol Input Data di kanan atas.
                  </td>
                </tr>
              ) : (
                laporanList.map((lap) => (
                  <tr key={lap.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-bold text-slate-900">
                      {NAMA_BULAN_PENDEK[lap.periode_bulan - 1]} {lap.periode_tahun}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {lap.tanggal_lapor}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {categories
                          .filter((c) => c.butuh_konfirmasi_sektor)
                          .map((c) => {
                            const ada = lap.konfirmasi_sektor?.[c.slug]?.ada !== false;
                            return (
                              <span
                                key={c.id}
                                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${
                                  ada
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                {ada ? (
                                  <CheckCircle2 className="h-3 w-3" />
                                ) : (
                                  <XCircle className="h-3 w-3" />
                                )}
                                {c.nama_kategori}: {ada ? 'Ada' : 'Tidak'}
                              </span>
                            );
                          })}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center font-semibold text-slate-700">
                      {lap.laporan_detail?.length || 0} Komoditas
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