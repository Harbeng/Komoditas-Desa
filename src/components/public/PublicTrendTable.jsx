import { Search, FileSpreadsheet, Download, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function PublicTrendTable({
  searchQuery,
  setSearchQuery,
  handleExportPublicData,
  selectedCatId,
  setSelectedCatId,
  categories,
  trendItems,
  loading,
  displayedTrendItems,
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 sm:text-lg">
            Rincian Tren Komoditas & Demografi Desa
          </h2>
          <p className="text-xs text-slate-500">
            Perubahan persentase (naik/turun) dari periode awal ke periode akhir.
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
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
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 sm:flex-none"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel
          </button>

          <button
            type="button"
            onClick={() => handleExportPublicData('csv')}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 sm:flex-none"
          >
            <Download className="h-4 w-4 text-indigo-600" />
            CSV
          </button>
        </div>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCatId('ALL')}
          className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
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
            className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              selectedCatId === cat.id
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {cat.nama_kategori}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[640px] text-left text-sm">
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
  );
}