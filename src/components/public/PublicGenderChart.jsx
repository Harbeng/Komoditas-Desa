import { Users } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const GENDER_COLORS = ['#4f46e5', '#ec4899'];

export default function PublicGenderChart({
  activeWilayahLabel,
  genderMode,
  setGenderMode,
  genderChartData,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6 lg:col-span-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Users className="h-5 w-5 text-indigo-600" />
            Persentase Laki-Laki & Perempuan
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Wilayah: <strong>{activeWilayahLabel}</strong>
          </p>
        </div>

        <div className="flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setGenderMode('penduduk')}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
              genderMode === 'penduduk'
                ? 'bg-white text-indigo-600 shadow-2xs'
                : 'text-slate-600'
            }`}
          >
            Penduduk
          </button>
          <button
            type="button"
            onClick={() => setGenderMode('pns')}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
              genderMode === 'pns'
                ? 'bg-white text-indigo-600 shadow-2xs'
                : 'text-slate-600'
            }`}
          >
            PNS Desa
          </button>
        </div>
      </div>

      {genderChartData.total === 0 ? (
        <div className="flex h-64 items-center justify-center text-xs text-slate-400">
          Belum ada data demografi pada wilayah ini.
        </div>
      ) : (
        <div className="mt-4">
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={genderChartData.items}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={82}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {genderChartData.items.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={GENDER_COLORS[index % GENDER_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name, props) => [
                    `${Number(value).toLocaleString('id-ID')} ${
                      genderChartData.satuan
                    } (${props.payload.persen}%)`,
                    name,
                  ]}
                />
                <Legend verticalAlign="bottom" height={28} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-center">
              <span className="text-xs font-semibold text-indigo-700">
                Laki-Laki ({genderChartData.items[0].persen}%)
              </span>
              <p className="mt-1 text-lg font-extrabold text-indigo-950">
                {genderChartData.items[0].value.toLocaleString('id-ID')}{' '}
                <span className="text-xs font-normal">
                  {genderChartData.satuan}
                </span>
              </p>
            </div>

            <div className="rounded-xl border border-pink-100 bg-pink-50/60 p-3 text-center">
              <span className="text-xs font-semibold text-pink-700">
                Perempuan ({genderChartData.items[1].persen}%)
              </span>
              <p className="mt-1 text-lg font-extrabold text-pink-950">
                {genderChartData.items[1].value.toLocaleString('id-ID')}{' '}
                <span className="text-xs font-normal">
                  {genderChartData.satuan}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}