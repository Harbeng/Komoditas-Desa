import { supabase } from './supabase';

const FONNTE_TOKEN = import.meta.env.VITE_FONNTE_TOKEN;

// Format nomor HP ke standar WhatsApp Indonesia (628xxx)
export function formatPhoneNumber(phone) {
  if (!phone) return null;
  let cleaned = String(phone).replace(/[^0-9]/g, '');
  if (!cleaned) return null;
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }
  return cleaned.length >= 10 ? cleaned : null;
}

// Kirim pesan WhatsApp melalui API Fonnte
export async function sendWhatsAppFonnte(targetNumbers, message) {
  if (!FONNTE_TOKEN || FONNTE_TOKEN === 'masukkan_token_fonnte_anda_disini') {
    console.info('Info Fonnte: VITE_FONNTE_TOKEN belum diatur di .env. Lewati pengiriman WA.');
    return { skipped: true };
  }

  const validNumbers = (Array.isArray(targetNumbers) ? targetNumbers : [targetNumbers])
    .map(formatPhoneNumber)
    .filter(Boolean);

  if (validNumbers.length === 0) return { skipped: true };

  try {
    const formData = new FormData();
    // Fonnte mendukung pengiriman ke banyak nomor sekaligus dengan pemisah koma
    formData.append('target', [...new Set(validNumbers)].join(','));
    formData.append('message', message);
    formData.append('countryCode', '62');

    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: FONNTE_TOKEN,
      },
      body: formData,
    });

    return await response.json();
  } catch (err) {
    console.error('Gagal mengirim WhatsApp via Fonnte:', err);
    return { error: err.message };
  }
}

/**
 * Mengirim Notifikasi In-App + Chat WhatsApp Otomatis ke Role atau User Tertentu
 */
export async function dispatchNotification({
  targetRole = null, // 'admin' | 'approver' | 'kepala_desa'
  targetUserId = null, // UUID user spesifik (opsional)
  desaId = null, // Filter desa spesifik untuk kepala_desa (opsional)
  judul,
  pesan,
  tipe = 'info', // 'info' | 'success' | 'warning' | 'error'
  linkTujuan = '/',
}) {
  try {
    // 1. Simpan ke tabel notifications di Supabase
    await supabase.from('notifications').insert({
      recipient_user_id: targetUserId,
      recipient_role: targetRole,
      desa_id: desaId,
      judul,
      pesan,
      tipe,
      link_tujuan: linkTujuan,
      is_read: false,
    });

    // 2. Cari nomor WhatsApp dari tabel profiles untuk dikirimi chat WA otomatis
    let query = supabase
      .from('profiles')
      .select('id, nama, no_hp, roles, desa_id')
      .eq('is_active', true);

    if (targetUserId) {
      query = query.eq('id', targetUserId);
    } else if (targetRole) {
      query = query.contains('roles', [targetRole]);
      if (targetRole === 'kepala_desa' && desaId) {
        query = query.eq('desa_id', desaId);
      }
    }

    const { data: recipients } = await query;
    const phoneNumbers = (recipients || [])
      .map((r) => r.no_hp)
      .filter(Boolean);

    if (phoneNumbers.length > 0) {
      const waText = `*[SI-MANTAP BOLTIM]*\n*${judul}*\n\n${pesan}\n\n_Notifikasi Otomatis Sistem Informasi Mantap Boltim_`;
      await sendWhatsAppFonnte(phoneNumbers, waText);
    }
  } catch (err) {
    console.error('Error dispatching notification:', err);
  }
}