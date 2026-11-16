export const NAMA_BULAN = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

/**
 * Mengecek fase timeline saat ini dan apakah form input Kepala Desa terkunci
 * Aturan:
 * - Tanggal 1 s/d 14: Minggu 1-2 (Periode Input & Pengiriman Data oleh Kepala Desa)
 * - Tanggal 15 s/d Akhir Bulan: Minggu 3-4 (Periode Pemeriksaan & Approval oleh Approver)
 * - Jika lewat tanggal 14 dan Kepala Desa BELUM pernah mengirim data pada periode tersebut, maka sistem otomatis TERKUNCI.
 * - Jika data SUDAH dikirim tetapi DITOLAK ('rejected') oleh Approver, maka TIDAK TERKUNCI (bisa diedit & dikirim ulang).
 * - Jika Admin membuka kunci pada tabel desa_unlocks, maka TIDAK TERKUNCI.
 */
export function evaluateSubmissionTimeline({
  periodeBulan,
  periodeTahun,
  existingLaporan,
  isUnlockedByAdmin,
}) {
  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const isFirstTwoWeeks = currentDay >= 1 && currentDay <= 14;
  const faseSaatIni = isFirstTwoWeeks
    ? 'Minggu 1 - 2 (Jadwal Input & Pengiriman Kepala Desa)'
    : 'Minggu 3 - 4 (Jadwal Pemeriksaan & Verifikasi Approver)';

  const targetKey = periodeTahun * 100 + periodeBulan;
  const currentKey = currentYear * 100 + currentMonth;

  // 1. Jika laporan sudah ada tetapi statusnya DITOLAK ('rejected') -> Bebas melakukan perbaikan (Tidak Terkunci)
  if (existingLaporan?.status === 'rejected') {
    return {
      isLocked: false,
      canEdit: true,
      lockReason: null,
      badgeText: 'Perbaikan Data (Ditolak Approver)',
      faseSaatIni,
      isFirstTwoWeeks,
    };
  }

  // 2. Jika laporan sudah DISETUJUI ('approved') atau sedang diajukan hapus ('delete_requested')
  if (
    existingLaporan?.status === 'approved' ||
    existingLaporan?.status === 'delete_requested'
  ) {
    return {
      isLocked: true,
      canEdit: false,
      lockReason:
        existingLaporan.status === 'approved'
          ? 'Data periode ini telah disetujui (Approved) oleh Approver dan sudah tayang di Dashboard Publik. Jika ingin menghapus, gunakan tombol Ajukan Hapus ke Approver.'
          : 'Data ini sedang menunggu persetujuan penghapusan dari Role Approver.',
      badgeText:
        existingLaporan.status === 'approved'
          ? 'Sudah Disetujui & Dipublish'
          : 'Menunggu Persetujuan Hapus',
      faseSaatIni,
      isFirstTwoWeeks,
    };
  }

  // 3. Jika laporan sudah dikirim dan masih 'pending' -> Masih bisa diedit/dihapus sebelum diperiksa Approver
  if (existingLaporan?.status === 'pending') {
    return {
      isLocked: false,
      canEdit: true,
      lockReason: null,
      badgeText: 'Menunggu Pemeriksaan Approver (Dapat Diedit)',
      faseSaatIni,
      isFirstTwoWeeks,
    };
  }

  // 4. Jika BELUM pernah mengirim laporan sama sekali untuk periode ini:
  // Cek apakah sudah dibuka kuncinya oleh Admin
  if (isUnlockedByAdmin) {
    return {
      isLocked: false,
      canEdit: true,
      lockReason: null,
      badgeText: 'Akses Input Dibuka oleh Admin',
      faseSaatIni,
      isFirstTwoWeeks,
    };
  }

  // Cek apakah masih dalam jadwal 2 minggu awal pada bulan berjalan
  const isWithinWindow = targetKey === currentKey && isFirstTwoWeeks;

  if (!isWithinWindow) {
    return {
      isLocked: true,
      canEdit: false,
      lockReason: `Batas waktu pengiriman data untuk periode ${
        NAMA_BULAN[periodeBulan - 1]
      } ${periodeTahun} (2 minggu awal bulan / Tanggal 1 - 14) telah berakhir dan desa Anda belum mengirimkan data. Silakan hubungi Role Admin untuk membuka kunci akses input.`,
      badgeText: 'Terkunci Otomatis (Lewat Batas Waktu 2 Minggu Awal)',
      faseSaatIni,
      isFirstTwoWeeks,
    };
  }

  return {
    isLocked: false,
    canEdit: true,
    lockReason: null,
    badgeText: 'Jadwal Input Aktif (Minggu 1 - 2)',
    faseSaatIni,
    isFirstTwoWeeks,
  };
}