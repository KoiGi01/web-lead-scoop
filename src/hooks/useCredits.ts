import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { DEMO_USER_ID } from "@/hooks/useAuth";

export type UserCredits = Tables<"user_credits">;

interface UseCreditsReturn {
  balance: number;
  plan: string;
  loading: boolean;
  deduct: (amount: number) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useCredits(userId: string | undefined): UseCreditsReturn {
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCredits = async () => {
    if (userId === DEMO_USER_ID) {
      setCredits({
        user_id: DEMO_USER_ID,
        balance: 300,
        plan: "growth",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as UserCredits);
      setLoading(false);
      return;
    }

    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_credits")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        // PGRST116 = row not found — auto-provision free credits for new users
        if (error.code === "PGRST116") {
          const { data: newRow, error: insertError } = await supabase
            .from("user_credits")
            .insert({ user_id: userId, balance: 30, plan: "free" })
            .select()
            .single();

          if (insertError) {
            // Another request may have inserted concurrently — retry fetch
            if (insertError.code === "23505") {
              const { data: retryData } = await supabase
                .from("user_credits")
                .select("*")
                .eq("user_id", userId)
                .single();
              if (retryData) setCredits(retryData);
            } else {
              console.error("Error provisioning credits:", insertError);
            }
          } else if (newRow) {
            setCredits(newRow);
          }
        } else {
          console.error("Error fetching credits:", error);
          setCredits(null);
        }
      } else if (data) {
        setCredits(data);
      }
    } catch (err) {
      console.error("Unexpected error fetching credits:", err);
      setCredits(null);
    } finally {
      setLoading(false);
    }
  };

  const deduct = async (amount: number) => {
    if (userId === DEMO_USER_ID) {
      setCredits((prev) => ({
        user_id: DEMO_USER_ID,
        balance: Math.max(0, (prev?.balance ?? 300) - amount),
        plan: "growth",
        created_at: prev?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as UserCredits));
      return;
    }

    if (!userId) {
      throw new Error("User ID is required to deduct credits");
    }

    if (!credits || credits.balance < amount) {
      throw new Error("Insufficient credits");
    }

    try {
      const newBalance = credits.balance - amount;
      const { data, error } = await supabase
        .from("user_credits")
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setCredits(data);
      }
    } catch (err) {
      console.error("Error deducting credits:", err);
      throw err;
    }
  };

  useEffect(() => {
    fetchCredits();
  }, [userId]);

  return {
    balance: credits?.balance ?? 0,
    plan: credits?.plan ?? "free",
    loading,
    deduct,
    refetch: fetchCredits,
  };
}
