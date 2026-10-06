"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { accountApi, authApi } from "@/lib/api";
import type { Profile, Role } from "@/lib/api.types";

type AuthUser = { id: string; email?: string };

interface AuthContextValue {
  user: AuthUser | null;
  session: string | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<Profile | null>;
  signInWithOtp: (email: string, code: string) => Promise<Profile | null>;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<Profile>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchProfile(userId: string): Promise<Profile | null> {
  try {
    const profile = await accountApi.profile();
    return profile.user_id === userId ? profile : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    setSession(res.accessToken);
    setUser({ id: res.userId, email: res.email });
    const p = await fetchProfile(res.userId);
    setProfile(p);
    return p;
  }, []);

  const signInWithOtp = useCallback(async (email: string, code: string) => {
    const res = await authApi.verifyOtp(email, code, "LOGIN");
    setSession(res.accessToken);
    setUser({ id: res.userId, email: res.email });
    const p = await fetchProfile(res.userId);
    setProfile(p);
    return p;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      return;
    }
    setProfile(await fetchProfile(user.id));
  }, [user]);

  const updateProfile = useCallback(
    async (patch: Partial<Profile>): Promise<Profile> => {
      const updated = await accountApi.updateProfile({
        fullName: patch.full_name,
        phone: patch.phone ?? undefined,
        watchlist: patch.watchlist,
      });
      setProfile(updated);
      return updated;
    },
    [],
  );

  const signOut = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setSession(null);
    setProfile(null);
  }, []);

  useEffect(() => {
    let mounted = true;
    const restore = async () => {
      const res = await authApi.refresh().catch(() => null);
      if (!mounted) return;
      if (res) {
        setSession(res.accessToken);
        setUser({ id: res.userId, email: res.email });
        setProfile(await fetchProfile(res.userId));
      } else {
        setUser(null);
        setSession(null);
        setProfile(null);
      }
      setLoading(false);
    };
    void restore();
    return () => {
      mounted = false;
    };
  }, []);

  // KYC status can change server-side mid-session (admin approve/reject).
  // Re-fetch the profile on an interval and when the tab regains focus so
  // badges and trading gates reflect the live record, not login-time state.
  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;
    let active = true;

    const sync = async () => {
      const fresh = await fetchProfile(userId);
      if (active && fresh) setProfile(fresh);
    };

    const interval = setInterval(sync, 60_000);
    const onFocus = () => void sync();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [user?.id]);

  const value: AuthContextValue = {
    user,
    session,
    profile,
    loading,
    signIn,
    signInWithOtp,
    refreshProfile,
    updateProfile,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useRole(): Role | undefined {
  return useAuth().profile?.role;
}
