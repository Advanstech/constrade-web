"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { accountApi } from "@/lib/api";
import type { Profile, Role } from "@/lib/api.types";
import type { Session, User } from "@supabase/supabase-js";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<Profile>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Profile is read through a backend function (not the Postgres REST API)
 * so the client never talks to the database directly.
 */
async function fetchProfile(userId: string): Promise<Profile | null> {
  try {
    const profile = await accountApi.profile();
    return profile.user_id === userId ? profile : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const { data: s } = await supabase.auth.getSession();
    const uid = s.session?.user.id;
    if (!uid) {
      setProfile(null);
      return;
    }
    setProfile(await fetchProfile(uid));
  }, []);

  useEffect(() => {
    // Register the listener BEFORE checking the existing session so we never
    // race the initial restore.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) {
        // Defer the supabase call out of the callback.
        setTimeout(() => {
          void fetchProfile(nextSession.user.id).then(setProfile);
        }, 0);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        void fetchProfile(data.session.user.id).then(setProfile);
      }
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const updateProfile = useCallback(
    async (patch: Partial<Profile>): Promise<Profile> => {
      const updated = await accountApi.updateProfile({
        fullName: patch.full_name,
        phone: patch.phone ?? undefined,
      });
      setProfile(updated);
      return updated;
    },
    [],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  }, []);

  const value: AuthContextValue = {
    user,
    session,
    profile,
    loading,
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
