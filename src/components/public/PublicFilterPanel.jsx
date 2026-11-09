import { Filter, MapPin, Building2, Calendar } from 'lucide-react';

const NAMA_BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export default function PublicFilterPanel({
  selectedKecId,
  setSelectedKecId,
  setSelectedDesaId,
  selectedDesaId,
  kecamatanList,
  availableDesa,
  startMonth,
  setStartMonth,
  startYear,
  setStartYear,
  endMonth,
  setEndMonth,
  endYear,
  setEndYear,
  activeWilayahLabel,
  periodePembandingLabel,
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 sm:text-sm">
          <Filter className="h-4 w-4 shrink-0 text-indigo-600" />
          <span>Filter Wilayah & Rentang Waktu</span>
        </div>
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-700 sm:text-xs">
          {activeWilayahLabel} • {periodePembandingLabel}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <MapPin className="h-3.5 w-3.5 text-indigo-600" />
            Kecamatan
          </label>
          <select
            value={selectedKecId}
            onChange={(e) => {
              setSelectedKecId(e.target.value);
              setSelectedDesaId('ALL');
            }}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-none"
          >
            <option value="ALL">Seluruh Kabupaten (7 Kecamatan)</option>
            {kecamatanList.map((kec) => (
              <option key={kec.id} value={kec.id}>
                Kec. {kec.nama_kecamatan}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-3">
          <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <Building2 className="h-3.5 w-3.5 text-emerald-600" />
            Desa
          </label>
          <select
            value={selectedDesaId}
            onChange={(e) => setSelectedDesaId(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-none"
          >
            <option value="ALL">Semua Desa ({availableDesa.length})</option>
            {availableDesa.map((d) => (
              <option key={d.id} value={d.id}>
                Desa {d.nama_desa}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-3">
          <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <Calendar className="h-3.5 w-3.5 text-amber-600" />
            Dari Periode (Awal)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={startMonth}
              onChange={(e) => setStartMonth(Number(e.target.value))}
              className="rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-2.5 text-sm font-medium text-slate-800"
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
              className="rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-2.5 text-sm font-medium text-slate-800"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="lg:col-span-3">
          <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <Calendar className="h-3.5 w-3.5 text-indigo-600" />
            Sampai Periode (Akhir)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={endMonth}
              onChange={(e) => setEndMonth(Number(e.target.value))}
              className="rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-2.5 text-sm font-medium text-slate-800"
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
              className="rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-2.5 text-sm font-medium text-slate-800"
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
  );
}