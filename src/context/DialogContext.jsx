import { createContext, useContext, useState, useCallback } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';

const DialogContext = createContext({});

export const DialogProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);

  // 1. Fungsi Menampilkan Notifikasi Toast (Pengganti alert)
  const showToast = useCallback((message, type = 'success', TitleCustom = null) => {
    const id = Date.now() + Math.random();
    const defaultTitles = {
      success: 'Berhasil',
      error: 'Terjadi Kesalahan',
      warning: 'Perhatian',
      info: 'Informasi',
    };

    const newToast = {
      id,
      type,
      title: TitleCustom || defaultTitles[type] || 'Notifikasi',
      message,
    };

    setToasts((prev) => [...prev, newToast]);

    // Hilang otomatis setelah 4 detik
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // 2. Fungsi Menampilkan Popup Konfirmasi (Pengganti window.confirm)
  const showConfirm = useCallback(
    ({
      title = 'Konfirmasi Tindakan',
      message = 'Apakah Anda yakin ingin melanjutkan tindakan ini?',
      confirmText = 'Ya, Lanjutkan',
      cancelText = 'Batal',
      variant = 'danger', // 'danger' | 'warning' | 'primary'
    }) => {
      return new Promise((resolve) => {
        setConfirmState({
          title,
          message,
          confirmText,
          cancelText,
          variant,
          onConfirm: () => {
            setConfirmState(null);
            resolve(true);
          },
          onCancel: () => {
            setConfirmState(null);
            resolve(false);
          },
        });
      });
    },
    []
  );

  return (
    <DialogContext.Provider value={{ showToast, showConfirm }}>
      {children}

      {/* CONTAINER TOAST NOTIFIKASI (POJOK KANAN ATAS) */}
      <div className="fixed right-5 top-5 z-[100] flex w-full max-w-sm flex-col gap-3 pointer-events-none">
        {toasts.map((t) => {
          const styles = {
            success: {
              border: 'border-emerald-200',
              bg: 'bg-white',
              iconBg: 'bg-emerald-100 text-emerald-600',
              titleColor: 'text-emerald-900',
              Icon: CheckCircle2,
            },
            error: {
              border: 'border-rose-200',
              bg: 'bg-white',
              iconBg: 'bg-rose-100 text-rose-600',
              titleColor: 'text-rose-900',
              Icon: AlertCircle,
            },
            warning: {
              border: 'border-amber-200',
              bg: 'bg-white',
              iconBg: 'bg-amber-100 text-amber-600',
              titleColor: 'text-amber-900',
              Icon: AlertTriangle,
            },
            info: {
              border: 'border-indigo-200',
              bg: 'bg-white',
              iconBg: 'bg-indigo-100 text-indigo-600',
              titleColor: 'text-indigo-900',
              Icon: Info,
            },
          }[t.type] || {
            border: 'border-slate-200',
            bg: 'bg-white',
            iconBg: 'bg-slate-100 text-slate-600',
            titleColor: 'text-slate-900',
            Icon: Info,
          };

          const IconComponent = styles.Icon;

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3.5 rounded-2xl border ${styles.border} ${styles.bg} p-4 shadow-xl shadow-slate-900/10 transition-all duration-300`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${styles.iconBg}`}
              >
                <IconComponent className="h-5 w-5" />
              </div>

              <div className="flex-1 pt-0.5">
                <h4 className={`text-xs font-bold uppercase tracking-wider ${styles.titleColor}`}>
                  {t.title}
                </h4>
                <p className="mt-0.5 text-sm font-medium text-slate-600">
                  {t.message}
                </p>
              </div>

              <button
                onClick={() => removeToast(t.id)}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* POPUP MODAL KONFIRMASI MODERN */}
      {confirmState && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                    confirmState.variant === 'danger'
                      ? 'bg-rose-100 text-rose-600'
                      : confirmState.variant === 'warning'
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-indigo-100 text-indigo-600'
                  }`}
                >
                  {confirmState.variant === 'danger' ? (
                    <AlertCircle className="h-6 w-6" />
                  ) : confirmState.variant === 'warning' ? (
                    <AlertTriangle className="h-6 w-6" />
                  ) : (
                    <Info className="h-6 w-6" />
                  )}
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900">
                    {confirmState.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    {confirmState.message}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={confirmState.onCancel}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  {confirmState.cancelText}
                </button>

                <button
                  type="button"
                  onClick={confirmState.onConfirm}
                  className={`rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition ${
                    confirmState.variant === 'danger'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : confirmState.variant === 'warning'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {confirmState.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
};

export const useDialog = () => useContext(DialogContext);