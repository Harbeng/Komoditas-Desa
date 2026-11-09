import { MapPin, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';

export default function PublicStatsCards({
  selectedDesaId,
  availableDesa,
  activeWilayahLabel,
  summaryStats,
  filteredLaporan,
}) {
  return (
    <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 sm:text-xs">
            Cakupan Wilayah
          </span>
          <MapPin className="h-4 w-4 text-indigo-600 sm:h-5 sm:w-5" />
        </div>
        <p className="mt-2 text-xl font-extrabold text-slate-900 sm:text-2xl">
          {selectedDesaId !== 'ALL' ? '1 Desa' : `${availableDesa.length} Desa`}
        </p>
        <p className="mt-1 truncate text-[11px] text-slate-500 sm:text-xs">
          {activeWilayahLabel}
        </p>
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs sm:p-5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 sm:text-xs">
            Komoditas Naik
          </span>
          <TrendingUp className="h-4 w-4 text-emerald-600 sm:h-5 sm:w-5" />
        </div>
        <p className="mt-2 text-xl font-extrabold text-emerald-700 sm:text-2xl">
          {summaryStats.countNaik} Item
        </p>
        <p className="mt-1 text-[11px] text-emerald-700/80 sm:text-xs">
          Tren persentase positif
        </p>
      </div>

      <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 shadow-xs sm:p-5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 sm:text-xs">
            Komoditas Turun
          </span>
          <TrendingDown className="h-4 w-4 text-rose-600 sm:h-5 sm:w-5" />
        </div>
        <p className="mt-2 text-xl font-extrabold text-rose-700 sm:text-2xl">
          {summaryStats.countTurun} Item
        </p>
        <p className="mt-1 text-[11px] text-rose-700/80 sm:text-xs">
          Tren persentase menurun
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 sm:text-xs">
            Laporan Masuk
          </span>
          <BarChart3 className="h-4 w-4 text-amber-600 sm:h-5 sm:w-5" />
        </div>
        <p className="mt-2 text-xl font-extrabold text-slate-900 sm:text-2xl">
          {filteredLaporan.length} Data
        </p>
        <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">
          Dalam {summaryStats.jumlahPeriodeAktif} bulan aktif
        </p>
      </div>
    </section>
  );
}