export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-slate-200 bg-white px-6 py-4">
      <div className="flex flex-col items-center justify-between gap-2 text-xs text-slate-500 sm:flex-row">
        <p>
          &copy; {currentYear} <strong>SI-Komoditas Kabupaten</strong> — Sistem Informasi Data Komoditas & Demografi Desa.
        </p>
        <p className="font-medium text-slate-400">
           Terintegrasi 7 Kecamatan
        </p>
      </div>
    </footer>
  );
}