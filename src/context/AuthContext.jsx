import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activeRole, setActiveRole] = useState(() => sessionStorage.getItem('activeRole') || null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, kecamatan(id, nama_kecamatan), desa(id, nama_desa)')
        .eq('id', userId)
        .single();

      if (error || !data) {
        setProfile(null);
        return null;
      }

      // Cek apakah akun dikunci / dinonaktifkan oleh Admin
      if (!data.is_active) {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        setActiveRole(null);
        sessionStorage.removeItem('activeRole');
        throw new Error('Akun Anda telah dinonaktifkan atau dikunci oleh Admin.');
      }

      setProfile(data);

      // Jika hanya memiliki 1 role, langsung aktifkan role tersebut
      if (data.roles?.length === 1) {
        const singleRole = data.roles[0];
        setActiveRole(singleRole);
        sessionStorage.setItem('activeRole', singleRole);
      } else {
        // Jika multi-role, pastikan activeRole yang tersimpan masih valid
        const savedRole = sessionStorage.getItem('activeRole');
        if (savedRole && data.roles?.includes(savedRole)) {
          setActiveRole(savedRole);
        } else {
          setActiveRole(null);
        }
      }

      return data;
    } catch (err) {
      console.error('Error fetching profile:', err.message);
      throw err;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;

      if (session?.user) {
        setUser(session.user);
        try {
          await fetchProfile(session.user.id);
        } catch {
          // Ditangani di dalam fetchProfile
        }
      }
      setLoading(false);
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);

      if (!session?.user) {
        setProfile(null);
        setActiveRole(null);
        sessionStorage.removeItem('activeRole');
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const selectRole = (role) => {
    setActiveRole(role);
    sessionStorage.setItem('activeRole', role);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setActiveRole(null);
    sessionStorage.removeItem('activeRole');
  };

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