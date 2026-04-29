import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export const DEMO_USER_ID = "demo-account-preview";
export const isDemoAccountPreview = () => false;

const demoUser = {
    id: DEMO_USER_ID,
    email: "demo@account.com",
    app_metadata: {},
    user_metadata: { full_name: "Demo Account" },
    aud: "authenticated",
    created_at: new Date().toISOString(),
} as User;

export function useAuth() {
    const demoMode = isDemoAccountPreview();
    const [user, setUser] = useState<User | null>(demoMode ? demoUser : null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(!demoMode);

    useEffect(() => {
        if (isDemoAccountPreview()) {
            setUser(demoUser);
            setSession(null);
            setLoading(false);
            return;
        }

        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        if (isDemoAccountPreview()) {
            const url = new URL(window.location.href);
            url.searchParams.delete("demo");
            url.searchParams.delete("demoAccount");
            window.location.href = url.pathname + url.search + url.hash;
            return;
        }
        await supabase.auth.signOut();
    };

    return { user, session, loading, signOut };
}
