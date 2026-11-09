import { Award, Calendar, Sparkles } from 'lucide-react';

export default function PublicFeaturedCommodities({
  activeWilayahLabel,
  featuredSectorSlug,
  setFeaturedSectorSlug,
  monthlyTopCommodities,
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 sm:text-lg">
            <Award className="h-5 w-5 text-amber-500" />
            Komoditas Paling Menonjol Tiap Bulan
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Peringkat komoditas dengan volume tertinggi setiap bulan di{' '}
            <strong>{activeWilayahLabel}</strong>
          </p>
        </div>

        <select
          value={featuredSectorSlug}
          onChange={(e) => setFeaturedSectorSlug(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-600 focus:outline-none sm:w-auto"
        >
          <option value="ALL_PRODUKSI">
            Semua Komoditas Produksi (Satuan Ton)
          </option>
          <option value="produksi_lahan">
            Sektor Produksi & Luas Lahan (Ton)
          </option>
          <option value="produksi_tangkap">
            Sektor Perikanan Tangkap (Ton)
          </option>
          <option value="produksi_budidaya">
            Sektor Perikanan Budidaya (Ton)
          </option>
          <option value="populasi_ternak">
            Sektor Populasi Ternak (Ekor)
          </option>
        </select>
      </div>

      {monthlyTopCommodities.length === 0 ? (
        <div className="py-10 text-center text-sm text-slate-400">
          Belum ada data komoditas bulanan pada wilayah dan rentang waktu ini.
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {monthlyTopCommodities.map((mItem) => (
            <div
              key={mItem.key}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 p-4 shadow-2xs transition hover:border-indigo-300 hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-indigo-700">
                    <Calendar className="h-3.5 w-3.5" />
                    {mItem.fullLabel}
                  </span>
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                    Top #1 Bulan Ini
                  </span>
                </div>

                {mItem.winner ? (
                  <div className="mt-3 rounded-xl border border-amber-200/80 bg-amber-50/60 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-semibold uppercase text-amber-700">
                          {mItem.winner.nama_kategori}
                        </span>
                        <h3 className="text-base font-extrabold text-slate-900">
                          {mItem.winner.nama_item}
                        </h3>
                      </div>
                      <Sparkles className="h-5 w-5 shrink-0 text-amber-500" />
                    </div>

                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-lg font-black text-indigo-700">
                        {mItem.winner.nilai.toLocaleString('id-ID')}{' '}
                        <span className="text-xs font-semibold">
                          {mItem.winner.satuan}
                        </span>
                      </span>
                      <span className="text-[11px] font-bold text-emerald-700">
                        {mItem.winner.kontribusiPersen}% dari total bulan
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="py-6 text-center text-xs text-slate-400">
                    Tidak ada produksi tercatat
                  </p>
                )}

                {mItem.top3.length > 1 && (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Komoditas Unggulan Lainnya:
                    </p>
                    {mItem.top3.slice(1).map((sub, idx) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between rounded-lg bg-white px-2.5 py-1.5 text-xs border border-slate-100"
                      >
                        <span className="truncate font-semibold text-slate-700">
                          #{idx + 2} {sub.nama_item}
                        </span>
                        <span className="shrink-0 font-bold text-slate-900">
                          {sub.nilai.toLocaleString('id-ID')} {sub.satuan}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}