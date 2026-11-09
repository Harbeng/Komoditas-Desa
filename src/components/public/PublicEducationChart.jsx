import { GraduationCap } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const EDU_COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#6366f1', '#8b5cf6'];

export default function PublicEducationChart({
  activeWilayahLabel,
  eduMode,
  setEduMode,
  educationChartData,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6 lg:col-span-7">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <GraduationCap className="h-5 w-5 text-emerald-600" />
            Diagram Tingkat Pendidikan & Sekolah
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Rincian jumlah berdasarkan jenjang SD, SMP, SMA/SMK, dst. di{' '}
            <strong>{activeWilayahLabel}</strong>
          </p>
        </div>

        <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
          {[
            { id: 'murid', label: 'Murid' },
            { id: 'guru', label: 'Guru' },
            { id: 'sekolah', label: 'Sekolah' },
            { id: 'pns_didik', label: 'Pendidikan PNS' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setEduMode(tab.id)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                eduMode === tab.id
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {educationChartData.total === 0 ? (
        <div className="flex h-64 items-center justify-center text-xs text-slate-400">
          Belum ada data pendidikan pada wilayah ini.
        </div>
      ) : (
        <div className="mt-4">
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={educationChartData.items}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="jenjang" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(val) => [
                    `${Number(val).toLocaleString('id-ID')} ${
                      educationChartData.unit
                    }`,
                    'Jumlah',
                  ]}
                />
                <Bar
                  dataKey="jumlah"
                  name={`Jumlah (${educationChartData.unit})`}
                  radius={[8, 8, 0, 0]}
                >
                  {educationChartData.items.map((entry, idx) => (
                    <Cell
                      key={`edu-cell-${idx}`}
                      fill={EDU_COLORS[idx % EDU_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
            {educationChartData.items.map((item, idx) => (
              <div
                key={item.jenjang}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 text-center"
              >
                <span className="block text-[11px] font-bold text-slate-500">
                  {item.jenjang}
                </span>
                <span
                  className="mt-0.5 block text-base font-extrabold"
                  style={{ color: EDU_COLORS[idx % EDU_COLORS.length] }}
                >
                  {item.jumlah.toLocaleString('id-ID')}
                </span>
                <span className="text-[10px] text-slate-400">
                  {educationChartData.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}