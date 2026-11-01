import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useDialog } from '../../context/DialogContext';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Search,
  Layers,
} from 'lucide-react';

export default function AdminFormBuilder() {
  const { showToast, showConfirm } = useDialog();
  const [categories, setCategories] = useState([]);
  const [fields, setFields] = useState([]);
  const [activeCatId, setActiveCatId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [namaItem, setNamaItem] = useState('');
  const [subKelompok, setSubKelompok] = useState('Umum');
  const [tipeInput, setTipeInput] = useState('angka_tunggal');
  const [satuanUtama, setSatuanUtama] = useState('Ton');
  const [satuanSekunder, setSatuanSekunder] = useState('Ha');

  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatConfirm, setNewCatConfirm] = useState(true);

  const fetchFormStructure = async () => {
    setLoading(true);
    const { data: catData } = await supabase
      .from('form_categories')
      .select('*')
      .order('urutan');

    const { data: fieldData } = await supabase
      .from('form_fields')
      .select('*')
      .order('urutan');

    const cats = catData || [];
    setCategories(cats);
    setFields(fieldData || []);

    if (cats.length > 0 && !activeCatId) {
      setActiveCatId(cats[0].id);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFormStructure();
  }, []);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const slug = newCatName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_');

    const { data, error } = await supabase
      .from('form_categories')
      .insert({
        nama_kategori: newCatName.trim(),
        slug,
        urutan: categories.length + 1,
        butuh_konfirmasi_sektor: newCatConfirm,
      })
      .select()
      .single();

    if (error) {
      showToast('Gagal menambah kategori: ' + error.message, 'error');
      return;
    }

    showToast(`Kategori "${newCatName.trim()}" berhasil ditambahkan!`, 'success');
    setNewCatName('');
    setShowAddCat(false);
    await fetchFormStructure();
    setActiveCatId(data.id);
  };

  const handleAddField = async (e) => {
    e.preventDefault();
    if (!namaItem.trim() || !activeCatId) return;

    const currentCatFields = fields.filter((f) => f.category_id === activeCatId);

    const { error } = await supabase.from('form_fields').insert({
      category_id: activeCatId,
      sub_kelompok: subKelompok.trim() || 'Umum',
      nama_item: namaItem.trim(),
      tipe_input: tipeInput,
      satuan_utama: satuanUtama.trim() || 'Unit',
      satuan_sekunder: tipeInput === 'luas_dan_produksi' ? satuanSekunder.trim() : null,
      is_active: true,
      urutan: currentCatFields.length + 1,
    });

    if (error) {
      showToast('Gagal menambah item form: ' + error.message, 'error');
      return;
    }

    showToast(`Item "${namaItem.trim()}" berhasil ditambahkan!`, 'success');
    setNamaItem('');
    fetchFormStructure();
  };

  const handleToggleActive = async (field) => {
    const { error } = await supabase
      .from('form_fields')
      .update({ is_active: !field.is_active })
      .eq('id', field.id);

    if (!error) {
      showToast(
        `Status tampil "${field.nama_item}" diubah menjadi ${
          !field.is_active ? 'Aktif' : 'Nonaktif'
        }.`,
        'info'
      );
      fetchFormStructure();
    }
  };

  const handleDeleteField = async (field) => {
    const confirmed = await showConfirm({
      title: `Hapus "${field.nama_item}"?`,
      message: `Pertanyaan/komoditas "${field.nama_item}" beserta data isian terkait akan dihapus dari form sistem.`,
      confirmText: 'Ya, Hapus Item',
      cancelText: 'Batal',
      variant: 'danger',
    });

    if (!confirmed) return;

    const { error } = await supabase.from('form_fields').delete().eq('id', field.id);
    if (!error) {
      showToast(`Item "${field.nama_item}" berhasil dihapus.`, 'success');
      fetchFormStructure();
    } else {
      showToast('Gagal menghapus item: ' + error.message, 'error');
    }
  };

  const activeCategory = categories.find((c) => c.id === activeCatId);
  const filteredFields = fields.filter(
    (f) =>
      f.category_id === activeCatId &&
      f.nama_item.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tipeInputLabels = {
    angka_tunggal: 'Angka Tunggal (Jumlah / Ton / Ekor)',
    luas_dan_produksi: 'Produksi (Ton) & Luas Lahan (Ha)',
    gender_l_p: 'Rincian Laki-Laki & Perempuan',
    tingkat_pendidikan: 'Rincian Tingkat Pendidikan (SD s/d S1+)',
    tingkat_sekolah: 'Rincian Tingkat Sekolah (TK, SD, SMP, SMA)',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Pengaturan Form & Kategori Komoditas
          </h1>
          <p className="text-sm text-slate-500">
            Atur daftar pertanyaan dan komoditas per sektor yang akan diisi oleh Role Kepala Desa.
          </p>
        </div>
        <button
          onClick={() => setShowAddCat(!showAddCat)}
          className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
        >
          <Layers className="h-4 w-4" />
          + Kategori Sektor Baru
        </button>
      </div>

      {showAddCat && (
        <form
          onSubmit={handleAddCategory}
          className="flex flex-wrap items-end gap-4 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4"
        >
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Nama Kategori / Sektor Baru
            </label>
            <input
              type="text"
              required
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Contoh: Industri Kerajinan Desa"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 pb-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={newCatConfirm}
              onChange={(e) => setNewCatConfirm(e.target.checked)}
              className="h-4 w-4 rounded text-indigo-600"
            />
            Sertakan Konfirmasi "Ada / Tidak Ada"
          </label>
          <button
            type="submit"
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Simpan Kategori
          </button>
        </form>
      )}

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {categories.map((cat) => {
          const count = fields.filter((f) => f.category_id === cat.id).length;
          const active = cat.id === activeCatId;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCatId(cat.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                active
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{cat.nama_kategori}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  active ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700">
          <Plus className="h-4 w-4 text-indigo-600" />
          Tambah Pertanyaan / Komoditas di "{activeCategory?.nama_kategori}"
        </h3>

        <form onSubmit={handleAddField} className="grid grid-cols-1 gap-4 sm:grid-cols-12">
          <div className="sm:col-span-4">
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Nama Pertanyaan / Komoditas
            </label>
            <input
              type="text"
              required
              value={namaItem}
              onChange={(e) => setNamaItem(e.target.value)}
              placeholder="Contoh: Rumput Laut / Jumlah Posyandu"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-600 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Tipe Input Form
            </label>
            <select
              value={tipeInput}
              onChange={(e) => setTipeInput(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none"
            >
              <option value="angka_tunggal">Angka Tunggal (1 Kolom)</option>
              <option value="luas_dan_produksi">Produksi & Luas Lahan (2 Kolom)</option>
              <option value="gender_l_p">Laki-Laki & Perempuan</option>
              <option value="tingkat_pendidikan">Tingkat Pendidikan (SD-S1+)</option>
              <option value="tingkat_sekolah">Tingkat Sekolah (TK-SMA)</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Satuan Utama
            </label>
            <input
              type="text"
              value={satuanUtama}
              onChange={(e) => setSatuanUtama(e.target.value)}
              placeholder="Ton / Ekor / Orang"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none"
            />
          </div>

          {tipeInput === 'luas_dan_produksi' ? (
            <div className="sm:col-span-1">
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Satuan Lahan
              </label>
              <input
                type="text"
                value={satuanSekunder}
                onChange={(e) => setSatuanSekunder(e.target.value)}
                placeholder="Ha"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none"
              />
            </div>
          ) : (
            <div className="sm:col-span-1">
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Sub-Kelompok
              </label>
              <input
                type="text"
                value={subKelompok}
                onChange={(e) => setSubKelompok(e.target.value)}
                placeholder="Umum"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none"
              />
            </div>
          )}

          <div className="flex items-end sm:col-span-2">
            <button
              type="submit"
              className="w-full rounded-xl bg-indigo-600 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700"
            >
              + Tambah Item
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              Daftar Pertanyaan / Komoditas ({filteredFields.length} Item)
            </h2>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama komoditas / pertanyaan..."
              className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-indigo-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600">
              <tr>
                <th className="w-12 px-4 py-3">No</th>
                <th className="px-4 py-3">Nama Item / Pertanyaan</th>
                <th className="px-4 py-3">Tipe Input</th>
                <th className="px-4 py-3">Satuan</th>
                <th className="px-4 py-3 text-center">Status Tampil</th>
                <th className="w-24 px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">
                    Memuat daftar pertanyaan...
                  </td>
                </tr>
              ) : filteredFields.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">
                    Tidak ada pertanyaan/komoditas yang sesuai pencarian.
                  </td>
                </tr>
              ) : (
                filteredFields.map((item, index) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50 ${!item.is_active ? 'bg-slate-50/60 opacity-60' : ''}`}
                  >
                    <td className="px-4 py-3 text-slate-500">{index + 1}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {item.nama_item}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      <span className="rounded-md bg-slate-100 px-2.5 py-1 font-medium">
                        {tipeInputLabels[item.tipe_input] || item.tipe_input}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-600">
                      {item.tipe_input === 'luas_dan_produksi'
                        ? `${item.satuan_utama} & ${item.satuan_sekunder}`
                        : item.satuan_utama}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleActive(item)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
                          item.is_active
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                      >
                        {item.is_active ? (
                          <>
                            <ToggleRight className="h-4 w-4 text-emerald-600" />
                            Aktif
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-4 w-4 text-slate-500" />
                            Nonaktif
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeleteField(item)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        title="Hapus Item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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