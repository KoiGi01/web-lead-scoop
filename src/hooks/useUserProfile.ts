import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type UserProfile = Tables<"user_profiles">;

interface UseUserProfileReturn {
  profile: UserProfile | null;
  loading: boolean;
  hasProfile: boolean;
  checked: boolean;
  refetch: () => Promise<void>;
}

export function useUserProfile(userId: string | undefined): UseUserProfileReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const [checked, setChecked] = useState(false);

  const fetchProfile = async () => {
    if (!userId) {
      setLoading(false);
      setProfile(null);
      setHasProfile(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // PGRST116 = "not found" which is expected for new users
          setProfile(null);
          setHasProfile(false);
        } else {
          console.error("Error fetching user profile:", error);
          setProfile(null);
          setHasProfile(false);
        }
      } else if (data) {
        setProfile(data);
        setHasProfile(true);
      } else {
        setProfile(null);
        setHasProfile(false);
      }
    } catch (err) {
      console.error("Unexpected error fetching profile:", err);
      setProfile(null);
      setHasProfile(false);
    } finally {
      setLoading(false);
      setChecked(true);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  return {
    profile,
    loading,
    hasProfile,
    checked,
    refetch: fetchProfile,
  };
}
