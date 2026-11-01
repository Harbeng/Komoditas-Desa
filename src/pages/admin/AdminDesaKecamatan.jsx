import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useDialog } from '../../context/DialogContext';
import {
  MapPinned,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Building2,
  Search,
} from 'lucide-react';

export default function AdminDesaKecamatan() {
  const { showToast, showConfirm } = useDialog();
  const [kecamatanList, setKecamatanList] = useState([]);
  const [desaList, setDesaList] = useState([]);
  const [selectedKecId, setSelectedKecId] = useState('');
  const [loading, setLoading] = useState(true);

  const [newDesaName, setNewDesaName] = useState('');
  const [newKecName, setNewKecName] = useState('');
  const [searchDesa, setSearchDesa] = useState('');

  const [editingDesaId, setEditingDesaId] = useState(null);
  const [editingDesaName, setEditingDesaName] = useState('');

  const fetchWilayah = async () => {
    setLoading(true);
    const { data: kecData } = await supabase
      .from('kecamatan')
      .select('id, nama_kecamatan')
      .order('nama_kecamatan');

    const { data: dData } = await supabase
      .from('desa')
      .select('id, kecamatan_id, nama_desa')
      .order('nama_desa');

    const kecs = kecData || [];
    setKecamatanList(kecs);
    setDesaList(dData || []);

    if (kecs.length > 0 && !selectedKecId) {
      setSelectedKecId(kecs[0].id);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchWilayah();
  }, []);

  const handleAddKecamatan = async (e) => {
    e.preventDefault();
    if (!newKecName.trim()) return;

    const { data, error } = await supabase
      .from('kecamatan')
      .insert({ nama_kecamatan: newKecName.trim() })
      .select()
      .single();

    if (error) {
      showToast('Gagal menambah kecamatan: ' + error.message, 'error');
      return;
    }

    showToast(`Kecamatan "${newKecName.trim()}" berhasil ditambahkan!`, 'success');
    setNewKecName('');
    await fetchWilayah();
    setSelectedKecId(data.id);
  };

  const handleAddDesa = async (e) => {
    e.preventDefault();
    if (!newDesaName.trim() || !selectedKecId) return;

    const { error } = await supabase.from('desa').insert({
      kecamatan_id: selectedKecId,
      nama_desa: newDesaName.trim(),
    });

    if (error) {
      showToast('Gagal menambah desa (mungkin nama desa sudah ada).', 'error');
      return;
    }

    showToast(`Desa "${newDesaName.trim()}" berhasil ditambahkan!`, 'success');
    setNewDesaName('');
    fetchWilayah();
  };

  const handleUpdateDesa = async (id) => {
    if (!editingDesaName.trim()) return;
    const { error } = await supabase
      .from('desa')
      .update({ nama_desa: editingDesaName.trim() })
      .eq('id', id);

    if (error) {
      showToast('Gagal mengubah nama desa: ' + error.message, 'error');
      return;
    }
    showToast('Nama desa berhasil diperbarui!', 'success');
    setEditingDesaId(null);
    fetchWilayah();
  };

  const handleDeleteDesa = async (id, nama) => {
    const confirmed = await showConfirm({
      title: `Hapus Desa ${nama}?`,
      message: `Seluruh data laporan komoditas yang terkait dengan Desa "${nama}" juga akan ikut terhapus secara permanen.`,
      confirmText: 'Ya, Hapus Desa',
      cancelText: 'Batal',
      variant: 'danger',
    });

    if (!confirmed) return;

    const { error } = await supabase.from('desa').delete().eq('id', id);
    if (error) {
      showToast('Gagal menghapus desa: ' + error.message, 'error');
      return;
    }
    showToast(`Desa "${nama}" berhasil dihapus.`, 'success');
    fetchWilayah();
  };

  const activeKecamatan = kecamatanList.find((k) => k.id === selectedKecId);
  const filteredDesa = desaList.filter(
    (d) =>
      d.kecamatan_id === selectedKecId &&
      d.nama_desa.toLowerCase().includes(searchDesa.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Master Desa & Kecamatan</h1>
        <p className="text-sm text-slate-500">
          Kelola daftar desa pada setiap kecamatan agar Role Kepala Desa dapat menginput data sesuai wilayahnya.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700">
              <MapPinned className="h-4 w-4 text-indigo-600" />
              Daftar Kecamatan ({kecamatanList.length})
            </h2>
          </div>

          <div className="space-y-1.5">
            {kecamatanList.map((kec) => {
              const count = desaList.filter((d) => d.kecamatan_id === kec.id).length;
              const isSelected = kec.id === selectedKecId;
              return (
                <button
                  key={kec.id}
                  onClick={() => setSelectedKecId(kec.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>Kec. {kec.nama_kecamatan}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      isSelected
                        ? 'bg-indigo-500 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {count} Desa
                  </span>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleAddKecamatan} className="mt-6 border-t border-slate-100 pt-4">
            <label className="mb-1.5 block text-xs font-semibold text-slate-500">
              Tambah Kecamatan Baru
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newKecName}
                onChange={(e) => setNewKecName(e.target.value)}
                placeholder="Nama Kecamatan..."
                className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-900"
              >
                <Plus className="h-4 w-4" />
                Tambah
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Building2 className="h-5 w-5 text-indigo-600" />
                Daftar Desa di Kecamatan {activeKecamatan?.nama_kecamatan || '-'}
              </h2>
              <p className="text-xs text-slate-500">
                Total {filteredDesa.length} desa terdaftar pada kecamatan ini.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchDesa}
                onChange={(e) => setSearchDesa(e.target.value)}
                placeholder="Cari nama desa..."
                className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-indigo-600 focus:outline-none"
              />
            </div>
          </div>

          <form onSubmit={handleAddDesa} className="mt-4 flex flex-wrap gap-3">
            <input
              type="text"
              required
              value={newDesaName}
              onChange={(e) => setNewDesaName(e.target.value)}
              placeholder={`Masukkan nama desa baru di Kec. ${activeKecamatan?.nama_kecamatan || ''}...`}
              className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-indigo-600 focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Tambah Desa
            </button>
          </form>

          <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                <tr>
                  <th className="w-12 px-4 py-3">No</th>
                  <th className="px-4 py-3">Nama Desa</th>
                  <th className="w-36 px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan="3" className="py-8 text-center text-slate-400">
                      Memuat data desa...
                    </td>
                  </tr>
                ) : filteredDesa.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="py-8 text-center text-slate-400">
                      Belum ada desa yang terdaftar di kecamatan ini.
                    </td>
                  </tr>
                ) : (
                  filteredDesa.map((desa, idx) => (
                    <tr key={desa.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {editingDesaId === desa.id ? (
                          <input
                            type="text"
                            value={editingDesaName}
                            onChange={(e) => setEditingDesaName(e.target.value)}
                            className="w-full rounded-lg border border-indigo-400 px-2.5 py-1 text-sm focus:outline-none"
                          />
                        ) : (
                          desa.nama_desa
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {editingDesaId === desa.id ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleUpdateDesa(desa.id)}
                              className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700 hover:bg-emerald-200"
                              title="Simpan"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setEditingDesaId(null)}
                              className="rounded-lg bg-slate-100 p-1.5 text-slate-600 hover:bg-slate-200"
                              title="Batal"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingDesaId(desa.id);
                                setEditingDesaName(desa.nama_desa);
                              }}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
                              title="Ubah Nama Desa"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDesa(desa.id, desa.nama_desa)}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                              title="Hapus Desa"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}