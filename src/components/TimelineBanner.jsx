import { Clock, CheckCircle2, Lock, Unlock, ShieldAlert } from 'lucide-react';

export default function TimelineBanner({ timelineInfo }) {
  const { isLocked, lockReason, badgeText, isFirstTwoWeeks } = timelineInfo;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">
            Timeline Pelaporan Bulanan Komoditas Desa
          </h3>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
            isLocked
              ? 'bg-rose-100 text-rose-800'
              : 'bg-emerald-100 text-emerald-800'
          }`}
        >
          {isLocked ? (
            <Lock className="h-3.5 w-3.5" />
          ) : (
            <Unlock className="h-3.5 w-3.5" />
          )}
          {badgeText}
        </span>
      </div>

      {/* Stepper Visual 2 Minggu Awal vs 2 Minggu Akhir */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div
          className={`rounded-xl border p-3.5 ${
            isFirstTwoWeeks
              ? 'border-emerald-300 bg-emerald-50/70'
              : 'border-slate-200 bg-slate-50 opacity-75'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">
              Minggu 1 – 2 (Tanggal 1 s/d 14)
            </span>
            {isFirstTwoWeeks && (
              <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                Fase Aktif
              </span>
            )}
          </div>
          <p className="mt-1 text-xs font-medium text-slate-700">
            Waktu Role Kepala Desa melakukan input data komoditas dan mengirimkan laporan ke Role Approver.
          </p>
        </div>

        <div
          className={`rounded-xl border p-3.5 ${
            !isFirstTwoWeeks
              ? 'border-indigo-300 bg-indigo-50/70'
              : 'border-slate-200 bg-slate-50 opacity-75'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-800">
              Minggu 3 – 4 (Tanggal 15 s/d Akhir Bulan)
            </span>
            {!isFirstTwoWeeks && (
              <span className="rounded-md bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white">
                Fase Aktif
              </span>
            )}
          </div>
          <p className="mt-1 text-xs font-medium text-slate-700">
            Waktu Role Approver memeriksa data desa (Approve & Publish ke Dashboard Publik atau Tolak untuk perbaikan).
          </p>
        </div>
      </div>

      {isLocked && lockReason && (
        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <span>{lockReason}</span>
        </div>
      )}
    </div>
  );
}