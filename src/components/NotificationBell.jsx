import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';

export default function NotificationBell() {
  const { user, profile, activeRole } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    if (!user || !activeRole) return;

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    // Filter notifikasi yang relevan untuk user/role yang sedang aktif
    const filtered = (data || []).filter((n) => {
      if (n.recipient_user_id && n.recipient_user_id === user.id) return true;
      if (n.recipient_role === activeRole) {
        if (activeRole === 'kepala_desa' && n.desa_id && profile?.desa_id) {
          return n.desa_id === profile.desa_id;
        }
        return true;
      }
      return false;
    });

    setNotifications(filtered);
  };

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel('realtime-notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, activeRole, profile?.desa_id]);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAsRead = async (notif) => {
    if (!notif.is_read) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notif.id);
      fetchNotifications();
    }
    setOpen(false);
    if (notif.link_tujuan) {
      navigate(notif.link_tujuan);
    }
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds);
    fetchNotifications();
  };

  const getIcon = (tipe) => {
    if (tipe === 'success') return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
    if (tipe === 'error') return <AlertCircle className="h-4 w-4 text-rose-600" />;
    if (tipe === 'warning') return <AlertTriangle className="h-4 w-4 text-amber-600" />;
    return <Info className="h-4 w-4 text-indigo-600" />;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        title="Notifikasi Sistem & Status"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-extrabold text-white shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-16 z-50 max-h-[80vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-96">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Notifikasi Sistem</h3>
              <p className="text-[11px] text-slate-500">
                Terhubung dengan notifikasi WhatsApp Fonnte
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Tandai Dibaca
              </button>
            )}
          </div>

          <div className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                Belum ada notifikasi baru untuk role ini.
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleMarkAsRead(n)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50 ${
                    !n.is_read ? 'bg-indigo-50/40' : 'bg-white'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">{getIcon(n.tipe)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-bold text-slate-900">
                        {n.judul}
                      </p>
                      {!n.is_read && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-600" />
                      )}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">
                      {n.pesan}
                    </p>
                    <span className="mt-1 block text-[10px] text-slate-400">
                      {new Date(n.created_at).toLocaleString('id-ID')}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}