import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

const ACTIVE_ROLE_STORAGE_KEY = 'si_komoditas_active_role';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activeRole, setActiveRole] = useState(() => {
    return sessionStorage.getItem(ACTIVE_ROLE_STORAGE_KEY) || null;
  });
  const [loading, setLoading] = useState(true);

  const selectRole = useCallback((role) => {
    setActiveRole(role);
    if (role) {
      sessionStorage.setItem(ACTIVE_ROLE_STORAGE_KEY, role);
    } else {
      sessionStorage.removeItem(ACTIVE_ROLE_STORAGE_KEY);
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setActiveRole(null);
    sessionStorage.removeItem(ACTIVE_ROLE_STORAGE_KEY);
    localStorage.removeItem(ACTIVE_ROLE_STORAGE_KEY);
  }, []);

  const fetchProfile = useCallback(
    async (userId) => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*, kecamatan(id, nama_kecamatan), desa(id, nama_desa)')
        .eq('id', userId)
        .maybeSingle();

      if (error || !data) {
        setProfile(null);
        return null;
      }

      if (!data.is_active) {
        await signOut();
        return null;
      }

      setProfile(data);

      // Validasi apakah role di sessionStorage masih dimiliki oleh user ini
      const savedRole = sessionStorage.getItem(ACTIVE_ROLE_STORAGE_KEY);
      if (savedRole && data.roles?.includes(savedRole)) {
        setActiveRole(savedRole);
      } else if (data.roles?.length === 1 && savedRole) {
        selectRole(data.roles[0]);
      }

      return data;
    },
    [selectRole, signOut]
  );

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const savedRole = sessionStorage.getItem(ACTIVE_ROLE_STORAGE_KEY);

      // Jika ada sesi token lama di browser tetapi tab baru dibuka tanpa activeRole,
      // bersihkan sesi agar saat klik Login wajib memasukkan username & password
      if (session?.user && !savedRole) {
        await supabase.auth.signOut();
        if (mounted) {
          setUser(null);
          setProfile(null);
          setActiveRole(null);
          setLoading(false);
        }
        return;
      }

      if (session?.user && mounted) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      }
      if (mounted) setLoading(false);
    };

    initSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session?.user) {
          if (mounted) {
            setUser(null);
            setProfile(null);
            setActiveRole(null);
            sessionStorage.removeItem(ACTIVE_ROLE_STORAGE_KEY);
          }
        } else if (session?.user && mounted) {
          setUser(session.user);
        }
      }
    );

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [fetchProfile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        activeRole,
        loading,
        selectRole,
        fetchProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);