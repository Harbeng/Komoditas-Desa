import { Layers } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function PublicTrendChartAndSectors({
  activeWilayahLabel,
  chartSeries,
  selectedChartFieldId,
  setSelectedChartFieldId,
  fields,
  sectorAvailability,
}) {
  return (
    <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6 lg:col-span-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Grafik Pergerakan Tren Komoditas
            </h2>
            <p className="text-xs text-slate-500">
              Fluktuasi volume berdasarkan rentang waktu di{' '}
              <strong>{activeWilayahLabel}</strong>
            </p>
          </div>

          <select
            value={selectedChartFieldId}
            onChange={(e) => setSelectedChartFieldId(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-600 focus:outline-none sm:w-auto sm:max-w-xs"
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
          <div className="h-64 w-full sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartSeries}>
                <defs>
                  <linearGradient id="colorNilai" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="periode" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
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

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6 lg:col-span-4">
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
                    {sec.desaAda} / {sec.totalDesaLapor} Desa ({pct}%)
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
  );
}